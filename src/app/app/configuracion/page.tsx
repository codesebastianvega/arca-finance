import { Card } from "@/components/ui-kit";
import { AppShell } from "@/features/app-shell/app-shell";
import { requireWorkspaceContext } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const context = await requireWorkspaceContext();

  return (
    <AppShell currentPath="/app/configuracion" context={context}>
      <div className="space-y-6">
        <section className="rounded-[28px] border border-[var(--line)] bg-[var(--surface)] p-6">
          <p className="text-xs uppercase tracking-[0.28em] text-[var(--muted)]">Configuracion</p>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight">Tu cuenta, tu espacio y preferencias base.</h1>
        </section>

        <div className="grid gap-4 xl:grid-cols-3">
          <Card className="p-5">
            <p className="text-xs uppercase tracking-[0.22em] text-[var(--muted)]">Espacio</p>
            <h2 className="mt-2 text-2xl font-semibold">{context.workspace.name}</h2>
            <p className="mt-2 text-sm text-[var(--muted)]">Moneda {context.workspace.currencyCode}</p>
          </Card>
          <Card className="p-5">
            <p className="text-xs uppercase tracking-[0.22em] text-[var(--muted)]">Usuario</p>
            <h2 className="mt-2 text-2xl font-semibold">{context.profile.fullName ?? context.profile.email ?? "Usuario"}</h2>
            <p className="mt-2 text-sm text-[var(--muted)]">Zona horaria {context.workspace.timezone}</p>
          </Card>
          <Card className="p-5">
            <p className="text-xs uppercase tracking-[0.22em] text-[var(--muted)]">Estado</p>
            <h2 className="mt-2 text-2xl font-semibold">Cuenta activa</h2>
            <p className="mt-2 text-sm text-[var(--muted)]">
              {context.subscription?.status === "active" ? "Todo listo para usar." : "Aun faltan ajustes por completar."}
            </p>
          </Card>
        </div>
      </div>
    </AppShell>
  );
}
