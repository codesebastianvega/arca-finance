import Link from "next/link";
import { Button, Card, MetricCard } from "@/components/ui-kit";
import type { DashboardData } from "@/lib/dashboard-data";
import { formatCOP } from "@/lib/finance";

export function ProjectionScreen({ data }: { data: DashboardData }) {
  const projections = data.projections;
  const latest = projections[projections.length - 1];

  return (
    <div className="space-y-6">
      <section className="rounded-[28px] border border-[var(--line)] bg-[var(--surface)] p-6 shadow-[0_16px_44px_rgba(16,16,16,0.06)]">
        <div className="max-w-4xl">
          <p className="text-xs uppercase tracking-[0.28em] text-[var(--muted)]">Planeacion / Proyeccion</p>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight text-[var(--foreground)] sm:text-5xl">
            Escenarios y futuro, sin inventar datos.
          </h1>
          <p className="mt-4 text-sm leading-7 text-[var(--muted)]">
            Esta vista solo mostrara proyecciones cuando existan escenarios guardados. Mientras tanto, se queda en cero y explicita que falta construir esa capa.
          </p>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Escenarios" value={String(projections.length)} delta="Base de proyecciones" tone="neutral" />
        <MetricCard label="Ingreso esperado" value={formatCOP(latest?.expectedIncome ?? 0)} delta="Ultimo escenario" tone="success" />
        <MetricCard label="Gasto esperado" value={formatCOP(latest?.expectedExpenses ?? 0)} delta="Ultimo escenario" tone="warning" />
        <MetricCard label="Cierre estimado" value={formatCOP(latest?.closingBalance ?? 0)} delta={latest?.scenario ?? "Sin escenario"} tone="neutral" />
      </section>

      <Card className="p-5">
        <p className="text-xs uppercase tracking-[0.24em] text-[var(--muted)]">Estado actual</p>
        <h2 className="mt-2 text-2xl font-semibold text-[var(--foreground)]">Proyeccion todavia no operativa</h2>
        {projections.length ? (
          <div className="mt-5 space-y-3">
            {projections.map((item) => (
              <div key={item.id} className="rounded-2xl border border-[var(--line)] bg-white/70 px-4 py-3">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-medium text-[var(--foreground)]">{item.scenario}</p>
                    <p className="mt-1 text-sm text-[var(--muted)]">{item.month}</p>
                  </div>
                  <p className="font-semibold text-[var(--foreground)]">{formatCOP(item.closingBalance)}</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="mt-5 rounded-2xl border border-dashed border-[var(--line)] bg-white/50 p-6 text-sm text-[var(--muted)]">
            No hay escenarios guardados. El siguiente paso correcto es definir primero cuentas, obligaciones e ingresos reales; luego construimos proyeccion sobre esa base.
          </div>
        )}
        <div className="mt-5">
          <Link href="/app/planeacion/mes">
            <Button size="sm">Ir al mes</Button>
          </Link>
        </div>
      </Card>
    </div>
  );
}
