import { addDays, endOfMonth, endOfWeek, format, isSameMonth, startOfMonth, startOfWeek } from "date-fns";
import { Card, MetricCard } from "@/components/ui-kit";
import type { DashboardData } from "@/lib/dashboard-data";
import { formatCOP, parseCalendarDate } from "@/lib/finance";

export function CalendarScreen({ data, monthKey }: { data: DashboardData; monthKey: string }) {
  const monthDate = parseMonthKey(monthKey);
  const events = data.scheduledEvents.filter((item) => monthMatches(item.dueDate, monthKey));
  const monthStart = startOfMonth(monthDate);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calendarEnd = endOfWeek(endOfMonth(monthDate), { weekStartsOn: 1 });
  const days: Date[] = [];

  for (let cursor = new Date(calendarStart); cursor <= calendarEnd; cursor = addDays(cursor, 1)) {
    days.push(new Date(cursor));
  }

  return (
    <div className="space-y-6">
      <section className="rounded-[28px] border border-[var(--line)] bg-[var(--surface)] p-6 shadow-[var(--elevation-strong)]">
        <div className="max-w-4xl">
          <p className="text-xs uppercase tracking-[0.28em] text-[var(--muted)]">Calendario</p>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight text-[var(--foreground)] sm:text-5xl">Agenda financiera mensual.</h1>
          <p className="mt-4 text-sm leading-7 text-[var(--muted)]">Cuadricula mensual alimentada por ingresos esperados y pagos programados.</p>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <MetricCard label="Eventos del mes" value={String(events.length)} delta={monthKey} tone="neutral" />
        <MetricCard label="Ingresos del mes" value={formatCOP(events.filter((item) => item.kind === "income").reduce((sum, item) => sum + item.amount, 0))} delta="Agenda esperada" tone="success" />
        <MetricCard label="Salidas del mes" value={formatCOP(events.filter((item) => item.kind !== "income").reduce((sum, item) => sum + item.amount, 0))} delta="Compromisos programados" tone="warning" />
      </section>

      <Card className="p-5">
        <div>
          <p className="text-xs uppercase tracking-[0.24em] text-[var(--muted)]">Vista mensual</p>
          <h2 className="mt-2 text-2xl font-semibold text-[var(--foreground)]">{format(monthDate, "MMMM yyyy")}</h2>
        </div>
        <div className="mt-5 grid grid-cols-7 gap-2 text-xs uppercase tracking-[0.16em] text-[var(--muted)]">
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
              <div
                key={day.toISOString()}
                className={`rounded-2xl border p-2 ${outside ? "arca-muted-block min-h-[120px]" : "arca-soft-block min-h-[120px]"}`}
              >
                <p className={`text-sm font-semibold ${outside ? "text-[var(--muted)]" : "text-[var(--foreground)]"}`}>{format(day, "d")}</p>
                <div className="mt-2 space-y-2">
                  {dayEvents.slice(0, 3).map((event) => (
                    <div key={event.id} className="rounded-xl bg-[var(--surface-2)] px-2 py-1">
                      <p className="truncate text-xs font-medium text-[var(--foreground)]">{event.title}</p>
                      <p className="text-xs text-[var(--muted)]">{formatCOP(event.amount)}</p>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}

function parseMonthKey(value: string) {
  const [year, month] = value.split("-").map(Number);
  return new Date(year, (month || 1) - 1, 1);
}

function monthMatches(value: string, monthKey: string) {
  const date = parseCalendarDate(value);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}` === monthKey;
}

function sameDay(left: Date, right: Date) {
  return left.getFullYear() === right.getFullYear() && left.getMonth() === right.getMonth() && left.getDate() === right.getDate();
}
