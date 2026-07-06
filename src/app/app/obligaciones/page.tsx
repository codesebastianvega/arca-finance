import { AppShell } from "@/features/app-shell/app-shell";
import { ObligationsScreen } from "@/features/obligations/obligations-screen";
import { requireWorkspaceContext } from "@/lib/auth";
import { loadDashboardData } from "@/lib/dashboard-data";

export const dynamic = "force-dynamic";

type ObligationsPageProps = {
  searchParams: Promise<{
    month?: string;
    filter?: string;
    view?: string;
    saved?: string;
    updated?: string;
    deleted?: string;
    error?: string;
  }>;
};

export default async function ObligationsPage({ searchParams }: ObligationsPageProps) {
  const params = await searchParams;
  const context = await requireWorkspaceContext();
  const data = await loadDashboardData({ workspaceId: context.workspace.id, allowLegacyFallback: false });

  return (
    <AppShell currentPath="/app/obligaciones" context={context}>
      <ObligationsScreen
        data={data}
        selectedFilter={params.filter}
        selectedView={params.view}
        monthKey={params.month ?? getMonthKey()}
        feedback={{
          saved: params.saved === "1",
          updated: params.updated,
          deleted: params.deleted,
          error: params.error,
        }}
      />
    </AppShell>
  );
}

function getMonthKey() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}
