import { AppShell } from "@/features/app-shell/app-shell";
import { RegisterScreen } from "@/features/register/register-screen";
import { requireWorkspaceContext } from "@/lib/auth";
import { loadDashboardData } from "@/lib/dashboard-data";

export const dynamic = "force-dynamic";

type RegisterPageProps = {
  searchParams: Promise<{
    segment?: string;
    welcome?: string;
  }>;
};

export default async function RegisterPage({ searchParams }: RegisterPageProps) {
  const params = await searchParams;
  const context = await requireWorkspaceContext();
  const data = await loadDashboardData({ workspaceId: context.workspace.id, allowLegacyFallback: false });

  return (
    <AppShell currentPath="/app/registrar" context={context}>
      <RegisterScreen data={data} activeSegment={params.segment} welcome={params.welcome === "1"} />
    </AppShell>
  );
}
