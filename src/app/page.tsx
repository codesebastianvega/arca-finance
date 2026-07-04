import Link from "next/link";
import type React from "react";
import {
  AlertTriangle,
  ArrowDownLeft,
  ArrowUpRight,
  Building2,
  CalendarDays,
  CreditCard,
  Eye,
  Landmark,
  LayoutDashboard,
  ListChecks,
  MoveRight,
  Plus,
  PiggyBank,
  Scale,
  Wallet,
  X,
} from "lucide-react";
import {
  createAccount,
  createCreditCard,
  createDebt,
  createSavingsGoal,
  createTransaction,
  createTransfer,
  settleFinancialEvent,
} from "@/app/actions";
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
import type { Account, BusinessUnitKey, Debt, FinancialEvent, Transaction } from "@/lib/types";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type DashboardData = Awaited<ReturnType<typeof loadDashboardData>>;
type ViewKey =
  | "dashboard"
  | "register"
  | "transfers"
  | "accounts"
  | "income"
  | "expenses"
  | "debts"
  | "cards"
  | "savings"
  | "budget"
  | "calendar"
  | "history"
  | "projections"
  | "business";

type HomeProps = {
  searchParams: Promise<{
    saved?: string;
    month?: string;
    view?: string;
    debt?: string;
  }>;
};

const navItems: { label: string; view: ViewKey; icon: typeof LayoutDashboard }[] = [
  { label: "Dashboard", view: "dashboard", icon: LayoutDashboard },
  { label: "Registrar", view: "register", icon: Plus },
  { label: "Transferir", view: "transfers", icon: MoveRight },
  { label: "Cuentas", view: "accounts", icon: Wallet },
  { label: "Ingresos", view: "income", icon: ArrowDownLeft },
  { label: "Gastos", view: "expenses", icon: ArrowUpRight },
  { label: "Deudas", view: "debts", icon: AlertTriangle },
  { label: "Tarjetas", view: "cards", icon: CreditCard },
  { label: "Ahorro", view: "savings", icon: PiggyBank },
  { label: "Presupuesto", view: "budget", icon: Scale },
  { label: "Calendario", view: "calendar", icon: CalendarDays },
  { label: "Historial", view: "history", icon: ListChecks },
  { label: "Proyeccion", view: "projections", icon: ListChecks },
  { label: "Negocios", view: "business", icon: Building2 },
];

const viewTitles: Record<ViewKey, string> = {
  dashboard: "Dashboard operativo",
  register: "Registrar movimiento",
  transfers: "Transferencias",
  accounts: "Cuentas y billeteras",
  income: "Ingresos",
  expenses: "Gastos",
  debts: "Deudas",
  cards: "Tarjetas",
  savings: "Ahorro",
  budget: "Presupuesto",
  calendar: "Calendario financiero",
  history: "Historial",
  projections: "Proyeccion mensual",
  business: "Unidades de negocio",
};

const fieldClass =
  "h-11 w-full rounded-xl border border-black/10 bg-white/70 px-3 text-sm text-[#111111] outline-none transition focus:border-[#163a5f]/50 focus:ring-2 focus:ring-[#163a5f]/10";

const labelClass = "text-xs font-medium uppercase tracking-[0.16em] text-black/55";

const businessLabels: Record<BusinessUnitKey, string> = {
  personal: "Personal",
  empresa: "Empresa",
  deuxio: "Deuxio",
  el_recreo: "El Recreo",
  uxio: "Uxio",
  sie: "SIE Travel",
  aluna: "Aluna",
  arca: "Arca",
  freelance: "Freelance",
};

const coreBusinessUnits: BusinessUnitKey[] = ["el_recreo", "sie", "uxio", "aluna", "arca", "freelance", "personal"];

const outflowKinds: FinancialEvent["eventType"][] = ["expense", "debt_payment", "card_payment", "saving"];

const budgetBuckets = [
  { id: "commitments", label: "Obligaciones", percent: 55, tone: "danger" as const },
  { id: "debt", label: "Deuda y tarjetas", percent: 25, tone: "warning" as const },
  { id: "savings", label: "Ahorro", percent: 10, tone: "success" as const },
  { id: "joy", label: "Ocio y gustos", percent: 5, tone: "neutral" as const },
  { id: "free", label: "Libre/colchon", percent: 5, tone: "success" as const },
];

const suggestedSavingsPockets = ["Alcancia monedas", "Alcancia billetes", "Colchon", "Nu ahorro rentable"];

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

function getPercent(value: number, total: number) {
  if (total <= 0) {
    return 0;
  }

  return Math.max(0, Math.min(100, Math.round((value / total) * 100)));
}

function getCurrentMonthKey() {
  return new Date().toISOString().slice(0, 7);
}

function normalizeMonth(value?: string) {
  return value && /^\d{4}-\d{2}$/.test(value) ? value : getCurrentMonthKey();
}

function getMonthName(monthKey: string) {
  return new Date(`${monthKey}-02T00:00:00`).toLocaleDateString("es-CO", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

function isSelectedMonth(value: string, monthKey: string) {
  return value.slice(0, 7) === monthKey;
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
  const typedUnit = unit as BusinessUnitKey | undefined;

  if (typedUnit && businessLabels[typedUnit]) {
    return business.find((item) => item.id === typedUnit)?.name ?? businessLabels[typedUnit];
  }

  return unit ?? "Sin fuente";
}

function getBusinessOptions(business: DashboardData["business"]) {
  const known = new Set<BusinessUnitKey>();
  const options = [
    ...business.map((unit) => {
      known.add(unit.id);
      return { id: unit.id, name: getBusinessName(business, unit.id) };
    }),
    ...coreBusinessUnits.filter((unit) => !known.has(unit)).map((unit) => ({ id: unit, name: businessLabels[unit] })),
  ];

  return options.filter((option, index) => options.findIndex((item) => item.id === option.id) === index);
}

function getEventStatusLabel(event: FinancialEvent) {
  if (event.status === "overdue") {
    return "vencido";
  }

  if (event.status === "paid" || event.status === "confirmed") {
    return "cerrado";
  }

  if (event.notes?.toLowerCase().includes("por confirmar")) {
    return "fecha por confirmar";
  }

  if (event.notes?.toLowerCase().includes("estimad")) {
    return "estimado";
  }

  return event.status;
}

function getEventKindLabel(event: FinancialEvent) {
  const text = `${event.title} ${event.notes ?? ""}`.toLowerCase();

  if (event.eventType === "income") {
    return "Ingreso";
  }

  if (event.eventType === "card_payment") {
    return "Tarjeta";
  }

  if (event.eventType === "debt_payment") {
    return "Deuda";
  }

  if (text.includes("arriendo")) {
    return "Gasto fijo";
  }

  if (text.includes("agua") || text.includes("gas") || text.includes("luz") || text.includes("claro") || text.includes("internet") || text.includes("celular")) {
    return "Servicio";
  }

  if (event.eventType === "saving") {
    return "Ahorro";
  }

  return "Gasto";
}

function getEventTone(event: FinancialEvent) {
  if (event.status === "overdue") {
    return "danger" as const;
  }

  if (event.eventType === "income") {
    return "success" as const;
  }

  if (event.notes?.toLowerCase().includes("por confirmar")) {
    return "warning" as const;
  }

  return "neutral" as const;
}

function getMonthKey(value: string) {
  return value.slice(0, 7);
}

function addMonthsToMonthKey(monthKey: string, offset: number) {
  const [year, month] = monthKey.split("-").map(Number);
  const date = new Date(year, month - 1 + offset, 1);

  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function addMonthsToDateString(value: string, offset: number) {
  const date = parseCalendarDate(value);
  date.setMonth(date.getMonth() + offset);

  return date.toISOString().slice(0, 10);
}

function getDaysFromToday(value: string) {
  const today = parseCalendarDate(getToday()).getTime();
  const date = parseCalendarDate(value).getTime();

  return Math.round((date - today) / (24 * 60 * 60 * 1000));
}

function getMonthLabelFromKey(monthKey: string) {
  return getMonthLabel(`${monthKey}-01`);
}

function getMonthHref(view: ViewKey, monthKey: string) {
  return `/?view=${view}&month=${monthKey}`;
}

function MonthSwitcher({ activeView, selectedMonth }: { activeView: ViewKey; selectedMonth: string }) {
  const previousMonth = addMonthsToMonthKey(selectedMonth, -1);
  const nextMonth = addMonthsToMonthKey(selectedMonth, 1);

  return (
    <div className="inline-flex items-center rounded-xl border border-black/8 bg-black/3 p-1">
      <Link className="rounded-lg px-3 py-1.5 text-sm text-black/65 hover:bg-black/5" href={getMonthHref(activeView, previousMonth)}>
        Anterior
      </Link>
      <span className="min-w-36 px-3 py-1.5 text-center text-sm font-medium text-[#111111]">{getMonthName(selectedMonth)}</span>
      <Link className="rounded-lg px-3 py-1.5 text-sm text-black/65 hover:bg-black/5" href={getMonthHref(activeView, nextMonth)}>
        Siguiente
      </Link>
    </div>
  );
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

function isTimelineEvent(event: FinancialEvent, monthKey: string) {
  if (!isOpenEvent(event)) {
    return false;
  }

  if (isSelectedMonth(event.eventDate, monthKey)) {
    return event.amount > 0;
  }

  return monthKey === getCurrentMonthKey() && event.status === "overdue" && event.amount > 0;
}

function buildMonthlyCashTimeline(events: FinancialEvent[], accounts: Account[], monthKey: string) {
  const timelineEvents = events.filter((event) => isTimelineEvent(event, monthKey)).sort((a, b) => getEventTime(a) - getEventTime(b));
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

function buildProjectedBalanceData(events: FinancialEvent[], accounts: Account[], startMonth: string) {
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

function buildIncomeSourceData(events: FinancialEvent[], business: DashboardData["business"], monthKey: string) {
  const grouped = new Map<string, number>();

  events
    .filter((event) => isSelectedMonth(event.eventDate, monthKey) && isIncomeEvent(event))
    .forEach((event) => {
      const name = getBusinessName(business, event.unit);
      grouped.set(name, (grouped.get(name) ?? 0) + event.amount);
    });

  return [...grouped.entries()]
    .map(([name, value]) => ({ name, value }))
    .filter((item) => item.value > 0)
    .sort((a, b) => b.value - a.value);
}

function buildBusinessMonthlySummary(data: DashboardData, monthKey: string) {
  const units = new Map<BusinessUnitKey, {
    id: BusinessUnitKey;
    name: string;
    expectedIncome: number;
    receivedIncome: number;
    expenses: number;
    pending: number;
    nextEvent?: FinancialEvent;
  }>();

  const ensureUnit = (unit: BusinessUnitKey) => {
    const existing = units.get(unit);

    if (existing) {
      return existing;
    }

    const created = {
      id: unit,
      name: getBusinessName(data.business, unit),
      expectedIncome: 0,
      receivedIncome: 0,
      expenses: 0,
      pending: 0,
      nextEvent: undefined,
    };

    units.set(unit, created);
    return created;
  };

  coreBusinessUnits.forEach(ensureUnit);
  data.business.forEach((unit) => ensureUnit(unit.id));

  data.events
    .filter((event) => isSelectedMonth(event.eventDate, monthKey))
    .forEach((event) => {
      const unit = ensureUnit(event.unit ?? "personal");
      const isClosed = event.status === "paid" || event.status === "confirmed";

      if (event.eventType === "income") {
        unit.expectedIncome += isClosed ? 0 : event.amount;
        unit.pending += isClosed ? 0 : event.amount;
      } else {
        unit.expenses += event.amount;
        unit.pending += isClosed ? 0 : event.amount;
      }

      if (!isClosed && (!unit.nextEvent || getEventTime(event) < getEventTime(unit.nextEvent))) {
        unit.nextEvent = event;
      }
    });

  data.transactions
    .filter((tx) => isSelectedMonth(tx.date, monthKey))
    .forEach((tx) => {
      const unit = ensureUnit(tx.unit);

      if (tx.kind === "income") {
        unit.receivedIncome += tx.amount;
      } else if (["expense", "debt_payment", "card_payment", "saving_contribution"].includes(tx.kind)) {
        unit.expenses += tx.amount;
      }
    });

  return [...units.values()].sort((a, b) => {
    const totalB = b.expectedIncome + b.receivedIncome + b.expenses + b.pending;
    const totalA = a.expectedIncome + a.receivedIncome + a.expenses + a.pending;

    return totalB - totalA;
  });
}

function getMonthCalendarDays(monthKey: string) {
  const [year, month] = monthKey.split("-").map(Number);
  const firstDay = new Date(year, month - 1, 1);
  const daysInMonth = new Date(year, month, 0).getDate();
  const leadingDays = (firstDay.getDay() + 6) % 7;

  return Array.from({ length: leadingDays + daysInMonth }, (_, index) => {
    if (index < leadingDays) {
      return null;
    }

    return index - leadingDays + 1;
  });
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
              <Badge tone={getEventTone(event)}>{getEventStatusLabel(event)}</Badge>
            </div>
            <p className="mt-1 text-sm text-black/55">
              {getEventKindLabel(event)} - {formatDate(event.eventDate)}
              {event.unit ? ` - ${event.unit}` : ""}
              {event.notes?.toLowerCase().includes("por confirmar") ? " - por confirmar" : ""}
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
  selectedMonth,
}: DashboardData & { selectedMonth: string }) {
  const currentMonthTransactions = transactions.filter((tx) => isSelectedMonth(tx.date, selectedMonth));
  const currentMonthEvents = events.filter((event) => isSelectedMonth(event.eventDate, selectedMonth));
  const overdueOutflowEvents = events.filter(
    (event) =>
      selectedMonth === getCurrentMonthKey() &&
      !isSelectedMonth(event.eventDate, selectedMonth) &&
      event.status === "overdue" &&
      isOutflowEvent(event) &&
      event.amount > 0
  );
  const incomeEvents = currentMonthEvents.filter(isIncomeEvent);
  const outflowEvents = currentMonthEvents.filter((event) => isOutflowEvent(event) && event.amount > 0);
  const cashNow = sumAccounts(accounts);
  const incomeMonth = sumEvents(incomeEvents) + getIncomeMonth(currentMonthTransactions);
  const expenseMonth = sumEvents(outflowEvents) + sumEvents(overdueOutflowEvents) + getExpenseMonth(currentMonthTransactions);
  const availableAfterCommitments = cashNow + incomeMonth - expenseMonth;
  const pressureToCover = Math.max(0, expenseMonth - cashNow);
  const debtTotal = getDebtTotal(debts, cards);
  const cashTimeline = buildMonthlyCashTimeline(events, accounts, selectedMonth);
  const notifications = getUpcomingNotifications(events);
  const transferSuggestions = cashTimeline.filter((item) => item.type === "payment" && item.needsTransfer);
  const transferSuggestionTotal = transferSuggestions.reduce((total, item) => total + item.event.amount, 0);
  const futureEvents = events.filter((event) => isOpenEvent(event)).sort((a, b) => getEventTime(a) - getEventTime(b));
  const flowData = buildProjectedBalanceData(events, accounts, selectedMonth);
  const sourceData = buildIncomeSourceData(events, business, selectedMonth);
  const accountTotalForBars = Math.max(cashNow, 1);

  return (
    <div className="space-y-4">
      <Card className="overflow-hidden p-5 md:p-6">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-black/55">Dashboard - {getMonthName(selectedMonth)}</p>
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
              Usa la vista Transferir para mover saldo entre cuentas y dejar auditoria antes de marcar pagos que requieren combinar caja.
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
                    {accounts.length ? (
                      <form action={settleFinancialEvent} className="mt-3 flex flex-wrap gap-2">
                        <input name="eventId" type="hidden" value={item.event.id} />
                        <select
                          name="accountId"
                          className="h-9 min-w-0 flex-1 rounded-lg border border-black/10 bg-white/70 px-2 text-xs text-[#111111]"
                          defaultValue={item.event.accountId ?? accounts[0]?.id}
                        >
                          {accounts.map((account) => (
                            <option key={account.id} value={account.id}>
                              {account.name}
                            </option>
                          ))}
                        </select>
                        <Button size="sm" type="submit" variant={item.type === "income" ? "primary" : "secondary"}>
                          {item.type === "income" ? "Recibir" : "Pagar"}
                        </Button>
                      </form>
                    ) : null}
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
            {futureEvents.slice(0, 5).map((event) => (
              <div key={event.id} className="flex items-center justify-between gap-4 py-3">
                <div>
                  <p className={cn("font-medium", event.status === "overdue" ? "text-[var(--danger)]" : "text-[#111111]")}>
                    {event.title}
                  </p>
                  <p className={cn("text-sm", event.status === "overdue" ? "text-[var(--danger)]" : "text-black/55")}>
                    {getEventKindLabel(event)} - {formatDate(event.eventDate)}
                  </p>
                </div>
                <p className={cn("font-semibold", event.status === "overdue" ? "text-[var(--danger)]" : "text-[#111111]")}>
                  {formatCOP(event.amount)}
                </p>
              </div>
            ))}
            {!futureEvents.length ? <EmptyState label="No hay eventos futuros abiertos." /> : null}
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
  const businessOptions = getBusinessOptions(business);

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
              {businessOptions.map((unit) => (
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

function TransfersView({ accounts, transactions }: DashboardData) {
  const transferTransactions = transactions.filter((tx) => tx.kind === "transfer");

  if (accounts.length < 2) {
    return (
      <Card className="p-6">
        <SectionHeader eyebrow="Transferencias" title="Necesitas al menos dos cuentas" />
        <p className="mt-3 text-sm leading-6 text-black/65">
          Crea dos cuentas o billeteras para poder mover plata entre ellas y dejar historial.
        </p>
      </Card>
    );
  }

  return (
    <div className="grid gap-4 xl:grid-cols-[0.8fr_1.2fr]">
      <Card className="p-5">
        <SectionHeader eyebrow="Nueva transferencia" title="Mover plata entre cuentas" />
        <form action={createTransfer} className="mt-5 space-y-4">
          <label className="block space-y-2">
            <span className={labelClass}>Desde</span>
            <select name="fromAccountId" className={fieldClass} required>
              {accounts.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.name} - {formatCOP(account.balance)}
                </option>
              ))}
            </select>
          </label>
          <label className="block space-y-2">
            <span className={labelClass}>Hacia</span>
            <select name="toAccountId" className={fieldClass} required>
              {accounts.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.name}
                </option>
              ))}
            </select>
          </label>
          <label className="block space-y-2">
            <span className={labelClass}>Monto</span>
            <input name="amount" type="number" min="1" step="100" className={fieldClass} required />
          </label>
          <label className="block space-y-2">
            <span className={labelClass}>Fecha</span>
            <input name="date" type="date" className={fieldClass} defaultValue={getToday()} required />
          </label>
          <label className="block space-y-2">
            <span className={labelClass}>Concepto</span>
            <input name="concept" className={fieldClass} defaultValue="Transferencia entre cuentas" required />
          </label>
          <Button type="submit" className="w-full">
            <MoveRight className="h-4 w-4" />
            Aplicar transferencia
          </Button>
        </form>
      </Card>

      <Card className="p-5">
        <SectionHeader eyebrow="Historial" title="Transferencias registradas" />
        <div className="mt-4">
          <MovementList transactions={transferTransactions.slice(0, 12)} />
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
  const groupedOutflows = outflowKinds.map((kind) => ({
    kind,
    label:
      kind === "expense"
        ? "Gastos fijos y servicios"
        : kind === "debt_payment"
          ? "Deudas"
          : kind === "card_payment"
            ? "Tarjetas"
            : "Ahorro",
    total: sumEvents(events.filter((event) => event.eventType === kind)),
    count: events.filter((event) => event.eventType === kind).length,
  }));
  const unconfirmedEvents = events.filter((event) => event.notes?.toLowerCase().includes("por confirmar"));

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

      <div className="space-y-4">
        {!isIncome ? (
          <Card className="p-5">
            <SectionHeader eyebrow="Mapa de compromisos" title="Que tipo de salida es" />
            <div className="mt-4 grid gap-3">
              {groupedOutflows.map((item) => (
                <div key={item.kind} className="rounded-2xl border border-black/8 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-medium text-[#111111]">{item.label}</p>
                    <Badge tone={item.count ? "warning" : "neutral"}>{item.count}</Badge>
                  </div>
                  <p className="mt-2 text-xl font-semibold text-[#111111]">{formatCOP(item.total)}</p>
                </div>
              ))}
            </div>
            {unconfirmedEvents.length ? (
              <div className="mt-4 rounded-2xl border border-[rgba(184,106,30,0.22)] bg-[rgba(184,106,30,0.06)] p-4">
                <p className="text-sm font-medium text-[var(--warning)]">Fechas por confirmar</p>
                <p className="mt-1 text-sm leading-6 text-black/65">
                  {unconfirmedEvents.map((event) => event.title).join(", ")} quedan visibles para no perderlos, pero deben validarse con recibo o llamada.
                </p>
              </div>
            ) : null}
          </Card>
        ) : null}

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
    </div>
  );
}

function getDebtPriorityLabel(priority: Debt["priority"]) {
  if (priority === "high") {
    return "Alta";
  }

  if (priority === "medium") {
    return "Media";
  }

  return "Baja";
}

function getDebtStatusLabel(status: Debt["status"]) {
  if (status === "paid") {
    return "Pagada";
  }

  if (status === "late") {
    return "En mora";
  }

  return "Activa";
}

function getDebtStatusTone(debt: Debt) {
  const days = getDaysFromToday(debt.nextDueDate);

  if (debt.status === "late" || days < 0 || debt.priority === "high") {
    return "danger" as const;
  }

  if (days <= 5) {
    return "warning" as const;
  }

  return "success" as const;
}

function getRelatedDebtTransactions(debt: Debt, transactions: Transaction[]) {
  const normalizedName = debt.name.toLowerCase();
  const normalizedLender = debt.lender.toLowerCase();

  return transactions.filter(
    (tx) =>
      tx.kind === "debt_payment" &&
      (tx.concept.toLowerCase().includes(normalizedName) || tx.concept.toLowerCase().includes(normalizedLender))
  );
}

function getDebtPaymentStats(debt: Debt, events: FinancialEvent[], transactions: Transaction[]) {
  const relatedEvents = events
    .filter((event) => event.relatedTable === "debts" && event.relatedId === debt.id)
    .sort((a, b) => getEventTime(a) - getEventTime(b));
  const relatedTransactions = getRelatedDebtTransactions(debt, transactions);
  const closedEvents = relatedEvents.filter((event) => event.status === "paid" || event.status === "confirmed");
  const openEvents = relatedEvents.filter(isOpenEvent);
  const paidFromEvents = sumEvents(closedEvents);
  const paidFromTransactions = relatedTransactions
    .filter((tx) => tx.status === "paid" || tx.status === "confirmed")
    .reduce((total, tx) => total + tx.amount, 0);
  const paidAmount = Math.max(paidFromEvents, paidFromTransactions);
  const paidInstallments = Math.max(
    closedEvents.length,
    relatedTransactions.filter((tx) => tx.status === "paid" || tx.status === "confirmed").length
  );
  const estimatedRemainingInstallments =
    debt.remainingMonths ?? (debt.installment > 0 ? Math.ceil(debt.balance / debt.installment) : 0);
  const estimatedTotal = debt.balance + paidAmount;

  return {
    relatedEvents,
    relatedTransactions,
    openEvents,
    paidAmount,
    paidInstallments,
    estimatedRemainingInstallments,
    estimatedTotal,
    progress: getPercent(paidAmount, estimatedTotal),
  };
}

function DebtDetailModal({
  debt,
  events,
  transactions,
  selectedMonth,
}: {
  debt?: Debt;
  events: FinancialEvent[];
  transactions: Transaction[];
  selectedMonth: string;
}) {
  if (!debt) {
    return null;
  }

  const stats = getDebtPaymentStats(debt, events, transactions);
  const daysToDue = getDaysFromToday(debt.nextDueDate);
  const projectedEndDate =
    stats.estimatedRemainingInstallments > 0 ? addMonthsToDateString(debt.nextDueDate, stats.estimatedRemainingInstallments - 1) : debt.nextDueDate;
  const nextOpenEvent = stats.openEvents[0];
  const monthlyPressure = debt.installment > 0 ? getPercent(debt.installment, Math.max(debt.balance, debt.installment)) : 0;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/35 p-4 backdrop-blur-sm">
      <div className="mx-auto max-w-5xl">
        <Card className="relative overflow-hidden p-5 shadow-[0_24px_80px_rgba(17,17,17,0.28)] md:p-6">
          <Link
            href={getMonthHref("debts", selectedMonth)}
            className="absolute right-4 top-4 inline-flex h-9 w-9 items-center justify-center rounded-full bg-black/5 text-black/65 hover:bg-black/10"
            aria-label="Cerrar detalle de deuda"
          >
            <X className="h-4 w-4" />
          </Link>

          <div className="pr-12">
            <p className="text-xs uppercase tracking-[0.22em] text-black/55">Detalle de deuda</p>
            <h3 className="mt-2 text-2xl font-semibold text-[#111111] md:text-4xl">{debt.name}</h3>
            <div className="mt-3 flex flex-wrap gap-2">
              <Badge tone={getDebtStatusTone(debt)}>{getDebtStatusLabel(debt.status)}</Badge>
              <Badge tone={debt.priority === "high" ? "danger" : "warning"}>Prioridad {getDebtPriorityLabel(debt.priority)}</Badge>
              <Badge tone="neutral">{debt.debtType}</Badge>
              <Badge tone={daysToDue < 0 ? "danger" : daysToDue <= 5 ? "warning" : "success"}>
                {daysToDue < 0 ? `${Math.abs(daysToDue)} dias vencida` : daysToDue === 0 ? "vence hoy" : `faltan ${daysToDue} dias`}
              </Badge>
            </div>
          </div>

          <div className="mt-6 grid gap-3 md:grid-cols-4">
            <MetricCard label="Saldo pendiente" value={formatCOP(debt.balance)} tone={debt.balance > 0 ? "danger" : "success"} />
            <MetricCard label="Cuota actual" value={formatCOP(debt.installment)} tone={debt.installment > 0 ? "warning" : "neutral"} />
            <MetricCard label="Cuotas pagadas" value={`${stats.paidInstallments}`} delta="segun pagos registrados" tone="success" />
            <MetricCard
              label="Cuotas pendientes"
              value={`${stats.estimatedRemainingInstallments}`}
              delta={debt.remainingMonths ? "dato cargado" : "estimadas por saldo/cuota"}
              tone="warning"
            />
          </div>

          <div className="mt-5 grid gap-4 xl:grid-cols-[1fr_1fr]">
            <div className="rounded-2xl border border-black/8 p-4">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.16em] text-black/45">Avance estimado</p>
                  <p className="mt-1 text-sm text-black/60">Pagado registrado contra saldo historico conocido.</p>
                </div>
                <p className="text-lg font-semibold text-[#111111]">{stats.progress}%</p>
              </div>
              <div className="mt-4 h-3 rounded-full bg-black/6">
                <div className="h-3 rounded-full bg-[var(--success)]" style={{ width: `${stats.progress}%` }} />
              </div>
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                <div>
                  <p className="text-xs uppercase tracking-[0.16em] text-black/45">Pagado registrado</p>
                  <p className="mt-1 font-semibold text-[#111111]">{formatCOP(stats.paidAmount)}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.16em] text-black/45">Total conocido</p>
                  <p className="mt-1 font-semibold text-[#111111]">{formatCOP(stats.estimatedTotal)}</p>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-black/8 p-4">
              <p className="text-xs uppercase tracking-[0.16em] text-black/45">Plan de pago</p>
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                <div>
                  <p className="text-sm text-black/55">Proximo pago</p>
                  <p className="mt-1 font-semibold text-[#111111]">{formatDate(debt.nextDueDate)}</p>
                </div>
                <div>
                  <p className="text-sm text-black/55">Fecha final estimada</p>
                  <p className="mt-1 font-semibold text-[#111111]">{formatDate(projectedEndDate)}</p>
                </div>
                <div>
                  <p className="text-sm text-black/55">Presion cuota/saldo</p>
                  <p className="mt-1 font-semibold text-[#111111]">{monthlyPressure}%</p>
                </div>
                <div>
                  <p className="text-sm text-black/55">Evento abierto</p>
                  <p className="mt-1 font-semibold text-[#111111]">{nextOpenEvent ? formatCOP(nextOpenEvent.amount) : "Sin evento"}</p>
                </div>
              </div>
              <div className="mt-4 rounded-2xl bg-black/3 p-4">
                <p className="text-sm font-medium text-[#111111]">Lectura operativa</p>
                <p className="mt-1 text-sm leading-6 text-black/60">
                  {daysToDue < 0
                    ? "Esta deuda esta vencida o necesita acuerdo. Debe quedar arriba en la agenda de caja."
                    : daysToDue <= 5
                      ? "Pago proximo. Conviene reservar caja antes de registrar gastos nuevos."
                      : "Aun hay margen, pero debe mantenerse en proyeccion mensual."}
                </p>
              </div>
            </div>
          </div>

          <div className="mt-4 grid gap-4 xl:grid-cols-[1fr_1fr]">
            <div className="rounded-2xl border border-black/8 p-4">
              <SectionHeader eyebrow="Cronograma" title="Eventos de esta deuda" />
              <div className="mt-3 divide-y divide-black/8">
                {stats.relatedEvents.length ? (
                  stats.relatedEvents.map((event) => (
                    <div key={event.id} className="grid gap-2 py-3 md:grid-cols-[1fr_auto] md:items-center">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-medium text-[#111111]">{event.title}</p>
                          <Badge tone={getEventTone(event)}>{getEventStatusLabel(event)}</Badge>
                        </div>
                        <p className="mt-1 text-sm text-black/55">{formatDate(event.eventDate)}</p>
                      </div>
                      <p className="font-semibold text-[#111111]">{formatCOP(event.amount)}</p>
                    </div>
                  ))
                ) : (
                  <EmptyState label="No hay eventos asociados. Los proximos pagos se estiman con cuota y saldo." />
                )}
              </div>
            </div>

            <div className="rounded-2xl border border-black/8 p-4">
              <SectionHeader eyebrow="Historial" title="Pagos registrados" />
              <div className="mt-3 divide-y divide-black/8">
                {stats.relatedTransactions.length ? (
                  stats.relatedTransactions.slice(0, 8).map((tx) => (
                    <div key={tx.id} className="grid gap-2 py-3 md:grid-cols-[1fr_auto] md:items-center">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-medium text-[#111111]">{tx.concept}</p>
                          <Badge tone={getTransactionTone(tx.kind)}>{tx.status}</Badge>
                        </div>
                        <p className="mt-1 text-sm text-black/55">{formatDate(tx.date)}</p>
                      </div>
                      <p className="font-semibold text-[#111111]">{formatCOP(tx.amount)}</p>
                    </div>
                  ))
                ) : (
                  <EmptyState label="Aun no hay pagos cerrados detectados para esta deuda." />
                )}
              </div>
            </div>
          </div>

          <div className="mt-4 rounded-2xl border border-black/8 p-4">
            <SectionHeader eyebrow="Notas y datos faltantes" title="Contexto para decisiones" />
            <p className="mt-3 text-sm leading-6 text-black/65">
              {debt.notes || "Sin notas registradas. Aqui conviene guardar acuerdo, numero de credito, mora, cuotas reales, telefono o comprobante."}
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
}

function DebtsView({
  debts,
  events,
  transactions,
  selectedDebtId,
  selectedMonth,
}: DashboardData & { selectedDebtId?: string; selectedMonth: string }) {
  const debtTransactions = transactions.filter((tx) => tx.kind === "debt_payment");
  const selectedDebt = debts.find((debt) => debt.id === selectedDebtId);

  return (
    <div className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
      <DebtDetailModal debt={selectedDebt} events={events} transactions={transactions} selectedMonth={selectedMonth} />
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
            debts.map((debt) => {
              const stats = getDebtPaymentStats(debt, events, transactions);
              const daysToDue = getDaysFromToday(debt.nextDueDate);

              return (
                <div key={debt.id} className="rounded-2xl border border-black/8 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium text-[#111111]">{debt.name}</p>
                      <p className="text-sm text-black/55">
                        {debt.lender} - vence {formatDate(debt.nextDueDate)}
                      </p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        <Badge tone={getDebtStatusTone(debt)}>{getDebtStatusLabel(debt.status)}</Badge>
                        <Badge tone={debt.priority === "high" ? "danger" : "warning"}>{getDebtPriorityLabel(debt.priority)}</Badge>
                        <Badge tone={daysToDue < 0 ? "danger" : daysToDue <= 5 ? "warning" : "neutral"}>
                          {daysToDue < 0 ? `${Math.abs(daysToDue)} dias vencida` : `${daysToDue} dias`}
                        </Badge>
                      </div>
                    </div>
                    <Link
                      href={`/?view=debts&month=${selectedMonth}&debt=${debt.id}`}
                      className="inline-flex h-9 shrink-0 items-center gap-2 rounded-xl bg-black/5 px-3 text-sm font-medium text-[#111111] hover:bg-black/10"
                    >
                      <Eye className="h-4 w-4" />
                      Detalle
                    </Link>
                  </div>
                  <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
                    <div>
                      <p className="text-xs uppercase tracking-[0.16em] text-black/45">Saldo</p>
                      <p className="mt-1 font-semibold text-[#111111]">{formatCOP(debt.balance)}</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-[0.16em] text-black/45">Cuota</p>
                      <p className="mt-1 font-semibold text-[#111111]">{formatCOP(debt.installment)}</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-[0.16em] text-black/45">Pagadas</p>
                      <p className="mt-1 font-semibold text-[#111111]">{stats.paidInstallments}</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-[0.16em] text-black/45">Pendientes</p>
                      <p className="mt-1 font-semibold text-[#111111]">{stats.estimatedRemainingInstallments}</p>
                    </div>
                  </div>
                  <div className="mt-4 h-2 rounded-full bg-black/6">
                    <div className="h-2 rounded-full bg-[var(--success)]" style={{ width: `${stats.progress}%` }} />
                  </div>
                </div>
              );
            })
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
            <div className="space-y-3">
              <EmptyState label="Aun no hay metas. Define una meta para que Proyeccion tenga norte." />
              {suggestedSavingsPockets.map((name) => (
                <div key={name} className="rounded-2xl border border-black/8 p-4">
                  <p className="font-medium text-[#111111]">{name}</p>
                  <p className="mt-1 text-sm text-black/55">Bolsillo sugerido para separar plata antes de gastarla.</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </Card>

      <Card className="p-5 xl:col-span-2">
        <SectionHeader eyebrow="Definicion" title="Para que sirve ahorro en Arca" />
        <div className="mt-4 grid gap-3 md:grid-cols-4">
          {suggestedSavingsPockets.map((name) => (
            <div key={name} className="rounded-2xl bg-black/3 p-4">
              <p className="font-medium text-[#111111]">{name}</p>
              <p className="mt-2 text-sm leading-6 text-black/60">
                {name === "Colchon"
                  ? "Reserva para emergencias y meses apretados."
                  : name === "Nu ahorro rentable"
                    ? "Plata que puede rentar, pero no deberia mezclarse con gasto diario."
                    : "Separador fisico para guardar efectivo sin contarlo como libre."}
              </p>
            </div>
          ))}
        </div>
      </Card>

      <div className="xl:col-span-2">
        <MovementsView eyebrow="Movimientos" title="Aportes y retiros" transactions={savingsTransactions} />
      </div>
    </div>
  );
}

function BudgetView({ events, transactions, selectedMonth }: DashboardData & { selectedMonth: string }) {
  const monthEvents = events.filter((event) => isSelectedMonth(event.eventDate, selectedMonth) && isOpenEvent(event));
  const monthTransactions = transactions.filter((tx) => isSelectedMonth(tx.date, selectedMonth));
  const income = sumEvents(monthEvents.filter((event) => event.eventType === "income")) + getIncomeMonth(monthTransactions);
  const fixedExpenses = sumEvents(monthEvents.filter((event) => event.eventType === "expense"));
  const debtAndCards = sumEvents(monthEvents.filter((event) => event.eventType === "debt_payment" || event.eventType === "card_payment"));
  const savings = sumEvents(monthEvents.filter((event) => event.eventType === "saving"));
  const spent = getExpenseMonth(monthTransactions);
  const committed = fixedExpenses + debtAndCards + savings + spent;
  const freeAfterCommitments = income - committed;

  return (
    <div className="space-y-4">
      <Card className="p-5 md:p-6">
        <SectionHeader
          eyebrow="Decision de compra"
          title={`Presupuesto operativo - ${getMonthName(selectedMonth)}`}
          action={<Badge tone={freeAfterCommitments >= 0 ? "success" : "danger"}>{formatCOP(freeAfterCommitments)}</Badge>}
        />
        <div className="mt-5 grid gap-3 md:grid-cols-4">
          <MetricCard label="Ingreso base del mes" value={formatCOP(income)} tone="success" />
          <MetricCard label="Comprometido" value={formatCOP(committed)} tone={committed > income ? "danger" : "warning"} />
          <MetricCard label="Libre estimado" value={formatCOP(freeAfterCommitments)} tone={freeAfterCommitments >= 0 ? "success" : "danger"} />
          <MetricCard label="Gastos reales ya hechos" value={formatCOP(spent)} tone={spent > 0 ? "warning" : "neutral"} />
        </div>
      </Card>

      <div className="grid gap-4 xl:grid-cols-[1fr_1fr]">
        <Card className="p-5">
          <SectionHeader eyebrow="Regla guia" title="Distribucion sugerida" />
          <div className="mt-4 space-y-4">
            {budgetBuckets.map((bucket) => {
              const amount = Math.round((income * bucket.percent) / 100);

              return (
                <div key={bucket.id}>
                  <div className="flex items-center justify-between gap-3 text-sm">
                    <div>
                      <p className="font-medium text-[#111111]">{bucket.label}</p>
                      <p className="text-black/50">{bucket.percent}% del ingreso estimado</p>
                    </div>
                    <p className="font-semibold text-[#111111]">{formatCOP(amount)}</p>
                  </div>
                  <div className="mt-2 h-2 rounded-full bg-black/6">
                    <div className="h-2 rounded-full bg-[#163a5f]" style={{ width: `${bucket.percent}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        <Card className="p-5">
          <SectionHeader eyebrow="Realidad del mes" title="Lo que ya aprieta" />
          <div className="mt-4 space-y-3">
            <div className="rounded-2xl border border-black/8 p-4">
              <p className="text-xs uppercase tracking-[0.16em] text-black/45">Gastos fijos y servicios</p>
              <p className="mt-1 text-xl font-semibold text-[#111111]">{formatCOP(fixedExpenses)}</p>
            </div>
            <div className="rounded-2xl border border-black/8 p-4">
              <p className="text-xs uppercase tracking-[0.16em] text-black/45">Deudas y tarjetas</p>
              <p className="mt-1 text-xl font-semibold text-[#111111]">{formatCOP(debtAndCards)}</p>
            </div>
            <div className="rounded-2xl border border-black/8 p-4">
              <p className="text-xs uppercase tracking-[0.16em] text-black/45">Ahorro programado</p>
              <p className="mt-1 text-xl font-semibold text-[#111111]">{formatCOP(savings)}</p>
            </div>
            <div className={cn("rounded-2xl p-4", freeAfterCommitments >= 0 ? "bg-[rgba(22,115,91,0.08)]" : "bg-[rgba(164,61,49,0.08)]")}>
              <p className={cn("text-sm font-medium", freeAfterCommitments >= 0 ? "text-[var(--success)]" : "text-[var(--danger)]")}>
                {freeAfterCommitments >= 0 ? "Compra posible con control" : "No conviene comprar todavia"}
              </p>
              <p className="mt-1 text-sm leading-6 text-black/65">
                Esta lectura no es contabilidad formal: es caja operativa para decidir si puedes gastar sin romper pagos del mes.
              </p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}

function CalendarView({ events, transactions, selectedMonth }: DashboardData & { selectedMonth: string }) {
  const monthEvents = events
    .filter((event) => isSelectedMonth(event.eventDate, selectedMonth))
    .sort((a, b) => getEventTime(a) - getEventTime(b));
  const upcoming = getUpcomingPayments(transactions).filter((tx) => isSelectedMonth(tx.date, selectedMonth));
  const days = getMonthCalendarDays(selectedMonth);
  const eventsByDay = new Map<number, FinancialEvent[]>();

  monthEvents.forEach((event) => {
    const day = parseCalendarDate(event.eventDate).getDate();
    eventsByDay.set(day, [...(eventsByDay.get(day) ?? []), event]);
  });

  return (
    <div className="space-y-4">
      <Card className="p-5">
        <SectionHeader
          eyebrow="Calendario"
          title={`Vista mensual - ${getMonthName(selectedMonth)}`}
          action={<Badge tone="neutral">{monthEvents.length} eventos</Badge>}
        />
        <div className="mt-5 grid grid-cols-7 gap-2 text-center text-xs uppercase tracking-[0.14em] text-black/45">
          {["Lun", "Mar", "Mie", "Jue", "Vie", "Sab", "Dom"].map((day) => (
            <span key={day}>{day}</span>
          ))}
        </div>
        <div className="mt-2 grid grid-cols-7 gap-2">
          {days.map((day, index) => {
            const dayEvents = day ? eventsByDay.get(day) ?? [] : [];

            return (
              <div
                key={`${day ?? "empty"}-${index}`}
                className={cn(
                  "min-h-28 rounded-xl border border-black/8 bg-white/45 p-2",
                  !day && "border-transparent bg-transparent"
                )}
              >
                {day ? (
                  <>
                    <p className="text-sm font-semibold text-[#111111]">{day}</p>
                    <div className="mt-2 space-y-1">
                      {dayEvents.slice(0, 3).map((event) => (
                        <div
                          key={event.id}
                          className={cn(
                            "rounded-lg px-2 py-1 text-left text-[11px] leading-4",
                            event.eventType === "income"
                              ? "bg-[rgba(22,115,91,0.10)] text-[var(--success)]"
                              : event.status === "overdue"
                                ? "bg-[rgba(164,61,49,0.10)] text-[var(--danger)]"
                                : "bg-black/5 text-black/70"
                          )}
                          title={`${event.title} - ${formatCOP(event.amount)}`}
                        >
                          <span className="block truncate font-medium">{event.title}</span>
                          <span>{formatCOP(event.amount)}</span>
                        </div>
                      ))}
                      {dayEvents.length > 3 ? <p className="text-[11px] text-black/45">+{dayEvents.length - 3} mas</p> : null}
                    </div>
                  </>
                ) : null}
              </div>
            );
          })}
        </div>
      </Card>

      <div className="grid gap-4 xl:grid-cols-[1fr_1fr]">
        <Card className="p-5">
          <SectionHeader eyebrow="Lista operativa" title="Eventos del mes en orden" />
          <div className="mt-4">
            <EventList events={monthEvents} emptyLabel="No hay eventos financieros para este mes." />
          </div>
        </Card>

        <MovementsView eyebrow="Pendientes" title="Movimientos por pagar/cobrar" transactions={upcoming} />
      </div>
    </div>
  );
}

function HistoryView({ transactions, selectedMonth }: DashboardData & { selectedMonth: string }) {
  const monthTransactions = transactions.filter((tx) => isSelectedMonth(tx.date, selectedMonth));
  const confirmed = monthTransactions.filter((tx) => tx.status === "paid" || tx.status === "confirmed");
  const pending = monthTransactions.filter((tx) => tx.status !== "paid" && tx.status !== "confirmed");

  return (
    <div className="grid gap-4 xl:grid-cols-[1fr_1fr]">
      <Card className="p-5">
        <SectionHeader
          eyebrow="Historial"
          title={`Movimientos cerrados - ${getMonthName(selectedMonth)}`}
          action={<Badge tone="success">{confirmed.length}</Badge>}
        />
        <div className="mt-4">
          <MovementList transactions={confirmed} />
        </div>
      </Card>

      <Card className="p-5">
        <SectionHeader
          eyebrow="Pendientes"
          title="Movimientos no cerrados"
          action={<Badge tone={pending.length ? "warning" : "success"}>{pending.length}</Badge>}
        />
        <div className="mt-4">
          <MovementList transactions={pending} />
        </div>
      </Card>
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

function BusinessView(data: DashboardData & { selectedMonth: string }) {
  const businessSummary = buildBusinessMonthlySummary(data, data.selectedMonth);

  return (
    <Card className="p-5">
      <SectionHeader eyebrow="Unidades" title={`Resultado por negocio - ${getMonthName(data.selectedMonth)}`} />
      <div className="mt-4 grid gap-3">
        {businessSummary.map((unit) => {
          const net = unit.receivedIncome + unit.expectedIncome - unit.expenses;

          return (
          <div
            key={unit.id}
            className="grid gap-3 rounded-2xl border border-black/8 p-4 md:grid-cols-[1.4fr_1fr_1fr_1fr_1fr] md:items-center"
          >
            <div>
              <p className="font-medium text-[#111111]">{unit.name}</p>
              <p className="text-sm text-black/55">
                {unit.nextEvent ? `${unit.nextEvent.title} - ${formatDate(unit.nextEvent.eventDate)}` : "Sin proximo evento del mes"}
              </p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.16em] text-black/45">Por cobrar</p>
              <p className="mt-1 font-semibold text-[#111111]">{formatCOP(unit.expectedIncome)}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.16em] text-black/45">Recibido</p>
              <p className="mt-1 font-semibold text-[#111111]">{formatCOP(unit.receivedIncome)}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.16em] text-black/45">Gastos</p>
              <p className="mt-1 font-semibold text-[#111111]">{formatCOP(unit.expenses)}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.16em] text-black/45">Neto</p>
              <p className={cn("mt-1 font-semibold", net >= 0 ? "text-[var(--success)]" : "text-[var(--danger)]")}>{formatCOP(net)}</p>
            </div>
          </div>
          );
        })}
      </div>
    </Card>
  );
}

function renderView(view: ViewKey, data: DashboardData, selectedMonth: string, selectedDebtId?: string) {
  const incomeTransactions = data.transactions.filter((tx) => tx.kind === "income" && isSelectedMonth(tx.date, selectedMonth));
  const expenseTransactions = data.transactions.filter((tx) =>
    ["expense", "debt_payment", "card_payment", "saving_contribution"].includes(tx.kind) && isSelectedMonth(tx.date, selectedMonth)
  );
  const incomeEvents = data.events.filter((event) => event.eventType === "income" && isOpenEvent(event) && isSelectedMonth(event.eventDate, selectedMonth));
  const expenseEvents = data.events.filter((event) =>
    ["expense", "debt_payment", "card_payment", "saving"].includes(event.eventType) && isOpenEvent(event) && isSelectedMonth(event.eventDate, selectedMonth)
  );

  switch (view) {
    case "register":
      return <RegisterView {...data} />;
    case "transfers":
      return <TransfersView {...data} />;
    case "accounts":
      return <AccountsView {...data} />;
    case "income":
      return <CashflowView type="income" events={incomeEvents} transactions={incomeTransactions} />;
    case "expenses":
      return <CashflowView type="expense" events={expenseEvents} transactions={expenseTransactions} />;
    case "debts":
      return <DebtsView {...data} selectedDebtId={selectedDebtId} selectedMonth={selectedMonth} />;
    case "cards":
      return <CardsView {...data} />;
    case "savings":
      return <SavingsView {...data} />;
    case "budget":
      return <BudgetView {...data} selectedMonth={selectedMonth} />;
    case "calendar":
      return <CalendarView {...data} selectedMonth={selectedMonth} />;
    case "history":
      return <HistoryView {...data} selectedMonth={selectedMonth} />;
    case "projections":
      return <ProjectionsView {...data} />;
    case "business":
      return <BusinessView {...data} selectedMonth={selectedMonth} />;
    default:
      return <DashboardView {...data} selectedMonth={selectedMonth} />;
  }
}

export default async function Home({ searchParams }: HomeProps) {
  const params = await searchParams;
  const activeView = getView(params.view);
  const selectedMonth = normalizeMonth(params.month);
  const data = await loadDashboardData();
  const dataTone = data.source === "supabase" ? "success" : data.source === "error" ? "danger" : "warning";
  const dataLabel = data.source === "supabase" ? "Supabase" : data.source === "error" ? "Error datos" : "Sin datos";

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
                  href={getMonthHref(item.view, selectedMonth)}
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
              {data.source === "supabase"
                ? "Los registros manuales escriben en Supabase y actualizan saldos cuando el movimiento queda pagado."
                : data.issue ?? "Arca no esta mostrando datos inventados. Revisa la conexion para cargar datos reales."}
            </p>
            <Badge className="mt-4" tone={dataTone}>
              {data.source === "supabase" ? "Supabase conectado" : dataLabel}
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
                <MonthSwitcher activeView={activeView} selectedMonth={selectedMonth} />
                <Badge tone="warning">COP</Badge>
                <Badge tone={dataTone}>{dataLabel}</Badge>
                <Link
                  href={getMonthHref("register", selectedMonth)}
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
                  href={getMonthHref(item.view, selectedMonth)}
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

          <div className="shell-grid flex-1 overflow-y-auto p-4 md:p-6">{renderView(activeView, data, selectedMonth, params.debt)}</div>
        </section>
      </div>
    </main>
  );
}
