'use client';

import { ArrowDownLeft, BarChart3, PieChart, TrendingUp } from 'lucide-react';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { ProjectionViewModel } from '@/src/lib/projection-types';

export default function ProjectionScreen({
  onBack,
  data,
}: {
  onBack: () => void;
  data: ProjectionViewModel;
}) {
  return (
    <div className="space-y-6">
      <header className="flex items-center space-x-4">
        <button onClick={onBack} className="text-arca-text-dim hover:text-arca-accent transition-colors">
          <ArrowDownLeft className="rotate-45" size={24} />
        </button>
        <h2 className="text-lg font-bold text-arca-text-primary uppercase tracking-widest">Proyeccion</h2>
      </header>

      <section className="card-arca p-5 space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-[10px] font-bold text-arca-text-dim uppercase tracking-widest">Evolucion esperada</h3>
          <TrendingUp size={16} className="text-arca-positive" />
        </div>
        <div className="h-48 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data.chart}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: 'var(--text-muted)', fontSize: 10 }} />
              <YAxis hide />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'var(--bg-surface-1)',
                  border: '1px solid var(--border)',
                  borderRadius: '12px',
                  color: 'var(--text-primary)',
                }}
              />
              <Area type="monotone" dataKey="projected" stroke="var(--accent)" fill="color-mix(in srgb, var(--accent) 18%, transparent)" strokeWidth={3} />
              <Area type="monotone" dataKey="actual" stroke="var(--color-positive)" fill="color-mix(in srgb, var(--color-positive) 18%, transparent)" strokeWidth={3} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </section>

      <div className="grid grid-cols-2 gap-4">
        <div className="card-arca p-4 space-y-2">
          <BarChart3 size={20} className="text-arca-accent" />
          <p className="text-[10px] font-bold text-arca-text-dim uppercase tracking-widest">Escenario base</p>
          <p className="text-lg font-bold text-arca-text-primary">{data.baseScenarioLabel}</p>
          <p className="text-[10px] uppercase tracking-wider text-arca-text-dim">{data.monthsProjected} meses cargados</p>
        </div>
        <div className="card-arca p-4 space-y-2">
          <PieChart size={20} className="text-arca-positive" />
          <p className="text-[10px] font-bold text-arca-text-dim uppercase tracking-widest">Meta de ahorro</p>
          <p className="text-lg font-bold text-arca-text-primary">{data.savingsTargetLabel}</p>
          <p className="text-[10px] uppercase tracking-wider text-arca-text-dim">Faltan {data.savingsGapLabel}</p>
        </div>
      </div>

      <section className="card-arca p-5 space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold uppercase tracking-widest text-arca-text-dim">Avance de ahorro</span>
          <span className="text-xs font-semibold text-arca-positive">{data.savingsProgress}%</span>
        </div>
        <div className="h-2 rounded-full bg-arca-surface-2 overflow-hidden">
          <div className="h-full rounded-full bg-arca-positive" style={{ width: `${data.savingsProgress}%` }} />
        </div>
        <div className="grid grid-cols-2 gap-4 text-xs">
          <div>
            <p className="text-arca-text-dim uppercase tracking-wider">Posicion actual</p>
            <p className="mt-1 font-bold text-arca-text-primary">{data.currentPositionLabel}</p>
          </div>
          <div>
            <p className="text-arca-text-dim uppercase tracking-wider">Cierre proyectado</p>
            <p className="mt-1 font-bold text-arca-text-primary">{data.baseScenarioLabel}</p>
          </div>
        </div>
      </section>

      <section className="card-arca p-5 bg-arca-accent/5 border-arca-accent/20">
        <p className="text-xs text-arca-text-secondary leading-relaxed">{data.narrative}</p>
      </section>
    </div>
  );
}
