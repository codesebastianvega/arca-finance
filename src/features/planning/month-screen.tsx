import { motion } from 'motion/react';
import { Target, ShieldCheck, ArrowDownLeft } from 'lucide-react';
import type { MonthViewModel } from '@/src/lib/month-types';

export default function MonthScreen({ onBack, data }: { onBack: () => void; data: MonthViewModel }) {
  return (
    <div className="space-y-6">
      <header className="flex items-center space-x-4">
        <button onClick={onBack} className="text-arca-text-dim hover:text-arca-accent transition-colors">
          <ArrowDownLeft className="rotate-45" size={24} />
        </button>
        <h2 className="text-lg font-bold text-arca-text-primary light:text-arca-light-text-primary uppercase tracking-widest">Planeación</h2>
      </header>

      <section className="bg-gradient-to-br from-arca-surface-2 to-arca-base p-6 rounded-3xl border border-arca-border-strong relative overflow-hidden">
        <div className="absolute top-0 right-0 p-4 opacity-10">
          <Target size={120} />
        </div>
        <div className="relative z-10 space-y-1">
          <p className="text-[10px] font-bold text-arca-accent uppercase tracking-widest">Safe to Spend</p>
          <h3 className="text-3xl font-bold text-arca-text-primary light:text-arca-light-text-primary">{data.safeToSpendLabel}</h3>
          <p className="text-xs text-arca-text-dim mt-2">Monto libre calculado para las próximas semanas tras cubrir compromisos del mes.</p>
        </div>
      </section>

      <div className="space-y-4">
        <h3 className="text-xs font-bold text-arca-text-dim uppercase tracking-widest px-1">Presupuestos por categoría</h3>
        {data.budgetProgress.length > 0 ? (
          data.budgetProgress.map((item) => (
            <BudgetProgress key={item.label} label={item.label} current={item.current} limit={item.limit} color={item.color} />
          ))
        ) : (
          <div className="card-arca p-4 text-xs text-arca-text-dim">Todavía no hay suficientes gastos reales este mes para construir el desglose.</div>
        )}
      </div>

      <section className="card-arca p-5 space-y-4">
        <div className="flex items-center space-x-3 text-arca-positive">
          <ShieldCheck size={20} />
          <h4 className="text-sm font-bold uppercase tracking-widest">Estatus de salud</h4>
        </div>
        <p className="text-xs text-arca-text-secondary">
          Tu ahorro protegido cubre actualmente <span className="font-bold">{data.coverageMonths.toFixed(1)} meses</span> de compromisos estimados.
          Tu referencia objetivo sigue siendo <span className="font-bold">6 meses</span>.
        </p>
        <div className="flex gap-2">
          <div className="flex-1 h-1.5 bg-arca-surface-2 rounded-full overflow-hidden">
            <div className="h-full bg-arca-positive rounded-full" style={{ width: `${data.coverageProgress}%` }} />
          </div>
        </div>
        <p className="text-[10px] text-arca-text-dim uppercase tracking-wider">Compromisos del mes: {data.expectedMonthlyExpensesLabel}</p>
      </section>
    </div>
  );
}

function BudgetProgress({
  label,
  current,
  limit,
  color,
}: {
  label: string;
  current: number;
  limit: number;
  color: "arca-accent" | "arca-positive" | "arca-alert";
}) {
  const percentage = limit > 0 ? Math.min((current / limit) * 100, 100) : (current > 0 ? 100 : 0);
  const isOver = limit > 0 ? current > limit : current > 0;
  const barColor = color === "arca-alert" ? "bg-arca-alert" : color === "arca-positive" ? "bg-arca-positive" : "bg-arca-accent";

  return (
    <div className="card-arca p-4 space-y-3">
      <div className="flex justify-between items-center">
        <span className="text-xs font-bold text-arca-text-primary light:text-arca-light-text-primary uppercase tracking-widest">{label}</span>
        <span className={`text-[10px] font-bold ${isOver ? 'text-arca-alert' : 'text-arca-text-dim'}`}>
          ${current.toLocaleString()} {limit > 0 ? `/ $${limit.toLocaleString()}` : '(Sin Presupuesto)'}
        </span>
      </div>
      <div className="h-2 w-full bg-arca-surface-2 rounded-full overflow-hidden">
        <motion.div initial={{ width: 0 }} animate={{ width: `${percentage}%` }} className={`h-full rounded-full ${barColor}`} />
      </div>
    </div>
  );
}
