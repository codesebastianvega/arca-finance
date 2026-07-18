export type MonthlyAllocationType = "expense" | "saving" | "debt" | "free";

export type MonthlyPlanAllocation = {
  id: string;
  name: string;
  type: MonthlyAllocationType;
  percentage: number;
  targetAmount: number;
  actualAmount: number;
  remainingAmount: number;
  utilization: number;
  trackingCategory: string | null;
  status: "neutral" | "healthy" | "warning" | "exceeded";
};

export type MonthViewModel = {
  month: string;
  monthLabel: string;
  plannedIncome: number;
  receivedIncome: number;
  expectedIncome: number;
  commitments: number;
  safeToSpend: number;
  assignedPercentage: number;
  assignedAmount: number;
  unassignedPercentage: number;
  unassignedAmount: number;
  allocations: MonthlyPlanAllocation[];
  categoryOptions: string[];
  planAvailable: boolean;
};
