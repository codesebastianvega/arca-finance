'use client';

import { useEffect, useMemo, useState } from 'react';
import { motion } from 'motion/react';
import {
  ArrowDownLeft,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  CircleAlert,
  Plus,
  Sparkles,
  TrendingDown,
  TrendingUp,
  WalletCards,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { haptics } from '@/src/lib/haptics';
import type { CalendarEventItem, CalendarMonth, CalendarViewModel } from '@/src/lib/calendar-types';
import type { ObligationItem } from '@/src/lib/obligations-types';
import type { TodayReceivable } from '@/src/lib/today-data';
import { ObligationActionModal } from '@/src/features/obligations/components/obligation-action-modal';
import { ReceivableActionModal } from '@/src/features/dashboard/components/receivable-action-modal';

const WEEK_DAYS = ['D', 'L', 'M', 'M', 'J', 'V', 'S'];
type CalendarFilter = 'all' | 'overdue' | CalendarEventItem['kind'];

export default function CalendarScreen({
  onBack,
  onOpenNova,
  data,
  accounts,
  currency,
}: {
  onBack: () => void;
  onOpenNova: (prompt?: string) => void;
  data: CalendarViewModel;
  accounts: { id: string; label: string }[];
  currency: string;
}) {
  const initialIndex = Math.max(0, data.months.findIndex((month) => month.key === data.initialMonthKey));
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [filter, setFilter] = useState<CalendarFilter>('all');
  const [selectedEvent, setSelectedEvent] = useState<CalendarMonth['events'][number] | null>(null);
  const router = useRouter();

  const currentMonth = data.months[currentIndex];
  const nextDisabled = currentIndex >= data.months.length - 1;
  const prevDisabled = currentIndex <= 0;
  const formatMoney = useMemo(() => moneyFormatter(currency), [currency]);

  useEffect(() => {
    setSelectedDay(null);
    setFilter('all');
  }, [currentIndex]);

  const mappedObligation: ObligationItem | null =
    selectedEvent && (selectedEvent.kind === 'payment' || selectedEvent.kind === 'income')
      ? {
          id: selectedEvent.id,
          name: selectedEvent.title,
          amount: selectedEvent.amount,
          date: selectedEvent.dateLabel,
          amountLabel: selectedEvent.amountLabel,
          status: selectedEvent.status as ObligationItem['status'],
          priority: selectedEvent.priority,
          groupedOccurrences: 1,
          kind: selectedEvent.kind === 'payment' ? 'expense' : 'income',
          dueDate: selectedEvent.dueDate,
          accountId: selectedEvent.accountId,
          suggestedAccountId: selectedEvent.suggestedAccountId,
          notes: selectedEvent.notes,
          templateId: selectedEvent.templateId || '',
        }
      : null;

  const mappedReceivable: TodayReceivable | null =
    selectedEvent && selectedEvent.kind === 'receivable'
      ? {
          id: selectedEvent.id,
          title: selectedEvent.title,
          amount: selectedEvent.amount,
          dueLabel: selectedEvent.dateLabel,
          dueDate: selectedEvent.dueDate,
          debtorName: selectedEvent.secondaryLabel.replace(/^Cobro a\s+/i, ''),
          status: selectedEvent.status as TodayReceivable['status'],
          notes: selectedEvent.notes,
        }
      : null;

  const gridDays = useMemo(() => {
    const leading = Array.from({ length: currentMonth.firstWeekday }, (_, index) => ({ key: `empty-${index}`, day: null }));
    const days = Array.from({ length: currentMonth.daysInMonth }, (_, index) => ({ key: `day-${index + 1}`, day: index + 1 }));
    return [...leading, ...days];
  }, [currentMonth]);

  const eventsByDay = useMemo(() => {
    const map = new Map<number, CalendarMonth['events']>();
    for (const event of currentMonth.events) {
      const bucket = map.get(event.day) ?? [];
      bucket.push(event);
      map.set(event.day, bucket);
    }
    return map;
  }, [currentMonth]);

  const visibleEvents = useMemo(() => {
    return currentMonth.events
      .filter((event) => !selectedDay || event.day === selectedDay)
      .filter((event) => filter === 'all' || (filter === 'overdue' ? event.status === 'overdue' : event.kind === filter))
      .sort((a, b) => {
        if (a.status === 'overdue' && b.status !== 'overdue') return -1;
        if (b.status === 'overdue' && a.status !== 'overdue') return 1;
        return a.dueDate.localeCompare(b.dueDate);
      });
  }, [currentMonth.events, filter, selectedDay]);

  const openNewEvent = () => {
    const day = selectedDay ?? Math.min(new Date().getDate(), currentMonth.daysInMonth);
    const date = `${currentMonth.key}-${String(day).padStart(2, '0')}`;
    window.dispatchEvent(new CustomEvent('open-register', { detail: { segment: 'Obligacion', type: 'gasto', date } }));
  };

  const accountLabel = (event: CalendarEventItem) => {
    const accountId = event.accountId ?? event.suggestedAccountId;
    return accounts.find((account) => account.id === accountId)?.label ?? null;
  };

  return (
    <div className="space-y-5 pb-4">
      <header className="flex items-center gap-4">
        <button type="button" onClick={onBack} aria-label="Volver" className="text-arca-text-dim transition-colors hover:text-arca-accent">
          <ArrowDownLeft className="rotate-45" size={24} />
        </button>
        <div>
          <p className="text-[9px] font-black uppercase tracking-[0.2em] text-arca-accent">Tus próximos movimientos</p>
          <h1 className="text-xl font-black tracking-[-0.03em] text-arca-text-primary">Agenda financiera</h1>
        </div>
      </header>

      <section className="relative overflow-hidden rounded-[26px] border border-arca-border-strong bg-arca-surface-1 p-5">
        <div className="absolute -right-14 -top-20 h-44 w-44 rounded-full bg-arca-accent/[0.08] blur-3xl" />
        <div className="relative flex items-center justify-between">
          <div>
            <p className="text-[9px] font-black uppercase tracking-[0.18em] text-arca-text-dim">Resultado previsto del mes</p>
            <p className={`mt-1 text-3xl font-black tracking-[-0.05em] ${currentMonth.summary.expectedBalance < 0 ? 'text-arca-alert' : 'text-arca-text-primary'}`}>
              {signedMoney(currentMonth.summary.expectedBalance, formatMoney)}
            </p>
          </div>
          <span className={`flex h-11 w-11 items-center justify-center rounded-2xl ${currentMonth.summary.expectedBalance < 0 ? 'bg-arca-alert/10 text-arca-alert' : 'bg-arca-positive/10 text-arca-positive'}`}>
            <WalletCards size={21} />
          </span>
        </div>
        <div className="relative mt-5 grid grid-cols-2 gap-2.5">
          <SummaryMetric icon={TrendingDown} label="Por pagar" value={formatMoney.format(currentMonth.summary.payments)} tone="alert" />
          <SummaryMetric icon={TrendingUp} label="Por entrar" value={formatMoney.format(currentMonth.summary.income + currentMonth.summary.receivables)} tone="positive" />
        </div>
        {currentMonth.summary.overdueCount > 0 ? (
          <button type="button" onClick={() => { setSelectedDay(null); setFilter('overdue'); }} className="relative mt-3 flex w-full items-center justify-between rounded-2xl border border-arca-alert/20 bg-arca-alert/[0.06] px-4 py-3 text-left">
            <span className="flex items-center gap-2 text-xs font-bold text-arca-alert"><CircleAlert size={15} />{currentMonth.summary.overdueCount} vencidos</span>
            <span className="text-xs font-black text-arca-text-primary">{formatMoney.format(currentMonth.summary.overdueAmount)}</span>
          </button>
        ) : null}
      </section>

      <section className="rounded-[26px] border border-arca-border bg-arca-surface-1 p-4">
        <div className="mb-4 flex items-center justify-between pl-1">
          <h2 className="text-sm font-black capitalize text-arca-text-primary">{currentMonth.label}</h2>
          <div className="flex gap-1">
            <MonthButton disabled={prevDisabled} label="Mes anterior" onClick={() => setCurrentIndex((value) => value - 1)}><ChevronLeft size={18} /></MonthButton>
            <MonthButton disabled={nextDisabled} label="Mes siguiente" onClick={() => setCurrentIndex((value) => value + 1)}><ChevronRight size={18} /></MonthButton>
          </div>
        </div>

        <div className="grid grid-cols-7 gap-1.5">
          {WEEK_DAYS.map((day, index) => <div key={`${day}-${index}`} className="mb-1 text-center text-[9px] font-black uppercase text-arca-text-dim">{day}</div>)}
          {gridDays.map((cell) => {
            if (!cell.day) return <div key={cell.key} className="aspect-square" />;
            const dayEvents = eventsByDay.get(cell.day) ?? [];
            const isToday = currentMonth.key === data.initialMonthKey && cell.day === Number(new Date().toLocaleDateString('en-CA', { timeZone: 'America/Bogota' }).slice(8, 10));
            return (
              <motion.button key={cell.key} whileTap={{ scale: 0.95 }} type="button" onClick={() => setSelectedDay((value) => value === cell.day ? null : cell.day)} className={`relative flex aspect-square flex-col items-center justify-center rounded-xl border transition-colors ${selectedDay === cell.day ? 'border-arca-accent/50 bg-arca-accent/15 text-arca-accent' : isToday ? 'border-arca-accent bg-arca-accent text-black' : 'border-arca-border bg-arca-surface-2 text-arca-text-secondary'}`}>
                <span className="text-xs font-black">{cell.day}</span>
                {dayEvents.length ? <EventDots events={dayEvents} isToday={isToday && selectedDay !== cell.day} /> : null}
              </motion.button>
            );
          })}
        </div>
        <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 border-t border-arca-border pt-3">
          <Legend color="bg-arca-alert" label="Vencido" />
          <Legend color="bg-arca-accent" label="Pago" />
          <Legend color="bg-arca-positive" label="Ingreso" />
          <Legend color="bg-cyan-500" label="Cobro" />
        </div>
      </section>

      <section className="space-y-3">
        <div className="flex items-end justify-between px-1">
          <div>
            <p className="text-[9px] font-black uppercase tracking-[0.18em] text-arca-text-dim">{selectedDay ? `Día ${selectedDay}` : 'Prioridad del mes'}</p>
            <h2 className="mt-0.5 text-base font-black text-arca-text-primary">{selectedDay ? 'Movimientos del día' : 'Lo que necesita atención'}</h2>
          </div>
          {selectedDay || filter !== 'all' ? <button type="button" onClick={() => { setSelectedDay(null); setFilter('all'); }} className="text-[10px] font-black uppercase tracking-wider text-arca-accent">Limpiar</button> : null}
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none]">
          <FilterChip active={filter === 'all'} onClick={() => setFilter('all')}>Todo</FilterChip>
          <FilterChip active={filter === 'overdue'} onClick={() => setFilter('overdue')}>Vencidos</FilterChip>
          <FilterChip active={filter === 'payment'} onClick={() => setFilter('payment')}>Pagos</FilterChip>
          <FilterChip active={filter === 'income'} onClick={() => setFilter('income')}>Ingresos</FilterChip>
          <FilterChip active={filter === 'receivable'} onClick={() => setFilter('receivable')}>Cobros</FilterChip>
        </div>

        <div className="overflow-hidden rounded-[22px] border border-arca-border bg-arca-surface-1 divide-y divide-arca-border">
          {visibleEvents.length ? visibleEvents.map((event) => (
            <button key={`${event.kind}-${event.id}`} type="button" onClick={() => { haptics.medium(); setSelectedEvent(event); }} className="flex w-full items-center justify-between gap-3 p-4 text-left transition-colors hover:bg-arca-surface-2/70">
              <span className="flex min-w-0 items-center gap-3">
                <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${iconTone(event)}`}><CalendarDays size={17} /></span>
                <span className="min-w-0">
                  <span className="block truncate text-sm font-bold text-arca-text-primary">{event.title}</span>
                  <span className="mt-0.5 block truncate text-[10px] font-semibold text-arca-text-dim">{event.dateLabel}{accountLabel(event) ? ` · ${accountLabel(event)}` : ''}</span>
                </span>
              </span>
              <span className="shrink-0 text-right">
                <span className={`block text-sm font-black ${amountTone(event)}`}>{event.amountLabel}</span>
                <span className={`mt-1 inline-flex rounded-md px-2 py-1 text-[8px] font-black uppercase tracking-wider ${badgeTone(event)}`}>{actionLabel(event)}</span>
              </span>
            </button>
          )) : <div className="px-5 py-8 text-center"><CalendarDays className="mx-auto text-arca-text-dim" size={24} /><p className="mt-2 text-xs font-semibold text-arca-text-secondary">No hay movimientos con este filtro.</p></div>}
        </div>
        <button type="button" onClick={openNewEvent} className="flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-arca-accent/40 bg-arca-accent/[0.05] py-3.5 text-xs font-black text-arca-accent"><Plus size={16} /> Agregar compromiso</button>
      </section>

      <aside className="rounded-[22px] border border-arca-border bg-arca-surface-1 p-4">
        <div className="flex items-start gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-arca-accent/10 text-arca-accent"><Sparkles size={17} /></span>
          <div>
            <p className="text-xs font-black text-arca-text-primary">Nova puede organizar esta agenda</p>
            <p className="mt-1 text-[11px] leading-5 text-arca-text-secondary">Prioriza pagos, detecta semanas apretadas y te ayuda a decidir qué mover.</p>
            <button type="button" onClick={() => onOpenNova(`Revisa mi agenda financiera de ${currentMonth.label}. Tengo ${currentMonth.summary.overdueCount} compromisos vencidos y quiero organizar los pagos, ingresos y cobros más importantes.`)} className="mt-3 text-[10px] font-black uppercase tracking-wider text-arca-accent">Organizar con Nova →</button>
          </div>
        </div>
      </aside>

      <ObligationActionModal obligation={mappedObligation} accounts={accounts} onClose={() => setSelectedEvent(null)} onRefresh={() => router.refresh()} />
      <ReceivableActionModal receivable={mappedReceivable} accounts={accounts} onClose={() => setSelectedEvent(null)} onRefresh={() => router.refresh()} />
    </div>
  );
}

function SummaryMetric({ icon: Icon, label, value, tone }: { icon: typeof TrendingUp; label: string; value: string; tone: 'alert' | 'positive' }) {
  return <div className="rounded-2xl border border-arca-border bg-arca-surface-2/70 p-3"><div className={`flex items-center gap-1.5 text-[8px] font-black uppercase tracking-wider ${tone === 'alert' ? 'text-arca-alert' : 'text-arca-positive'}`}><Icon size={12} />{label}</div><p className="mt-2 truncate text-sm font-black text-arca-text-primary">{value}</p></div>;
}

function MonthButton({ children, disabled, label, onClick }: { children: React.ReactNode; disabled: boolean; label: string; onClick: () => void }) {
  return <button type="button" disabled={disabled} aria-label={label} onClick={onClick} className="rounded-xl p-2 text-arca-text-dim transition-colors hover:bg-arca-surface-2 hover:text-arca-accent disabled:cursor-not-allowed disabled:opacity-25">{children}</button>;
}

function EventDots({ events, isToday }: { events: CalendarEventItem[]; isToday: boolean }) {
  const colors = Array.from(new Set(events.map((event) => dotTone(event)))).slice(0, 3);
  return <span className="absolute bottom-1.5 flex gap-0.5">{colors.map((color) => <span key={color} className={`h-1 w-1 rounded-full ${isToday ? 'bg-black/70' : color}`} />)}</span>;
}

function Legend({ color, label }: { color: string; label: string }) {
  return <span className="flex items-center gap-1.5 text-[9px] font-semibold text-arca-text-dim"><span className={`h-1.5 w-1.5 rounded-full ${color}`} />{label}</span>;
}

function FilterChip({ active, children, onClick }: { active: boolean; children: React.ReactNode; onClick: () => void }) {
  return <button type="button" onClick={onClick} className={`shrink-0 rounded-full border px-3 py-2 text-[9px] font-black uppercase tracking-wider transition-colors ${active ? 'border-arca-accent/40 bg-arca-accent/15 text-arca-accent' : 'border-arca-border bg-arca-surface-1 text-arca-text-dim'}`}>{children}</button>;
}

function moneyFormatter(currency: string) {
  const safeCurrency = /^[A-Z]{3}$/.test(currency) ? currency : 'COP';
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: safeCurrency, maximumFractionDigits: 0 });
}

function signedMoney(value: number, formatter: Intl.NumberFormat) {
  if (!value) return formatter.format(0);
  return `${value > 0 ? '+' : '−'} ${formatter.format(Math.abs(value))}`;
}

function actionLabel(event: CalendarEventItem) {
  if (event.kind === 'income') return 'Recibir';
  if (event.kind === 'receivable') return 'Cobrar';
  return 'Pagar';
}

function dotTone(event: CalendarEventItem) {
  if (event.status === 'overdue') return 'bg-arca-alert';
  if (event.kind === 'income') return 'bg-arca-positive';
  if (event.kind === 'receivable') return 'bg-cyan-500';
  return 'bg-arca-accent';
}

function iconTone(event: CalendarEventItem) {
  if (event.status === 'overdue') return 'bg-arca-alert/10 text-arca-alert';
  if (event.kind === 'income') return 'bg-arca-positive/10 text-arca-positive';
  if (event.kind === 'receivable') return 'bg-cyan-500/10 text-cyan-500';
  return 'bg-arca-accent/10 text-arca-accent';
}

function amountTone(event: CalendarEventItem) {
  if (event.kind === 'income' || event.kind === 'receivable') return 'text-arca-positive';
  if (event.status === 'overdue') return 'text-arca-alert';
  return 'text-arca-text-primary';
}

function badgeTone(event: CalendarEventItem) {
  if (event.status === 'overdue') return 'bg-arca-alert/10 text-arca-alert';
  if (event.kind === 'income') return 'bg-arca-positive/10 text-arca-positive';
  if (event.kind === 'receivable') return 'bg-cyan-500/10 text-cyan-500';
  return 'bg-arca-accent/10 text-arca-accent';
}
