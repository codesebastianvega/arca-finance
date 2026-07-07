import Link from "next/link";
import { createBusinessUnit, createIncomeSource, deleteBusinessUnit, deleteIncomeSource, updateBusinessUnit, updateIncomeSource } from "@/app/actions";
import { Badge, Button, Card, EmptyState, MetricCard } from "@/components/ui-kit";
import type { DashboardData } from "@/lib/dashboard-data";
import { formatCOP, parseCalendarDate } from "@/lib/finance";

type BusinessFilters = {
  month: string;
};

type UnitSnapshot = {
  unit: string;
  name: string;
  realIncome: number;
  realExpense: number;
  realNet: number;
  expectedIncome: number;
  expectedOutflow: number;
  projectedNet: number;
  pendingEvents: number;
  configured: boolean;
};

const fieldClass = "arca-focus arca-input text-sm";

export function BusinessScreen({
  data,
  filters,
  feedback,
}: {
  data: DashboardData;
  filters: BusinessFilters;
  feedback?: {
    saved?: boolean;
    updated?: boolean;
    deleted?: boolean;
    sourceSaved?: boolean;
    sourceUpdated?: boolean;
    sourceDeleted?: boolean;
    error?: string;
  };
}) {
  const snapshot = buildSnapshot(data, filters.month);
  const units = [...data.business].sort((left, right) => left.name.localeCompare(right.name));
  const sourceGroups = new Map(
    units.map((unit) => [
      unit.id,
      data.incomeSources
        .filter((source) => source.businessUnitKey === unit.id)
        .sort((left, right) => left.name.localeCompare(right.name)),
    ])
  );
  const totals = snapshot.reduce(
    (acc, item) => {
      acc.realIncome += item.realIncome;
      acc.realExpense += item.realExpense;
      acc.expectedIncome += item.expectedIncome;
      acc.expectedOutflow += item.expectedOutflow;
      acc.pendingEvents += item.pendingEvents;
      return acc;
    },
    { realIncome: 0, realExpense: 0, expectedIncome: 0, expectedOutflow: 0, pendingEvents: 0 }
  );
  const message = getBusinessFeedback(feedback);

  return (
    <div className="space-y-4 sm:space-y-6">
      <section className="rounded-2xl sm:rounded-[28px] border border-[var(--line)] bg-[var(--surface)] p-4 sm:p-6 shadow-[var(--elevation-strong)]">
        <div className="max-w-4xl">
          <p className="text-[10px] sm:text-xs uppercase tracking-[0.28em] text-[var(--muted)]">Fuentes y frentes</p>
          <h1 className="mt-2 sm:mt-3 text-2xl font-semibold tracking-tight text-[var(--foreground)] sm:text-4xl md:text-5xl">Origen del ingreso y lectura por frente real.</h1>
          <p className="mt-2 sm:mt-4 text-sm leading-6 text-[var(--muted)] sm:text-base sm:leading-7">
            Aqui separas dos cosas distintas: el frente economico y la fuente concreta que trae la plata.
          </p>
        </div>
      </section>

      {message ? (
        <Card className="p-4">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm text-[var(--foreground)]">{message.text}</p>
            <Badge tone={message.tone}>{message.label}</Badge>
          </div>
        </Card>
      ) : null}

      <section className="grid gap-3 grid-cols-1 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Ingreso real" value={formatCOP(totals.realIncome)} delta="Movimientos confirmados" tone="success" />
        <MetricCard label="Gasto real" value={formatCOP(totals.realExpense)} delta="Solo caja posteada" tone="warning" />
        <MetricCard label="Ingreso esperado" value={formatCOP(totals.expectedIncome)} delta={`${totals.pendingEvents} eventos abiertos`} tone="neutral" />
        <MetricCard
          label="Balance proyectado"
          value={formatCOP(totals.realIncome - totals.realExpense + totals.expectedIncome - totals.expectedOutflow)}
          delta={`Salidas pendientes: ${formatCOP(totals.expectedOutflow)}`}
          tone={totals.realIncome - totals.realExpense + totals.expectedIncome - totals.expectedOutflow >= 0 ? "success" : "danger"}
        />
      </section>

      <div className="grid gap-6 xl:grid-cols-[1.15fr,0.85fr]">
        <Card className="p-5">
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <form action="/app/negocios" className="flex flex-wrap gap-3">
              <label className="space-y-2">
                <span className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">Mes</span>
                <input name="month" type="month" defaultValue={filters.month} className={fieldClass} />
              </label>
              <div className="flex items-end gap-3">
                <Button type="submit" size="sm">
                  Ver corte
                </Button>
                <Link
                  href="/app/registrar?segment=movimiento"
                  className="inline-flex h-9 items-center rounded-xl border border-[var(--border)] border-t-[var(--border-top-highlight)] bg-[var(--bg-surface-2)] px-3 text-sm text-[var(--text-primary)]"
                >
                  Registrar movimiento
                </Link>
              </div>
            </form>
            <p className="text-sm text-[var(--muted)]">Usa esta vista para separar lo personal de tus otras fuentes de ingreso.</p>
          </div>
        </Card>

        <div className="grid gap-6">
          <Card id="new-unit" className="p-5">
            <p className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">Crear frente</p>
            <h2 className="mt-2 text-2xl font-semibold text-[var(--foreground)]">Nuevo frente economico</h2>
            <form action={createBusinessUnit} className="mt-5 grid gap-3">
              <label className="space-y-2">
                <span className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">Nombre visible</span>
                <input name="name" className={fieldClass} placeholder="Personal, Uxio, Freelance..." required />
              </label>
              <label className="space-y-2">
                <span className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">Clave opcional</span>
                <input name="key" className={fieldClass} placeholder="personal, uxio, freelance" />
              </label>
              <Button type="submit" size="sm">
                Crear frente
              </Button>
            </form>
          </Card>

          <Card id="new-source" className="p-5">
            <p className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">Crear fuente</p>
            <h2 className="mt-2 text-2xl font-semibold text-[var(--foreground)]">Nueva fuente de ingreso</h2>
            {units.length ? (
              <form action={createIncomeSource} className="mt-5 grid gap-3">
                <label className="space-y-2">
                  <span className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">Nombre visible</span>
                  <input name="name" className={fieldClass} placeholder="Nomina, contrato mensual, comisiones..." required />
                </label>
                <label className="space-y-2">
                  <span className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">Frente</span>
                  <select name="businessUnitKey" className={fieldClass} required defaultValue={units[0]?.id}>
                    {units.map((unit) => (
                      <option key={unit.id} value={unit.id}>
                        {unit.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="space-y-2">
                  <span className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">Tipo</span>
                  <input name="type" className={fieldClass} defaultValue="manual" />
                </label>
                <Button type="submit" size="sm">
                  Crear fuente
                </Button>
              </form>
            ) : (
              <EmptyState
                title="Primero crea un frente"
                description="La fuente siempre debe colgar de un frente economico."
                actions={
                  <a href="#new-unit">
                    <Button size="sm">Crear frente</Button>
                  </a>
                }
                className="mt-4 p-4"
              />
            )}
          </Card>
        </div>
      </div>

      {snapshot.length ? (
        <div className="space-y-4">
          {snapshot.map((item) => {
            const sources = sourceGroups.get(item.unit) ?? [];

            return (
              <Card key={item.unit} className="p-5">
                <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-3">
                      <h2 className="text-2xl font-semibold text-[var(--foreground)]">{item.name}</h2>
                      <Badge tone={item.realNet >= 0 ? "success" : "danger"}>{item.realNet >= 0 ? "Real positivo" : "Real negativo"}</Badge>
                      {item.configured ? <Badge tone="neutral">Configurado</Badge> : <Badge tone="warning">Solo actividad</Badge>}
                    </div>
                    <p className="mt-2 text-sm text-[var(--muted)]">
                      {item.pendingEvents} eventos abiertos. Proyeccion neta del mes: {formatCOP(item.projectedNet)}.
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
                    <Link href="/app/registrar?segment=movimiento" className="text-sm text-[var(--muted)] underline-offset-4 hover:underline">
                      Registrar en este frente
                    </Link>
                    {item.configured ? (
                      <details className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-3">
                        <summary className="cursor-pointer list-none text-sm text-[var(--foreground)]">Editar frente</summary>
                        <div className="mt-3 grid gap-3">
                          <form action={updateBusinessUnit} className="grid gap-3">
                            <input type="hidden" name="key" value={item.unit} />
                            <label className="space-y-2">
                              <span className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">Nombre visible</span>
                              <input name="name" className={fieldClass} defaultValue={item.name} required />
                            </label>
                            <div className="text-xs text-[var(--muted)]">La clave interna queda fija para no romper historial y agenda.</div>
                            <Button type="submit" size="sm">
                              Guardar
                            </Button>
                          </form>
                          <form action={deleteBusinessUnit}>
                            <input type="hidden" name="key" value={item.unit} />
                            <Button type="submit" size="sm" variant="secondary">
                              Borrar frente
                            </Button>
                          </form>
                        </div>
                      </details>
                    ) : null}
                  </div>
                </div>

                <div className="mt-5 grid gap-4 xl:grid-cols-2">
                  <div className="arca-soft-block rounded-2xl p-4">
                    <p className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">Real</p>
                    <div className="mt-4 grid gap-3 md:grid-cols-3">
                      <MetricMini label="Ingresos" value={formatCOP(item.realIncome)} />
                      <MetricMini label="Gastos" value={formatCOP(item.realExpense)} />
                      <MetricMini label="Neto" value={formatCOP(item.realNet)} tone={item.realNet >= 0 ? "success" : "danger"} />
                    </div>
                  </div>
                  <div className="arca-soft-block rounded-2xl p-4">
                    <p className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">Pendiente o programado</p>
                    <div className="mt-4 grid gap-3 md:grid-cols-3">
                      <MetricMini label="Por entrar" value={formatCOP(item.expectedIncome)} />
                      <MetricMini label="Por salir" value={formatCOP(item.expectedOutflow)} />
                      <MetricMini label="Proyectado" value={formatCOP(item.projectedNet)} tone={item.projectedNet >= 0 ? "success" : "danger"} />
                    </div>
                  </div>
                </div>

                <div className="mt-5">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">Fuentes ligadas</p>
                    <a href="#new-source" className="text-sm text-[var(--muted)] underline-offset-4 hover:underline">
                      Crear fuente
                    </a>
                  </div>
                  <div className="mt-3 space-y-3">
                    {sources.length ? (
                      sources.map((source) => (
                        <div key={source.id} className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] px-4 py-3">
                          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                            <div>
                              <p className="font-medium text-[var(--foreground)]">{source.name}</p>
                              <p className="text-sm text-[var(--muted)]">{source.type}</p>
                            </div>
                            <Badge tone={source.active ? "success" : "warning"}>{source.active ? "Activa" : "Pausada"}</Badge>
                          </div>
                          <details className="mt-3 rounded-2xl border border-[var(--line)] bg-[color:color-mix(in_srgb,var(--surface-2)_82%,transparent)] p-3">
                            <summary className="cursor-pointer list-none text-sm text-[var(--foreground)]">Editar fuente</summary>
                            <div className="mt-3 grid gap-3 xl:grid-cols-[1fr,220px]">
                              <form action={updateIncomeSource} className="grid gap-3">
                                <input type="hidden" name="sourceId" value={source.id} />
                                <label className="space-y-2">
                                  <span className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">Nombre visible</span>
                                  <input name="name" className={fieldClass} defaultValue={source.name} required />
                                </label>
                                <label className="space-y-2">
                                  <span className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">Tipo</span>
                                  <input name="type" className={fieldClass} defaultValue={source.type} />
                                </label>
                                <label className="flex items-center gap-2 text-sm text-[var(--foreground)]">
                                  <input type="checkbox" name="active" defaultChecked={source.active} />
                                  Fuente activa
                                </label>
                                <Button type="submit" size="sm">
                                  Guardar fuente
                                </Button>
                              </form>
                              <form action={deleteIncomeSource}>
                                <input type="hidden" name="sourceId" value={source.id} />
                                <Button type="submit" size="sm" variant="secondary">
                                  Borrar fuente
                                </Button>
                              </form>
                            </div>
                          </details>
                        </div>
                      ))
                    ) : (
                      <div className="arca-muted-block rounded-2xl p-4 text-sm text-[var(--muted)]">
                        Este frente aun no tiene fuentes ligadas.
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      ) : (
        <EmptyState
          title="Aun no has creado frentes de ingreso"
          description="Empieza por separar Personal, Freelance o el nombre de tu negocio."
          actions={
            <a href="#new-unit">
              <Button size="sm">Crear frente</Button>
            </a>
          }
          className="p-6"
        />
      )}
    </div>
  );
}

function getBusinessFeedback(feedback?: {
  saved?: boolean;
  updated?: boolean;
  deleted?: boolean;
  sourceSaved?: boolean;
  sourceUpdated?: boolean;
  sourceDeleted?: boolean;
  error?: string;
}) {
  if (!feedback) return null;
  if (feedback.sourceUpdated) return { text: "La fuente se actualizo correctamente.", tone: "success" as const, label: "Fuente" };
  if (feedback.sourceDeleted) return { text: "La fuente se borro correctamente.", tone: "success" as const, label: "Fuente" };
  if (feedback.sourceSaved) return { text: "La fuente se creo correctamente.", tone: "success" as const, label: "Fuente" };
  if (feedback.updated) return { text: "El frente se actualizo correctamente.", tone: "success" as const, label: "Frente" };
  if (feedback.deleted) return { text: "El frente se borro correctamente.", tone: "success" as const, label: "Frente" };
  if (feedback.saved) return { text: "El frente se creo correctamente.", tone: "success" as const, label: "Frente" };
  if (feedback.error) return { text: "No se pudo completar la accion sobre frentes o fuentes.", tone: "danger" as const, label: "Error" };
  return null;
}

function buildSnapshot(data: DashboardData, month: string): UnitSnapshot[] {
  const configured = new Map<string, { name: string }>();
  data.business.forEach((item) => configured.set(item.id, { name: item.name }));

  const units = new Set<string>();
  data.transactions.forEach((item) => {
    if (item.unit) units.add(item.unit);
  });
  data.scheduledEvents.forEach((item) => {
    if (item.unit) units.add(item.unit);
  });
  data.business.forEach((item) => units.add(item.id));

  return [...units]
    .map((unit) => {
      const tx = data.transactions.filter((item) => item.unit === unit && monthMatches(item.date, month) && item.status !== "cancelled");
      const events = data.scheduledEvents.filter(
        (item) => item.unit === unit && monthMatches(item.dueDate, month) && !["paid", "confirmed", "cancelled"].includes(item.status)
      );
      const realIncome = tx.filter((item) => item.kind === "income").reduce((sum, item) => sum + item.amount, 0);
      const realExpense = tx.filter((item) => item.kind !== "income").reduce((sum, item) => sum + item.amount, 0);
      const expectedIncome = events.filter((item) => item.kind === "income").reduce((sum, item) => sum + item.amount, 0);
      const expectedOutflow = events.filter((item) => item.kind !== "income").reduce((sum, item) => sum + item.amount, 0);
      const configuredUnit = configured.get(unit);

      return {
        unit,
        name: configuredUnit?.name ?? prettifyUnitName(unit),
        realIncome,
        realExpense,
        realNet: realIncome - realExpense,
        expectedIncome,
        expectedOutflow,
        projectedNet: realIncome - realExpense + expectedIncome - expectedOutflow,
        pendingEvents: events.length,
        configured: Boolean(configuredUnit),
      };
    })
    .sort((left, right) => {
      if (right.projectedNet !== left.projectedNet) return right.projectedNet - left.projectedNet;
      return left.name.localeCompare(right.name);
    });
}

function prettifyUnitName(value: string) {
  return value
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function monthMatches(value: string, month: string) {
  const date = parseCalendarDate(value);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}` === month;
}

function MetricMini({
  label,
  value,
  tone = "neutral",
}: {
  label: string;
  value: string;
  tone?: "neutral" | "success" | "danger";
}) {
  return (
    <div className="rounded-xl border border-[var(--line)] bg-[var(--surface)] px-3 py-3">
      <p className="text-xs uppercase tracking-[0.16em] text-[var(--muted)]">{label}</p>
      <p className={`mt-2 text-lg font-semibold ${tone === "danger" ? "text-[var(--danger)]" : tone === "success" ? "text-[var(--success)]" : "text-[var(--foreground)]"}`}>
        {value}
      </p>
    </div>
  );
}
