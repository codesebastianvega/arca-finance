import { AccountsScreen } from "@/features/accounts/accounts-screen";
import { AppShell } from "@/features/app-shell/app-shell";
import { requireWorkspaceContext } from "@/lib/auth";
import { loadDashboardData } from "@/lib/dashboard-data";

export const dynamic = "force-dynamic";

type AccountsPageProps = {
  searchParams: Promise<{
    saved?: string;
    updated?: string;
    deleted?: string;
    error?: string;
  }>;
};

export default async function AccountsPage({ searchParams }: AccountsPageProps) {
  const params = await searchParams;
  const context = await requireWorkspaceContext();
  const data = await loadDashboardData({ workspaceId: context.workspace.id, allowLegacyFallback: false });

  return (
    <AppShell currentPath="/app/dinero/cuentas" context={context}>
      <AccountsScreen
        data={data}
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
