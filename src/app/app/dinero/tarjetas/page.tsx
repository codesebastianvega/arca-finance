import { CardsScreen } from "@/features/cards/cards-screen";
import { AppShell } from "@/features/app-shell/app-shell";
import { requireWorkspaceContext } from "@/lib/auth";
import { loadDashboardData } from "@/lib/dashboard-data";

export const dynamic = "force-dynamic";

type CardsPageProps = {
  searchParams: Promise<{
    card?: string;
    saved?: string;
    updated?: string;
    deleted?: string;
    error?: string;
  }>;
};

export default async function CardsPage({ searchParams }: CardsPageProps) {
  const params = await searchParams;
  const context = await requireWorkspaceContext();
  const data = await loadDashboardData({ workspaceId: context.workspace.id, allowLegacyFallback: false });

  return (
    <AppShell currentPath="/app/dinero/tarjetas" context={context}>
      <CardsScreen
        data={data}
        selectedCardId={params.card}
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
