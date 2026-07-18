export type CalendarEventKind = "income" | "payment" | "receivable";

export type CalendarEventItem = {
  id: string;
  templateId?: string | null;
  title: string;
  amount: number;
  amountLabel: string;
  dueDate: string;
  day: number;
  monthKey: string;
  kind: CalendarEventKind;
  status: "overdue" | "today" | "upcoming" | "pending";
  dateLabel: string;
  secondaryLabel: string;
  accountId: string | null;
  suggestedAccountId: string | null;
  notes: string | null;
  priority: "high" | "medium" | "low";
};

export type CalendarMonthSummary = {
  payments: number;
  income: number;
  receivables: number;
  expectedBalance: number;
  overdueCount: number;
  overdueAmount: number;
  receivedToDate: number;
  paidToDate: number;
  pendingDueToDate: number;
  commitmentsDueToDate: number;
  balanceToDate: number;
  health: "positive" | "attention" | "negative";
};

export type CalendarMonth = {
  key: string;
  label: string;
  year: number;
  monthIndex: number;
  firstWeekday: number;
  daysInMonth: number;
  events: CalendarEventItem[];
  summary: CalendarMonthSummary;
};

export type CalendarViewModel = {
  months: CalendarMonth[];
  initialMonthKey: string;
};
