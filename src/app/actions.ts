"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireWorkspaceContext } from "@/lib/auth";
import {
  createAccountRpc,
  createCreditCardRpc,
  createDebtRpc,
  createMovementRpc,
  createSavingsGoalRpc,
  createTransferRpc,
  getActionClient,
  payObligationRpc,
} from "@/lib/financial-rpc";
import { createSupabaseServerActionClient } from "@/lib/supabase";
import { buildScheduledEventUpdateOnConfirm, ensureScheduledEventsForWorkspace } from "@/lib/template-generation";

const transactionSchema = z.object({
  kind: z.enum([
    "income",
    "expense",
    "transfer",
    "card_purchase",
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
  unit: z.string().trim().min(2),
  date: z.string().trim().min(10),
  dueDate: z.string().trim().optional(),
  sourceId: z.string().uuid().optional(),
  sourceType: z.string().trim().optional(),
});

const businessUnitSchema = z.object({
  name: z.string().trim().min(2),
  key: z.string().trim().optional(),
});

const updateBusinessUnitSchema = z.object({
  key: z.string().trim().min(2),
  name: z.string().trim().min(2),
});

const deleteBusinessUnitSchema = z.object({
  key: z.string().trim().min(2),
});

const accountSchema = z.object({
  name: z.string().trim().min(2),
  type: z.enum(["cash", "bank", "wallet", "savings", "other"]),
  balance: z.coerce.number().default(0),
  color: z.string().trim().default("accent"),
});

const updateAccountSchema = z.object({
  accountId: z.string().uuid(),
  name: z.string().trim().min(2),
  type: z.enum(["cash", "bank", "wallet", "savings", "other"]),
  color: z.string().trim().default("accent"),
  active: z
    .union([z.literal("on"), z.literal("true"), z.literal("false"), z.literal("off"), z.undefined()])
    .transform((value) => value === "on" || value === "true"),
});

const deleteAccountSchema = z.object({
  accountId: z.string().uuid(),
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

const updateDebtSchema = z.object({
  debtId: z.string().uuid(),
  name: z.string().trim().min(2),
  lender: z.string().trim().min(2),
  debtType: z.string().trim().min(2).default("personal"),
  principalAmount: z.coerce.number().min(0).optional(),
  balance: z.coerce.number().min(0),
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

const deleteDebtSchema = z.object({
  debtId: z.string().uuid(),
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

const updateCreditCardSchema = z.object({
  cardId: z.string().uuid(),
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
  status: z.enum(["active", "blocked", "closed"]).default("active"),
});

const deleteCreditCardSchema = z.object({
  cardId: z.string().uuid(),
});

const savingsGoalSchema = z.object({
  name: z.string().trim().min(2),
  target: z.coerce.number().positive(),
  current: z.coerce.number().min(0).default(0),
  dueDate: z.string().trim().optional(),
  color: z.string().trim().default("success"),
});

const updateSavingsGoalSchema = z.object({
  goalId: z.string().uuid(),
  name: z.string().trim().min(2),
  target: z.coerce.number().min(0),
  dueDate: z.string().trim().optional(),
  color: z.string().trim().default("success"),
});

const deleteSavingsGoalSchema = z.object({
  goalId: z.string().uuid(),
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

const confirmIncomeEventSchema = z.object({
  eventId: z.string().uuid(),
});

const templateBaseSchema = z.object({
  name: z.string().trim().min(2),
  recurrenceMode: z.enum(["open_recurring", "date_bounded", "occurrence_bounded", "manual_variable", "one_time"]),
  frequency: z.enum(["weekly", "biweekly", "monthly", "bimonthly", "custom_days_of_month"]),
  daysOfMonth: z.string().trim().optional(),
  startDate: z.string().trim().min(10),
  endDate: z.string().trim().optional(),
  occurrenceLimit: z.coerce.number().int().min(1).optional(),
  defaultAmount: z.coerce.number().positive(),
  defaultAccountId: z.string().uuid().optional(),
  businessUnitKey: z.string().trim().min(2),
  notes: z.string().trim().optional(),
});

const incomeTemplateSchema = templateBaseSchema.extend({
  incomeSourceId: z.string().uuid(),
});

const expenseTemplateSchema = templateBaseSchema.extend({
  kind: z.enum(["expense", "saving", "debt_payment", "card_payment"]),
  defaultAccountId: z.string().uuid(),
});

const updateIncomeTemplateSchema = incomeTemplateSchema.extend({
  templateId: z.string().uuid(),
});

const updateExpenseTemplateSchema = expenseTemplateSchema.extend({
  templateId: z.string().uuid(),
});

const deleteTemplateSchema = z.object({
  templateId: z.string().uuid(),
});

const adjustScheduledEventSchema = z.object({
  eventId: z.string().uuid(),
  accountId: z.string().uuid(),
  amount: z.coerce.number().positive(),
  confirmedAt: z.string().trim().min(10),
});

const reverseTransactionSchema = z.object({
  transactionId: z.string().uuid(),
});

function slugifyBusinessUnitKey(value: string) {
  const normalized = value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");

  return normalized || "unidad";
}

function buildMonthlyDueDate(day: number) {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const maxDay = new Date(year, month + 1, 0).getDate();
  const safeDay = Math.max(1, Math.min(day, maxDay));
  return new Date(year, month, safeDay).toISOString().slice(0, 10);
}

function parseDaysOfMonth(value?: string) {
  if (!value?.trim()) return [];

  return [...new Set(
    value
      .split(",")
      .map((item) => Number(item.trim()))
      .filter((item) => Number.isInteger(item) && item >= 1 && item <= 31)
  )].sort((left, right) => left - right);
}

function normalizeTemplatePayload<T extends { recurrenceMode: string; frequency: string; endDate?: string; occurrenceLimit?: number; notes?: string }>(
  input: T & { daysOfMonth?: string }
) {
  return {
    recurrence_mode: input.recurrenceMode,
    frequency: input.frequency,
    days_of_month: input.frequency === "custom_days_of_month" ? parseDaysOfMonth(input.daysOfMonth) : [],
    end_date: input.endDate || null,
    occurrence_limit: input.recurrenceMode === "occurrence_bounded" ? input.occurrenceLimit ?? null : null,
    notes: input.notes ?? null,
  };
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
    sourceId: formData.get("sourceId") || undefined,
    sourceType: formData.get("sourceType") || undefined,
  });

  const context = await requireWorkspaceContext();
  const client = await getActionClient();
  const directClient = await createSupabaseServerActionClient();
  let resolvedUnit = input.unit;
  let resolvedSourceType = input.sourceType;

  if (input.sourceId && directClient) {
    const { data: incomeSource, error: incomeSourceError } = await directClient
      .from("income_sources")
      .select("id, workspace_id, business_unit_key")
      .eq("workspace_id", context.workspace.id)
      .eq("id", input.sourceId)
      .maybeSingle();

    if (incomeSourceError) {
      throw new Error(`No se pudo validar la fuente de ingreso: ${incomeSourceError.message}`);
    }

    if (!incomeSource) {
      throw new Error("La fuente de ingreso elegida no existe en este espacio.");
    }

    resolvedUnit = String(incomeSource.business_unit_key ?? input.unit);
    resolvedSourceType = "income_source";
  }

  await createMovementRpc(client, context.workspace.id, {
    kind: input.kind,
    amount: input.amount,
    concept: input.concept,
    accountId: input.accountId,
    category: input.category,
    unit: resolvedUnit,
    date: input.date,
    dueDate: input.dueDate,
    status: input.status,
    sourceId: input.sourceId,
    sourceType: resolvedSourceType,
    metadata: {
      source: "arca-ui",
      created_by: "manual-register",
    },
  });

  revalidatePath("/app");
  redirect("/app/dashboard?saved=1");
}

export async function createIncomeTemplate(formData: FormData) {
  const input = incomeTemplateSchema.parse({
    name: formData.get("name"),
    recurrenceMode: formData.get("recurrenceMode"),
    frequency: formData.get("frequency"),
    daysOfMonth: formData.get("daysOfMonth") || undefined,
    startDate: formData.get("startDate"),
    endDate: formData.get("endDate") || undefined,
    occurrenceLimit: formData.get("occurrenceLimit") || undefined,
    defaultAmount: formData.get("defaultAmount"),
    defaultAccountId: formData.get("defaultAccountId"),
    businessUnitKey: formData.get("businessUnitKey"),
    incomeSourceId: formData.get("incomeSourceId"),
    notes: formData.get("notes") || undefined,
  });

  const context = await requireWorkspaceContext();
  const client = await createSupabaseServerActionClient();

  if (!client) {
    throw new Error("Supabase no esta configurado en el servidor.");
  }

  const { data: source, error: sourceError } = await client
    .from("income_sources")
    .select("id, business_unit_key")
    .eq("workspace_id", context.workspace.id)
    .eq("id", input.incomeSourceId)
    .single();

  if (sourceError || !source) {
    throw new Error(`No se pudo validar la fuente de ingreso: ${sourceError?.message ?? "sin respuesta"}`);
  }

  if (String(source.business_unit_key) !== input.businessUnitKey) {
    throw new Error("La fuente elegida no pertenece al frente o unidad seleccionada.");
  }

  const payload = normalizeTemplatePayload(input);

  const { error } = await client.from("income_templates").insert({
    workspace_id: context.workspace.id,
    name: input.name,
    kind: "income",
    status: "active",
    start_date: input.startDate,
    default_amount: input.defaultAmount,
    default_account_id: input.defaultAccountId,
    business_unit_key: input.businessUnitKey,
    income_source_id: input.incomeSourceId,
    ...payload,
  });

  if (error) {
    throw new Error(`No se pudo crear la plantilla de ingreso: ${error.message}`);
  }

  await ensureScheduledEventsForWorkspace(client as never, context.workspace.id);
  revalidatePath("/app");
  redirect("/app/planeacion/mes?saved=template_income");
}

export async function createExpenseTemplate(formData: FormData) {
  const input = expenseTemplateSchema.parse({
    name: formData.get("name"),
    kind: formData.get("kind"),
    recurrenceMode: formData.get("recurrenceMode"),
    frequency: formData.get("frequency"),
    daysOfMonth: formData.get("daysOfMonth") || undefined,
    startDate: formData.get("startDate"),
    endDate: formData.get("endDate") || undefined,
    occurrenceLimit: formData.get("occurrenceLimit") || undefined,
    defaultAmount: formData.get("defaultAmount"),
    defaultAccountId: formData.get("defaultAccountId"),
    businessUnitKey: formData.get("businessUnitKey"),
    notes: formData.get("notes") || undefined,
  });

  const context = await requireWorkspaceContext();
  const client = await createSupabaseServerActionClient();

  if (!client) {
    throw new Error("Supabase no esta configurado en el servidor.");
  }

  const payload = normalizeTemplatePayload(input);
  const { error } = await client.from("expense_templates").insert({
    workspace_id: context.workspace.id,
    name: input.name,
    kind: input.kind,
    status: "active",
    start_date: input.startDate,
    default_amount: input.defaultAmount,
    default_account_id: input.defaultAccountId,
    business_unit_key: input.businessUnitKey,
    ...payload,
  });

  if (error) {
    throw new Error(`No se pudo crear la plantilla programada: ${error.message}`);
  }

  await ensureScheduledEventsForWorkspace(client as never, context.workspace.id);
  revalidatePath("/app");
  redirect("/app/planeacion/mes?saved=template_expense");
}

export async function updateIncomeTemplate(formData: FormData) {
  const input = updateIncomeTemplateSchema.parse({
    templateId: formData.get("templateId"),
    name: formData.get("name"),
    recurrenceMode: formData.get("recurrenceMode"),
    frequency: formData.get("frequency"),
    daysOfMonth: formData.get("daysOfMonth") || undefined,
    startDate: formData.get("startDate"),
    endDate: formData.get("endDate") || undefined,
    occurrenceLimit: formData.get("occurrenceLimit") || undefined,
    defaultAmount: formData.get("defaultAmount"),
    defaultAccountId: formData.get("defaultAccountId"),
    businessUnitKey: formData.get("businessUnitKey"),
    incomeSourceId: formData.get("incomeSourceId"),
    notes: formData.get("notes") || undefined,
  });

  const context = await requireWorkspaceContext();
  const client = await createSupabaseServerActionClient();

  if (!client) redirect("/app/planeacion/mes?error=config");

  const payload = normalizeTemplatePayload(input);
  const { error } = await client
    .from("income_templates")
    .update({
      name: input.name,
      start_date: input.startDate,
      default_amount: input.defaultAmount,
      default_account_id: input.defaultAccountId,
      business_unit_key: input.businessUnitKey,
      income_source_id: input.incomeSourceId,
      ...payload,
    })
    .eq("workspace_id", context.workspace.id)
    .eq("id", input.templateId);

  if (error) redirect("/app/planeacion/mes?error=update_income_template");

  revalidatePath("/app");
  redirect("/app/planeacion/mes?updated=template_income");
}

export async function updateExpenseTemplate(formData: FormData) {
  const input = updateExpenseTemplateSchema.parse({
    templateId: formData.get("templateId"),
    name: formData.get("name"),
    kind: formData.get("kind"),
    recurrenceMode: formData.get("recurrenceMode"),
    frequency: formData.get("frequency"),
    daysOfMonth: formData.get("daysOfMonth") || undefined,
    startDate: formData.get("startDate"),
    endDate: formData.get("endDate") || undefined,
    occurrenceLimit: formData.get("occurrenceLimit") || undefined,
    defaultAmount: formData.get("defaultAmount"),
    defaultAccountId: formData.get("defaultAccountId"),
    businessUnitKey: formData.get("businessUnitKey"),
    notes: formData.get("notes") || undefined,
  });

  const context = await requireWorkspaceContext();
  const client = await createSupabaseServerActionClient();

  if (!client) redirect("/app/planeacion/mes?error=config");

  const payload = normalizeTemplatePayload(input);
  const { error } = await client
    .from("expense_templates")
    .update({
      name: input.name,
      kind: input.kind,
      start_date: input.startDate,
      default_amount: input.defaultAmount,
      default_account_id: input.defaultAccountId,
      business_unit_key: input.businessUnitKey,
      ...payload,
    })
    .eq("workspace_id", context.workspace.id)
    .eq("id", input.templateId);

  if (error) redirect("/app/planeacion/mes?error=update_expense_template");

  revalidatePath("/app");
  redirect("/app/planeacion/mes?updated=template_expense");
}

export async function deleteIncomeTemplate(formData: FormData) {
  const input = deleteTemplateSchema.parse({
    templateId: formData.get("templateId"),
  });

  const context = await requireWorkspaceContext();
  const client = await createSupabaseServerActionClient();

  if (!client) redirect("/app/planeacion/mes?error=config");

  await client.from("scheduled_events").delete().eq("workspace_id", context.workspace.id).eq("template_id", input.templateId).neq("status", "confirmed");
  const { error } = await client.from("income_templates").delete().eq("workspace_id", context.workspace.id).eq("id", input.templateId);

  if (error) redirect("/app/planeacion/mes?error=delete_income_template");

  revalidatePath("/app");
  redirect("/app/planeacion/mes?deleted=template_income");
}

export async function deleteExpenseTemplate(formData: FormData) {
  const input = deleteTemplateSchema.parse({
    templateId: formData.get("templateId"),
  });

  const context = await requireWorkspaceContext();
  const client = await createSupabaseServerActionClient();

  if (!client) redirect("/app/planeacion/mes?error=config");

  await client.from("scheduled_events").delete().eq("workspace_id", context.workspace.id).eq("template_id", input.templateId).neq("status", "confirmed");
  const { error } = await client.from("expense_templates").delete().eq("workspace_id", context.workspace.id).eq("id", input.templateId);

  if (error) redirect("/app/planeacion/mes?error=delete_expense_template");

  revalidatePath("/app");
  redirect("/app/planeacion/mes?deleted=template_expense");
}

export async function createAccount(formData: FormData) {
  const input = accountSchema.parse({
    name: formData.get("name"),
    type: formData.get("type"),
    balance: formData.get("balance"),
    color: formData.get("color") || "accent",
  });

  const client = await getActionClient();
  await createAccountRpc(client, input);

  revalidatePath("/app");
  redirect("/app/dinero/cuentas?saved=1");
}

export async function updateAccount(formData: FormData) {
  const input = updateAccountSchema.parse({
    accountId: formData.get("accountId"),
    name: formData.get("name"),
    type: formData.get("type"),
    color: formData.get("color") || "accent",
    active: formData.get("active") || undefined,
  });

  const context = await requireWorkspaceContext();
  const client = await createSupabaseServerActionClient();

  if (!client) {
    redirect("/app/dinero/cuentas?error=config");
  }

  const { error } = await client
    .from("accounts")
    .update({
      name: input.name,
      type: input.type,
      color: input.color,
      active: input.active,
    })
    .eq("workspace_id", context.workspace.id)
    .eq("id", input.accountId);

  if (error) {
    redirect("/app/dinero/cuentas?error=update");
  }

  revalidatePath("/app");
  redirect("/app/dinero/cuentas?updated=1");
}

export async function deleteAccount(formData: FormData) {
  const input = deleteAccountSchema.parse({
    accountId: formData.get("accountId"),
  });

  const context = await requireWorkspaceContext();
  const client = await createSupabaseServerActionClient();

  if (!client) {
    redirect("/app/dinero/cuentas?error=config");
  }

  const usageChecks = await Promise.all([
    client.from("transactions").select("id", { head: true, count: "exact" }).eq("workspace_id", context.workspace.id).eq("account_id", input.accountId),
    client.from("scheduled_events").select("id", { head: true, count: "exact" }).eq("workspace_id", context.workspace.id).eq("account_id", input.accountId),
    client.from("financial_events").select("id", { head: true, count: "exact" }).eq("workspace_id", context.workspace.id).eq("account_id", input.accountId),
    client.from("incomes").select("id", { head: true, count: "exact" }).eq("workspace_id", context.workspace.id).eq("account_id", input.accountId),
    client.from("expenses").select("id", { head: true, count: "exact" }).eq("workspace_id", context.workspace.id).eq("account_id", input.accountId),
    client.from("debt_payments").select("id", { head: true, count: "exact" }).eq("workspace_id", context.workspace.id).eq("account_id", input.accountId),
    client.from("credit_card_payments").select("id", { head: true, count: "exact" }).eq("workspace_id", context.workspace.id).eq("account_id", input.accountId),
    client.from("savings_transactions").select("id", { head: true, count: "exact" }).eq("workspace_id", context.workspace.id).eq("account_id", input.accountId),
  ]);

  const firstError = usageChecks.find((result) => result.error)?.error;
  if (firstError) {
    redirect("/app/dinero/cuentas?error=usage");
  }

  const totalUsage = usageChecks.reduce((sum, result) => sum + Number(result.count ?? 0), 0);
  if (totalUsage > 0) {
    redirect("/app/dinero/cuentas?error=linked");
  }

  const { data: account, error: accountError } = await client
    .from("accounts")
    .select("balance")
    .eq("workspace_id", context.workspace.id)
    .eq("id", input.accountId)
    .maybeSingle();

  if (accountError) {
    redirect("/app/dinero/cuentas?error=delete");
  }

  if (Number(account?.balance ?? 0) !== 0) {
    redirect("/app/dinero/cuentas?error=balance");
  }

  const { error: deleteError } = await client
    .from("accounts")
    .delete()
    .eq("workspace_id", context.workspace.id)
    .eq("id", input.accountId);

  if (deleteError) {
    redirect("/app/dinero/cuentas?error=delete");
  }

  revalidatePath("/app");
  redirect("/app/dinero/cuentas?deleted=1");
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

  const client = await getActionClient();
  await createDebtRpc(client, input);

  revalidatePath("/app");
  redirect("/app/obligaciones?saved=1");
}

export async function updateDebt(formData: FormData) {
  const input = updateDebtSchema.parse({
    debtId: formData.get("debtId"),
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

  const context = await requireWorkspaceContext();
  const client = await createSupabaseServerActionClient();

  if (!client) {
    redirect("/app/obligaciones?error=config");
  }

  const nextStatus = input.balance <= 0 ? "paid" : input.nextDueDate < new Date().toISOString().slice(0, 10) ? "late" : "active";

  const { error } = await client
    .from("debts")
    .update({
      name: input.name,
      lender: input.lender,
      debt_type: input.debtType,
      principal_amount: input.principalAmount ?? null,
      balance: input.balance,
      installment: input.installment,
      next_due_date: input.nextDueDate,
      annual_interest_rate: input.annualInterestRate ?? null,
      interest_type: input.interestType ?? "unknown",
      term_months: input.termMonths ?? null,
      remaining_months: input.remainingMonths ?? null,
      estimated_total_payment: input.estimatedTotalPayment ?? null,
      priority: input.priority,
      status: nextStatus,
      notes: input.notes ?? null,
    })
    .eq("workspace_id", context.workspace.id)
    .eq("id", input.debtId);

  if (error) {
    redirect("/app/obligaciones?error=update_debt");
  }

  await client
    .from("scheduled_events")
    .update({
      title: input.name,
      amount: input.installment,
      due_date: input.nextDueDate,
      status: input.balance <= 0 ? "paid" : "scheduled",
      notes: input.notes ?? null,
    })
    .eq("workspace_id", context.workspace.id)
    .eq("linked_entity_type", "debt")
    .eq("linked_entity_id", input.debtId)
    .neq("status", "cancelled");

  revalidatePath("/app");
  redirect("/app/obligaciones?updated=debt");
}

export async function deleteDebt(formData: FormData) {
  const input = deleteDebtSchema.parse({
    debtId: formData.get("debtId"),
  });

  const context = await requireWorkspaceContext();
  const client = await createSupabaseServerActionClient();

  if (!client) {
    redirect("/app/obligaciones?error=config");
  }

  const usageChecks = await Promise.all([
    client.from("debt_payments").select("id", { head: true, count: "exact" }).eq("workspace_id", context.workspace.id).eq("debt_id", input.debtId),
    client.from("transactions").select("id", { head: true, count: "exact" }).eq("workspace_id", context.workspace.id).eq("source_type", "debt").eq("source_id", input.debtId),
  ]);

  const firstError = usageChecks.find((result) => result.error)?.error;
  if (firstError) {
    redirect("/app/obligaciones?error=usage_debt");
  }

  const totalUsage = usageChecks.reduce((sum, result) => sum + Number(result.count ?? 0), 0);
  if (totalUsage > 0) {
    redirect("/app/obligaciones?error=linked_debt");
  }

  await client
    .from("scheduled_events")
    .delete()
    .eq("workspace_id", context.workspace.id)
    .eq("linked_entity_type", "debt")
    .eq("linked_entity_id", input.debtId);

  const { error } = await client.from("debts").delete().eq("workspace_id", context.workspace.id).eq("id", input.debtId);

  if (error) {
    redirect("/app/obligaciones?error=delete_debt");
  }

  revalidatePath("/app");
  redirect("/app/obligaciones?deleted=debt");
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

  const client = await getActionClient();
  await createCreditCardRpc(client, input);

  revalidatePath("/app");
  redirect("/app/dinero/tarjetas?saved=1");
}

export async function updateCreditCard(formData: FormData) {
  const input = updateCreditCardSchema.parse({
    cardId: formData.get("cardId"),
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
    status: formData.get("status") || "active",
  });

  const context = await requireWorkspaceContext();
  const client = await createSupabaseServerActionClient();

  if (!client) {
    redirect("/app/dinero/tarjetas?error=config");
  }

  const computedStatus =
    input.status === "closed" ? "closed" : input.limit > 0 && input.used >= input.limit ? "blocked" : input.status;

  const { error } = await client
    .from("credit_cards")
    .update({
      name: input.name,
      issuer: input.issuer,
      limit_value: input.limit,
      used: input.used,
      cut_off_date: input.cutOffDate,
      pay_due_date: input.payDueDate,
      minimum_payment: input.minimumPayment,
      annual_interest_rate: input.annualInterestRate ?? null,
      interest_type: input.interestType ?? "unknown",
      estimated_payoff_months: input.estimatedPayoffMonths ?? null,
      estimated_total_payment: input.estimatedTotalPayment ?? null,
      payment_strategy: input.paymentStrategy ?? "minimum",
      notes: input.notes ?? null,
      status: computedStatus,
    })
    .eq("workspace_id", context.workspace.id)
    .eq("id", input.cardId);

  if (error) {
    redirect(`/app/dinero/tarjetas?card=${input.cardId}&error=update_card`);
  }

  await client
    .from("scheduled_events")
    .update({
      title: `${input.name} minimo`,
      amount: input.minimumPayment,
      due_date: buildMonthlyDueDate(input.payDueDate),
      status: computedStatus === "closed" ? "cancelled" : "scheduled",
      notes: input.notes ?? null,
    })
    .eq("workspace_id", context.workspace.id)
    .eq("linked_entity_type", "credit_card")
    .eq("linked_entity_id", input.cardId)
    .eq("kind", "card_payment");

  revalidatePath("/app");
  redirect(`/app/dinero/tarjetas?card=${input.cardId}&updated=1`);
}

export async function deleteCreditCard(formData: FormData) {
  const input = deleteCreditCardSchema.parse({
    cardId: formData.get("cardId"),
  });

  const context = await requireWorkspaceContext();
  const client = await createSupabaseServerActionClient();

  if (!client) {
    redirect("/app/dinero/tarjetas?error=config");
  }

  const usageChecks = await Promise.all([
    client.from("credit_card_payments").select("id", { head: true, count: "exact" }).eq("workspace_id", context.workspace.id).eq("credit_card_id", input.cardId),
    client.from("credit_card_purchases").select("id", { head: true, count: "exact" }).eq("workspace_id", context.workspace.id).eq("credit_card_id", input.cardId),
    client.from("transactions").select("id", { head: true, count: "exact" }).eq("workspace_id", context.workspace.id).eq("source_type", "credit_card").eq("source_id", input.cardId),
  ]);

  const firstError = usageChecks.find((result) => result.error)?.error;
  if (firstError) {
    redirect("/app/dinero/tarjetas?error=usage_card");
  }

  const totalUsage = usageChecks.reduce((sum, result) => sum + Number(result.count ?? 0), 0);
  if (totalUsage > 0) {
    redirect("/app/dinero/tarjetas?error=linked_card");
  }

  const { data: card } = await client
    .from("credit_cards")
    .select("used")
    .eq("workspace_id", context.workspace.id)
    .eq("id", input.cardId)
    .maybeSingle();

  if (Number(card?.used ?? 0) !== 0) {
    redirect("/app/dinero/tarjetas?error=balance_card");
  }

  await client
    .from("scheduled_events")
    .delete()
    .eq("workspace_id", context.workspace.id)
    .eq("linked_entity_type", "credit_card")
    .eq("linked_entity_id", input.cardId);

  const { error } = await client.from("credit_cards").delete().eq("workspace_id", context.workspace.id).eq("id", input.cardId);

  if (error) {
    redirect("/app/dinero/tarjetas?error=delete_card");
  }

  revalidatePath("/app");
  redirect("/app/dinero/tarjetas?deleted=1");
}

export async function createSavingsGoal(formData: FormData) {
  const input = savingsGoalSchema.parse({
    name: formData.get("name"),
    target: formData.get("target"),
    current: formData.get("current"),
    dueDate: formData.get("dueDate") || undefined,
    color: formData.get("color") || "success",
  });

  const client = await getActionClient();
  await createSavingsGoalRpc(client, input);

  revalidatePath("/app");
  redirect("/app/dinero/ahorro?saved=1");
}

export async function updateSavingsGoal(formData: FormData) {
  const input = updateSavingsGoalSchema.parse({
    goalId: formData.get("goalId"),
    name: formData.get("name"),
    target: formData.get("target"),
    dueDate: formData.get("dueDate") || undefined,
    color: formData.get("color") || "success",
  });

  const context = await requireWorkspaceContext();
  const client = await createSupabaseServerActionClient();

  if (!client) {
    redirect("/app/dinero/ahorro?error=config");
  }

  const { error } = await client
    .from("savings_goals")
    .update({
      name: input.name,
      target: input.target,
      due_date: input.dueDate ?? null,
      color: input.color,
    })
    .eq("workspace_id", context.workspace.id)
    .eq("id", input.goalId);

  if (error) {
    redirect("/app/dinero/ahorro?error=update_goal");
  }

  revalidatePath("/app");
  redirect("/app/dinero/ahorro?updated=1");
}

export async function deleteSavingsGoal(formData: FormData) {
  const input = deleteSavingsGoalSchema.parse({
    goalId: formData.get("goalId"),
  });

  const context = await requireWorkspaceContext();
  const client = await createSupabaseServerActionClient();

  if (!client) {
    redirect("/app/dinero/ahorro?error=config");
  }

  const { data: goal, error: goalError } = await client
    .from("savings_goals")
    .select("current")
    .eq("workspace_id", context.workspace.id)
    .eq("id", input.goalId)
    .maybeSingle();

  if (goalError) {
    redirect("/app/dinero/ahorro?error=delete_goal");
  }

  if (Number(goal?.current ?? 0) !== 0) {
    redirect("/app/dinero/ahorro?error=balance_goal");
  }

  const { count, error: usageError } = await client
    .from("savings_transactions")
    .select("id", { head: true, count: "exact" })
    .eq("workspace_id", context.workspace.id)
    .eq("savings_goal_id", input.goalId);

  if (usageError) {
    redirect("/app/dinero/ahorro?error=usage_goal");
  }

  if (Number(count ?? 0) > 0) {
    redirect("/app/dinero/ahorro?error=linked_goal");
  }

  const { error } = await client.from("savings_goals").delete().eq("workspace_id", context.workspace.id).eq("id", input.goalId);

  if (error) {
    redirect("/app/dinero/ahorro?error=delete_goal");
  }

  revalidatePath("/app");
  redirect("/app/dinero/ahorro?deleted=1");
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

  const context = await requireWorkspaceContext();
  const client = await getActionClient();
  await createTransferRpc(client, context.workspace.id, input);

  revalidatePath("/app");
  redirect("/app/transferir?saved=1");
}

export async function settleFinancialEvent(formData: FormData) {
  const input = settleEventSchema.parse({
    eventId: formData.get("eventId"),
    accountId: formData.get("accountId"),
  });

  const context = await requireWorkspaceContext();
  const client = await getActionClient();
  await payObligationRpc(client, context.workspace.id, {
    eventId: input.eventId,
    accountId: input.accountId,
  });

  revalidatePath("/app");
  redirect("/app/dashboard?saved=1");
}

export async function confirmScheduledEventNow(formData: FormData) {
  const input = confirmIncomeEventSchema.parse({
    eventId: formData.get("eventId"),
  });

  const context = await requireWorkspaceContext();
  const rpcClient = await getActionClient();
  const directClient = await createSupabaseServerActionClient();

  if (!directClient) {
    throw new Error("Supabase no esta configurado en el servidor.");
  }

  const today = new Date().toISOString().slice(0, 10);

  const { data: event, error: eventError } = await directClient
    .from("scheduled_events")
    .select("id, workspace_id, due_date, title, amount, kind, status, business_unit_key, account_id, linked_entity_type, linked_entity_id")
    .eq("workspace_id", context.workspace.id)
    .eq("id", input.eventId)
    .maybeSingle();

  if (eventError) {
    throw new Error(`No se pudo leer la entrada esperada: ${eventError.message}`);
  }

  if (!event) {
    throw new Error("La entrada esperada no existe en este espacio.");
  }

  if (!event.account_id) {
    throw new Error("El evento programado no tiene una cuenta asociada para confirmar en un clic.");
  }

  if (["paid", "confirmed", "cancelled"].includes(String(event.status))) {
    redirect("/app/hoy?confirmed=1");
  }

  const eventKind = String(event.kind);
  const movementKind =
    eventKind === "income"
      ? "income"
      : eventKind === "saving"
        ? "saving_contribution"
        : eventKind === "expense"
          ? "expense"
          : eventKind;
  const sourceType = typeof event.linked_entity_type === "string" && event.linked_entity_type !== "template" ? event.linked_entity_type : undefined;
  const sourceId = typeof event.linked_entity_id === "string" ? event.linked_entity_id : undefined;

  await createMovementRpc(rpcClient, context.workspace.id, {
    kind: movementKind,
    amount: Number(event.amount),
    concept: String(event.title),
    accountId: String(event.account_id),
    category: eventKind === "income" ? "Ingreso confirmado" : "Compromiso confirmado",
    unit: String(event.business_unit_key ?? "personal"),
    date: today,
    dueDate: String(event.due_date),
    status: "confirmed",
    sourceType,
    sourceId,
    metadata: {
      source: "arca-ui",
      created_by: "confirm-scheduled-event",
      scheduled_event_id: event.id,
      expected_due_date: String(event.due_date),
    },
  });

  const { data: createdMovement, error: createdMovementError } = await directClient
    .from("transactions")
    .select("id")
    .eq("workspace_id", context.workspace.id)
    .contains("metadata", { scheduled_event_id: event.id })
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (createdMovementError || !createdMovement?.id) {
    throw new Error(`Se creo el movimiento, pero no se pudo releer su enlace: ${createdMovementError?.message ?? "sin respuesta"}`);
  }

  const nextEventState = await buildScheduledEventUpdateOnConfirm(
    directClient as never,
    context.workspace.id,
    input.eventId,
    String(createdMovement.id),
    today
  );

  const { error: updateError } = await directClient
    .from("scheduled_events")
    .update(nextEventState)
    .eq("workspace_id", context.workspace.id)
    .eq("id", input.eventId);

  if (updateError) {
    throw new Error(`Se confirmo el evento, pero no se pudo cerrar en agenda: ${updateError.message}`);
  }

  revalidatePath("/app");
  redirect("/app/hoy?confirmed=1");
}

export async function confirmIncomeEvent(formData: FormData) {
  return confirmScheduledEventNow(formData);
}

export async function adjustAndConfirmScheduledEvent(formData: FormData) {
  const input = adjustScheduledEventSchema.parse({
    eventId: formData.get("eventId"),
    accountId: formData.get("accountId"),
    amount: formData.get("amount"),
    confirmedAt: formData.get("confirmedAt"),
  });

  const context = await requireWorkspaceContext();
  const rpcClient = await getActionClient();
  const directClient = await createSupabaseServerActionClient();

  if (!directClient) {
    throw new Error("Supabase no esta configurado en el servidor.");
  }

  const { data: event, error: eventError } = await directClient
    .from("scheduled_events")
    .select("id, workspace_id, due_date, title, kind, business_unit_key, linked_entity_type, linked_entity_id")
    .eq("workspace_id", context.workspace.id)
    .eq("id", input.eventId)
    .single();

  if (eventError || !event) {
    throw new Error(`No se pudo leer el evento programado: ${eventError?.message ?? "sin respuesta"}`);
  }

  const eventKind = String(event.kind);
  const movementKind =
    eventKind === "income"
      ? "income"
      : eventKind === "saving"
        ? "saving_contribution"
        : eventKind === "expense"
          ? "expense"
          : eventKind;
  const sourceType = typeof event.linked_entity_type === "string" && event.linked_entity_type !== "template" ? event.linked_entity_type : undefined;
  const sourceId = typeof event.linked_entity_id === "string" ? event.linked_entity_id : undefined;

  await createMovementRpc(rpcClient, context.workspace.id, {
    kind: movementKind,
    amount: input.amount,
    concept: String(event.title),
    accountId: input.accountId,
    category: eventKind === "income" ? "Ingreso confirmado" : "Compromiso confirmado",
    unit: String(event.business_unit_key ?? "personal"),
    date: input.confirmedAt,
    dueDate: String(event.due_date),
    status: "confirmed",
    sourceType,
    sourceId,
    metadata: {
      source: "arca-ui",
      created_by: "adjust-and-confirm-scheduled-event",
      scheduled_event_id: event.id,
      expected_due_date: String(event.due_date),
    },
  });

  const { data: createdMovement } = await directClient
    .from("transactions")
    .select("id")
    .eq("workspace_id", context.workspace.id)
    .contains("metadata", { scheduled_event_id: event.id })
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!createdMovement?.id) {
    throw new Error("No se pudo enlazar el movimiento confirmado con el evento programado.");
  }

  const nextEventState = await buildScheduledEventUpdateOnConfirm(
    directClient as never,
    context.workspace.id,
    input.eventId,
    String(createdMovement.id),
    input.confirmedAt
  );

  await directClient.from("scheduled_events").update({
    ...nextEventState,
    account_id: input.accountId,
    amount: input.amount,
  }).eq("workspace_id", context.workspace.id).eq("id", input.eventId);

  revalidatePath("/app");
  redirect("/app/hoy?confirmed=1");
}

export async function ensureScheduledEventsForMonth(formData: FormData) {
  const context = await requireWorkspaceContext();
  const client = await createSupabaseServerActionClient();

  if (!client) {
    throw new Error("Supabase no esta configurado en el servidor.");
  }

  await ensureScheduledEventsForWorkspace(client as never, context.workspace.id);

  const returnTo = String(formData.get("returnTo") || "/app/planeacion/mes");
  revalidatePath("/app");
  redirect(returnTo.startsWith("/app") ? returnTo : "/app/planeacion/mes");
}

export async function reverseTransaction(formData: FormData) {
  const input = reverseTransactionSchema.parse({
    transactionId: formData.get("transactionId"),
  });

  const context = await requireWorkspaceContext();
  const client = await createSupabaseServerActionClient();

  if (!client) {
    throw new Error("Supabase no esta configurado en el servidor.");
  }

  const { data: transaction, error } = await client
    .from("transactions")
    .select("id, workspace_id, kind, amount, account_id, concept, date, metadata, source_type, source_id")
    .eq("id", input.transactionId)
    .eq("workspace_id", context.workspace.id)
    .single();

  if (error || !transaction) {
    throw new Error(`No se pudo leer el movimiento: ${error?.message ?? "sin respuesta"}`);
  }

  const movement = transaction as {
    id: string;
    kind: string;
    amount: number;
    account_id: string | null;
    concept: string;
    date: string;
    metadata?: Record<string, unknown> | null;
    source_type?: string | null;
    source_id?: string | null;
  };

  const metadata = (movement.metadata ?? {}) as Record<string, unknown>;
  const scheduledEventId = typeof metadata.scheduled_event_id === "string" ? metadata.scheduled_event_id : null;
  const transferId = typeof metadata.transfer_id === "string" ? metadata.transfer_id : null;

  if (movement.kind === "transfer" && transferId) {
    const { data: transferTransactions, error: transferError } = await client
      .from("transactions")
      .select("id, amount, account_id, metadata")
      .eq("workspace_id", context.workspace.id)
      .contains("metadata", { transfer_id: transferId });

    if (transferError) {
      throw new Error(`No se pudo revertir la transferencia: ${transferError.message}`);
    }

    for (const item of transferTransactions ?? []) {
      const direction = (item.metadata as Record<string, unknown> | null)?.direction;

      if (!item.account_id) {
        continue;
      }

      const { data: account, error: accountError } = await client
        .from("accounts")
        .select("balance")
        .eq("workspace_id", context.workspace.id)
        .eq("id", item.account_id)
        .single();

      if (accountError) {
        throw new Error(`No se pudo leer la cuenta de la transferencia: ${accountError.message}`);
      }

      const currentBalance = Number(account?.balance ?? 0);

      if (direction === "out") {
        await client
          .from("accounts")
          .update({ balance: currentBalance + Number(item.amount) })
          .eq("workspace_id", context.workspace.id)
          .eq("id", item.account_id);
      }

      if (direction === "in") {
        if (currentBalance < Number(item.amount)) {
          throw new Error("No se puede deshacer la transferencia porque la cuenta destino ya no tiene ese saldo disponible.");
        }

        await client
          .from("accounts")
          .update({ balance: currentBalance - Number(item.amount) })
          .eq("workspace_id", context.workspace.id)
          .eq("id", item.account_id);
      }
    }

    await client.from("transactions").delete().eq("workspace_id", context.workspace.id).contains("metadata", { transfer_id: transferId });
  } else {
    if (movement.account_id) {
      const { data: account, error: accountError } = await client
        .from("accounts")
        .select("balance")
        .eq("workspace_id", context.workspace.id)
        .eq("id", movement.account_id)
        .single();

      if (accountError) {
        throw new Error(`No se pudo leer la cuenta del movimiento: ${accountError.message}`);
      }

      const currentBalance = Number(account?.balance ?? 0);
      let nextBalance = currentBalance;

      if (movement.kind === "income" || movement.kind === "saving_withdrawal") {
        if (currentBalance < Number(movement.amount)) {
          throw new Error("No se puede deshacer este movimiento porque la cuenta ya no tiene ese saldo disponible.");
        }
        nextBalance = currentBalance - Number(movement.amount);
      }

      if (["expense", "debt_payment", "card_payment", "saving_contribution"].includes(movement.kind)) {
        nextBalance = currentBalance + Number(movement.amount);
      }

      if (nextBalance !== currentBalance) {
        await client
          .from("accounts")
          .update({ balance: nextBalance })
          .eq("workspace_id", context.workspace.id)
          .eq("id", movement.account_id);
      }
    }

    if (movement.kind === "debt_payment" && movement.source_type === "debt" && movement.source_id) {
      const { data: debt, error: debtError } = await client
        .from("debts")
        .select("balance")
        .eq("workspace_id", context.workspace.id)
        .eq("id", movement.source_id)
        .single();

      if (debtError) {
        throw new Error(`No se pudo leer la deuda: ${debtError.message}`);
      }

      await client
        .from("debts")
        .update({
          balance: Number(debt?.balance ?? 0) + Number(movement.amount),
          status: "active",
        })
        .eq("workspace_id", context.workspace.id)
        .eq("id", movement.source_id);
    }

    if ((movement.kind === "card_payment" || movement.kind === "card_purchase") && movement.source_type === "credit_card" && movement.source_id) {
      const { data: card, error: cardError } = await client
        .from("credit_cards")
        .select("used, limit_value")
        .eq("workspace_id", context.workspace.id)
        .eq("id", movement.source_id)
        .single();

      if (cardError) {
        throw new Error(`No se pudo leer la tarjeta: ${cardError.message}`);
      }

      const currentUsed = Number(card?.used ?? 0);
      const nextUsed =
        movement.kind === "card_payment"
          ? currentUsed + Number(movement.amount)
          : Math.max(0, currentUsed - Number(movement.amount));

      await client
        .from("credit_cards")
        .update({
          used: nextUsed,
          status: Number(card?.limit_value ?? 0) > 0 && nextUsed >= Number(card?.limit_value ?? 0) ? "blocked" : "active",
        })
        .eq("workspace_id", context.workspace.id)
        .eq("id", movement.source_id);
    }

    if (movement.kind === "card_purchase" && movement.source_type === "credit_card" && movement.source_id) {
      const { data: purchase } = await client
        .from("credit_card_purchases")
        .select("id")
        .eq("workspace_id", context.workspace.id)
        .eq("credit_card_id", movement.source_id)
        .eq("concept", movement.concept)
        .eq("amount", movement.amount)
        .eq("purchase_date", movement.date)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (purchase?.id) {
        await client.from("credit_card_purchases").delete().eq("workspace_id", context.workspace.id).eq("id", purchase.id);
      }
    }

    if (scheduledEventId) {
      await client.from("scheduled_events").update({ status: "scheduled" }).eq("workspace_id", context.workspace.id).eq("id", scheduledEventId);
    }

    await client.from("transactions").delete().eq("workspace_id", context.workspace.id).eq("id", movement.id);
  }

  revalidatePath("/app");
  redirect("/app/historial?reversed=1");
}

export async function createBusinessUnit(formData: FormData) {
  const input = businessUnitSchema.parse({
    name: formData.get("name"),
    key: formData.get("key") || undefined,
  });

  const context = await requireWorkspaceContext();
  const client = await createSupabaseServerActionClient();

  if (!client) {
    throw new Error("Supabase no esta configurado en el servidor.");
  }

  const key = slugifyBusinessUnitKey(input.key || input.name);

  const { data: existing, error: existingError } = await client
    .from("business_units")
    .select("key")
    .eq("workspace_id", context.workspace.id)
    .eq("key", key)
    .maybeSingle();

  if (existingError) {
    throw new Error(`No se pudo validar la fuente/unidad: ${existingError.message}`);
  }

  if (existing) {
    throw new Error("Ya existe una fuente/unidad con esa clave.");
  }

  const { error: insertBusinessError } = await client.from("business_units").insert({
    workspace_id: context.workspace.id,
    key,
    name: input.name,
    income: 0,
    expense: 0,
    pending: 0,
  });

  if (insertBusinessError) {
    throw new Error(`No se pudo crear la fuente/unidad: ${insertBusinessError.message}`);
  }

  const { error: insertIncomeError } = await client.from("income_sources").insert({
    workspace_id: context.workspace.id,
    name: input.name,
    business_unit_key: key,
    type: "manual",
    active: true,
  });

  if (insertIncomeError) {
    await client.from("business_units").delete().eq("workspace_id", context.workspace.id).eq("key", key);
    throw new Error(`No se pudo crear la fuente de ingreso asociada: ${insertIncomeError.message}`);
  }

  revalidatePath("/app");
  redirect("/app/negocios?saved=1");
}

export async function updateBusinessUnit(formData: FormData) {
  const input = updateBusinessUnitSchema.parse({
    key: formData.get("key"),
    name: formData.get("name"),
  });

  const context = await requireWorkspaceContext();
  const client = await createSupabaseServerActionClient();

  if (!client) {
    redirect("/app/negocios?error=config");
  }

  const { error: businessError } = await client
    .from("business_units")
    .update({ name: input.name })
    .eq("workspace_id", context.workspace.id)
    .eq("key", input.key);

  if (businessError) {
    redirect("/app/negocios?error=update_unit");
  }

  await client
    .from("income_sources")
    .update({ name: input.name })
    .eq("workspace_id", context.workspace.id)
    .eq("business_unit_key", input.key);

  revalidatePath("/app");
  redirect("/app/negocios?updated=1");
}

export async function deleteBusinessUnit(formData: FormData) {
  const input = deleteBusinessUnitSchema.parse({
    key: formData.get("key"),
  });

  const context = await requireWorkspaceContext();
  const client = await createSupabaseServerActionClient();

  if (!client) {
    throw new Error("Supabase no esta configurado en el servidor.");
  }

  const usageChecks = await Promise.all([
    client.from("transactions").select("id", { head: true, count: "exact" }).eq("workspace_id", context.workspace.id).eq("unit", input.key),
    client.from("scheduled_events").select("id", { head: true, count: "exact" }).eq("workspace_id", context.workspace.id).eq("business_unit_key", input.key),
    client.from("incomes").select("id", { head: true, count: "exact" }).eq("workspace_id", context.workspace.id).eq("business_unit_key", input.key),
    client.from("expenses").select("id", { head: true, count: "exact" }).eq("workspace_id", context.workspace.id).eq("business_unit_key", input.key),
    client.from("credit_card_purchases").select("id", { head: true, count: "exact" }).eq("workspace_id", context.workspace.id).eq("business_unit_key", input.key),
    client.from("financial_events").select("id", { head: true, count: "exact" }).eq("workspace_id", context.workspace.id).eq("business_unit_key", input.key),
  ]);

  const firstError = usageChecks.find((result) => result.error)?.error;
  if (firstError) {
    throw new Error(`No se pudo validar uso de la fuente/unidad: ${firstError.message}`);
  }

  const totalUsage = usageChecks.reduce((sum, result) => sum + Number(result.count ?? 0), 0);
  if (totalUsage > 0) {
    throw new Error("No puedes borrar esta fuente/unidad porque ya tiene movimientos o agenda asociada.");
  }

  const { error: deleteIncomeError } = await client
    .from("income_sources")
    .delete()
    .eq("workspace_id", context.workspace.id)
    .eq("business_unit_key", input.key);

  if (deleteIncomeError) {
    throw new Error(`No se pudieron borrar las fuentes de ingreso asociadas: ${deleteIncomeError.message}`);
  }

  const { error: deleteBusinessError } = await client
    .from("business_units")
    .delete()
    .eq("workspace_id", context.workspace.id)
    .eq("key", input.key);

  if (deleteBusinessError) {
    throw new Error(`No se pudo borrar la fuente/unidad: ${deleteBusinessError.message}`);
  }

  revalidatePath("/app");
  redirect("/app/negocios?deleted=1");
}
