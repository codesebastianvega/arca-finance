import { DecisionDashboardView } from "@/features/dashboard/components/decision-dashboard";
import { mergeTodaySummaryWithData } from "@/features/dashboard/services/build-decision-dashboard";
import { AppShell } from "@/features/app-shell/app-shell";
import { requireWorkspaceContext } from "@/lib/auth";
import { loadDashboardData } from "@/lib/dashboard-data";
import { getReadClient, readTodaySummary } from "@/lib/financial-rpc";

export const dynamic = "force-dynamic";

export default async function TodayPage() {
  const context = await requireWorkspaceContext();
  const [data, client] = await Promise.all([
    loadDashboardData({ workspaceId: context.workspace.id, allowLegacyFallback: false }),
    getReadClient(),
  ]);
  const todaySummary = await readTodaySummary(client, context.workspace.id);
  const summary = todaySummary ? mergeTodaySummaryWithData(todaySummary, data) : undefined;

  return (
    <AppShell currentPath="/app/hoy" context={context}>
      <DecisionDashboardView data={data} summary={summary} />
    </AppShell>
  );
}
