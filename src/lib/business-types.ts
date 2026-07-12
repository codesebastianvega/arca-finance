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
  title: string;
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

export type BusinessSource = {
  id: string;
  name: string;
  unitKey: string;
  unitName: string;
  defaultAccountId: string | null;
  defaultAccountLabel: string | null;
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
  accountOptions: Array<{ id: string; label: string }>;
};
