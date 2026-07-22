"use server";

import { revalidatePath } from "next/cache";
import { requireWorkspaceContext } from "@/src/lib/auth";
import { createSupabaseServerComponentClient } from "@/src/lib/supabase";
import {
  generateIncomeOccurrenceDates,
  normalizeRecurrenceDays,
  validateIncomeRecurrence,
  type IncomeRecurrenceEndMode,
  type IncomeRecurrenceFrequency,
} from "@/src/lib/income-recurrence";
import {
  createAccountSchema,
  createTransactionSchema,
  createCreditCardSchema,
  createSavingsGoalSchema,
  createLoanSchema,
} from "@/src/lib/schemas/financial-schemas";

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

export async function confirmScheduledEventNow(eventId: string, overrideAmount?: number) {
  const context = await requireWorkspaceContext();
  const admin = await createSupabaseServerComponentClient();

  if (!admin) {
    throw new Error("Supabase client no disponible.");
  }

  const { data: event, error: eventError } = await admin
    .from("scheduled_events")
    .select("id, workspace_id, due_date, title, amount, kind, status, business_unit_key, account_id, notes, confirmed_transaction_id, linked_entity_type, linked_entity_id")
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
  const originalAmount = typeof event.amount === "number" ? event.amount : Number(event.amount ?? 0);
  const amount = overrideAmount !== undefined ? overrideAmount : originalAmount;
  const kind = String(event.kind ?? "expense");
  const isIncome = kind === "income";
  const delta = isIncome ? amount : -amount;

  const { data: account, error: accountError } = await admin
    .from("accounts")
    .select("id, name, workspace_id")
    .eq("id", event.account_id)
    .eq("workspace_id", context.workspace.id)
    .maybeSingle();

  if (accountError || !account) {
    throw new Error(`No se pudo leer la cuenta del evento: ${accountError?.message ?? "sin respuesta"}`);
  }

  // @ts-expect-error - RPC is not in generated types yet
  const { data: nextBalance, error: accountUpdateError } = await admin.rpc("increment_account_balance", {
    p_account_id: event.account_id,
    p_amount: delta,
    p_allow_negative: false
  });

  if (accountUpdateError) {
    if (accountUpdateError.message.includes("INSUFFICIENT_FUNDS")) {
      throw new Error("La cuenta no tiene saldo suficiente para confirmar este movimiento.");
    }
    throw new Error(`No se pudo actualizar la cuenta: ${accountUpdateError.message}`);
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
      category: (event.linked_entity_type || /prestamo|prestamos|deuda|deudas|credito|cuota|brayan|codensa/i.test(String(event.title))) ? "deudas" : kind,
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
    // @ts-expect-error - RPC is not in generated types yet
    await admin.rpc("increment_account_balance", { p_account_id: event.account_id, p_amount: -delta, p_allow_negative: true });
    throw new Error(`No se pudo crear la transacción: ${transactionError?.message ?? "sin respuesta"}`);
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
    // @ts-expect-error - RPC is not in generated types yet
    await admin.rpc("increment_account_balance", { p_account_id: event.account_id, p_amount: -delta, p_allow_negative: true });
    await admin.from("transactions").delete().eq("id", transaction.id).eq("workspace_id", context.workspace.id);
    throw new Error(`Se creó la transacción, pero no se pudo cerrar el evento: ${eventUpdateError.message}`);
  }

  revalidatePath("/app");
  return {
    ok: true,
    transactionId: String(transaction.id),
    accountId: String(account.id),
    accountName: String(account.name),
    amount,
    effect: delta,
    date: today,
    category: kind,
  };
}

export async function adjustAndConfirmScheduledEvent(input: {
  eventId: string;
  amount: number;
  effectiveDate?: string;
  accountId?: string;
}) {
  const context = await requireWorkspaceContext();
  const admin = await createSupabaseServerComponentClient();

  if (!admin) {
    throw new Error("Supabase client no disponible.");
  }

  const { data: event, error: eventError } = await admin
    .from("scheduled_events")
    .select("id, workspace_id, due_date, title, amount, kind, status, business_unit_key, account_id, notes, confirmed_transaction_id, linked_entity_type, linked_entity_id")
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

  // @ts-expect-error - RPC is not in generated types yet
  const { data: nextBalance, error: accountUpdateError } = await admin.rpc("increment_account_balance", {
    p_account_id: accountId,
    p_amount: delta,
    p_allow_negative: false
  });

  if (accountUpdateError) {
    if (accountUpdateError.message.includes("INSUFFICIENT_FUNDS")) {
      throw new Error("La cuenta no tiene saldo suficiente para confirmar este movimiento.");
    }
    throw new Error(`No se pudo actualizar la cuenta: ${accountUpdateError.message}`);
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
      category: (event.linked_entity_type || /prestamo|prestamos|deuda|deudas|credito|cuota|brayan|codensa/i.test(String(event.title))) ? "deudas" : kind,
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
    // @ts-expect-error - RPC is not in generated types yet
    await admin.rpc("increment_account_balance", { p_account_id: accountId, p_amount: -delta, p_allow_negative: true });
    throw new Error(`No se pudo crear la transacción: ${transactionError?.message ?? "sin respuesta"}`);
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
  const admin = await createSupabaseServerComponentClient();

  if (!admin) throw new Error("Supabase client no disponible.");

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

  if (diff !== 0) {
    // @ts-expect-error - RPC is not in generated types yet
    const { error: rpcError } = await admin.rpc("increment_account_balance", {
      p_account_id: input.id,
      p_amount: diff,
      p_allow_negative: true,
    });
    if (rpcError) throw new Error(`No se pudo actualizar el saldo de la cuenta: ${rpcError.message}`);
  }

  // Update metadata fields (name, entity, type, color)
  const { error } = await admin
    .from("accounts")
    .update({
      name: input.name.trim(),
      entity: input.entity?.trim() || null,
      type: input.type.trim(),
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

export async function updateAccountDetails(input: {
  id: string;
  name: string;
  entity?: string | null;
  type: string;
  color?: string | null;
}) {
  const context = await requireWorkspaceContext();
  const admin = await createSupabaseServerComponentClient();
  if (!admin) throw new Error("Supabase client no disponible.");

  const name = input.name.trim();
  const entity = input.entity?.trim() || null;
  const type = input.type.trim();
  const color = input.color?.trim() || "#C68A45";

  if (!name) throw new Error("La cuenta necesita un nombre.");
  if (!type) throw new Error("Selecciona el tipo de cuenta.");

  const { data, error } = await admin
    .from("accounts")
    .update({ name, entity, type, color, updated_at: new Date().toISOString() })
    .eq("id", input.id)
    .eq("workspace_id", context.workspace.id)
    .eq("active", true)
    .eq("archived", false)
    .select("id, name, entity, type, balance, color")
    .single();

  if (error || !data) {
    throw new Error(`No se pudo actualizar la cuenta: ${error?.message ?? "sin respuesta"}`);
  }

  revalidatePath("/app");
  return {
    ok: true,
    accountId: String(data.id),
    name: String(data.name),
    entity: data.entity ? String(data.entity) : null,
    type: String(data.type),
    balance: Number(data.balance ?? 0),
    color: String(data.color ?? color),
  };
}

export async function deleteAccount(accountId: string) {
  const context = await requireWorkspaceContext();
  const admin = await createSupabaseServerComponentClient();

  if (!admin) throw new Error("Supabase client no disponible.");

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
  const admin = await createSupabaseServerComponentClient();

  if (!admin) throw new Error("Supabase client no disponible.");

  createAccountSchema.parse({
    name: input.name,
    accountType: input.type,
    balance: input.balance,
    entity: input.entity,
  });

  const name = input.name.trim();
  const entity = input.entity?.trim() || null;
  const type = input.type.trim();
  const balance = Number(input.balance ?? 0);
  const color = input.color.trim() || "#C68A45";

  const vipExpiresAt = typeof context.subscription?.metadata?.vip_expires_at === "string"
    ? new Date(context.subscription.metadata.vip_expires_at).getTime()
    : null;
  const hasVipAccess = Boolean(context.subscription?.metadata?.vip_full_access)
    && (!vipExpiresAt || vipExpiresAt > Date.now());
  const isFreePlan = !context.profile.isSuperAdmin
    && !hasVipAccess
    && (context.subscription?.planCode ?? "free") === "free";

  if (isFreePlan) {
    const { count, error: countError } = await admin
      .from("accounts")
      .select("id", { count: "exact", head: true })
      .eq("workspace_id", context.workspace.id)
      .eq("active", true)
      .eq("archived", false);
    if (countError) throw new Error(`No se pudo validar el límite del plan: ${countError.message}`);
    if ((count ?? 0) >= 2) throw new Error("Arca Gratis permite hasta 2 cuentas. Activa Arca Personal para agregar cuentas ilimitadas.");
  }

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
    .select("id, name, entity, type, balance, color")
    .single();

  if (error || !newAccount) throw new Error(`No se pudo crear la cuenta: ${error?.message ?? "desconocido"}`);

  if (balance > 0) {
    const unitsResult = await admin
      .from("business_units")
      .select("name, key")
      .eq("workspace_id", context.workspace.id)
      .order("created_at", { ascending: true });
    const personalUnit = (unitsResult.data ?? []).find((unit) =>
      String(unit.name).toLowerCase() === "personal" || String(unit.key).startsWith("personal-"),
    );
    const personalUnitKey = personalUnit ? String(personalUnit.key) : "general";
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
      unit: personalUnitKey,
      date: `${today}T00:00:00-05:00`,
      posted_at: new Date().toISOString(),
      metadata: { is_initial_balance: true },
    });

    if (txError) {
      console.error("No se pudo registrar la transaccion de saldo inicial:", txError.message);
    }
  }

  revalidatePath("/app");
  return {
    ok: true,
    accountId: String(newAccount.id),
    name,
    entity,
    type,
    balance,
    color,
  };
}

export type MonthlyPlanAllocationInput = {
  name: string;
  type: "expense" | "saving" | "debt" | "free";
  percentage: number;
  trackingCategory?: string | null;
};

export async function saveMonthlyPlan(input: {
  month: string;
  plannedIncome: number;
  allocations: MonthlyPlanAllocationInput[];
}) {
  const context = await requireWorkspaceContext();
  const admin = await createSupabaseServerComponentClient();

  if (!admin) throw new Error("Supabase client no disponible.");
  if (!/^\d{4}-\d{2}-01$/.test(input.month)) throw new Error("El mes del plan no es válido.");

  const plannedIncome = Number(input.plannedIncome);
  if (!Number.isFinite(plannedIncome) || plannedIncome <= 0) {
    throw new Error("El ingreso base debe ser mayor que cero.");
  }

  const allocations = input.allocations.map((allocation, index) => ({
    name: allocation.name.trim(),
    allocation_type: allocation.type,
    percentage: Number(allocation.percentage),
    tracking_category: allocation.trackingCategory?.trim() || null,
    sort_order: index,
  }));

  if (allocations.some((allocation) => !allocation.name)) throw new Error("Cada destino necesita un nombre.");
  if (allocations.some((allocation) => !Number.isFinite(allocation.percentage) || allocation.percentage <= 0 || allocation.percentage > 100)) {
    throw new Error("Cada porcentaje debe estar entre 0 y 100.");
  }

  const normalizedNames = allocations.map((allocation) => allocation.name.toLocaleLowerCase("es"));
  if (new Set(normalizedNames).size !== normalizedNames.length) throw new Error("No puedes repetir el nombre de un destino.");

  const assignedPercentage = allocations.reduce((sum, allocation) => sum + allocation.percentage, 0);
  if (assignedPercentage > 100.001) throw new Error("La distribución no puede superar el 100%.");

  const { data: plan, error: planError } = await admin
    .from("monthly_plans")
    .upsert({
      workspace_id: context.workspace.id,
      month: input.month,
      planned_income: plannedIncome,
      status: "active",
    }, { onConflict: "workspace_id,month" })
    .select("id")
    .single();

  if (planError || !plan) {
    throw new Error(`No se pudo guardar el plan mensual: ${planError?.message ?? "sin respuesta"}`);
  }

  const { error: deleteError } = await admin
    .from("monthly_plan_allocations")
    .delete()
    .eq("workspace_id", context.workspace.id)
    .eq("plan_id", plan.id);

  if (deleteError) throw new Error(`No se pudieron actualizar los destinos: ${deleteError.message}`);

  if (allocations.length > 0) {
    const { error: allocationError } = await admin.from("monthly_plan_allocations").insert(
      allocations.map((allocation) => ({
        ...allocation,
        workspace_id: context.workspace.id,
        plan_id: plan.id,
      }))
    );

    if (allocationError) throw new Error(`No se pudieron guardar los destinos: ${allocationError.message}`);
  }

  revalidatePath("/app");
  return { ok: true };
}

export async function completeFirstRunSetup(input: {
  accountName: string;
  entity?: string | null;
  accountType: string;
  balance: number;
  initialProjectName?: string | null;
}) {
  const context = await requireWorkspaceContext();
  const admin = await createSupabaseServerComponentClient();

  if (!admin) throw new Error("Supabase client no disponible.");

  const accountName = input.accountName.trim();
  const entity = input.entity?.trim() || null;
  const accountType = input.accountType.trim();
  const balance = Number(input.balance ?? 0);

  if (!accountName) throw new Error("Dale un nombre a tu primera cuenta.");
  if (!accountType) throw new Error("Selecciona el tipo de cuenta.");
  if (!Number.isFinite(balance) || balance < 0) throw new Error("El saldo inicial debe ser válido.");

  const existingUnits = await admin
    .from("business_units")
    .select("key, name")
    .eq("workspace_id", context.workspace.id)
    .order("created_at", { ascending: true });

  if (existingUnits.error) {
    throw new Error(`No se pudo comprobar tu espacio personal: ${existingUnits.error.message}`);
  }

  const existingPersonalUnit = (existingUnits.data ?? []).find((unit) =>
    String(unit.name).toLowerCase() === "personal" || String(unit.key).startsWith("personal-"),
  );
  let personalUnitKey = existingPersonalUnit?.key ? String(existingPersonalUnit.key) : "";

  if (!personalUnitKey) {
    personalUnitKey = `personal-${context.workspace.id.slice(0, 8)}`;
    const { error: unitError } = await admin.from("business_units").insert({
      workspace_id: context.workspace.id,
      name: "Personal",
      key: personalUnitKey,
      income: 0,
      expense: 0,
      pending: 0,
    });

    if (unitError) {
      throw new Error(`No pudimos preparar tu espacio personal: ${unitError.message}`);
    }
  }

  const initialProjectName = input.initialProjectName?.trim() || "";
  if (initialProjectName) {
    const existingProject = await admin
      .from("business_units")
      .select("id")
      .eq("workspace_id", context.workspace.id)
      .ilike("name", initialProjectName)
      .limit(1)
      .maybeSingle();

    if (existingProject.error) {
      throw new Error(`No se pudo comprobar tu primer proyecto: ${existingProject.error.message}`);
    }

    if (!existingProject.data) {
      const baseKey = initialProjectName
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "") || "proyecto";
      const { error: projectError } = await admin.from("business_units").insert({
        workspace_id: context.workspace.id,
        name: initialProjectName,
        key: `${baseKey}-${context.workspace.id.slice(0, 6)}`,
        income: 0,
        expense: 0,
        pending: 0,
      });

      if (projectError) {
        throw new Error(`No se pudo crear tu primer proyecto: ${projectError.message}`);
      }
    }
  }

  const existingAccount = await admin
    .from("accounts")
    .select("id")
    .eq("workspace_id", context.workspace.id)
    .eq("active", true)
    .eq("archived", false)
    .limit(1)
    .maybeSingle();

  if (existingAccount.error) {
    throw new Error(`No se pudo comprobar tu primera cuenta: ${existingAccount.error.message}`);
  }

  if (!existingAccount.data) {
    const { data: account, error: accountError } = await admin
      .from("accounts")
      .insert({
        workspace_id: context.workspace.id,
        name: accountName,
        entity,
        type: accountType,
        balance,
        color: "#C68A45",
        active: true,
        archived: false,
      })
      .select("id")
      .single();

    if (accountError || !account) {
      throw new Error(`No se pudo crear tu primera cuenta: ${accountError?.message ?? "sin respuesta"}`);
    }

    if (balance > 0) {
      const today = new Intl.DateTimeFormat("en-CA", {
        timeZone: context.workspace.timezone || "America/Bogota",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).format(new Date());

      const { error: transactionError } = await admin.from("transactions").insert({
        workspace_id: context.workspace.id,
        kind: "income",
        status: "confirmed",
        amount: balance,
        concept: `Saldo inicial: ${accountName}`,
        account_id: account.id,
        category: "Saldo inicial",
        unit: personalUnitKey,
        date: `${today}T00:00:00-05:00`,
        posted_at: new Date().toISOString(),
        metadata: { is_initial_balance: true, source: "onboarding" },
      });

      if (transactionError) {
        throw new Error(`La cuenta se creó, pero no pudimos registrar el saldo inicial: ${transactionError.message}`);
      }
    }
  }

  const defaultCategories = ["Vivienda", "Alimentación", "Transporte", "Salud", "Deudas", "Entretenimiento", "Otros"];
  const { error: categoryError } = await admin.from("expense_categories").upsert(
    defaultCategories.map((name) => ({
      workspace_id: context.workspace.id,
      name,
      group_name: "personal",
      active: true,
    })),
    { onConflict: "workspace_id,name", ignoreDuplicates: true }
  );

  if (categoryError) {
    throw new Error(`No pudimos preparar tus categorías: ${categoryError.message}`);
  }

  const { error: onboardingError } = await admin
    .from("workspaces")
    .update({ onboarding_completed: true })
    .eq("id", context.workspace.id);

  if (onboardingError && !onboardingError.message.includes("onboarding_completed")) {
    throw new Error(`No pudimos completar la configuración: ${onboardingError.message}`);
  }

  revalidatePath("/app");
  return { ok: true };
}

import type { TransactionItem } from "@/src/types";

export async function createMovement(input: {
  kind: "income" | "expense";
  amount: number | string;
  concept: string;
  accountId: string;
  category: string;
  unit: string;
  date?: string;
  sourceId?: string | null;
  sourceLabel?: string | null;
  items?: Partial<TransactionItem>[];
}) {
  const context = await requireWorkspaceContext();
  const admin = await createSupabaseServerComponentClient();

  if (!admin) throw new Error("Supabase client no disponible.");

  createTransactionSchema.parse({
    concept: input.concept,
    amount: Number(input.amount ?? 0),
    date: input.date?.trim() || todayDateInBogota(),
    kind: input.kind,
    category: input.category?.trim() || (input.kind === "income" ? "ingreso" : "general"),
    unit: input.unit?.trim() || "general",
    accountId: input.accountId,
  });

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
    .select("id, name, workspace_id")
    .eq("id", accountId)
    .eq("workspace_id", context.workspace.id)
    .maybeSingle();

  if (accountError || !account) {
    throw new Error(`No se pudo leer la cuenta del movimiento: ${accountError?.message ?? "sin respuesta"}`);
  }

  const delta = kind === "income" ? amount : -amount;

  // @ts-expect-error - RPC is not in generated types yet
  const { data: nextBalance, error: accountUpdateError } = await admin.rpc("increment_account_balance", {
    p_account_id: accountId,
    p_amount: delta,
    p_allow_negative: false
  });

  if (accountUpdateError) {
    if (accountUpdateError.message.includes("INSUFFICIENT_FUNDS")) {
      throw new Error("La cuenta elegida no tiene saldo suficiente.");
    }
    throw new Error(`No se pudo actualizar la cuenta: ${accountUpdateError.message}`);
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
    // @ts-expect-error - RPC is not in generated types yet
    await admin.rpc("increment_account_balance", { p_account_id: accountId, p_amount: -delta, p_allow_negative: true });
    throw new Error(`No se pudo crear el movimiento: ${transactionError?.message ?? "sin respuesta"}`);
  }

  if (input.items && input.items.length > 0) {
    const itemsToInsert = input.items.map(item => ({
      transaction_id: transaction.id,
      category_id: item.categoryId || null,
      item_name: item.itemName || 'Item sin nombre',
      quantity: item.quantity || 1,
      unit_of_measure: item.unitOfMeasure || 'Unidad',
      unit_price: item.unitPrice || 0,
      total_price: item.totalPrice || 0,
    }));

    const { error: itemsError } = await admin
      .from("transaction_items")
      .insert(itemsToInsert);

    if (itemsError) {
      console.error("Error inserting transaction items:", itemsError);
    }
  }

  revalidatePath("/app");
  return {
    ok: true,
    transactionId: String(transaction.id),
    accountId: String(account.id),
    accountName: String(account.name),
    balanceBefore: (nextBalance as number) - delta,
    balanceAfter: nextBalance as number,
    effect: delta,
    date,
  };
}

export async function createExpectedIncome(input: {
  title: string;
  amount: number;
  dueDate: string;
  accountId: string;
  unit: string;
  sourceId?: string | null;
  recurrenceMode?: IncomeRecurrenceFrequency;
  recurrenceDays?: number[];
  recurrenceEndMode?: IncomeRecurrenceEndMode;
  recurrenceEndDate?: string | null;
  recurrenceCount?: number | null;
}) {
  const context = await requireWorkspaceContext();
  const admin = await createSupabaseServerComponentClient();

  if (!admin) throw new Error("Supabase client no disponible.");

  const title = input.title.trim();
  const amount = Number(input.amount ?? 0);
  const dueDate = input.dueDate.trim();
  const accountId = input.accountId.trim();
  const unit = input.unit.trim();
  const sourceId = input.sourceId?.trim() || null;
  
  const recurrenceMode = input.recurrenceMode || 'once';
  const recurrenceDays = normalizeRecurrenceDays(input.recurrenceDays);
  const recurrenceEndMode = input.recurrenceEndMode || 'indefinite';

  if (!title) throw new Error("El ingreso necesita un concepto.");
  if (!Number.isFinite(amount) || amount <= 0) throw new Error("El monto debe ser mayor a cero.");
  if (!dueDate) throw new Error("Debes definir la fecha esperada.");
  if (!accountId) throw new Error("Debes elegir una cuenta destino.");
  validateIncomeRecurrence({
    frequency: recurrenceMode,
    startDate: dueDate,
    recurrenceDays,
    endMode: recurrenceEndMode,
    endDate: input.recurrenceEndDate,
    occurrenceCount: input.recurrenceCount,
  });

  const { data: account, error: accountError } = await admin
    .from("accounts")
    .select("id")
    .eq("id", accountId)
    .eq("workspace_id", context.workspace.id)
    .maybeSingle();

  if (accountError || !account) {
    throw new Error(`No se pudo validar la cuenta destino: ${accountError?.message ?? "sin respuesta"}`);
  }

  if (recurrenceMode === 'once') {
    const { error } = await admin.from("scheduled_events").insert({
      workspace_id: context.workspace.id,
      due_date: dueDate,
      title,
      amount,
      kind: "income",
      status: "scheduled",
      priority: "medium",
      account_id: accountId,
      suggested_account_id: accountId,
      business_unit_key: unit,
      linked_entity_type: sourceId ? "income_source" : "manual",
      linked_entity_id: sourceId,
    });

    if (error) {
      console.error("Supabase Error (once):", error);
      throw new Error(`No se pudo registrar el ingreso esperado: ${error.message}`);
    }
  } else {
    if (!sourceId) {
      throw new Error("Se requiere una fuente de ingreso para crear recurrencia.");
    }

    const { data: template, error: templateError } = await admin.from("income_templates").insert({
      workspace_id: context.workspace.id,
      name: title,
      kind: "income",
      status: "active",
      recurrence_mode: recurrenceMode === 'monthly' ? 'monthly' : 'frequency',
      frequency: recurrenceMode,
      days_of_month: recurrenceMode === 'monthly' || recurrenceMode === 'semimonthly' ? recurrenceDays : [],
      start_date: dueDate,
      end_date: recurrenceEndMode === 'until_date' ? input.recurrenceEndDate : null,
      occurrence_limit: recurrenceEndMode === 'count' ? input.recurrenceCount : null,
      default_amount: amount,
      default_account_id: accountId,
      business_unit_key: unit,
      income_source_id: sourceId,
    }).select("id").single();

    if (templateError || !template) {
      console.error("Supabase Error (template):", templateError);
      throw new Error(`No se pudo registrar la plantilla de ingreso: ${templateError?.message ?? "sin respuesta"}`);
    }

    const occurrenceDates = generateIncomeOccurrenceDates({
      frequency: recurrenceMode,
      startDate: dueDate,
      recurrenceDays,
      endMode: recurrenceEndMode,
      endDate: input.recurrenceEndDate,
      occurrenceCount: input.recurrenceCount,
      maxOccurrences: recurrenceEndMode === 'count' ? input.recurrenceCount ?? 1000 : recurrenceEndMode === 'until_date' ? 1000 : 366,
      generationHorizonDays: recurrenceEndMode === 'indefinite' ? 366 : 36_525,
    });
    const eventsToInsert = occurrenceDates.map((eventDate) => ({
      workspace_id: context.workspace.id,
      due_date: eventDate,
      title,
      amount,
      kind: "income",
      status: "scheduled",
      priority: "medium",
      account_id: accountId,
      suggested_account_id: accountId,
      business_unit_key: unit,
      linked_entity_type: "income_source",
      linked_entity_id: sourceId,
      template_id: template.id,
    }));

    if (eventsToInsert.length > 0) {
      const { error: bulkError } = await admin.from("scheduled_events").insert(eventsToInsert);
      if (bulkError) {
        console.error("Supabase Error (bulk):", bulkError);
        await admin.from("income_templates").delete().eq("id", template.id).eq("workspace_id", context.workspace.id);
        throw new Error(`Error generando eventos proyectados: ${bulkError.message}`);
      }
    }
  }

  revalidatePath("/app");
  return { ok: true };
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
  frequency?: string | null;
}) {
  const context = await requireWorkspaceContext();
  const admin = await createSupabaseServerComponentClient();

  if (!admin) throw new Error("Supabase client no disponible.");

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
  
  const frequency = input.frequency || 'once';
  
  const eventsToInsert = [];
  let currentDate = new Date(`${dueDate}T00:00:00-05:00`);
  let maxOccurrences = 1;
  let monthsInterval = 1;

  if (frequency === 'monthly') { maxOccurrences = 12; monthsInterval = 1; }
  else if (frequency === 'bimonthly') { maxOccurrences = 6; monthsInterval = 2; }
  else if (frequency === 'quarterly') { maxOccurrences = 4; monthsInterval = 3; }
  else if (frequency === 'biannual') { maxOccurrences = 2; monthsInterval = 6; }
  else if (frequency === 'annual') { maxOccurrences = 1; monthsInterval = 12; } // Just 1 for annual in a 1 year projection

  for (let i = 0; i < maxOccurrences; i++) {
    const eventDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + (i * monthsInterval), currentDate.getDate());
    const eventDateStr = new Intl.DateTimeFormat("en-CA", {
      year: "numeric", month: "2-digit", day: "2-digit"
    }).format(eventDate);

    eventsToInsert.push({
      workspace_id: context.workspace.id,
      due_date: eventDateStr,
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
  }

  let templateId = null;

  // Si la frecuencia NO es "once", creamos la suscripción (expense_template)
  if (frequency !== "once" && accountId) {
    const { data: template, error: templateError } = await admin
      .from("expense_templates")
      .insert({
        workspace_id: context.workspace.id,
        name: title,
        kind: kind,
        status: "active",
        recurrence_mode: "frequency",
        frequency: frequency,
        start_date: eventsToInsert[0].due_date,
        default_amount: amount,
        default_account_id: accountId,
        business_unit_key: "general",
        notes: notesParts.length > 0 ? notesParts.join(" · ") : null,
      })
      .select("id")
      .single();

    if (!templateError && template) {
      templateId = template.id;
      // Asignar el template_id a todos los eventos futuros
      eventsToInsert.forEach((event) => {
        (event as any).template_id = templateId;
      });
    } else {
      console.error("Error creando expense_template:", templateError);
    }
  }

  const { error } = await admin.from("scheduled_events").insert(eventsToInsert);

  if (error) {
    throw new Error(`No se pudo crear la obligacion: ${error.message}`);
  }

  if (obligationType === "prestamo_recibido" && accountId) {
    // Add funds immediately to the destination account via atomic RPC
    // @ts-expect-error - RPC is not in generated types yet
    const { error: rpcError } = await admin.rpc("increment_account_balance", {
      p_account_id: accountId,
      p_amount: amount,
      p_allow_negative: true,
    });
    if (rpcError) throw new Error(`No se pudo actualizar el saldo de la cuenta: ${rpcError.message}`);
      
      const tzDate = new Intl.DateTimeFormat("en-CA", {
        timeZone: "America/Bogota",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
      }).format(new Date()).replace(", ", "T");

      await admin.from("transactions").insert({
        workspace_id: context.workspace.id,
        kind: "transfer_in",
        amount: amount,
        account_id: accountId,
        title: `Préstamo recibido: ${title}`,
        date: tzDate,
      });
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
  const admin = await createSupabaseServerComponentClient();

  if (!admin) throw new Error("Supabase client no disponible.");

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

  // @ts-expect-error - RPC is not in generated types yet
  const { data: nextBalance, error: accountUpdateError } = await admin.rpc("increment_account_balance", {
    p_account_id: accountId,
    p_amount: -amount,
    p_allow_negative: false
  });

  if (accountUpdateError) {
    if (accountUpdateError.message.includes("INSUFFICIENT_FUNDS")) {
      throw new Error("La cuenta elegida no tiene saldo suficiente para prestar ese monto.");
    }
    throw new Error(`No se pudo actualizar la cuenta: ${accountUpdateError.message}`);
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
    // Rollback account balance
    // @ts-expect-error
    await admin.rpc("increment_account_balance", { p_account_id: accountId, p_amount: amount, p_allow_negative: true });
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
    // Rollback account balance & delete receivable
    // @ts-expect-error
    await admin.rpc("increment_account_balance", { p_account_id: accountId, p_amount: amount, p_allow_negative: true });
    await admin.from("receivables").delete().eq("id", receivable.id).eq("workspace_id", context.workspace.id);
    throw new Error(`No se pudo registrar la salida del prestamo: ${transactionError?.message ?? "sin respuesta"}`);
  }

  revalidatePath("/app");
  return { ok: true, receivableId: String(receivable.id), transactionId: String(transaction.id) };
}

export async function archiveAccount(accountId: string) {
  const context = await requireWorkspaceContext();
  const admin = await createSupabaseServerComponentClient();

  if (!admin) throw new Error("Supabase client no disponible.");

  const { data: account, error: accountError } = await admin
    .from("accounts")
    .select("id, name, balance")
    .eq("id", accountId)
    .eq("workspace_id", context.workspace.id)
    .eq("active", true)
    .eq("archived", false)
    .maybeSingle();

  if (accountError || !account) {
    throw new Error(`No se encontró la cuenta: ${accountError?.message ?? "sin respuesta"}`);
  }

  const balance = Number(account.balance ?? 0);
  if (Math.abs(balance) > 0.009) {
    throw new Error("Para archivar esta cuenta, primero deja su saldo en $0 mediante un movimiento o transferencia.");
  }

  const { count, error: countError } = await admin
    .from("accounts")
    .select("id", { count: "exact", head: true })
    .eq("workspace_id", context.workspace.id)
    .eq("active", true)
    .eq("archived", false);

  if (countError) throw new Error(`No se pudieron validar tus cuentas: ${countError.message}`);
  if ((count ?? 0) <= 1) throw new Error("Debes conservar al menos una cuenta activa en Arca.");

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
  return { ok: true, accountId: String(account.id), name: String(account.name) };
}

export async function createBusinessUnit(input: { name: string; key: string }) {
  const context = await requireWorkspaceContext();
  const admin = await createSupabaseServerComponentClient();

  if (!admin) throw new Error("Supabase client no disponible.");

  const name = input.name.trim();
  const key = input.key.trim().toLowerCase().replace(/\s+/g, "-");

  if (!name) throw new Error("El proyecto necesita un nombre.");
  if (!key) throw new Error("No se pudo generar el identificador del proyecto.");

  const { data, error } = await admin
    .from("business_units")
    .insert({
      workspace_id: context.workspace.id,
      name,
      key,
      income: 0,
      expense: 0,
      pending: 0,
    })
    .select("id, name, key")
    .single();

  if (error || !data) throw new Error(`No se pudo crear el proyecto: ${error?.message ?? "sin respuesta"}`);

  revalidatePath("/app");
  return { ok: true, unitId: String(data.id), name: String(data.name), key: String(data.key) };
}

export async function updateBusinessUnit(input: { id: string; name: string; key: string }) {
  const context = await requireWorkspaceContext();
  const admin = await createSupabaseServerComponentClient();

  if (!admin) throw new Error("Supabase client no disponible.");

  const name = input.name.trim();
  const key = input.key.trim().toLowerCase().replace(/\s+/g, "-");

  if (!name) throw new Error("El proyecto necesita un nombre.");
  if (!key) throw new Error("No se pudo conservar el identificador del proyecto.");

  const { error } = await admin
    .from("business_units")
    .update({
      name,
      key,
      updated_at: new Date().toISOString(),
    })
    .eq("id", input.id)
    .eq("workspace_id", context.workspace.id)
    .select("id, name, key")
    .single();

  if (error) throw new Error(`No se pudo actualizar el proyecto: ${error.message}`);

  revalidatePath("/app");
  return { ok: true, unitId: input.id, name, key };
}

export async function archiveBusinessUnit(id: string) {
  const context = await requireWorkspaceContext();
  const admin = await createSupabaseServerComponentClient();
  if (!admin) throw new Error("Supabase client no disponible.");

  const { data: unit, error: unitError } = await admin
    .from("business_units")
    .select("id, name, key")
    .eq("id", id)
    .eq("workspace_id", context.workspace.id)
    .eq("archived", false)
    .maybeSingle();

  if (unitError?.message.includes("archived")) {
    throw new Error("Falta aplicar la actualización de proyectos en Supabase antes de archivar.");
  }
  if (unitError || !unit) throw new Error("No se encontro el proyecto.");
  if (String(unit.name).toLowerCase() === "personal" || String(unit.key).startsWith("personal-")) {
    throw new Error("El espacio Personal no se puede archivar.");
  }

  const { error } = await admin
    .from("business_units")
    .update({ archived: true, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("workspace_id", context.workspace.id);

  if (error) throw new Error(`No se pudo archivar el proyecto: ${error.message}`);

  revalidatePath("/app");
  return { ok: true, unitId: String(unit.id), name: String(unit.name), key: String(unit.key) };
}

export async function createExpenseCategory(input: {
  name: string;
  parentId?: string | null;
  icon?: string | null;
}) {
  const context = await requireWorkspaceContext();
  const admin = await createSupabaseServerComponentClient();

  if (!admin) throw new Error("Supabase client no disponible.");

  const name = input.name.trim();
  if (!name) throw new Error("El nombre de la categoría es requerido.");

  if (input.parentId) {
    const { data: parent, error: parentError } = await admin
      .from("expense_categories")
      .select("id")
      .eq("id", input.parentId)
      .eq("workspace_id", context.workspace.id)
      .maybeSingle();
    if (parentError || !parent) throw new Error("La categoría principal no existe en este espacio.");
  }

  const { data, error } = await admin
    .from("expense_categories")
    .insert({
      workspace_id: context.workspace.id,
      name,
      parent_id: input.parentId || null,
      icon: input.icon || null,
    })
    .select("id")
    .single();

  if (error || !data) {
    throw new Error(`Error al crear la categoría: ${error?.message}`);
  }

  revalidatePath("/app");
  return { ok: true, categoryId: data.id };
}

export async function updateExpenseCategory(input: {
  id: string;
  name: string;
  parentId?: string | null;
  icon?: string | null;
}) {
  const context = await requireWorkspaceContext();
  const admin = await createSupabaseServerComponentClient();

  if (!admin) throw new Error("Supabase client no disponible.");

  const name = input.name.trim();
  if (!name) throw new Error("El nombre de la categoría es requerido.");
  if (input.parentId === input.id) throw new Error("Una categoría no puede depender de sí misma.");

  const { data: category, error: categoryError } = await admin
    .from("expense_categories")
    .select("id")
    .eq("id", input.id)
    .eq("workspace_id", context.workspace.id)
    .maybeSingle();
  if (categoryError || !category) throw new Error("La categoría no existe en este espacio.");

  if (input.parentId) {
    const { data: parent, error: parentError } = await admin
      .from("expense_categories")
      .select("id")
      .eq("id", input.parentId)
      .eq("workspace_id", context.workspace.id)
      .maybeSingle();
    if (parentError || !parent) throw new Error("La categoría principal no existe en este espacio.");
  }

  const { error } = await admin
    .from("expense_categories")
    .update({
      name,
      parent_id: input.parentId || null,
      icon: input.icon || null,
    })
    .eq("id", input.id)
    .eq("workspace_id", context.workspace.id);

  if (error) throw new Error(`No se pudo actualizar la categoría: ${error.message}`);

  revalidatePath("/app");
  return { ok: true };
}

export async function createIncomeSource(input: {
  name: string;
  businessUnitKey: string;
  defaultAccountId: string;
}) {
  const context = await requireWorkspaceContext();
  const admin = await createSupabaseServerComponentClient();

  if (!admin) throw new Error("Supabase client no disponible.");

  const name = input.name.trim();
  const businessUnitKey = input.businessUnitKey.trim();
  const defaultAccountId = input.defaultAccountId.trim();

  if (!name) throw new Error("La fuente necesita un nombre.");
  if (!businessUnitKey) throw new Error("Debes elegir Personal o un proyecto.");
  if (!defaultAccountId) throw new Error("Debes elegir la cuenta destino por defecto.");

  const [accountResult, unitResult] = await Promise.all([
    admin.from("accounts").select("id").eq("id", defaultAccountId).eq("workspace_id", context.workspace.id).eq("active", true).maybeSingle(),
    admin.from("business_units").select("key").eq("key", businessUnitKey).eq("workspace_id", context.workspace.id).maybeSingle(),
  ]);
  if (accountResult.error || !accountResult.data) throw new Error("La cuenta destino no existe en este espacio.");
  if (unitResult.error || !unitResult.data) throw new Error("El espacio o proyecto no existe.");

  const { data: source, error } = await admin
    .from("income_sources")
    .insert({
      workspace_id: context.workspace.id,
      name,
      business_unit_key: businessUnitKey,
      default_account_id: defaultAccountId,
      type: "manual",
      active: true,
    })
    .select("id")
    .single();

  if (error || !source) throw new Error(`No se pudo crear la fuente de ingreso: ${error?.message ?? "sin respuesta"}`);

  revalidatePath("/app");
  return { ok: true, sourceId: String(source.id) };
}

export async function updateIncomeSource(input: {
  id: string;
  name: string;
  businessUnitKey: string;
  defaultAccountId: string;
}) {
  const context = await requireWorkspaceContext();
  const admin = await createSupabaseServerComponentClient();

  if (!admin) throw new Error("Supabase client no disponible.");

  const name = input.name.trim();
  const businessUnitKey = input.businessUnitKey.trim();
  const defaultAccountId = input.defaultAccountId.trim();

  if (!name) throw new Error("La fuente necesita un nombre.");
  if (!businessUnitKey) throw new Error("Debes elegir Personal o un proyecto.");
  if (!defaultAccountId) throw new Error("Debes elegir la cuenta destino por defecto.");

  const [sourceResult, accountResult, unitResult] = await Promise.all([
    admin.from("income_sources").select("id").eq("id", input.id).eq("workspace_id", context.workspace.id).maybeSingle(),
    admin.from("accounts").select("id").eq("id", defaultAccountId).eq("workspace_id", context.workspace.id).eq("active", true).maybeSingle(),
    admin.from("business_units").select("key").eq("key", businessUnitKey).eq("workspace_id", context.workspace.id).maybeSingle(),
  ]);
  if (sourceResult.error || !sourceResult.data) throw new Error("La fuente de ingreso no existe en este espacio.");
  if (accountResult.error || !accountResult.data) throw new Error("La cuenta destino no existe en este espacio.");
  if (unitResult.error || !unitResult.data) throw new Error("El espacio o proyecto no existe.");

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
  const admin = await createSupabaseServerComponentClient();

  if (!admin) throw new Error("Supabase client no disponible.");

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
  const admin = await createSupabaseServerComponentClient();

  if (!admin) throw new Error("Supabase client no disponible.");

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

export async function updateCreditCardDetails(input: {
  id: string;
  name: string;
  issuer: string;
  limitValue: number;
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
  const admin = await createSupabaseServerComponentClient();

  if (!admin) throw new Error("Supabase client no disponible.");

  const { data: currentCard, error: currentError } = await admin
    .from("credit_cards")
    .select("id, name, used")
    .eq("id", input.id)
    .eq("workspace_id", context.workspace.id)
    .eq("archived", false)
    .maybeSingle();

  if (currentError) throw new Error(`No se pudo consultar la tarjeta: ${currentError.message}`);
  if (!currentCard) throw new Error("La tarjeta ya no está disponible.");

  const name = input.name.trim();
  const issuer = input.issuer.trim();
  const limitValue = Number(input.limitValue);
  const used = Number(currentCard.used ?? 0);
  const minimumPayment = Number(input.minimumPayment);

  if (!name) throw new Error("La tarjeta necesita un nombre.");
  if (!issuer) throw new Error("La tarjeta necesita un emisor.");
  if (!Number.isFinite(limitValue) || limitValue < 0) throw new Error("El cupo debe ser válido.");
  if (limitValue > 0 && used > limitValue) throw new Error("El cupo no puede ser menor que la deuda actual.");
  if (!Number.isFinite(minimumPayment) || minimumPayment < 0) throw new Error("El pago mínimo debe ser válido.");

  const cutOffDate = Math.min(31, Math.max(1, Math.trunc(input.cutOffDate || 1)));
  const payDueDate = Math.min(31, Math.max(1, Math.trunc(input.payDueDate || 1)));
  const annualInterestRate = input.annualInterestRate == null || Number.isNaN(input.annualInterestRate) ? null : Math.max(0, input.annualInterestRate);
  const estimatedPayoffMonths = input.estimatedPayoffMonths == null || Number.isNaN(input.estimatedPayoffMonths) ? null : Math.max(0, Math.trunc(input.estimatedPayoffMonths));
  const estimatedTotalPayment = input.estimatedTotalPayment == null || Number.isNaN(input.estimatedTotalPayment) ? null : Math.max(0, input.estimatedTotalPayment);
  const interestType = input.interestType.trim() || "unknown";
  const paymentStrategy = input.paymentStrategy.trim() || "minimum";
  const palette = creditCardBrandPalette(issuer);

  const { error } = await admin
    .from("credit_cards")
    .update({
      name,
      issuer,
      limit_value: limitValue,
      cut_off_date: cutOffDate,
      pay_due_date: payDueDate,
      minimum_payment: minimumPayment,
      annual_interest_rate: annualInterestRate,
      interest_type: interestType,
      estimated_payoff_months: estimatedPayoffMonths,
      estimated_total_payment: estimatedTotalPayment,
      payment_strategy: paymentStrategy,
      notes: input.notes.trim(),
      status: limitValue > 0 && used >= limitValue ? "blocked" : "active",
      brand_color: palette.brand,
      text_color: palette.text,
      updated_at: new Date().toISOString(),
    })
    .eq("id", input.id)
    .eq("workspace_id", context.workspace.id);

  if (error) throw new Error(`No se pudo actualizar la tarjeta: ${error.message}`);

  const { error: eventError } = await admin
    .from("scheduled_events")
    .update({ title: `Pago TDC ${name}`, amount: minimumPayment })
    .eq("workspace_id", context.workspace.id)
    .eq("linked_entity_type", "credit_card")
    .eq("linked_entity_id", input.id)
    .eq("status", "pending");

  if (eventError) console.error("No se pudieron sincronizar los pagos programados de la tarjeta:", eventError);

  revalidatePath("/app");
  return { ok: true, cardId: String(currentCard.id), name, issuer, limitValue, used, minimumPayment, cutOffDate, payDueDate };
}

export async function archiveCreditCard(cardId: string) {
  const context = await requireWorkspaceContext();
  const admin = await createSupabaseServerComponentClient();

  if (!admin) throw new Error("Supabase client no disponible.");

  const { data: card, error: cardError } = await admin
    .from("credit_cards")
    .select("id, name, used")
    .eq("id", cardId)
    .eq("workspace_id", context.workspace.id)
    .eq("archived", false)
    .maybeSingle();

  if (cardError) throw new Error(`No se pudo consultar la tarjeta: ${cardError.message}`);
  if (!card) throw new Error("La tarjeta ya no está disponible.");
  if (Number(card.used ?? 0) > 0) {
    throw new Error("No puedes archivar una tarjeta con deuda. Registra primero sus pagos o ajustes.");
  }

  const { error } = await admin
    .from("credit_cards")
    .update({
      archived: true,
      updated_at: new Date().toISOString(),
    })
    .eq("id", cardId)
    .eq("workspace_id", context.workspace.id);

  if (error) throw new Error(`No se pudo archivar la tarjeta: ${error.message}`);

  const { error: eventError } = await admin
    .from("scheduled_events")
    .update({ status: "cancelled" })
    .eq("workspace_id", context.workspace.id)
    .eq("linked_entity_type", "credit_card")
    .eq("linked_entity_id", cardId)
    .eq("status", "pending");

  if (eventError) console.error("No se pudieron cancelar los pagos programados de la tarjeta:", eventError);

  revalidatePath("/app");
  return { ok: true, cardId: String(card.id), name: String(card.name) };
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
  const admin = await createSupabaseServerComponentClient();

  if (!admin) throw new Error("Supabase client no disponible.");

  createCreditCardSchema.parse({
    name: input.name,
    issuer: input.issuer,
    limit: Number(input.limitValue ?? 0),
    used: Number(input.used ?? 0),
    cutOffDay: Math.min(31, Math.max(1, Math.trunc(input.cutOffDate || 1))),
    payDueDay: Math.min(31, Math.max(1, Math.trunc(input.payDueDate || 1))),
    minimumPayment: Number(input.minimumPayment ?? 0),
  });

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

  const { data: credit, error } = await admin.from("credit_cards").insert({
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
  }).select("id").single();

  if (error || !credit) {
    throw new Error(`No se pudo crear la tarjeta: ${error?.message}`);
  }

  // Generar eventos programados (Agenda) para los próximos 12 meses
  if (input.minimumPayment > 0) {
    const eventsToInsert = [];
    const today = new Date();
    
    for (let i = 0; i < 12; i++) {
      const nextMonth = new Date(today.getFullYear(), today.getMonth() + i, payDueDate);
      
      const tzOffset = nextMonth.getTimezoneOffset() * 60000;
      const localISOTime = (new Date(nextMonth.getTime() - tzOffset)).toISOString().split('T')[0];
  
      eventsToInsert.push({
        workspace_id: context.workspace.id,
        kind: "card_payment",
        title: `Pago TDC ${name}`,
        amount: input.minimumPayment,
        due_date: localISOTime,
        status: "pending",
        linked_entity_type: "credit_card",
        linked_entity_id: credit.id,
      });
    }

    if (eventsToInsert.length > 0) {
      const { error: eventsError } = await admin.from("scheduled_events").insert(eventsToInsert);
      if (eventsError) {
        console.error("Error insertando eventos de TDC:", eventsError);
      }
    }
  }

  revalidatePath("/app");
  return {
    ok: true,
    cardId: String(credit.id),
    name,
    issuer,
    limitValue: input.limitValue,
    used: input.used,
    minimumPayment: input.minimumPayment,
    cutOffDate,
    payDueDate,
  };
}

export async function createBankCredit(input: {
  name: string;
  totalAmount: number;
  currentBalance: number;
  monthlyPayment: number;
  interestRate?: number | null;
  totalInstallments: number;
  paidInstallments: number;
  payDueDate: number;
  notes?: string | null;
  brandColor?: string | null;
  textColor?: string | null;
}) {
  const context = await requireWorkspaceContext();
  const admin = await createSupabaseServerComponentClient();

  if (!admin) throw new Error("Supabase client no disponible.");

  const name = input.name.trim();

  if (!name) throw new Error("El crédito necesita un nombre.");
  if (!Number.isFinite(input.totalAmount) || input.totalAmount <= 0) throw new Error("El monto total debe ser válido.");
  if (!Number.isFinite(input.currentBalance) || input.currentBalance < 0) throw new Error("El saldo actual debe ser válido.");
  if (!Number.isFinite(input.monthlyPayment) || input.monthlyPayment < 0) throw new Error("La cuota mensual debe ser válida.");
  if (!Number.isInteger(input.totalInstallments) || input.totalInstallments < 1) throw new Error("El total de cuotas debe ser válido.");
  if (!Number.isInteger(input.paidInstallments) || input.paidInstallments < 0 || input.paidInstallments > input.totalInstallments) {
    throw new Error("Las cuotas pagadas deben estar entre cero y el total de cuotas.");
  }
  
  const payDueDate = Math.min(31, Math.max(1, Math.trunc(input.payDueDate || 1)));

  const { data: credit, error } = await admin.from("bank_credits").insert({
    workspace_id: context.workspace.id,
    name,
    total_amount: input.totalAmount,
    current_balance: input.currentBalance,
    monthly_payment: input.monthlyPayment,
    interest_rate: input.interestRate ?? null,
    total_installments: input.totalInstallments,
    paid_installments: input.paidInstallments,
    pay_due_date: payDueDate,
    notes: input.notes?.trim() || null,
    brand_color: input.brandColor || "#16735b",
    text_color: input.textColor || "#ffffff",
    status: input.currentBalance <= 0 ? "paid" : "active",
  }).select("id").single();

  if (error || !credit) {
    throw new Error(`No se pudo crear el crédito: ${error?.message}`);
  }

  // Generar eventos programados (Agenda) para los próximos 12 meses
  const eventsToInsert = [];
  const today = new Date();
  
  for (let i = 0; i < Math.min(12, input.totalInstallments - input.paidInstallments); i++) {
    const nextMonth = new Date(today.getFullYear(), today.getMonth() + i, payDueDate);
    
    const eventDateStr = new Intl.DateTimeFormat("en-CA", {
      year: "numeric", month: "2-digit", day: "2-digit"
    }).format(nextMonth);

    eventsToInsert.push({
      workspace_id: context.workspace.id,
      due_date: eventDateStr,
      title: `Pago Cuota ${name}`,
      amount: input.monthlyPayment,
      kind: "debt_payment",
      status: "scheduled",
      priority: "high",
      linked_entity_type: "bank_credit",
      linked_entity_id: credit.id,
      notes: `Cuota ${input.paidInstallments + i + 1} de ${input.totalInstallments}`,
    });
  }

  if (eventsToInsert.length > 0) {
    await admin.from("scheduled_events").insert(eventsToInsert);
  }

  revalidatePath("/app");
  return {
    ok: true,
    creditId: String(credit.id),
    name,
    totalAmount: input.totalAmount,
    currentBalance: input.currentBalance,
    monthlyPayment: input.monthlyPayment,
    totalInstallments: input.totalInstallments,
    paidInstallments: input.paidInstallments,
    payDueDate,
  };
}

export async function updateBankCreditDetails(input: {
  id: string;
  name: string;
  totalAmount: number;
  currentBalance?: number;
  monthlyPayment: number;
  interestRate?: number | null;
  totalInstallments: number;
  paidInstallments?: number;
  payDueDate: number;
  notes?: string | null;
}) {
  const context = await requireWorkspaceContext();
  const admin = await createSupabaseServerComponentClient();

  if (!admin) throw new Error("Supabase client no disponible.");

  const { data: credit, error: creditError } = await admin
    .from("bank_credits")
    .select("id, name, current_balance, paid_installments")
    .eq("id", input.id)
    .eq("workspace_id", context.workspace.id)
    .neq("status", "archived")
    .maybeSingle();

  if (creditError) throw new Error(`No se pudo consultar el crédito: ${creditError.message}`);
  if (!credit) throw new Error("El crédito ya no está disponible.");

  const name = input.name.trim();
  const totalAmount = Number(input.totalAmount);
  const monthlyPayment = Number(input.monthlyPayment);
  const totalInstallments = Math.max(1, Math.trunc(input.totalInstallments));
  const paidInstallments = Number(credit.paid_installments ?? 0);
  const payDueDate = Math.min(31, Math.max(1, Math.trunc(input.payDueDate || 1)));

  if (!name) throw new Error("El crédito necesita un nombre.");
  if (!Number.isFinite(totalAmount) || totalAmount <= 0) throw new Error("El monto total debe ser válido.");
  if (!Number.isFinite(monthlyPayment) || monthlyPayment < 0) throw new Error("La cuota mensual debe ser válida.");
  if (totalInstallments < paidInstallments) throw new Error("El total de cuotas no puede ser menor que las ya pagadas.");

  const { error } = await admin
    .from("bank_credits")
    .update({
      name,
      total_amount: totalAmount,
      monthly_payment: monthlyPayment,
      interest_rate: input.interestRate == null || Number.isNaN(input.interestRate) ? null : Math.max(0, input.interestRate),
      total_installments: totalInstallments,
      pay_due_date: payDueDate,
      notes: input.notes?.trim() || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", input.id)
    .eq("workspace_id", context.workspace.id);

  if (error) throw new Error(`No se pudo actualizar el crédito: ${error.message}`);

  const { error: eventError } = await admin
    .from("scheduled_events")
    .update({ title: `Pago Cuota ${name}`, amount: monthlyPayment })
    .eq("workspace_id", context.workspace.id)
    .eq("linked_entity_type", "bank_credit")
    .eq("linked_entity_id", input.id)
    .in("status", ["scheduled", "pending", "overdue"]);

  if (eventError) console.error("No se pudieron sincronizar las cuotas programadas del crédito:", eventError);

  revalidatePath("/app");
  return {
    ok: true,
    creditId: String(credit.id),
    name,
    totalAmount,
    currentBalance: Number(credit.current_balance ?? 0),
    monthlyPayment,
    totalInstallments,
    paidInstallments,
    payDueDate,
  };
}

export async function archiveBankCredit(creditId: string) {
  const context = await requireWorkspaceContext();
  const admin = await createSupabaseServerComponentClient();

  if (!admin) throw new Error("Supabase client no disponible.");

  const { data: credit, error: creditError } = await admin
    .from("bank_credits")
    .select("id, name, current_balance")
    .eq("id", creditId)
    .eq("workspace_id", context.workspace.id)
    .neq("status", "archived")
    .maybeSingle();

  if (creditError) throw new Error(`No se pudo consultar el crédito: ${creditError.message}`);
  if (!credit) throw new Error("El crédito ya no está disponible.");
  if (Number(credit.current_balance ?? 0) > 0) {
    throw new Error("No puedes archivar un crédito con saldo pendiente.");
  }

  const { error } = await admin
    .from("bank_credits")
    .update({ status: "archived", updated_at: new Date().toISOString() })
    .eq("id", creditId)
    .eq("workspace_id", context.workspace.id);

  if (error) throw new Error(`No se pudo archivar el crédito: ${error.message}`);

  const { error: eventError } = await admin
    .from("scheduled_events")
    .update({ status: "cancelled" })
    .eq("workspace_id", context.workspace.id)
    .eq("linked_entity_type", "bank_credit")
    .eq("linked_entity_id", creditId)
    .in("status", ["scheduled", "pending", "overdue"]);

  if (eventError) console.error("No se pudieron cancelar las cuotas programadas del crédito:", eventError);

  revalidatePath("/app");
  return { ok: true, creditId: String(credit.id), name: String(credit.name) };
}

export async function updateSavingsGoal(input: { id: string; name: string; current: number; dueDate?: string | null }) {
  const context = await requireWorkspaceContext();
  const admin = await createSupabaseServerComponentClient();

  if (!admin) throw new Error("Supabase client no disponible.");

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
  const admin = await createSupabaseServerComponentClient();

  if (!admin) throw new Error("Supabase client no disponible.");

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
  const admin = await createSupabaseServerComponentClient();

  if (!admin) throw new Error("Supabase client no disponible.");

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
    const today = todayDateInBogota();

    // @ts-expect-error
    const { error: balanceError } = await admin.rpc("increment_account_balance", {
      p_account_id: goal.account_id,
      p_amount: amountToRelease,
      p_allow_negative: true
    });
      
    if (balanceError) {
      throw new Error(`Error al actualizar el saldo de la cuenta: ${balanceError.message}`);
    }

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
      // @ts-expect-error
      await admin.rpc("increment_account_balance", { p_account_id: goal.account_id, p_amount: -amountToRelease, p_allow_negative: true });
      throw new Error(`No se pudo registrar la devolución del dinero: ${movementError.message}`);
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
  const admin = await createSupabaseServerComponentClient();

  if (!admin) throw new Error("Supabase client no disponible.");

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

  const today = todayDateInBogota();

  // @ts-expect-error
  const { error: accountUpdateError } = await admin.rpc("increment_account_balance", {
    p_account_id: input.accountId,
    p_amount: -input.amount,
    p_allow_negative: false
  });

  if (accountUpdateError) {
    if (accountUpdateError.message.includes("INSUFFICIENT_FUNDS")) {
      throw new Error("La cuenta elegida no tiene saldo suficiente.");
    }
    throw new Error(`No se pudo descontar de la cuenta origen: ${accountUpdateError.message}`);
  }

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
      },
    })
    .select("id")
    .single();

  if (movementError || !movement) {
    // @ts-expect-error
    await admin.rpc("increment_account_balance", { p_account_id: input.accountId, p_amount: input.amount, p_allow_negative: true });
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
    // @ts-expect-error
    await admin.rpc("increment_account_balance", { p_account_id: input.accountId, p_amount: input.amount, p_allow_negative: true });
    throw new Error(`No se pudo registrar el aporte: ${transactionError.message}`);
  }

  // @ts-expect-error
  const { error: updateError } = await admin.rpc("increment_savings_goal_current", {
    p_goal_id: input.goalId,
    p_amount: input.amount
  });

  if (updateError) {
    // @ts-expect-error
    await admin.rpc("increment_account_balance", { p_account_id: input.accountId, p_amount: input.amount, p_allow_negative: true });
    throw new Error(`Se registró el aporte, pero no se pudo actualizar la meta: ${updateError.message}`);
  }

  revalidatePath("/app");
  return { ok: true };
}

export async function createSavingsGoal(input: {
  name: string;
  target: number;
  current: number;
  dueDate?: string | null;
  goalType?: "saving" | "pocket" | "goal";
  color?: string;
  sourceAccountId?: string | null;
}) {
  const context = await requireWorkspaceContext();
  const admin = await createSupabaseServerComponentClient();

  if (!admin) throw new Error("Supabase client no disponible.");

  createSavingsGoalSchema.parse({
    name: input.name,
    target: Number(input.target ?? 0),
    current: Number(input.current ?? 0),
    dueDate: input.dueDate,
    goalType: input.goalType ?? "goal",
    color: input.color,
    sourceAccountId: input.sourceAccountId,
  });

  const name = input.name.trim();
  const target = Number(input.target ?? 0);
  const current = Number(input.current ?? 0);
  const dueDate = input.dueDate?.trim() || null;
  const goalType = input.goalType ?? "saving";
  const color = input.color?.trim() || (goalType === "pocket" ? "#8FA66A" : "#16735b");

  if (!name) throw new Error("El ahorro necesita un nombre.");
  if (target <= 0) throw new Error("El monto objetivo debe ser mayor a cero.");
  if (current < 0) throw new Error("El monto actual no puede ser negativo.");

  if (goalType === "pocket" && !input.sourceAccountId) {
    throw new Error("Los bolsillos requieren una cuenta de origen.");
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
    
    if (savTransErr) {
      await admin.from("savings_goals").delete().eq("id", goal.id);
      throw new Error(`Se creó el ahorro, pero no el saldo inicial: ${savTransErr.message}`);
    }

    // For pockets with a source account: deduct from account balance + log transaction
    if (goalType === "pocket" && input.sourceAccountId) {
      // @ts-expect-error
      const { error: accUpdateErr } = await admin.rpc("increment_account_balance", {
        p_account_id: input.sourceAccountId,
        p_amount: -current,
        p_allow_negative: false
      });

      if (accUpdateErr) {
        await admin.from("savings_goals").delete().eq("id", goal.id);
        if (accUpdateErr.message.includes("INSUFFICIENT_FUNDS")) {
          throw new Error("La cuenta origen no tiene saldo suficiente.");
        }
        throw new Error(`No se pudo descontar de la cuenta: ${accUpdateErr.message}`);
      }

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
  const admin = await createSupabaseServerComponentClient();

  if (!admin) throw new Error("Supabase client no disponible.");

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
  const admin = await createSupabaseServerComponentClient();

  if (!admin) throw new Error("Supabase client no disponible.");

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
  const admin = await createSupabaseServerComponentClient();

  if (!admin) throw new Error("Supabase client no disponible.");

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
  const admin = await createSupabaseServerComponentClient();

  if (!admin) throw new Error("Supabase client no disponible.");

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
  accountId: string;
}) {
  const context = await requireWorkspaceContext();
  const admin = await createSupabaseServerComponentClient();

  if (!admin) throw new Error("Supabase client no disponible.");

  if (!input.accountId) throw new Error("Selecciona la cuenta o banco del movimiento.");
  if (!Number.isFinite(input.amount) || input.amount <= 0) throw new Error("El valor debe ser mayor que cero.");

  const { data: transaction, error: transactionError } = await admin
    .from("transactions")
    .select("id, workspace_id, kind, amount, account_id, source_type, concept, category, unit, date")
    .eq("id", input.id)
    .eq("workspace_id", context.workspace.id)
    .maybeSingle();

  if (transactionError || !transaction) {
    throw new Error(`No se pudo leer el movimiento: ${transactionError?.message ?? "sin respuesta"}`);
  }

  const isLinkedMovement = Boolean(transaction.source_type && transaction.source_type !== "manual");
  const previousAmount = typeof transaction.amount === "number" ? transaction.amount : Number(transaction.amount ?? 0);
  const effectiveAmount = input.amount;

  const previousAccountId = transaction.account_id ? String(transaction.account_id) : null;
  const nextAccountId = input.accountId;
  const accountIds = Array.from(new Set([previousAccountId, nextAccountId].filter(Boolean))) as string[];
  const { data: accounts, error: accountsError } = await admin
    .from("accounts")
    .select("id, balance")
    .eq("workspace_id", context.workspace.id)
    .in("id", accountIds);

  if (accountsError) {
    throw new Error(`No se pudieron leer las cuentas: ${accountsError.message}`);
  }

  const accountMap = new Map(
    (accounts ?? []).map((account) => [
      String(account.id),
      typeof account.balance === "number" ? account.balance : Number(account.balance ?? 0),
    ]),
  );
  const nextAccountBalance = accountMap.get(nextAccountId);

  if (nextAccountBalance == null) throw new Error("La cuenta seleccionada no existe o no pertenece a este espacio.");
  if (previousAccountId && !accountMap.has(previousAccountId)) throw new Error("No se pudo leer la cuenta original del movimiento.");

  const previousDelta = transactionDelta(String(transaction.kind), previousAmount);
  const nextDelta = transactionDelta(String(transaction.kind), effectiveAmount);
  const originalBalances = new Map(accountMap);
  const targetBalances = new Map(accountMap);

  if (previousAccountId === nextAccountId) {
    targetBalances.set(nextAccountId, nextAccountBalance - previousDelta + nextDelta);
  } else {
    if (previousAccountId) {
      targetBalances.set(previousAccountId, (accountMap.get(previousAccountId) ?? 0) - previousDelta);
    }
    targetBalances.set(nextAccountId, nextAccountBalance + nextDelta);
  }

  if ((targetBalances.get(nextAccountId) ?? 0) < 0 && nextDelta < 0) {
    throw new Error("La cuenta seleccionada no tiene saldo suficiente para este movimiento.");
  }

  const changedAccountIds = Array.from(targetBalances.keys()).filter(
    (accountId) => targetBalances.get(accountId) !== originalBalances.get(accountId),
  );
  const updatedAccountIds: string[] = [];

  for (const accountId of changedAccountIds) {
    const { error: balanceError } = await admin
      .from("accounts")
      .update({ balance: targetBalances.get(accountId), updated_at: new Date().toISOString() })
      .eq("id", accountId)
      .eq("workspace_id", context.workspace.id);

    if (balanceError) {
      for (const updatedAccountId of updatedAccountIds) {
        await admin
          .from("accounts")
          .update({ balance: originalBalances.get(updatedAccountId), updated_at: new Date().toISOString() })
          .eq("id", updatedAccountId)
          .eq("workspace_id", context.workspace.id);
      }
      throw new Error(`No se pudo trasladar el saldo entre cuentas: ${balanceError.message}`);
    }
    updatedAccountIds.push(accountId);
  }

  const editableFields = {
    concept: input.concept ? input.concept.trim() : transaction.concept,
    amount: input.amount,
    category: input.category ? input.category.trim() : transaction.category,
    unit: input.unit ? input.unit.trim() : transaction.unit,
    account_id: nextAccountId,
    date: input.date ? `${input.date}T00:00:00-05:00` : transaction.date,
    updated_at: new Date().toISOString(),
  };

  const { error: updateError } = await admin
    .from("transactions")
    .update(editableFields)
    .eq("id", input.id)
    .eq("workspace_id", context.workspace.id);

  if (updateError) {
    for (const accountId of updatedAccountIds) {
      await admin
        .from("accounts")
        .update({ balance: originalBalances.get(accountId), updated_at: new Date().toISOString() })
        .eq("id", accountId)
        .eq("workspace_id", context.workspace.id);
    }
    throw new Error(`No se pudo actualizar el movimiento: ${updateError.message}`);
  }

  revalidatePath("/app");
  return { ok: true };
}

export async function deleteManualTransaction(transactionId: string) {
  const context = await requireWorkspaceContext();
  const admin = await createSupabaseServerComponentClient();

  if (!admin) throw new Error("Supabase client no disponible.");

  const { data: transaction, error: transactionError } = await admin
    .from("transactions")
    .select("id, workspace_id, kind, amount, account_id, source_type, status")
    .eq("id", transactionId)
    .eq("workspace_id", context.workspace.id)
    .maybeSingle();

  if (transactionError || !transaction) {
    throw new Error(`No se encontró el movimiento: ${transactionError?.message ?? "sin respuesta"}`);
  }

  const previousAmount = typeof transaction.amount === "number" ? transaction.amount : Number(transaction.amount ?? 0);
  const previousDelta = transactionDelta(String(transaction.kind), previousAmount);

  // 1. Revert transaction delta using RPC
  if (transaction.account_id) {
    // @ts-expect-error
    const { error: revErr } = await admin.rpc("increment_account_balance", {
      p_account_id: transaction.account_id,
      p_amount: -previousDelta,
      p_allow_negative: true
    });
    if (revErr) throw new Error(`No se pudo revertir el saldo de la cuenta: ${revErr.message}`);
  }

  const { error: deleteError } = await admin
    .from("transactions")
    .delete()
    .eq("id", transactionId)
    .eq("workspace_id", context.workspace.id);

  if (deleteError) {
    // Re-apply delta to rollback the revert
    if (transaction.account_id) {
      // @ts-expect-error
      await admin.rpc("increment_account_balance", {
        p_account_id: transaction.account_id,
        p_amount: previousDelta,
        p_allow_negative: true
      });
    }
    throw new Error(`No se pudo eliminar el movimiento: ${deleteError.message}`);
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
  const admin = await createSupabaseServerComponentClient();

  if (!admin) throw new Error("Supabase client no disponible.");

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
    .select("id, name, workspace_id")
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

  // @ts-expect-error - RPC is not in generated types yet
  const { data: fromNextBalance, error: debitError } = await admin.rpc("increment_account_balance", {
    p_account_id: fromAccount.id,
    p_amount: -input.amount,
    p_allow_negative: false
  });

  if (debitError) {
    if (debitError.message.includes("INSUFFICIENT_FUNDS")) {
      throw new Error("La cuenta origen no tiene saldo suficiente.");
    }
    throw new Error(`No se pudo actualizar la cuenta origen: ${debitError.message}`);
  }

  // @ts-expect-error - RPC is not in generated types yet
  const { data: toNextBalance, error: creditError } = await admin.rpc("increment_account_balance", {
    p_account_id: toAccount.id,
    p_amount: input.amount,
    p_allow_negative: true
  });

  if (creditError) {
    // @ts-expect-error - RPC is not in generated types yet
    await admin.rpc("increment_account_balance", { p_account_id: fromAccount.id, p_amount: input.amount, p_allow_negative: true });
    throw new Error(`No se pudo actualizar la cuenta destino: ${creditError.message}`);
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

  if (outError || inError) {
    // @ts-expect-error
    await admin.rpc("increment_account_balance", { p_account_id: fromAccount.id, p_amount: input.amount, p_allow_negative: true });
    // @ts-expect-error
    await admin.rpc("increment_account_balance", { p_account_id: toAccount.id, p_amount: -input.amount, p_allow_negative: true });
    
    // We try to clean up orphaned transactions if only one succeeded
    await admin.from("transactions").delete().eq("metadata->>transfer_key", transferKey);
    throw new Error(`Fallo al registrar las transacciones. El saldo fue restaurado.`);
  }

  revalidatePath("/app");
  return {
    ok: true,
    transferKey,
    concept,
    date: input.date,
    amount: input.amount,
    fromAccountId: String(fromAccount.id),
    fromAccountName: String(fromAccount.name),
    fromBalanceBefore: (fromNextBalance as number) + input.amount,
    fromBalanceAfter: fromNextBalance as number,
    toAccountId: String(toAccount.id),
    toAccountName: String(toAccount.name),
    toBalanceBefore: (toNextBalance as number) - input.amount,
    toBalanceAfter: toNextBalance as number,
  };
}


export async function cancelIncomeTemplate(templateId: string) {
  const context = await requireWorkspaceContext();
  const admin = await createSupabaseServerComponentClient();

  if (!admin) {
    throw new Error("Supabase client no disponible.");
  }

  // 1. Cancel the template
  const { error: templateError } = await admin
    .from("income_templates")
    .update({ status: "cancelled", end_date: new Date().toISOString() })
    .eq("id", templateId)
    .eq("workspace_id", context.workspace.id);

  if (templateError) {
    throw new Error(`No se pudo cancelar la plantilla: ${templateError.message}`);
  }

  // 2. Cancel all upcoming events linked to this template
  const { error: eventsError } = await admin
    .from("scheduled_events")
    .update({ status: "cancelled" })
    .eq("template_id", templateId)
    .eq("workspace_id", context.workspace.id)
    .eq("status", "scheduled");

  if (eventsError) {
    throw new Error(`No se pudieron cancelar los eventos futuros: ${eventsError.message}`);
  }

  revalidatePath("/app");
  return { ok: true };
}

export async function cancelExpenseTemplate(templateId: string) {
  const context = await requireWorkspaceContext();
  const admin = await createSupabaseServerComponentClient();

  if (!admin) {
    throw new Error("Supabase client no disponible.");
  }

  const { error: templateError } = await admin
    .from("expense_templates")
    .update({ status: "cancelled", end_date: new Date().toISOString() })
    .eq("id", templateId)
    .eq("workspace_id", context.workspace.id);

  if (templateError) {
    throw new Error(`No se pudo cancelar la plantilla de gasto: ${templateError.message}`);
  }

  const { error: eventsError } = await admin
    .from("scheduled_events")
    .update({ status: "cancelled" })
    .eq("template_id", templateId)
    .eq("workspace_id", context.workspace.id)
    .eq("status", "scheduled");

  if (eventsError) {
    throw new Error(`No se pudieron cancelar los eventos futuros: ${eventsError.message}`);
  }

  revalidatePath("/app");
  return { ok: true };
}
export async function deleteBusinessUnit(id: string) {
  const context = await requireWorkspaceContext();
  const admin = await createSupabaseServerComponentClient();
  if (!admin) throw new Error("Supabase client no disponible.");
  const { data: unit, error: unitError } = await admin
    .from("business_units")
    .select("key")
    .eq("id", id)
    .eq("workspace_id", context.workspace.id)
    .maybeSingle();

  if (unitError || !unit) throw new Error("No se encontró el proyecto.");

  const [sources, transactions, events] = await Promise.all([
    admin.from("income_sources").select("id", { count: "exact", head: true }).eq("workspace_id", context.workspace.id).eq("business_unit_key", unit.key),
    admin.from("transactions").select("id", { count: "exact", head: true }).eq("workspace_id", context.workspace.id).eq("unit", unit.key),
    admin.from("scheduled_events").select("id", { count: "exact", head: true }).eq("workspace_id", context.workspace.id).eq("business_unit_key", unit.key),
  ]);

  const dependencyError = sources.error ?? transactions.error ?? events.error;
  if (dependencyError) {
    throw new Error(`No se pudo validar el uso de esta unidad: ${dependencyError.message}`);
  }

  if ((sources.count ?? 0) + (transactions.count ?? 0) + (events.count ?? 0) > 0) {
    throw new Error("Esta unidad ya tiene conceptos, movimientos o eventos asociados. Reasígnalos antes de eliminarla.");
  }

  const { error } = await admin
    .from("business_units")
    .delete()
    .eq("id", id)
    .eq("workspace_id", context.workspace.id);
  if (error) throw new Error(error.message);
  revalidatePath("/app");
  return { ok: true };
}

export async function deleteExpenseCategory(id: string) {
  const context = await requireWorkspaceContext();
  const admin = await createSupabaseServerComponentClient();
  if (!admin) throw new Error("Supabase client no disponible.");
  const { error } = await admin
    .from("expense_categories")
    .delete()
    .eq("id", id)
    .eq("workspace_id", context.workspace.id);
  if (error) throw new Error(error.message);
  revalidatePath("/app");
  return { ok: true };
}

export async function deleteIncomeSource(id: string) {
  const context = await requireWorkspaceContext();
  const admin = await createSupabaseServerComponentClient();
  if (!admin) throw new Error("Supabase client no disponible.");
  const { error } = await admin
    .from("income_sources")
    .delete()
    .eq("id", id)
    .eq("workspace_id", context.workspace.id);
  if (error) throw new Error(error.message);
  revalidatePath("/app");
  return { ok: true };
}

export async function resolveReceivable(
  id: string,
  payload: { action: "pay" | "postpone" | "cancel"; amount?: number; accountId?: string; days?: number }
) {
  const context = await requireWorkspaceContext();
  const admin = await createSupabaseServerComponentClient();
  if (!admin) throw new Error("Supabase client no disponible.");

  const { data: rawReceivable, error: fetchError } = await admin
    .from("receivables")
    .select("*")
    .eq("id", id)
    .eq("workspace_id", context.workspace.id)
    .single();

  if (fetchError || !rawReceivable) {
    throw new Error("No se encontró el préstamo a cobrar.");
  }

  const receivable = rawReceivable as any;

  if (payload.action === "cancel") {
    const { error } = await admin
      .from("receivables")
      .update({ status: "cancelled", updated_at: new Date().toISOString() })
      .eq("id", id);
    if (error) throw new Error(error.message);
  } else if (payload.action === "postpone") {
    const currentDue = receivable.due_date ? new Date(receivable.due_date + "T00:00:00-05:00") : new Date();
    currentDue.setDate(currentDue.getDate() + (payload.days || 7));
    const nextDue = currentDue.toISOString().split("T")[0];
    
    const { error } = await admin
      .from("receivables")
      .update({ due_date: nextDue, status: "pending", updated_at: new Date().toISOString() })
      .eq("id", id);
    if (error) throw new Error(error.message);
  } else if (payload.action === "pay") {
    if (!payload.amount || !payload.accountId) throw new Error("Faltan datos para procesar el pago.");

    const { data: account, error: accErr } = await admin
      .from("accounts")
      .select("balance")
      .eq("id", payload.accountId)
      .eq("workspace_id", context.workspace.id)
      .single();

    if (accErr || !account) throw new Error("No se encontró la cuenta.");

    const paidAmount = payload.amount;
    const currentAmount = Number(receivable.amount);
    const newAmount = Math.max(0, currentAmount - paidAmount);
    const isFullyPaid = newAmount <= 0;

    // 1. Create transaction (Income)
    const { data: transaction, error: txnErr } = await admin
      .from("transactions")
      .insert({
        workspace_id: context.workspace.id,
        amount: paidAmount,
        concept: isFullyPaid ? `Pago de ${receivable.title}` : `Abono a ${receivable.title}`,
        account_id: payload.accountId,
        category: "Prestamo",
        unit: "general",
        date: new Date().toISOString(),
        kind: "transfer_in",
        status: "confirmed",
        posted_at: new Date().toISOString(),
        source_type: "receivable",
        metadata: {
          receivable_id: id,
          debtor_name: receivable.debtor_name,
        }
      })
      .select("id")
      .single();

    if (txnErr) throw new Error("Error creando movimiento de ingreso: " + txnErr.message);

    // 2. Update account balance
    const nextBalance = Number(account.balance) + paidAmount;
    const { error: accUpdateErr } = await admin
      .from("accounts")
      .update({ balance: nextBalance, updated_at: new Date().toISOString() })
      .eq("id", payload.accountId);
    
    if (accUpdateErr) throw new Error("Error actualizando saldo de la cuenta: " + accUpdateErr.message);

    // 3. Update receivable
    const { error: recUpdateErr } = await admin
      .from("receivables")
      .update({ 
        amount: newAmount, 
        status: isFullyPaid ? "recovered" : "pending",
        updated_at: new Date().toISOString()
      })
      .eq("id", id);
    
    if (recUpdateErr) throw new Error("Error actualizando estado del préstamo: " + recUpdateErr.message);
  }

  revalidatePath("/app");
  return { ok: true };
}

export async function updateExpenseTemplate(input: {
  id: string;
  name: string;
  amount: number;
}) {
  const context = await requireWorkspaceContext();
  const admin = await createSupabaseServerComponentClient();
  if (!admin) throw new Error("Supabase client no disponible.");

  const { error: templateErr } = await admin
    .from("expense_templates")
    .update({ 
      name: input.name.trim(), 
      default_amount: input.amount,
      updated_at: new Date().toISOString() 
    })
    .eq("id", input.id)
    .eq("workspace_id", context.workspace.id);

  if (templateErr) throw new Error(templateErr.message);

  const { error: eventsErr } = await admin
    .from("scheduled_events")
    .update({ 
      title: input.name.trim(),
      amount: input.amount 
    })
    .eq("template_id", input.id)
    .eq("status", "scheduled")
    .eq("workspace_id", context.workspace.id);

  if (eventsErr) throw new Error(eventsErr.message);

  revalidatePath("/app");
  return { ok: true };
}

export async function updateIncomeTemplate(input: {
  id: string;
  name: string;
  amount: number;
}) {
  const context = await requireWorkspaceContext();
  const admin = await createSupabaseServerComponentClient();
  if (!admin) throw new Error("Supabase client no disponible.");

  const { error: templateErr } = await admin
    .from("income_templates")
    .update({ 
      name: input.name.trim(), 
      default_amount: input.amount,
      updated_at: new Date().toISOString() 
    })
    .eq("id", input.id)
    .eq("workspace_id", context.workspace.id);

  if (templateErr) throw new Error(templateErr.message);

  const { error: eventsErr } = await admin
    .from("scheduled_events")
    .update({ 
      title: input.name.trim(),
      amount: input.amount 
    })
    .eq("template_id", input.id)
    .eq("status", "scheduled")
    .eq("workspace_id", context.workspace.id);

  if (eventsErr) throw new Error(eventsErr.message);

  revalidatePath("/app");
  return { ok: true };
}

export async function createPayableLoan(input: {
  lenderName: string;
  title?: string | null;
  amount: number;
  dueDate?: string | null;
  accountId: string;
  notes?: string | null;
  skipIncomeMovement?: boolean;
}) {
  const context = await requireWorkspaceContext();
  const admin = await createSupabaseServerComponentClient();

  if (!admin) throw new Error("Supabase client no disponible.");

  const lenderName = input.lenderName.trim();
  const requestedTitle = input.title?.trim() || "";
  const amount = Number(input.amount ?? 0);
  const dueDate = input.dueDate?.trim() || null;
  const accountId = input.accountId.trim();
  const notes = input.notes?.trim() || null;
  const skipIncome = !!input.skipIncomeMovement;

  if (!lenderName) throw new Error("Debes indicar quien te prestó el dinero.");
  if (!Number.isFinite(amount) || amount <= 0) throw new Error("El monto debe ser mayor a cero.");
  if (!accountId) throw new Error("Debes elegir una cuenta.");
  if (!dueDate) throw new Error("Debes definir la fecha en la que pagarás.");

  const { data: account, error: accountError } = await admin
    .from("accounts")
    .select("id, name, balance")
    .eq("id", accountId)
    .eq("workspace_id", context.workspace.id)
    .maybeSingle();

  if (accountError || !account) {
    throw new Error(`No se pudo leer la cuenta: ${accountError?.message ?? "sin respuesta"}`);
  }

  const title = requestedTitle || `Préstamo de ${lenderName}`;
  
  if (!skipIncome) {
    const currentBalance = typeof account.balance === "number" ? account.balance : Number(account.balance ?? 0);
    const nextBalance = currentBalance + amount;

    // 1. Crear transaccion de ingreso HOY
    const transactionDate = todayDateInBogota();
    const { error: transactionError } = await admin
      .from("transactions")
      .insert({
        workspace_id: context.workspace.id,
        kind: "income",
        status: "confirmed",
        amount,
        concept: title,
        account_id: accountId,
        category: "ingreso",
        unit: "general",
        date: `${transactionDate}T00:00:00-05:00`,
        posted_at: new Date().toISOString(),
        source_type: "manual",
        metadata: {
          lender_name: lenderName,
          account_name: account.name,
          loan_type: "payable_loan"
        },
      });

    if (transactionError) {
      throw new Error(`No se pudo registrar la entrada del prestamo: ${transactionError.message}`);
    }

    // 3. Actualizar cuenta (movido antes del evento programado para agrupar lógica de ingreso)
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
  }

  // 2. Crear Scheduled Event de Gasto futuro para pagar el prestamo
  const { error: eventError } = await admin
    .from("scheduled_events")
    .insert({
      workspace_id: context.workspace.id,
      title: `Pagar ${title}`,
      amount,
      due_date: dueDate,
      status: "scheduled",
      kind: "expense",
      account_id: accountId,
      notes: notes || null
    });

  if (eventError) {
    throw new Error(`Fallo al agendar el pago futuro: ${eventError.message}`);
  }

  revalidatePath("/app");
  return { ok: true };
}
export async function updateLoanDetails(input: { id: string; type: 'receivable' | 'payable'; concept: string; notes?: string }) {
  const context = await requireWorkspaceContext();
  const admin = await createSupabaseServerComponentClient();

  if (!admin) throw new Error("Supabase client no disponible.");

  if (input.type === 'receivable') {
    const { error } = await admin
      .from("receivables")
      .update({
        title: input.concept,
        notes: input.notes || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", input.id)
      .eq("workspace_id", context.workspace.id);

    if (error) throw new Error(`No se pudo actualizar el préstamo: ${error.message}`);
  } else {
    const { error } = await admin
      .from("scheduled_events")
      .update({
        title: input.concept,
        notes: input.notes || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", input.id)
      .eq("workspace_id", context.workspace.id);

    if (error) throw new Error(`No se pudo actualizar el préstamo: ${error.message}`);
  }

  revalidatePath("/app");
  return { ok: true };
}

export async function archiveLoan(input: { id: string; type: 'receivable' | 'payable' }) {
  const context = await requireWorkspaceContext();
  const admin = await createSupabaseServerComponentClient();

  if (!admin) throw new Error("Supabase client no disponible.");

  if (input.type === 'receivable') {
    const { error } = await admin
      .from("receivables")
      .update({
        status: "archived",
        updated_at: new Date().toISOString(),
      })
      .eq("id", input.id)
      .eq("workspace_id", context.workspace.id);

    if (error) throw new Error(`No se pudo archivar el préstamo: ${error.message}`);
  } else {
    const { error } = await admin
      .from("scheduled_events")
      .update({
        status: "cancelled",
        cancelled_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", input.id)
      .eq("workspace_id", context.workspace.id);

    if (error) throw new Error(`No se pudo archivar el préstamo: ${error.message}`);
  }

  revalidatePath("/app");
  return { ok: true };
}

export async function fetchPaginatedHistoryPage(input: {
  limit?: number;
  offset?: number;
  startDate?: string;
  endDate?: string;
}) {
  const context = await requireWorkspaceContext();
  const supabase = await createSupabaseServerComponentClient();
  if (!supabase) throw new Error("Supabase client no disponible.");

  const limit = Math.min(Math.max(1, input.limit ?? 50), 200);
  const offset = Math.max(0, input.offset ?? 0);

  let query = supabase
    .from("transactions")
    .select("id, concept, amount, date, category, unit, kind, status, source_type, account_id, created_at, accounts(name)", { count: "exact" })
    .eq("workspace_id", context.workspace.id)
    .neq("status", "cancelled");

  if (input.startDate) {
    query = query.gte("date", input.startDate);
  }
  if (input.endDate) {
    query = query.lte("date", input.endDate);
  }

  const { data, error, count } = await query
    .order("date", { ascending: false })
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) throw new Error(error.message);

  const items = (data ?? []).map((row: Record<string, unknown>) => {
    const amount = typeof row.amount === "number" ? row.amount : Number(row.amount) || 0;
    const rawAccounts = row.accounts as { name?: string | null } | Array<{ name?: string | null }> | null;
    const accountName = Array.isArray(rawAccounts) ? rawAccounts[0]?.name ?? null : rawAccounts?.name ?? null;
    const category = String(row.category ?? "").trim() || "general";
    const unit = String(row.unit ?? "").trim() || "general";
    const kind = String(row.kind ?? "");

    const formattedCurrency = new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(amount).replace(/\s?COP$/, "").trim();

    return {
      id: String(row.id),
      concept: String(row.concept ?? "").trim() || "Movimiento",
      amount,
      amountLabel: formattedCurrency,
      signedAmountLabel: `${(kind === "income" || kind === "transfer_in") ? "+" : "-"}${formattedCurrency}`,
      dateLabel: new Intl.DateTimeFormat("es-CO", { timeZone: "America/Bogota", day: "2-digit", month: "short", year: "numeric" }).format(new Date(String(row.date))),
      dateInputValue: String(row.date).slice(0, 10),
      category,
      unit,
      kind,
      method: accountName ? `Cuenta · ${accountName}` : "Sin cuenta",
      tags: [category && `#${category.toLowerCase()}`, unit && `#${unit.toLowerCase()}`].filter(Boolean).slice(0, 3) as string[],
      accountId: row.account_id ? String(row.account_id) : null,
      accountName,
      status: String(row.status),
      sourceType: row.source_type ? String(row.source_type) : null,
      editable: true,
    };
  });

  return {
    items,
    totalCount: count ?? items.length,
    hasMore: (offset + items.length) < (count ?? items.length),
  };
}
