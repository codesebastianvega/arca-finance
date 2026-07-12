const fs = require('fs');
let content = fs.readFileSync('recovered_dashboard.tsx', 'utf8');

// 1. Remove invalid imports
content = content.replace('import type { DashboardData } from "@/lib/dashboard-data";', 'import type { TodayViewModel } from "@/src/lib/today-data";');
content = content.replace('import { buildDecisionDashboard, getFundingLabel, type DecisionDashboard } from "../services/build-decision-dashboard";', '');

// 2. Add local formatCOP and cn (if missing) since they were deleted by the other agent earlier
// Actually they might still be in the imports, let's just make sure they point to right place
content = content.replace('from "@/lib/finance"', 'from "@/src/lib/finance"');
content = content.replace('from "@/lib/template-generation"', 'from "@/src/lib/template-generation"');
content = content.replace('from "@/lib/utils"', 'from "@/src/lib/utils"');
content = content.replace('from "@/components/ui-kit"', 'from "@/src/components/ui-kit"');

// 3. Define formatCOP and cn since finance.ts and utils.ts were DELETED by the other agent!
const helpers = `
const formatCOP = (value: number) => {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};
const cn = (...classes: (string | undefined | null | false)[]) => classes.filter(Boolean).join(" ");
const formatDate = (date: string) => date;
`;
// Let's remove the finance/utils imports completely
content = content.replace(/import \{ formatCOP, formatDate \} from ".*?";/, '');
content = content.replace(/import \{ cn \} from ".*?";/, '');

// 4. Update the component signature
content = content.replace(/export function DecisionDashboardView\(\{[\s\S]*?\}\) \{/, 
  `export default function DecisionDashboardView({ data, onOpenMovements }: { data: TodayViewModel; onOpenMovements?: () => void }) {\n${helpers}`);

// 5. Replace summary builder with local mapper
const mapper = `
  const summary = {
    currentCash: data.cash.totalBalance,
    monthlyCommitments: data.pendingCritical,
    monthlyExpectedIncome: data.nextIncome ? data.nextIncome.amount : 0,
    freeCash: data.cash.safeToSpend,
    nextIncome: data.nextIncome,
    overdueCount: data.metrics.late,
    protectedSavings: data.cash.protectedSavings,
    urgentItems: data.criticalPayments.map(p => ({
      ...p,
      urgency: p.status,
      funding: {
        status: p.kind === 'income' ? 'ready' : (data.cash.safeToSpend >= p.amount ? 'ready' : 'wait')
      },
      canConfirmQuickly: false
    })),
    debtExposure: 0,
    monthlyPostedExpenses: data.budget.consumed || 0,
    savings: [],
    accountsByBalance: data.accountOptions.map(a => ({ id: a.id, name: a.label.replace(' · cuenta', ''), type: 'Cuenta', balance: 0 }))
  };
  const getFundingLabel = (item: any) => item.funding.status === 'ready' ? 'Puede pagarse' : 'Falta caja';
`;
content = content.replace('const summary = providedSummary ?? buildDecisionDashboard(data, month);', mapper);

fs.writeFileSync('src/features/dashboard/components/decision-dashboard.tsx', content);
