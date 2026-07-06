import { AppShell } from "@/features/app-shell/app-shell";
import { MonthScreen } from "@/features/planning/month-screen";
import { requireWorkspaceContext } from "@/lib/auth";
import { loadDashboardData } from "@/lib/dashboard-data";

export const dynamic = "force-dynamic";

type MonthPageProps = {
  searchParams: Promise<{
    month?: string;
  }>;
};

export default async function MonthPage({ searchParams }: MonthPageProps) {
  const params = await searchParams;
  const context = await requireWorkspaceContext();
  const data = await loadDashboardData({ workspaceId: context.workspace.id, allowLegacyFallback: false });

  return (
    <AppShell currentPath="/app/planeacion/mes" context={context}>
      <MonthScreen data={data} monthKey={params.month ?? getMonthKey()} />
    </AppShell>
  );
}

function getMonthKey() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}
