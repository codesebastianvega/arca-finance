import { AlertTriangle, ArrowDownLeft, ArrowRightLeft, PiggyBank, ShieldAlert } from "lucide-react";
import { confirmScheduledEventNow } from "@/app/actions";
import { Badge, Card, MetricCard } from "@/components/ui-kit";
import type { DashboardData } from "@/lib/dashboard-data";
import { formatCOP, formatDate } from "@/lib/finance";
import { getScheduledEventStatusLabel } from "@/lib/template-generation";
import { cn } from "@/lib/utils";
import { buildDecisionDashboard, getFundingLabel, type DecisionDashboard } from "../services/build-decision-dashboard";

export function DecisionDashboardView({
  data,
  month,
  summary: providedSummary,
}: {
  data: DashboardData;
  month?: Date;
  summary?: DecisionDashboard;
}) {
  const summary = providedSummary ?? buildDecisionDashboard(data, month);
  const cashAfterCommitments = summary.freeCash - summary.monthlyCommitments;

  return (
    <div className="space-y-4 sm:space-y-6">
      <section className="rounded-2xl sm:rounded-[28px] border border-[var(--line)] bg-[var(--surface)] p-4 sm:p-6 shadow-[0_16px_44px_rgba(16,16,16,0.06)]">
        <div className="max-w-3xl">
          <p className="text-[10px] sm:text-xs uppercase tracking-[0.28em] text-[var(--muted)]">Hoy</p>
          <h1 className="mt-2 sm:mt-3 text-2xl font-semibold tracking-tight text-[var(--foreground)] sm:text-4xl md:text-5xl">
            Caja disponible, compromisos y decisiones del mes.
          </h1>
          <div className="arca-soft-block mt-3 sm:mt-5 rounded-2xl p-3 sm:p-4">
            <p className="text-sm font-medium text-[var(--foreground)]">Lectura rapida</p>
            <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
              Tienes {formatCOP(summary.currentCash)} en caja visible. El mes exige {formatCOP(summary.monthlyCommitments)} en
              compromisos programados, con {formatCOP(summary.monthlyExpectedIncome)} entrando si se cumple el flujo esperado.
            </p>
          </div>
        </div>
      </section>

      <section className="grid gap-3 grid-cols-1 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Dinero actual" value={formatCOP(summary.currentCash)} delta={`Caja libre hoy: ${formatCOP(summary.freeCash)}`} tone="success" />
        <MetricCard
          label="Ingresos estimados"
          value={formatCOP(summary.monthlyExpectedIncome)}
          delta={summary.nextIncome ? `Siguiente entrada: ${summary.nextIncome.title}` : "Sin ingresos programados"}
          tone="neutral"
        />
        <MetricCard
          label="Compromisos del mes"
          value={formatCOP(summary.monthlyCommitments)}
          delta={`${summary.overdueCount} vencidos o atrasados`}
          tone={summary.overdueCount > 0 ? "danger" : "warning"}
        />
        <MetricCard
          label="Libre despues de pagos"
          value={formatCOP(cashAfterCommitments)}
          delta={`Sin contar ingresos esperados. Ahorro protegido: ${formatCOP(summary.protectedSavings)}`}
          tone={cashAfterCommitments >= 0 ? "success" : "danger"}
        />
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.5fr,1fr]">
        <Card className="overflow-hidden">
          <div className="border-b border-[var(--line)] px-5 py-4">
            <p className="text-xs uppercase tracking-[0.24em] text-[var(--muted)]">Linea de caja</p>
            <div className="mt-2 flex items-center justify-between gap-4">
              <h2 className="text-2xl font-semibold text-[var(--foreground)]">Urgente y pagable</h2>
              <Badge tone={summary.overdueCount > 0 ? "danger" : "neutral"}>{summary.urgentItems.length} eventos</Badge>
            </div>
          </div>
          <div className="max-h-[720px] divide-y divide-[var(--line)] overflow-y-auto">
            {summary.urgentItems.map((item) => {
              const tone =
                item.urgency === "overdue" ? "danger" : item.funding.status === "wait" ? "warning" : item.kind === "income" ? "success" : "neutral";

              return (
                <div key={item.id} className="grid gap-3 px-5 py-4 md:grid-cols-[1.4fr,140px,1fr] md:items-center">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className={cn("text-lg font-semibold", item.urgency === "overdue" ? "text-[var(--danger)]" : "text-[var(--foreground)]")}>
                        {item.title}
                      </p>
                      <Badge tone={tone}>
                        {item.urgency === "overdue"
                          ? "vencido"
                          : item.kind === "income"
                            ? "entra plata"
                            : item.funding.status === "wait"
                              ? "falta caja"
                              : item.funding.status === "combine"
                                ? "mover entre cuentas"
                                : "se puede pagar"}
                      </Badge>
                    </div>
                    <p className="mt-1 text-sm text-[var(--muted)]">
                      {getScheduledEventStatusLabel(item.status)} - {formatDate(item.dueDate)}
                    </p>
                  </div>
                  <div>
                    <p className={cn("text-xl font-semibold", item.kind === "income" ? "text-[var(--success)]" : "text-[var(--foreground)]")}>
                      {item.kind === "income" ? "+" : "-"}
                      {formatCOP(item.amount)}
                    </p>
                  </div>
                  <div className="arca-soft-block rounded-2xl p-3">
                    <p className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">Accion sugerida</p>
                    <p className={cn("mt-2 text-sm font-semibold", item.funding.status === "wait" ? "text-[var(--danger)]" : "text-[var(--foreground)]")}>
                      {getFundingLabel(item)}
                    </p>
                    {item.funding.balanceAfter != null ? (
                      <p className="mt-1 text-sm text-[var(--muted)]">Caja despues: {formatCOP(item.funding.balanceAfter)}</p>
                    ) : null}
                    {item.canConfirmQuickly ? (
                      <form action={confirmScheduledEventNow} className="mt-3">
                        <input type="hidden" name="eventId" value={item.id} />
                        <button
                          type="submit"
                          className="arca-primary-action arca-focus inline-flex h-9 items-center rounded-xl px-3 text-sm font-medium"
                        >
                          Confirmar
                        </button>
                      </form>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        <div className="space-y-6">
          <Card className="p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[var(--danger-bg)] text-[var(--danger)]">
                <ShieldAlert size={18} />
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.24em] text-[var(--muted)]">Riesgo</p>
                <h2 className="text-xl font-semibold">Presion financiera</h2>
              </div>
            </div>
            <div className="mt-4 space-y-3">
              <div className="arca-soft-block rounded-2xl p-4">
                <p className="text-sm text-[var(--muted)]">Deuda viva</p>
                <p className="mt-1 text-2xl font-semibold">{formatCOP(summary.debtExposure)}</p>
              </div>
              <div className="arca-soft-block rounded-2xl p-4">
                <p className="text-sm text-[var(--muted)]">Gasto ya posteado este mes</p>
                <p className="mt-1 text-2xl font-semibold">{formatCOP(summary.monthlyPostedExpenses)}</p>
              </div>
            </div>
          </Card>

          <Card className="p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[var(--success-bg)] text-[var(--success)]">
                <PiggyBank size={18} />
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.24em] text-[var(--muted)]">Ahorro</p>
                <h2 className="text-xl font-semibold">Bolsillos protegidos</h2>
              </div>
            </div>
            <div className="mt-4 space-y-3">
              {summary.savings.length > 0 ? (
                summary.savings.map((goal) => (
                  <div key={goal.id} className="arca-soft-block rounded-2xl p-4">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-semibold">{goal.name}</p>
                      <p className="text-sm text-[var(--muted)]">{formatCOP(goal.current)}</p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="arca-muted-block rounded-2xl p-4 text-sm text-[var(--muted)]">
                  Aun no hay bolsillos o metas creadas.
                </div>
              )}
            </div>
          </Card>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <Card className="p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[var(--surface-2)]">
              <ArrowRightLeft size={18} />
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.22em] text-[var(--muted)]">Cuentas</p>
              <p className="text-lg font-semibold">Donde esta la caja</p>
            </div>
          </div>
          <div className="mt-4 space-y-3">
            {summary.accountsByBalance.slice(0, 5).map((account) => (
              <div key={account.id} className="arca-soft-block flex items-center justify-between gap-3 rounded-2xl px-4 py-3">
                <div className="min-w-0">
                  <p className="truncate font-medium">{account.name}</p>
                  <p className="text-sm text-[var(--muted)]">{account.type}</p>
                </div>
                <p className="text-sm font-semibold">{formatCOP(account.balance)}</p>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[var(--success-bg)] text-[var(--success)]">
              <ArrowDownLeft size={18} />
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.22em] text-[var(--muted)]">Siguiente entrada</p>
              <p className="text-lg font-semibold">{summary.nextIncome?.title ?? "Sin flujo cargado"}</p>
            </div>
          </div>
          <div className="arca-soft-block mt-4 rounded-2xl p-4">
            {summary.nextIncome ? (
              <>
                <p className="text-2xl font-semibold text-[var(--success)]">{formatCOP(summary.nextIncome.amount)}</p>
                <p className="mt-1 text-sm text-[var(--muted)]">Fecha esperada: {formatDate(summary.nextIncome.dueDate)}</p>
              </>
            ) : (
              <p className="text-sm text-[var(--muted)]">Todavia no hay ingresos programados para alimentar decisiones.</p>
            )}
          </div>
        </Card>

        <Card className="p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[var(--danger-bg)] text-[var(--danger)]">
              <AlertTriangle size={18} />
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.22em] text-[var(--muted)]">Atrasos</p>
              <p className="text-lg font-semibold">Lo que aprieta hoy</p>
            </div>
          </div>
          <div className="mt-4 space-y-3">
            {summary.urgentItems.filter((item) => item.urgency === "overdue").length > 0 ? (
              summary.urgentItems
                .filter((item) => item.urgency === "overdue")
                .slice(0, 4)
                .map((item) => (
                  <div key={item.id} className="rounded-2xl border border-[var(--danger)]/15 bg-[var(--danger-bg)] px-4 py-3">
                    <p className="font-medium text-[var(--danger)]">{item.title}</p>
                    <p className="mt-1 text-sm text-[var(--danger)]">{formatDate(item.dueDate)} - {formatCOP(item.amount)}</p>
                  </div>
                ))
            ) : (
              <div className="arca-muted-block rounded-2xl p-4 text-sm text-[var(--muted)]">
                No hay vencidos en el corte actual.
              </div>
            )}
          </div>
        </Card>
      </section>
    </div>
  );
}
