export type AccountType = "cash" | "bank" | "wallet" | "savings" | "other";

export type TransactionKind =
  | "income"
  | "expense"
  | "transfer"
  | "debt_payment"
  | "card_payment"
  | "saving_contribution"
  | "saving_withdrawal";

export type TransactionStatus = "pending" | "paid" | "confirmed" | "cancelled" | "overdue" | "scheduled";

export type BusinessUnitKey =
  | "personal"
  | "empresa"
  | "deuxio"
  | "el_recreo"
  | "uxio"
  | "sie"
  | "aluna"
  | "arca"
  | "freelance";

export type FinancialEventType =
  | "income"
  | "expense"
  | "debt_payment"
  | "card_payment"
  | "saving"
  | "transfer";

export interface Account {
  id: string;
  name: string;
  type: AccountType;
  balance: number;
  color: string;
  active: boolean;
}

export interface Transaction {
  id: string;
  kind: TransactionKind;
  status: TransactionStatus;
  amount: number;
  concept: string;
  accountId: string;
  category: string;
  unit: BusinessUnitKey;
  dueDate?: string;
  date: string;
}

export interface Debt {
  id: string;
  name: string;
  lender: string;
  debtType: string;
  principalAmount?: number;
  balance: number;
  installment: number;
  nextDueDate: string;
  annualInterestRate?: number;
  interestType?: string;
  termMonths?: number;
  remainingMonths?: number;
  estimatedTotalPayment?: number;
  status: "active" | "paid" | "late";
  priority: "high" | "medium" | "low";
  notes?: string;
}

export interface CreditCard {
  id: string;
  name: string;
  issuer: string;
  limit: number;
  used: number;
  cutOffDate: number;
  payDueDate: number;
  minimumPayment: number;
  annualInterestRate?: number;
  interestType?: string;
  estimatedPayoffMonths?: number;
  estimatedTotalPayment?: number;
  paymentStrategy?: string;
  notes?: string;
  status: "active" | "blocked" | "closed";
}

export interface SavingsGoal {
  id: string;
  name: string;
  target: number;
  current: number;
  color: string;
  dueDate?: string;
}

export interface BusinessSummary {
  id: BusinessUnitKey;
  name: string;
  income: number;
  expense: number;
  pending: number;
}

export interface MonthlyProjection {
  id: string;
  month: string;
  openingBalance: number;
  expectedIncome: number;
  expectedExpenses: number;
  debtPayments: number;
  cardPayments: number;
  plannedSavings: number;
  closingBalance: number;
  scenario: string;
  notes?: string;
}

export interface FinancialEvent {
  id: string;
  eventDate: string;
  title: string;
  amount: number;
  eventType: FinancialEventType;
  status: string;
  accountId?: string;
  relatedTable?: string;
  relatedId?: string;
  unit?: BusinessUnitKey;
  notes?: string;
}
