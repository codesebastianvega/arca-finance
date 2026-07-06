import { HistoryScreen } from "@/features/history/history-screen";
import { AppShell } from "@/features/app-shell/app-shell";
import { requireWorkspaceContext } from "@/lib/auth";
import { loadDashboardData } from "@/lib/dashboard-data";

export const dynamic = "force-dynamic";

type HistoryPageProps = {
  searchParams: Promise<{
    month?: string;
    kind?: string;
    account?: string;
    unit?: string;
    category?: string;
    status?: string;
  }>;
};

export default async function HistoryPage({ searchParams }: HistoryPageProps) {
  const params = await searchParams;
  const context = await requireWorkspaceContext();
  const data = await loadDashboardData({ workspaceId: context.workspace.id, allowLegacyFallback: false });
  const month = params.month ?? new Date().toISOString().slice(0, 7);

  return (
    <AppShell currentPath="/app/historial" context={context}>
      <HistoryScreen
        data={data}
        filters={{
          month,
          kind: params.kind,
          account: params.account,
          unit: params.unit,
          category: params.category,
          status: params.status,
        }}
      />
    </AppShell>
  );
}
