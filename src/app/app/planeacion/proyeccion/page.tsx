import { AppShell } from "@/features/app-shell/app-shell";
import { ProjectionScreen } from "@/features/planning/projection-screen";
import { requireWorkspaceContext } from "@/lib/auth";
import { loadDashboardData } from "@/lib/dashboard-data";

export const dynamic = "force-dynamic";

export default async function ProjectionPage() {
  const context = await requireWorkspaceContext();
  const data = await loadDashboardData({ workspaceId: context.workspace.id, allowLegacyFallback: false });

  return (
    <AppShell currentPath="/app/planeacion/proyeccion" context={context}>
      <ProjectionScreen data={data} />
    </AppShell>
  );
}
