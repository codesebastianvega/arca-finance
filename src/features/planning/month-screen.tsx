import Link from "next/link";
import { Badge, Button, Card, MetricCard } from "@/components/ui-kit";
import type { DashboardData } from "@/lib/dashboard-data";
import { formatCOP, formatDate, parseCalendarDate } from "@/lib/finance";
import { getScheduledEventStatusLabel } from "@/lib/template-generation";

export function MonthScreen({ data, monthKey }: { data: DashboardData; monthKey: string }) {
  const events = data.scheduledEvents
    .filter((item) => monthMatches(item.dueDate, monthKey))
    .sort((left, right) => parseCalendarDate(left.dueDate).getTime() - parseCalendarDate(right.dueDate).getTime());
  const expectedIncome = events.filter((item) => item.kind === "income").reduce((sum, item) => sum + item.amount, 0);
  const expectedOutflow = events.filter((item) => item.kind !== "income").reduce((sum, item) => sum + item.amount, 0);
  const posted = data.transactions.filter((item) => monthMatches(item.date, monthKey));
  const realIncome = posted.filter((item) => item.kind === "income").reduce((sum, item) => sum + item.amount, 0);
  const realOutflow = posted.filter((item) => item.kind !== "income").reduce((sum, item) => sum + item.amount, 0);

  return (
    <div className="space-y-6">
      <section className="rounded-[28px] border border-[var(--line)] bg-[var(--surface)] p-6 shadow-[0_16px_44px_rgba(16,16,16,0.06)]">
        <div className="max-w-4xl">
          <p className="text-xs uppercase tracking-[0.28em] text-[var(--muted)]">Planeacion / Mes</p>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight text-[var(--foreground)] sm:text-5xl">Agenda operativa del mes.</h1>
          <p className="mt-4 text-sm leading-7 text-[var(--muted)]">
            Esta vista separa dos capas de forma explicita: lo real ya posteado y lo esperado que todavia no se confirma.
          </p>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Ingresos esperados" value={formatCOP(expectedIncome)} delta={`Mes ${monthKey}`} tone="neutral" />
        <MetricCard label="Salidas esperadas" value={formatCOP(expectedOutflow)} delta={`${events.length} eventos en agenda`} tone="warning" />
        <MetricCard label="Ingreso real" value={formatCOP(realIncome)} delta="Movimientos confirmados" tone="success" />
        <MetricCard label="Salida real" value={formatCOP(realOutflow)} delta="Gastos y pagos posteados" tone="neutral" />
      </section>

      <Card className="p-5">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-[var(--muted)]">Cronologia</p>
            <h2 className="mt-2 text-2xl font-semibold text-[var(--foreground)]">Lo programado del mes</h2>
          </div>
          <Link href="/app/registrar?segment=movimiento">
            <Button size="sm">Registrar</Button>
          </Link>
        </div>
        <div className="mt-5 space-y-3">
          {events.length ? (
            events.map((event) => (
              <div
                key={event.id}
                className="flex items-start justify-between gap-4 rounded-2xl border border-[var(--line)] bg-[color:color-mix(in_srgb,var(--surface)_82%,var(--surface-2)_18%)] px-4 py-3"
              >
                <div>
                  <p className="font-medium text-[var(--foreground)]">{event.title}</p>
                  <p className="mt-1 text-sm text-[var(--muted)]">
                    {event.kind} - {formatDate(event.dueDate)}
                  </p>
                </div>
                <div className="text-right">
                  <Badge tone={event.status === "overdue" ? "danger" : event.kind === "income" ? "success" : "warning"}>
                    {getScheduledEventStatusLabel(event.status)}
                  </Badge>
                  <p className={`mt-2 font-semibold ${event.kind === "income" ? "text-[var(--success)]" : "text-[var(--foreground)]"}`}>
                    {event.kind === "income" ? "+" : "-"}
                    {formatCOP(event.amount)}
                  </p>
                </div>
              </div>
            ))
          ) : (
            <div className="rounded-2xl border border-dashed border-[var(--line)] bg-[color:color-mix(in_srgb,var(--surface)_74%,transparent)] p-6 text-sm text-[var(--muted)]">
              No hay agenda cargada para este mes.
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}

function monthMatches(value: string, monthKey: string) {
  const date = parseCalendarDate(value);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}` === monthKey;
}
