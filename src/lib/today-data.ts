import type { WorkspaceContext } from "@/src/lib/auth-types";
import { createSupabaseServerComponentClient } from "@/src/lib/supabase";

export type TodayBudget = {
  limit: number | null;
  consumed: number | null;
  utilization: number | null;
  hasBudget: boolean;
};

export type TodayMetricKey = "onTime" | "advanced" | "late";

export type TodayCriticalPayment = {
  id: string;
  title: string;
  amount: number;
  dueDate: string;
  dueLabel: string;
  status: "overdue" | "today" | "upcoming";
  kind: string;
  notes: string | null;
  accountId: string | null;
  suggestedAccountId: string | null;
  confirmed: boolean;
};

export type TodayReceivable = {
  id: string;
  title: string;
  debtorName: string;
  amount: number;
  dueDate: string | null;
  dueLabel: string;
  status: "pending" | "recovered" | "overdue";
  notes: string | null;
};

export type TodayNextIncome = {
  id: string;
  title: string;
  amount: number;
  dueDate: string;
  dueLabel: string;
};

export type TodayViewModel = {
  greeting: {
    firstName: string;
    dateLabel: string;
  };
  budget: TodayBudget;
  metrics: Record<TodayMetricKey, number>;
  cash: {
    safeToSpend: number;
    rawSafeToSpend: number;
    shortfallAgainstProtected: number;
    totalBalance: number;
    pendingCritical: number;
    protectedSavings: number;
  };
  criticalPayments: TodayCriticalPayment[];
  receivables: TodayReceivable[];
  nextIncome: TodayNextIncome | null;
  accountOptions: Array<{
    id: string;
    label: string;
  }>;
};

type ScheduledEventRow = {
  id: string;
  due_date: string;
  title: string;
  amount: number | string;
  kind: string;
  status: string;
  business_unit_key: string | null;
  account_id: string | null;
  suggested_account_id?: string | null;
  linked_entity_type: string | null;
  linked_entity_id: string | null;
  notes: string | null;
  template_id?: string | null;
  timing_status?: string | null;
  confirmed_transaction_id?: string | null;
};

function numberValue(value: unknown) {
  if (typeof value === "number") return value;
  if (typeof value === "string") return Number(value) || 0;
  return 0;
}

function startOfTodayInBogota() {
  const now = new Date();
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Bogota",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
  return new Date(`${parts}T00:00:00-05:00`);
}

function monthBoundsInBogota() {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Bogota",
    year: "numeric",
    month: "2-digit",
  });
  const [yearStr, monthStr] = formatter.format(new Date()).split("-");
  const year = Number(yearStr);
  const month = Number(monthStr);
  const start = `${yearStr}-${monthStr}-01`;
  const nextMonth = month === 12 ? `${year + 1}-01-01` : `${yearStr}-${String(month + 1).padStart(2, "0")}-01`;
  return { start, nextMonth };
}

function humanDateLabel(date: Date) {
  const formatted = new Intl.DateTimeFormat("es-CO", {
    timeZone: "America/Bogota",
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(date);
  return formatted.charAt(0).toUpperCase() + formatted.slice(1);
}

function dueLabelFromDate(rawDate: string) {
  const today = startOfTodayInBogota();
  const due = new Date(`${rawDate}T00:00:00-05:00`);
  const diffDays = Math.round((due.getTime() - today.getTime()) / 86400000);

  if (diffDays < 0) {
    return diffDays === -1 ? "Venció ayer" : `Venció hace ${Math.abs(diffDays)} días`;
  }

  if (diffDays === 0) {
    return "Vence hoy";
  }

  if (diffDays === 1) {
    return "Vence mañana";
  }

  return `Vence en ${diffDays} días`;
}

function nextIncomeLabel(rawDate: string) {
  const today = startOfTodayInBogota();
  const due = new Date(`${rawDate}T00:00:00-05:00`);
  const diffDays = Math.round((due.getTime() - today.getTime()) / 86400000);

  if (diffDays <= 0) return "Hoy";
  if (diffDays === 1) return "Mañana";
  return `En ${diffDays} días`;
}

function firstName(fullName?: string) {
  if (!fullName) return "Hola";
  return fullName.trim().split(/\s+/)[0] || "Hola";
}

function statusForCritical(event: ScheduledEventRow): "overdue" | "today" | "upcoming" {
  const today = startOfTodayInBogota();
  const due = new Date(`${event.due_date}T00:00:00-05:00`);

  if (event.status === "overdue" || due.getTime() < today.getTime()) return "overdue";
  if (due.getTime() === today.getTime()) return "today";
  return "upcoming";
}

function isConfirmedStatus(status: string | null | undefined) {
  return status === "confirmed" || status === "confirmado";
}

function timingBucket(value: string | null | undefined): TodayMetricKey | null {
  if (!value) return null;
  if (value === "on_time" || value === "a_tiempo") return "onTime";
  if (value === "early" || value === "anticipado") return "advanced";
  if (value === "late" || value === "atrasado") return "late";
  return null;
}

export async function loadTodayViewModel(context: WorkspaceContext): Promise<TodayViewModel> {
  const supabase = await createSupabaseServerComponentClient();

  if (!supabase) {
    throw new Error("Supabase no está configurado.");
  }

  const workspaceId = context.workspace.id;
  const today = startOfTodayInBogota();
  const monthBounds = monthBoundsInBogota();

  const [accountsResult, savingsResult, scheduledResult, transactionsResult, budgetsResult, receivablesResult] = await Promise.all([
    supabase.from("accounts").select("id, name, type, balance, active").eq("workspace_id", workspaceId).eq("active", true),
    supabase.from("savings_goals").select("id, current").eq("workspace_id", workspaceId).eq("archived", false),
    supabase
      .from("scheduled_events")
      .select("id, due_date, title, amount, kind, status, business_unit_key, account_id, suggested_account_id, linked_entity_type, linked_entity_id, notes, template_id, timing_status, confirmed_transaction_id")
      .eq("workspace_id", workspaceId)
      .order("due_date", { ascending: true }),
    supabase
      .from("transactions")
      .select("id, kind, amount, date")
      .eq("workspace_id", workspaceId)
      .gte("date", `${monthBounds.start}T00:00:00-05:00`)
      .lt("date", `${monthBounds.nextMonth}T00:00:00-05:00`),
    supabase
      .from("monthly_budgets")
      .select("limit_amount, month")
      .eq("workspace_id", workspaceId)
      .gte("month", monthBounds.start)
      .lt("month", monthBounds.nextMonth)
      .limit(1)
      .maybeSingle(),
    supabase.from("receivables").select("id, title, debtor_name, amount, due_date, status, notes").eq("workspace_id", workspaceId).order("due_date", { ascending: true }),
  ]);

  if (accountsResult.error) throw new Error(`No se pudieron leer las cuentas: ${accountsResult.error.message}`);
  if (savingsResult.error) throw new Error(`No se pudo leer el ahorro: ${savingsResult.error.message}`);
  if (scheduledResult.error) throw new Error(`No se pudo leer la agenda: ${scheduledResult.error.message}`);
  if (transactionsResult.error) throw new Error(`No se pudieron leer los movimientos: ${transactionsResult.error.message}`);
  if (budgetsResult.error && budgetsResult.error.code !== "PGRST205") {
    throw new Error(`No se pudo leer el presupuesto mensual: ${budgetsResult.error.message}`);
  }
  if (receivablesResult.error && receivablesResult.error.code !== "PGRST205") {
    throw new Error(`No se pudieron leer las cuentas por cobrar: ${receivablesResult.error.message}`);
  }

  const totalAvailableBalance = (accountsResult.data ?? []).reduce((sum, row) => sum + numberValue(row.balance), 0);
  const protectedSavings = (savingsResult.data ?? []).reduce((sum, row) => sum + numberValue(row.current), 0);

  const scheduledEvents = ((scheduledResult.data ?? []) as ScheduledEventRow[]).filter((row) => !isConfirmedStatus(row.status));
  const criticalPayments = scheduledEvents
    .filter((row) => row.kind !== "income")
    .filter((row) => {
      const due = new Date(`${row.due_date}T00:00:00-05:00`);
      const diffDays = Math.round((due.getTime() - today.getTime()) / 86400000);
      return diffDays <= 7;
    })
    .map<TodayCriticalPayment>((row) => ({
      id: row.id,
      title: row.title,
      amount: numberValue(row.amount),
      dueDate: row.due_date,
      dueLabel: dueLabelFromDate(row.due_date),
      status: statusForCritical(row),
      kind: row.kind,
      notes: row.notes,
      accountId: row.account_id,
      suggestedAccountId: row.suggested_account_id ?? null,
      confirmed: false,
    }));

  const pendingCritical = criticalPayments.reduce((sum, row) => sum + row.amount, 0);
  
  // Available balance has already had the savings deducted in database.
  // So the total physical balance is Available + Savings.
  const totalBalance = totalAvailableBalance + protectedSavings;
  const rawSafeToSpend = totalAvailableBalance - pendingCritical;
  const safeToSpend = Math.max(0, rawSafeToSpend);
  const shortfallAgainstProtected = rawSafeToSpend < 0 ? Math.abs(rawSafeToSpend) : 0;

  const metricsBase: Record<TodayMetricKey, number> = { onTime: 0, advanced: 0, late: 0 };
  for (const row of (scheduledResult.data ?? []) as ScheduledEventRow[]) {
    if (isConfirmedStatus(row.status)) {
      const bucket = timingBucket(row.timing_status);
      if (bucket) metricsBase[bucket] += 1;
      continue;
    }

    const due = new Date(`${row.due_date}T00:00:00-05:00`);
    if (due.getTime() < today.getTime()) {
      metricsBase.late += 1;
    }
  }

  const outgoingKinds = new Set(["expense", "debt_payment", "card_payment"]);
  const consumed = (transactionsResult.data ?? []).reduce((sum, row) => {
    return outgoingKinds.has(String(row.kind)) ? sum + numberValue(row.amount) : sum;
  }, 0);

  const budgetLimit =
    budgetsResult.data == null
      ? null
      : numberValue((budgetsResult.data as { limit_amount?: number | string | null }).limit_amount ?? 0);
  const budget: TodayBudget = {
    limit: budgetLimit && budgetLimit > 0 ? budgetLimit : null,
    consumed: budgetLimit && budgetLimit > 0 ? consumed : null,
    utilization: budgetLimit && budgetLimit > 0 ? Math.min(100, (consumed / budgetLimit) * 100) : null,
    hasBudget: Boolean(budgetLimit && budgetLimit > 0),
  };

  const nextIncomeRow = ((scheduledResult.data ?? []) as ScheduledEventRow[])
    .filter((row) => row.kind === "income")
    .filter((row) => !isConfirmedStatus(row.status))
    .find((row) => new Date(`${row.due_date}T00:00:00-05:00`).getTime() >= today.getTime());

  const nextIncome: TodayNextIncome | null = nextIncomeRow
    ? {
        id: nextIncomeRow.id,
        title: nextIncomeRow.title,
        amount: numberValue(nextIncomeRow.amount),
        dueDate: nextIncomeRow.due_date,
        dueLabel: nextIncomeLabel(nextIncomeRow.due_date),
      }
    : null;

  console.log('Receivables result:', receivablesResult); const receivables = ((receivablesResult.data ?? []) as Array<{
    id: string;
    title: string;
    debtor_name: string;
    amount: number | string;
    due_date: string | null;
    status: string | null;
    notes: string | null;
  }>).map<TodayReceivable>((row) => ({
    id: row.id,
    title: row.title,
    debtorName: row.debtor_name,
    amount: numberValue(row.amount),
    dueDate: row.due_date,
    dueLabel: row.due_date ? `Cobra el ${new Intl.DateTimeFormat("es-CO", { day: "numeric", month: "short", timeZone: "America/Bogota" }).format(new Date(`${row.due_date}T00:00:00-05:00`))}` : "Sin fecha",
    status: row.status === "recovered" ? "recovered" : row.status === "overdue" ? "overdue" : "pending",
    notes: row.notes,
  }));

  return {
    greeting: {
      firstName: firstName(context.profile.fullName),
      dateLabel: humanDateLabel(today),
    },
    budget,
    metrics: metricsBase,
    cash: {
      safeToSpend,
      rawSafeToSpend,
      shortfallAgainstProtected,
      totalBalance,
      pendingCritical,
      protectedSavings,
    },
    criticalPayments,
    receivables,
    nextIncome,
    accountOptions: (accountsResult.data ?? []).map((row) => ({
      id: String(row.id),
      label: `${String(row.name)} · cuenta`,
    })),
  };
}
