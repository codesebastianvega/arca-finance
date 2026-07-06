import Link from "next/link";
import { addDays, endOfMonth, endOfWeek, format, isSameMonth, isWithinInterval, startOfMonth, startOfWeek } from "date-fns";
import { deleteDebt, settleFinancialEvent, updateDebt } from "@/app/actions";
import { Badge, Button, Card, EmptyState, MetricCard } from "@/components/ui-kit";
import type { DashboardData } from "@/lib/dashboard-data";
import { formatCOP, formatDate, parseCalendarDate } from "@/lib/finance";
import type { ScheduledEvent } from "@/lib/types";

type FilterKey = "all" | "overdue" | "week" | "month";
type ViewKey = "list" | "calendar";

export function ObligationsScreen({
  data,
  selectedFilter = "all",
  selectedView = "list",
  monthKey,
  feedback,
}: {
  data: DashboardData;
  selectedFilter?: string;
  selectedView?: string;
  monthKey: string;
  feedback?: {
    saved?: boolean;
    updated?: string;
    deleted?: string;
    error?: string;
  };
}) {
  const filter = ["all", "overdue", "week", "month"].includes(selectedFilter) ? (selectedFilter as FilterKey) : "all";
  const view = selectedView === "calendar" ? "calendar" : ("list" as ViewKey);
  const monthDate = parseMonthKey(monthKey);
  const openEvents = data.scheduledEvents.filter(
    (event) => !["paid", "confirmed", "cancelled"].includes(event.status) && event.kind !== "income"
  );
  const filteredEvents = filterEvents(openEvents, filter, monthDate);
  const totalOpen = openEvents.reduce((sum, event) => sum + event.amount, 0);
  const overdueCount = openEvents.filter((event) => parseCalendarDate(event.dueDate) < startOfToday()).length;
  const nextSevenDays = openEvents.filter((event) =>
    isWithinInterval(parseCalendarDate(event.dueDate), { start: startOfToday(), end: addDays(startOfToday(), 7) })
  );
  const message = getObligationFeedback(feedback);

  return (
    <div className="space-y-6">
      <section className="rounded-[28px] border border-[var(--line)] bg-[var(--surface)] p-6 shadow-[0_16px_44px_rgba(16,16,16,0.06)]">
        <div className="max-w-4xl">
          <p className="text-xs uppercase tracking-[0.28em] text-[var(--muted)]">Obligaciones</p>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight text-[var(--foreground)] sm:text-5xl">
            Deudas, servicios, tarjetas y pagos por resolver.
          </h1>
          <p className="mt-4 text-sm leading-7 text-[var(--muted)]">
            Vista operativa unica para decidir que vence, con que se paga y que impacto deja sobre la caja.
          </p>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Obligaciones abiertas" value={String(openEvents.length)} delta={formatCOP(totalOpen)} tone="warning" />
        <MetricCard label="Vencidas" value={String(overdueCount)} delta="requieren accion hoy" tone={overdueCount > 0 ? "danger" : "success"} />
        <MetricCard label="Proximos 7 dias" value={String(nextSevenDays.length)} delta={formatCOP(nextSevenDays.reduce((sum, event) => sum + event.amount, 0))} tone="neutral" />
        <MetricCard label="Mes actual" value={format(monthDate, "MMMM yyyy")} delta={`${filteredEvents.length} visibles`} tone="neutral" />
      </section>

      {message ? (
        <Card className="p-4">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm text-[var(--foreground)]">{message.text}</p>
            <Badge tone={message.tone}>{message.label}</Badge>
          </div>
        </Card>
      ) : null}

      <section className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex flex-wrap gap-2">
          {[
            ["all", "Todas"],
            ["overdue", "Vencidas"],
            ["week", "Semana"],
            ["month", "Mes"],
          ].map(([key, label]) => (
            <Link
              key={key}
              href={`/app/obligaciones?filter=${key}&view=${view}&month=${monthKey}`}
              className={`inline-flex rounded-full px-4 py-2 text-sm font-medium transition ${
                filter === key ? "arca-chip-active" : "arca-chip"
              }`}
            >
              {label}
            </Link>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href={`/app/obligaciones?filter=${filter}&view=list&month=${monthKey}`}
            className={`inline-flex rounded-full px-4 py-2 text-sm font-medium transition ${
              view === "list" ? "arca-chip-active" : "arca-chip"
            }`}
          >
            Lista
          </Link>
          <Link
            href={`/app/obligaciones?filter=${filter}&view=calendar&month=${monthKey}`}
            className={`inline-flex rounded-full px-4 py-2 text-sm font-medium transition ${
              view === "calendar" ? "arca-chip-active" : "arca-chip"
            }`}
          >
            Calendario
          </Link>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[1.45fr,0.55fr]">
        <Card className="p-5">
          {view === "list" ? (
            <ObligationList events={filteredEvents} accounts={data.accounts} />
          ) : (
            <ObligationCalendar events={filteredEvents} monthDate={monthDate} />
          )}
        </Card>

        <div className="space-y-4">
          <Card className="p-5">
            <p className="text-xs uppercase tracking-[0.24em] text-[var(--muted)]">Resumen</p>
            <div className="mt-4 space-y-3">
              {data.debts.slice(0, 4).map((debt) => (
                <div key={debt.id} className="arca-soft-block rounded-2xl px-4 py-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-medium text-[var(--foreground)]">{debt.name}</p>
                      <p className="text-sm text-[var(--muted)]">{debt.lender}</p>
                    </div>
                    <p className="font-semibold text-[var(--foreground)]">{formatCOP(debt.balance)}</p>
                  </div>
                  <details className="mt-3 rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-3">
                    <summary className="cursor-pointer list-none text-sm text-[var(--foreground)]">Editar deuda</summary>
                    <div className="mt-3 grid gap-3 xl:grid-cols-[1fr,220px]">
                      <form action={updateDebt} className="grid gap-3 md:grid-cols-2">
                        <input type="hidden" name="debtId" value={debt.id} />
                        <label className="space-y-2">
                          <span className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">Nombre</span>
                          <input name="name" className="arca-focus arca-input text-sm" defaultValue={debt.name} required />
                        </label>
                        <label className="space-y-2">
                          <span className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">Entidad</span>
                          <input name="lender" className="arca-focus arca-input text-sm" defaultValue={debt.lender} required />
                        </label>
                        <label className="space-y-2">
                          <span className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">Tipo</span>
                          <input name="debtType" className="arca-focus arca-input text-sm" defaultValue={debt.debtType} />
                        </label>
                        <label className="space-y-2">
                          <span className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">Saldo actual</span>
                          <input name="balance" type="number" min="0" step="1" inputMode="numeric" className="arca-focus arca-input text-sm" defaultValue={debt.balance} required />
                        </label>
                        <label className="space-y-2">
                          <span className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">Monto prestado</span>
                          <input name="principalAmount" type="number" min="0" step="1" inputMode="numeric" className="arca-focus arca-input text-sm" defaultValue={debt.principalAmount ?? ""} />
                        </label>
                        <label className="space-y-2">
                          <span className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">Cuota</span>
                          <input name="installment" type="number" min="0" step="1" inputMode="numeric" className="arca-focus arca-input text-sm" defaultValue={debt.installment} required />
                        </label>
                        <label className="space-y-2">
                          <span className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">Proximo vencimiento</span>
                          <input name="nextDueDate" type="date" className="arca-focus arca-input text-sm" defaultValue={debt.nextDueDate.slice(0, 10)} required />
                        </label>
                        <label className="space-y-2">
                          <span className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">Prioridad</span>
                          <select name="priority" className="arca-focus arca-input text-sm" defaultValue={debt.priority}>
                            <option value="high">Alta</option>
                            <option value="medium">Media</option>
                            <option value="low">Baja</option>
                          </select>
                        </label>
                        <label className="space-y-2">
                          <span className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">Tasa anual</span>
                          <input name="annualInterestRate" type="number" min="0" step="0.01" className="arca-focus arca-input text-sm" defaultValue={debt.annualInterestRate ?? ""} />
                        </label>
                        <label className="space-y-2">
                          <span className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">Interes</span>
                          <input name="interestType" className="arca-focus arca-input text-sm" defaultValue={debt.interestType ?? ""} />
                        </label>
                        <label className="space-y-2">
                          <span className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">Meses plazo</span>
                          <input name="termMonths" type="number" min="0" className="arca-focus arca-input text-sm" defaultValue={debt.termMonths ?? ""} />
                        </label>
                        <label className="space-y-2">
                          <span className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">Meses restantes</span>
                          <input name="remainingMonths" type="number" min="0" className="arca-focus arca-input text-sm" defaultValue={debt.remainingMonths ?? ""} />
                        </label>
                        <label className="space-y-2 md:col-span-2">
                          <span className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">Total estimado</span>
                          <input name="estimatedTotalPayment" type="number" min="0" step="1" inputMode="numeric" className="arca-focus arca-input text-sm" defaultValue={debt.estimatedTotalPayment ?? ""} />
                        </label>
                        <label className="space-y-2 md:col-span-2">
                          <span className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">Notas</span>
                          <textarea name="notes" className="arca-focus arca-input arca-input-area text-sm" defaultValue={debt.notes ?? ""} />
                        </label>
                        <div className="md:col-span-2">
                          <Button type="submit" size="sm">Guardar cambios</Button>
                        </div>
                      </form>
                      <form action={deleteDebt}>
                        <input type="hidden" name="debtId" value={debt.id} />
                        <div className="rounded-2xl border border-[color:color-mix(in_srgb,var(--danger)_30%,var(--line)_70%)] bg-[color:color-mix(in_srgb,var(--danger-bg)_72%,transparent)] p-4">
                          <p className="text-sm leading-6 text-[var(--foreground)]">
                            Solo puedes borrar una deuda sin pagos ni movimientos asociados.
                          </p>
                          <Button type="submit" size="sm" variant="secondary" className="mt-4 w-full justify-center">
                            Borrar deuda
                          </Button>
                        </div>
                      </form>
                    </div>
                  </details>
                </div>
              ))}
              {data.cards.slice(0, 3).map((card) => (
                <div key={card.id} className="arca-soft-block rounded-2xl px-4 py-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-medium text-[var(--foreground)]">{card.name}</p>
                      <p className="text-sm text-[var(--muted)]">{card.issuer}</p>
                    </div>
                    <p className="font-semibold text-[var(--foreground)]">{formatCOP(card.used)}</p>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-5">
            <p className="text-xs uppercase tracking-[0.24em] text-[var(--muted)]">Ir a detalle</p>
            <div className="mt-4 space-y-2 text-sm">
              <Link href="/app/dinero/tarjetas" className="arca-soft-block block rounded-xl px-4 py-3 text-[var(--foreground)]">
                Ver tarjetas
              </Link>
              <Link href="/app/planeacion/mes" className="arca-soft-block block rounded-xl px-4 py-3 text-[var(--foreground)]">
                Ver mes
              </Link>
              <Link href="/app/historial" className="arca-soft-block block rounded-xl px-4 py-3 text-[var(--foreground)]">
                Ver historial
              </Link>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

function getObligationFeedback(feedback?: {
  saved?: boolean;
  updated?: string;
  deleted?: string;
  error?: string;
}) {
  if (!feedback) return null;
  if (feedback.updated === "debt") return { text: "La deuda se actualizo correctamente.", tone: "success" as const, label: "Actualizada" };
  if (feedback.deleted === "debt") return { text: "La deuda se borro correctamente.", tone: "success" as const, label: "Borrada" };
  if (feedback.saved) return { text: "La obligacion se creo correctamente.", tone: "success" as const, label: "Guardada" };
  if (feedback.error === "linked_debt") return { text: "No puedes borrar una deuda con pagos o movimientos asociados.", tone: "danger" as const, label: "Bloqueada" };
  if (feedback.error) return { text: "No se pudo completar la accion sobre la obligacion.", tone: "danger" as const, label: "Error" };
  return null;
}

function ObligationList({ events, accounts }: { events: ScheduledEvent[]; accounts: DashboardData["accounts"] }) {
  if (!events.length) {
    return (
      <EmptyState
        title="No hay pagos cargados todavía"
        description="Agrega arriendo, servicios, deudas o tarjetas para que Arca te ayude a priorizar."
        actions={
          <Link href="/app/registrar?segment=deuda">
            <Button size="sm">Agregar obligación</Button>
          </Link>
        }
      />
    );
  }

  return (
    <div className="space-y-2">
      {events.map((event) => {
        const funding = suggestFunding(accounts, event.amount);
        const dueDate = parseCalendarDate(event.dueDate);
        const overdue = dueDate < startOfToday();
        const tone = overdue ? "danger" : funding.mode === "wait" ? "warning" : funding.mode === "combine" ? "warning" : "success";

        return (
          <div key={event.id} className="arca-soft-block rounded-2xl px-4 py-4">
            <div className="grid gap-3 xl:grid-cols-[1.35fr,0.6fr,0.95fr] xl:items-center">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <p className={`text-lg font-semibold ${overdue ? "text-[var(--danger)]" : "text-[var(--foreground)]"}`}>{event.title}</p>
                  <Badge tone={tone}>{labelForEvent(event, funding.mode)}</Badge>
                </div>
                <p className="mt-1 text-sm text-[var(--muted)]">
                  {overdue ? "Vencio" : "Vence"} {formatDate(event.dueDate)}
                </p>
                <p className="mt-2 text-sm text-[var(--muted)]">{funding.label}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">Monto</p>
                <p className="mt-1 text-2xl font-semibold text-[var(--foreground)]">{formatCOP(event.amount)}</p>
              </div>
              <form action={settleFinancialEvent} className="flex flex-col gap-2 xl:items-end">
                <input type="hidden" name="eventId" value={event.id} />
                <select
                  name="accountId"
                  className="arca-focus arca-input h-10 rounded-xl px-3 text-sm xl:min-w-[240px]"
                  required
                >
                  {accounts.map((account) => (
                    <option key={account.id} value={account.id}>
                      {account.name} - {formatCOP(account.balance)}
                    </option>
                  ))}
                </select>
                <Button type="submit" size="sm">
                  Pagar ahora
                </Button>
              </form>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function ObligationCalendar({ events, monthDate }: { events: ScheduledEvent[]; monthDate: Date }) {
  const monthStart = startOfMonth(monthDate);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calendarEnd = endOfWeek(endOfMonth(monthDate), { weekStartsOn: 1 });
  const days: Date[] = [];

  for (let cursor = new Date(calendarStart); cursor <= calendarEnd; cursor = addDays(cursor, 1)) {
    days.push(new Date(cursor));
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.24em] text-[var(--muted)]">Calendario</p>
          <h2 className="mt-2 text-2xl font-semibold text-[var(--foreground)]">{format(monthDate, "MMMM yyyy")}</h2>
        </div>
      </div>
      <div className="grid grid-cols-7 gap-2 text-xs uppercase tracking-[0.16em] text-[var(--muted)]">
        {["Lun", "Mar", "Mie", "Jue", "Vie", "Sab", "Dom"].map((day) => (
          <div key={day} className="px-2 py-1">
            {day}
          </div>
        ))}
      </div>
      <div className="mt-2 grid grid-cols-7 gap-2">
        {days.map((day) => {
          const dayEvents = events.filter((event) => sameDay(parseCalendarDate(event.dueDate), day));
          const outside = !isSameMonth(day, monthDate);

          return (
            <div key={day.toISOString()} className={`min-h-[120px] rounded-2xl border p-2 ${outside ? "border-[var(--line)]/40 bg-[color:color-mix(in_srgb,var(--surface)_58%,transparent)]" : "arca-soft-block"}`}>
              <p className={`text-sm font-semibold ${outside ? "text-[var(--muted)]" : "text-[var(--foreground)]"}`}>{format(day, "d")}</p>
              <div className="mt-2 space-y-2">
                {dayEvents.slice(0, 3).map((event) => (
                  <div key={event.id} className="rounded-xl bg-[var(--surface-2)] px-2 py-1">
                    <p className="truncate text-xs font-medium text-[var(--foreground)]">{event.title}</p>
                    <p className="text-xs text-[var(--muted)]">{formatCOP(event.amount)}</p>
                  </div>
                ))}
                {dayEvents.length > 3 ? <p className="text-xs text-[var(--muted)]">+{dayEvents.length - 3} mas</p> : null}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function suggestFunding(accounts: DashboardData["accounts"], amount: number) {
  const sorted = [...accounts].sort((a, b) => b.balance - a.balance);
  const direct = sorted.find((account) => account.balance >= amount);

  if (direct) {
    return { mode: "ready" as const, label: `Pagar desde ${direct.name}` };
  }

  const total = sorted.reduce((sum, account) => sum + account.balance, 0);
  if (total >= amount && sorted[0]) {
    return { mode: "combine" as const, label: `Mover entre cuentas, empieza por ${sorted[0].name}` };
  }

  return { mode: "wait" as const, label: `Falta caja: ${formatCOP(Math.max(0, amount - total))}` };
}

function labelForEvent(event: ScheduledEvent, fundingMode: "ready" | "combine" | "wait") {
  if (event.kind === "debt_payment") {
    return fundingMode === "wait" ? "deuda sin caja" : "deuda";
  }

  if (event.kind === "card_payment") {
    return fundingMode === "wait" ? "tarjeta sin caja" : "tarjeta";
  }

  if (event.kind === "expense") {
    return fundingMode === "wait" ? "servicio sin caja" : "gasto";
  }

  return event.kind;
}

function filterEvents(events: ScheduledEvent[], filter: FilterKey, monthDate: Date) {
  const today = startOfToday();

  if (filter === "overdue") {
    return events.filter((event) => parseCalendarDate(event.dueDate) < today);
  }

  if (filter === "week") {
    return events.filter((event) =>
      isWithinInterval(parseCalendarDate(event.dueDate), { start: today, end: addDays(today, 7) })
    );
  }

  if (filter === "month") {
    return events.filter((event) => isSameMonth(parseCalendarDate(event.dueDate), monthDate));
  }

  return [...events].sort((a, b) => parseCalendarDate(a.dueDate).getTime() - parseCalendarDate(b.dueDate).getTime());
}

function parseMonthKey(value: string) {
  const [year, month] = value.split("-").map(Number);
  return new Date(year, (month || 1) - 1, 1);
}

function sameDay(left: Date, right: Date) {
  return left.getFullYear() === right.getFullYear() && left.getMonth() === right.getMonth() && left.getDate() === right.getDate();
}

function startOfToday() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}
