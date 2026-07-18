'use client';

import { useMemo, useState, type ReactNode } from 'react';
import {
  ArrowDownLeft,
  ArrowRight,
  CalendarRange,
  CircleAlert,
  PiggyBank,
  SlidersHorizontal,
  Sparkles,
  TrendingDown,
  TrendingUp,
  WalletCards,
} from 'lucide-react';
import { Area, CartesianGrid, ComposedChart, Line, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { ProjectionMonth, ProjectionViewModel } from '@/src/lib/projection-types';

type Horizon = 3 | 6 | 12;
type Scenario = 'conservative' | 'base' | 'optimistic';

const SCENARIOS: Record<Scenario, { label: string; income: number; expenses: number }> = {
  conservative: { label: 'Conservador', income: -10, expenses: 10 },
  base: { label: 'Base', income: 0, expenses: 0 },
  optimistic: { label: 'Optimista', income: 5, expenses: -10 },
};

export default function ProjectionScreen({
  onBack,
  onOpenNova,
  data,
  currency,
}: {
  onBack: () => void;
  onOpenNova: (prompt?: string) => void;
  data: ProjectionViewModel;
  currency: string;
}) {
  const [horizon, setHorizon] = useState<Horizon>(6);
  const [scenario, setScenario] = useState<Scenario | 'custom'>('base');
  const [incomeAdjustment, setIncomeAdjustment] = useState(0);
  const [expenseAdjustment, setExpenseAdjustment] = useState(0);
  const [selectedMonthIndex, setSelectedMonthIndex] = useState(0);
  const formatMoney = useMemo(() => moneyFormatter(currency), [currency]);

  const chooseScenario = (nextScenario: Scenario) => {
    const preset = SCENARIOS[nextScenario];
    setScenario(nextScenario);
    setIncomeAdjustment(preset.income);
    setExpenseAdjustment(preset.expenses);
  };

  const projection = useMemo(() => {
    let rolling = data.currentPosition;
    return data.months.slice(0, horizon).map((month) => {
      const income = month.expectedIncome * (1 + incomeAdjustment / 100);
      const variableOutflow = month.expectedExpenses * (1 + expenseAdjustment / 100);
      const outgoing = variableOutflow + month.debtPayments + month.cardPayments + month.plannedSavings;
      rolling += income - outgoing;
      return { ...month, income, variableOutflow, outgoing, closing: rolling, net: income - outgoing };
    });
  }, [data.currentPosition, data.months, expenseAdjustment, horizon, incomeAdjustment]);

  const chartData = useMemo(() => {
    const currentKey = data.months[0]?.key;
    const history = data.historical
      .filter((point) => point.key !== currentKey)
      .map((point) => ({ key: point.key, label: point.label, actual: point.value, projected: undefined }));
    const bridge = currentKey ? [{ key: `${currentKey}-current`, label: 'hoy', actual: data.currentPosition, projected: data.currentPosition }] : [];
    const future = projection.map((month) => ({ key: month.key, label: month.label, actual: undefined, projected: month.closing }));
    return [...history, ...bridge, ...future];
  }, [data.currentPosition, data.historical, data.months, projection]);

  const closing = projection.at(-1)?.closing ?? data.currentPosition;
  const difference = closing - data.currentPosition;
  const riskMonth = projection.find((month) => month.closing < 0) ?? null;
  const lowestMonth = projection.reduce<(typeof projection)[number] | null>((lowest, month) => !lowest || month.closing < lowest.closing ? month : lowest, null);
  const safeSelectedIndex = Math.min(selectedMonthIndex, Math.max(projection.length - 1, 0));
  const selectedMonth = projection[safeSelectedIndex];
  const savingsProgress = data.savingsTarget > 0 ? Math.min(100, Math.round((data.currentSavings / data.savingsTarget) * 100)) : 0;
  const savingsGap = Math.max(data.savingsTarget - data.currentSavings, 0);
  const monthlySavingsNeeded = horizon > 0 ? savingsGap / horizon : 0;

  const openSavingsGoal = () => {
    window.dispatchEvent(new CustomEvent('open-register', { detail: { segment: 'Ahorro', goalType: 'goal' } }));
  };

  return (
    <div className="space-y-5 pb-5">
      <header className="flex items-center gap-4">
        <button type="button" onClick={onBack} aria-label="Volver" className="text-arca-text-dim transition-colors hover:text-arca-accent">
          <ArrowDownLeft className="rotate-45" size={24} />
        </button>
        <div>
          <p className="text-[9px] font-black uppercase tracking-[0.2em] text-arca-accent">Tus próximos meses</p>
          <h1 className="text-xl font-black tracking-[-0.03em] text-arca-text-primary">Ruta financiera</h1>
        </div>
      </header>

      <section className="relative overflow-hidden rounded-[28px] border border-arca-border-strong bg-arca-surface-1 p-5">
        <div className={`absolute -right-12 -top-16 h-40 w-40 rounded-full blur-3xl ${difference < 0 ? 'bg-arca-alert/10' : 'bg-arca-positive/10'}`} />
        <div className="relative">
          <div className="flex items-center justify-between gap-3">
            <p className="text-[9px] font-black uppercase tracking-[0.18em] text-arca-text-dim">Si mantienes este escenario</p>
            <span className="rounded-full border border-arca-border bg-arca-surface-2 px-3 py-1 text-[8px] font-black uppercase tracking-wider text-arca-text-secondary">{horizon} meses</span>
          </div>
          <p className={`mt-3 text-3xl font-black tracking-[-0.055em] ${closing < 0 ? 'text-arca-alert' : 'text-arca-text-primary'}`}>{formatMoney.format(closing)}</p>
          <p className="mt-2 text-xs leading-5 text-arca-text-secondary">{routeMessage(difference, riskMonth?.label, formatMoney)}</p>
          <div className="mt-5 grid grid-cols-2 gap-2.5">
            <Metric label="Posición actual" value={formatMoney.format(data.currentPosition)} icon={<WalletCards size={13} />} />
            <Metric label="Variación" value={signedMoney(difference, formatMoney)} icon={difference < 0 ? <TrendingDown size={13} /> : <TrendingUp size={13} />} tone={difference < 0 ? 'alert' : 'positive'} />
          </div>
          {riskMonth ? <div className="mt-3 flex items-center gap-2 rounded-2xl border border-arca-alert/20 bg-arca-alert/[0.06] px-4 py-3 text-[10px] font-bold text-arca-alert"><CircleAlert size={14} /> Tu caja entraría en negativo en {riskMonth.label}.</div> : null}
        </div>
      </section>

      <section className="rounded-[26px] border border-arca-border bg-arca-surface-1 p-4">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <p className="text-[9px] font-black uppercase tracking-[0.16em] text-arca-text-dim">Evolución esperada</p>
            <p className="mt-1 text-xs font-bold text-arca-text-primary">Real vs. proyectado</p>
          </div>
          <div className="flex rounded-xl border border-arca-border bg-arca-surface-2 p-1">
            {([3, 6, 12] as Horizon[]).map((value) => <button key={value} type="button" onClick={() => setHorizon(value)} className={`rounded-lg px-2.5 py-1.5 text-[9px] font-black ${horizon === value ? 'bg-arca-accent text-black' : 'text-arca-text-dim'}`}>{value}M</button>)}
          </div>
        </div>
        <div className="h-56 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData} margin={{ top: 14, right: 6, left: -8, bottom: 0 }}>
              <defs>
                <linearGradient id="projectionFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--theme-accent)" stopOpacity={0.22} />
                  <stop offset="100%" stopColor="var(--theme-accent)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="2 7" stroke="var(--theme-border)" strokeOpacity={0.75} vertical={false} />
              <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: 'var(--theme-text-dim)', fontSize: 9, fontWeight: 600 }} tickMargin={10} />
              <YAxis axisLine={false} tickLine={false} tick={{ fill: 'var(--theme-text-dim)', fontSize: 8 }} tickFormatter={compactMoney} tickCount={4} width={48} domain={['auto', 'auto']} />
              {riskMonth ? <ReferenceLine y={0} stroke="var(--theme-alert)" strokeDasharray="4 5" strokeOpacity={0.75} /> : null}
              <Tooltip cursor={{ stroke: 'var(--theme-border-strong)', strokeDasharray: '3 4' }} formatter={(value) => [formatMoney.format(Number(value)), 'Saldo']} contentStyle={{ backgroundColor: 'var(--theme-surface-2)', border: '1px solid var(--theme-border-strong)', borderRadius: '14px', color: 'var(--theme-text-primary)', fontSize: 11, boxShadow: '0 12px 30px rgba(0,0,0,.28)' }} labelStyle={{ color: 'var(--theme-text-secondary)', fontSize: 9, textTransform: 'capitalize' }} />
              <Area type="monotone" dataKey="projected" name="Proyectado" stroke="var(--theme-accent)" fill="url(#projectionFill)" strokeWidth={3} strokeDasharray="7 5" dot={false} activeDot={{ r: 5, fill: 'var(--theme-accent)', stroke: 'var(--theme-surface-1)', strokeWidth: 3 }} connectNulls={false} />
              <Line type="monotone" dataKey="actual" name="Real" stroke="var(--theme-positive)" strokeWidth={3} dot={{ r: 3.5, fill: 'var(--theme-positive)', stroke: 'var(--theme-surface-1)', strokeWidth: 2 }} activeDot={{ r: 5, fill: 'var(--theme-positive)', stroke: 'var(--theme-surface-1)', strokeWidth: 3 }} connectNulls={false} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-2 flex gap-4 border-t border-arca-border pt-3">
          <Legend color="bg-arca-positive" label="Real" />
          <Legend color="bg-arca-accent" label="Proyectado" dashed />
          <Legend color="bg-arca-alert" label="Límite $0" dashed />
        </div>
      </section>

      <section className="space-y-3">
        <div className="px-1">
          <p className="text-[9px] font-black uppercase tracking-[0.18em] text-arca-text-dim">Simula antes de decidir</p>
          <h2 className="mt-1 text-base font-black text-arca-text-primary">Escenarios</h2>
        </div>
        <div className="grid grid-cols-3 gap-2 rounded-2xl border border-arca-border bg-arca-surface-1 p-1.5">
          {(Object.keys(SCENARIOS) as Scenario[]).map((key) => <button key={key} type="button" onClick={() => chooseScenario(key)} className={`rounded-xl px-2 py-2.5 text-[9px] font-black uppercase tracking-wider ${scenario === key ? 'bg-arca-accent text-black' : 'text-arca-text-dim'}`}>{SCENARIOS[key].label}</button>)}
        </div>
        <div className="rounded-[22px] border border-arca-border bg-arca-surface-1 p-4 space-y-5">
          <Adjustment label="Cambio en ingresos" value={incomeAdjustment} min={-30} max={30} tone="positive" onChange={(value) => { setScenario('custom'); setIncomeAdjustment(value); }} />
          <Adjustment label="Cambio en gastos" value={expenseAdjustment} min={-30} max={30} tone="alert" onChange={(value) => { setScenario('custom'); setExpenseAdjustment(value); }} />
        </div>
      </section>

      <section className="space-y-3">
        <div className="px-1">
          <p className="text-[9px] font-black uppercase tracking-[0.18em] text-arca-text-dim">Cómo se construye</p>
          <h2 className="mt-1 text-base font-black text-arca-text-primary">Detalle mensual</h2>
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none]">
          {projection.map((month, index) => <button key={month.key} type="button" onClick={() => setSelectedMonthIndex(index)} className={`shrink-0 rounded-full border px-3 py-2 text-[9px] font-black uppercase ${safeSelectedIndex === index ? 'border-arca-accent/40 bg-arca-accent/15 text-arca-accent' : 'border-arca-border bg-arca-surface-1 text-arca-text-dim'}`}>{month.label}</button>)}
        </div>
        {selectedMonth ? <MonthBreakdown month={selectedMonth} formatMoney={formatMoney} /> : null}
      </section>

      {data.savingsTarget > 0 ? (
        <section className="rounded-[24px] border border-arca-border bg-arca-surface-1 p-5">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-arca-positive/10 text-arca-positive"><PiggyBank size={18} /></span><div><p className="text-xs font-black text-arca-text-primary">Meta de ahorro</p><p className="mt-0.5 text-[10px] text-arca-text-dim">{formatMoney.format(data.currentSavings)} de {formatMoney.format(data.savingsTarget)}</p></div></div>
            <span className="text-sm font-black text-arca-positive">{savingsProgress}%</span>
          </div>
          <div className="mt-4 h-2 overflow-hidden rounded-full bg-arca-surface-2"><div className="h-full rounded-full bg-arca-positive" style={{ width: `${savingsProgress}%` }} /></div>
          <p className="mt-3 text-[10px] leading-4 text-arca-text-secondary">Para completar la meta en este horizonte necesitarías separar cerca de <strong className="text-arca-text-primary">{formatMoney.format(monthlySavingsNeeded)} al mes</strong>.</p>
        </section>
      ) : (
        <section className="rounded-[24px] border border-dashed border-arca-accent/35 bg-arca-accent/[0.05] p-5">
          <div className="flex items-start gap-3"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-arca-accent/10 text-arca-accent"><PiggyBank size={18} /></span><div><p className="text-sm font-black text-arca-text-primary">Aún no tienes una meta de ahorro</p><p className="mt-1 text-[11px] leading-5 text-arca-text-secondary">Crea una meta para calcular cuánto separar cada mes y verla dentro de tu proyección.</p></div></div>
          <div className="mt-4 grid grid-cols-2 gap-2"><button type="button" onClick={openSavingsGoal} className="rounded-xl bg-arca-accent px-3 py-3 text-[10px] font-black text-black">Crear meta</button><button type="button" onClick={() => onOpenNova('Ayúdame a definir una meta de ahorro realista según mis ingresos, gastos y próximos pagos.')} className="rounded-xl border border-arca-border bg-arca-surface-1 px-3 py-3 text-[10px] font-black text-arca-text-primary">Pedir recomendación</button></div>
        </section>
      )}

      <aside className="rounded-[24px] border border-arca-accent/20 bg-arca-accent/[0.05] p-5">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-arca-accent/10 text-arca-accent"><Sparkles size={18} /></span>
          <div><p className="text-xs font-black text-arca-text-primary">Nova analiza tu ruta</p><p className="mt-1 text-[11px] leading-5 text-arca-text-secondary">{novaInsight(riskMonth, lowestMonth, difference, formatMoney)}</p><button type="button" onClick={() => onOpenNova(`Analiza mi proyección a ${horizon} meses. En el escenario actual cerraría con ${formatMoney.format(closing)}, una variación de ${formatMoney.format(difference)}. Ayúdame a mejorar el resultado con acciones concretas.`)} className="mt-3 flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-arca-accent">Mejorar mi proyección <ArrowRight size={13} /></button></div>
        </div>
      </aside>
    </div>
  );
}

function Metric({ label, value, icon, tone = 'default' }: { label: string; value: string; icon: ReactNode; tone?: 'default' | 'positive' | 'alert' }) {
  const toneClass = tone === 'alert' ? 'text-arca-alert' : tone === 'positive' ? 'text-arca-positive' : 'text-arca-accent';
  return <div className="rounded-2xl border border-arca-border bg-arca-surface-2/70 p-3"><div className={`flex items-center gap-1.5 text-[8px] font-black uppercase tracking-wider ${toneClass}`}>{icon}{label}</div><p className="mt-2 truncate text-sm font-black text-arca-text-primary">{value}</p></div>;
}

function Adjustment({ label, value, min, max, tone, onChange }: { label: string; value: number; min: number; max: number; tone: 'positive' | 'alert'; onChange: (value: number) => void }) {
  return <label className="block"><span className="flex items-center justify-between text-[10px] font-bold text-arca-text-secondary"><span className="flex items-center gap-2"><SlidersHorizontal size={13} className={tone === 'positive' ? 'text-arca-positive' : 'text-arca-alert'} />{label}</span><strong className={value < 0 ? 'text-arca-alert' : value > 0 ? 'text-arca-positive' : 'text-arca-text-primary'}>{value > 0 ? '+' : ''}{value}%</strong></span><input type="range" min={min} max={max} step={5} value={value} onChange={(event) => onChange(Number(event.target.value))} className="mt-3 w-full accent-[var(--accent)]" /></label>;
}

function MonthBreakdown({ month, formatMoney }: { month: ProjectionMonth & { income: number; variableOutflow: number; outgoing: number; closing: number; net: number }; formatMoney: Intl.NumberFormat }) {
  return <div className="rounded-[22px] border border-arca-border bg-arca-surface-1 p-4"><div className="flex items-start justify-between gap-3"><div><p className="text-sm font-black capitalize text-arca-text-primary">{month.label}</p><p className="mt-1 flex items-center gap-1.5 text-[9px] font-semibold text-arca-text-dim"><CalendarRange size={11} /> {month.source === 'planned' ? 'Planeación cargada' : 'Calculado desde tu agenda'}</p></div><div className="text-right"><p className="text-[8px] font-black uppercase tracking-wider text-arca-text-dim">Cierre</p><p className={`mt-1 text-sm font-black ${month.closing < 0 ? 'text-arca-alert' : 'text-arca-text-primary'}`}>{formatMoney.format(month.closing)}</p></div></div><div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 border-t border-arca-border pt-4"><Breakdown label="Ingresos" value={month.income} formatMoney={formatMoney} positive /><Breakdown label="Gastos" value={month.variableOutflow} formatMoney={formatMoney} /><Breakdown label="Deudas" value={month.debtPayments} formatMoney={formatMoney} /><Breakdown label="Tarjetas" value={month.cardPayments} formatMoney={formatMoney} /><Breakdown label="Ahorro" value={month.plannedSavings} formatMoney={formatMoney} /><Breakdown label="Resultado neto" value={month.net} formatMoney={formatMoney} positive={month.net >= 0} /></div></div>;
}

function Breakdown({ label, value, formatMoney, positive = false }: { label: string; value: number; formatMoney: Intl.NumberFormat; positive?: boolean }) {
  return <div><p className="text-[8px] font-black uppercase tracking-wider text-arca-text-dim">{label}</p><p className={`mt-1 text-xs font-black ${positive ? 'text-arca-positive' : 'text-arca-text-primary'}`}>{formatMoney.format(value)}</p></div>;
}

function Legend({ color, label, dashed = false }: { color: string; label: string; dashed?: boolean }) {
  return <span className="flex items-center gap-1.5 text-[9px] text-arca-text-dim"><span className={`h-0.5 w-4 ${color} ${dashed ? 'opacity-70' : ''}`} />{label}</span>;
}

function moneyFormatter(currency: string) {
  const safeCurrency = /^[A-Z]{3}$/.test(currency) ? currency : 'COP';
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: safeCurrency, maximumFractionDigits: 0 });
}

function signedMoney(value: number, formatter: Intl.NumberFormat) {
  if (!value) return formatter.format(0);
  return `${value > 0 ? '+' : '−'} ${formatter.format(Math.abs(value))}`;
}

function compactMoney(value: number) {
  const absolute = Math.abs(value);
  const sign = value < 0 ? '−' : '';
  if (absolute >= 1_000_000) return `${sign}$${(absolute / 1_000_000).toFixed(1).replace('.0', '')}M`;
  if (absolute >= 1_000) return `${sign}$${Math.round(absolute / 1_000)}k`;
  return `${sign}$${Math.round(absolute)}`;
}

function routeMessage(difference: number, riskMonth: string | undefined, formatter: Intl.NumberFormat) {
  if (riskMonth) return `Con los datos actuales, tu caja entraría en negativo en ${riskMonth}.`;
  if (difference < 0) return `Tu caja se reduciría ${formatter.format(Math.abs(difference))}, pero se mantendría positiva.`;
  if (difference > 0) return `Tu posición crecería ${formatter.format(difference)} durante este periodo.`;
  return 'Tu posición se mantendría estable durante este periodo.';
}

function novaInsight(riskMonth: { label: string } | null, lowestMonth: { label: string; closing: number } | null, difference: number, formatter: Intl.NumberFormat) {
  if (riskMonth) return `El punto más importante es ${riskMonth.label}: ahí tu caja cruza a negativo. Puedo ayudarte a mover pagos o ajustar gastos antes de llegar.`;
  if (lowestMonth && difference < 0) return `Tu punto más ajustado sería ${lowestMonth.label}, con cerca de ${formatter.format(lowestMonth.closing)}. Conviene proteger un colchón antes de ese mes.`;
  return 'Tu ruta se mantiene positiva. Puedo ayudarte a convertir parte de ese margen en ahorro o acelerar una deuda.';
}
