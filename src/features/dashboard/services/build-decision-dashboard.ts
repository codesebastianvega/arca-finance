import { isAfter, isBefore, isSameMonth, startOfDay } from "date-fns";
import { formatCOP, parseCalendarDate } from "@/lib/finance";
import type { DashboardData } from "@/lib/dashboard-data";
import type {
  Account,
  BusinessSummary,
  CreditCard,
  Debt,
  MonthlyProjection,
  SavingsGoal,
  ScheduledEvent,
  TodaySummary,
  Transaction,
} from "@/lib/types";

const outflowKinds = new Set<ScheduledEvent["kind"]>(["expense", "debt_payment", "card_payment", "saving"]);
const settledStatuses = new Set(["paid", "confirmed", "cancelled"]);

type FundingDecision = {
  accountName: string;
  status: "ready" | "combine" | "wait";
  balanceAfter?: number;
  shortfall?: number;
};

export type DecisionTimelineItem = {
  id: string;
  title: string;
  dueDate: string;
  amount: number;
  kind: ScheduledEvent["kind"];
  status: ScheduledEvent["status"];
  accountId?: string;
  urgency: "overdue" | "today" | "soon" | "later";
  canConfirmQuickly: boolean;
  funding: FundingDecision;
};

export type DecisionDashboard = {
  currentCash: number;
  protectedSavings: number;
  freeCash: number;
  monthlyExpectedIncome: number;
  monthlyCommitments: number;
  monthlyPostedExpenses: number;
  monthRunway: number;
  debtExposure: number;
  nextIncome?: ScheduledEvent;
  overdueCount: number;
  urgentItems: DecisionTimelineItem[];
  accountsByBalance: Account[];
  businesses: BusinessSummary[];
  cards: CreditCard[];
  debts: Debt[];
  savings: SavingsGoal[];
  transactions: Transaction[];
  projections: MonthlyProjection[];
  scheduledEvents: ScheduledEvent[];
};

function getTotalBalance(accounts: Account[]) {
  return accounts.filter((account) => account.active).reduce((total, account) => total + account.balance, 0);
}

function getProtectedSavings(goals: SavingsGoal[]) {
  return goals.reduce((total, goal) => total + goal.current, 0);
}

function getDebtExposure(debts: Debt[], cards: CreditCard[]) {
  const debtTotal = debts.reduce((total, debt) => total + debt.balance, 0);
  const cardTotal = cards.reduce((total, card) => total + card.used, 0);

  return debtTotal + cardTotal;
}

function resolveFunding(accounts: Account[], amount: number): FundingDecision {
  const sorted = [...accounts].sort((left, right) => right.balance - left.balance);
  const direct = sorted.find((account) => account.balance >= amount);

  if (direct) {
    return {
      accountName: direct.name,
      status: "ready",
      balanceAfter: direct.balance - amount,
    };
  }

  const combinedTotal = sorted.reduce((total, account) => total + account.balance, 0);

  if (combinedTotal >= amount && sorted[0]) {
    return {
      accountName: `${sorted[0].name} + otra cuenta`,
      status: "combine",
      balanceAfter: combinedTotal - amount,
    };
  }

  return {
    accountName: sorted[0]?.name ?? "Cuenta por definir",
    status: "wait",
    shortfall: Math.max(0, amount - combinedTotal),
  };
}

function getUrgency(event: ScheduledEvent, today: Date) {
  const dueDate = startOfDay(parseCalendarDate(event.dueDate));
  const todayDate = startOfDay(today);

  if (settledStatuses.has(event.status)) {
    return "later" as const;
  }

  if (isBefore(dueDate, todayDate)) {
    return "overdue" as const;
  }

  if (dueDate.getTime() === todayDate.getTime()) {
    return "today" as const;
  }

  const soonLimit = new Date(todayDate);
  soonLimit.setDate(soonLimit.getDate() + 7);

  if (!isAfter(dueDate, soonLimit)) {
    return "soon" as const;
  }

  return "later" as const;
}

function buildTimeline(accounts: Account[], events: ScheduledEvent[], today: Date) {
  return events
    .filter((event) => !settledStatuses.has(event.status))
    .map((event) => ({
      id: event.id,
      title: event.title,
      dueDate: event.dueDate,
      amount: event.amount,
      kind: event.kind,
      status: event.status,
      accountId: event.accountId,
      urgency: getUrgency(event, today),
      canConfirmQuickly: Boolean(event.accountId),
      funding: outflowKinds.has(event.kind)
        ? resolveFunding(accounts, event.amount)
        : {
            accountName: "Ingreso esperado",
            status: "ready" as const,
          },
    }))
    .sort((left, right) => parseCalendarDate(left.dueDate).getTime() - parseCalendarDate(right.dueDate).getTime());
}

function getMonthlyExpectedIncome(events: ScheduledEvent[], month: Date) {
  return events
    .filter((event) => event.kind === "income" && !settledStatuses.has(event.status) && isSameMonth(parseCalendarDate(event.dueDate), month))
    .reduce((total, event) => total + event.amount, 0);
}

function getMonthlyCommitments(events: ScheduledEvent[], month: Date) {
  return events
    .filter((event) => outflowKinds.has(event.kind) && !settledStatuses.has(event.status) && isSameMonth(parseCalendarDate(event.dueDate), month))
    .reduce((total, event) => total + event.amount, 0);
}

function getMonthlyPostedExpenses(transactions: Transaction[], month: Date) {
  return transactions
    .filter((item) => item.kind !== "income" && isSameMonth(parseCalendarDate(item.date), month))
    .reduce((total, item) => total + item.amount, 0);
}

export function buildDecisionDashboard(data: DashboardData, month = new Date()): DecisionDashboard {
  const today = new Date();
  const currentCash = getTotalBalance(data.accounts);
  const protectedSavings = getProtectedSavings(data.goals);
  const freeCash = currentCash - protectedSavings;
  const monthlyExpectedIncome = getMonthlyExpectedIncome(data.scheduledEvents, month);
  const monthlyCommitments = getMonthlyCommitments(data.scheduledEvents, month);
  const monthlyPostedExpenses = getMonthlyPostedExpenses(data.transactions, month);
  const monthRunway = freeCash + monthlyExpectedIncome - monthlyCommitments;
  const debtExposure = getDebtExposure(data.debts, data.cards);
  const urgentItems = buildTimeline(data.accounts, data.scheduledEvents, today);
  const overdueCount = urgentItems.filter((item) => item.urgency === "overdue").length;
  const nextIncome = data.scheduledEvents
    .filter((item) => item.kind === "income" && !settledStatuses.has(item.status))
    .sort((left, right) => parseCalendarDate(left.dueDate).getTime() - parseCalendarDate(right.dueDate).getTime())[0];

  return {
    currentCash,
    protectedSavings,
    freeCash,
    monthlyExpectedIncome,
    monthlyCommitments,
    monthlyPostedExpenses,
    monthRunway,
    debtExposure,
    nextIncome,
    overdueCount,
    urgentItems,
    accountsByBalance: [...data.accounts].sort((left, right) => right.balance - left.balance),
    businesses: data.business,
    cards: data.cards,
    debts: data.debts,
    savings: data.goals,
    transactions: data.transactions,
    projections: data.projections,
    scheduledEvents: data.scheduledEvents,
  };
}

export function mergeTodaySummaryWithData(summary: TodaySummary, data: DashboardData): DecisionDashboard {
  return {
    currentCash: summary.currentCash,
    protectedSavings: summary.protectedSavings,
    freeCash: summary.freeCash,
    monthlyExpectedIncome: summary.monthlyExpectedIncome,
    monthlyCommitments: summary.monthlyCommitments,
    monthlyPostedExpenses: summary.monthlyPostedExpenses,
    monthRunway: summary.monthRunway,
    debtExposure: summary.debtExposure,
    nextIncome: summary.nextIncome,
    overdueCount: summary.overdueCount,
    urgentItems: summary.urgentItems.map((item) => ({
      id: item.id,
      title: item.title,
      dueDate: item.dueDate,
      amount: item.amount,
      kind: item.kind,
      status: item.status as ScheduledEvent["status"],
      accountId: data.scheduledEvents.find((event) => event.id === item.id)?.accountId,
      urgency: item.urgency,
      canConfirmQuickly: Boolean(data.scheduledEvents.find((event) => event.id === item.id)?.accountId),
      funding: {
        accountName: item.fundingAccountName ?? "Cuenta por definir",
        status: item.fundingStatus,
        balanceAfter: item.fundingBalanceAfter,
        shortfall: item.fundingShortfall,
      },
    })),
    accountsByBalance: [...data.accounts].sort((left, right) => right.balance - left.balance),
    businesses: data.business,
    cards: data.cards,
    debts: data.debts,
    savings: data.goals,
    transactions: data.transactions,
    projections: data.projections,
    scheduledEvents: data.scheduledEvents,
  };
}

export function getFundingLabel(item: DecisionTimelineItem) {
  if (item.kind === "income") {
    return "Entrada esperada";
  }

  if (item.funding.status === "ready") {
    return `Pagar desde ${item.funding.accountName}`;
  }

  if (item.funding.status === "combine") {
    return `Mover y combinar desde ${item.funding.accountName}`;
  }

  return `Faltan ${formatCOP(item.funding.shortfall ?? 0)}`;
}
