export type MonthBudgetProgress = {
  label: string;
  current: number;
  limit: number;
  color: "arca-accent" | "arca-positive" | "arca-alert";
};

export type MonthViewModel = {
  safeToSpend: number;
  safeToSpendLabel: string;
  budgetProgress: MonthBudgetProgress[];
  coverageMonths: number;
  coverageProgress: number;
  expectedMonthlyExpenses: number;
  expectedMonthlyExpensesLabel: string;
};
