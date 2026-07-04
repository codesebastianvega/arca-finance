"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getSupabaseServerClient } from "@/lib/supabase";

const transactionSchema = z.object({
  kind: z.enum([
    "income",
    "expense",
    "transfer",
    "debt_payment",
    "card_payment",
    "saving_contribution",
    "saving_withdrawal",
  ]),
  status: z.enum(["pending", "paid", "confirmed", "cancelled", "overdue", "scheduled"]),
  amount: z.coerce.number().positive(),
  concept: z.string().trim().min(2),
  accountId: z.string().uuid(),
  category: z.string().trim().min(2),
  unit: z.enum(["personal", "empresa", "deuxio", "el_recreo", "uxio", "sie", "aluna", "arca", "freelance"]),
  date: z.string().trim().min(10),
  dueDate: z.string().trim().optional(),
});

const accountSchema = z.object({
  name: z.string().trim().min(2),
  type: z.enum(["cash", "bank", "wallet", "savings", "other"]),
  balance: z.coerce.number().default(0),
  color: z.string().trim().default("#163a5f"),
});

const debtSchema = z.object({
  name: z.string().trim().min(2),
  lender: z.string().trim().min(2),
  debtType: z.string().trim().min(2).default("personal"),
  principalAmount: z.coerce.number().min(0).optional(),
  balance: z.coerce.number().positive(),
  installment: z.coerce.number().min(0),
  nextDueDate: z.string().trim().min(10),
  annualInterestRate: z.coerce.number().min(0).optional(),
  interestType: z.string().trim().optional(),
  termMonths: z.coerce.number().int().min(0).optional(),
  remainingMonths: z.coerce.number().int().min(0).optional(),
  estimatedTotalPayment: z.coerce.number().min(0).optional(),
  priority: z.enum(["high", "medium", "low"]),
  notes: z.string().trim().optional(),
});

const creditCardSchema = z.object({
  name: z.string().trim().min(2),
  issuer: z.string().trim().min(2),
  limit: z.coerce.number().min(0),
  used: z.coerce.number().min(0),
  cutOffDate: z.coerce.number().int().min(1).max(31),
  payDueDate: z.coerce.number().int().min(1).max(31),
  minimumPayment: z.coerce.number().min(0),
  annualInterestRate: z.coerce.number().min(0).optional(),
  interestType: z.string().trim().optional(),
  estimatedPayoffMonths: z.coerce.number().int().min(0).optional(),
  estimatedTotalPayment: z.coerce.number().min(0).optional(),
  paymentStrategy: z.string().trim().optional(),
  notes: z.string().trim().optional(),
});

const savingsGoalSchema = z.object({
  name: z.string().trim().min(2),
  target: z.coerce.number().positive(),
  current: z.coerce.number().min(0).default(0),
  dueDate: z.string().trim().optional(),
  color: z.string().trim().default("#16735b"),
});

const transferSchema = z.object({
  fromAccountId: z.string().uuid(),
  toAccountId: z.string().uuid(),
  amount: z.coerce.number().positive(),
  concept: z.string().trim().min(2),
  date: z.string().trim().min(10),
});

const settleEventSchema = z.object({
  eventId: z.string().uuid(),
  accountId: z.string().uuid(),
});

const outflowKinds = new Set(["expense", "debt_payment", "card_payment", "saving_contribution"]);
const inflowKinds = new Set(["income", "saving_withdrawal"]);

type FinancialEventRow = {
  id: string;
  event_date: string;
  title: string;
  amount: number | string;
  event_type: string;
  status: string;
  business_unit_key?: string | null;
  account_id?: string | null;
  related_table?: string | null;
  related_id?: string | null;
};

function getBalanceDelta(kind: string, amount: number) {
  if (inflowKinds.has(kind)) {
    return amount;
  }

  if (outflowKinds.has(kind)) {
    return -amount;
  }

  return 0;
}

function shouldAffectAccount(status: string) {
  return status === "paid" || status === "confirmed";
}

async function readAccountBalance(supabase: NonNullable<ReturnType<typeof getSupabaseServerClient>>, accountId: string) {
  const { data, error } = await supabase.from("accounts").select("balance").eq("id", accountId).single();

  if (error) {
    throw new Error(`No se pudo leer la cuenta: ${error.message}`);
  }

  return Number(data?.balance ?? 0);
}

async function updateAccountBalance(
  supabase: NonNullable<ReturnType<typeof getSupabaseServerClient>>,
  accountId: string,
  delta: number
) {
  const currentBalance = await readAccountBalance(supabase, accountId);
  const { error } = await supabase
    .from("accounts")
    .update({ balance: currentBalance + delta, updated_at: new Date().toISOString() })
    .eq("id", accountId);

  if (error) {
    throw new Error(`No se pudo actualizar el saldo: ${error.message}`);
  }
}

export async function createTransaction(formData: FormData) {
  const input = transactionSchema.parse({
    kind: formData.get("kind"),
    status: formData.get("status"),
    amount: formData.get("amount"),
    concept: formData.get("concept"),
    accountId: formData.get("accountId"),
    category: formData.get("category"),
    unit: formData.get("unit"),
    date: formData.get("date"),
    dueDate: formData.get("dueDate") || undefined,
  });

  const supabase = getSupabaseServerClient();

  if (!supabase) {
    throw new Error("Supabase no esta configurado en el servidor.");
  }

  const { data: transaction, error } = await supabase
    .from("transactions")
    .insert({
      kind: input.kind,
      status: input.status,
      amount: input.amount,
      concept: input.concept,
      account_id: input.accountId,
      category: input.category,
      unit: input.unit,
      date: input.date,
      due_date: input.dueDate || null,
      metadata: {
        source: "arca-ui",
        created_by: "manual-register",
      },
    })
    .select("id")
    .single();

  if (error) {
    throw new Error(`No se pudo registrar el movimiento: ${error.message}`);
  }

  if (shouldAffectAccount(input.status)) {
    const delta = getBalanceDelta(input.kind, input.amount);

    if (delta !== 0) {
      await updateAccountBalance(supabase, input.accountId, delta);
    }
  }

  if (input.status === "scheduled" || input.status === "pending" || input.status === "overdue") {
    const { error: eventError } = await supabase.from("financial_events").insert({
      event_date: input.dueDate || input.date,
      title: input.concept,
      amount: input.amount,
      event_type: input.kind === "saving_contribution" ? "saving" : input.kind,
      status: input.status,
      business_unit_key: input.unit,
      account_id: input.accountId,
      related_table: "transactions",
      related_id: transaction?.id ?? null,
      notes: `Creado desde registro manual de Arca.`,
    });

    if (eventError) {
      throw new Error(`Movimiento creado, pero no se pudo crear el evento: ${eventError.message}`);
    }
  }

  revalidatePath("/");
  redirect("/?view=dashboard&saved=1");
}

export async function createAccount(formData: FormData) {
  const input = accountSchema.parse({
    name: formData.get("name"),
    type: formData.get("type"),
    balance: formData.get("balance"),
    color: formData.get("color") || "#163a5f",
  });

  const supabase = getSupabaseServerClient();

  if (!supabase) {
    throw new Error("Supabase no esta configurado en el servidor.");
  }

  const { error } = await supabase.from("accounts").insert({
    name: input.name,
    type: input.type,
    balance: input.balance,
    color: input.color,
    active: true,
  });

  if (error) {
    throw new Error(`No se pudo crear la cuenta: ${error.message}`);
  }

  revalidatePath("/");
  redirect("/?view=accounts&saved=1");
}

export async function createDebt(formData: FormData) {
  const input = debtSchema.parse({
    name: formData.get("name"),
    lender: formData.get("lender"),
    debtType: formData.get("debtType") || "personal",
    principalAmount: formData.get("principalAmount") || undefined,
    balance: formData.get("balance"),
    installment: formData.get("installment"),
    nextDueDate: formData.get("nextDueDate"),
    annualInterestRate: formData.get("annualInterestRate") || undefined,
    interestType: formData.get("interestType") || undefined,
    termMonths: formData.get("termMonths") || undefined,
    remainingMonths: formData.get("remainingMonths") || undefined,
    estimatedTotalPayment: formData.get("estimatedTotalPayment") || undefined,
    priority: formData.get("priority"),
    notes: formData.get("notes") || undefined,
  });

  const supabase = getSupabaseServerClient();

  if (!supabase) {
    throw new Error("Supabase no esta configurado en el servidor.");
  }

  const baseDebtInsert = {
    name: input.name,
    lender: input.lender,
    debt_type: input.debtType,
    balance: input.balance,
    installment: input.installment,
    next_due_date: input.nextDueDate,
    remaining_months: input.remainingMonths ?? null,
    status: "active",
    priority: input.priority,
    notes: input.notes ?? null,
  };
  const extendedDebtInsert = {
    ...baseDebtInsert,
    principal_amount: input.principalAmount ?? null,
    annual_interest_rate: input.annualInterestRate ?? null,
    interest_type: input.interestType ?? "unknown",
    term_months: input.termMonths ?? null,
    estimated_total_payment: input.estimatedTotalPayment ?? null,
  };

  let { data: debt, error } = await supabase.from("debts").insert(extendedDebtInsert).select("id").single();

  if (error && error.message.toLowerCase().includes("column")) {
    const fallback = await supabase.from("debts").insert(baseDebtInsert).select("id").single();
    debt = fallback.data;
    error = fallback.error;
  }

  if (error) {
    throw new Error(`No se pudo crear la deuda: ${error.message}`);
  }

  if (input.installment > 0) {
    const { error: eventError } = await supabase.from("financial_events").insert({
      event_date: input.nextDueDate,
      title: `Pago ${input.name}`,
      amount: input.installment,
      event_type: "debt_payment",
      status: "scheduled",
      business_unit_key: "personal",
      related_table: "debts",
      related_id: debt?.id ?? null,
      notes: input.notes ?? null,
    });

    if (eventError) {
      throw new Error(`Deuda creada, pero no se pudo crear el evento: ${eventError.message}`);
    }
  }

  revalidatePath("/");
  redirect("/?view=debts&saved=1");
}

export async function createCreditCard(formData: FormData) {
  const input = creditCardSchema.parse({
    name: formData.get("name"),
    issuer: formData.get("issuer"),
    limit: formData.get("limit"),
    used: formData.get("used"),
    cutOffDate: formData.get("cutOffDate"),
    payDueDate: formData.get("payDueDate"),
    minimumPayment: formData.get("minimumPayment"),
    annualInterestRate: formData.get("annualInterestRate") || undefined,
    interestType: formData.get("interestType") || undefined,
    estimatedPayoffMonths: formData.get("estimatedPayoffMonths") || undefined,
    estimatedTotalPayment: formData.get("estimatedTotalPayment") || undefined,
    paymentStrategy: formData.get("paymentStrategy") || undefined,
    notes: formData.get("notes") || undefined,
  });

  const supabase = getSupabaseServerClient();

  if (!supabase) {
    throw new Error("Supabase no esta configurado en el servidor.");
  }

  const baseCardInsert = {
    name: input.name,
    issuer: input.issuer,
    limit_value: input.limit,
    used: input.used,
    cut_off_date: input.cutOffDate,
    pay_due_date: input.payDueDate,
    minimum_payment: input.minimumPayment,
    status: "active",
  };
  const extendedCardInsert = {
    ...baseCardInsert,
    annual_interest_rate: input.annualInterestRate ?? null,
    interest_type: input.interestType ?? "unknown",
    estimated_payoff_months: input.estimatedPayoffMonths ?? null,
    estimated_total_payment: input.estimatedTotalPayment ?? null,
    payment_strategy: input.paymentStrategy ?? "minimum",
    notes: input.notes ?? null,
  };

  let { data: card, error } = await supabase.from("credit_cards").insert(extendedCardInsert).select("id").single();

  if (error && error.message.toLowerCase().includes("column")) {
    const fallback = await supabase.from("credit_cards").insert(baseCardInsert).select("id").single();
    card = fallback.data;
    error = fallback.error;
  }

  if (error) {
    throw new Error(`No se pudo crear la tarjeta: ${error.message}`);
  }

  if (input.minimumPayment > 0) {
    const today = new Date();
    const dueDate = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), input.payDueDate));

    const { error: eventError } = await supabase.from("financial_events").insert({
      event_date: dueDate.toISOString().slice(0, 10),
      title: `Pago ${input.name}`,
      amount: input.minimumPayment,
      event_type: "card_payment",
      status: "scheduled",
      business_unit_key: "personal",
      related_table: "credit_cards",
      related_id: card?.id ?? null,
    });

    if (eventError) {
      throw new Error(`Tarjeta creada, pero no se pudo crear el evento: ${eventError.message}`);
    }
  }

  revalidatePath("/");
  redirect("/?view=cards&saved=1");
}

export async function createSavingsGoal(formData: FormData) {
  const input = savingsGoalSchema.parse({
    name: formData.get("name"),
    target: formData.get("target"),
    current: formData.get("current"),
    dueDate: formData.get("dueDate") || undefined,
    color: formData.get("color") || "#16735b",
  });

  const supabase = getSupabaseServerClient();

  if (!supabase) {
    throw new Error("Supabase no esta configurado en el servidor.");
  }

  const { error } = await supabase.from("savings_goals").insert({
    name: input.name,
    target: input.target,
    current: input.current,
    due_date: input.dueDate || null,
    color: input.color,
  });

  if (error) {
    throw new Error(`No se pudo crear la meta: ${error.message}`);
  }

  revalidatePath("/");
  redirect("/?view=savings&saved=1");
}

export async function createTransfer(formData: FormData) {
  const input = transferSchema.parse({
    fromAccountId: formData.get("fromAccountId"),
    toAccountId: formData.get("toAccountId"),
    amount: formData.get("amount"),
    concept: formData.get("concept"),
    date: formData.get("date"),
  });

  if (input.fromAccountId === input.toAccountId) {
    throw new Error("La cuenta origen y destino deben ser diferentes.");
  }

  const supabase = getSupabaseServerClient();

  if (!supabase) {
    throw new Error("Supabase no esta configurado en el servidor.");
  }

  await updateAccountBalance(supabase, input.fromAccountId, -input.amount);
  await updateAccountBalance(supabase, input.toAccountId, input.amount);

  const transferId = crypto.randomUUID();
  const { error } = await supabase.from("transactions").insert([
    {
      kind: "transfer",
      status: "confirmed",
      amount: input.amount,
      concept: `${input.concept} - salida`,
      account_id: input.fromAccountId,
      category: "Transferencia",
      unit: "personal",
      date: input.date,
      metadata: {
        source: "arca-ui",
        transfer_id: transferId,
        transfer_direction: "out",
        to_account_id: input.toAccountId,
      },
    },
    {
      kind: "transfer",
      status: "confirmed",
      amount: input.amount,
      concept: `${input.concept} - entrada`,
      account_id: input.toAccountId,
      category: "Transferencia",
      unit: "personal",
      date: input.date,
      metadata: {
        source: "arca-ui",
        transfer_id: transferId,
        transfer_direction: "in",
        from_account_id: input.fromAccountId,
      },
    },
  ]);

  if (error) {
    throw new Error(`Transferencia aplicada, pero no se pudo registrar el historial: ${error.message}`);
  }

  revalidatePath("/");
  redirect("/?view=transfers&saved=1");
}

export async function settleFinancialEvent(formData: FormData) {
  const input = settleEventSchema.parse({
    eventId: formData.get("eventId"),
    accountId: formData.get("accountId"),
  });

  const supabase = getSupabaseServerClient();

  if (!supabase) {
    throw new Error("Supabase no esta configurado en el servidor.");
  }

  const { data: event, error: eventError } = await supabase
    .from("financial_events")
    .select("*")
    .eq("id", input.eventId)
    .single();

  if (eventError) {
    throw new Error(`No se pudo leer el evento: ${eventError.message}`);
  }

  const eventRow = event as FinancialEventRow;

  if (eventRow.status === "paid" || eventRow.status === "confirmed") {
    revalidatePath("/");
    redirect("/?view=dashboard&saved=1");
  }

  const amount = Number(eventRow.amount ?? 0);
  const eventType = String(eventRow.event_type);
  const isIncome = eventType === "income";
  const txKind = eventType === "saving" ? "saving_contribution" : eventType;
  const settledStatus = isIncome ? "confirmed" : "paid";

  await updateAccountBalance(supabase, input.accountId, isIncome ? amount : -amount);

  const { data: transaction, error: txError } = await supabase
    .from("transactions")
    .insert({
      kind: txKind,
      status: settledStatus,
      amount,
      concept: String(eventRow.title),
      account_id: input.accountId,
      category: isIncome ? "Ingreso" : "Pago programado",
      unit: eventRow.business_unit_key ?? "personal",
      date: eventRow.event_date,
      due_date: eventRow.event_date,
      metadata: {
        source: "financial_event_settlement",
        event_id: input.eventId,
        related_table: eventRow.related_table,
        related_id: eventRow.related_id,
      },
    })
    .select("id")
    .single();

  if (txError) {
    throw new Error(`Saldo actualizado, pero no se pudo crear el movimiento: ${txError.message}`);
  }

  const { error: updateEventError } = await supabase
    .from("financial_events")
    .update({
      status: settledStatus,
      account_id: input.accountId,
      related_table: eventRow.related_table ?? "transactions",
      related_id: eventRow.related_id ?? transaction?.id ?? null,
    })
    .eq("id", input.eventId);

  if (updateEventError) {
    throw new Error(`Movimiento creado, pero no se pudo cerrar el evento: ${updateEventError.message}`);
  }

  if (!isIncome && eventRow.related_table === "debts" && eventRow.related_id) {
    const { data: debt } = await supabase.from("debts").select("balance").eq("id", eventRow.related_id).single();
    const remaining = Math.max(0, Number(debt?.balance ?? 0) - amount);
    await supabase.from("debts").update({ balance: remaining, status: remaining === 0 ? "paid" : "active" }).eq("id", eventRow.related_id);
  }

  if (!isIncome && eventRow.related_table === "credit_cards" && eventRow.related_id) {
    const { data: card } = await supabase.from("credit_cards").select("used").eq("id", eventRow.related_id).single();
    const used = Math.max(0, Number(card?.used ?? 0) - amount);
    await supabase.from("credit_cards").update({ used }).eq("id", eventRow.related_id);
  }

  revalidatePath("/");
  redirect("/?view=dashboard&saved=1");
}
