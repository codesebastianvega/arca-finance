"use server";

import { revalidatePath } from "next/cache";
import { requireWorkspaceContext } from "@/src/lib/auth";
import { getSupabaseAdminClient } from "@/src/lib/supabase";

function timingStatusFromDates(dueDateRaw: string, paidAtRaw: string) {
  const dueDate = new Date(`${dueDateRaw}T00:00:00-05:00`);
  const paidAt = new Date(`${paidAtRaw}T00:00:00-05:00`);

  if (paidAt.getTime() < dueDate.getTime()) return "early";
  if (paidAt.getTime() > dueDate.getTime()) return "late";
  return "on_time";
}

function todayDateInBogota() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Bogota",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function transactionDelta(kind: string, amount: number) {
  if (kind === "income" || kind === "transfer_in") return amount;
  if (kind === "card_purchase") return 0;
  return -amount;
}

export async function confirmScheduledEventNow(eventId: string) {
  const context = await requireWorkspaceContext();
  const admin = getSupabaseAdminClient();

  if (!admin) {
    throw new Error("Supabase admin client no disponible.");
  }

  const { data: event, error: eventError } = await admin
    .from("scheduled_events")
    .select("id, workspace_id, due_date, title, amount, kind, status, business_unit_key, account_id, notes, confirmed_transaction_id")
    .eq("id", eventId)
    .eq("workspace_id", context.workspace.id)
    .maybeSingle();

  if (eventError || !event) {
    throw new Error(`No se pudo leer el evento: ${eventError?.message ?? "sin respuesta"}`);
  }

  if (event.confirmed_transaction_id || event.status === "confirmed" || event.status === "confirmado") {
    revalidatePath("/app");
    return { ok: true, alreadyConfirmed: true };
  }

  if (!event.account_id) {
    throw new Error("Este evento no tiene una cuenta ligada para confirmarlo.");
  }

  const today = todayDateInBogota();
  const amount = typeof event.amount === "number" ? event.amount : Number(event.amount ?? 0);
  const kind = String(event.kind ?? "expense");
  const isIncome = kind === "income";
  const delta = isIncome ? amount : -amount;

  const { data: account, error: accountError } = await admin
    .from("accounts")
    .select("id, balance, workspace_id")
    .eq("id", event.account_id)
    .eq("workspace_id", context.workspace.id)
    .maybeSingle();

  if (accountError || !account) {
    throw new Error(`No se pudo leer la cuenta del evento: ${accountError?.message ?? "sin respuesta"}`);
  }

  const currentBalance = typeof account.balance === "number" ? account.balance : Number(account.balance ?? 0);
  const nextBalance = currentBalance + delta;

  if (!isIncome && nextBalance < 0) {
    throw new Error("La cuenta no tiene saldo suficiente para confirmar este movimiento.");
  }

  const { data: transaction, error: transactionError } = await admin
    .from("transactions")
    .insert({
      workspace_id: context.workspace.id,
      kind,
      status: "confirmed",
      amount,
      concept: event.title,
      account_id: event.account_id,
      category: kind,
      unit: event.business_unit_key ?? "general",
      due_date: `${event.due_date}T00:00:00-05:00`,
      date: `${today}T00:00:00-05:00`,
      posted_at: new Date().toISOString(),
      source_type: "scheduled_event",
      source_id: event.id,
      metadata: {
        scheduled_event_id: event.id,
        notes: event.notes ?? null,
      },
    })
    .select("id")
    .single();

  if (transactionError || !transaction) {
    throw new Error(`No se pudo crear la transacción: ${transactionError?.message ?? "sin respuesta"}`);
  }

  const { error: accountUpdateError } = await admin
    .from("accounts")
    .update({ balance: nextBalance })
    .eq("id", event.account_id)
    .eq("workspace_id", context.workspace.id);

  if (accountUpdateError) {
    throw new Error(`Se creó la transacción, pero no se pudo actualizar la cuenta: ${accountUpdateError.message}`);
  }

  const timingStatus = timingStatusFromDates(String(event.due_date), today);
  const { error: eventUpdateError } = await admin
    .from("scheduled_events")
    .update({
      status: "confirmed",
      timing_status: timingStatus,
      confirmed_transaction_id: transaction.id,
      updated_at: new Date().toISOString(),
    })
    .eq("id", event.id)
    .eq("workspace_id", context.workspace.id);

  if (eventUpdateError) {
    throw new Error(`Se creó la transacción, pero no se pudo cerrar el evento: ${eventUpdateError.message}`);
  }

  revalidatePath("/app");
  return { ok: true, transactionId: String(transaction.id) };
}

export async function adjustAndConfirmScheduledEvent(input: {
  eventId: string;
  amount: number;
  effectiveDate?: string;
  accountId?: string;
}) {
  const context = await requireWorkspaceContext();
  const admin = getSupabaseAdminClient();

  if (!admin) {
    throw new Error("Supabase admin client no disponible.");
  }

  const { data: event, error: eventError } = await admin
    .from("scheduled_events")
    .select("id, workspace_id, due_date, title, amount, kind, status, business_unit_key, account_id, notes, confirmed_transaction_id")
    .eq("id", input.eventId)
    .eq("workspace_id", context.workspace.id)
    .maybeSingle();

  if (eventError || !event) {
    throw new Error(`No se pudo leer el evento: ${eventError?.message ?? "sin respuesta"}`);
  }

  if (event.confirmed_transaction_id || event.status === "confirmed" || event.status === "confirmado") {
    revalidatePath("/app");
    return { ok: true, alreadyConfirmed: true };
  }

  const accountId = input.accountId?.trim() || event.account_id;
  if (!accountId) {
    throw new Error("Este evento no tiene una cuenta ligada para confirmarlo.");
  }

  const effectiveDate = input.effectiveDate?.trim() || todayDateInBogota();
  const expectedAmount = typeof event.amount === "number" ? event.amount : Number(event.amount ?? 0);
  const amount = Number(input.amount);
  const kind = String(event.kind ?? "expense");
  const isIncome = kind === "income";
  const delta = isIncome ? amount : -amount;

  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error("El monto confirmado debe ser mayor a cero.");
  }

  const { data: account, error: accountError } = await admin
    .from("accounts")
    .select("id, balance, workspace_id, name")
    .eq("id", accountId)
    .eq("workspace_id", context.workspace.id)
    .maybeSingle();

  if (accountError || !account) {
    throw new Error(`No se pudo leer la cuenta del evento: ${accountError?.message ?? "sin respuesta"}`);
  }

  const currentBalance = typeof account.balance === "number" ? account.balance : Number(account.balance ?? 0);
  const nextBalance = currentBalance + delta;

  if (!isIncome && nextBalance < 0) {
    throw new Error("La cuenta no tiene saldo suficiente para confirmar este movimiento.");
  }

  const { data: transaction, error: transactionError } = await admin
    .from("transactions")
    .insert({
      workspace_id: context.workspace.id,
      kind,
      status: "confirmed",
      amount,
      concept: event.title,
      account_id: accountId,
      category: kind,
      unit: event.business_unit_key ?? "general",
      due_date: `${event.due_date}T00:00:00-05:00`,
      date: `${effectiveDate}T00:00:00-05:00`,
      posted_at: new Date().toISOString(),
      source_type: "scheduled_event",
      source_id: event.id,
      metadata: {
        scheduled_event_id: event.id,
        notes: event.notes ?? null,
        expected_amount: expectedAmount,
        adjusted_amount: amount !== expectedAmount,
        confirmed_account_id: accountId,
        confirmed_account_name: account.name,
      },
    })
    .select("id")
    .single();

  if (transactionError || !transaction) {
    throw new Error(`No se pudo crear la transaccion: ${transactionError?.message ?? "sin respuesta"}`);
  }

  const { error: accountUpdateError } = await admin
    .from("accounts")
    .update({ balance: nextBalance, updated_at: new Date().toISOString() })
    .eq("id", accountId)
    .eq("workspace_id", context.workspace.id);

  if (accountUpdateError) {
    throw new Error(`Se creo la transaccion, pero no se pudo actualizar la cuenta: ${accountUpdateError.message}`);
  }

  const timingStatus = timingStatusFromDates(String(event.due_date), effectiveDate);
  const { error: eventUpdateError } = await admin
    .from("scheduled_events")
    .update({
      status: "confirmed",
      timing_status: timingStatus,
      confirmed_transaction_id: transaction.id,
      paid_amount: amount,
      paid_at: `${effectiveDate}T00:00:00-05:00`,
      account_id: accountId,
      updated_at: new Date().toISOString(),
    })
    .eq("id", event.id)
    .eq("workspace_id", context.workspace.id);

  if (eventUpdateError) {
    throw new Error(`Se creo la transaccion, pero no se pudo cerrar el evento: ${eventUpdateError.message}`);
  }

  revalidatePath("/app");
  return { ok: true, transactionId: String(transaction.id) };
}

export async function updateAccount(input: { id: string; name: string; entity?: string | null; balance: number; type: string; color: string }) {
  const context = await requireWorkspaceContext();
  const admin = getSupabaseAdminClient();

  if (!admin) throw new Error("Supabase admin client no disponible.");

  // 1. Fetch current balance to compute difference
  const { data: currentAccount, error: fetchError } = await admin
    .from("accounts")
    .select("balance, name")
    .eq("id", input.id)
    .eq("workspace_id", context.workspace.id)
    .maybeSingle();

  if (fetchError || !currentAccount) {
    throw new Error(`No se pudo leer el estado actual de la cuenta: ${fetchError?.message ?? "no encontrada"}`);
  }

  const oldBalance = Number(currentAccount.balance ?? 0);
  const newBalance = Number(input.balance);
  const diff = newBalance - oldBalance;

  // 2. Update the account
  const { error } = await admin
    .from("accounts")
    .update({
      name: input.name.trim(),
      entity: input.entity?.trim() || null,
      type: input.type.trim(),
      balance: newBalance,
      color: input.color.trim() || "#C68A45",
      updated_at: new Date().toISOString(),
    })
    .eq("id", input.id)
    .eq("workspace_id", context.workspace.id);

  if (error) throw new Error(`No se pudo actualizar la cuenta: ${error.message}`);

  // 3. Log a transaction if there is a difference (reconciliation/adjustment)
  if (diff !== 0) {
    const today = new Intl.DateTimeFormat("en-CA", {
      timeZone: "America/Bogota",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date());

    const { error: txError } = await admin.from("transactions").insert({
      workspace_id: context.workspace.id,
      kind: diff > 0 ? "income" : "expense",
      status: "confirmed",
      amount: Math.abs(diff),
      concept: `Ajuste de saldo: ${input.name.trim()}`,
      account_id: input.id,
      category: diff > 0 ? "Ingreso" : "Otros",
      unit: "personal",
      date: `${today}T00:00:00-05:00`,
      posted_at: new Date().toISOString(),
      metadata: { is_adjustment: true, old_balance: oldBalance, new_balance: newBalance },
    });

    if (txError) {
      console.error("No se pudo registrar la transaccion de ajuste de saldo:", txError.message);
    }
  }

  revalidatePath("/app");
  return { ok: true };
}

export async function deleteAccount(accountId: string) {
  const context = await requireWorkspaceContext();
  const admin = getSupabaseAdminClient();

  if (!admin) throw new Error("Supabase admin client no disponible.");

  const { error } = await admin
    .from("accounts")
    .delete()
    .eq("id", accountId)
    .eq("workspace_id", context.workspace.id);

  if (error) throw new Error(`No se pudo eliminar la cuenta: ${error.message}`);

  revalidatePath("/app");
  return { ok: true };
}

export async function createAccount(input: {
  name: string;
  entity?: string | null;
  type: string;
  balance: number;
  color: string;
}) {
  const context = await requireWorkspaceContext();
  const admin = getSupabaseAdminClient();

  if (!admin) throw new Error("Supabase admin client no disponible.");

  const name = input.name.trim();
  const entity = input.entity?.trim() || null;
  const type = input.type.trim();
  const balance = Number(input.balance ?? 0);
  const color = input.color.trim() || "#C68A45";

  if (!name) throw new Error("La cuenta necesita un nombre.");
  if (!type) throw new Error("La cuenta necesita un tipo.");
  if (!Number.isFinite(balance) || balance < 0) throw new Error("El saldo inicial debe ser valido.");

  const { data: newAccount, error } = await admin
    .from("accounts")
    .insert({
      workspace_id: context.workspace.id,
      name,
      entity,
      type,
      balance,
      color,
      active: true,
      archived: false,
    })
    .select("id")
    .single();

  if (error || !newAccount) throw new Error(`No se pudo crear la cuenta: ${error?.message ?? "desconocido"}`);

  if (balance > 0) {
    const today = new Intl.DateTimeFormat("en-CA", {
      timeZone: "America/Bogota",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date());

    const { error: txError } = await admin.from("transactions").insert({
      workspace_id: context.workspace.id,
      kind: "income",
      status: "confirmed",
      amount: balance,
      concept: `Saldo inicial: ${name}`,
      account_id: newAccount.id,
      category: "Ingreso",
      unit: "personal",
      date: `${today}T00:00:00-05:00`,
      posted_at: new Date().toISOString(),
      metadata: { is_initial_balance: true },
    });

    if (txError) {
      console.error("No se pudo registrar la transaccion de saldo inicial:", txError.message);
    }
  }

  revalidatePath("/app");
  return { ok: true };
}

export async function createMovement(input: {
  kind: "income" | "expense";
  amount: number;
  concept: string;
  accountId: string;
  category: string;
  unit: string;
  date?: string;
  sourceId?: string | null;
  sourceLabel?: string | null;
}) {
  const context = await requireWorkspaceContext();
  const admin = getSupabaseAdminClient();

  if (!admin) throw new Error("Supabase admin client no disponible.");

  const kind = input.kind;
  const amount = Number(input.amount ?? 0);
  const concept = input.concept.trim();
  const accountId = input.accountId.trim();
  const category = input.category.trim() || (kind === "income" ? "ingreso" : "general");
  const unit = input.unit.trim() || "general";
  const date = input.date?.trim() || todayDateInBogota();
  const sourceId = input.sourceId?.trim() || null;
  const sourceLabel = input.sourceLabel?.trim() || null;

  if (kind !== "income" && kind !== "expense") throw new Error("Tipo de movimiento invalido.");
  if (!Number.isFinite(amount) || amount <= 0) throw new Error("El monto debe ser mayor a cero.");
  if (!concept) throw new Error("El movimiento necesita un concepto.");
  if (!accountId) throw new Error("Debes elegir una cuenta.");

  const { data: account, error: accountError } = await admin
    .from("accounts")
    .select("id, name, balance, workspace_id")
    .eq("id", accountId)
    .eq("workspace_id", context.workspace.id)
    .maybeSingle();

  if (accountError || !account) {
    throw new Error(`No se pudo leer la cuenta del movimiento: ${accountError?.message ?? "sin respuesta"}`);
  }

  const currentBalance = typeof account.balance === "number" ? account.balance : Number(account.balance ?? 0);
  const delta = kind === "income" ? amount : -amount;
  const nextBalance = currentBalance + delta;

  if (kind === "expense" && nextBalance < 0) {
    throw new Error("La cuenta elegida no tiene saldo suficiente.");
  }

  const { data: transaction, error: transactionError } = await admin
    .from("transactions")
    .insert({
      workspace_id: context.workspace.id,
      kind,
      status: "confirmed",
      amount,
      concept,
      account_id: accountId,
      category,
      unit,
      date: `${date}T00:00:00-05:00`,
      posted_at: new Date().toISOString(),
      source_type: sourceId ? "income_source" : "manual",
      source_id: sourceId,
      metadata: {
        account_name: account.name,
        income_source_name: sourceLabel,
      },
    })
    .select("id")
    .single();

  if (transactionError || !transaction) {
    throw new Error(`No se pudo crear el movimiento: ${transactionError?.message ?? "sin respuesta"}`);
  }

  const { error: accountUpdateError } = await admin
    .from("accounts")
    .update({
      balance: nextBalance,
      updated_at: new Date().toISOString(),
    })
    .eq("id", accountId)
    .eq("workspace_id", context.workspace.id);

  if (accountUpdateError) {
    throw new Error(`Se creo el movimiento, pero no se pudo actualizar la cuenta: ${accountUpdateError.message}`);
  }

  revalidatePath("/app");
  return { ok: true, transactionId: String(transaction.id) };
}

export async function createScheduledObligation(input: {
  title: string;
  amount: number;
  dueDate: string;
  accountId?: string | null;
  obligationType?: string | null;
  notes?: string | null;
  interestRate?: number | null;
  installments?: number | null;
}) {
  const context = await requireWorkspaceContext();
  const admin = getSupabaseAdminClient();

  if (!admin) throw new Error("Supabase admin client no disponible.");

  const title = input.title.trim();
  const amount = Number(input.amount ?? 0);
  const dueDate = input.dueDate.trim();
  const accountId = input.accountId?.trim() || null;
  const obligationType = input.obligationType?.trim() || "otro";
  const userNotes = input.notes?.trim() || null;
  const interestRate =
    input.interestRate == null || Number.isNaN(input.interestRate) ? null : Number(input.interestRate);
  const installments =
    input.installments == null || Number.isNaN(input.installments) ? null : Math.max(0, Math.trunc(Number(input.installments)));

  if (!title) throw new Error("La obligacion necesita un nombre.");
  if (!Number.isFinite(amount) || amount <= 0) throw new Error("El monto debe ser mayor a cero.");
  if (!dueDate) throw new Error("Debes definir la proxima fecha de pago.");

  if (accountId) {
    const { data: account, error: accountError } = await admin
      .from("accounts")
      .select("id")
      .eq("id", accountId)
      .eq("workspace_id", context.workspace.id)
      .maybeSingle();

    if (accountError || !account) {
      throw new Error(`No se pudo validar la cuenta sugerida: ${accountError?.message ?? "sin respuesta"}`);
    }
  }

  const kind = installments && installments > 0 ? "debt_payment" : "expense";
  const priority =
    obligationType === "arriendo" || obligationType === "credito" || obligationType === "tarjeta" ? "high" : "medium";
  const notesParts = [
    `Tipo: ${obligationType}`,
    interestRate != null ? `Interes EA: ${interestRate}%` : null,
    installments != null && installments > 0 ? `Cuotas: ${installments}` : null,
    userNotes,
  ].filter(Boolean);

  const { error } = await admin.from("scheduled_events").insert({
    workspace_id: context.workspace.id,
    due_date: dueDate,
    title,
    amount,
    kind,
    status: "scheduled",
    priority,
    account_id: accountId,
    suggested_account_id: accountId,
    linked_entity_type: obligationType,
    notes: notesParts.length > 0 ? notesParts.join(" · ") : null,
  });

  if (error) {
    throw new Error(`No se pudo crear la obligacion: ${error.message}`);
  }

  revalidatePath("/app");
  return { ok: true };
}

export async function createReceivableLoan(input: {
  debtorName: string;
  title?: string | null;
  amount: number;
  dueDate?: string | null;
  accountId: string;
  notes?: string | null;
}) {
  const context = await requireWorkspaceContext();
  const admin = getSupabaseAdminClient();

  if (!admin) throw new Error("Supabase admin client no disponible.");

  const debtorName = input.debtorName.trim();
  const requestedTitle = input.title?.trim() || "";
  const amount = Number(input.amount ?? 0);
  const dueDate = input.dueDate?.trim() || null;
  const accountId = input.accountId.trim();
  const notes = input.notes?.trim() || null;

  if (!debtorName) throw new Error("Debes indicar a quien le prestaste.");
  if (!Number.isFinite(amount) || amount <= 0) throw new Error("El monto debe ser mayor a cero.");
  if (!accountId) throw new Error("Debes elegir la cuenta de origen.");

  const { data: account, error: accountError } = await admin
    .from("accounts")
    .select("id, name, balance")
    .eq("id", accountId)
    .eq("workspace_id", context.workspace.id)
    .maybeSingle();

  if (accountError || !account) {
    throw new Error(`No se pudo leer la cuenta del prestamo: ${accountError?.message ?? "sin respuesta"}`);
  }

  const currentBalance = typeof account.balance === "number" ? account.balance : Number(account.balance ?? 0);
  const nextBalance = currentBalance - amount;

  if (nextBalance < 0) {
    throw new Error("La cuenta elegida no tiene saldo suficiente para prestar ese monto.");
  }

  const title = requestedTitle || `Préstamo a ${debtorName}`;
  const loanNotes = [notes, `Sale de ${account.name}`].filter(Boolean).join(" · ");

  const { data: receivable, error: receivableError } = await admin
    .from("receivables")
    .insert({
      workspace_id: context.workspace.id,
      title,
      debtor_name: debtorName,
      amount,
      due_date: dueDate,
      status: "pending",
      notes: loanNotes || null,
    })
    .select("id")
    .single();

  if (receivableError || !receivable) {
    throw new Error(`No se pudo crear la cuenta por cobrar: ${receivableError?.message ?? "sin respuesta"}`);
  }

  const transactionDate = todayDateInBogota();
  const { data: transaction, error: transactionError } = await admin
    .from("transactions")
    .insert({
      workspace_id: context.workspace.id,
      kind: "receivable_loan",
      status: "confirmed",
      amount,
      concept: title,
      account_id: accountId,
      category: "Prestamo",
      unit: "general",
      date: `${transactionDate}T00:00:00-05:00`,
      posted_at: new Date().toISOString(),
      source_type: "manual",
      source_id: receivable.id,
      metadata: {
        receivable_id: receivable.id,
        debtor_name: debtorName,
        account_name: account.name,
      },
    })
    .select("id")
    .single();

  if (transactionError || !transaction) {
    throw new Error(`No se pudo registrar la salida del prestamo: ${transactionError?.message ?? "sin respuesta"}`);
  }

  const { error: accountUpdateError } = await admin
    .from("accounts")
    .update({
      balance: nextBalance,
      updated_at: new Date().toISOString(),
    })
    .eq("id", accountId)
    .eq("workspace_id", context.workspace.id);

  if (accountUpdateError) {
    throw new Error(`Se creo el prestamo, pero no se pudo actualizar la cuenta: ${accountUpdateError.message}`);
  }

  revalidatePath("/app");
  return { ok: true, receivableId: String(receivable.id), transactionId: String(transaction.id) };
}

export async function archiveAccount(accountId: string) {
  const context = await requireWorkspaceContext();
  const admin = getSupabaseAdminClient();

  if (!admin) throw new Error("Supabase admin client no disponible.");

  const { error } = await admin
    .from("accounts")
    .update({
      archived: true,
      active: false,
      updated_at: new Date().toISOString(),
    })
    .eq("id", accountId)
    .eq("workspace_id", context.workspace.id);

  if (error) throw new Error(`No se pudo archivar la cuenta: ${error.message}`);

  revalidatePath("/app");
  return { ok: true };
}

export async function createBusinessUnit(input: { name: string; key: string }) {
  const context = await requireWorkspaceContext();
  const admin = getSupabaseAdminClient();

  if (!admin) throw new Error("Supabase admin client no disponible.");

  const name = input.name.trim();
  const key = input.key.trim().toLowerCase().replace(/\s+/g, "-");

  if (!name) throw new Error("El frente necesita un nombre.");
  if (!key) throw new Error("El frente necesita una clave.");

  const { error } = await admin.from("business_units").insert({
    workspace_id: context.workspace.id,
    name,
    key,
    income: 0,
    expense: 0,
    pending: 0,
  });

  if (error) throw new Error(`No se pudo crear el frente: ${error.message}`);

  revalidatePath("/app");
  return { ok: true };
}

export async function updateBusinessUnit(input: { id: string; name: string; key: string }) {
  const context = await requireWorkspaceContext();
  const admin = getSupabaseAdminClient();

  if (!admin) throw new Error("Supabase admin client no disponible.");

  const name = input.name.trim();
  const key = input.key.trim().toLowerCase().replace(/\s+/g, "-");

  if (!name) throw new Error("El frente necesita un nombre.");
  if (!key) throw new Error("El frente necesita una clave.");

  const { error } = await admin
    .from("business_units")
    .update({
      name,
      key,
      updated_at: new Date().toISOString(),
    })
    .eq("id", input.id)
    .eq("workspace_id", context.workspace.id);

  if (error) throw new Error(`No se pudo actualizar el frente: ${error.message}`);

  revalidatePath("/app");
  return { ok: true };
}

export async function createIncomeSource(input: {
  name: string;
  businessUnitKey: string;
  defaultAccountId: string;
}) {
  const context = await requireWorkspaceContext();
  const admin = getSupabaseAdminClient();

  if (!admin) throw new Error("Supabase admin client no disponible.");

  const name = input.name.trim();
  const businessUnitKey = input.businessUnitKey.trim();
  const defaultAccountId = input.defaultAccountId.trim();

  if (!name) throw new Error("La fuente necesita un nombre.");
  if (!businessUnitKey) throw new Error("Debes elegir un frente.");
  if (!defaultAccountId) throw new Error("Debes elegir la cuenta destino por defecto.");

  const { error } = await admin.from("income_sources").insert({
    workspace_id: context.workspace.id,
    name,
    business_unit_key: businessUnitKey,
    default_account_id: defaultAccountId,
    type: "manual",
    active: true,
  });

  if (error) throw new Error(`No se pudo crear la fuente de ingreso: ${error.message}`);

  revalidatePath("/app");
  return { ok: true };
}

export async function updateIncomeSource(input: {
  id: string;
  name: string;
  businessUnitKey: string;
  defaultAccountId: string;
}) {
  const context = await requireWorkspaceContext();
  const admin = getSupabaseAdminClient();

  if (!admin) throw new Error("Supabase admin client no disponible.");

  const name = input.name.trim();
  const businessUnitKey = input.businessUnitKey.trim();
  const defaultAccountId = input.defaultAccountId.trim();

  if (!name) throw new Error("La fuente necesita un nombre.");
  if (!businessUnitKey) throw new Error("Debes elegir un frente.");
  if (!defaultAccountId) throw new Error("Debes elegir la cuenta destino por defecto.");

  const { error } = await admin
    .from("income_sources")
    .update({
      name,
      business_unit_key: businessUnitKey,
      default_account_id: defaultAccountId,
      active: true,
    })
    .eq("id", input.id)
    .eq("workspace_id", context.workspace.id);

  if (error) throw new Error(`No se pudo actualizar la fuente de ingreso: ${error.message}`);

  revalidatePath("/app");
  return { ok: true };
}

export async function updateCreditCard(input: { id: string; name: string; used: number }) {
  const context = await requireWorkspaceContext();
  const admin = getSupabaseAdminClient();

  if (!admin) throw new Error("Supabase admin client no disponible.");

  const { error } = await admin
    .from("credit_cards")
    .update({
      name: input.name.trim(),
      used: input.used,
      updated_at: new Date().toISOString(),
    })
    .eq("id", input.id)
    .eq("workspace_id", context.workspace.id);

  if (error) throw new Error(`No se pudo actualizar la tarjeta: ${error.message}`);

  revalidatePath("/app");
  return { ok: true };
}

function creditCardBrandPalette(issuer: string) {
  const normalized = issuer.trim().toLowerCase();
  const palette: Record<string, { brand: string; text: string }> = {
    bancolombia: { brand: "#FDDA24", text: "#2A2117" },
    nu: { brand: "#820AD1", text: "#FFFFFF" },
    davivienda: { brand: "#ED1C24", text: "#FFFFFF" },
    bbva: { brand: "#004481", text: "#FFFFFF" },
    "banco de bogota": { brand: "#D71920", text: "#FFFFFF" },
    "banco caja social": { brand: "#1D4F91", text: "#FFFFFF" },
    "av villas": { brand: "#F58220", text: "#2A2117" },
    "banco popular": { brand: "#2B5CAB", text: "#FFFFFF" },
    "scotiabank colpatria": { brand: "#E31837", text: "#FFFFFF" },
    falabella: { brand: "#7CB342", text: "#FFFFFF" },
    rappicard: { brand: "#111111", text: "#FFFFFF" },
    rappi: { brand: "#111111", text: "#FFFFFF" },
    "banco pichincha": { brand: "#FFCC00", text: "#2A2117" },
    itau: { brand: "#FF6A13", text: "#2A2117" },
    itauu: { brand: "#FF6A13", text: "#2A2117" },
    finandina: { brand: "#6A1B9A", text: "#FFFFFF" },
    serfinanza: { brand: "#00A19A", text: "#FFFFFF" },
  };

  return palette[normalized] ?? { brand: "#C68A45", text: "#FFFFFF" };
}

export async function updateCreditCardFull(input: {
  id: string;
  name: string;
  issuer: string;
  limitValue: number;
  used: number;
  cutOffDate: number;
  payDueDate: number;
  minimumPayment: number;
  annualInterestRate: number | null;
  interestType: string;
  estimatedPayoffMonths: number | null;
  estimatedTotalPayment: number | null;
  paymentStrategy: string;
  notes: string;
}) {
  const context = await requireWorkspaceContext();
  const admin = getSupabaseAdminClient();

  if (!admin) throw new Error("Supabase admin client no disponible.");

  const name = input.name.trim();
  const issuer = input.issuer.trim();
  const interestType = input.interestType.trim() || "unknown";
  const paymentStrategy = input.paymentStrategy.trim() || "minimum";
  const notes = input.notes.trim();

  if (!name) throw new Error("La tarjeta necesita un nombre.");
  if (!issuer) throw new Error("La tarjeta necesita un emisor.");
  if (!Number.isFinite(input.limitValue) || input.limitValue < 0) throw new Error("El cupo debe ser valido.");
  if (!Number.isFinite(input.used) || input.used < 0) throw new Error("La deuda actual debe ser valida.");
  if (!Number.isFinite(input.minimumPayment) || input.minimumPayment < 0) throw new Error("El pago minimo debe ser valido.");
  if (input.used > input.limitValue && input.limitValue > 0) throw new Error("La deuda actual no puede ser mayor al cupo.");

  const cutOffDate = Math.min(31, Math.max(1, Math.trunc(input.cutOffDate || 1)));
  const payDueDate = Math.min(31, Math.max(1, Math.trunc(input.payDueDate || 1)));
  const annualInterestRate =
    input.annualInterestRate == null || Number.isNaN(input.annualInterestRate) ? null : input.annualInterestRate;
  const estimatedPayoffMonths =
    input.estimatedPayoffMonths == null || Number.isNaN(input.estimatedPayoffMonths) ? null : Math.max(0, Math.trunc(input.estimatedPayoffMonths));
  const estimatedTotalPayment =
    input.estimatedTotalPayment == null || Number.isNaN(input.estimatedTotalPayment) ? null : input.estimatedTotalPayment;

  const palette = creditCardBrandPalette(issuer);

  const { error } = await admin
    .from("credit_cards")
    .update({
      name,
      issuer,
      limit_value: input.limitValue,
      used: input.used,
      cut_off_date: cutOffDate,
      pay_due_date: payDueDate,
      minimum_payment: input.minimumPayment,
      annual_interest_rate: annualInterestRate,
      interest_type: interestType,
      estimated_payoff_months: estimatedPayoffMonths,
      estimated_total_payment: estimatedTotalPayment,
      payment_strategy: paymentStrategy,
      notes,
      status: input.limitValue > 0 && input.used >= input.limitValue ? "blocked" : "active",
      brand_color: palette.brand,
      text_color: palette.text,
      updated_at: new Date().toISOString(),
    })
    .eq("id", input.id)
    .eq("workspace_id", context.workspace.id);

  if (error) throw new Error(`No se pudo actualizar la tarjeta: ${error.message}`);

  revalidatePath("/app");
  return { ok: true };
}

export async function archiveCreditCard(cardId: string) {
  const context = await requireWorkspaceContext();
  const admin = getSupabaseAdminClient();

  if (!admin) throw new Error("Supabase admin client no disponible.");

  const { error } = await admin
    .from("credit_cards")
    .update({
      archived: true,
      updated_at: new Date().toISOString(),
    })
    .eq("id", cardId)
    .eq("workspace_id", context.workspace.id);

  if (error) throw new Error(`No se pudo archivar la tarjeta: ${error.message}`);

  revalidatePath("/app");
  return { ok: true };
}

export async function createCreditCard(input: {
  name: string;
  issuer: string;
  limitValue: number;
  used: number;
  cutOffDate: number;
  payDueDate: number;
  minimumPayment: number;
  annualInterestRate: number | null;
  interestType: string;
  estimatedPayoffMonths: number | null;
  estimatedTotalPayment: number | null;
  paymentStrategy: string;
  notes: string;
}) {
  const context = await requireWorkspaceContext();
  const admin = getSupabaseAdminClient();

  if (!admin) throw new Error("Supabase admin client no disponible.");

  const name = input.name.trim();
  const issuer = input.issuer.trim();

  if (!name) throw new Error("La tarjeta necesita un nombre.");
  if (!issuer) throw new Error("La tarjeta necesita un emisor.");
  if (!Number.isFinite(input.limitValue) || input.limitValue < 0) throw new Error("El cupo debe ser valido.");
  if (!Number.isFinite(input.used) || input.used < 0) throw new Error("La deuda actual debe ser valida.");
  if (!Number.isFinite(input.minimumPayment) || input.minimumPayment < 0) throw new Error("El pago minimo debe ser valido.");

  const cutOffDate = Math.min(31, Math.max(1, Math.trunc(input.cutOffDate || 1)));
  const payDueDate = Math.min(31, Math.max(1, Math.trunc(input.payDueDate || 1)));
  const interestType = input.interestType.trim() || "unknown";
  const paymentStrategy = input.paymentStrategy.trim() || "minimum";
  const notes = input.notes.trim();
  const annualInterestRate =
    input.annualInterestRate == null || Number.isNaN(input.annualInterestRate) ? null : input.annualInterestRate;
  const estimatedPayoffMonths =
    input.estimatedPayoffMonths == null || Number.isNaN(input.estimatedPayoffMonths) ? null : Math.max(0, Math.trunc(input.estimatedPayoffMonths));
  const estimatedTotalPayment =
    input.estimatedTotalPayment == null || Number.isNaN(input.estimatedTotalPayment) ? null : input.estimatedTotalPayment;

  if (input.used > input.limitValue && input.limitValue > 0) {
    throw new Error("La deuda actual no puede ser mayor al cupo.");
  }

  const palette = creditCardBrandPalette(issuer);

  const { error } = await admin.from("credit_cards").insert({
    workspace_id: context.workspace.id,
    name,
    issuer,
    limit_value: input.limitValue,
    used: input.used,
    cut_off_date: cutOffDate,
    pay_due_date: payDueDate,
    minimum_payment: input.minimumPayment,
    annual_interest_rate: annualInterestRate,
    interest_type: interestType,
    estimated_payoff_months: estimatedPayoffMonths,
    estimated_total_payment: estimatedTotalPayment,
    payment_strategy: paymentStrategy,
    notes,
    status: input.limitValue > 0 && input.used >= input.limitValue ? "blocked" : "active",
    brand_color: palette.brand,
    text_color: palette.text,
  });

  if (error) {
    throw new Error(`No se pudo crear la tarjeta: ${error.message}`);
  }

  revalidatePath("/app");
  return { ok: true };
}

export async function updateSavingsGoal(input: { id: string; name: string; current: number; dueDate?: string | null }) {
  const context = await requireWorkspaceContext();
  const admin = getSupabaseAdminClient();

  if (!admin) throw new Error("Supabase admin client no disponible.");

  const { error } = await admin
    .from("savings_goals")
    .update({
      name: input.name.trim(),
      current: input.current,
      due_date: input.dueDate ? `${input.dueDate}T00:00:00-05:00` : null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", input.id)
    .eq("workspace_id", context.workspace.id);

  if (error) throw new Error(`No se pudo actualizar la meta: ${error.message}`);

  revalidatePath("/app");
  return { ok: true };
}

export async function archiveSavingsGoal(goalId: string) {
  const context = await requireWorkspaceContext();
  const admin = getSupabaseAdminClient();

  if (!admin) throw new Error("Supabase admin client no disponible.");

  const { error } = await admin
    .from("savings_goals")
    .update({
      current: 0,
      archived: true,
      updated_at: new Date().toISOString(),
    })
    .eq("id", goalId)
    .eq("workspace_id", context.workspace.id);

  if (error) throw new Error(`No se pudo archivar la meta: ${error.message}`);

  revalidatePath("/app");
  return { ok: true };
}

export async function releasePocket(input: { goalId: string }) {
  const context = await requireWorkspaceContext();
  const admin = getSupabaseAdminClient();

  if (!admin) throw new Error("Supabase admin client no disponible.");

  // 1. Obtener el bolsillo y su cuenta asociada
  const { data: goal, error: goalError } = await admin
    .from("savings_goals")
    .select("id, name, current, workspace_id, account_id")
    .eq("id", input.goalId)
    .eq("workspace_id", context.workspace.id)
    .maybeSingle();

  if (goalError || !goal) {
    throw new Error(`No se pudo leer el bolsillo: ${goalError?.message ?? "sin respuesta"}`);
  }

  if (!goal.account_id) {
    throw new Error("Este bolsillo no tiene una cuenta asociada para devolver el dinero.");
  }

  const amountToRelease = typeof goal.current === "number" ? goal.current : Number(goal.current ?? 0);

  // 2. Si hay dinero, lo devolvemos a la cuenta origen del bolsillo
  if (amountToRelease > 0) {
    const { data: account, error: accountError } = await admin
      .from("accounts")
      .select("id, name, balance, workspace_id")
      .eq("id", goal.account_id)
      .eq("workspace_id", context.workspace.id)
      .maybeSingle();

    if (accountError || !account) {
      throw new Error(`No se pudo leer la cuenta de destino: ${accountError?.message ?? "sin respuesta"}`);
    }

    const accountBalance = typeof account.balance === "number" ? account.balance : Number(account.balance ?? 0);
    const today = todayDateInBogota();

    // Crear la transacción de ingreso a la cuenta
    const { error: movementError } = await admin
      .from("transactions")
      .insert({
        workspace_id: context.workspace.id,
        kind: "income",
        status: "confirmed",
        amount: amountToRelease,
        concept: `Liberación: ${goal.name}`,
        account_id: goal.account_id,
        category: "ahorro",
        unit: "general",
        date: `${today}T00:00:00-05:00`,
        posted_at: new Date().toISOString(),
        source_type: "manual",
        metadata: {
          released_pocket_id: input.goalId,
        },
      });

    if (movementError) {
      throw new Error(`No se pudo registrar la devolución del dinero: ${movementError.message}`);
    }
    
    // Incrementar el balance en la cuenta real
    // En una DB real deberíamos usar RPC para atomicidad, pero por ahora lo calculamos
    const { error: balanceError } = await admin
      .from("accounts")
      .update({ balance: accountBalance + amountToRelease })
      .eq("id", account.id)
      .eq("workspace_id", context.workspace.id);
      
    if (balanceError) {
      throw new Error(`Error al actualizar el saldo de la cuenta: ${balanceError.message}`);
    }
  }

  // 3. Archivar el bolsillo y dejarlo en 0
  const { error: archiveError } = await admin
    .from("savings_goals")
    .update({
      current: 0,
      archived: true,
      updated_at: new Date().toISOString(),
    })
    .eq("id", input.goalId)
    .eq("workspace_id", context.workspace.id);

  if (archiveError) {
    throw new Error(`No se pudo archivar el bolsillo: ${archiveError.message}`);
  }

  revalidatePath("/app");
  return { ok: true };
}

export async function createSavingsContribution(input: { goalId: string; amount: number; accountId: string }) {
  const context = await requireWorkspaceContext();
  const admin = getSupabaseAdminClient();

  if (!admin) throw new Error("Supabase admin client no disponible.");

  if (!input.accountId) {
    throw new Error("Debes elegir la cuenta de origen.");
  }

  if (!Number.isFinite(input.amount) || input.amount <= 0) {
    throw new Error("El monto del aporte debe ser mayor a cero.");
  }

  const { data: goal, error: goalError } = await admin
    .from("savings_goals")
    .select("id, current, workspace_id")
    .eq("id", input.goalId)
    .eq("workspace_id", context.workspace.id)
    .maybeSingle();

  if (goalError || !goal) {
    throw new Error(`No se pudo leer la meta: ${goalError?.message ?? "sin respuesta"}`);
  }

  const current = typeof goal.current === "number" ? goal.current : Number(goal.current ?? 0);
  const nextCurrent = current + input.amount;
  const today = todayDateInBogota();

  const { data: account, error: accountError } = await admin
    .from("accounts")
    .select("id, name, balance, workspace_id")
    .eq("id", input.accountId)
    .eq("workspace_id", context.workspace.id)
    .maybeSingle();

  if (accountError || !account) {
    throw new Error(`No se pudo leer la cuenta origen: ${accountError?.message ?? "sin respuesta"}`);
  }

  const accountBalance = typeof account.balance === "number" ? account.balance : Number(account.balance ?? 0);

  if (accountBalance < input.amount) {
    throw new Error("La cuenta elegida no tiene saldo suficiente.");
  }

  const nextBalance = accountBalance - input.amount;

  const { data: movement, error: movementError } = await admin
    .from("transactions")
    .insert({
      workspace_id: context.workspace.id,
      kind: "saving_contribution",
      status: "confirmed",
      amount: input.amount,
      concept: `Aporte a ahorro`,
      account_id: input.accountId,
      category: "ahorro",
      unit: "general",
      date: `${today}T00:00:00-05:00`,
      posted_at: new Date().toISOString(),
      source_type: "manual",
      metadata: {
        savings_goal_id: input.goalId,
        account_name: account.name,
      },
    })
    .select("id")
    .single();

  if (movementError || !movement) {
    throw new Error(`No se pudo registrar el movimiento del aporte: ${movementError?.message ?? "sin respuesta"}`);
  }

  const { error: transactionError } = await admin.from("savings_transactions").insert({
    workspace_id: context.workspace.id,
    savings_goal_id: input.goalId,
    account_id: input.accountId,
    amount: input.amount,
    type: "deposit",
    date: today,
    notes: "Aporte desde Dinero",
    transaction_id: movement.id,
  });

  if (transactionError) {
    throw new Error(`No se pudo registrar el aporte: ${transactionError.message}`);
  }

  const { error: accountUpdateError } = await admin
    .from("accounts")
    .update({
      balance: nextBalance,
      updated_at: new Date().toISOString(),
    })
    .eq("id", input.accountId)
    .eq("workspace_id", context.workspace.id);

  if (accountUpdateError) {
    throw new Error(`Se registró el aporte, pero no se pudo descontar la cuenta: ${accountUpdateError.message}`);
  }

  const { error: updateError } = await admin
    .from("savings_goals")
    .update({
      current: nextCurrent,
      updated_at: new Date().toISOString(),
    })
    .eq("id", input.goalId)
    .eq("workspace_id", context.workspace.id);

  if (updateError) {
    throw new Error(`Se registró el aporte, pero no se pudo actualizar la meta: ${updateError.message}`);
  }

  revalidatePath("/app");
  return { ok: true };
}

export async function createSavingsGoal(input: {
  name: string;
  target: number;
  current?: number;
  dueDate?: string | null;
  goalType?: "goal" | "pocket";
  color?: string;
  sourceAccountId?: string | null;
}) {
  const context = await requireWorkspaceContext();
  const admin = getSupabaseAdminClient();

  if (!admin) throw new Error("Supabase admin client no disponible.");

  const name = input.name.trim();
  const current = Number(input.current ?? 0);
  // For pockets: target = current (the amount they're protecting right now)
  // For goals: target is the final goal amount
  const target = input.goalType === "pocket" ? current : Number(input.target ?? 0);
  const goalType = input.goalType === "pocket" ? "pocket" : "goal";
  const color = input.color?.trim() || (goalType === "pocket" ? "#8FA66A" : "#16735b");
  const dueDate = input.dueDate?.trim() ? `${input.dueDate}T00:00:00-05:00` : null;

  if (!name) throw new Error("El ahorro necesita un nombre.");
  if (!Number.isFinite(current) || current < 0) throw new Error("El monto debe ser válido.");

  if (goalType === "pocket" && !input.sourceAccountId) {
    throw new Error("Debes seleccionar una cuenta para este bolsillo.");
  }

  const { data: goal, error } = await admin
    .from("savings_goals")
    .insert({
      workspace_id: context.workspace.id,
      name,
      target,
      current,
      due_date: dueDate,
      color,
      goal_type: goalType,
      archived: false,
      account_id: goalType === "pocket" ? input.sourceAccountId : null,
    })
    .select("id")
    .single();

  if (error || !goal) {
    throw new Error(`No se pudo crear el ahorro: ${error?.message ?? "sin respuesta"}`);
  }

  if (current > 0) {
    // Log internal savings ledger entry
    const { error: savTransErr } = await admin.from("savings_transactions").insert({
      workspace_id: context.workspace.id,
      savings_goal_id: goal.id,
      amount: current,
      type: "deposit",
      date: todayDateInBogota(),
      notes: goalType === "pocket" ? "Monto inicial del bolsillo" : "Saldo inicial",
    });
    if (savTransErr) throw new Error(`Se creó el ahorro, pero no el saldo inicial: ${savTransErr.message}`);

    // For pockets with a source account: deduct from account balance + log transaction
    if (goalType === "pocket" && input.sourceAccountId) {
      const { data: acc, error: accReadErr } = await admin
        .from("accounts")
        .select("balance")
        .eq("id", input.sourceAccountId)
        .eq("workspace_id", context.workspace.id)
        .single();

      if (accReadErr || !acc) throw new Error("No se encontró la cuenta de origen.");

      const newBalance = Number(acc.balance) - current;

      const { error: accUpdateErr } = await admin
        .from("accounts")
        .update({ balance: newBalance })
        .eq("id", input.sourceAccountId)
        .eq("workspace_id", context.workspace.id);

      if (accUpdateErr) throw new Error(`No se pudo descontar de la cuenta: ${accUpdateErr.message}`);

      // Log the deduction as a saving_contribution transaction
      await admin.from("transactions").insert({
        workspace_id: context.workspace.id,
        kind: "saving_contribution",
        amount: current,
        account_id: input.sourceAccountId,
        category: "ahorro",
        date: todayDateInBogota(),
        notes: `Bolsillo: ${name}`,
      });
    }
  }

  revalidatePath("/app");
  return { ok: true, goalId: String(goal.id) };
}

export async function cancelScheduledEvent(eventId: string) {
  const context = await requireWorkspaceContext();
  const admin = getSupabaseAdminClient();

  if (!admin) throw new Error("Supabase admin client no disponible.");

  const { error } = await admin
    .from("scheduled_events")
    .update({
      status: "cancelled",
      cancelled_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", eventId)
    .eq("workspace_id", context.workspace.id);

  if (error) throw new Error(`No se pudo cancelar la obligación: ${error.message}`);

  revalidatePath("/app");
  return { ok: true };
}

export async function updateScheduledObligation(input: {
  id: string;
  title: string;
  amount: number;
  dueDate: string;
  accountId?: string | null;
  notes?: string | null;
}) {
  const context = await requireWorkspaceContext();
  const admin = getSupabaseAdminClient();

  if (!admin) throw new Error("Supabase admin client no disponible.");

  const { data: event, error: eventError } = await admin
    .from("scheduled_events")
    .select("id, workspace_id, status, confirmed_transaction_id")
    .eq("id", input.id)
    .eq("workspace_id", context.workspace.id)
    .maybeSingle();

  if (eventError || !event) {
    throw new Error(`No se pudo leer la obligación: ${eventError?.message ?? "sin respuesta"}`);
  }

  if (event.confirmed_transaction_id || event.status === "confirmed" || event.status === "confirmado") {
    throw new Error("Esta obligación ya fue confirmada y no se puede editar aquí.");
  }

  const title = input.title.trim();
  const amount = Number(input.amount ?? 0);
  const dueDate = input.dueDate.trim();
  const accountId = input.accountId?.trim() || null;
  const notes = input.notes?.trim() || null;

  if (!title) throw new Error("La obligación necesita un nombre.");
  if (!Number.isFinite(amount) || amount <= 0) throw new Error("El monto debe ser mayor a cero.");
  if (!dueDate) throw new Error("Debes definir una fecha.");

  if (accountId) {
    const { data: account, error: accountError } = await admin
      .from("accounts")
      .select("id")
      .eq("id", accountId)
      .eq("workspace_id", context.workspace.id)
      .maybeSingle();

    if (accountError || !account) {
      throw new Error(`No se pudo validar la cuenta: ${accountError?.message ?? "sin respuesta"}`);
    }
  }

  const { error } = await admin
    .from("scheduled_events")
    .update({
      title,
      amount,
      due_date: dueDate,
      account_id: accountId,
      suggested_account_id: accountId,
      notes,
      updated_at: new Date().toISOString(),
    })
    .eq("id", input.id)
    .eq("workspace_id", context.workspace.id);

  if (error) throw new Error(`No se pudo actualizar la obligación: ${error.message}`);

  revalidatePath("/app");
  return { ok: true };
}

export async function updateReceivable(input: {
  id: string;
  debtorName: string;
  title: string;
  amount: number;
  dueDate?: string | null;
  notes?: string | null;
}) {
  const context = await requireWorkspaceContext();
  const admin = getSupabaseAdminClient();

  if (!admin) throw new Error("Supabase admin client no disponible.");

  const debtorName = input.debtorName.trim();
  const title = input.title.trim();
  const amount = Number(input.amount ?? 0);
  const dueDate = input.dueDate?.trim() || null;
  const notes = input.notes?.trim() || null;

  if (!debtorName) throw new Error("Debes indicar quién te debe.");
  if (!title) throw new Error("El préstamo necesita un título.");
  if (!Number.isFinite(amount) || amount <= 0) throw new Error("El monto debe ser mayor a cero.");

  const { error } = await admin
    .from("receivables")
    .update({
      debtor_name: debtorName,
      title,
      amount,
      due_date: dueDate,
      notes,
      updated_at: new Date().toISOString(),
    })
    .eq("id", input.id)
    .eq("workspace_id", context.workspace.id);

  if (error) throw new Error(`No se pudo actualizar el préstamo: ${error.message}`);

  revalidatePath("/app");
  return { ok: true };
}

export async function markReceivableRecovered(input: {
  id: string;
  accountId: string;
  amount?: number | null;
  receivedDate?: string | null;
}) {
  const context = await requireWorkspaceContext();
  const admin = getSupabaseAdminClient();

  if (!admin) throw new Error("Supabase admin client no disponible.");

  const { data: receivable, error: receivableError } = await admin
    .from("receivables")
    .select("id, title, debtor_name, amount, status")
    .eq("id", input.id)
    .eq("workspace_id", context.workspace.id)
    .maybeSingle();

  if (receivableError || !receivable) {
    throw new Error(`No se pudo leer el préstamo: ${receivableError?.message ?? "sin respuesta"}`);
  }

  if (receivable.status === "recovered") {
    revalidatePath("/app");
    return { ok: true, alreadyRecovered: true };
  }

  const accountId = input.accountId.trim();
  if (!accountId) throw new Error("Debes elegir una cuenta destino.");

  const amount = input.amount == null ? Number(receivable.amount ?? 0) : Number(input.amount);
  if (!Number.isFinite(amount) || amount <= 0) throw new Error("El monto recuperado debe ser mayor a cero.");

  const effectiveDate = input.receivedDate?.trim() || todayDateInBogota();

  const { data: account, error: accountError } = await admin
    .from("accounts")
    .select("id, name, balance")
    .eq("id", accountId)
    .eq("workspace_id", context.workspace.id)
    .maybeSingle();

  if (accountError || !account) {
    throw new Error(`No se pudo leer la cuenta destino: ${accountError?.message ?? "sin respuesta"}`);
  }

  const currentBalance = typeof account.balance === "number" ? account.balance : Number(account.balance ?? 0);
  const nextBalance = currentBalance + amount;

  const { data: transaction, error: transactionError } = await admin
    .from("transactions")
    .insert({
      workspace_id: context.workspace.id,
      kind: "receivable_recovery",
      status: "confirmed",
      amount,
      concept: receivable.title,
      account_id: accountId,
      category: "Prestamo",
      unit: "general",
      date: `${effectiveDate}T00:00:00-05:00`,
      posted_at: new Date().toISOString(),
      source_type: "receivable",
      source_id: receivable.id,
      metadata: {
        receivable_id: receivable.id,
        debtor_name: receivable.debtor_name,
        account_name: account.name,
      },
    })
    .select("id")
    .single();

  if (transactionError || !transaction) {
    throw new Error(`No se pudo registrar el cobro: ${transactionError?.message ?? "sin respuesta"}`);
  }

  const { error: balanceError } = await admin
    .from("accounts")
    .update({
      balance: nextBalance,
      updated_at: new Date().toISOString(),
    })
    .eq("id", accountId)
    .eq("workspace_id", context.workspace.id);

  if (balanceError) {
    throw new Error(`Se registró el cobro, pero no se pudo actualizar la cuenta: ${balanceError.message}`);
  }

  const { error: receivableUpdateError } = await admin
    .from("receivables")
    .update({
      status: "recovered",
      updated_at: new Date().toISOString(),
    })
    .eq("id", receivable.id)
    .eq("workspace_id", context.workspace.id);

  if (receivableUpdateError) {
    throw new Error(`Se registró el cobro, pero no se pudo cerrar el préstamo: ${receivableUpdateError.message}`);
  }

  revalidatePath("/app");
  return { ok: true, transactionId: String(transaction.id) };
}

export async function updateManualTransaction(input: {
  id: string;
  concept: string;
  amount: number;
  category: string;
  unit: string;
  date: string;
}) {
  const context = await requireWorkspaceContext();
  const admin = getSupabaseAdminClient();

  if (!admin) throw new Error("Supabase admin client no disponible.");

  const { data: transaction, error: transactionError } = await admin
    .from("transactions")
    .select("id, workspace_id, kind, amount, account_id, source_type")
    .eq("id", input.id)
    .eq("workspace_id", context.workspace.id)
    .maybeSingle();

  if (transactionError || !transaction) {
    throw new Error(`No se pudo leer el movimiento: ${transactionError?.message ?? "sin respuesta"}`);
  }

  if (transaction.source_type && transaction.source_type !== "manual" && transaction.source_type !== "income_source") {
    throw new Error("Este movimiento viene de otro flujo y no se puede editar aqui.");
  }

  if (transaction.account_id) {
    const { data: account, error: accountError } = await admin
      .from("accounts")
      .select("id, balance")
      .eq("id", transaction.account_id)
      .eq("workspace_id", context.workspace.id)
      .maybeSingle();

    if (accountError || !account) {
      throw new Error(`No se pudo leer la cuenta del movimiento: ${accountError?.message ?? "sin respuesta"}`);
    }

    const currentBalance = typeof account.balance === "number" ? account.balance : Number(account.balance ?? 0);
    const previousAmount = typeof transaction.amount === "number" ? transaction.amount : Number(transaction.amount ?? 0);
    const previousDelta = transactionDelta(String(transaction.kind), previousAmount);
    const nextDelta = transactionDelta(String(transaction.kind), input.amount);
    const nextBalance = currentBalance - previousDelta + nextDelta;

    if (nextBalance < 0 && nextDelta < 0) {
      throw new Error("La cuenta no tiene saldo suficiente para dejar este monto.");
    }

    const { error: balanceError } = await admin
      .from("accounts")
      .update({ balance: nextBalance, updated_at: new Date().toISOString() })
      .eq("id", transaction.account_id)
      .eq("workspace_id", context.workspace.id);

    if (balanceError) {
      throw new Error(`No se pudo actualizar el saldo de la cuenta: ${balanceError.message}`);
    }
  }

  const { error: updateError } = await admin
    .from("transactions")
    .update({
      concept: input.concept.trim(),
      amount: input.amount,
      category: input.category.trim(),
      unit: input.unit.trim(),
      date: `${input.date}T00:00:00-05:00`,
      updated_at: new Date().toISOString(),
    })
    .eq("id", input.id)
    .eq("workspace_id", context.workspace.id);

  if (updateError) {
    throw new Error(`No se pudo actualizar el movimiento: ${updateError.message}`);
  }

  revalidatePath("/app");
  return { ok: true };
}

export async function deleteManualTransaction(transactionId: string) {
  const context = await requireWorkspaceContext();
  const admin = getSupabaseAdminClient();

  if (!admin) throw new Error("Supabase admin client no disponible.");

  const { data: transaction, error: transactionError } = await admin
    .from("transactions")
    .select("id, workspace_id, kind, amount, account_id, source_type, status")
    .eq("id", transactionId)
    .eq("workspace_id", context.workspace.id)
    .maybeSingle();

  if (transactionError || !transaction) {
    throw new Error(`No se pudo leer el movimiento: ${transactionError?.message ?? "sin respuesta"}`);
  }

  if (transaction.source_type && transaction.source_type !== "manual" && transaction.source_type !== "income_source") {
    throw new Error("Este movimiento viene de otro flujo y no se puede borrar aqui.");
  }

  if (transaction.account_id) {
    const { data: account, error: accountError } = await admin
      .from("accounts")
      .select("id, balance")
      .eq("id", transaction.account_id)
      .eq("workspace_id", context.workspace.id)
      .maybeSingle();

    if (accountError || !account) {
      throw new Error(`No se pudo leer la cuenta del movimiento: ${accountError?.message ?? "sin respuesta"}`);
    }

    const currentBalance = typeof account.balance === "number" ? account.balance : Number(account.balance ?? 0);
    const amount = typeof transaction.amount === "number" ? transaction.amount : Number(transaction.amount ?? 0);
    const delta = transactionDelta(String(transaction.kind), amount);
    const nextBalance = currentBalance - delta;

    const { error: balanceError } = await admin
      .from("accounts")
      .update({ balance: nextBalance, updated_at: new Date().toISOString() })
      .eq("id", transaction.account_id)
      .eq("workspace_id", context.workspace.id);

    if (balanceError) {
      throw new Error(`No se pudo devolver el saldo de la cuenta: ${balanceError.message}`);
    }
  }

  const { error: deleteError } = await admin
    .from("transactions")
    .delete()
    .eq("id", transactionId)
    .eq("workspace_id", context.workspace.id);

  if (deleteError) {
    throw new Error(`No se pudo borrar el movimiento: ${deleteError.message}`);
  }

  revalidatePath("/app");
  return { ok: true };
}

export async function createTransfer(input: {
  fromAccountId: string;
  toAccountId: string;
  amount: number;
  concept: string;
  date: string;
}) {
  const context = await requireWorkspaceContext();
  const admin = getSupabaseAdminClient();

  if (!admin) throw new Error("Supabase admin client no disponible.");

  if (!input.fromAccountId || !input.toAccountId) {
    throw new Error("Debes elegir cuenta origen y cuenta destino.");
  }

  if (input.fromAccountId === input.toAccountId) {
    throw new Error("La cuenta origen y destino no pueden ser la misma.");
  }

  if (!Number.isFinite(input.amount) || input.amount <= 0) {
    throw new Error("El monto de la transferencia debe ser mayor a cero.");
  }

  const { data: accounts, error: accountsError } = await admin
    .from("accounts")
    .select("id, name, balance, workspace_id")
    .in("id", [input.fromAccountId, input.toAccountId])
    .eq("workspace_id", context.workspace.id);

  if (accountsError) {
    throw new Error(`No se pudieron leer las cuentas: ${accountsError.message}`);
  }

  const fromAccount = (accounts ?? []).find((row) => row.id === input.fromAccountId);
  const toAccount = (accounts ?? []).find((row) => row.id === input.toAccountId);

  if (!fromAccount || !toAccount) {
    throw new Error("No se encontraron las cuentas seleccionadas en este espacio.");
  }

  const fromBalance = typeof fromAccount.balance === "number" ? fromAccount.balance : Number(fromAccount.balance ?? 0);
  const toBalance = typeof toAccount.balance === "number" ? toAccount.balance : Number(toAccount.balance ?? 0);

  if (fromBalance < input.amount) {
    throw new Error("La cuenta origen no tiene saldo suficiente.");
  }

  const concept = input.concept.trim() || `Transferencia ${fromAccount.name} a ${toAccount.name}`;
  const isoDate = `${input.date}T00:00:00-05:00`;
  const transferKey = crypto.randomUUID();
  const now = new Date().toISOString();

  const { error: outError } = await admin.from("transactions").insert({
    workspace_id: context.workspace.id,
    kind: "transfer_out",
    status: "confirmed",
    amount: input.amount,
    concept,
    account_id: fromAccount.id,
    category: "transferencia",
    unit: "general",
    date: isoDate,
    posted_at: now,
    source_type: "manual",
    metadata: {
      transfer_key: transferKey,
      direction: "out",
      other_account_id: toAccount.id,
      other_account_name: toAccount.name,
    },
  });

  if (outError) {
    throw new Error(`No se pudo registrar la salida: ${outError.message}`);
  }

  const { error: inError } = await admin.from("transactions").insert({
    workspace_id: context.workspace.id,
    kind: "transfer_in",
    status: "confirmed",
    amount: input.amount,
    concept,
    account_id: toAccount.id,
    category: "transferencia",
    unit: "general",
    date: isoDate,
    posted_at: now,
    source_type: "manual",
    metadata: {
      transfer_key: transferKey,
      direction: "in",
      other_account_id: fromAccount.id,
      other_account_name: fromAccount.name,
    },
  });

  if (inError) {
    throw new Error(`Se registró la salida, pero no la entrada: ${inError.message}`);
  }

  const { error: debitError } = await admin
    .from("accounts")
    .update({
      balance: fromBalance - input.amount,
      updated_at: now,
    })
    .eq("id", fromAccount.id)
    .eq("workspace_id", context.workspace.id);

  if (debitError) {
    throw new Error(`No se pudo actualizar la cuenta origen: ${debitError.message}`);
  }

  const { error: creditError } = await admin
    .from("accounts")
    .update({
      balance: toBalance + input.amount,
      updated_at: now,
    })
    .eq("id", toAccount.id)
    .eq("workspace_id", context.workspace.id);

  if (creditError) {
    throw new Error(`No se pudo actualizar la cuenta destino: ${creditError.message}`);
  }

  revalidatePath("/app");
  return { ok: true };
}

