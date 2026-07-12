export type ProjectionChartPoint = {
  label: string;
  actual?: number;
  projected?: number;
};

export type ProjectionViewModel = {
  chart: ProjectionChartPoint[];
  currentPositionLabel: string;
  baseScenarioLabel: string;
  savingsTargetLabel: string;
  savingsGapLabel: string;
  savingsProgress: number;
  monthsProjected: number;
  narrative: string;
};
