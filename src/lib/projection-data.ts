import type { WorkspaceContext } from "@/src/lib/auth-types";
import type { ProjectionChartPoint, ProjectionViewModel } from "@/src/lib/projection-types";
import { createSupabaseServerComponentClient } from "@/src/lib/supabase";

type DashboardSummaryRpc = {
  freeCash?: number | string | null;
  protectedSavings?: number | string | null;
  timeline?: Array<{
    month?: string;
    income?: number | string | null;
    expenses?: number | string | null;
    commitments?: number | string | null;
    closingBalance?: number | string | null;
  }> | null;
};

function toNumber(value: unknown) {
  if (typeof value === "number") return value;
  if (typeof value === "string") return Number(value) || 0;
  return 0;
}

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

function currentMonthStart() {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Bogota",
    year: "numeric",
    month: "2-digit",
  });
  const [year, month] = formatter.format(new Date()).split("-");
  return `${year}-${month}-01`;
}

function monthLabel(raw: string) {
  return new Intl.DateTimeFormat("es-CO", {
    month: "short",
    timeZone: "America/Bogota",
  })
    .format(new Date(`${raw}T00:00:00-05:00`))
    .replace(".", "");
}

export async function loadProjectionViewModel(context: WorkspaceContext): Promise<ProjectionViewModel> {
  const supabase = await createSupabaseServerComponentClient();

  if (!supabase) {
    throw new Error("Supabase no esta configurado.");
  }

  const rpcClient = supabase as typeof supabase & {
    rpc: (
      fn: string,
      args?: Record<string, unknown>,
    ) => PromiseLike<{ data: DashboardSummaryRpc | null; error: { message: string } | null }>;
  };

  const workspaceId = context.workspace.id;
  const monthStart = currentMonthStart();

  const [dashboardResult, projectionsResult, savingsResult, scheduledResult] = await Promise.all([
    rpcClient.rpc("get_dashboard_summary", { p_workspace_id: workspaceId }),
    supabase
      .from("monthly_projections")
      .select("month, closing_balance, expected_income, expected_expenses, debt_payments, card_payments, planned_savings, scenario")
      .eq("workspace_id", workspaceId)
      .gte("month", monthStart)
      .order("month", { ascending: true })
      .limit(6),
    supabase.from("savings_goals").select("target, current").eq("workspace_id", workspaceId).eq("archived", false),
    supabase
      .from("scheduled_events")
      .select("due_date, amount, kind, status")
      .eq("workspace_id", workspaceId)
      .gte("due_date", monthStart)
      .not("status", "in", '("confirmed","confirmado","cancelled","cancelado")'),
  ]);

  if (dashboardResult.error) {
    throw new Error(`No se pudo leer el resumen de proyeccion: ${dashboardResult.error.message}`);
  }
  if (projectionsResult.error) {
    throw new Error(`No se pudieron leer las proyecciones mensuales: ${projectionsResult.error.message}`);
  }
  if (savingsResult.error) {
    throw new Error(`No se pudieron leer las metas de ahorro: ${savingsResult.error.message}`);
  }
  if (scheduledResult.error) {
    throw new Error(`No se pudieron leer los eventos proyectados: ${scheduledResult.error.message}`);
  }

  const summary = dashboardResult.data ?? {};
  const currentPosition = toNumber(summary.freeCash) + toNumber(summary.protectedSavings);
  const timeline = Array.isArray(summary.timeline) ? summary.timeline : [];

  const actualPoints: ProjectionChartPoint[] = timeline.slice(-3).map((row) => {
    const fallback = toNumber(row.income) - toNumber(row.expenses);
    const actual = toNumber(row.closingBalance) > 0 ? toNumber(row.closingBalance) : fallback;
    return {
      label: monthLabel(`${row.month ?? monthStart}-01`.slice(0, 10)),
      actual,
    };
  });

  const scheduledByMonth = new Map<string, { income: number; outgoing: number }>();
  for (const row of scheduledResult.data ?? []) {
    const key = String(row.due_date).slice(0, 7);
    const bucket = scheduledByMonth.get(key) ?? { income: 0, outgoing: 0 };
    const amount = toNumber(row.amount);
    if (String(row.kind) === "income") {
      bucket.income += amount;
    } else {
      bucket.outgoing += amount;
    }
    scheduledByMonth.set(key, bucket);
  }

  let rollingProjection = currentPosition;
  const futurePoints: ProjectionChartPoint[] = (projectionsResult.data ?? []).map((row) => ({
    label: monthLabel(String(row.month)),
    projected: toNumber(row.closing_balance),
  }));

  if (futurePoints.length === 0) {
    const months = Array.from(scheduledByMonth.keys()).sort().slice(0, 6);
    for (const month of months) {
      const bucket = scheduledByMonth.get(month) ?? { income: 0, outgoing: 0 };
      rollingProjection += bucket.income - bucket.outgoing;
      futurePoints.push({
        label: monthLabel(`${month}-01`),
        projected: rollingProjection,
      });
    }
  }

  const chart = [...actualPoints, ...futurePoints];
  const lastProjected = futurePoints.at(-1)?.projected ?? currentPosition;

  const savingsTarget = (savingsResult.data ?? []).reduce((sum, row) => sum + toNumber(row.target), 0);
  const currentSavings = (savingsResult.data ?? []).reduce((sum, row) => sum + toNumber(row.current), 0);
  const savingsGap = Math.max(savingsTarget - currentSavings, 0);
  const savingsProgress = savingsTarget > 0 ? Math.min(100, Math.round((currentSavings / savingsTarget) * 100)) : 0;

  const monthsProjected = futurePoints.length;
  const narrative =
    monthsProjected > 0
      ? `Con ${monthsProjected} meses proyectados, tu cierre esperado queda en ${money(lastProjected)} si el flujo se comporta como esta cargado hoy.`
      : "Todavia no hay suficientes escenarios guardados para proyectar el cierre futuro.";

  return {
    chart,
    currentPositionLabel: money(currentPosition),
    baseScenarioLabel: money(lastProjected),
    savingsTargetLabel: money(savingsTarget),
    savingsGapLabel: money(savingsGap),
    savingsProgress,
    monthsProjected,
    narrative,
  };
}
