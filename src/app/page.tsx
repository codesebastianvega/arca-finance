import Link from "next/link";
import type React from "react";
import {
  AlertTriangle,
  ArrowDownLeft,
  ArrowUpRight,
  Building2,
  CalendarDays,
  CreditCard,
  Landmark,
  LayoutDashboard,
  ListChecks,
  Plus,
  PiggyBank,
  Wallet,
} from "lucide-react";
import { createTransaction } from "@/app/actions";
import { ArcaCharts } from "@/components/arca-charts";
import { Badge, Button, Card, MetricCard } from "@/components/ui-kit";
import {
  formatCOP,
  formatDate,
  getAvailableToday,
  getCardAvailable,
  getDebtTotal,
  getExpenseMonth,
  getIncomeMonth,
  getNetFlow,
  getSavingsProgress,
  getUpcomingPayments,
} from "@/lib/finance";
import { loadDashboardData } from "@/lib/dashboard-data";
import type { Transaction } from "@/lib/types";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type DashboardData = Awaited<ReturnType<typeof loadDashboardData>>;
type ViewKey =
  | "dashboard"
  | "register"
  | "accounts"
  | "income"
  | "expenses"
  | "debts"
  | "cards"
  | "savings"
  | "calendar"
  | "projections"
  | "business";

type HomeProps = {
  searchParams: Promise<{
    saved?: string;
    view?: string;
  }>;
};

const navItems: { label: string; view: ViewKey; icon: typeof LayoutDashboard }[] = [
  { label: "Dashboard", view: "dashboard", icon: LayoutDashboard },
  { label: "Registrar", view: "register", icon: Plus },
  { label: "Cuentas", view: "accounts", icon: Wallet },
  { label: "Ingresos", view: "income", icon: ArrowDownLeft },
  { label: "Gastos", view: "expenses", icon: ArrowUpRight },
  { label: "Deudas", view: "debts", icon: AlertTriangle },
  { label: "Tarjetas", view: "cards", icon: CreditCard },
  { label: "Ahorro", view: "savings", icon: PiggyBank },
  { label: "Calendario", view: "calendar", icon: CalendarDays },
  { label: "Proyeccion", view: "projections", icon: ListChecks },
  { label: "Negocios", view: "business", icon: Building2 },
];

const viewTitles: Record<ViewKey, string> = {
  dashboard: "Dashboard operativo",
  register: "Registrar movimiento",
  accounts: "Cuentas y billeteras",
  income: "Ingresos",
  expenses: "Gastos",
  debts: "Deudas",
  cards: "Tarjetas",
  savings: "Ahorro",
  calendar: "Calendario financiero",
  projections: "Proyeccion mensual",
  business: "Unidades de negocio",
};

const fallbackFlowData = [
  { name: "Ago", value: 4800000 },
  { name: "Sep", value: 5100000 },
  { name: "Oct", value: 4620000 },
  { name: "Nov", value: 5380000 },
  { name: "Dic", value: 5960000 },
];

const fieldClass =
  "h-11 w-full rounded-xl border border-black/10 bg-white/70 px-3 text-sm text-[#111111] outline-none transition focus:border-[#163a5f]/50 focus:ring-2 focus:ring-[#163a5f]/10";

const labelClass = "text-xs font-medium uppercase tracking-[0.16em] text-black/55";

function getView(value?: string): ViewKey {
  return navItems.some((item) => item.view === value) ? (value as ViewKey) : "dashboard";
}

function getMonthLabel(value: string) {
  return new Date(value).toLocaleDateString("es-CO", {
    month: "short",
    timeZone: "UTC",
  });
}

function getToday() {
  return new Date().toISOString().slice(0, 10);
}

function getTransactionTone(kind: Transaction["kind"]) {
  if (kind === "income" || kind === "saving_withdrawal") {
    return "success" as const;
  }

  if (kind === "debt_payment" || kind === "card_payment") {
    return "danger" as const;
  }

  return "warning" as const;
}

function getSignedAmount(tx: Transaction) {
  const sign = tx.kind === "income" || tx.kind === "saving_withdrawal" ? "" : "-";
  return `${sign}${formatCOP(tx.amount)}`;
}

function SectionHeader({
  eyebrow,
  title,
  action,
}: {
  eyebrow: string;
  title: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
      <div>
        <p className="text-xs uppercase tracking-[0.18em] text-black/55">{eyebrow}</p>
        <h3 className="mt-1 text-lg font-semibold text-[#111111]">{title}</h3>
      </div>
      {action}
    </div>
  );
}

function EmptyState({ label }: { label: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-black/12 p-6 text-sm text-black/55">
      {label}
    </div>
  );
}

function MovementList({ transactions }: { transactions: Transaction[] }) {
  if (!transactions.length) {
    return <EmptyState label="Todavia no hay movimientos para esta vista." />;
  }

  return (
    <div className="divide-y divide-black/8">
      {transactions.map((tx) => (
        <div key={tx.id} className="grid gap-3 py-3 md:grid-cols-[1fr_auto] md:items-center">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <p className="font-medium text-[#111111]">{tx.concept}</p>
              <Badge tone={getTransactionTone(tx.kind)}>{tx.status}</Badge>
            </div>
            <p className="mt-1 text-sm text-black/55">
              {tx.category} - {tx.unit} - {formatDate(tx.date)}
              {tx.dueDate ? ` - vence ${formatDate(tx.dueDate)}` : ""}
            </p>
          </div>
          <p className="text-right font-semibold text-[#111111]">{getSignedAmount(tx)}</p>
        </div>
      ))}
    </div>
  );
}

function DashboardView({
  accounts,
  business,
  cards,
  debts,
  events,
  goals,
  projections,
  transactions,
}: DashboardData) {
  const availableToday = getAvailableToday(accounts, goals, debts, cards);
  const incomeMonth = getIncomeMonth(transactions);
  const expenseMonth = getExpenseMonth(transactions);
  const flowMonth = getNetFlow(transactions);
  const debtTotal = getDebtTotal(debts, cards);
  const upcoming = getUpcomingPayments(transactions).slice(0, 8);
  const flowData = projections.length
    ? projections.map((item) => ({ name: getMonthLabel(item.month), value: item.closingBalance }))
    : fallbackFlowData;
  const sourceData = business.map((item) => ({ name: item.name, value: item.income }));

  return (
    <div className="space-y-4">
      <div className="grid gap-4 xl:grid-cols-[1.7fr_1fr]">
        <Card className="overflow-hidden p-5 md:p-6">
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-black/55">Resumen del mes</p>
              <h3 className="mt-1 text-2xl font-semibold text-[#111111]">Caja real y presion futura</h3>
            </div>
            <p className="max-w-xl text-sm leading-6 text-black/60">
              Arca cruza saldos, pagos proximos y metas para mostrar cuanto margen queda antes de gastar.
            </p>
          </div>

          <div className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <MetricCard
              label="Disponible tras compromisos"
              value={formatCOP(availableToday)}
              tone={availableToday >= 0 ? "success" : "danger"}
            />
            <MetricCard label="Ingresos del mes" value={formatCOP(incomeMonth)} tone="neutral" />
            <MetricCard label="Salidas del mes" value={formatCOP(expenseMonth)} tone="danger" />
            <MetricCard
              label="Flujo neto"
              value={formatCOP(flowMonth)}
              tone={flowMonth >= 0 ? "success" : "danger"}
            />
          </div>
        </Card>

        <Card className="p-5 md:p-6">
          <SectionHeader
            eyebrow="Accion rapida"
            title="Registro manual"
            action={
              <Link
                href="/?view=register"
                className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-[#163a5f] px-4 text-sm font-medium text-white hover:bg-[#102d49]"
              >
                <Plus className="h-4 w-4" />
                Registrar
              </Link>
            }
          />
          <div className="mt-4 space-y-3 text-sm text-black/70">
            <div className="rounded-2xl bg-black/3 p-3">&quot;Gaste 38 mil de Nequi en almuerzo&quot;</div>
            <div className="rounded-2xl bg-black/3 p-3">&quot;Compre con tarjeta Nu mercado por 180 mil&quot;</div>
            <div className="rounded-2xl bg-black/3 p-3">&quot;Recibi pago de SIE Travel&quot;</div>
          </div>
        </Card>
      </div>

      <ArcaCharts flowData={flowData} sourceData={sourceData} />

      <div className="grid gap-4 xl:grid-cols-3">
        <Card className="p-5 xl:col-span-2">
          <SectionHeader
            eyebrow="Proximos pagos"
            title="Lo que aprieta el mes"
            action={<Badge tone="danger">{upcoming.length} pendientes</Badge>}
          />
          <div className="mt-4">
            <MovementList transactions={upcoming} />
          </div>
        </Card>

        <Card className="p-5">
          <SectionHeader eyebrow="Riesgo" title="Deuda y tarjeta" />
          <div className="mt-4 rounded-2xl bg-black/3 p-4">
            <p className="text-sm text-black/55">Deuda total</p>
            <p className="mt-1 text-2xl font-semibold text-[#111111]">{formatCOP(debtTotal)}</p>
          </div>
          <div className="mt-4 space-y-3">
            {cards.slice(0, 2).map((card) => (
              <div key={card.id} className="rounded-2xl border border-black/8 p-4">
                <p className="font-medium text-[#111111]">{card.name}</p>
                <p className="mt-1 text-sm text-black/55">Disponible {formatCOP(getCardAvailable(card))}</p>
                <p className="text-sm text-black/55">Pago dia {card.payDueDate}</p>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="p-5">
          <SectionHeader eyebrow="Calendario" title="Eventos futuros" />
          <div className="mt-4 divide-y divide-black/8">
            {events.slice(0, 5).map((event) => (
              <div key={event.id} className="flex items-center justify-between gap-4 py-3">
                <div>
                  <p className="font-medium text-[#111111]">{event.title}</p>
                  <p className="text-sm text-black/55">
                    {event.eventType} - {formatDate(event.eventDate)}
                  </p>
                </div>
                <p className="font-semibold text-[#111111]">{formatCOP(event.amount)}</p>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-5">
          <SectionHeader eyebrow="Ultimos movimientos" title="Registro reciente" />
          <div className="mt-4">
            <MovementList transactions={transactions.slice(0, 5)} />
          </div>
        </Card>
      </div>
    </div>
  );
}

function RegisterView({ accounts, business }: DashboardData) {
  return (
    <div className="grid gap-4 xl:grid-cols-[1.25fr_0.75fr]">
      <Card className="p-5 md:p-6">
        <SectionHeader eyebrow="Nuevo movimiento" title="Registrar plata que entra o sale" />

        <form action={createTransaction} className="mt-6 grid gap-4 md:grid-cols-2">
          <label className="space-y-2">
            <span className={labelClass}>Tipo</span>
            <select name="kind" className={fieldClass} defaultValue="expense" required>
              <option value="income">Ingreso</option>
              <option value="expense">Gasto</option>
              <option value="debt_payment">Pago deuda</option>
              <option value="card_payment">Pago tarjeta</option>
              <option value="saving_contribution">Aporte ahorro</option>
              <option value="saving_withdrawal">Retiro ahorro</option>
              <option value="transfer">Transferencia</option>
            </select>
          </label>

          <label className="space-y-2">
            <span className={labelClass}>Estado</span>
            <select name="status" className={fieldClass} defaultValue="paid" required>
              <option value="paid">Pagado</option>
              <option value="confirmed">Confirmado</option>
              <option value="scheduled">Programado</option>
              <option value="pending">Pendiente</option>
              <option value="overdue">Vencido</option>
              <option value="cancelled">Cancelado</option>
            </select>
          </label>

          <label className="space-y-2">
            <span className={labelClass}>Valor</span>
            <input name="amount" type="number" min="1" step="100" className={fieldClass} placeholder="38000" required />
          </label>

          <label className="space-y-2">
            <span className={labelClass}>Cuenta</span>
            <select name="accountId" className={fieldClass} required>
              {accounts.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.name} - {formatCOP(account.balance)}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-2 md:col-span-2">
            <span className={labelClass}>Concepto</span>
            <input name="concept" className={fieldClass} placeholder="Almuerzo, pago cliente, cuota Solventa..." required />
          </label>

          <label className="space-y-2">
            <span className={labelClass}>Categoria</span>
            <input name="category" className={fieldClass} placeholder="Comida, servicios, deuda..." defaultValue="General" required />
          </label>

          <label className="space-y-2">
            <span className={labelClass}>Unidad</span>
            <select name="unit" className={fieldClass} defaultValue="personal" required>
              {business.map((unit) => (
                <option key={unit.id} value={unit.id}>
                  {unit.name}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-2">
            <span className={labelClass}>Fecha</span>
            <input name="date" type="date" className={fieldClass} defaultValue={getToday()} required />
          </label>

          <label className="space-y-2">
            <span className={labelClass}>Vencimiento opcional</span>
            <input name="dueDate" type="date" className={fieldClass} />
          </label>

          <div className="md:col-span-2">
            <Button type="submit" size="lg" className="w-full md:w-auto">
              <Plus className="h-4 w-4" />
              Guardar movimiento
            </Button>
          </div>
        </form>
      </Card>

      <Card className="p-5">
        <SectionHeader eyebrow="Como usarlo" title="Reglas actuales" />
        <div className="mt-4 space-y-3 text-sm leading-6 text-black/65">
          <p>Si el estado es pagado o confirmado, Arca actualiza el saldo de la cuenta.</p>
          <p>Si queda pendiente, programado o vencido, Arca lo agrega al calendario financiero.</p>
          <p>Los formularios especializados de deuda, tarjeta y ahorro quedan como siguiente iteracion.</p>
        </div>
      </Card>
    </div>
  );
}

function AccountsView({ accounts }: DashboardData) {
  return (
    <Card className="p-5">
      <SectionHeader eyebrow="Cuentas" title="Donde esta la plata" action={<Badge tone="neutral">{accounts.length} activas</Badge>} />
      <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {accounts.map((account) => (
          <div key={account.id} className="rounded-2xl border border-black/8 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-[#111111]">{account.name}</p>
                <p className="text-sm text-black/55">{account.type}</p>
              </div>
              <Landmark className="h-5 w-5 text-black/45" />
            </div>
            <p className="mt-4 text-2xl font-semibold text-[#111111]">{formatCOP(account.balance)}</p>
          </div>
        ))}
      </div>
    </Card>
  );
}

function MovementsView({
  eyebrow,
  title,
  transactions,
}: {
  eyebrow: string;
  title: string;
  transactions: Transaction[];
}) {
  return (
    <Card className="p-5">
      <SectionHeader
        eyebrow={eyebrow}
        title={title}
        action={
          <Link
            href="/?view=register"
            className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-[#163a5f] px-4 text-sm font-medium text-white hover:bg-[#102d49]"
          >
            <Plus className="h-4 w-4" />
            Registrar
          </Link>
        }
      />
      <div className="mt-4">
        <MovementList transactions={transactions} />
      </div>
    </Card>
  );
}

function DebtsView({ debts, transactions }: DashboardData) {
  const debtTransactions = transactions.filter((tx) => tx.kind === "debt_payment");

  return (
    <div className="grid gap-4 xl:grid-cols-[1fr_1fr]">
      <Card className="p-5">
        <SectionHeader eyebrow="Deudas" title="Obligaciones activas" />
        <div className="mt-4 space-y-3">
          {debts.map((debt) => (
            <div key={debt.id} className="rounded-2xl border border-black/8 p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="font-medium text-[#111111]">{debt.name}</p>
                  <p className="text-sm text-black/55">
                    {debt.lender} - vence {formatDate(debt.nextDueDate)}
                  </p>
                </div>
                <Badge tone={debt.priority === "high" ? "danger" : "warning"}>{debt.status}</Badge>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.16em] text-black/45">Saldo</p>
                  <p className="mt-1 font-semibold text-[#111111]">{formatCOP(debt.balance)}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.16em] text-black/45">Cuota</p>
                  <p className="mt-1 font-semibold text-[#111111]">{formatCOP(debt.installment)}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>

      <MovementsView eyebrow="Pagos" title="Pagos de deuda registrados" transactions={debtTransactions} />
    </div>
  );
}

function CardsView({ cards, transactions }: DashboardData) {
  const cardTransactions = transactions.filter((tx) => tx.kind === "card_payment");

  return (
    <div className="grid gap-4 xl:grid-cols-[1fr_1fr]">
      <Card className="p-5">
        <SectionHeader eyebrow="Tarjetas" title="Cupos y fechas de pago" />
        <div className="mt-4 space-y-3">
          {cards.map((card) => (
            <div key={card.id} className="rounded-2xl border border-black/8 p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="font-medium text-[#111111]">{card.name}</p>
                  <p className="text-sm text-black/55">
                    Corte {card.cutOffDate} - pago {card.payDueDate}
                  </p>
                </div>
                <Badge tone="warning">{card.status}</Badge>
              </div>
              <div className="mt-4 grid grid-cols-3 gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.16em] text-black/45">Cupo</p>
                  <p className="mt-1 font-semibold text-[#111111]">{formatCOP(card.limit)}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.16em] text-black/45">Usado</p>
                  <p className="mt-1 font-semibold text-[#111111]">{formatCOP(card.used)}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.16em] text-black/45">Minimo</p>
                  <p className="mt-1 font-semibold text-[#111111]">{formatCOP(card.minimumPayment)}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>

      <MovementsView eyebrow="Pagos" title="Pagos de tarjeta registrados" transactions={cardTransactions} />
    </div>
  );
}

function SavingsView({ goals, transactions }: DashboardData) {
  const savingsTransactions = transactions.filter(
    (tx) => tx.kind === "saving_contribution" || tx.kind === "saving_withdrawal"
  );

  return (
    <div className="grid gap-4 xl:grid-cols-[1fr_1fr]">
      <Card className="p-5">
        <SectionHeader eyebrow="Ahorro" title="Metas activas" />
        <div className="mt-4 space-y-5">
          {goals.map((goal) => {
            const progress = getSavingsProgress(goal);

            return (
              <div key={goal.id}>
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium text-[#111111]">{goal.name}</span>
                  <span className="text-black/55">{progress}%</span>
                </div>
                <div className="mt-2 h-2 rounded-full bg-black/6">
                  <div className="h-2 rounded-full" style={{ width: `${progress}%`, backgroundColor: goal.color }} />
                </div>
                <p className="mt-2 text-sm text-black/55">
                  {formatCOP(goal.current)} de {formatCOP(goal.target)}
                </p>
              </div>
            );
          })}
        </div>
      </Card>

      <MovementsView eyebrow="Movimientos" title="Aportes y retiros" transactions={savingsTransactions} />
    </div>
  );
}

function CalendarView({ events, transactions }: DashboardData) {
  const upcoming = getUpcomingPayments(transactions);

  return (
    <div className="grid gap-4 xl:grid-cols-[1fr_1fr]">
      <Card className="p-5">
        <SectionHeader eyebrow="Calendario" title="Eventos financieros" />
        <div className="mt-4 divide-y divide-black/8">
          {events.map((event) => (
            <div key={event.id} className="flex items-center justify-between gap-4 py-3">
              <div>
                <p className="font-medium text-[#111111]">{event.title}</p>
                <p className="text-sm text-black/55">
                  {event.eventType} - {formatDate(event.eventDate)}
                </p>
              </div>
              <p className="font-semibold text-[#111111]">{formatCOP(event.amount)}</p>
            </div>
          ))}
        </div>
      </Card>

      <MovementsView eyebrow="Pendientes" title="Movimientos por pagar/cobrar" transactions={upcoming} />
    </div>
  );
}

function ProjectionsView({ projections }: DashboardData) {
  return (
    <Card className="p-5">
      <SectionHeader eyebrow="Proyeccion" title="Cierre esperado por mes" />
      <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {projections.map((item) => (
          <div key={item.id} className="rounded-2xl border border-black/8 p-4">
            <p className="text-xs uppercase tracking-[0.18em] text-black/45">{getMonthLabel(item.month)}</p>
            <p className="mt-2 text-lg font-semibold text-[#111111]">{formatCOP(item.closingBalance)}</p>
            <p className="mt-1 text-sm text-black/55">Ingresos {formatCOP(item.expectedIncome)}</p>
            <p className="text-sm text-black/55">
              Salidas {formatCOP(item.expectedExpenses + item.debtPayments + item.cardPayments)}
            </p>
            {item.notes ? <p className="mt-2 text-sm text-black/50">{item.notes}</p> : null}
          </div>
        ))}
      </div>
    </Card>
  );
}

function BusinessView({ business }: DashboardData) {
  return (
    <Card className="p-5">
      <SectionHeader eyebrow="Unidades" title="Resultado por negocio" />
      <div className="mt-4 grid gap-3">
        {business.map((unit) => (
          <div
            key={unit.id}
            className="grid gap-3 rounded-2xl border border-black/8 p-4 md:grid-cols-[1.5fr_1fr_1fr_1fr] md:items-center"
          >
            <div>
              <p className="font-medium text-[#111111]">{unit.name}</p>
              <p className="text-sm text-black/55">Cobros pendientes {formatCOP(unit.pending)}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.16em] text-black/45">Ingresos</p>
              <p className="mt-1 font-semibold text-[#111111]">{formatCOP(unit.income)}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.16em] text-black/45">Gastos</p>
              <p className="mt-1 font-semibold text-[#111111]">{formatCOP(unit.expense)}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.16em] text-black/45">Neto</p>
              <p className="mt-1 font-semibold text-[#111111]">{formatCOP(unit.income - unit.expense)}</p>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

function renderView(view: ViewKey, data: DashboardData) {
  const incomeTransactions = data.transactions.filter((tx) => tx.kind === "income");
  const expenseTransactions = data.transactions.filter((tx) =>
    ["expense", "debt_payment", "card_payment", "saving_contribution"].includes(tx.kind)
  );

  switch (view) {
    case "register":
      return <RegisterView {...data} />;
    case "accounts":
      return <AccountsView {...data} />;
    case "income":
      return <MovementsView eyebrow="Ingresos" title="Dinero que entra" transactions={incomeTransactions} />;
    case "expenses":
      return <MovementsView eyebrow="Gastos" title="Dinero que sale" transactions={expenseTransactions} />;
    case "debts":
      return <DebtsView {...data} />;
    case "cards":
      return <CardsView {...data} />;
    case "savings":
      return <SavingsView {...data} />;
    case "calendar":
      return <CalendarView {...data} />;
    case "projections":
      return <ProjectionsView {...data} />;
    case "business":
      return <BusinessView {...data} />;
    default:
      return <DashboardView {...data} />;
  }
}

export default async function Home({ searchParams }: HomeProps) {
  const params = await searchParams;
  const activeView = getView(params.view);
  const data = await loadDashboardData();

  return (
    <main className="min-h-screen p-4 md:p-6">
      <div className="mx-auto flex min-h-[calc(100vh-2rem)] max-w-[1600px] overflow-hidden rounded-[28px] border border-black/8 bg-[var(--surface)] shadow-[0_18px_50px_rgba(17,17,17,0.08)] md:min-h-[calc(100vh-3rem)]">
        <aside className="hidden w-72 shrink-0 flex-col border-r border-black/8 bg-[rgba(244,236,226,0.72)] p-5 lg:flex">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-black/45">Arca</p>
            <h1 className="mt-2 text-2xl font-semibold text-[#111111]">Control claro de caja.</h1>
            <p className="mt-3 text-sm leading-6 text-black/60">
              Registro manual, proyeccion, deudas, tarjetas y operacion por unidad.
            </p>
          </div>

          <Link
            href="/?view=register"
            className="mt-6 inline-flex h-11 w-full items-center justify-start gap-2 rounded-xl bg-[#163a5f] px-5 text-sm font-medium text-white hover:bg-[#102d49]"
          >
            <Plus className="h-4 w-4" />
            Registrar movimiento
          </Link>

          <nav className="mt-8 space-y-1">
            {navItems.map((item) => {
              const isActive = item.view === activeView;

              return (
                <Link
                  key={item.view}
                  href={`/?view=${item.view}`}
                  className={cn(
                    "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors",
                    isActive ? "bg-[#163a5f] text-white" : "text-black/70 hover:bg-black/5 hover:text-black"
                  )}
                >
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <Card className="mt-auto p-4">
            <p className="text-xs uppercase tracking-[0.18em] text-black/55">Estado datos</p>
            <p className="mt-2 text-sm leading-6 text-black/70">
              Los registros manuales escriben en Supabase y actualizan saldos cuando el movimiento queda pagado.
            </p>
            <Badge className="mt-4" tone={data.source === "supabase" ? "success" : "warning"}>
              {data.source === "supabase" ? "Supabase conectado" : "Usando mock local"}
            </Badge>
          </Card>
        </aside>

        <section className="flex min-w-0 flex-1 flex-col">
          <header className="border-b border-black/8 px-4 py-4 md:px-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-black/45">Arca Finance</p>
                <h2 className="mt-1 text-xl font-semibold text-[#111111] md:text-2xl">{viewTitles[activeView]}</h2>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                {params.saved === "1" ? <Badge tone="success">Movimiento guardado</Badge> : null}
                <Badge tone="warning">COP</Badge>
                <Badge tone={data.source === "supabase" ? "success" : "warning"}>
                  {data.source === "supabase" ? "Supabase" : "Mock"}
                </Badge>
                <Link
                  href="/?view=register"
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-[#163a5f] px-4 text-sm font-medium text-white hover:bg-[#102d49]"
                >
                  <Plus className="h-4 w-4" />
                  Registrar
                </Link>
              </div>
            </div>

            <nav className="mt-4 flex gap-2 overflow-x-auto pb-1 lg:hidden">
              {navItems.map((item) => (
                <Link
                  key={item.view}
                  href={`/?view=${item.view}`}
                  className={cn(
                    "inline-flex shrink-0 items-center gap-2 rounded-full px-3 py-2 text-sm",
                    item.view === activeView ? "bg-[#163a5f] text-white" : "bg-black/5 text-black/70"
                  )}
                >
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </Link>
              ))}
            </nav>
          </header>

          <div className="shell-grid flex-1 overflow-y-auto p-4 md:p-6">{renderView(activeView, data)}</div>
        </section>
      </div>
    </main>
  );
}
