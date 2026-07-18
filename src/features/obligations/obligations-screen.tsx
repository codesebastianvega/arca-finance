'use client';

import { useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { useRouter } from 'next/navigation';
import { AlertCircle, ArrowDownLeft, CheckCircle2, Clock, Sparkles } from 'lucide-react';
import type { ObligationFilter, ObligationItem, ObligationsViewModel } from '@/src/lib/obligations-types';
import { filterObligations } from '@/src/lib/obligations-types';
import { haptics } from '@/src/lib/haptics';
import { ObligationActionModal } from './components/obligation-action-modal';

type Mode = 'gastos' | 'ingresos';
type ObligationGroup = { id: string; label: string; tone: 'alert' | 'accent' | 'neutral'; items: ObligationItem[] };

const CHIPS = [
  { id: 'vencido', label: 'Vencido' },
  { id: 'hoy', label: 'Hoy' },
  { id: 'proximos', label: 'Próximos' },
  { id: 'semana', label: 'Esta semana' },
  { id: 'mes', label: 'Este mes' },
  { id: 'todo', label: 'Todo' },
] as const;

export default function ObligationsScreen({
  data,
  currency,
  onBack,
  onOpenNova,
  initialMode = 'gastos',
  initialFilter = 'todo',
}: {
  data: ObligationsViewModel;
  currency: string;
  onBack: () => void;
  onOpenNova: (prompt?: string) => void;
  initialMode?: Mode;
  initialFilter?: ObligationFilter;
}) {
  const router = useRouter();
  const [filter, setFilter] = useState<ObligationFilter>(initialFilter);
  const [selectedEntity, setSelectedEntity] = useState<ObligationItem | null>(null);
  const [mode, setMode] = useState<Mode>(initialMode);
  const formatMoney = useMemo(() => moneyFormatter(currency), [currency]);

  const modeItems = useMemo(() => data.items.filter((item) => mode === 'gastos' ? item.kind !== 'income' : item.kind === 'income'), [data.items, mode]);
  const items = useMemo(() => filterObligations(modeItems, filter), [filter, modeItems]);
  const expenseCount = useMemo(() => data.items.filter((item) => item.kind !== 'income').length, [data.items]);
  const incomeCount = data.items.length - expenseCount;
  const totalFilteredAmount = items.reduce((sum, item) => sum + item.amount, 0);
  const overdueItems = modeItems.filter((item) => item.status === 'overdue');
  const overdueAmount = overdueItems.reduce((sum, item) => sum + item.amount, 0);
  const groups = useMemo(() => groupItems(items), [items]);

  const openEntity = (item: ObligationItem) => {
    setSelectedEntity(item);
    haptics.medium();
  };

  return (
    <div className="space-y-5 pb-5">
      <header className="flex items-center gap-4">
        <button type="button" onClick={onBack} aria-label="Volver" className="text-arca-text-dim transition-colors hover:text-arca-accent">
          <ArrowDownLeft className="rotate-45" size={24} />
        </button>
        <div>
          <p className="text-[9px] font-black uppercase tracking-[0.2em] text-arca-accent">Tus compromisos</p>
          <h1 className="text-xl font-black tracking-[-0.03em] text-arca-text-primary">Pagos y cobros</h1>
        </div>
      </header>

      <div className="grid grid-cols-2 rounded-2xl border border-arca-border bg-arca-surface-1 p-1.5" role="tablist" aria-label="Tipo de compromiso">
        <ModeTab active={mode === 'gastos'} label="Por pagar" count={expenseCount} onClick={() => { setMode('gastos'); setFilter('todo'); }} />
        <ModeTab active={mode === 'ingresos'} label="Por cobrar" count={incomeCount} onClick={() => { setMode('ingresos'); setFilter('todo'); }} />
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none]">
        {CHIPS.map((chip) => (
          <button key={chip.id} type="button" onClick={() => setFilter(chip.id)} className={`shrink-0 rounded-full border px-3.5 py-2 text-[9px] font-black uppercase tracking-wider transition-colors ${filter === chip.id ? 'border-arca-accent/40 bg-arca-accent/15 text-arca-accent' : 'border-arca-border bg-arca-surface-1 text-arca-text-dim'}`}>
            {chip.label}
          </button>
        ))}
      </div>

      {items.length ? (
        <section className="relative overflow-hidden rounded-[24px] border border-arca-border-strong bg-arca-surface-1 p-5">
          <div className={`absolute -right-10 -top-16 h-36 w-36 rounded-full blur-3xl ${mode === 'gastos' ? 'bg-arca-alert/10' : 'bg-arca-positive/10'}`} />
          <div className="relative flex items-center justify-between gap-4">
            <div>
              <p className="text-[9px] font-black uppercase tracking-[0.18em] text-arca-text-dim">Total {mode === 'gastos' ? 'por pagar' : 'por cobrar'}</p>
              <p className="mt-1 text-2xl font-black tracking-[-0.04em] text-arca-text-primary">{formatMoney.format(totalFilteredAmount)}</p>
              <p className="mt-2 text-[10px] text-arca-text-secondary">{items.length} {items.length === 1 ? 'compromiso visible' : 'compromisos visibles'}</p>
            </div>
            <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${mode === 'gastos' ? 'bg-arca-alert/10 text-arca-alert' : 'bg-arca-positive/10 text-arca-positive'}`}>
              {mode === 'gastos' ? <AlertCircle size={20} /> : <CheckCircle2 size={20} />}
            </span>
          </div>
          {overdueItems.length ? <button type="button" onClick={() => setFilter('vencido')} className="relative mt-4 flex w-full items-center justify-between rounded-2xl border border-arca-alert/20 bg-arca-alert/[0.06] px-4 py-3 text-left"><span className="text-[10px] font-bold text-arca-alert">{overdueItems.length} {mode === 'gastos' ? 'pagos vencidos' : 'cobros atrasados'}</span><strong className="text-xs text-arca-text-primary">{formatMoney.format(overdueAmount)}</strong></button> : null}
        </section>
      ) : null}

      {!items.length ? <EmptyState mode={mode} /> : (
        <div className="space-y-5">
          {groups.map((group) => <ObligationSection key={group.id} group={group} accounts={data.accountOptions} mode={mode} onOpen={openEntity} />)}
        </div>
      )}

      {modeItems.length ? (
        <aside className="rounded-[22px] border border-arca-accent/20 bg-arca-accent/[0.05] p-4">
          <div className="flex items-start gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-arca-accent/10 text-arca-accent"><Sparkles size={17} /></span>
            <div><p className="text-xs font-black text-arca-text-primary">Nova puede ayudarte a priorizar</p><p className="mt-1 text-[11px] leading-5 text-arca-text-secondary">{novaMessage(mode, overdueItems.length, overdueAmount, formatMoney)}</p><button type="button" onClick={() => onOpenNova(mode === 'gastos' ? 'Revisa mis pagos y deudas pendientes. Prioriza qué debo pagar primero según mi saldo, fechas y nivel de urgencia.' : 'Revisa mis ingresos y cobros pendientes. Ayúdame a priorizar cuáles debo gestionar primero.')} className="mt-3 text-[10px] font-black uppercase tracking-wider text-arca-accent">Organizar con Nova →</button></div>
          </div>
        </aside>
      ) : null}

      <ObligationActionModal obligation={selectedEntity} accounts={data.accountOptions} onClose={() => setSelectedEntity(null)} onRefresh={() => router.refresh()} />
    </div>
  );
}

function ModeTab({ active, label, count, onClick }: { active: boolean; label: string; count: number; onClick: () => void }) {
  return <button type="button" role="tab" aria-selected={active} onClick={onClick} className={`flex items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-xs font-black transition-colors ${active ? 'bg-arca-accent text-black shadow-sm' : 'text-arca-text-dim'}`}><span>{label}</span><span className={`rounded-full px-2 py-0.5 text-[8px] ${active ? 'bg-black/15 text-black' : 'bg-arca-surface-2 text-arca-text-dim'}`}>{count}</span></button>;
}

function ObligationSection({ group, accounts, mode, onOpen }: { group: ObligationGroup; accounts: ObligationsViewModel['accountOptions']; mode: Mode; onOpen: (item: ObligationItem) => void }) {
  return <section><div className="mb-2 flex items-center justify-between px-1"><h2 className={`text-[9px] font-black uppercase tracking-[0.18em] ${group.tone === 'alert' ? 'text-arca-alert' : group.tone === 'accent' ? 'text-arca-accent' : 'text-arca-text-dim'}`}>{group.label}</h2><span className="text-[9px] font-bold text-arca-text-dim">{group.items.length}</span></div><div className="overflow-hidden rounded-[22px] border border-arca-border bg-arca-surface-1 divide-y divide-arca-border">{group.items.map((item) => <ObligationRow key={item.id} item={item} accounts={accounts} mode={mode} onOpen={onOpen} />)}</div></section>;
}

function ObligationRow({ item, accounts, mode, onOpen }: { item: ObligationItem; accounts: ObligationsViewModel['accountOptions']; mode: Mode; onOpen: (item: ObligationItem) => void }) {
  const accountId = item.accountId ?? item.suggestedAccountId;
  const account = accounts.find((option) => option.id === accountId)?.label;
  return <motion.button type="button" whileTap={{ scale: 0.988 }} onClick={() => onOpen(item)} className="relative flex w-full items-center justify-between gap-3 px-4 py-4 text-left transition-colors hover:bg-arca-surface-2/60"><span className={`absolute inset-y-0 left-0 w-0.5 ${item.status === 'overdue' ? 'bg-arca-alert' : item.status === 'today' ? 'bg-arca-accent' : 'bg-arca-border-strong'}`} /><span className="flex min-w-0 items-center gap-3"><StatusIcon status={item.status} /><span className="min-w-0"><span className="flex min-w-0 items-center gap-2"><span className="truncate text-sm font-bold text-arca-text-primary">{item.name}</span>{item.groupedOccurrences > 1 ? <span className="shrink-0 rounded-full bg-arca-accent/10 px-2 py-0.5 text-[8px] font-black text-arca-accent">{item.groupedOccurrences} cuotas</span> : null}</span><span className="mt-1 block truncate text-[9px] font-semibold text-arca-text-dim">{item.date}{account ? ` · ${account}` : ''}</span></span></span><span className="shrink-0 text-right"><span className="block text-sm font-black text-arca-text-primary">{item.amountLabel}</span><span className={`mt-1 inline-flex rounded-md px-2 py-1 text-[8px] font-black uppercase tracking-wider ${item.status === 'overdue' ? 'bg-arca-alert/10 text-arca-alert' : mode === 'ingresos' ? 'bg-arca-positive/10 text-arca-positive' : 'bg-arca-accent/10 text-arca-accent'}`}>{item.status === 'overdue' ? 'Atrasado' : mode === 'ingresos' ? 'Cobrar' : 'Pagar'}</span></span></motion.button>;
}

function StatusIcon({ status }: { status: ObligationItem['status'] }) {
  if (status === 'overdue') return <AlertCircle size={16} className="shrink-0 text-arca-alert" />;
  if (status === 'today') return <Clock size={16} className="shrink-0 text-arca-accent" />;
  return <CheckCircle2 size={16} className="shrink-0 text-arca-text-dim" />;
}

function EmptyState({ mode }: { mode: Mode }) {
  return <div className="rounded-[22px] border border-arca-border bg-arca-surface-1 px-6 py-12 text-center"><span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-arca-positive/10 text-arca-positive"><CheckCircle2 size={26} /></span><p className="mt-4 text-sm font-black text-arca-text-primary">Todo al día</p><p className="mt-1 text-xs text-arca-text-dim">{mode === 'gastos' ? 'No tienes pagos con este filtro.' : 'No tienes cobros con este filtro.'}</p></div>;
}

function groupItems(items: ObligationItem[]): ObligationGroup[] {
  const today = bogotaDate();
  const nextWeek = addDays(today, 7);
  const groups: ObligationGroup[] = [
    { id: 'overdue', label: 'Vencidos', tone: 'alert', items: items.filter((item) => item.status === 'overdue') },
    { id: 'soon', label: 'Próximos 7 días', tone: 'accent', items: items.filter((item) => item.status !== 'overdue' && item.dueDate <= nextWeek) },
    { id: 'later', label: 'Más adelante', tone: 'neutral', items: items.filter((item) => item.status !== 'overdue' && item.dueDate > nextWeek) },
  ];
  return groups.filter((group) => group.items.length > 0);
}

function bogotaDate() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Bogota', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
}

function addDays(date: string, days: number) {
  const value = new Date(`${date}T12:00:00-05:00`);
  value.setDate(value.getDate() + days);
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Bogota', year: 'numeric', month: '2-digit', day: '2-digit' }).format(value);
}

function moneyFormatter(currency: string) {
  const safeCurrency = /^[A-Z]{3}$/.test(currency) ? currency : 'COP';
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: safeCurrency, maximumFractionDigits: 0 });
}

function novaMessage(mode: Mode, overdueCount: number, overdueAmount: number, formatter: Intl.NumberFormat) {
  if (overdueCount) return `Tienes ${overdueCount} ${mode === 'gastos' ? 'pagos vencidos' : 'cobros atrasados'} por ${formatter.format(overdueAmount)}. Puedo ayudarte a decidir cuáles atender primero.`;
  return mode === 'gastos' ? 'Tus pagos no presentan atrasos. Puedo ayudarte a preparar los próximos sin afectar tu saldo.' : 'Tus cobros no presentan atrasos. Puedo ayudarte a organizar el seguimiento.';
}
