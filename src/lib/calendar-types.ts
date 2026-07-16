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
};

export type CalendarMonth = {
  key: string;
  label: string;
  year: number;
  monthIndex: number;
  firstWeekday: number;
  daysInMonth: number;
  events: CalendarEventItem[];
};

export type CalendarViewModel = {
  months: CalendarMonth[];
  initialMonthKey: string;
};
