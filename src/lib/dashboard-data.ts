import "server-only";

import { createSupabaseServerComponentClient, getSupabaseAdminClient } from "@/lib/supabase";
import type {
  Account,
  AccountType,
  BusinessSummary,
  BusinessUnitKey,
  CreditCard,
  ExpenseTemplate,
  Debt,
  FinancialEvent,
  IncomeTemplate,
  IncomeSource,
  MonthlyProjection,
  SavingsGoal,
  ScheduledEvent,
  ScheduledEventKind,
  ScheduledEventStatus,
  TimingStatus,
  Transaction,
} from "@/lib/types";
import { ensureScheduledEventsForWorkspace } from "@/lib/template-generation";

export type DashboardData = {
  source: "supabase" | "legacy" | "empty" | "error";
  issue?: string;
  accounts: Account[];
  business: BusinessSummary[];
  cards: CreditCard[];
  debts: Debt[];
  events: FinancialEvent[];
  expenseTemplates: ExpenseTemplate[];
  incomeTemplates: IncomeTemplate[];
  incomeSources: IncomeSource[];
  scheduledEvents: ScheduledEvent[];
  goals: SavingsGoal[];
  projections: MonthlyProjection[];
  transactions: Transaction[];
};

const emptyDashboardData: Omit<DashboardData, "source" | "issue"> = {
  accounts: [],
  business: [],
  cards: [],
  debts: [],
  events: [],
  expenseTemplates: [],
  incomeTemplates: [],
  incomeSources: [],
  scheduledEvents: [],
  goals: [],
  projections: [],
  transactions: [],
};

type SupabaseAccountRow = {
  id: string;
  workspace_id?: string | null;
  name: string;
  type: string;
  balance: number | string;
  color?: string | null;
  active: boolean | null;
};

type SupabaseBusinessRow = {
  id?: string;
  workspace_id?: string | null;
  key: string;
  name: string;
  income: number | string;
  expense: number | string;
  pending: number | string;
};

type SupabaseIncomeSourceRow = {
  id: string;
  workspace_id?: string | null;
  name: string;
  business_unit_key: string;
  type?: string | null;
  active?: boolean | null;
};

type SupabaseCardRow = {
  id: string;
  workspace_id?: string | null;
  name: string;
  issuer: string;
  limit_value: number | string;
  used: number | string;
  cut_off_date: number;
  pay_due_date: number;
  minimum_payment: number | string;
  annual_interest_rate?: number | string | null;
  interest_type?: string | null;
  estimated_payoff_months?: number | null;
  estimated_total_payment?: number | string | null;
  payment_strategy?: string | null;
  notes?: string | null;
  status: CreditCard["status"];
};

type SupabaseDebtRow = {
  id: string;
  workspace_id?: string | null;
  name: string;
  lender: string;
  debt_type?: string | null;
  principal_amount?: number | string | null;
  balance: number | string;
  installment: number | string;
  next_due_date: string;
  annual_interest_rate?: number | string | null;
  interest_type?: string | null;
  term_months?: number | null;
  remaining_months?: number | null;
  paid_installments?: number | null;
  estimated_total_payment?: number | string | null;
  status: Debt["status"];
  priority: Debt["priority"];
  notes?: string | null;
};

type SupabaseGoalRow = {
  id: string;
  workspace_id?: string | null;
  name: string;
  target: number | string;
  current: number | string;
  color?: string | null;
  due_date?: string | null;
};

type SupabaseTransactionRow = {
  id: string;
  workspace_id?: string | null;
  kind: Transaction["kind"];
  status: Transaction["status"];
  amount: number | string;
  concept: string;
  account_id: string;
  category: string;
  unit: Transaction["unit"];
  due_date?: string | null;
  date: string;
  posted_at?: string | null;
  source_type?: string | null;
  source_id?: string | null;
};

type SupabaseIncomeTemplateRow = {
  id: string;
  workspace_id?: string | null;
  name: string;
  kind: "income";
  status: string;
  recurrence_mode: string;
  frequency: string;
  days_of_month?: number[] | null;
  start_date: string;
  end_date?: string | null;
  occurrence_limit?: number | null;
  default_amount: number | string;
  default_account_id: string;
  business_unit_key: string;
  income_source_id: string;
  notes?: string | null;
};

type SupabaseExpenseTemplateRow = {
  id: string;
  workspace_id?: string | null;
  name: string;
  kind: string;
  status: string;
  recurrence_mode: string;
  frequency: string;
  days_of_month?: number[] | null;
  start_date: string;
  end_date?: string | null;
  occurrence_limit?: number | null;
  default_amount: number | string;
  default_account_id?: string | null;
  business_unit_key: string;
  notes?: string | null;
};

type SupabaseProjectionRow = {
  id: string;
  workspace_id?: string | null;
  month: string;
  opening_balance: number | string;
  expected_income: number | string;
  expected_expenses: number | string;
  debt_payments: number | string;
  card_payments: number | string;
  planned_savings: number | string;
  closing_balance: number | string;
  scenario: string;
  notes?: string | null;
};

type SupabaseEventRow = {
  id: string;
  workspace_id?: string | null;
  event_date?: string;
  due_date?: string;
  title: string;
  amount: number | string;
  event_type?: string;
  kind?: string;
  status: string;
  template_id?: string | null;
  timing_status?: string | null;
  confirmed_transaction_id?: string | null;
  business_unit_key?: string | null;
  account_id?: string | null;
  related_table?: string | null;
  related_id?: string | null;
  linked_entity_type?: string | null;
  linked_entity_id?: string | null;
  notes?: string | null;
};

function toNumber(value: unknown) {
  return typeof value === "number" ? value : Number(value ?? 0);
}

function isMissingRelationMessage(message?: string) {
  const normalized = (message ?? "").toLowerCase();
  return (
    normalized.includes("does not exist") ||
    normalized.includes("relation") ||
    normalized.includes("column") ||
    normalized.includes("schema cache") ||
    normalized.includes("could not find the table")
  );
}

function toAccountType(value: string): AccountType {
  if (value === "cash" || value === "bank" || value === "wallet" || value === "savings" || value === "other") {
    return value;
  }

  return "other";
}

function toBusinessUnitKey(value: string): BusinessUnitKey {
  return value?.trim() || "general";
}

function toScheduledEventKind(value: string): ScheduledEventKind {
  if (
    value === "income" ||
    value === "expense" ||
    value === "debt_payment" ||
    value === "card_payment" ||
    value === "saving" ||
    value === "transfer"
  ) {
    return value;
  }

  return "expense";
}

function toScheduledEventStatus(value: string): ScheduledEventStatus {
  if (value === "scheduled" || value === "overdue" || value === "confirmed" || value === "cancelled") {
    return value;
  }

  if (value === "paid") {
    return "confirmed";
  }

  if (value === "pending") {
    return "scheduled";
  }

  return "scheduled";
}

function toTimingStatus(value?: string | null): TimingStatus | undefined {
  if (value === "early" || value === "on_time" || value === "late") {
    return value;
  }

  return undefined;
}

function mapAccount(row: SupabaseAccountRow, workspaceId: string): Account {
  return {
    id: row.id,
    workspaceId: row.workspace_id ?? workspaceId,
    name: row.name,
    type: toAccountType(row.type),
    balance: toNumber(row.balance),
    color: row.color ?? "accent",
    active: Boolean(row.active),
  };
}

function mapBusiness(row: SupabaseBusinessRow, workspaceId: string): BusinessSummary {
  return {
    id: toBusinessUnitKey(row.key),
    workspaceId: row.workspace_id ?? workspaceId,
    name: row.name,
    income: toNumber(row.income),
    expense: toNumber(row.expense),
    pending: toNumber(row.pending),
  };
}

function mapIncomeSource(row: SupabaseIncomeSourceRow, workspaceId: string): IncomeSource {
  return {
    id: row.id,
    workspaceId: row.workspace_id ?? workspaceId,
    name: row.name,
    businessUnitKey: toBusinessUnitKey(row.business_unit_key),
    type: row.type ?? "manual",
    active: row.active ?? true,
  };
}

function mapIncomeTemplate(row: SupabaseIncomeTemplateRow, workspaceId: string): IncomeTemplate {
  return {
    id: row.id,
    workspaceId: row.workspace_id ?? workspaceId,
    name: row.name,
    kind: "income",
    status: row.status as IncomeTemplate["status"],
    recurrenceMode: row.recurrence_mode as IncomeTemplate["recurrenceMode"],
    frequency: row.frequency as IncomeTemplate["frequency"],
    daysOfMonth: row.days_of_month ?? [],
    startDate: row.start_date,
    endDate: row.end_date ?? undefined,
    occurrenceLimit: row.occurrence_limit ?? undefined,
    defaultAmount: toNumber(row.default_amount),
    defaultAccountId: row.default_account_id,
    businessUnitKey: toBusinessUnitKey(row.business_unit_key),
    incomeSourceId: row.income_source_id,
    notes: row.notes ?? undefined,
  };
}

function mapExpenseTemplate(row: SupabaseExpenseTemplateRow, workspaceId: string): ExpenseTemplate {
  return {
    id: row.id,
    workspaceId: row.workspace_id ?? workspaceId,
    name: row.name,
    kind: row.kind as ExpenseTemplate["kind"],
    status: row.status as ExpenseTemplate["status"],
    recurrenceMode: row.recurrence_mode as ExpenseTemplate["recurrenceMode"],
    frequency: row.frequency as ExpenseTemplate["frequency"],
    daysOfMonth: row.days_of_month ?? [],
    startDate: row.start_date,
    endDate: row.end_date ?? undefined,
    occurrenceLimit: row.occurrence_limit ?? undefined,
    defaultAmount: toNumber(row.default_amount),
    defaultAccountId: row.default_account_id ?? undefined,
    businessUnitKey: toBusinessUnitKey(row.business_unit_key),
    notes: row.notes ?? undefined,
  };
}

function mapCard(row: SupabaseCardRow, workspaceId: string): CreditCard {
  return {
    id: row.id,
    workspaceId: row.workspace_id ?? workspaceId,
    name: row.name,
    issuer: row.issuer,
    limit: toNumber(row.limit_value),
    used: toNumber(row.used),
    cutOffDate: row.cut_off_date,
    payDueDate: row.pay_due_date,
    minimumPayment: toNumber(row.minimum_payment),
    annualInterestRate: row.annual_interest_rate == null ? undefined : toNumber(row.annual_interest_rate),
    interestType: row.interest_type ?? undefined,
    estimatedPayoffMonths: row.estimated_payoff_months ?? undefined,
    estimatedTotalPayment: row.estimated_total_payment == null ? undefined : toNumber(row.estimated_total_payment),
    paymentStrategy: row.payment_strategy ?? undefined,
    notes: row.notes ?? undefined,
    status: row.status,
  };
}

function mapDebt(row: SupabaseDebtRow, workspaceId: string): Debt {
  return {
    id: row.id,
    workspaceId: row.workspace_id ?? workspaceId,
    name: row.name,
    lender: row.lender,
    debtType: row.debt_type ?? "personal",
    principalAmount: row.principal_amount == null ? undefined : toNumber(row.principal_amount),
    balance: toNumber(row.balance),
    installment: toNumber(row.installment),
    nextDueDate: row.next_due_date,
    annualInterestRate: row.annual_interest_rate == null ? undefined : toNumber(row.annual_interest_rate),
    interestType: row.interest_type ?? undefined,
    termMonths: row.term_months ?? undefined,
    remainingMonths: row.remaining_months ?? undefined,
    paidInstallments: row.paid_installments ?? undefined,
    estimatedTotalPayment: row.estimated_total_payment == null ? undefined : toNumber(row.estimated_total_payment),
    status: row.status,
    priority: row.priority,
    notes: row.notes ?? undefined,
  };
}

function mapGoal(row: SupabaseGoalRow, workspaceId: string): SavingsGoal {
  return {
    id: row.id,
    workspaceId: row.workspace_id ?? workspaceId,
    name: row.name,
    target: toNumber(row.target),
    current: toNumber(row.current),
    color: row.color ?? "success",
    dueDate: row.due_date ?? undefined,
  };
}

function mapTransaction(row: SupabaseTransactionRow, workspaceId: string): Transaction {
  return {
    id: row.id,
    workspaceId: row.workspace_id ?? workspaceId,
    kind: row.kind,
    status: row.status,
    amount: toNumber(row.amount),
    concept: row.concept,
    accountId: row.account_id,
    category: row.category,
    unit: toBusinessUnitKey(row.unit),
    dueDate: row.due_date ?? undefined,
    date: row.date,
    postedAt: row.posted_at ?? undefined,
    sourceType: row.source_type ?? undefined,
    sourceId: row.source_id ?? undefined,
  };
}

function mapProjection(row: SupabaseProjectionRow, workspaceId: string): MonthlyProjection {
  return {
    id: row.id,
    workspaceId: row.workspace_id ?? workspaceId,
    month: row.month,
    openingBalance: toNumber(row.opening_balance),
    expectedIncome: toNumber(row.expected_income),
    expectedExpenses: toNumber(row.expected_expenses),
    debtPayments: toNumber(row.debt_payments),
    cardPayments: toNumber(row.card_payments),
    plannedSavings: toNumber(row.planned_savings),
    closingBalance: toNumber(row.closing_balance),
    scenario: row.scenario,
    notes: row.notes ?? undefined,
  };
}

function mapScheduledEvent(row: SupabaseEventRow, workspaceId: string): ScheduledEvent {
  return {
    id: row.id,
    workspaceId: row.workspace_id ?? workspaceId,
    dueDate: row.due_date ?? row.event_date ?? "",
    title: row.title,
    amount: toNumber(row.amount),
    kind: toScheduledEventKind(row.kind ?? row.event_type ?? "expense"),
    status: toScheduledEventStatus(row.status),
    timingStatus: toTimingStatus(row.timing_status),
    accountId: row.account_id ?? undefined,
    templateId: row.template_id ?? undefined,
    confirmedTransactionId: row.confirmed_transaction_id ?? undefined,
    linkedEntityType: row.linked_entity_type ?? row.related_table ?? undefined,
    linkedEntityId: row.linked_entity_id ?? row.related_id ?? undefined,
    unit: row.business_unit_key ? toBusinessUnitKey(row.business_unit_key) : undefined,
    notes: row.notes ?? undefined,
  };
}

function mapLegacyEvent(row: SupabaseEventRow, workspaceId: string): FinancialEvent {
  const scheduled = mapScheduledEvent(row, workspaceId);

  return {
    id: scheduled.id,
    workspaceId: scheduled.workspaceId,
    eventDate: scheduled.dueDate,
    title: scheduled.title,
    amount: scheduled.amount,
    eventType: scheduled.kind,
    status: scheduled.status,
    accountId: scheduled.accountId,
    relatedTable: scheduled.linkedEntityType,
    relatedId: scheduled.linkedEntityId,
    unit: scheduled.unit,
    notes: scheduled.notes,
  };
}

async function loadTableRows(
  workspaceId?: string,
  allowLegacyFallback = false
): Promise<
  | {
      mode: "workspace" | "legacy";
      workspaceId: string;
        rows: {
          accounts: SupabaseAccountRow[];
          business: SupabaseBusinessRow[];
          expenseTemplates: SupabaseExpenseTemplateRow[];
          incomeTemplates: SupabaseIncomeTemplateRow[];
          incomeSources: SupabaseIncomeSourceRow[];
          cards: SupabaseCardRow[];
        debts: SupabaseDebtRow[];
        goals: SupabaseGoalRow[];
        projections: SupabaseProjectionRow[];
        transactions: SupabaseTransactionRow[];
        events: SupabaseEventRow[];
      };
    }
  | { mode: "error"; issue: string }
> {
  if (workspaceId) {
    const supabase = await createSupabaseServerComponentClient();

    if (!supabase) {
      return { mode: "error", issue: "Supabase no esta configurado." };
    }

    await ensureScheduledEventsForWorkspace(supabase, workspaceId);

    const [accountsResult, businessResult, incomeSourcesResult, incomeTemplatesResult, expenseTemplatesResult, cardsResult, debtsResult, goalsResult, projectionsResult, transactionsResult] =
      await Promise.all([
        supabase.from("accounts").select("*").eq("workspace_id", workspaceId).order("created_at", { ascending: true }),
        supabase.from("business_units").select("*").eq("workspace_id", workspaceId).order("created_at", { ascending: true }),
        supabase.from("income_sources").select("*").eq("workspace_id", workspaceId).eq("active", true).order("created_at", { ascending: true }),
        supabase.from("income_templates").select("*").eq("workspace_id", workspaceId).order("created_at", { ascending: true }),
        supabase.from("expense_templates").select("*").eq("workspace_id", workspaceId).order("created_at", { ascending: true }),
        supabase.from("credit_cards").select("*").eq("workspace_id", workspaceId).order("created_at", { ascending: true }),
        supabase.from("debts").select("*").eq("workspace_id", workspaceId).order("created_at", { ascending: true }),
        supabase.from("savings_goals").select("*").eq("workspace_id", workspaceId).order("created_at", { ascending: true }),
        supabase.from("monthly_projections").select("*").eq("workspace_id", workspaceId).order("month", { ascending: true }),
        supabase.from("transactions").select("*").eq("workspace_id", workspaceId).order("date", { ascending: false }),
      ]);

    let eventsResult = await supabase.from("scheduled_events").select("*").eq("workspace_id", workspaceId).order("due_date", { ascending: true });

    if (eventsResult.error) {
      const fallbackEvents = await supabase
        .from("financial_events")
        .select("*")
        .eq("workspace_id", workspaceId)
        .order("event_date", { ascending: true });
      eventsResult = fallbackEvents;
    }

    const incomeTemplatesError = incomeTemplatesResult.error && !isMissingRelationMessage(incomeTemplatesResult.error.message) ? incomeTemplatesResult.error : null;
    const expenseTemplatesError = expenseTemplatesResult.error && !isMissingRelationMessage(expenseTemplatesResult.error.message) ? expenseTemplatesResult.error : null;

    const workspaceIssue = [
      accountsResult.error,
      businessResult.error,
      incomeSourcesResult.error,
      incomeTemplatesError,
      expenseTemplatesError,
      cardsResult.error,
      debtsResult.error,
      goalsResult.error,
      projectionsResult.error,
      transactionsResult.error,
      eventsResult.error,
    ]
      .find(Boolean)
      ?.message;

    if (!workspaceIssue) {
      return {
        mode: "workspace",
        workspaceId,
        rows: {
          accounts: (accountsResult.data ?? []) as SupabaseAccountRow[],
          business: (businessResult.data ?? []) as SupabaseBusinessRow[],
          expenseTemplates: (expenseTemplatesError ? [] : expenseTemplatesResult.data ?? []) as SupabaseExpenseTemplateRow[],
          incomeTemplates: (incomeTemplatesError ? [] : incomeTemplatesResult.data ?? []) as SupabaseIncomeTemplateRow[],
          incomeSources: (incomeSourcesResult.data ?? []) as SupabaseIncomeSourceRow[],
          cards: (cardsResult.data ?? []) as SupabaseCardRow[],
          debts: (debtsResult.data ?? []) as SupabaseDebtRow[],
          goals: (goalsResult.data ?? []) as SupabaseGoalRow[],
          projections: (projectionsResult.data ?? []) as SupabaseProjectionRow[],
          transactions: (transactionsResult.data ?? []) as SupabaseTransactionRow[],
          events: (eventsResult.data ?? []) as SupabaseEventRow[],
        },
      };
    }
  }

  if (!allowLegacyFallback) {
    return { mode: "error", issue: "No se pudo leer el workspace actual." };
  }

  const admin = getSupabaseAdminClient();

  if (!admin) {
    return { mode: "error", issue: "Supabase admin client no disponible." };
  }

  const [accountsResult, businessResult, incomeSourcesResult, cardsResult, debtsResult, goalsResult, projectionsResult, transactionsResult, eventsResult] =
    await Promise.all([
      admin.from("accounts").select("*").order("created_at", { ascending: true }),
      admin.from("business_units").select("*").order("created_at", { ascending: true }),
      admin.from("income_sources").select("*").eq("active", true).order("created_at", { ascending: true }),
      admin.from("credit_cards").select("*").order("created_at", { ascending: true }),
      admin.from("debts").select("*").order("created_at", { ascending: true }),
      admin.from("savings_goals").select("*").order("created_at", { ascending: true }),
      admin.from("monthly_projections").select("*").order("month", { ascending: true }),
      admin.from("transactions").select("*").order("date", { ascending: false }),
      admin.from("financial_events").select("*").order("event_date", { ascending: true }),
    ]);

  const issue = [
    accountsResult.error,
    businessResult.error,
    incomeSourcesResult.error,
    cardsResult.error,
    debtsResult.error,
    goalsResult.error,
    projectionsResult.error,
    transactionsResult.error,
    eventsResult.error,
  ]
    .find(Boolean)
    ?.message;

  if (issue) {
    return { mode: "error", issue };
  }

  return {
    mode: "legacy",
    workspaceId: "legacy-shell",
    rows: {
      accounts: (accountsResult.data ?? []) as SupabaseAccountRow[],
      business: (businessResult.data ?? []) as SupabaseBusinessRow[],
      expenseTemplates: [],
      incomeTemplates: [],
      incomeSources: (incomeSourcesResult.data ?? []) as SupabaseIncomeSourceRow[],
      cards: (cardsResult.data ?? []) as SupabaseCardRow[],
      debts: (debtsResult.data ?? []) as SupabaseDebtRow[],
      goals: (goalsResult.data ?? []) as SupabaseGoalRow[],
      projections: (projectionsResult.data ?? []) as SupabaseProjectionRow[],
      transactions: (transactionsResult.data ?? []) as SupabaseTransactionRow[],
      events: (eventsResult.data ?? []) as SupabaseEventRow[],
    },
  };
}

export async function loadDashboardData(options?: { workspaceId?: string; allowLegacyFallback?: boolean }): Promise<DashboardData> {
  const tableRows = await loadTableRows(options?.workspaceId, options?.allowLegacyFallback ?? false);

  if (tableRows.mode === "error") {
    return {
      source: "error",
      issue: tableRows.issue,
      ...emptyDashboardData,
    };
  }

  const workspaceId = tableRows.workspaceId;
  const scheduledEvents = tableRows.rows.events.map((row) => mapScheduledEvent(row, workspaceId));

  return {
    source: tableRows.mode === "workspace" ? "supabase" : "legacy",
    accounts: tableRows.rows.accounts.map((row) => mapAccount(row, workspaceId)),
    business: tableRows.rows.business.map((row) => mapBusiness(row, workspaceId)),
    expenseTemplates: tableRows.rows.expenseTemplates.map((row) => mapExpenseTemplate(row, workspaceId)),
    incomeTemplates: tableRows.rows.incomeTemplates.map((row) => mapIncomeTemplate(row, workspaceId)),
    incomeSources: tableRows.rows.incomeSources.map((row) => mapIncomeSource(row, workspaceId)),
    cards: tableRows.rows.cards.map((row) => mapCard(row, workspaceId)),
    debts: tableRows.rows.debts.map((row) => mapDebt(row, workspaceId)),
    events: tableRows.rows.events.map((row) => mapLegacyEvent(row, workspaceId)),
    scheduledEvents,
    goals: tableRows.rows.goals.map((row) => mapGoal(row, workspaceId)),
    projections: tableRows.rows.projections.map((row) => mapProjection(row, workspaceId)),
    transactions: tableRows.rows.transactions.map((row) => mapTransaction(row, workspaceId)),
  };
}
