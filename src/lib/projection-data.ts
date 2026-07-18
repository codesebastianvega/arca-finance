import type { WorkspaceContext } from "@/src/lib/auth-types";
import type { ProjectionHistoryPoint, ProjectionMonth, ProjectionViewModel } from "@/src/lib/projection-types";
import { createSupabaseServerComponentClient } from "@/src/lib/supabase";

type DashboardSummaryRpc = {
  freeCash?: number | string | null;
  protectedSavings?: number | string | null;
  timeline?: Array<{
    month?: string;
    income?: number | string | null;
    expenses?: number | string | null;
    closingBalance?: number | string | null;
  }> | null;
};

type ProjectionRow = {
  month: string;
  closing_balance: number | string | null;
  expected_income: number | string | null;
  expected_expenses: number | string | null;
  debt_payments: number | string | null;
  card_payments: number | string | null;
  planned_savings: number | string | null;
};

function toNumber(value: unknown) {
  if (typeof value === "number") return value;
  if (typeof value === "string") return Number(value) || 0;
  return 0;
}

function currentMonthStart() {
  const formatter = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Bogota", year: "numeric", month: "2-digit" });
  const [year, month] = formatter.format(new Date()).split("-");
  return `${year}-${month}-01`;
}

function addMonths(monthStart: string, offset: number) {
  const [year, month] = monthStart.slice(0, 7).split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1 + offset, 1));
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

function monthLabel(raw: string) {
  return new Intl.DateTimeFormat("es-CO", { month: "short", timeZone: "America/Bogota" })
    .format(new Date(`${raw.slice(0, 7)}-15T12:00:00-05:00`))
    .replace(".", "");
}

export async function loadProjectionViewModel(context: WorkspaceContext): Promise<ProjectionViewModel> {
  const supabase = await createSupabaseServerComponentClient();
  if (!supabase) throw new Error("Supabase no esta configurado.");

  await supabase.auth.getUser();
  const rpcClient = supabase as typeof supabase & {
    rpc: (fn: string, args?: Record<string, unknown>) => PromiseLike<{ data: DashboardSummaryRpc | null; error: { message: string } | null }>;
  };

  const workspaceId = context.workspace.id;
  const monthStart = currentMonthStart();
  const endMonth = `${addMonths(monthStart, 12)}-01`;

  const [dashboardResult, projectionsResult, savingsResult, scheduledResult] = await Promise.all([
    rpcClient.rpc("get_dashboard_summary", { p_workspace_id: workspaceId }),
    supabase
      .from("monthly_projections")
      .select("month, closing_balance, expected_income, expected_expenses, debt_payments, card_payments, planned_savings")
      .eq("workspace_id", workspaceId)
      .gte("month", monthStart)
      .lt("month", endMonth)
      .order("month", { ascending: true }),
    supabase.from("savings_goals").select("target, current").eq("workspace_id", workspaceId).eq("archived", false),
    supabase
      .from("scheduled_events")
      .select("due_date, amount, kind, status")
      .eq("workspace_id", workspaceId)
      .gte("due_date", monthStart)
      .lt("due_date", endMonth)
      .not("status", "in", '("confirmed","confirmado","cancelled","cancelado")'),
  ]);

  if (dashboardResult.error) console.error(`No se pudo leer el resumen de proyeccion: ${dashboardResult.error.message}`);
  if (projectionsResult.error) throw new Error(`No se pudieron leer las proyecciones mensuales: ${projectionsResult.error.message}`);
  if (savingsResult.error) throw new Error(`No se pudieron leer las metas de ahorro: ${savingsResult.error.message}`);
  if (scheduledResult.error) throw new Error(`No se pudieron leer los eventos proyectados: ${scheduledResult.error.message}`);

  const summary = dashboardResult.data ?? {};
  const currentPosition = toNumber(summary.freeCash) + toNumber(summary.protectedSavings);
  const timeline = Array.isArray(summary.timeline) ? summary.timeline : [];
  const historical: ProjectionHistoryPoint[] = timeline.slice(-3).map((row) => {
    const key = String(row.month ?? monthStart).slice(0, 7);
    const fallback = toNumber(row.income) - toNumber(row.expenses);
    const closing = toNumber(row.closingBalance);
    return { key, label: monthLabel(key), value: closing || fallback };
  });

  const plannedByMonth = new Map<string, ProjectionRow>();
  for (const row of (projectionsResult.data ?? []) as ProjectionRow[]) plannedByMonth.set(String(row.month).slice(0, 7), row);

  const scheduledByMonth = new Map<string, { income: number; outgoing: number }>();
  for (const row of scheduledResult.data ?? []) {
    const key = String(row.due_date).slice(0, 7);
    const bucket = scheduledByMonth.get(key) ?? { income: 0, outgoing: 0 };
    const amount = toNumber(row.amount);
    if (String(row.kind) === "income") bucket.income += amount;
    else bucket.outgoing += amount;
    scheduledByMonth.set(key, bucket);
  }

  const months: ProjectionMonth[] = Array.from({ length: 12 }, (_, index) => {
    const key = addMonths(monthStart, index);
    const planned = plannedByMonth.get(key);
    const automatic = scheduledByMonth.get(key) ?? { income: 0, outgoing: 0 };
    return {
      key,
      label: monthLabel(key),
      expectedIncome: planned ? toNumber(planned.expected_income) : automatic.income,
      expectedExpenses: planned ? toNumber(planned.expected_expenses) : automatic.outgoing,
      debtPayments: planned ? toNumber(planned.debt_payments) : 0,
      cardPayments: planned ? toNumber(planned.card_payments) : 0,
      plannedSavings: planned ? toNumber(planned.planned_savings) : 0,
      storedClosingBalance: planned ? toNumber(planned.closing_balance) : null,
      source: planned ? "planned" : "automatic",
    };
  });

  return {
    historical,
    months,
    currentPosition,
    savingsTarget: (savingsResult.data ?? []).reduce((sum, row) => sum + toNumber(row.target), 0),
    currentSavings: (savingsResult.data ?? []).reduce((sum, row) => sum + toNumber(row.current), 0),
  };
}
