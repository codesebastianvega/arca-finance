export type AnalyticsMonth = {
  key: string;
  label: string;
  income: number;
  expenses: number;
  net: number;
};

export type AnalyticsCategory = {
  label: string;
  monthlyAmounts: number[];
  items: AnalyticsExpenseItem[];
};

export type AnalyticsExpenseItem = {
  id: string;
  concept: string;
  amount: number;
  monthKey: string;
  date: string;
  dateLabel: string;
  kindLabel: string;
  accountName: string | null;
};

export type AnalyticsViewModel = {
  months: AnalyticsMonth[];
  categories: AnalyticsCategory[];
  hasData: boolean;
};
