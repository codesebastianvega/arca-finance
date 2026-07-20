import type { WorkspaceContext } from "@/src/lib/auth-types";
import { createSupabaseServerComponentClient } from "@/src/lib/supabase";

export type RegisterOption = {
  id: string;
  label: string;
  value: string;
  meta?: string;
  amount?: number;
  entity?: string | null;
  color?: string | null;
  parentId?: string | null;
  icon?: string | null;
};

export type RegisterViewModel = {
  accounts: RegisterOption[];
  creditCards: Array<{
    id: string;
    name: string;
    issuer: string;
    limit: number;
    used: number;
    minimumPayment: number;
    annualInterestRate: number | null;
    interestType: string;
    estimatedPayoffMonths: number | null;
    estimatedTotalPayment: number | null;
    paymentStrategy: string;
    notes: string;
    cutOffDay: number;
    payDueDay: number;
  }>;
  bankCredits: Array<{
    id: string;
    name: string;
    totalAmount: number;
    currentBalance: number;
    monthlyPayment: number;
    interestRate: number | null;
    totalInstallments: number;
    paidInstallments: number;
    payDueDay: number;
    notes: string;
  }>;
  categories: RegisterOption[];
  units: RegisterOption[];
  incomeSources: Array<{
    id: string;
    label: string;
    unitKey: string;
    defaultAccountId: string | null;
  }>;
  savingsGoals: Array<{
    id: string;
    name: string;
    current: number;
    target: number | null;
    dueDate: string | null;
    goalType: string;
  }>;
  loans: Array<{
    id: string;
    type: 'payable' | 'receivable';
    concept: string;
    amount: number;
    notes: string;
  }>;
};

type IncomeSourceRow = {
  id: string;
  name: string;
  business_unit_key: string;
  default_account_id?: string | null;
};

type BusinessUnitRow = {
  id: string;
  name: string;
  key: string;
  archived?: boolean;
};

async function loadBusinessUnitsForRegister(
  workspaceId: string,
  supabase: Awaited<ReturnType<typeof createSupabaseServerComponentClient>>,
) {
  const primaryResult = await supabase
    .from("business_units")
    .select("id, name, key, archived")
    .eq("workspace_id", workspaceId)
    .eq("archived", false)
    .order("created_at", { ascending: true });

  if (!primaryResult.error) {
    return primaryResult as { data: BusinessUnitRow[] | null; error: null };
  }

  if (!primaryResult.error.message.includes("archived")) {
    return primaryResult as { data: BusinessUnitRow[] | null; error: typeof primaryResult.error };
  }

  const fallbackResult = await supabase
    .from("business_units")
    .select("id, name, key")
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: true });

  return fallbackResult as { data: BusinessUnitRow[] | null; error: typeof primaryResult.error };
}

async function loadIncomeSourcesForRegister(
  workspaceId: string,
  supabase: Awaited<ReturnType<typeof createSupabaseServerComponentClient>>,
) {
  const primaryResult = await supabase
    .from("income_sources")
    .select("id, name, business_unit_key, default_account_id")
    .eq("workspace_id", workspaceId)
    .eq("active", true)
    .order("created_at", { ascending: true });

  if (!primaryResult.error) {
    return primaryResult as { data: IncomeSourceRow[] | null; error: null };
  }

  if (!primaryResult.error.message.includes("default_account_id")) {
    return primaryResult as { data: IncomeSourceRow[] | null; error: typeof primaryResult.error };
  }

  const fallbackResult = await supabase
    .from("income_sources")
    .select("id, name, business_unit_key")
    .eq("workspace_id", workspaceId)
    .eq("active", true)
    .order("created_at", { ascending: true });

  if (fallbackResult.error) {
    return fallbackResult as { data: IncomeSourceRow[] | null; error: typeof fallbackResult.error };
  }

  return {
    data: (fallbackResult.data ?? []).map((row) => ({
      ...row,
      default_account_id: null,
    })),
    error: null,
  };
}

export async function loadRegisterViewModel(context: WorkspaceContext): Promise<RegisterViewModel> {
  const supabase = await createSupabaseServerComponentClient();

  if (!supabase) {
    throw new Error("Supabase no esta configurado.");
  }

  const workspaceId = context.workspace.id;
  const sourcesPromise = loadIncomeSourcesForRegister(workspaceId, supabase);
  const unitsPromise = loadBusinessUnitsForRegister(workspaceId, supabase);

  const [accountsResult, creditsResult, cardsResult, categoriesResult, savingsResult, receivablesResult, payablesResult, unitsResult, sourcesResult] = await Promise.all([
    supabase
      .from("accounts")
      .select("id, name, entity, type, balance, color")
      .eq("workspace_id", workspaceId)
      .eq("active", true)
      .eq("archived", false)
      .order("created_at", { ascending: true }),
    supabase
      .from("bank_credits")
      .select("id, name, total_amount, current_balance, monthly_payment, interest_rate, total_installments, paid_installments, pay_due_date, notes")
      .eq("workspace_id", workspaceId)
      .neq("status", "archived")
      .order("created_at", { ascending: true }),
    supabase
      .from("credit_cards")
      .select("id, name, issuer, limit_value, used, minimum_payment, annual_interest_rate, interest_type, estimated_payoff_months, estimated_total_payment, payment_strategy, notes, cut_off_date, pay_due_date")
      .eq("workspace_id", workspaceId)
      .eq("archived", false)
      .order("created_at", { ascending: true }),
    supabase
      .from("expense_categories")
      .select("id, name, parent_id, icon")
      .eq("workspace_id", workspaceId)
      .eq("active", true)
      .order("created_at", { ascending: true }),
    supabase
      .from("savings_goals")
      .select("id, name, current, target, due_date, goal_type")
      .eq("workspace_id", workspaceId)
      .eq("archived", false)
      .order("created_at", { ascending: true }),
    supabase
      .from("receivables")
      .select("id, title, amount, notes, debtor_name")
      .eq("workspace_id", workspaceId)
      .in("status", ["pending"]),
    supabase
      .from("scheduled_events")
      .select("id, title, amount, notes")
      .eq("workspace_id", workspaceId)
      .eq("status", "scheduled")
      .or("linked_entity_type.eq.payable_loan,title.ilike.Pagar Préstamo%"),
    unitsPromise,
    sourcesPromise,
  ]);

  if (accountsResult.error) {
    throw new Error(`No se pudieron leer las cuentas para registrar: ${accountsResult.error.message}`);
  }
  if (cardsResult.error) {
    throw new Error(`No se pudieron leer las tarjetas para registrar: ${cardsResult.error.message}`);
  }
  if (creditsResult.error) {
    throw new Error(`No se pudieron leer los créditos para registrar: ${creditsResult.error.message}`);
  }
  if (categoriesResult.error) {
    throw new Error(`No se pudieron leer las categorias para registrar: ${categoriesResult.error.message}`);
  }
  if (savingsResult.error) {
    throw new Error(`No se pudieron leer los ahorros: ${savingsResult.error.message}`);
  }
  if (receivablesResult.error) {
    throw new Error(`No se pudieron leer los préstamos dados: ${receivablesResult.error.message}`);
  }
  if (payablesResult.error) {
    throw new Error(`No se pudieron leer los préstamos recibidos: ${payablesResult.error.message}`);
  }
  if (unitsResult.error) {
    throw new Error(`No se pudieron leer los proyectos para registrar: ${unitsResult.error.message}`);
  }
  if (sourcesResult.error) {
    throw new Error(`No se pudieron leer las fuentes de ingreso para registrar: ${sourcesResult.error.message}`);
  }

  return {
    accounts: (accountsResult.data ?? []).map((row) => ({
      id: String(row.id),
      label: String(row.name),
      value: String(row.id),
      meta: String(row.type ?? "cuenta"),
      amount: typeof row.balance === "number" ? row.balance : Number(row.balance ?? 0),
      entity: row.entity ? String(row.entity) : null,
      color: row.color ? String(row.color) : null,
    })),
    creditCards: (cardsResult.data ?? []).map((row) => ({
      id: String(row.id),
      name: String(row.name),
      issuer: String(row.issuer ?? ""),
      limit: Number(row.limit_value ?? 0),
      used: Number(row.used ?? 0),
      minimumPayment: Number(row.minimum_payment ?? 0),
      annualInterestRate: row.annual_interest_rate == null ? null : Number(row.annual_interest_rate),
      interestType: String(row.interest_type ?? "unknown"),
      estimatedPayoffMonths: row.estimated_payoff_months == null ? null : Number(row.estimated_payoff_months),
      estimatedTotalPayment: row.estimated_total_payment == null ? null : Number(row.estimated_total_payment),
      paymentStrategy: String(row.payment_strategy ?? "minimum"),
      notes: String(row.notes ?? ""),
      cutOffDay: Number(row.cut_off_date ?? 1),
      payDueDay: Number(row.pay_due_date ?? 1),
    })),
    bankCredits: (creditsResult.data ?? []).map((row) => ({
      id: String(row.id),
      name: String(row.name),
      totalAmount: Number(row.total_amount ?? 0),
      currentBalance: Number(row.current_balance ?? 0),
      monthlyPayment: Number(row.monthly_payment ?? 0),
      interestRate: row.interest_rate == null ? null : Number(row.interest_rate),
      totalInstallments: Number(row.total_installments ?? 0),
      paidInstallments: Number(row.paid_installments ?? 0),
      payDueDay: Number(row.pay_due_date ?? 1),
      notes: String(row.notes ?? ""),
    })),
    categories: (categoriesResult.data ?? []).map((row) => ({
      id: String(row.id),
      label: String(row.name),
      value: String(row.name),
      parentId: row.parent_id ? String(row.parent_id) : null,
      icon: row.icon ? String(row.icon) : null,
    })),
    units: (unitsResult.data ?? []).map((row) => ({
      id: String(row.id),
      label: String(row.name),
      value: String(row.key),
    })),
    incomeSources: (sourcesResult.data ?? []).map((row) => ({
      id: String(row.id),
      label: String(row.name),
      unitKey: String(row.business_unit_key),
      defaultAccountId: row.default_account_id ? String(row.default_account_id) : null,
    })),
    savingsGoals: (savingsResult.data ?? []).map((row) => ({
      id: String(row.id),
      name: String(row.name),
      current: Number(row.current ?? 0),
      target: row.target ? Number(row.target) : null,
      dueDate: row.due_date ? String(row.due_date) : null,
      goalType: String(row.goal_type ?? 'goal'),
    })),
    loans: [
      ...(receivablesResult.data ?? []).map((row) => ({
        id: String(row.id),
        type: 'receivable' as const,
        concept: String(row.title ?? row.debtor_name ?? 'Préstamo'),
        amount: Number(row.amount ?? 0),
        notes: String(row.notes ?? ''),
      })),
      ...(payablesResult.data ?? []).map((row) => ({
        id: String(row.id),
        type: 'payable' as const,
        concept: String(row.title ?? 'Préstamo recibido'),
        amount: Number(row.amount ?? 0),
        notes: String(row.notes ?? ''),
      })),
    ],
  };
}
