export type BusinessUnitSummary = {
  id: string;
  name: string;
  key: string;
  realIncome: number;
  realIncomeLabel: string;
  expectedIncome: number;
  expectedIncomeLabel: string;
  realExpense: number;
  realExpenseLabel: string;
  net: number;
  netLabel: string;
  nextEventLabel: string;
  nextEventAmountLabel: string | null;
};

export type BusinessActiveItem = {
  id: string;
  scheduledEventId: string | null;
  title: string;
  unitKey: string;
  unitName: string;
  amount: number;
  amountLabel: string;
  dueDate: string;
  dueLabel: string;
  status: "pending" | "overdue" | "today";
};

export type BusinessTopItem = {
  id: string;
  name: string;
  totalLabel: string;
  helper: string;
};

export type BusinessTransaction = {
  id: string;
  concept: string;
  amount: number;
  amountLabel: string;
  kind: "income" | "expense";
  date: string;
  dateLabel: string;
  sourceLabel: string | null;
};

export type BusinessSource = {
  id: string;
  name: string;
  unitKey: string;
  unitName: string;
  defaultAccountId: string | null;
  defaultAccountLabel: string | null;
  totalIncome: number;
  totalIncomeLabel: string;
  totalExpense: number;
  totalExpenseLabel: string;
};

export type BusinessViewModel = {
  totals: {
    expectedIncome: number;
    expectedIncomeLabel: string;
    realIncome: number;
    realIncomeLabel: string;
    realExpense: number;
    realExpenseLabel: string;
    net: number;
    netLabel: string;
  };
  activeItems: BusinessActiveItem[];
  topItems: BusinessTopItem[];
  units: BusinessUnitSummary[];
  sources: BusinessSource[];
  unitTransactions: BusinessTransaction[];
  accountOptions: Array<{ id: string; label: string }>;
};
