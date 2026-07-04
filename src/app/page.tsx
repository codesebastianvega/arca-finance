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
import { createAccount, createCreditCard, createDebt, createSavingsGoal, createTransaction } from "@/app/actions";
import { ArcaCharts } from "@/components/arca-charts";
import { Badge, Button, Card, MetricCard } from "@/components/ui-kit";
import {
  formatCOP,
  formatDate,
  getCardAvailable,
  getDebtTotal,
  getExpenseMonth,
  getIncomeMonth,
  getSavingsProgress,
  getUpcomingPayments,
  parseCalendarDate,
} from "@/lib/finance";
import { loadDashboardData } from "@/lib/dashboard-data";
import type { Account, FinancialEvent, Transaction } from "@/lib/types";
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

function getCardUsagePercent(used: number, limit: number) {
  if (!limit) {
    return 0;
  }

  return Math.round((used / limit) * 100);
}

function getCurrentMonthKey() {
  return new Date().toISOString().slice(0, 7);
}

function getCurrentMonthName() {
  return new Date(`${getCurrentMonthKey()}-02T00:00:00`).toLocaleDateString("es-CO", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

function isCurrentMonth(value: string) {
  return value.slice(0, 7) === getCurrentMonthKey();
}

function getEventTime(event: FinancialEvent) {
  return parseCalendarDate(event.eventDate).getTime();
}

function isOpenEvent(event: FinancialEvent) {
  return event.status !== "cancelled" && event.status !== "paid" && event.status !== "confirmed";
}

function isIncomeEvent(event: FinancialEvent) {
  return event.eventType === "income" && isOpenEvent(event);
}

function isOutflowEvent(event: FinancialEvent) {
  return event.eventType !== "income" && isOpenEvent(event);
}

function sumAccounts(accounts: Account[]) {
  return accounts.reduce((total, account) => total + account.balance, 0);
}

function sumEvents(events: FinancialEvent[]) {
  return events.reduce((total, event) => total + event.amount, 0);
}

function getAccountName(accounts: Account[], accountId?: string) {
  return accounts.find((account) => account.id === accountId)?.name;
}

function getBusinessName(business: DashboardData["business"], unit?: string) {
  return business.find((item) => item.id === unit)?.name ?? unit ?? "Sin fuente";
}

function getMonthKey(value: string) {
  return value.slice(0, 7);
}

function addMonthsToMonthKey(monthKey: string, offset: number) {
  const [year, month] = monthKey.split("-").map(Number);
  const date = new Date(year, month - 1 + offset, 1);

  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function getMonthLabelFromKey(monthKey: string) {
  return getMonthLabel(`${monthKey}-01`);
}

function getTotalBalance(accountBalances: Map<string, number>, unassignedCash: number) {
  return [...accountBalances.values()].reduce((total, value) => total + value, 0) + unassignedCash;
}

function choosePaymentSource(accountBalances: Map<string, number>, accounts: Account[], event: FinancialEvent) {
  if (event.accountId) {
    const balance = accountBalances.get(event.accountId) ?? 0;
    const accountName = getAccountName(accounts, event.accountId) ?? "Cuenta definida";

    return {
      accountId: event.accountId,
      label: `Pagar desde: ${accountName}`,
      canPayFromSingleAccount: balance >= event.amount,
    };
  }

  const candidate = accounts
    .map((account) => ({ account, balance: accountBalances.get(account.id) ?? 0 }))
    .filter((item) => item.balance >= event.amount)
    .sort((a, b) => b.balance - a.balance)[0];

  if (candidate) {
    return {
      accountId: candidate.account.id,
      label: `Pagar desde: ${candidate.account.name}`,
      canPayFromSingleAccount: true,
    };
  }

  return {
    accountId: undefined,
    label: "Ninguna cuenta alcanza sola",
    canPayFromSingleAccount: false,
  };
}

function allocateAcrossAccounts(accountBalances: Map<string, number>, accounts: Account[], amount: number) {
  let remaining = amount;
  const allocations: { accountId: string; accountName: string; amount: number }[] = [];
  const rankedAccounts = accounts
    .map((account) => ({ account, balance: accountBalances.get(account.id) ?? 0 }))
    .filter((item) => item.balance > 0)
    .sort((a, b) => b.balance - a.balance);

  rankedAccounts.forEach(({ account, balance }) => {
    if (remaining <= 0) {
      return;
    }

    const deduction = Math.min(balance, remaining);
    accountBalances.set(account.id, balance - deduction);
    allocations.push({ accountId: account.id, accountName: account.name, amount: deduction });
    remaining -= deduction;
  });

  return allocations;
}

function formatAllocation(allocations: { accountName: string; amount: number }[]) {
  return allocations.map((item) => `${item.accountName}: ${formatCOP(item.amount)}`).join(" + ");
}

function isTimelineEvent(event: FinancialEvent) {
  if (!isOpenEvent(event)) {
    return false;
  }

  if (isCurrentMonth(event.eventDate)) {
    return event.amount > 0;
  }

  return event.status === "overdue" && event.amount > 0;
}

function buildMonthlyCashTimeline(events: FinancialEvent[], accounts: Account[]) {
  const timelineEvents = events.filter(isTimelineEvent).sort((a, b) => getEventTime(a) - getEventTime(b));
  const accountBalances = new Map(accounts.map((account) => [account.id, account.balance]));
  let unassignedCash = 0;

  return timelineEvents.map((event) => {
    const isIncome = isIncomeEvent(event);
    const projectedCashBefore = getTotalBalance(accountBalances, unassignedCash);

    if (isIncome) {
      if (event.accountId) {
        accountBalances.set(event.accountId, (accountBalances.get(event.accountId) ?? 0) + event.amount);
      } else {
        unassignedCash += event.amount;
      }

      return {
        event,
        type: "income" as const,
        covered: true,
        fundingLabel: getAccountName(accounts, event.accountId) ?? "Cuenta por definir",
        needsTransfer: false,
        projectedCashBefore,
        projectedCashAfter: getTotalBalance(accountBalances, unassignedCash),
        shortfall: 0,
      };
    }

    const covered = projectedCashBefore >= event.amount;
    const shortfall = Math.max(0, event.amount - projectedCashBefore);
    const paymentSource = choosePaymentSource(accountBalances, accounts, event);

    let allocations: { accountId: string; accountName: string; amount: number }[] = [];

    if (covered && paymentSource.accountId && paymentSource.canPayFromSingleAccount) {
      accountBalances.set(paymentSource.accountId, (accountBalances.get(paymentSource.accountId) ?? 0) - event.amount);
      allocations = [
        {
          accountId: paymentSource.accountId,
          accountName: getAccountName(accounts, paymentSource.accountId) ?? "Cuenta definida",
          amount: event.amount,
        },
      ];
    } else if (covered) {
      allocations = allocateAcrossAccounts(accountBalances, accounts, event.amount);
    }

    return {
      event,
      type: "payment" as const,
      covered,
      canPayFromSingleAccount: paymentSource.canPayFromSingleAccount,
      fundingLabel: covered
        ? paymentSource.canPayFromSingleAccount
          ? paymentSource.label
          : formatAllocation(allocations)
        : "Esperar ingreso o renegociar",
      needsTransfer: covered && !paymentSource.canPayFromSingleAccount,
      projectedCashBefore,
      projectedCashAfter: getTotalBalance(accountBalances, unassignedCash),
      shortfall,
    };
  });
}

function getUpcomingNotifications(events: FinancialEvent[]) {
  const today = parseCalendarDate(getToday());
  const todayTime = today.getTime();
  const fiveDaysFromNow = todayTime + 5 * 24 * 60 * 60 * 1000;

  return events
    .filter((event) => isOpenEvent(event) && event.amount > 0)
    .map((event) => {
      const eventTime = parseCalendarDate(event.eventDate).getTime();
      const isOverdue = event.status === "overdue" || (event.eventType !== "income" && eventTime < todayTime);
      const isToday = eventTime === todayTime;
      const isSoon = eventTime > todayTime && eventTime <= fiveDaysFromNow;

      if (!isOverdue && !isToday && !isSoon) {
        return null;
      }

      return {
        event,
        tone: isOverdue ? ("danger" as const) : isToday ? ("warning" as const) : ("neutral" as const),
        label: isOverdue ? "Vencido" : isToday ? "Hoy" : "Pronto",
      };
    })
    .filter((item): item is NonNullable<typeof item> => Boolean(item))
    .sort((a, b) => getEventTime(a.event) - getEventTime(b.event))
    .slice(0, 8);
}

function buildProjectedBalanceData(events: FinancialEvent[], accounts: Account[]) {
  const startMonth = getCurrentMonthKey();
  let balance = sumAccounts(accounts);

  return Array.from({ length: 6 }, (_, index) => {
    const monthKey = addMonthsToMonthKey(startMonth, index);
    const monthEvents = events.filter((event) => {
      if (!isOpenEvent(event) || event.amount <= 0) {
        return false;
      }

      if (index === 0 && event.status === "overdue" && getMonthKey(event.eventDate) < monthKey) {
        return true;
      }

      return getMonthKey(event.eventDate) === monthKey;
    });

    balance += sumEvents(monthEvents.filter((event) => event.eventType === "income"));
    balance -= sumEvents(monthEvents.filter((event) => event.eventType !== "income"));

    return {
      name: getMonthLabelFromKey(monthKey),
      value: balance,
    };
  });
}

function buildIncomeSourceData(events: FinancialEvent[], business: DashboardData["business"]) {
  const grouped = new Map<string, number>();

  events
    .filter((event) => isCurrentMonth(event.eventDate) && isIncomeEvent(event))
    .forEach((event) => {
      const name = getBusinessName(business, event.unit);
      grouped.set(name, (grouped.get(name) ?? 0) + event.amount);
    });

  return [...grouped.entries()]
    .map(([name, value]) => ({ name, value }))
    .filter((item) => item.value > 0)
    .sort((a, b) => b.value - a.value);
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

function EventList({ events, emptyLabel }: { events: FinancialEvent[]; emptyLabel: string }) {
  if (!events.length) {
    return <EmptyState label={emptyLabel} />;
  }

  return (
    <div className="divide-y divide-black/8">
      {events.slice(0, 14).map((event) => (
        <div key={event.id} className="grid gap-3 py-3 md:grid-cols-[1fr_auto] md:items-center">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <p className="font-medium text-[#111111]">{event.title}</p>
              <Badge tone={event.status === "overdue" ? "danger" : event.eventType === "income" ? "success" : "warning"}>
                {event.status}
              </Badge>
            </div>
            <p className="mt-1 text-sm text-black/55">
              {event.eventType} - {formatDate(event.eventDate)}
              {event.unit ? ` - ${event.unit}` : ""}
            </p>
          </div>
          <p className="text-right font-semibold text-[#111111]">
            {event.eventType === "income" ? "" : "-"}
            {formatCOP(event.amount)}
          </p>
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
  transactions,
}: DashboardData) {
  const currentMonthTransactions = transactions.filter((tx) => isCurrentMonth(tx.date));
  const currentMonthEvents = events.filter((event) => isCurrentMonth(event.eventDate));
  const overdueOutflowEvents = events.filter(
    (event) => !isCurrentMonth(event.eventDate) && event.status === "overdue" && isOutflowEvent(event) && event.amount > 0
  );
  const incomeEvents = currentMonthEvents.filter(isIncomeEvent);
  const outflowEvents = currentMonthEvents.filter((event) => isOutflowEvent(event) && event.amount > 0);
  const cashNow = sumAccounts(accounts);
  const incomeMonth = sumEvents(incomeEvents) + getIncomeMonth(currentMonthTransactions);
  const expenseMonth = sumEvents(outflowEvents) + sumEvents(overdueOutflowEvents) + getExpenseMonth(currentMonthTransactions);
  const availableAfterCommitments = cashNow + incomeMonth - expenseMonth;
  const pressureToCover = Math.max(0, expenseMonth - cashNow);
  const debtTotal = getDebtTotal(debts, cards);
  const cashTimeline = buildMonthlyCashTimeline(events, accounts);
  const notifications = getUpcomingNotifications(events);
  const transferSuggestions = cashTimeline.filter((item) => item.type === "payment" && item.needsTransfer);
  const transferSuggestionTotal = transferSuggestions.reduce((total, item) => total + item.event.amount, 0);
  const flowData = buildProjectedBalanceData(events, accounts);
  const sourceData = buildIncomeSourceData(events, business);
  const accountTotalForBars = Math.max(cashNow, 1);

  return (
    <div className="space-y-4">
      <Card className="overflow-hidden p-5 md:p-6">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-black/55">Dashboard - {getCurrentMonthName()}</p>
            <h3 className="mt-2 max-w-3xl text-3xl font-semibold leading-tight text-[#111111] md:text-5xl">
              Caja disponible, compromisos y decisiones del mes.
            </h3>
          </div>
          <div className="rounded-2xl bg-black/3 p-4 xl:w-80">
            <p className="text-sm font-medium text-[#111111]">Lectura rapida</p>
            <p className="mt-2 text-sm leading-6 text-black/60">
              Necesitas cubrir {formatCOP(expenseMonth)} este mes. Con caja actual faltan{" "}
              {formatCOP(pressureToCover)} antes de contar ingresos programados.
            </p>
          </div>
        </div>

        <div className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          <MetricCard label="Dinero actual" value={formatCOP(cashNow)} tone={cashNow > 0 ? "success" : "warning"} />
          <MetricCard label="Ingresos estimados" value={formatCOP(incomeMonth)} tone="success" />
          <MetricCard label="Necesario del mes" value={formatCOP(expenseMonth)} tone="danger" />
          <MetricCard
            label="Disponible tras compromisos"
            value={formatCOP(availableAfterCommitments)}
            tone={availableAfterCommitments >= 0 ? "success" : "danger"}
          />
          <MetricCard label="Deuda total" value={formatCOP(debtTotal)} tone={debtTotal > 0 ? "danger" : "success"} />
        </div>
      </Card>

      <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <Card className="p-5">
          <SectionHeader
            eyebrow="Notificaciones"
            title="Alertas que requieren decision"
            action={<Badge tone={notifications.some((item) => item.tone === "danger") ? "danger" : "warning"}>{notifications.length}</Badge>}
          />
          <div className="mt-4 divide-y divide-black/8">
            {notifications.length ? (
              notifications.map(({ event, tone, label }) => (
                <div key={event.id} className="flex items-center justify-between gap-4 py-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className={cn("font-medium", tone === "danger" ? "text-[var(--danger)]" : "text-[#111111]")}>{event.title}</p>
                      <Badge tone={tone}>{label}</Badge>
                    </div>
                    <p className={cn("mt-1 text-sm", tone === "danger" ? "text-[var(--danger)]" : "text-black/55")}>
                      {event.eventType} - {formatDate(event.eventDate)}
                    </p>
                  </div>
                  <p className={cn("font-semibold", tone === "danger" ? "text-[var(--danger)]" : "text-[#111111]")}>
                    {formatCOP(event.amount)}
                  </p>
                </div>
              ))
            ) : (
              <EmptyState label="No hay alertas urgentes en los proximos dias." />
            )}
          </div>
        </Card>

        <Card className="p-5">
          <SectionHeader
            eyebrow="Transferencias"
            title="Movimientos entre cuentas sugeridos"
            action={<Badge tone={transferSuggestions.length ? "warning" : "success"}>{transferSuggestions.length}</Badge>}
          />
          <div className="mt-4 rounded-2xl bg-black/3 p-4">
            <p className="text-sm text-black/55">Pagos que podrian exigir combinar cuentas</p>
            <p className="mt-1 text-2xl font-semibold text-[#111111]">{formatCOP(transferSuggestionTotal)}</p>
            <p className="mt-2 text-sm leading-6 text-black/60">
              Arca no registra automaticamente estas transferencias todavia. La siguiente iteracion debe permitir mover saldo entre cuentas y dejar auditoria.
            </p>
          </div>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <Card className="p-5">
          <SectionHeader
            eyebrow="Caja actual"
            title="Donde esta la plata hoy"
            action={<Badge tone="neutral">{accounts.length} cuentas</Badge>}
          />
          <div className="mt-5 space-y-4">
            {accounts.length ? (
              accounts
                .slice()
                .sort((a, b) => b.balance - a.balance)
                .map((account) => {
                  const width = Math.max(4, Math.round((account.balance / accountTotalForBars) * 100));

                  return (
                    <div key={account.id}>
                      <div className="flex items-center justify-between gap-3 text-sm">
                        <div>
                          <p className="font-medium text-[#111111]">{account.name}</p>
                          <p className="text-black/50">{account.type}</p>
                        </div>
                        <p className="font-semibold text-[#111111]">{formatCOP(account.balance)}</p>
                      </div>
                      <div className="mt-2 h-2 rounded-full bg-black/6">
                        <div className="h-2 rounded-full bg-[#163a5f]" style={{ width: `${width}%` }} />
                      </div>
                    </div>
                  );
                })
            ) : (
              <EmptyState label="Aun no hay cuentas. Carga al menos una cuenta para tener dinero actual." />
            )}
          </div>
        </Card>

        <Card className="p-5">
          <SectionHeader
            eyebrow="Flujo del mes"
            title="Entradas vs salidas"
            action={<Badge tone={availableAfterCommitments >= 0 ? "success" : "danger"}>{formatCOP(availableAfterCommitments)}</Badge>}
          />
          <div className="mt-5 space-y-4">
            <div>
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium text-[#111111]">Ingresos estimados</span>
                <span>{formatCOP(incomeMonth)}</span>
              </div>
              <div className="mt-2 h-3 overflow-hidden rounded-full bg-black/6">
                <div className="h-3 rounded-full bg-[var(--success)]" style={{ width: "100%" }} />
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium text-[#111111]">Compromisos del mes</span>
                <span>{formatCOP(expenseMonth)}</span>
              </div>
              <div className="mt-2 h-3 overflow-hidden rounded-full bg-black/6">
                <div
                  className="h-3 rounded-full bg-[var(--danger)]"
                  style={{ width: `${Math.min(100, Math.round((expenseMonth / Math.max(incomeMonth + cashNow, 1)) * 100))}%` }}
                />
              </div>
            </div>
            <div className="rounded-2xl bg-black/3 p-4">
              <p className="text-xs uppercase tracking-[0.16em] text-black/45">Formula</p>
              <p className="mt-2 text-sm leading-6 text-black/65">
                Caja actual + ingresos del mes - compromisos del mes = disponible tras compromisos.
              </p>
            </div>
          </div>
        </Card>
      </div>

      <ArcaCharts flowData={flowData} sourceData={sourceData} />

      <div className="grid gap-4 xl:grid-cols-3">
        <Card className="p-5 xl:col-span-2">
          <SectionHeader
            eyebrow="Linea de caja"
            title="Ingresos y pagos en orden"
            action={<Badge tone="warning">{cashTimeline.length} eventos</Badge>}
          />
          <div className="mt-4 divide-y divide-black/8">
            {cashTimeline.length ? (
              cashTimeline.map((item) => (
                <div key={item.event.id} className="grid gap-3 py-4 lg:grid-cols-[minmax(0,1fr)_180px_220px] lg:items-center">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p
                        className={cn(
                          "font-medium",
                          item.event.status === "overdue" || (!item.covered && item.type === "payment")
                            ? "text-[var(--danger)]"
                            : "text-[#111111]"
                        )}
                      >
                        {item.event.title}
                      </p>
                      <Badge
                        tone={
                          item.type === "income"
                            ? "success"
                            : item.event.status === "overdue" || !item.covered
                              ? "danger"
                              : item.canPayFromSingleAccount
                                ? "success"
                                : "warning"
                        }
                      >
                        {item.type === "income"
                          ? "entra plata"
                          : !item.covered
                            ? "falta caja"
                            : item.canPayFromSingleAccount
                              ? "se puede pagar"
                              : "requiere mover"}
                      </Badge>
                    </div>
                    <p className="mt-1 text-sm text-black/55">
                      {item.type === "income" ? "Entra" : item.event.status === "overdue" ? "Vencido" : "Vence"}{" "}
                      {formatDate(item.event.eventDate)} - {item.event.eventType}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.16em] text-black/45">Monto</p>
                    <p
                      className={cn(
                        "mt-1 font-semibold",
                        item.type === "income"
                          ? "text-[var(--success)]"
                        : item.event.status === "overdue" || !item.covered
                            ? "text-[var(--danger)]"
                            : "text-[#111111]"
                      )}
                    >
                      {item.type === "income" ? "+" : "-"}
                      {formatCOP(item.event.amount)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.16em] text-black/45">
                      {item.type === "income" ? "Recibir en" : "Accion sugerida"}
                    </p>
                    <p className="mt-1 text-sm font-medium text-[#111111]">{item.fundingLabel}</p>
                    <p
                      className={cn(
                        "mt-1 text-xs",
                        !item.covered && item.type === "payment"
                          ? "font-semibold text-[var(--danger)]"
                          : item.type === "payment" && !item.canPayFromSingleAccount
                            ? "font-medium text-[var(--warning)]"
                            : "text-black/50"
                      )}
                    >
                      {item.type === "income"
                        ? `Caja proyectada: ${formatCOP(item.projectedCashAfter)}`
                        : item.covered
                          ? item.canPayFromSingleAccount
                            ? `Caja proyectada despues: ${formatCOP(item.projectedCashAfter)}`
                            : `Caja total alcanza, pero no en una sola cuenta`
                          : `Faltan ${formatCOP(item.shortfall)}`}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <EmptyState label="No hay ingresos ni compromisos del mes cargados en calendario." />
            )}
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
                  <p className={cn("font-medium", event.status === "overdue" ? "text-[var(--danger)]" : "text-[#111111]")}>
                    {event.title}
                  </p>
                  <p className={cn("text-sm", event.status === "overdue" ? "text-[var(--danger)]" : "text-black/55")}>
                    {event.eventType} - {formatDate(event.eventDate)}
                  </p>
                </div>
                <p className={cn("font-semibold", event.status === "overdue" ? "text-[var(--danger)]" : "text-[#111111]")}>
                  {formatCOP(event.amount)}
                </p>
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
  if (!accounts.length) {
    return (
      <Card className="p-6">
        <SectionHeader eyebrow="Antes de registrar" title="Primero crea al menos una cuenta o billetera" />
        <p className="mt-3 max-w-2xl text-sm leading-6 text-black/65">
          Arca necesita saber de donde entra o sale la plata. Crea Nequi, efectivo, banco o la cuenta que uses,
          y despues registra movimientos sobre esa cuenta.
        </p>
        <Link
          href="/?view=accounts"
          className="mt-5 inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-[#163a5f] px-4 text-sm font-medium text-white hover:bg-[#102d49]"
        >
          <Plus className="h-4 w-4" />
          Crear cuenta
        </Link>
      </Card>
    );
  }

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
    <div className="grid gap-4 xl:grid-cols-[0.8fr_1.2fr]">
      <Card className="p-5">
        <SectionHeader eyebrow="Nueva cuenta" title="Crear billetera o banco" />
        <form action={createAccount} className="mt-5 space-y-4">
          <label className="block space-y-2">
            <span className={labelClass}>Nombre</span>
            <input name="name" className={fieldClass} placeholder="Nequi, Efectivo, Bancolombia..." required />
          </label>
          <label className="block space-y-2">
            <span className={labelClass}>Tipo</span>
            <select name="type" className={fieldClass} defaultValue="wallet" required>
              <option value="wallet">Billetera</option>
              <option value="bank">Banco</option>
              <option value="cash">Efectivo</option>
              <option value="savings">Ahorro</option>
              <option value="other">Otra</option>
            </select>
          </label>
          <label className="block space-y-2">
            <span className={labelClass}>Saldo actual</span>
            <input name="balance" type="number" step="100" className={fieldClass} defaultValue="0" required />
          </label>
          <input name="color" type="hidden" value="#163a5f" />
          <Button type="submit" className="w-full">
            <Plus className="h-4 w-4" />
            Guardar cuenta
          </Button>
        </form>
      </Card>

      <Card className="p-5">
        <SectionHeader
          eyebrow="Cuentas"
          title="Donde esta la plata"
          action={<Badge tone="neutral">{accounts.length} activas</Badge>}
        />
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {accounts.length ? (
            accounts.map((account) => (
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
            ))
          ) : (
            <EmptyState label="Aun no hay cuentas. Empieza creando la cuenta desde donde manejas tu plata hoy." />
          )}
        </div>
      </Card>
    </div>
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

function CashflowView({
  events,
  transactions,
  type,
}: {
  events: FinancialEvent[];
  transactions: Transaction[];
  type: "income" | "expense";
}) {
  const isIncome = type === "income";

  return (
    <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
      <Card className="p-5">
        <SectionHeader
          eyebrow={isIncome ? "Ingresos esperados" : "Compromisos esperados"}
          title={isIncome ? "Plata por entrar" : "Plata por salir"}
          action={<Badge tone={isIncome ? "success" : "warning"}>{events.length} programados</Badge>}
        />
        <div className="mt-4">
          <EventList
            events={events}
            emptyLabel={isIncome ? "Aun no hay ingresos esperados cargados." : "Aun no hay gastos o pagos esperados cargados."}
          />
        </div>
      </Card>

      <Card className="p-5">
        <SectionHeader
          eyebrow={isIncome ? "Recibidos" : "Pagados"}
          title={isIncome ? "Movimientos reales" : "Salidas registradas"}
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
    </div>
  );
}

function DebtsView({ debts, transactions }: DashboardData) {
  const debtTransactions = transactions.filter((tx) => tx.kind === "debt_payment");

  return (
    <div className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
      <Card className="p-5">
        <SectionHeader eyebrow="Nueva deuda" title="Cargar obligacion real" />
        <form action={createDebt} className="mt-5 grid gap-4 md:grid-cols-2">
          <label className="space-y-2">
            <span className={labelClass}>Nombre</span>
            <input name="name" className={fieldClass} placeholder="Solventa, prestamo familiar..." required />
          </label>
          <label className="space-y-2">
            <span className={labelClass}>Entidad</span>
            <input name="lender" className={fieldClass} placeholder="Banco, persona, app..." required />
          </label>
          <label className="space-y-2">
            <span className={labelClass}>Saldo pendiente</span>
            <input name="balance" type="number" min="1" step="100" className={fieldClass} required />
          </label>
          <label className="space-y-2">
            <span className={labelClass}>Cuota</span>
            <input name="installment" type="number" min="0" step="100" className={fieldClass} defaultValue="0" required />
          </label>
          <label className="space-y-2">
            <span className={labelClass}>Proximo pago</span>
            <input name="nextDueDate" type="date" className={fieldClass} required />
          </label>
          <label className="space-y-2">
            <span className={labelClass}>Meses restantes</span>
            <input name="remainingMonths" type="number" min="0" step="1" className={fieldClass} placeholder="0 si no aplica" />
          </label>
          <label className="space-y-2">
            <span className={labelClass}>Prioridad</span>
            <select name="priority" className={fieldClass} defaultValue="medium" required>
              <option value="high">Alta</option>
              <option value="medium">Media</option>
              <option value="low">Baja</option>
            </select>
          </label>
          <label className="space-y-2">
            <span className={labelClass}>Tipo</span>
            <input name="debtType" className={fieldClass} defaultValue="personal" required />
          </label>
          <label className="space-y-2 md:col-span-2">
            <span className={labelClass}>Notas</span>
            <input name="notes" className={fieldClass} placeholder="Mora, acuerdo, condiciones..." />
          </label>
          <div className="md:col-span-2">
            <Button type="submit" className="w-full">
              <Plus className="h-4 w-4" />
              Guardar deuda
            </Button>
          </div>
        </form>
      </Card>

      <Card className="p-5">
        <SectionHeader eyebrow="Deudas" title="Obligaciones activas" />
        <div className="mt-4 space-y-3">
          {debts.length ? (
            debts.map((debt) => (
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
            ))
          ) : (
            <EmptyState label="Aun no hay deudas cargadas. Agrega cada obligacion con saldo, cuota, plazo y vencimiento." />
          )}
        </div>
      </Card>

      <div className="xl:col-span-2">
        <MovementsView eyebrow="Pagos" title="Pagos de deuda registrados" transactions={debtTransactions} />
      </div>
    </div>
  );
}

function CardsView({ cards, transactions }: DashboardData) {
  const cardTransactions = transactions.filter((tx) => tx.kind === "card_payment");

  return (
    <div className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
      <Card className="p-5">
        <SectionHeader eyebrow="Nueva tarjeta" title="Cargar tarjeta de credito" />
        <form action={createCreditCard} className="mt-5 grid gap-4 md:grid-cols-2">
          <label className="space-y-2">
            <span className={labelClass}>Nombre</span>
            <input name="name" className={fieldClass} placeholder="Nu, Bancolombia Visa..." required />
          </label>
          <label className="space-y-2">
            <span className={labelClass}>Emisor</span>
            <input name="issuer" className={fieldClass} placeholder="Nu, Bancolombia..." required />
          </label>
          <label className="space-y-2">
            <span className={labelClass}>Cupo</span>
            <input name="limit" type="number" min="0" step="100" className={fieldClass} required />
          </label>
          <label className="space-y-2">
            <span className={labelClass}>Usado</span>
            <input name="used" type="number" min="0" step="100" className={fieldClass} defaultValue="0" required />
          </label>
          <label className="space-y-2">
            <span className={labelClass}>Dia corte</span>
            <input name="cutOffDate" type="number" min="1" max="31" className={fieldClass} required />
          </label>
          <label className="space-y-2">
            <span className={labelClass}>Dia pago</span>
            <input name="payDueDate" type="number" min="1" max="31" className={fieldClass} required />
          </label>
          <label className="space-y-2 md:col-span-2">
            <span className={labelClass}>Pago minimo actual</span>
            <input name="minimumPayment" type="number" min="0" step="100" className={fieldClass} defaultValue="0" required />
          </label>
          <div className="md:col-span-2">
            <Button type="submit" className="w-full">
              <Plus className="h-4 w-4" />
              Guardar tarjeta
            </Button>
          </div>
        </form>
      </Card>

      <Card className="p-5">
        <SectionHeader eyebrow="Tarjetas" title="Cupos y fechas de pago" />
        <div className="mt-4 space-y-3">
          {cards.length ? (
            cards.map((card) => (
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
                <div className="mt-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-black/55">Uso del cupo</span>
                    <span className="font-medium text-[#111111]">
                      {getCardUsagePercent(card.used, card.limit)}% / max sugerido 75%
                    </span>
                  </div>
                  <div className="mt-2 h-2 rounded-full bg-black/6">
                    <div
                      className={cn(
                        "h-2 rounded-full",
                        getCardUsagePercent(card.used, card.limit) > 75 ? "bg-[var(--danger)]" : "bg-[var(--success)]"
                      )}
                      style={{ width: `${Math.min(100, getCardUsagePercent(card.used, card.limit))}%` }}
                    />
                  </div>
                  <p className="mt-2 text-xs leading-5 text-black/50">
                    El corte cierra lo consumido del ciclo. La fecha de pago es el ultimo dia para pagar sin afectar mora.
                  </p>
                </div>
              </div>
            ))
          ) : (
            <EmptyState label="Aun no hay tarjetas. Carga cupo, usado, corte, pago y minimo actual." />
          )}
        </div>
      </Card>

      <div className="xl:col-span-2">
        <MovementsView eyebrow="Pagos" title="Pagos de tarjeta registrados" transactions={cardTransactions} />
      </div>
    </div>
  );
}

function SavingsView({ goals, transactions }: DashboardData) {
  const savingsTransactions = transactions.filter(
    (tx) => tx.kind === "saving_contribution" || tx.kind === "saving_withdrawal"
  );

  return (
    <div className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
      <Card className="p-5">
        <SectionHeader eyebrow="Nueva meta" title="Definir objetivo de ahorro" />
        <form action={createSavingsGoal} className="mt-5 grid gap-4 md:grid-cols-2">
          <label className="space-y-2 md:col-span-2">
            <span className={labelClass}>Nombre</span>
            <input name="name" className={fieldClass} placeholder="Fondo de tranquilidad, viaje, inversion..." required />
          </label>
          <label className="space-y-2">
            <span className={labelClass}>Meta</span>
            <input name="target" type="number" min="1" step="100" className={fieldClass} required />
          </label>
          <label className="space-y-2">
            <span className={labelClass}>Actual</span>
            <input name="current" type="number" min="0" step="100" className={fieldClass} defaultValue="0" required />
          </label>
          <label className="space-y-2">
            <span className={labelClass}>Fecha objetivo</span>
            <input name="dueDate" type="date" className={fieldClass} />
          </label>
          <input name="color" type="hidden" value="#16735b" />
          <div className="md:col-span-2">
            <Button type="submit" className="w-full">
              <Plus className="h-4 w-4" />
              Guardar meta
            </Button>
          </div>
        </form>
      </Card>

      <Card className="p-5">
        <SectionHeader eyebrow="Ahorro" title="Metas activas" />
        <div className="mt-4 space-y-5">
          {goals.length ? (
            goals.map((goal) => {
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
            })
          ) : (
            <EmptyState label="Aun no hay metas. Define una meta para que Proyeccion tenga norte." />
          )}
        </div>
      </Card>

      <div className="xl:col-span-2">
        <MovementsView eyebrow="Movimientos" title="Aportes y retiros" transactions={savingsTransactions} />
      </div>
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

function ProjectionsView({ accounts, cards, debts, goals, projections }: DashboardData) {
  const primaryGoal = goals[0];
  const cash = accounts.reduce((total, account) => total + account.balance, 0);
  const monthlyDebtPressure =
    debts.reduce((total, debt) => total + debt.installment, 0) +
    cards.reduce((total, card) => total + card.minimumPayment, 0);
  const totalDebt = getDebtTotal(debts, cards);

  return (
    <div className="space-y-4">
      <Card className="overflow-hidden p-6 md:p-8">
        <p className="text-xs uppercase tracking-[0.22em] text-black/55">Muro financiero</p>
        <h3 className="mt-3 max-w-3xl text-3xl font-semibold leading-tight text-[#111111] md:text-5xl">
          {primaryGoal ? primaryGoal.name : "Define la meta que va a ordenar tus decisiones de plata."}
        </h3>
        <p className="mt-5 max-w-2xl text-sm leading-6 text-black/65">
          Esta vista debe responder si vas acercandote a la vida financiera que quieres, no solo listar numeros.
          Los supuestos se alimentan de cuentas, deudas, tarjetas, ingresos y gastos reales.
        </p>
        <div className="mt-6 grid gap-3 md:grid-cols-3">
          <MetricCard label="Caja actual" value={formatCOP(cash)} tone={cash >= 0 ? "success" : "danger"} />
          <MetricCard label="Deuda total" value={formatCOP(totalDebt)} tone={totalDebt > 0 ? "danger" : "success"} />
          <MetricCard
            label="Presion mensual"
            value={formatCOP(monthlyDebtPressure)}
            tone={monthlyDebtPressure > 0 ? "warning" : "success"}
          />
        </div>
      </Card>

      <div className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
        <Card className="p-5">
          <SectionHeader eyebrow="Supuestos" title="Lo que sostiene la proyeccion" />
          <div className="mt-4 space-y-3">
            <div className="rounded-2xl border border-black/8 p-4">
              <p className="font-medium text-[#111111]">Cuentas reales</p>
              <p className="mt-1 text-sm text-black/55">{accounts.length} cargadas - {formatCOP(cash)}</p>
            </div>
            <div className="rounded-2xl border border-black/8 p-4">
              <p className="font-medium text-[#111111]">Deudas y tarjetas</p>
              <p className="mt-1 text-sm text-black/55">
                {debts.length + cards.length} obligaciones - {formatCOP(monthlyDebtPressure)} al mes
              </p>
            </div>
            <div className="rounded-2xl border border-black/8 p-4">
              <p className="font-medium text-[#111111]">Meta principal</p>
              <p className="mt-1 text-sm text-black/55">
                {primaryGoal ? `${formatCOP(primaryGoal.current)} de ${formatCOP(primaryGoal.target)}` : "Pendiente por definir"}
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-5">
          <SectionHeader eyebrow="Escenarios" title="Cierre esperado" />
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {projections.length ? (
              projections.slice(0, 6).map((item) => (
                <div key={item.id} className="rounded-2xl border border-black/8 p-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-black/45">{getMonthLabel(item.month)}</p>
                  <p className="mt-2 text-lg font-semibold text-[#111111]">{formatCOP(item.closingBalance)}</p>
                  <p className="mt-1 text-sm text-black/55">Ingresos {formatCOP(item.expectedIncome)}</p>
                  <p className="text-sm text-black/55">
                    Salidas {formatCOP(item.expectedExpenses + item.debtPayments + item.cardPayments)}
                  </p>
                </div>
              ))
            ) : (
              <EmptyState label="Aun no hay escenarios. Primero carga cuentas, deudas, tarjetas, ingresos y gastos fijos." />
            )}
          </div>
        </Card>
      </div>
    </div>
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
  const incomeEvents = data.events.filter((event) => event.eventType === "income");
  const expenseEvents = data.events.filter((event) =>
    ["expense", "debt_payment", "card_payment", "saving"].includes(event.eventType)
  );

  switch (view) {
    case "register":
      return <RegisterView {...data} />;
    case "accounts":
      return <AccountsView {...data} />;
    case "income":
      return <CashflowView type="income" events={incomeEvents} transactions={incomeTransactions} />;
    case "expenses":
      return <CashflowView type="expense" events={expenseEvents} transactions={expenseTransactions} />;
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
