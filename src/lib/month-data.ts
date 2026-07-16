import type { WorkspaceContext } from "@/src/lib/auth-types";
import type { MonthBudgetProgress, MonthViewModel } from "@/src/lib/month-types";
import { createSupabaseServerComponentClient } from "@/src/lib/supabase";

function money(value: number) {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  })
    .format(value)
    .replace(/\s?COP$/, "")
    .trim();
}

function toNumber(value: unknown) {
  if (typeof value === "number") return value;
  if (typeof value === "string") return Number(value) || 0;
  return 0;
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
  const nextMonth =
    month === 12 ? `${year + 1}-01-01` : `${yearStr}-${String(month + 1).padStart(2, "0")}-01`;
  return { start, nextMonth };
}

function categoryColor(current: number, limit: number): MonthBudgetProgress["color"] {
  if (current > limit) return "arca-alert";
  if (limit > 0 && current / limit >= 0.8) return "arca-accent";
  return "arca-positive";
}

type DashboardSummaryRpc = {
  freeCash?: number | string | null;
  monthlyCommitments?: number | string | null;
  monthlyExpenses?: number | string | null;
  protectedSavings?: number | string | null;
};

export async function loadMonthViewModel(context: WorkspaceContext): Promise<MonthViewModel> {
  const supabase = await createSupabaseServerComponentClient();

  if (!supabase) {
    throw new Error("Supabase no esta configurado.");
  }

  // Force token refresh in-memory so that RPC calls use a valid token
  await supabase.auth.getUser();

  const rpcClient = supabase as typeof supabase & {
    rpc: (
      fn: string,
      args?: Record<string, unknown>,
    ) => PromiseLike<{ data: DashboardSummaryRpc | null; error: { message: string } | null }>;
  };

  const workspaceId = context.workspace.id;
  const { start, nextMonth } = monthBoundsInBogota();

  const [dashboardResult, transactionsResult, budgetsResult, savingsResult] = await Promise.all([
    rpcClient.rpc("get_dashboard_summary", { p_workspace_id: workspaceId }),
    supabase
      .from("transactions")
      .select("amount, category, kind, date, status")
      .eq("workspace_id", workspaceId)
      .gte("date", `${start}T00:00:00-05:00`)
      .lt("date", `${nextMonth}T00:00:00-05:00`)
      .neq("status", "cancelled"),
    supabase
      .from("category_budgets")
      .select("category_name, limit_amount")
      .eq("workspace_id", workspaceId),
    supabase.from("savings_goals").select("current").eq("workspace_id", workspaceId).eq("archived", false),
  ]);

  if (dashboardResult.error) {
    console.error(`No se pudo leer el resumen del mes: ${dashboardResult.error.message}`);
    // No lanzamos error para no romper la pantalla por fallos de RLS en revalidatePath
  }
  if (transactionsResult.error) {
    throw new Error(`No se pudieron leer los movimientos del mes: ${transactionsResult.error.message}`);
  }
  if (budgetsResult.error) {
    throw new Error(`No se pudo leer el presupuesto por categorías: ${budgetsResult.error.message}`);
  }
  if (savingsResult.error) {
    throw new Error(`No se pudo leer el ahorro actual: ${savingsResult.error.message}`);
  }

  const summary = dashboardResult.data ?? {};
  const safeToSpend = toNumber(summary.freeCash);
  const expectedMonthlyExpenses =
    toNumber(summary.monthlyCommitments) > 0 ? toNumber(summary.monthlyCommitments) : toNumber(summary.monthlyExpenses);
  const protectedSavings =
    toNumber(summary.protectedSavings) > 0
      ? toNumber(summary.protectedSavings)
      : (savingsResult.data ?? []).reduce((sum, row) => sum + toNumber(row.current), 0);

  const outgoingKinds = new Set(["expense", "debt_payment", "card_payment", "saving", "saving_contribution", "transfer_out"]);
  const grouped = new Map<string, number>();

  for (const row of transactionsResult.data ?? []) {
    if (!outgoingKinds.has(String(row.kind))) continue;
    const category = String(row.category ?? "General");
    grouped.set(category, (grouped.get(category) ?? 0) + toNumber(row.amount));
  }

  const categoryLimits = new Map<string, number>();
  for (const row of budgetsResult.data ?? []) {
    categoryLimits.set(String(row.category_name), toNumber(row.limit_amount));
  }

  const budgetProgress: MonthBudgetProgress[] = Array.from(categoryLimits.entries())
    .map(([label, limit]) => {
      const current = grouped.get(label) ?? 0;
      return {
        label,
        current,
        limit,
        color: categoryColor(current, limit),
      };
    })
    .sort((a, b) => b.limit - a.limit); // Ordenar por límite mayor a menor

  // Añadir categorías que tienen gastos pero no límite (si es que queremos mostrarlas)
  for (const [label, current] of grouped.entries()) {
    if (!categoryLimits.has(label)) {
      budgetProgress.push({
        label,
        current,
        limit: 0,
        color: categoryColor(current, 0),
      });
    }
  }

  const coverageMonths = expectedMonthlyExpenses > 0 ? protectedSavings / expectedMonthlyExpenses : 0;
  const coverageProgress = Math.min(100, Math.round((coverageMonths / 6) * 100));

  return {
    safeToSpend,
    safeToSpendLabel: money(safeToSpend),
    budgetProgress,
    coverageMonths,
    coverageProgress,
    expectedMonthlyExpenses,
    expectedMonthlyExpensesLabel: money(expectedMonthlyExpenses),
  };
}
