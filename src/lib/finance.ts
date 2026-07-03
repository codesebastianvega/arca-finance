import { format } from "date-fns";
import type { Account, CreditCard, Debt, SavingsGoal, Transaction } from "./types";

const currency = new Intl.NumberFormat("es-CO", {
  style: "currency",
  currency: "COP",
  maximumFractionDigits: 0,
});

export function formatCOP(value: number) {
  return currency.format(value).replace("COP", "").trim();
}

export function formatDate(value: string) {
  return format(new Date(value), "d MMM");
}

export function sum(values: number[]) {
  return values.reduce((acc, value) => acc + value, 0);
}

export function getIncomeMonth(transactions: Transaction[]) {
  return sum(transactions.filter((item) => item.kind === "income" && item.status !== "cancelled").map((item) => item.amount));
}

export function getExpenseMonth(transactions: Transaction[]) {
  return sum(transactions.filter((item) => item.kind === "expense" && item.status !== "cancelled").map((item) => item.amount));
}

export function getAvailableToday(accounts: Account[], goals: SavingsGoal[], debts: Debt[], cards: CreditCard[]) {
  const walletTotal = sum(accounts.map((account) => account.balance));
  const debtPressure = sum(debts.map((item) => item.installment));
  const cardPressure = sum(cards.map((item) => item.minimumPayment));
  const blockedSavings = sum(goals.map((goal) => goal.current));

  return walletTotal - debtPressure - cardPressure - blockedSavings;
}

export function getDebtTotal(debts: Debt[], cards: CreditCard[]) {
  return sum(debts.map((debt) => debt.balance)) + sum(cards.map((card) => card.used));
}

export function getCardAvailable(card: CreditCard) {
  return card.limit - card.used;
}

export function getSavingsProgress(goal: SavingsGoal) {
  return Math.min(100, Math.round((goal.current / goal.target) * 100));
}

export function getNetFlow(transactions: Transaction[]) {
  return getIncomeMonth(transactions) - getExpenseMonth(transactions);
}

export function getUpcomingPayments(transactions: Transaction[]) {
  return transactions.filter((item) => item.status === "scheduled" || item.status === "pending");
}
