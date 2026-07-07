import { MasMenu } from "@/components/mas-menu";
import { AppShell } from "@/features/app-shell/app-shell";
import { requireWorkspaceContext } from "@/lib/auth";

export default async function MasPage() {
  const context = await requireWorkspaceContext();

  return (
    <AppShell currentPath="/app/mas" context={context}>
      <MasMenu />
    </AppShell>
  );
}
