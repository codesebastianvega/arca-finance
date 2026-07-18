'use client';

import { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { useRouter } from 'next/navigation';
import {
  AlertTriangle,
  ArrowDownLeft,
  Banknote,
  BriefcaseBusiness,
  CalendarClock,
  Check,
  CheckCircle2,
  Droplets,
  House,
  Monitor,
  PencilLine,
  Play,
  Plus,
  RefreshCw,
  Repeat2,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Wifi,
  X,
  Zap,
  type LucideIcon,
} from 'lucide-react';
import { cancelExpenseTemplate, cancelIncomeTemplate, updateExpenseTemplate, updateIncomeTemplate } from '@/app/actions';
import type { Subscription, SubscriptionsViewModel } from '@/src/lib/subscriptions-data';
import { haptics } from '@/src/lib/haptics';

type ActiveTab = 'incomes' | 'expenses';

export default function SubscriptionsScreen({
  data,
  currency,
  onBack,
  onNavigateToRegister,
  onOpenNova,
}: {
  data: SubscriptionsViewModel;
  currency: string;
  onBack: () => void;
  onNavigateToRegister?: (type: 'gasto' | 'ingreso') => void;
  onOpenNova: (prompt?: string) => void;
}) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<ActiveTab>('incomes');
  const [selected, setSelected] = useState<Subscription | null>(null);
  const [editName, setEditName] = useState('');
  const [editAmount, setEditAmount] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const formatMoney = moneyFormatter(currency);

  const activeIncomes = data.incomes.filter((item) => item.status === 'active');
  const activeExpenses = data.expenses.filter((item) => item.status === 'active');
  const activeRecurrences = [...activeIncomes, ...activeExpenses];
  const nextRecurrence = activeRecurrences
    .filter((item) => item.nextOccurrence)
    .sort((a, b) => String(a.nextOccurrence).localeCompare(String(b.nextOccurrence)))[0] ?? null;
  const currentList = activeTab === 'incomes' ? data.incomes : data.expenses;
  const activeList = currentList.filter((item) => item.status === 'active');
  const endedList = currentList.filter((item) => item.status !== 'active');
  const activeMonthlyEstimate = activeList.reduce((sum, item) => sum + monthlyEquivalent(item), 0);

  const openManager = (item: Subscription) => {
    setSelected(item);
    setEditName(item.name);
    setEditAmount(String(item.defaultAmount));
    setIsEditing(false);
    haptics.medium();
  };

  const closeManager = () => {
    if (isPending) return;
    setSelected(null);
    setIsEditing(false);
  };

  const handleSave = async () => {
    if (!selected || !editName.trim() || Number(editAmount) <= 0) return;
    setIsPending(true);
    try {
      if (selected.kind === 'expense') await updateExpenseTemplate({ id: selected.id, name: editName, amount: Number(editAmount) });
      else await updateIncomeTemplate({ id: selected.id, name: editName, amount: Number(editAmount) });
      haptics.success();
      setSelected(null);
      router.refresh();
    } catch (error) {
      console.error('Error updating recurrence', error);
      alert('Hubo un error al guardar. Intenta de nuevo.');
    } finally {
      setIsPending(false);
    }
  };

  const handleFinish = async () => {
    if (!selected || !confirm('¿Seguro que quieres finalizar esta recurrencia? Se cancelarán sus movimientos futuros.')) return;
    setIsPending(true);
    try {
      if (selected.kind === 'income') await cancelIncomeTemplate(selected.id);
      else await cancelExpenseTemplate(selected.id);
      haptics.success();
      setSelected(null);
      router.refresh();
    } catch (error) {
      console.error('Error finishing recurrence', error);
      alert('Hubo un error al finalizar. Intenta de nuevo.');
    } finally {
      setIsPending(false);
    }
  };

  const createCurrent = () => onNavigateToRegister?.(activeTab === 'incomes' ? 'ingreso' : 'gasto');

  return (
    <div className="space-y-5 pb-5">
      <header className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <button type="button" onClick={onBack} aria-label="Volver" className="text-arca-text-dim transition-colors hover:text-arca-accent"><ArrowDownLeft className="rotate-45" size={24} /></button>
          <div><p className="text-[9px] font-black uppercase tracking-[0.2em] text-arca-accent">Movimientos recurrentes</p><h1 className="text-xl font-black tracking-[-0.03em] text-arca-text-primary">Suscripciones y contratos</h1></div>
        </div>
        {onNavigateToRegister ? <button type="button" onClick={createCurrent} aria-label="Agregar recurrencia" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-arca-accent text-black"><Plus size={19} /></button> : null}
      </header>

      <section className="relative overflow-hidden rounded-[26px] border border-arca-border-strong bg-arca-surface-1 p-5">
        <div className="absolute -right-12 -top-16 h-40 w-40 rounded-full bg-arca-accent/[0.08] blur-3xl" />
        <div className="relative flex items-start justify-between gap-4"><div><p className="text-[9px] font-black uppercase tracking-[0.18em] text-arca-text-dim">Recurrencias activas</p><p className="mt-2 text-4xl font-black tracking-[-0.06em] text-arca-text-primary">{activeRecurrences.length}</p><p className="mt-2 text-[10px] text-arca-text-secondary">{activeIncomes.length} {activeIncomes.length === 1 ? 'ingreso' : 'ingresos'} · {activeExpenses.length} {activeExpenses.length === 1 ? 'gasto' : 'gastos'}</p></div><span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-arca-accent/10 text-arca-accent"><Repeat2 size={20} /></span></div>
        {nextRecurrence?.nextOccurrence ? <div className="relative mt-5 flex items-center gap-3 rounded-2xl border border-arca-border bg-arca-surface-2/70 p-3"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-arca-accent/10 text-arca-accent"><CalendarClock size={16} /></span><div className="min-w-0"><p className="text-[8px] font-black uppercase tracking-wider text-arca-text-dim">Próximo movimiento</p><p className="mt-1 truncate text-xs font-black text-arca-text-primary">{nextRecurrence.name} · {dateLabel(nextRecurrence.nextOccurrence)}</p></div></div> : null}
      </section>

      <div className="grid grid-cols-2 rounded-2xl border border-arca-border bg-arca-surface-1 p-1.5" role="tablist" aria-label="Tipo de recurrencia">
        <TabButton active={activeTab === 'incomes'} label="Ingresos" count={data.incomes.length} onClick={() => setActiveTab('incomes')} />
        <TabButton active={activeTab === 'expenses'} label="Gastos" count={data.expenses.length} onClick={() => setActiveTab('expenses')} />
      </div>
      <p className="px-1 text-[10px] leading-4 text-arca-text-dim">{activeTab === 'incomes' ? 'Nómina, contratos y cobros que se repiten.' : 'Servicios, plataformas y pagos periódicos.'}</p>

      {!currentList.length ? <EmptyState tab={activeTab} onCreate={onNavigateToRegister ? createCurrent : undefined} /> : (
        <div className="space-y-5">
          {activeList.length ? <RecurrenceSection label="Activas" items={activeList} formatMoney={formatMoney} onManage={openManager} /> : null}
          {endedList.length ? <RecurrenceSection label="Finalizadas" items={endedList} formatMoney={formatMoney} onManage={openManager} muted /> : null}
          {activeList.length ? <section className="flex items-center justify-between gap-4 rounded-2xl border border-arca-border bg-arca-surface-1 px-4 py-3"><div><p className="text-[8px] font-black uppercase tracking-[0.16em] text-arca-text-dim">Total estimado al mes</p><p className="mt-1 text-[9px] text-arca-text-dim">Solo recurrencias activas de esta sección</p></div><p className={`shrink-0 text-base font-black ${activeTab === 'incomes' ? 'text-arca-positive' : 'text-arca-alert'}`}>{formatMoney.format(activeMonthlyEstimate)}</p></section> : null}
        </div>
      )}

      {onNavigateToRegister ? <button type="button" onClick={createCurrent} className="flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-arca-accent/35 bg-arca-accent/[0.04] py-4 text-xs font-black text-arca-accent"><Plus size={16} /> Agregar {activeTab === 'incomes' ? 'ingreso recurrente' : 'suscripción o gasto recurrente'}</button> : null}

      <aside className="rounded-[22px] border border-arca-accent/20 bg-arca-accent/[0.05] p-4"><div className="flex items-start gap-3"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-arca-accent/10 text-arca-accent"><Sparkles size={17} /></span><div><p className="text-xs font-black text-arca-text-primary">Nova entiende tus recurrencias</p><p className="mt-1 text-[11px] leading-5 text-arca-text-secondary">{novaMessage(activeRecurrences.length, activeExpenses.length)}</p><button type="button" onClick={() => onOpenNova(`Revisa mis ${activeRecurrences.length} recurrencias activas: ${activeIncomes.length} de ingreso y ${activeExpenses.length} de gasto. Ayúdame a detectar duplicados, servicios innecesarios o recurrencias sin próximos movimientos.`)} className="mt-3 text-[10px] font-black uppercase tracking-wider text-arca-accent">Revisar con Nova →</button></div></div></aside>

      <AnimatePresence>{selected ? <ManagementModal item={selected} editName={editName} editAmount={editAmount} isEditing={isEditing} isPending={isPending} formatMoney={formatMoney} onEditName={setEditName} onEditAmount={setEditAmount} onStartEdit={() => setIsEditing(true)} onCancelEdit={() => setIsEditing(false)} onSave={() => void handleSave()} onFinish={() => void handleFinish()} onClose={closeManager} /> : null}</AnimatePresence>
    </div>
  );
}

function RecurrenceSection({ label, items, formatMoney, onManage, muted = false }: { label: string; items: Subscription[]; formatMoney: Intl.NumberFormat; onManage: (item: Subscription) => void; muted?: boolean }) {
  return <section><div className="mb-2 flex items-center justify-between px-1"><h2 className="text-[9px] font-black uppercase tracking-[0.18em] text-arca-text-dim">{label}</h2><span className="text-[9px] font-bold text-arca-text-dim">{items.length}</span></div><div className="space-y-3">{items.map((item) => <RecurrenceCard key={item.id} item={item} formatMoney={formatMoney} onManage={onManage} muted={muted} />)}</div></section>;
}

function RecurrenceCard({ item, formatMoney, onManage, muted }: { item: Subscription; formatMoney: Intl.NumberFormat; onManage: (item: Subscription) => void; muted: boolean }) {
  const visual = recurrenceVisual(item);
  const Icon = visual.icon;
  const occurrences = occurrencesPerMonth(item);
  const estimatedMonthly = item.defaultAmount * occurrences;
  return <article className={`rounded-[22px] border border-arca-border bg-arca-surface-1 p-4 ${muted ? 'opacity-55' : ''}`}><div className="flex items-start justify-between gap-3"><div className="flex min-w-0 items-start gap-3"><span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${visual.tone}`}><Icon size={18} /></span><div className="min-w-0"><h3 className="truncate text-base font-black text-arca-text-primary">{item.name}</h3><p className="mt-1 text-[9px] font-semibold capitalize text-arca-text-dim">{visual.label} · {unitLabel(item.businessUnitKey)}</p>{occurrences > 1 ? <p className="mt-1 text-[9px] font-bold text-arca-accent">{occurrences} veces al mes · estimado {formatMoney.format(estimatedMonthly)}/mes</p> : null}</div></div><div className="shrink-0 text-right"><p className={`text-base font-black ${item.kind === 'income' ? 'text-arca-positive' : 'text-arca-alert'}`}>{formatMoney.format(item.defaultAmount)}</p><p className="mt-0.5 text-[8px] font-black uppercase tracking-wider text-arca-text-dim">{occurrences > 1 ? '/ ocurrencia' : frequencySuffix(item.frequency)}</p></div></div><div className="mt-4 flex items-center justify-between gap-3 border-t border-arca-border pt-3"><div className="min-w-0"><p className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-wider text-arca-text-dim"><CalendarClock size={12} className="text-arca-accent" /> Próxima ocurrencia</p><p className="mt-1 truncate text-xs font-bold text-arca-text-primary">{item.nextOccurrence ? dateLabel(item.nextOccurrence) : item.status === 'active' ? 'Sin movimiento futuro cargado' : 'Recurrencia finalizada'}</p>{item.accountName ? <p className="mt-1 truncate text-[9px] text-arca-text-dim">Cuenta: {item.accountName}</p> : null}</div><button type="button" onClick={() => onManage(item)} className="shrink-0 rounded-xl border border-arca-border bg-arca-surface-2 px-3 py-2 text-[9px] font-black text-arca-text-secondary">Gestionar</button></div></article>;
}

function ManagementModal({ item, editName, editAmount, isEditing, isPending, formatMoney, onEditName, onEditAmount, onStartEdit, onCancelEdit, onSave, onFinish, onClose }: { item: Subscription; editName: string; editAmount: string; isEditing: boolean; isPending: boolean; formatMoney: Intl.NumberFormat; onEditName: (value: string) => void; onEditAmount: (value: string) => void; onStartEdit: () => void; onCancelEdit: () => void; onSave: () => void; onFinish: () => void; onClose: () => void }) {
  return <motion.div className="fixed inset-0 z-[120] flex items-end justify-center bg-black/65 p-3 backdrop-blur-sm sm:items-center" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}><motion.section role="dialog" aria-modal="true" aria-labelledby="recurrence-modal-title" className="w-full max-w-md rounded-[28px] border border-arca-border-strong bg-arca-surface-1 p-5 shadow-2xl" initial={{ y: 30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 30, opacity: 0 }} onClick={(event) => event.stopPropagation()}><div className="flex items-start justify-between gap-4"><div><p className="text-[9px] font-black uppercase tracking-[0.18em] text-arca-accent">Gestionar recurrencia</p><h2 id="recurrence-modal-title" className="mt-1 text-xl font-black text-arca-text-primary">{item.name}</h2></div><button type="button" onClick={onClose} disabled={isPending} aria-label="Cerrar" className="rounded-xl bg-arca-surface-2 p-2 text-arca-text-dim"><X size={18} /></button></div>{isEditing ? <div className="mt-5 space-y-4"><Field label="Nombre"><input value={editName} onChange={(event) => onEditName(event.target.value)} className="w-full rounded-xl border border-arca-border bg-arca-surface-2 px-4 py-3 text-sm font-bold text-arca-text-primary outline-none focus:border-arca-accent" /></Field><Field label="Valor por ocurrencia"><input type="number" min="1" value={editAmount} onChange={(event) => onEditAmount(event.target.value)} className="w-full rounded-xl border border-arca-border bg-arca-surface-2 px-4 py-3 text-sm font-bold text-arca-text-primary outline-none focus:border-arca-accent" /></Field><div className="grid grid-cols-2 gap-2"><button type="button" onClick={onCancelEdit} disabled={isPending} className="rounded-xl border border-arca-border py-3 text-xs font-black text-arca-text-secondary">Cancelar</button><button type="button" onClick={onSave} disabled={isPending || !editName.trim() || Number(editAmount) <= 0} className="flex items-center justify-center gap-2 rounded-xl bg-arca-accent py-3 text-xs font-black text-black disabled:opacity-50"><Check size={15} />{isPending ? 'Guardando...' : 'Guardar'}</button></div></div> : <div className="mt-5"><div className="grid grid-cols-2 gap-2"><Info label="Valor" value={formatMoney.format(item.defaultAmount)} /><Info label="Frecuencia" value={frequencyLabel(item.frequency)} /><Info label="Próximo" value={item.nextOccurrence ? dateLabel(item.nextOccurrence) : 'Sin fecha'} /><Info label="Cuenta" value={item.accountName ?? 'Sin cuenta'} /></div>{item.status === 'active' ? <div className="mt-5 grid grid-cols-2 gap-2"><button type="button" onClick={onStartEdit} className="flex items-center justify-center gap-2 rounded-xl border border-arca-border bg-arca-surface-2 py-3 text-xs font-black text-arca-text-primary"><PencilLine size={15} />Editar</button><button type="button" onClick={onFinish} disabled={isPending} className="flex items-center justify-center gap-2 rounded-xl border border-arca-alert/25 bg-arca-alert/[0.08] py-3 text-xs font-black text-arca-alert"><AlertTriangle size={15} />{isPending ? 'Finalizando...' : 'Finalizar'}</button></div> : <div className="mt-5 flex items-center gap-2 rounded-xl bg-arca-surface-2 p-3 text-xs font-bold text-arca-text-dim"><CheckCircle2 size={15} /> Esta recurrencia está finalizada.</div>}</div>}</motion.section></motion.div>;
}

function TabButton({ active, label, count, onClick }: { active: boolean; label: string; count: number; onClick: () => void }) { return <button type="button" role="tab" aria-selected={active} onClick={onClick} className={`flex items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-xs font-black ${active ? 'bg-arca-accent text-black' : 'text-arca-text-dim'}`}>{label}<span className={`rounded-full px-2 py-0.5 text-[8px] ${active ? 'bg-black/15' : 'bg-arca-surface-2'}`}>{count}</span></button>; }
function EmptyState({ tab, onCreate }: { tab: ActiveTab; onCreate?: () => void }) { return <div className="rounded-[22px] border border-arca-border bg-arca-surface-1 px-6 py-12 text-center"><span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-arca-accent/10 text-arca-accent"><RefreshCw size={24} /></span><p className="mt-4 text-sm font-black text-arca-text-primary">Aún no hay recurrencias</p><p className="mt-1 text-xs text-arca-text-dim">No tienes {tab === 'incomes' ? 'ingresos recurrentes' : 'gastos recurrentes'} registrados.</p>{onCreate ? <button type="button" onClick={onCreate} className="mt-5 rounded-xl bg-arca-accent px-5 py-3 text-xs font-black text-black"><Plus className="mr-1 inline" size={14} />Crear ahora</button> : null}</div>; }
function Field({ label, children }: { label: string; children: React.ReactNode }) { return <label className="block"><span className="mb-1.5 block text-[9px] font-black uppercase tracking-wider text-arca-text-dim">{label}</span>{children}</label>; }
function Info({ label, value }: { label: string; value: string }) { return <div className="rounded-xl border border-arca-border bg-arca-surface-2 p-3"><p className="text-[8px] font-black uppercase tracking-wider text-arca-text-dim">{label}</p><p className="mt-1 truncate text-xs font-black capitalize text-arca-text-primary">{value}</p></div>; }

function frequencyLabel(value: string) { return ({ monthly: 'Mensual', bimonthly: 'Bimestral', quarterly: 'Trimestral', biannual: 'Semestral', annual: 'Anual' } as Record<string, string>)[value] ?? value; }
function frequencySuffix(value: string) { return ({ monthly: '/ mes', bimonthly: '/ 2 meses', quarterly: '/ 3 meses', biannual: '/ 6 meses', annual: '/ año' } as Record<string, string>)[value] ?? '/ recurrencia'; }
function unitLabel(value: string) { return value === 'general' ? 'General' : value.replaceAll('_', ' '); }
function dateLabel(value: string) { return new Intl.DateTimeFormat('es-CO', { day: 'numeric', month: 'long', timeZone: 'America/Bogota' }).format(new Date(`${value}T12:00:00-05:00`)); }
function moneyFormatter(currency: string) { const safeCurrency = /^[A-Z]{3}$/.test(currency) ? currency : 'COP'; return new Intl.NumberFormat('es-CO', { style: 'currency', currency: safeCurrency, maximumFractionDigits: 0 }); }
function novaMessage(total: number, expenses: number) { if (!total) return 'Cuando agregues recurrencias podré ayudarte a detectar duplicados y movimientos que dejaron de generarse.'; return `Tienes ${total} recurrencias activas${expenses ? `, incluyendo ${expenses} de gasto` : ''}. Puedo detectar duplicados, servicios innecesarios o registros sin próximos movimientos.`; }

function occurrencesPerMonth(item: Subscription) {
  if (item.frequency === 'monthly' && item.daysOfMonth.length > 0) return item.daysOfMonth.length;
  return 1;
}

function monthlyEquivalent(item: Subscription) {
  if (item.frequency === 'monthly') return item.defaultAmount * occurrencesPerMonth(item);
  const divisor: Record<string, number> = { bimonthly: 2, quarterly: 3, biannual: 6, annual: 12 };
  return item.defaultAmount / (divisor[item.frequency] ?? 1);
}

function recurrenceVisual(item: Subscription): { icon: LucideIcon; label: string; tone: string } {
  const name = item.name.toLocaleLowerCase('es');
  if (/n[oó]mina|salario/.test(name)) return { icon: Banknote, label: 'Nómina', tone: 'bg-arca-positive/10 text-arca-positive' };
  if (item.kind === 'income') return { icon: BriefcaseBusiness, label: 'Contrato recurrente', tone: 'bg-arca-positive/10 text-arca-positive' };
  if (/netflix|hbo|disney|spotify|youtube|prime|stream/.test(name)) return { icon: Play, label: 'Entretenimiento', tone: 'bg-arca-alert/10 text-arca-alert' };
  if (/internet|wifi|fibra/.test(name)) return { icon: Wifi, label: 'Internet', tone: 'bg-cyan-500/10 text-cyan-500' };
  if (/luz|energ|electric/.test(name)) return { icon: Zap, label: 'Energía', tone: 'bg-amber-500/10 text-amber-500' };
  if (/agua|acueducto/.test(name)) return { icon: Droplets, label: 'Agua', tone: 'bg-sky-500/10 text-sky-500' };
  if (/claro|movistar|tigo|celular|tel[eé]fono/.test(name)) return { icon: Smartphone, label: 'Telefonía', tone: 'bg-violet-500/10 text-violet-500' };
  if (/seguro|p[oó]liza/.test(name)) return { icon: ShieldCheck, label: 'Seguro', tone: 'bg-arca-positive/10 text-arca-positive' };
  if (/software|adobe|microsoft|google|icloud|hosting|dominio/.test(name)) return { icon: Monitor, label: 'Software', tone: 'bg-indigo-500/10 text-indigo-400' };
  if (/arriendo|renta|administraci[oó]n/.test(name)) return { icon: House, label: 'Vivienda', tone: 'bg-arca-accent/10 text-arca-accent' };
  return { icon: Repeat2, label: 'Gasto recurrente', tone: 'bg-arca-accent/10 text-arca-accent' };
}
