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

export type BusinessUnitKey = "personal" | "empresa" | "deuxio" | "sie" | "aluna";

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
  balance: number;
  installment: number;
  nextDueDate: string;
  status: "active" | "paid" | "late";
  priority: "high" | "medium" | "low";
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
