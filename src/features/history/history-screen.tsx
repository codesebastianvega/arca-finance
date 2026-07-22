'use client';

import { EditMovementModal } from "@/src/components/edit-movement-modal";

import { useMemo, useState, useTransition, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  ArrowRightLeft,
  CalendarDays,
  ChevronRight,
  Edit2,
  FileText,
  Filter,
  ReceiptText,
  Search,
  Sparkles,
  Trash2,
  TrendingDown,
  TrendingUp,
  X,
} from 'lucide-react';
import { deleteManualTransaction, updateManualTransaction, fetchPaginatedHistoryPage } from '@/app/actions';
import { haptics } from '@/src/lib/haptics';
import type { HistoryItem, HistoryViewModel } from '@/src/lib/history-types';
import { generateMonthlyReportPDF } from '@/src/lib/pdf';

type PeriodFilter = 'today' | '7days' | 'month' | 'previous' | 'custom' | 'all';
type KindFilter = 'all' | 'income' | 'expense' | 'transfer' | 'payment' | 'saving';

const PERIODS: Array<{ id: PeriodFilter; label: string }> = [
  { id: 'today', label: 'Hoy' },
  { id: '7days', label: '7 días' },
  { id: 'month', label: 'Este mes' },
  { id: 'previous', label: 'Mes anterior' },
  { id: 'custom', label: 'Personalizado' },
  { id: 'all', label: 'Todo' },
];

const KIND_OPTIONS: Array<{ id: KindFilter; label: string }> = [
  { id: 'all', label: 'Todos los tipos' },
  { id: 'income', label: 'Ingresos' },
  { id: 'expense', label: 'Gastos' },
  { id: 'transfer', label: 'Transferencias' },
  { id: 'payment', label: 'Pagos de obligaciones' },
  { id: 'saving', label: 'Ahorro' },
];

const CONTROL_CLASS = 'h-11 w-full rounded-xl border border-arca-border bg-arca-surface-2 px-3 text-sm text-arca-text-primary outline-none focus:border-arca-accent';

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5 text-left">
      <span className="text-[10px] font-bold uppercase tracking-wider text-arca-text-dim">{label}</span>
      {children}
    </label>
  );
}

export default function HistoryScreen({
  onBack,
  onOpenNova,
  data,
  currency,
}: {
  onBack: () => void;
  onOpenNova: (prompt?: string) => void;
  data: HistoryViewModel;
  currency: string;
}) {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [period, setPeriod] = useState<PeriodFilter>('month');
  const [kind, setKind] = useState<KindFilter>('all');
  const [accountId, setAccountId] = useState('all');
  const [category, setCategory] = useState('all');
  const [unit, setUnit] = useState('all');
  const [minimumAmount, setMinimumAmount] = useState('');
  const [maximumAmount, setMaximumAmount] = useState('');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [activeItem, setActiveItem] = useState<HistoryItem | null>(null);
  const [editingItem, setEditingItem] = useState<HistoryItem | null>(null);
  const [visibleCount, setVisibleCount] = useState(40);
  const [isPending, startTransition] = useTransition();

  const [historyItems, setHistoryItems] = useState<HistoryItem[]>(data.items);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMoreServerItems, setHasMoreServerItems] = useState(true);

  const handleLoadMore = async () => {
    if (isLoadingMore || !hasMoreServerItems) return;
    haptics.light();
    setIsLoadingMore(true);
    try {
      const res = await fetchPaginatedHistoryPage({
        offset: historyItems.length,
        limit: 50,
      });
      if (res.items.length > 0) {
        setHistoryItems((prev) => {
          const existingIds = new Set(prev.map((i) => i.id));
          const newUnique = (res.items as HistoryItem[]).filter((i) => !existingIds.has(i.id));
          return [...prev, ...newUnique];
        });
      }
      setHasMoreServerItems(res.hasMore);
      setVisibleCount((count) => count + res.items.length);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoadingMore(false);
    }
  };

  const categories = useMemo(
    () => Array.from(new Set(historyItems.map((item) => item.category).filter(Boolean))).sort((a, b) => a.localeCompare(b, 'es')),
    [historyItems],
  );
  const units = useMemo(
    () => Array.from(new Set(historyItems.map((item) => item.unit).filter(Boolean))).sort((a, b) => a.localeCompare(b, 'es')),
    [historyItems],
  );

  const filteredHistory = useMemo(() => {
    const bounds = periodBounds(period, customStart, customEnd);
    const normalizedSearch = search.trim().toLocaleLowerCase('es-CO');
    const minimum = Number(minimumAmount || 0);
    const maximum = maximumAmount ? Number(maximumAmount) : Number.POSITIVE_INFINITY;

    return historyItems.filter((item) => {
      const searchable = `${item.concept} ${item.category} ${item.unit} ${item.accountName ?? ''}`.toLocaleLowerCase('es-CO');
      const matchesSearch = !normalizedSearch || searchable.includes(normalizedSearch);
      const matchesPeriod = (!bounds.start || item.dateInputValue >= bounds.start) && (!bounds.end || item.dateInputValue <= bounds.end);
      const matchesKind = kind === 'all' || movementGroup(item.kind) === kind;
      const matchesAccount = accountId === 'all' || item.accountId === accountId;
      const matchesCategory = category === 'all' || item.category === category;
      const matchesUnit = unit === 'all' || item.unit === unit;
      const matchesAmount = item.amount >= minimum && item.amount <= maximum;
      return matchesSearch && matchesPeriod && matchesKind && matchesAccount && matchesCategory && matchesUnit && matchesAmount;
    });
  }, [accountId, category, customEnd, customStart, historyItems, kind, maximumAmount, minimumAmount, period, search, unit]);

  const totals = useMemo(() => filteredHistory.reduce(
    (summary, item) => {
      if (isPositiveKind(item.kind)) summary.income += item.amount;
      else summary.expenses += item.amount;
      return summary;
    },
    { income: 0, expenses: 0 },
  ), [filteredHistory]);
  const net = totals.income - totals.expenses;
  const visibleItems = filteredHistory.slice(0, visibleCount);
  const groupedHistory = useMemo(() => groupByDate(visibleItems), [visibleItems]);
  const activeAdvancedFilters = [kind !== 'all', accountId !== 'all', category !== 'all', unit !== 'all', Boolean(minimumAmount), Boolean(maximumAmount)].filter(Boolean).length;
  const novaContext = [
    `Periodo: ${periodLabel(period)}`,
    kind !== 'all' ? `tipo: ${KIND_OPTIONS.find((option) => option.id === kind)?.label}` : null,
    accountId !== 'all' ? `cuenta: ${data.accountOptions.find((option) => option.id === accountId)?.label}` : null,
    category !== 'all' ? `categoria: ${category}` : null,
    unit !== 'all' ? `unidad: ${unit}` : null,
    search.trim() ? `busqueda: ${search.trim()}` : null,
  ].filter(Boolean).join('. ');

  const clearAdvancedFilters = () => {
    setKind('all');
    setAccountId('all');
    setCategory('all');
    setUnit('all');
    setMinimumAmount('');
    setMaximumAmount('');
    setVisibleCount(40);
  };

  const handleDelete = (item: HistoryItem) => {
    startTransition(async () => {
      await deleteManualTransaction(item.id);
      setActiveItem(null);
      router.refresh();
    });
  };

  const handleExportPDF = () => {
    const exportRows = filteredHistory.map((item) => ({
      date: item.dateLabel,
      name: item.concept,
      category: item.category,
      method: item.method,
      amount: signedMoney(item, currency),
    }));
    generateMonthlyReportPDF(exportRows);
  };

  return (
    <div className="relative space-y-5 pb-6">
      <header className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <button type="button" onClick={onBack} aria-label="Volver" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-arca-border bg-arca-surface-1 text-arca-text-dim">
            <ArrowLeft size={19} />
          </button>
          <div className="min-w-0">
            <p className="text-[9px] font-black uppercase tracking-[0.18em] text-arca-accent">Registro financiero</p>
            <h1 className="truncate text-xl font-black text-arca-text-primary">Movimientos</h1>
          </div>
        </div>
        <button type="button" onClick={handleExportPDF} disabled={!filteredHistory.length} className="flex h-10 shrink-0 items-center gap-2 rounded-xl bg-arca-accent/10 px-3 text-[9px] font-black uppercase tracking-wider text-arca-accent disabled:opacity-40">
          <FileText size={14} /> Exportar
        </button>
      </header>

      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-arca-text-dim" />
          <input
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setVisibleCount(40);
            }}
            placeholder="Buscar concepto, categoría o cuenta..."
            className="h-11 w-full rounded-xl border border-arca-border bg-arca-surface-2 pl-10 pr-4 text-xs font-medium text-arca-text-primary outline-none focus:border-arca-accent"
          />
        </div>
        <button
          type="button"
          onClick={() => setShowFilters(true)}
          className={`relative flex h-11 w-11 items-center justify-center rounded-xl border ${activeAdvancedFilters ? 'border-arca-accent/30 bg-arca-accent/10 text-arca-accent' : 'border-arca-border bg-arca-surface-2 text-arca-text-dim'}`}
          aria-label="Abrir filtros avanzados"
        >
          <Filter size={18} />
          {activeAdvancedFilters ? <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-arca-accent px-1 text-[8px] font-black text-black">{activeAdvancedFilters}</span> : null}
        </button>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none]" aria-label="Filtro de tiempo">
        {PERIODS.map((option) => (
          <button
            type="button"
            key={option.id}
            onClick={() => {
              setPeriod(option.id);
              setVisibleCount(40);
              if (option.id === 'custom') setShowFilters(true);
            }}
            className={`shrink-0 rounded-full border px-3.5 py-2 text-[9px] font-black uppercase tracking-wider ${period === option.id ? 'border-arca-accent/40 bg-arca-accent/15 text-arca-accent' : 'border-arca-border bg-arca-surface-1 text-arca-text-dim'}`}
          >
            {option.label}
          </button>
        ))}
      </div>

      <section className="overflow-hidden rounded-[24px] border border-arca-border-strong bg-arca-surface-1">
        <div className="flex items-center justify-between gap-4 px-5 pb-3 pt-4">
          <div>
            <p className="text-[9px] font-black uppercase tracking-[0.16em] text-arca-text-dim">{periodLabel(period)}</p>
            <p className={`mt-1 text-2xl font-black ${net >= 0 ? 'text-arca-text-primary' : 'text-arca-alert'}`}>{signedNumber(net, currency)}</p>
            <p className="mt-1 text-[9px] text-arca-text-secondary">Balance de {filteredHistory.length} {filteredHistory.length === 1 ? 'movimiento' : 'movimientos'}</p>
          </div>
          <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${net >= 0 ? 'bg-arca-positive/10 text-arca-positive' : 'bg-arca-alert/10 text-arca-alert'}`}>
            {net >= 0 ? <TrendingUp size={20} /> : <TrendingDown size={20} />}
          </span>
        </div>
        <div className="grid grid-cols-2 divide-x divide-arca-border border-t border-arca-border bg-arca-surface-2/40 px-5 py-3">
          <SummaryValue label="Entradas" value={money(totals.income, currency)} tone="positive" />
          <SummaryValue label="Salidas" value={money(totals.expenses, currency)} tone="alert" align="right" />
        </div>
      </section>

      <aside className="rounded-[22px] border border-arca-accent/25 bg-arca-accent/[0.06] p-4">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-arca-accent/20 bg-arca-accent/10 text-arca-accent">
            <Sparkles size={18} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[9px] font-black uppercase tracking-[0.16em] text-arca-accent">Nova · análisis contextual</p>
            <h2 className="mt-1 text-sm font-black text-arca-text-primary">¿Quieres entender estos movimientos?</h2>
            <p className="mt-1 text-[11px] leading-relaxed text-arca-text-secondary">Puede buscar duplicados, gastos inusuales y oportunidades de ajuste usando el período y los filtros seleccionados.</p>
            <button
              type="button"
              onClick={() => onOpenNova(`Analiza mis movimientos con este contexto. ${novaContext}. Hay ${filteredHistory.length} movimientos, entradas por ${money(totals.income, currency)}, salidas por ${money(totals.expenses, currency)} y un balance de ${signedNumber(net, currency)}. Identifica duplicados, gastos inusuales, patrones relevantes y dame recomendaciones concretas.`)}
              className="mt-3 inline-flex h-10 items-center gap-2 rounded-xl bg-arca-accent px-4 text-[10px] font-black uppercase tracking-wider text-black"
            >
              <Sparkles size={14} />
              Analizar con Nova
            </button>
          </div>
        </div>
      </aside>

      <div className="space-y-5">
        {groupedHistory.length ? groupedHistory.map((group) => (
          <section key={group.date}>
            <div className="mb-2 flex items-center justify-between gap-3 px-1">
              <h2 className="text-[10px] font-black uppercase tracking-[0.16em] text-arca-text-dim">{dateGroupLabel(group.date)}</h2>
              <span className={`text-[10px] font-black ${group.balance >= 0 ? 'text-arca-positive' : 'text-arca-alert'}`}>{signedNumber(group.balance, currency)}</span>
            </div>
            <div className="overflow-hidden rounded-[22px] border border-arca-border bg-arca-surface-1 divide-y divide-arca-border">
              {group.items.map((item) => (
                <motion.button
                  type="button"
                  key={item.id}
                  whileTap={{ scale: 0.99 }}
                  onClick={() => setActiveItem(item)}
                  className="flex w-full items-center justify-between gap-3 p-4 text-left"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-[9px] font-black uppercase ${kindTone(item.kind)}`}>{kindCode(item.kind)}</span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-black text-arca-text-primary">{movementTitle(item)}</p>
                      <p className="mt-1 truncate text-[9px] text-arca-text-secondary">{movementSubtitle(item)}</p>
                      {item.unit && item.unit.toLowerCase() !== 'general' ? <p className="mt-1 truncate text-[8px] font-bold uppercase tracking-wider text-arca-accent">{item.unit}</p> : null}
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <p className={`text-sm font-black ${isPositiveKind(item.kind) ? 'text-arca-positive' : 'text-arca-alert'}`}>{signedMoney(item, currency)}</p>
                    <ChevronRight size={15} className="text-arca-text-dim" />
                  </div>
                </motion.button>
              ))}
            </div>
          </section>
        )) : (
          <section className="rounded-[24px] border border-arca-border bg-arca-surface-1 p-6 text-center">
            <ReceiptText size={24} className="mx-auto text-arca-text-dim" />
            <p className="mt-3 font-black text-arca-text-primary">No encontramos movimientos</p>
            <p className="mt-1 text-xs text-arca-text-secondary">Prueba otro periodo o limpia los filtros avanzados.</p>
            {activeAdvancedFilters ? <button type="button" onClick={clearAdvancedFilters} className="mt-4 text-[10px] font-black uppercase tracking-wider text-arca-accent">Limpiar filtros</button> : null}
          </section>
        )}
      </div>

      {hasMoreServerItems || visibleCount < filteredHistory.length ? (
        <button
          type="button"
          disabled={isLoadingMore}
          onClick={handleLoadMore}
          className="h-12 w-full rounded-2xl border border-arca-border bg-arca-surface-1 text-xs font-black text-arca-text-primary transition-all hover:bg-arca-surface-2 active:scale-[0.99] disabled:opacity-50"
        >
          {isLoadingMore ? "Cargando más movimientos..." : `Cargar más movimientos (${filteredHistory.length} visibles)`}
        </button>
      ) : null}

      <AnimatePresence>
        {showFilters ? (
          <FilterSheet
            period={period}
            kind={kind}
            accountId={accountId}
            category={category}
            unit={unit}
            minimumAmount={minimumAmount}
            maximumAmount={maximumAmount}
            customStart={customStart}
            customEnd={customEnd}
            accountOptions={data.accountOptions}
            categories={categories}
            units={units}
            onClose={() => setShowFilters(false)}
            onClear={clearAdvancedFilters}
            onKindChange={setKind}
            onAccountChange={setAccountId}
            onCategoryChange={setCategory}
            onUnitChange={setUnit}
            onMinimumChange={setMinimumAmount}
            onMaximumChange={setMaximumAmount}
            onCustomStartChange={setCustomStart}
            onCustomEndChange={setCustomEnd}
          />
        ) : null}
      </AnimatePresence>

      <AnimatePresence>
        {activeItem ? (
          <MovementDetail
            item={activeItem}
            currency={currency}
            isPending={isPending}
            onClose={() => setActiveItem(null)}
            onEdit={() => {
              setEditingItem(activeItem);
              setActiveItem(null);
            }}
            onDelete={() => handleDelete(activeItem)}
          />
        ) : null}
      </AnimatePresence>

      <AnimatePresence>
        {editingItem ? <EditMovementModal accountOptions={data.accountOptions} item={editingItem} onClose={() => setEditingItem(null)} /> : null}
      </AnimatePresence>
    </div>
  );
}

function FilterSheet({
  period,
  kind,
  accountId,
  category,
  unit,
  minimumAmount,
  maximumAmount,
  customStart,
  customEnd,
  accountOptions,
  categories,
  units,
  onClose,
  onClear,
  onKindChange,
  onAccountChange,
  onCategoryChange,
  onUnitChange,
  onMinimumChange,
  onMaximumChange,
  onCustomStartChange,
  onCustomEndChange,
}: {
  period: PeriodFilter;
  kind: KindFilter;
  accountId: string;
  category: string;
  unit: string;
  minimumAmount: string;
  maximumAmount: string;
  customStart: string;
  customEnd: string;
  accountOptions: HistoryViewModel['accountOptions'];
  categories: string[];
  units: string[];
  onClose: () => void;
  onClear: () => void;
  onKindChange: (value: KindFilter) => void;
  onAccountChange: (value: string) => void;
  onCategoryChange: (value: string) => void;
  onUnitChange: (value: string) => void;
  onMinimumChange: (value: string) => void;
  onMaximumChange: (value: string) => void;
  onCustomStartChange: (value: string) => void;
  onCustomEndChange: (value: string) => void;
}) {
  return (
    <div className="fixed inset-0 z-[650] flex items-end justify-center">
      <motion.button type="button" aria-label="Cerrar filtros" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="absolute inset-0 bg-black/65 backdrop-blur-sm" />
      <motion.section initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', damping: 26, stiffness: 290 }} className="relative max-h-[90dvh] w-full max-w-lg overflow-y-auto rounded-t-[32px] border-t border-arca-border-strong bg-arca-surface-1 p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
        <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-arca-border" />
        <div className="flex items-start justify-between gap-4">
          <div><p className="text-[9px] font-black uppercase tracking-[0.18em] text-arca-accent">Refina la lista</p><h2 className="mt-1 text-xl font-black text-arca-text-primary">Filtros avanzados</h2></div>
          <button type="button" onClick={onClose} aria-label="Cerrar" className="flex h-10 w-10 items-center justify-center rounded-full border border-arca-border text-arca-text-secondary"><X size={18} /></button>
        </div>

        <div className="mt-5 grid gap-4">
          {period === 'custom' ? (
            <div className="grid grid-cols-2 gap-3">
              <Field label="Desde"><input type="date" value={customStart} onChange={(event) => onCustomStartChange(event.target.value)} className={CONTROL_CLASS} /></Field>
              <Field label="Hasta"><input type="date" value={customEnd} onChange={(event) => onCustomEndChange(event.target.value)} className={CONTROL_CLASS} /></Field>
            </div>
          ) : null}
          <Field label="Tipo de movimiento">
            <select value={kind} onChange={(event) => onKindChange(event.target.value as KindFilter)} className={CONTROL_CLASS}>
              {KIND_OPTIONS.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}
            </select>
          </Field>
          <Field label="Cuenta o banco"><select value={accountId} onChange={(event) => onAccountChange(event.target.value)} className={CONTROL_CLASS}><option value="all">Todas las cuentas</option>{accountOptions.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}</select></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Categoría"><select value={category} onChange={(event) => onCategoryChange(event.target.value)} className={CONTROL_CLASS}><option value="all">Todas</option>{categories.map((option) => <option key={option} value={option}>{option}</option>)}</select></Field>
            <Field label="Unidad"><select value={unit} onChange={(event) => onUnitChange(event.target.value)} className={CONTROL_CLASS}><option value="all">Todas</option>{units.map((option) => <option key={option} value={option}>{option}</option>)}</select></Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Monto mínimo"><input type="number" min="0" value={minimumAmount} onChange={(event) => onMinimumChange(event.target.value)} placeholder="$ 0" className={CONTROL_CLASS} /></Field>
            <Field label="Monto máximo"><input type="number" min="0" value={maximumAmount} onChange={(event) => onMaximumChange(event.target.value)} placeholder="Sin límite" className={CONTROL_CLASS} /></Field>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-[1fr_1.4fr] gap-3">
          <button type="button" onClick={onClear} className="h-12 rounded-2xl border border-arca-border text-xs font-black text-arca-text-secondary">Limpiar</button>
          <button type="button" onClick={onClose} className="h-12 rounded-2xl bg-arca-accent text-xs font-black text-black">Ver resultados</button>
        </div>
      </motion.section>
    </div>
  );
}

function MovementDetail({ item, currency, isPending, onClose, onEdit, onDelete }: { item: HistoryItem; currency: string; isPending: boolean; onClose: () => void; onEdit: () => void; onDelete: () => void }) {
  return (
    <div className="fixed inset-0 z-[620] flex items-end justify-center">
      <motion.button type="button" aria-label="Cerrar detalle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="absolute inset-0 bg-black/65 backdrop-blur-sm" />
      <motion.section initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', damping: 26, stiffness: 290 }} className="relative w-full max-w-lg rounded-t-[32px] border-t border-arca-border-strong bg-arca-surface-1 p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
        <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-arca-border" />
        <div className="flex items-start justify-between gap-4"><div><p className="text-[9px] font-black uppercase tracking-[0.18em] text-arca-accent">Detalle del movimiento</p><h2 className="mt-1 text-xl font-black text-arca-text-primary">{item.concept}</h2></div><button type="button" onClick={onClose} aria-label="Cerrar" className="flex h-10 w-10 items-center justify-center rounded-full border border-arca-border text-arca-text-secondary"><X size={18} /></button></div>
        <p className={`mt-5 text-3xl font-black ${isPositiveKind(item.kind) ? 'text-arca-positive' : 'text-arca-alert'}`}>{signedMoney(item, currency)}</p>
        <div className="mt-5 divide-y divide-arca-border rounded-2xl border border-arca-border bg-arca-surface-2/50 px-4">
          <ReceiptRow label="Fecha" value={item.dateLabel} />
          <ReceiptRow label="Cuenta" value={item.accountName ?? 'Sin cuenta'} />
          <ReceiptRow label="Categoría" value={item.category} />
          <ReceiptRow label="Unidad" value={item.unit} />
          <ReceiptRow label="Tipo" value={movementTypeLabel(item.kind)} />
        </div>
        <div className="mt-5 flex gap-3">
          <button type="button" onClick={onEdit} className="flex h-12 flex-1 items-center justify-center gap-2 rounded-2xl bg-arca-accent font-black text-black"><Edit2 size={16} /> Editar</button>
          <button type="button" onClick={onDelete} disabled={isPending} aria-label="Eliminar movimiento" className="flex h-12 w-12 items-center justify-center rounded-2xl border border-arca-alert/25 bg-arca-alert/10 text-arca-alert disabled:opacity-40"><Trash2 size={17} /></button>
        </div>
      </motion.section>
    </div>
  );
}

function SummaryValue({ label, value, tone, align = 'left' }: { label: string; value: string; tone: 'positive' | 'alert'; align?: 'left' | 'right' }) {
  return <div className={align === 'right' ? 'text-right' : ''}><p className="text-[8px] font-black uppercase tracking-wider text-arca-text-dim">{label}</p><p className={`mt-1 text-sm font-black ${tone === 'positive' ? 'text-arca-positive' : 'text-arca-alert'}`}>{value}</p></div>;
}

function ReceiptRow({ label, value }: { label: string; value: string }) {
  return <div className="flex items-center justify-between gap-4 py-3"><span className="text-[9px] font-black uppercase tracking-wider text-arca-text-dim">{label}</span><span className="text-right text-xs font-bold text-arca-text-primary">{value}</span></div>;
}

function money(value: number, currency: string) {
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: /^[A-Z]{3}$/.test(currency) ? currency : 'COP', maximumFractionDigits: 0 }).format(Math.abs(value));
}

function isPositiveKind(kind: string) {
  return kind === 'income' || kind === 'transfer_in';
}

function signedMoney(item: HistoryItem, currency: string) {
  return `${isPositiveKind(item.kind) ? '+' : '-'}${money(item.amount, currency)}`;
}

function signedNumber(value: number, currency: string) {
  return `${value >= 0 ? '+' : '-'}${money(value, currency)}`;
}

function movementGroup(kind: string): KindFilter {
  if (kind === 'income') return 'income';
  if (kind === 'transfer_in' || kind === 'transfer_out') return 'transfer';
  if (['debt_payment', 'card_payment', 'loan_payment'].includes(kind)) return 'payment';
  if (['saving', 'saving_contribution'].includes(kind)) return 'saving';
  return 'expense';
}

function movementTypeLabel(kind: string) {
  const group = movementGroup(kind);
  if (group === 'income') return 'Ingreso';
  if (group === 'transfer') return kind === 'transfer_in' ? 'Transferencia recibida' : 'Transferencia enviada';
  if (group === 'payment') return 'Pago de obligación';
  if (group === 'saving') return 'Ahorro';
  return 'Gasto';
}

function movementTitle(item: HistoryItem) {
  if (item.kind === 'transfer_in') return item.concept || 'Transferencia recibida';
  if (item.kind === 'transfer_out') return item.concept || 'Transferencia enviada';
  return item.concept;
}

function movementSubtitle(item: HistoryItem) {
  if (item.kind === 'transfer_in') return `Recibido en ${item.accountName ?? 'cuenta sin identificar'}`;
  if (item.kind === 'transfer_out') return `Enviado desde ${item.accountName ?? 'cuenta sin identificar'}`;
  return `${item.category || 'Sin categoría'} · ${item.accountName ?? 'Sin cuenta'}`;
}

function kindCode(kind: string) {
  const group = movementGroup(kind);
  if (group === 'income') return 'IN';
  if (group === 'transfer') return 'TR';
  if (group === 'payment') return 'PG';
  if (group === 'saving') return 'AH';
  return 'GA';
}

function kindTone(kind: string) {
  if (isPositiveKind(kind)) return 'bg-arca-positive/10 text-arca-positive';
  if (movementGroup(kind) === 'transfer') return 'bg-arca-accent/10 text-arca-accent';
  return 'bg-arca-alert/10 text-arca-alert';
}

function todayBogota() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Bogota', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
}

function shiftDate(dateKey: string, days: number) {
  const date = new Date(`${dateKey}T12:00:00-05:00`);
  date.setDate(date.getDate() + days);
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Bogota', year: 'numeric', month: '2-digit', day: '2-digit' }).format(date);
}

function periodBounds(period: PeriodFilter, customStart: string, customEnd: string) {
  const today = todayBogota();
  if (period === 'today') return { start: today, end: today };
  if (period === '7days') return { start: shiftDate(today, -6), end: today };
  if (period === 'month') return { start: `${today.slice(0, 7)}-01`, end: today };
  if (period === 'previous') {
    const currentStart = new Date(`${today.slice(0, 7)}-01T12:00:00-05:00`);
    currentStart.setMonth(currentStart.getMonth() - 1);
    const start = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Bogota', year: 'numeric', month: '2-digit' }).format(currentStart) + '-01';
    return { start, end: shiftDate(`${today.slice(0, 7)}-01`, -1) };
  }
  if (period === 'custom') return { start: customStart, end: customEnd };
  return { start: '', end: '' };
}

function periodLabel(period: PeriodFilter) {
  return PERIODS.find((option) => option.id === period)?.label ?? 'Periodo';
}

function groupByDate(items: HistoryItem[]) {
  const groups = new Map<string, HistoryItem[]>();
  for (const item of items) groups.set(item.dateInputValue, [...(groups.get(item.dateInputValue) ?? []), item]);
  return Array.from(groups.entries()).map(([date, groupItems]) => ({
    date,
    items: groupItems,
    balance: groupItems.reduce((sum, item) => sum + (isPositiveKind(item.kind) ? item.amount : -item.amount), 0),
  }));
}

function dateGroupLabel(date: string) {
  const today = todayBogota();
  if (date === today) return 'Hoy';
  if (date === shiftDate(today, -1)) return 'Ayer';
  return new Intl.DateTimeFormat('es-CO', { timeZone: 'America/Bogota', weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(`${date}T12:00:00-05:00`));
}
