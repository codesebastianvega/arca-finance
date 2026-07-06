import { BusinessScreen } from "@/features/business/business-screen";
import { AppShell } from "@/features/app-shell/app-shell";
import { requireWorkspaceContext } from "@/lib/auth";
import { loadDashboardData } from "@/lib/dashboard-data";

export const dynamic = "force-dynamic";

type BusinessPageProps = {
  searchParams: Promise<{
    month?: string;
    saved?: string;
    updated?: string;
    deleted?: string;
    error?: string;
  }>;
};

export default async function BusinessPage({ searchParams }: BusinessPageProps) {
  const params = await searchParams;
  const context = await requireWorkspaceContext();
  const data = await loadDashboardData({ workspaceId: context.workspace.id, allowLegacyFallback: false });

  return (
    <AppShell currentPath="/app/negocios" context={context}>
      <BusinessScreen
        data={data}
        filters={{ month: params.month ?? new Date().toISOString().slice(0, 7) }}
        feedback={{
          saved: params.saved === "1",
          updated: params.updated === "1",
          deleted: params.deleted === "1",
          error: params.error,
        }}
      />
    </AppShell>
  );
}
