import { AppShell } from "@/features/app-shell/app-shell";
import { TransferScreen } from "@/features/transfers/transfer-screen";
import { requireWorkspaceContext } from "@/lib/auth";
import { loadDashboardData } from "@/lib/dashboard-data";

export const dynamic = "force-dynamic";

export default async function TransferPage() {
  const context = await requireWorkspaceContext();
  const data = await loadDashboardData({ workspaceId: context.workspace.id, allowLegacyFallback: false });

  return (
    <AppShell currentPath="/app/transferir" context={context}>
      <TransferScreen data={data} />
    </AppShell>
  );
}
