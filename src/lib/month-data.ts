import type { WorkspaceContext } from "@/src/lib/auth-types";
import type { MonthViewModel, MonthlyAllocationType, MonthlyPlanAllocation } from "@/src/lib/month-types";
import { createSupabaseServerComponentClient } from "@/src/lib/supabase";

type DashboardSummaryRpc = {
  freeCash?: number | string | null;
  monthlyCommitments?: number | string | null;
  monthlyExpenses?: number | string | null;
};

type TransactionRow = {
  amount: number | string | null;
  category: string | null;
  kind: string;
  metadata?: { is_initial_balance?: boolean } | null;
};

type AllocationRow = {
  id: string;
  name: string;
  allocation_type: MonthlyAllocationType;
  percentage: number | string;
  tracking_category: string | null;
  sort_order: number;
};

type MonthlyPlanRow = {
  id: string;
  planned_income: number | string;
  monthly_plan_allocations: AllocationRow[] | null;
};

function toNumber(value: unknown) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function monthBoundsInBogota() {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Bogota",
    year: "numeric",
    month: "2-digit",
  });
  const [year, month] = formatter.format(new Date()).split("-");
  const monthNumber = Number(month);
  const nextMonth = monthNumber === 12 ? `${Number(year) + 1}-01-01` : `${year}-${String(monthNumber + 1).padStart(2, "0")}-01`;
  const start = `${year}-${month}-01`;
  const labelDate = new Date(`${start}T12:00:00-05:00`);
  const monthLabel = new Intl.DateTimeFormat("es-CO", { month: "long", year: "numeric", timeZone: "America/Bogota" }).format(labelDate);
  return { start, nextMonth, monthLabel: monthLabel.replace(/^./, (letter) => letter.toUpperCase()) };
}

function isMissingPlanningTable(error: { code?: string; message?: string } | null) {
  return error?.code === "PGRST205" || Boolean(error?.message?.includes("monthly_plans"));
}

function actualForAllocation(allocation: AllocationRow, transactions: TransactionRow[]) {
  const category = allocation.tracking_category?.trim().toLocaleLowerCase("es") || null;
  const matchesCategory = (row: TransactionRow) => !category || String(row.category ?? "").trim().toLocaleLowerCase("es") === category;

  return transactions.reduce((sum, row) => {
    if (!matchesCategory(row)) return sum;
    if (allocation.allocation_type === "expense" && row.kind === "expense") return sum + toNumber(row.amount);
    if (allocation.allocation_type === "debt" && (row.kind === "debt_payment" || row.kind === "card_payment")) return sum + toNumber(row.amount);
    if (allocation.allocation_type === "saving" && (row.kind === "saving" || row.kind === "saving_contribution")) return sum + toNumber(row.amount);
    return sum;
  }, 0);
}

function allocationStatus(target: number, actual: number): MonthlyPlanAllocation["status"] {
  if (target <= 0) return "neutral";
  const utilization = actual / target;
  if (utilization > 1) return "exceeded";
  if (utilization >= 0.8) return "warning";
  return "healthy";
}

export async function loadMonthViewModel(context: WorkspaceContext): Promise<MonthViewModel> {
  const supabase = await createSupabaseServerComponentClient();
  if (!supabase) throw new Error("Supabase no está configurado.");

  await supabase.auth.getUser();
  const rpcClient = supabase as typeof supabase & {
    rpc: (fn: string, args?: Record<string, unknown>) => PromiseLike<{ data: DashboardSummaryRpc | null; error: { message: string } | null }>;
  };
  const workspaceId = context.workspace.id;
  const { start, nextMonth, monthLabel } = monthBoundsInBogota();

  const [dashboardResult, transactionsResult, scheduledResult, categoriesResult, planResult] = await Promise.all([
    rpcClient.rpc("get_dashboard_summary", { p_workspace_id: workspaceId }),
    supabase
      .from("transactions")
      .select("amount, category, kind, metadata")
      .eq("workspace_id", workspaceId)
      .gte("date", `${start}T00:00:00-05:00`)
      .lt("date", `${nextMonth}T00:00:00-05:00`)
      .in("status", ["confirmed", "confirmado", "paid", "recovered"]),
    supabase
      .from("scheduled_events")
      .select("amount, kind, status")
      .eq("workspace_id", workspaceId)
      .gte("due_date", start)
      .lt("due_date", nextMonth),
    supabase
      .from("expense_categories")
      .select("name")
      .eq("workspace_id", workspaceId)
      .eq("active", true)
      .order("name", { ascending: true }),
    supabase
      .from("monthly_plans")
      .select("id, planned_income, monthly_plan_allocations(id, name, allocation_type, percentage, tracking_category, sort_order)")
      .eq("workspace_id", workspaceId)
      .eq("month", start)
      .maybeSingle(),
  ]);

  if (transactionsResult.error) throw new Error(`No se pudieron leer los movimientos del mes: ${transactionsResult.error.message}`);
  if (scheduledResult.error) throw new Error(`No se pudieron leer los compromisos del mes: ${scheduledResult.error.message}`);
  if (categoriesResult.error) throw new Error(`No se pudieron leer las categorías: ${categoriesResult.error.message}`);
  if (planResult.error && !isMissingPlanningTable(planResult.error)) throw new Error(`No se pudo leer el plan mensual: ${planResult.error.message}`);
  if (dashboardResult.error) console.error(`No se pudo leer el resumen del mes: ${dashboardResult.error.message}`);

  const transactions = ((transactionsResult.data ?? []) as TransactionRow[]).filter((row) => !row.metadata?.is_initial_balance);
  const receivedIncome = transactions.filter((row) => row.kind === "income").reduce((sum, row) => sum + toNumber(row.amount), 0);
  const confirmedStatuses = new Set(["confirmed", "confirmado", "paid", "recovered", "cancelled", "canceled"]);
  const expectedIncome = (scheduledResult.data ?? [])
    .filter((row) => row.kind === "income" && !confirmedStatuses.has(String(row.status)))
    .reduce((sum, row) => sum + toNumber(row.amount), 0);
  const summary = dashboardResult.data ?? {};
  const commitments = toNumber(summary.monthlyCommitments) || toNumber(summary.monthlyExpenses);
  const safeToSpend = toNumber(summary.freeCash);
  const planData = planResult.error ? null : planResult.data as unknown as MonthlyPlanRow | null;
  const plannedIncome = planData ? toNumber(planData.planned_income) : Math.max(receivedIncome + expectedIncome, safeToSpend + commitments);
  const rawAllocations = planData
    ? ((Array.isArray(planData.monthly_plan_allocations) ? planData.monthly_plan_allocations : []) as AllocationRow[]).sort((a, b) => a.sort_order - b.sort_order)
    : [];

  const allocations: MonthlyPlanAllocation[] = rawAllocations.map((allocation) => {
    const percentage = toNumber(allocation.percentage);
    const targetAmount = plannedIncome * (percentage / 100);
    const actualAmount = actualForAllocation(allocation, transactions);
    return {
      id: String(allocation.id),
      name: String(allocation.name),
      type: allocation.allocation_type,
      percentage,
      targetAmount,
      actualAmount,
      remainingAmount: targetAmount - actualAmount,
      utilization: targetAmount > 0 ? Math.round((actualAmount / targetAmount) * 100) : 0,
      trackingCategory: allocation.tracking_category ? String(allocation.tracking_category) : null,
      status: allocationStatus(targetAmount, actualAmount),
    };
  });
  const assignedPercentage = allocations.reduce((sum, allocation) => sum + allocation.percentage, 0);
  const assignedAmount = plannedIncome * (assignedPercentage / 100);

  return {
    month: start,
    monthLabel,
    plannedIncome,
    receivedIncome,
    expectedIncome,
    commitments,
    safeToSpend,
    assignedPercentage,
    assignedAmount,
    unassignedPercentage: Math.max(0, 100 - assignedPercentage),
    unassignedAmount: Math.max(0, plannedIncome - assignedAmount),
    allocations,
    categoryOptions: (categoriesResult.data ?? []).map((row) => String(row.name)),
    planAvailable: !planResult.error,
  };
}
