import { ExecutiveDashboardView } from "@/features/dashboard/components/executive-dashboard";
import { buildExecutiveDashboardFromData } from "@/features/dashboard/services/build-executive-dashboard";
import { AppShell } from "@/features/app-shell/app-shell";
import { requireWorkspaceContext } from "@/lib/auth";
import { loadDashboardData } from "@/lib/dashboard-data";
import { getReadClient, readDashboardSummary } from "@/lib/financial-rpc";

export const dynamic = "force-dynamic";

type DashboardPageProps = {
  searchParams: Promise<{
    month?: string;
  }>;
};

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  const params = await searchParams;
  const context = await requireWorkspaceContext();
  const client = await getReadClient();
  const [summary, data] = await Promise.all([
    readDashboardSummary(client, context.workspace.id, params.month),
    loadDashboardData({ workspaceId: context.workspace.id, allowLegacyFallback: false }),
  ]);
  const resolvedSummary = summary ?? buildExecutiveDashboardFromData(data);
  const isEmpty =
    data.accounts.length === 0 &&
    data.transactions.length === 0 &&
    data.debts.length === 0 &&
    data.cards.length === 0 &&
    data.scheduledEvents.length === 0 &&
    data.goals.length === 0;

  return (
    <AppShell currentPath="/app/dashboard" context={context}>
      <ExecutiveDashboardView summary={resolvedSummary} isEmpty={isEmpty} />
    </AppShell>
  );
}
