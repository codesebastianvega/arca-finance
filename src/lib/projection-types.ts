export type ProjectionHistoryPoint = {
  key: string;
  label: string;
  value: number;
};

export type ProjectionMonth = {
  key: string;
  label: string;
  expectedIncome: number;
  expectedExpenses: number;
  debtPayments: number;
  cardPayments: number;
  plannedSavings: number;
  storedClosingBalance: number | null;
  source: "planned" | "automatic";
};

export type ProjectionViewModel = {
  historical: ProjectionHistoryPoint[];
  months: ProjectionMonth[];
  currentPosition: number;
  savingsTarget: number;
  currentSavings: number;
};
