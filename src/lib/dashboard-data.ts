import "server-only";

import { accounts as mockAccounts, business as mockBusiness, cards as mockCards, debts as mockDebts, goals as mockGoals, transactions as mockTransactions } from "./mock-data";
import { getSupabaseServerClient } from "./supabase";
import type {
  Account,
  AccountType,
  BusinessSummary,
  BusinessUnitKey,
  CreditCard,
  Debt,
  FinancialEvent,
  FinancialEventType,
  MonthlyProjection,
  SavingsGoal,
  Transaction,
} from "./types";

type DashboardData = {
  source: "mock" | "supabase";
  accounts: Account[];
  business: BusinessSummary[];
  cards: CreditCard[];
  debts: Debt[];
  events: FinancialEvent[];
  goals: SavingsGoal[];
  projections: MonthlyProjection[];
  transactions: Transaction[];
};

type SupabaseAccountRow = {
  id: string;
  name: string;
  type: string;
  balance: number | string;
  color?: string | null;
  active: boolean | null;
};

type SupabaseBusinessRow = {
  id: string;
  key: string;
  name: string;
  income: number | string;
  expense: number | string;
  pending: number | string;
};

type SupabaseCardRow = {
  id: string;
  name: string;
  issuer: string;
  limit_value: number | string;
  used: number | string;
  cut_off_date: number;
  pay_due_date: number;
  minimum_payment: number | string;
  status: CreditCard["status"];
};

type SupabaseDebtRow = {
  id: string;
  name: string;
  lender: string;
  balance: number | string;
  installment: number | string;
  next_due_date: string;
  status: Debt["status"];
  priority: Debt["priority"];
};

type SupabaseGoalRow = {
  id: string;
  name: string;
  target: number | string;
  current: number | string;
  color?: string | null;
  due_date?: string | null;
};

type SupabaseTransactionRow = {
  id: string;
  kind: Transaction["kind"];
  status: Transaction["status"];
  amount: number | string;
  concept: string;
  account_id: string;
  category: string;
  unit: Transaction["unit"];
  due_date?: string | null;
  date: string;
};

type SupabaseProjectionRow = {
  id: string;
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
  event_date: string;
  title: string;
  amount: number | string;
  event_type: string;
  status: string;
  business_unit_key?: string | null;
  account_id?: string | null;
  related_table?: string | null;
  related_id?: string | null;
  notes?: string | null;
};

function toNumber(value: unknown) {
  return typeof value === "number" ? value : Number(value ?? 0);
}

function toAccountType(value: string): AccountType {
  if (value === "cash" || value === "bank" || value === "wallet" || value === "savings" || value === "other") {
    return value;
  }

  return "other";
}

function toBusinessUnitKey(value: string): BusinessUnitKey {
  if (
    value === "personal" ||
    value === "empresa" ||
    value === "deuxio" ||
    value === "el_recreo" ||
    value === "uxio" ||
    value === "sie" ||
    value === "aluna" ||
    value === "arca" ||
    value === "freelance"
  ) {
    return value;
  }

  return "personal";
}

function toFinancialEventType(value: string): FinancialEventType {
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

function mapAccount(row: SupabaseAccountRow): Account {
  return {
    id: row.id,
    name: row.name,
    type: toAccountType(row.type),
    balance: toNumber(row.balance),
    color: row.color ?? "#163a5f",
    active: Boolean(row.active),
  };
}

function mapBusiness(row: SupabaseBusinessRow): BusinessSummary {
  return {
    id: toBusinessUnitKey(row.key),
    name: row.name,
    income: toNumber(row.income),
    expense: toNumber(row.expense),
    pending: toNumber(row.pending),
  };
}

function mapCard(row: SupabaseCardRow): CreditCard {
  return {
    id: row.id,
    name: row.name,
    issuer: row.issuer,
    limit: toNumber(row.limit_value),
    used: toNumber(row.used),
    cutOffDate: row.cut_off_date,
    payDueDate: row.pay_due_date,
    minimumPayment: toNumber(row.minimum_payment),
    status: row.status,
  };
}

function mapDebt(row: SupabaseDebtRow): Debt {
  return {
    id: row.id,
    name: row.name,
    lender: row.lender,
    balance: toNumber(row.balance),
    installment: toNumber(row.installment),
    nextDueDate: row.next_due_date,
    status: row.status,
    priority: row.priority,
  };
}

function mapGoal(row: SupabaseGoalRow): SavingsGoal {
  return {
    id: row.id,
    name: row.name,
    target: toNumber(row.target),
    current: toNumber(row.current),
    color: row.color ?? "#16735b",
    dueDate: row.due_date ?? undefined,
  };
}

function mapTransaction(row: SupabaseTransactionRow): Transaction {
  return {
    id: row.id,
    kind: row.kind,
    status: row.status,
    amount: toNumber(row.amount),
    concept: row.concept,
    accountId: row.account_id,
    category: row.category,
    unit: toBusinessUnitKey(row.unit),
    dueDate: row.due_date ?? undefined,
    date: row.date,
  };
}

function mapProjection(row: SupabaseProjectionRow): MonthlyProjection {
  return {
    id: row.id,
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

function mapEvent(row: SupabaseEventRow): FinancialEvent {
  return {
    id: row.id,
    eventDate: row.event_date,
    title: row.title,
    amount: toNumber(row.amount),
    eventType: toFinancialEventType(row.event_type),
    status: row.status,
    accountId: row.account_id ?? undefined,
    relatedTable: row.related_table ?? undefined,
    relatedId: row.related_id ?? undefined,
    unit: row.business_unit_key ? toBusinessUnitKey(row.business_unit_key) : undefined,
    notes: row.notes ?? undefined,
  };
}

export async function loadDashboardData(): Promise<DashboardData> {
  const supabase = getSupabaseServerClient();

  if (!supabase) {
    return {
      source: "mock",
      accounts: mockAccounts,
      business: mockBusiness,
      cards: mockCards,
      debts: mockDebts,
      events: [],
      goals: mockGoals,
      projections: [],
      transactions: mockTransactions,
    };
  }

  try {
    const [
      accountsResult,
      businessResult,
      cardsResult,
      debtsResult,
      eventsResult,
      goalsResult,
      projectionsResult,
      transactionsResult,
    ] = await Promise.all([
      supabase.from("accounts").select("*").order("created_at", { ascending: true }),
      supabase.from("business_units").select("*").order("created_at", { ascending: true }),
      supabase.from("credit_cards").select("*").order("created_at", { ascending: true }),
      supabase.from("debts").select("*").order("created_at", { ascending: true }),
      supabase.from("financial_events").select("*").order("event_date", { ascending: true }),
      supabase.from("savings_goals").select("*").order("created_at", { ascending: true }),
      supabase.from("monthly_projections").select("*").order("month", { ascending: true }),
      supabase.from("transactions").select("*").order("date", { ascending: false }),
    ]);

    if (
      accountsResult.error ||
      businessResult.error ||
      cardsResult.error ||
      debtsResult.error ||
      eventsResult.error ||
      goalsResult.error ||
      projectionsResult.error ||
      transactionsResult.error
    ) {
      return {
        source: "mock",
        accounts: mockAccounts,
        business: mockBusiness,
        cards: mockCards,
        debts: mockDebts,
        events: [],
        goals: mockGoals,
        projections: [],
        transactions: mockTransactions,
      };
    }

    return {
      source: "supabase",
      accounts: (accountsResult.data ?? []).map((row) => mapAccount(row as SupabaseAccountRow)),
      business: (businessResult.data ?? []).map((row) => mapBusiness(row as SupabaseBusinessRow)),
      cards: (cardsResult.data ?? []).map((row) => mapCard(row as SupabaseCardRow)),
      debts: (debtsResult.data ?? []).map((row) => mapDebt(row as SupabaseDebtRow)),
      events: (eventsResult.data ?? []).map((row) => mapEvent(row as SupabaseEventRow)),
      goals: (goalsResult.data ?? []).map((row) => mapGoal(row as SupabaseGoalRow)),
      projections: (projectionsResult.data ?? []).map((row) => mapProjection(row as SupabaseProjectionRow)),
      transactions: (transactionsResult.data ?? []).map((row) => mapTransaction(row as SupabaseTransactionRow)),
    };
  } catch {
    return {
      source: "mock",
      accounts: mockAccounts,
      business: mockBusiness,
      cards: mockCards,
      debts: mockDebts,
      events: [],
      goals: mockGoals,
      projections: [],
      transactions: mockTransactions,
    };
  }
}
