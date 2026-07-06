import { isSameMonth, subMonths } from "date-fns";
import type { DashboardData } from "@/lib/dashboard-data";
import { parseCalendarDate } from "@/lib/finance";
import type { DashboardSummary } from "@/lib/types";

export function buildExecutiveDashboardFromData(data: DashboardData, month = new Date()): DashboardSummary {
  const currentCash = data.accounts.filter((account) => account.active).reduce((sum, account) => sum + account.balance, 0);
  const protectedSavings = data.goals.reduce((sum, goal) => sum + goal.current, 0);
  const freeCash = currentCash - protectedSavings;
  const monthlyIncome = data.transactions
    .filter((item) => item.kind === "income" && item.status !== "cancelled" && isSameMonth(parseCalendarDate(item.date), month))
    .reduce((sum, item) => sum + item.amount, 0);
  const monthlyExpenses = data.transactions
    .filter(
      (item) =>
        ["expense", "debt_payment", "card_payment", "saving_contribution"].includes(item.kind) &&
        item.status !== "cancelled" &&
        isSameMonth(parseCalendarDate(item.date), month)
    )
    .reduce((sum, item) => sum + item.amount, 0);
  const monthlyCommitments = data.scheduledEvents
    .filter(
      (event) =>
        ["expense", "debt_payment", "card_payment", "saving"].includes(event.kind) &&
        !["paid", "confirmed", "cancelled"].includes(event.status) &&
        isSameMonth(parseCalendarDate(event.dueDate), month)
    )
    .reduce((sum, event) => sum + event.amount, 0);
  const debtExposure =
    data.debts.reduce((sum, debt) => sum + debt.balance, 0) + data.cards.reduce((sum, card) => sum + card.used, 0);
  const overdueCount = data.scheduledEvents.filter(
    (event) => !["paid", "confirmed", "cancelled"].includes(event.status) && parseCalendarDate(event.dueDate) < new Date()
  ).length;
  const openObligations = data.scheduledEvents.filter(
    (event) => !["paid", "confirmed", "cancelled"].includes(event.status) && ["expense", "debt_payment", "card_payment", "saving"].includes(event.kind)
  ).length;

  const timeline = Array.from({ length: 6 }, (_, index) => subMonths(month, 5 - index)).map((monthDate) => {
    const keyMonth = parseCalendarDate(monthDate.toISOString().slice(0, 10));

    return {
      month: monthDate.toISOString().slice(0, 7),
      income: data.transactions
        .filter((item) => item.kind === "income" && item.status !== "cancelled" && isSameMonth(parseCalendarDate(item.date), keyMonth))
        .reduce((sum, item) => sum + item.amount, 0),
      expenses: data.transactions
        .filter(
          (item) =>
            ["expense", "debt_payment", "card_payment", "saving_contribution"].includes(item.kind) &&
            item.status !== "cancelled" &&
            isSameMonth(parseCalendarDate(item.date), keyMonth)
        )
        .reduce((sum, item) => sum + item.amount, 0),
      commitments: data.scheduledEvents
        .filter(
          (event) =>
            ["expense", "debt_payment", "card_payment", "saving"].includes(event.kind) &&
            !["paid", "confirmed", "cancelled"].includes(event.status) &&
            isSameMonth(parseCalendarDate(event.dueDate), keyMonth)
        )
        .reduce((sum, event) => sum + event.amount, 0),
      closingBalance:
        data.projections.find((projection) => projection.month.slice(0, 7) === monthDate.toISOString().slice(0, 7))?.closingBalance ?? 0,
    };
  });

  return {
    currentCash,
    protectedSavings,
    freeCash,
    monthlyIncome,
    monthlyExpenses,
    monthlyCommitments,
    debtExposure,
    commitmentRatio: currentCash > 0 ? (monthlyCommitments / currentCash) * 100 : 0,
    overdueCount,
    openObligations,
    timeline,
  };
}
