export type AccountType = "cash" | "bank" | "wallet" | "savings" | "other";

export type TransactionKind =
  | "income"
  | "expense"
  | "transfer"
  | "card_purchase"
  | "debt_payment"
  | "card_payment"
  | "saving_contribution"
  | "saving_withdrawal";

export type TransactionStatus = "pending" | "paid" | "confirmed" | "cancelled" | "overdue" | "scheduled";

export type BusinessUnitKey = string;

export type ScheduledEventKind = "income" | "expense" | "debt_payment" | "card_payment" | "saving" | "transfer";
export type ScheduledEventStatus = "scheduled" | "overdue" | "confirmed" | "cancelled";
export type TimingStatus = "early" | "on_time" | "late";
export type TemplateKind = "income" | "expense" | "saving" | "debt_payment" | "card_payment";
export type TemplateStatus = "active" | "paused" | "ended";
export type RecurrenceMode = "open_recurring" | "date_bounded" | "occurrence_bounded" | "manual_variable" | "one_time";
export type RecurrenceFrequency = "weekly" | "biweekly" | "monthly" | "bimonthly" | "custom_days_of_month";

export type SubscriptionPlanCode = "free" | "personal_pro" | "business";
export type SubscriptionStatus = "trialing" | "active" | "past_due" | "canceled" | "paused";

export interface WorkspaceScoped {
  workspaceId: string;
}

export interface Profile {
  id: string;
  email?: string;
  fullName?: string;
  isSuperAdmin: boolean;
  createdAt?: string;
}

export interface Workspace {
  id: string;
  ownerUserId: string;
  slug: string;
  name: string;
  currencyCode: string;
  timezone: string;
  status: "active" | "paused" | "archived";
  createdAt?: string;
}

export interface WorkspaceMembership extends WorkspaceScoped {
  userId: string;
  role: "owner" | "admin" | "member";
  createdAt?: string;
}

export interface SubscriptionPlan {
  id: string;
  code: SubscriptionPlanCode;
  name: string;
  monthlyPriceCop: number;
  yearlyPriceCop?: number;
  active: boolean;
}

export interface WorkspaceSubscription extends WorkspaceScoped {
  id: string;
  planCode: SubscriptionPlanCode;
  status: SubscriptionStatus;
  provider: string;
  startsAt?: string;
  endsAt?: string;
  trialEndsAt?: string;
}

export interface Account extends WorkspaceScoped {
  id: string;
  name: string;
  type: AccountType;
  balance: number;
  color: string;
  active: boolean;
}

export interface Transaction extends WorkspaceScoped {
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
  postedAt?: string;
  sourceType?: string;
  sourceId?: string;
}

export interface Debt extends WorkspaceScoped {
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
  paidInstallments?: number;
  estimatedTotalPayment?: number;
  status: "active" | "paid" | "late";
  priority: "high" | "medium" | "low";
  notes?: string;
}

export interface CreditCard extends WorkspaceScoped {
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

export interface SavingsPocket extends WorkspaceScoped {
  id: string;
  name: string;
  target: number;
  current: number;
  color: string;
  dueDate?: string;
  purpose?: string;
}

export type SavingsGoal = SavingsPocket;

export interface BusinessSummary extends WorkspaceScoped {
  id: BusinessUnitKey;
  name: string;
  income: number;
  expense: number;
  pending: number;
}

export interface IncomeSource extends WorkspaceScoped {
  id: string;
  name: string;
  businessUnitKey: BusinessUnitKey;
  type: string;
  active: boolean;
}

export interface IncomeTemplate extends WorkspaceScoped {
  id: string;
  name: string;
  kind: "income";
  status: TemplateStatus;
  recurrenceMode: RecurrenceMode;
  frequency: RecurrenceFrequency;
  daysOfMonth: number[];
  startDate: string;
  endDate?: string;
  occurrenceLimit?: number;
  defaultAmount: number;
  defaultAccountId: string;
  businessUnitKey: BusinessUnitKey;
  incomeSourceId: string;
  notes?: string;
}

export interface ExpenseTemplate extends WorkspaceScoped {
  id: string;
  name: string;
  kind: Exclude<TemplateKind, "income">;
  status: TemplateStatus;
  recurrenceMode: RecurrenceMode;
  frequency: RecurrenceFrequency;
  daysOfMonth: number[];
  startDate: string;
  endDate?: string;
  occurrenceLimit?: number;
  defaultAmount: number;
  defaultAccountId?: string;
  businessUnitKey: BusinessUnitKey;
  notes?: string;
}

export interface MonthlyProjection extends WorkspaceScoped {
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

export interface ScheduledEvent extends WorkspaceScoped {
  id: string;
  dueDate: string;
  title: string;
  amount: number;
  kind: ScheduledEventKind;
  status: ScheduledEventStatus;
  timingStatus?: TimingStatus;
  accountId?: string;
  templateId?: string;
  confirmedTransactionId?: string;
  linkedEntityType?: string;
  linkedEntityId?: string;
  unit?: BusinessUnitKey;
  notes?: string;
}

export interface FinancialEvent extends WorkspaceScoped {
  id: string;
  eventDate: string;
  title: string;
  amount: number;
  eventType: ScheduledEventKind;
  status: string;
  accountId?: string;
  relatedTable?: string;
  relatedId?: string;
  unit?: BusinessUnitKey;
  notes?: string;
}

export interface WorkspaceContext {
  profile: Profile;
  workspace: Workspace;
  membership: WorkspaceMembership;
  subscription?: WorkspaceSubscription;
}

export interface TodaySummaryItem {
  id: string;
  title: string;
  dueDate: string;
  amount: number;
  kind: ScheduledEventKind;
  status: string;
  urgency: "overdue" | "today" | "soon" | "later";
  fundingStatus: "ready" | "combine" | "wait";
  fundingAccountName?: string;
  fundingBalanceAfter?: number;
  fundingShortfall?: number;
}

export interface TodaySummary {
  currentCash: number;
  protectedSavings: number;
  freeCash: number;
  monthlyExpectedIncome: number;
  monthlyCommitments: number;
  monthlyPostedExpenses: number;
  monthRunway: number;
  debtExposure: number;
  overdueCount: number;
  nextIncome?: ScheduledEvent;
  urgentItems: TodaySummaryItem[];
}

export interface DashboardMetricPoint {
  month: string;
  income: number;
  expenses: number;
  commitments: number;
  closingBalance: number;
}

export interface DashboardSummary {
  currentCash: number;
  protectedSavings: number;
  freeCash: number;
  monthlyIncome: number;
  monthlyExpenses: number;
  monthlyCommitments: number;
  debtExposure: number;
  commitmentRatio: number;
  overdueCount: number;
  openObligations: number;
  timeline: DashboardMetricPoint[];
}
