'use client';

import { useMemo, useState, useTransition, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowLeft, ArrowRight, Briefcase, CalendarClock, CalendarRange, Check, ChevronLeft, ChevronRight, Clock, Edit2, Plus, Sparkles, TrendingDown, TrendingUp, Users, X } from 'lucide-react';
import {
  createBusinessUnit,
  createIncomeSource,
  updateBusinessUnit,
  updateIncomeSource,
  confirmScheduledEventNow,
  cancelScheduledEvent,
} from '@/app/actions';
import type { BusinessActiveItem, BusinessSource, BusinessTransaction, BusinessUnitSummary, BusinessViewModel } from '@/src/lib/business-types';
import { haptics } from '@/src/lib/haptics';

type EditorMode =
  | { type: 'unit'; id?: string; name: string; key: string }
  | { type: 'source'; id?: string; name: string; unitKey: string; defaultAccountId: string };

export default function BusinessScreen({
  onBack,
  onOpenReceivables,
  onOpenNova,
  data,
  currency,
}: {
  onBack: () => void;
  onOpenReceivables: () => void;
  onOpenNova: (prompt?: string) => void;
  data: BusinessViewModel;
  currency: string;
}) {
  const router = useRouter();
  const [editor, setEditor] = useState<EditorMode | null>(null);
  const [selectedDetailUnit, setSelectedDetailUnit] = useState<BusinessUnitSummary | null>(null);
  const [selectedSource, setSelectedSource] = useState<BusinessSource | null>(null);
  const [invoiceAction, setInvoiceAction] = useState<BusinessActiveItem | null>(null);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [actionError, setActionError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const formatMoney = useMemo(() => moneyFormatter(currency), [currency]);
  const maxUnitResult = Math.max(...data.units.map((unit) => Math.max(unit.net, 0)), 1);
  const overdueItems = data.activeItems.filter((item) => item.status === 'overdue');

  const unitOptions = useMemo(
    () => data.units.map((unit) => ({ key: unit.key, name: unit.name })),
    [data.units]
  );
  
  const canCreateSource = unitOptions.length > 0 && data.accountOptions.length > 0;

  const openNewUnit = () => {
    haptics.light();
    setActionError(null);
    setEditor({ type: 'unit', name: '', key: '' });
  };

  const openEditUnit = (unit: BusinessUnitSummary) => {
    haptics.light();
    setActionError(null);
    setEditor({ type: 'unit', id: unit.id, name: unit.name, key: unit.key });
  };

  const openNewSourceForUnit = (unitKey: string) => {
    if (!canCreateSource) return;
    haptics.light();
    setActionError(null);
    setEditor({
      type: 'source',
      name: '',
      unitKey: unitKey,
      defaultAccountId: data.accountOptions[0]?.id ?? '',
    });
  };

  const openEditSource = (source: BusinessSource) => {
    haptics.light();
    setActionError(null);
    setEditor({
      type: 'source',
      id: source.id,
      name: source.name,
      unitKey: source.unitKey,
      defaultAccountId: source.defaultAccountId ?? data.accountOptions[0]?.id ?? '',
    });
  };

  const closeEditor = () => {
    setEditor(null);
    setActionError(null);
  };

  const saveEditor = () => {
    if (!editor) return;
    setActionError(null);
    startTransition(async () => {
      try {
        if (editor.type === 'unit') {
          if (editor.id) {
            await updateBusinessUnit({ id: editor.id, name: editor.name, key: editor.key || editor.name });
          } else {
            await createBusinessUnit({ name: editor.name, key: editor.name });
          }
        } else {
          if (editor.id) {
            await updateIncomeSource({
              id: editor.id,
              name: editor.name,
              businessUnitKey: editor.unitKey,
              defaultAccountId: editor.defaultAccountId,
            });
          } else {
            await createIncomeSource({
              name: editor.name,
              businessUnitKey: editor.unitKey,
              defaultAccountId: editor.defaultAccountId,
            });
          }
        }

        haptics.success();
        closeEditor();
        router.refresh();
        // If we updated a unit we are viewing, refresh it in state
        if (selectedDetailUnit && editor.type === 'unit' && editor.id === selectedDetailUnit.id) {
          setSelectedDetailUnit(null); // Simple reload trigger
        }
      } catch (error) {
        setActionError(error instanceof Error ? error.message : 'No se pudo guardar.');
        haptics.error();
      }
    });
  };

  return (
    <div className="space-y-5 pb-4">
      <header className="flex items-center gap-4">
        <button type="button" onClick={onBack} aria-label="Volver" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-arca-border bg-arca-surface-1 text-arca-text-secondary">
          <ArrowLeft size={20} />
        </button>
        <div>
          <p className="text-[9px] font-black uppercase tracking-[0.2em] text-arca-accent">Proyectos y actividades</p>
          <h1 className="text-xl font-black tracking-[-0.03em] text-arca-text-primary">Tu trabajo separado</h1>
        </div>
      </header>

      <section className="relative overflow-hidden rounded-[26px] border border-arca-border-strong bg-arca-surface-1 p-5">
        <div className="absolute -right-12 -top-16 h-40 w-40 rounded-full bg-arca-positive/10 blur-3xl" />
        <div className="relative">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[9px] font-black uppercase tracking-[0.18em] text-arca-text-dim">Resultado operativo del mes</p>
              <p className={`mt-2 text-3xl font-black tracking-[-0.05em] ${data.totals.net >= 0 ? 'text-arca-text-primary' : 'text-arca-alert'}`}>
                {formatMoney.format(data.totals.net)}
              </p>
              <p className="mt-2 text-[10px] leading-4 text-arca-text-secondary">Ingresos cobrados menos gastos reales de tus proyectos.</p>
            </div>
            <span className={`rounded-full px-3 py-1.5 text-[9px] font-black uppercase tracking-wider ${data.totals.net >= 0 ? 'bg-arca-positive/10 text-arca-positive' : 'bg-arca-alert/10 text-arca-alert'}`}>
              {data.totals.net >= 0 ? 'Positivo' : 'Negativo'}
            </span>
          </div>
          <div className="mt-5 grid grid-cols-3 divide-x divide-arca-border border-t border-arca-border pt-4">
            <PortfolioMetric label="Cobrado" value={formatMoney.format(data.totals.realIncome)} tone="positive" />
            <PortfolioMetric label="Gastos" value={formatMoney.format(data.totals.realExpense)} tone="alert" align="center" />
            <PortfolioMetric label="Por cobrar" value={formatMoney.format(data.totals.expectedIncome)} tone="accent" align="right" />
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-arca-text-primary">Portafolio</p>
            <p className="mt-1 text-[10px] text-arca-text-secondary">Qué está produciendo cada proyecto este mes.</p>
          </div>
          <button type="button" onClick={openNewUnit} aria-label="Crear proyecto o actividad" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-arca-accent/10 text-arca-accent">
            <Plus size={16} />
          </button>
        </div>
        <div className="space-y-3">
          {data.units.length > 0 ? (
            data.units.map((unit) => (
              <button
                key={unit.id}
                onClick={() => {
                  haptics.light();
                  setSelectedDetailUnit(unit);
                }}
                className="w-full rounded-[22px] border border-arca-border bg-arca-surface-1 p-4 text-left transition-colors hover:border-arca-accent/40"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-sm font-black text-arca-text-primary">{unit.name}</p>
                      <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${unit.realIncome > 0 || unit.realExpense > 0 ? 'bg-arca-positive' : 'bg-arca-text-dim'}`} />
                    </div>
                    <p className="mt-1 text-[9px] uppercase tracking-wider text-arca-text-dim">
                      {unit.realIncome > 0 || unit.realExpense > 0 ? 'Con actividad este mes' : 'Sin actividad este mes'}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2 text-right">
                    <div>
                      <p className={`text-sm font-black ${unit.net >= 0 ? 'text-arca-text-primary' : 'text-arca-alert'}`}>{formatMoney.format(unit.net)}</p>
                      <p className="mt-1 text-[8px] uppercase tracking-wider text-arca-text-dim">Resultado</p>
                    </div>
                    <ChevronRight size={16} className="text-arca-text-dim shrink-0" />
                  </div>
                </div>
                <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-arca-surface-2">
                  <div className={`h-full rounded-full ${unit.net >= 0 ? 'bg-arca-positive' : 'bg-arca-alert'}`} style={{ width: `${Math.max(unit.net > 0 ? (unit.net / maxUnitResult) * 100 : unit.realExpense > 0 ? 8 : 0, 0)}%` }} />
                </div>
                <div className="mt-3 grid grid-cols-3 gap-2">
                  <UnitMetric label="Cobrado" value={formatMoney.format(unit.realIncome)} tone="positive" />
                  <UnitMetric label="Gastos" value={formatMoney.format(unit.realExpense)} tone="neutral" />
                  <UnitMetric label="Pendiente" value={formatMoney.format(unit.expectedIncome)} tone="accent" align="right" />
                </div>
              </button>
            ))
          ) : (
            <div className="rounded-[22px] border border-dashed border-arca-border p-5 text-center">
              <p className="text-sm font-bold text-arca-text-primary">Todo está en Personal</p>
              <p className="mt-1 text-xs leading-5 text-arca-text-dim">Crea un proyecto solo si quieres separar un negocio, cliente o actividad.</p>
            </div>
          )}
        </div>
      </section>

      <section className="space-y-3">
        <div className="flex items-end justify-between gap-4 px-1">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-arca-text-primary">Próximos cobros</p>
            <p className={`mt-1 text-[10px] ${overdueItems.length ? 'text-arca-alert' : 'text-arca-text-secondary'}`}>
              {overdueItems.length ? `${overdueItems.length} ${overdueItems.length === 1 ? 'cobro vencido' : 'cobros vencidos'}` : 'Todo al día'}
            </p>
          </div>
          {data.activeItems.length ? (
            <button type="button" onClick={onOpenReceivables} className="flex items-center gap-1 text-[10px] font-black uppercase tracking-wider text-arca-accent">
              Ver todos <ChevronRight size={13} />
            </button>
          ) : null}
        </div>
        {data.activeItems.length > 0 ? (
          data.activeItems.slice(0, 3).map((item) => (
            <button key={item.id} type="button" onClick={() => { haptics.light(); setInvoiceAction(item); }} className="w-full text-left">
              <InvoiceRow item={item} formatMoney={formatMoney.format} />
            </button>
          ))
        ) : (
          <div className="card-arca p-4 text-xs text-arca-text-dim text-center">No hay cobros pendientes abiertos para este mes.</div>
        )}
      </section>

      <aside className="rounded-[22px] border border-arca-accent/20 bg-arca-accent/[0.05] p-4">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-arca-accent/10 text-arca-accent"><Sparkles size={18} /></span>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-arca-accent">Nova analiza tu portafolio</p>
            <p className="mt-1 text-xs leading-5 text-arca-text-secondary">Puedo comparar rentabilidad, detectar cobros atrasados y mostrarte qué proyecto necesita atención.</p>
            <button
              type="button"
              onClick={() => onOpenNova(`Analiza mis proyectos y actividades. Este mes he cobrado ${formatMoney.format(data.totals.realIncome)}, tengo gastos por ${formatMoney.format(data.totals.realExpense)} y ${formatMoney.format(data.totals.expectedIncome)} por cobrar. Compara la rentabilidad de cada proyecto, revisa los cobros vencidos y dime qué debería atender primero.`)}
              className="mt-3 flex items-center gap-2 text-[10px] font-black uppercase tracking-wider text-arca-accent"
            >
              Analizar con Nova <ArrowRight size={14} />
            </button>
          </div>
        </div>
      </aside>

      {/* Detail Modal for Selected Unit */}
      <AnimatePresence>
        {selectedDetailUnit && (
          <div className="fixed inset-0 z-[500] flex items-end justify-center">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedDetailUnit(null)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="relative w-full max-w-lg max-h-[90dvh] overflow-hidden bg-arca-surface-1 rounded-t-[32px] shadow-2xl"
            >
              {/* Header */}
              <div className="sticky top-0 z-10 bg-arca-surface-1 px-6 pt-5 pb-4 border-b border-arca-border/60">
                <div className="w-12 h-1.5 bg-arca-border rounded-full mx-auto mb-5" />
                <div className="flex justify-between items-start gap-4">
                  <div className="space-y-1 min-w-0">
                    <h3 className="text-xl font-bold text-arca-text-primary tracking-tight truncate">{selectedDetailUnit.name}</h3>
                    <p className="text-[10px] font-bold text-arca-text-dim uppercase tracking-widest">
                      Proyecto o actividad
                    </p>
                  </div>
                  <button
                    onClick={() => openEditUnit(selectedDetailUnit)}
                    className="w-10 h-10 rounded-xl bg-arca-surface-2 border border-arca-border flex items-center justify-center text-arca-text-secondary hover:text-arca-accent shrink-0"
                  >
                    <Edit2 size={16} />
                  </button>
                </div>
              </div>

              {/* Scrollable Content */}
              <div className="space-y-6 overflow-y-auto px-6 py-6 max-h-[calc(90dvh-100px)] pb-12">
                
                {/* Financial breakdown */}
                <div className="space-y-3">
                  <h4 className="text-[10px] font-bold text-arca-text-dim uppercase tracking-widest ml-1">Flujo este mes</h4>
                  <div className="grid grid-cols-3 gap-3">
                    <MiniMetric icon={<TrendingUp size={14} className="text-arca-positive" />} label="Cobrado" value={formatMoney.format(selectedDetailUnit.realIncome)} />
                    <MiniMetric icon={<CalendarClock size={14} className="text-arca-accent" />} label="Por cobrar" value={formatMoney.format(selectedDetailUnit.expectedIncome)} />
                    <MiniMetric icon={<Briefcase size={14} className="text-arca-alert" />} label="Gasto" value={formatMoney.format(selectedDetailUnit.realExpense)} />
                  </div>
                </div>

                {/* Sources / Canales */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between ml-1">
                    <div>
                      <h4 className="text-[10px] font-bold text-arca-text-dim uppercase tracking-widest">Fuentes / Canales de entrada</h4>
                      <p className="text-[9px] text-arca-text-dim tracking-normal">Formas o conceptos específicos por los que recibes dinero.</p>
                    </div>
                    <button
                      onClick={() => openNewSourceForUnit(selectedDetailUnit.key)}
                      disabled={data.accountOptions.length === 0}
                      className="h-7 px-3 rounded-lg bg-arca-accent/10 text-arca-accent text-xs font-bold flex items-center gap-1.5 disabled:opacity-40"
                    >
                      <Plus size={12} />
                      <span>Nueva</span>
                    </button>
                  </div>
                  <div className="space-y-2">
                    {data.sources.filter(s => s.unitKey === selectedDetailUnit.key).length > 0 ? (
                      data.sources.filter(s => s.unitKey === selectedDetailUnit.key).map((source) => (
                        <div
                          key={source.id}
                          className="flex items-center justify-between p-3.5 rounded-xl border border-arca-border bg-arca-surface-2 text-left"
                        >
                          <button
                            onClick={() => {
                              haptics.light();
                              setSelectedSource(source);
                              setDateFrom('');
                              setDateTo('');
                            }}
                            className="flex-1 text-left min-w-0"
                          >
                            <p className="text-xs font-bold text-arca-text-primary truncate">{source.name}</p>
                            <p className="text-[9px] text-arca-text-dim mt-0.5">
                              Destino: {source.defaultAccountLabel ?? 'Sin cuenta predefinida'}
                            </p>
                            {(source.totalIncome > 0 || source.totalExpense > 0) && (
                              <div className="flex gap-2.5 mt-1.5">
                                {source.totalIncome > 0 && <span className="text-[9px] font-bold text-arca-positive">+{source.totalIncomeLabel}</span>}
                                {source.totalExpense > 0 && <span className="text-[9px] font-bold text-arca-alert">-{source.totalExpenseLabel}</span>}
                              </div>
                            )}
                          </button>
                          <button
                            onClick={() => openEditSource(source)}
                            className="p-2 text-arca-text-dim hover:text-arca-accent shrink-0"
                          >
                            <Edit2 size={14} />
                          </button>
                        </div>
                      ))
                    ) : (
                      <div className="rounded-xl border border-arca-border p-4 text-center text-xs text-arca-text-dim">
                        No hay conceptos de ingreso para este proyecto.
                      </div>
                    )}
                  </div>
                </div>

                {/* Pending Invoices for this Unit */}
                <div className="space-y-3">
                  <h4 className="text-[10px] font-bold text-arca-text-dim uppercase tracking-widest ml-1">Facturas / Cobros Pendientes</h4>
                  <div className="space-y-2">
                    {data.activeItems.filter(item => item.unitName === selectedDetailUnit.name).length > 0 ? (
                      data.activeItems
                        .filter(item => item.unitName === selectedDetailUnit.name)
                        .map((item) => (
                          <div key={item.id} className="p-3.5 flex justify-between items-center rounded-xl border border-arca-border bg-arca-surface-2">
                            <div className="flex items-center space-x-3">
                              <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${item.status === 'overdue' ? 'bg-arca-alert/10' : 'bg-arca-positive/10'}`}>
                                <Clock size={14} className={item.status === 'overdue' ? 'text-arca-alert' : 'text-arca-positive'} />
                              </div>
                              <div>
                                <p className="text-xs font-bold text-arca-text-primary">{item.title}</p>
                                <p className={`text-[9px] font-semibold ${item.status === 'overdue' ? 'text-arca-alert' : 'text-arca-text-dim'}`}>
                                  {item.dueLabel}
                                </p>
                              </div>
                            </div>
                            <span className="text-xs font-bold text-arca-positive">{formatMoney.format(item.amount)}</span>
                          </div>
                        ))
                    ) : (
                      <div className="rounded-xl border border-arca-border p-4 text-center text-xs text-arca-text-dim">
                        Sin facturas pendientes de cobro este mes.
                      </div>
                    )}
                  </div>
                </div>

              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Editor Modal (Units / Sources) */}
      <AnimatePresence>
        {editor ? (
          <div className="fixed inset-0 z-[620] flex items-end justify-center">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={closeEditor} />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 24, stiffness: 260 }}
              className="relative w-full max-w-lg rounded-t-[32px] bg-arca-surface-1 p-6 pb-10 space-y-4"
            >
              <div className="w-12 h-1.5 rounded-full bg-arca-border mx-auto" />
              <div>
                <h3 className="text-lg font-bold text-arca-text-primary">
                  {editor.type === 'unit' ? (editor.id ? 'Editar proyecto' : 'Nuevo proyecto') : editor.id ? 'Editar concepto' : 'Nuevo concepto'}
                </h3>
                <p className="text-xs text-arca-text-dim mt-1">
                  {editor.type === 'unit'
                    ? 'Separa los ingresos y gastos de un negocio, cliente o actividad.'
                    : 'Las fuentes detallan las formas de cobrar (ej. reservas).'}
                </p>
              </div>

              <div className="space-y-3">
                <label className="block space-y-2">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-arca-text-dim">Nombre</span>
                  <input
                    type="text"
                    value={editor.name}
                    onChange={(e) => setEditor({ ...editor, name: e.target.value })}
                    className="w-full h-12 px-4 rounded-xl border border-arca-border bg-arca-surface-2 text-sm font-bold text-arca-text-primary focus:outline-none focus:border-arca-accent"
                  />
                </label>

                {editor.type !== 'unit' ? (
                  <>
                    <label className="block space-y-2">
                      <span className="text-[10px] font-bold uppercase tracking-widest text-arca-text-dim">Proyecto o actividad</span>
                      <select
                        value={editor.unitKey}
                        onChange={(e) => setEditor({ ...editor, unitKey: e.target.value })}
                        className="w-full h-12 px-4 rounded-xl border border-arca-border bg-arca-surface-2 text-sm font-medium text-arca-text-primary focus:outline-none focus:border-arca-accent"
                      >
                        {unitOptions.map((unit) => (
                          <option key={unit.key} value={unit.key}>{unit.name}</option>
                        ))}
                      </select>
                    </label>

                    <label className="block space-y-2">
                      <span className="text-[10px] font-bold uppercase tracking-widest text-arca-text-dim">Cuenta destino por defecto</span>
                      <select
                        value={editor.defaultAccountId}
                        onChange={(e) => setEditor({ ...editor, defaultAccountId: e.target.value })}
                        className="w-full h-12 px-4 rounded-xl border border-arca-border bg-arca-surface-2 text-sm font-medium text-arca-text-primary focus:outline-none focus:border-arca-accent"
                      >
                        {data.accountOptions.map((account) => (
                          <option key={account.id} value={account.id}>{account.label}</option>
                        ))}
                      </select>
                    </label>
                  </>
                ) : null}
              </div>

              {actionError ? <p className="text-xs text-arca-alert">{actionError}</p> : null}

              <button
                type="button"
                onClick={saveEditor}
                disabled={isPending}
                className="w-full h-12 rounded-xl bg-arca-accent text-white text-sm font-bold uppercase tracking-widest disabled:opacity-60"
              >
                {isPending ? 'Guardando...' : 'Guardar'}
              </button>
            </motion.div>
          </div>
        ) : null}
      {/* Source Detail Sub-modal */}
      <AnimatePresence>
        {selectedSource && (
          <div className="fixed inset-0 z-[600] flex items-end justify-center">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedSource(null)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="relative w-full max-w-lg max-h-[85dvh] overflow-hidden bg-arca-surface-1 rounded-t-[32px] shadow-2xl p-6 space-y-4"
            >
              <div className="w-12 h-1.5 bg-arca-border rounded-full mx-auto mb-2" />
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-xl font-bold text-arca-text-primary tracking-tight">{selectedSource.name}</h3>
                  <p className="text-[10px] font-bold text-arca-text-dim uppercase tracking-widest mt-0.5">
                    Fuente de {selectedSource.unitName}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedSource(null)}
                  className="w-8 h-8 rounded-full bg-arca-surface-2 flex items-center justify-center text-arca-text-dim hover:text-arca-text-primary"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Rango de fechas */}
              <div className="rounded-2xl bg-arca-surface-2 border border-arca-border p-3.5 space-y-2">
                <div className="flex items-center gap-1.5 text-[10px] font-bold text-arca-text-dim uppercase tracking-widest">
                  <CalendarRange size={13} className="text-arca-accent" />
                  <span>Filtrar por Rango de Fechas</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[9px] text-arca-text-dim block mb-1">Desde</label>
                    <input
                      type="date"
                      value={dateFrom}
                      onChange={(e) => setDateFrom(e.target.value)}
                      className="w-full bg-arca-surface-1 border border-arca-border rounded-xl px-3 py-2 text-xs font-medium text-arca-text-primary focus:outline-none focus:border-arca-accent"
                    />
                  </div>
                  <div>
                    <label className="text-[9px] text-arca-text-dim block mb-1">Hasta</label>
                    <input
                      type="date"
                      value={dateTo}
                      onChange={(e) => setDateTo(e.target.value)}
                      className="w-full bg-arca-surface-1 border border-arca-border rounded-xl px-3 py-2 text-xs font-medium text-arca-text-primary focus:outline-none focus:border-arca-accent"
                    />
                  </div>
                </div>
                {(dateFrom || dateTo) && (
                  <button
                    type="button"
                    onClick={() => { setDateFrom(''); setDateTo(''); }}
                    className="text-[9px] font-bold text-arca-accent uppercase tracking-wider hover:underline pt-1 block"
                  >
                    Limpiar filtro
                  </button>
                )}
              </div>

              {/* Movimientos de la fuente */}
              {(() => {
                const filteredTx = data.unitTransactions.filter(t => 
                  t.sourceLabel === selectedSource.name &&
                  (!dateFrom || t.date >= dateFrom) &&
                  (!dateTo || t.date <= dateTo)
                );
                const sumIncome = filteredTx.filter(t => t.kind === 'income').reduce((acc, t) => acc + t.amount, 0);
                const sumExpense = filteredTx.filter(t => t.kind === 'expense').reduce((acc, t) => acc + t.amount, 0);

                return (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-2">
                      <div className="rounded-xl bg-arca-positive/10 border border-arca-positive/20 p-3">
                        <p className="text-[9px] font-bold uppercase tracking-wider text-arca-positive">Total Ingresos</p>
                        <p className="text-sm font-black text-arca-positive mt-1">{formatMoney.format(sumIncome)}</p>
                      </div>
                      <div className="rounded-xl bg-arca-alert/10 border border-arca-alert/20 p-3">
                        <p className="text-[9px] font-bold uppercase tracking-wider text-arca-alert">Total Gastos</p>
                        <p className="text-sm font-black text-arca-alert mt-1">{formatMoney.format(sumExpense)}</p>
                      </div>
                    </div>

                    <div className="max-h-[35dvh] overflow-y-auto space-y-2 pr-1">
                      {filteredTx.length > 0 ? (
                        filteredTx.map((tx) => (
                          <div key={tx.id} className="flex items-center justify-between p-3 rounded-xl border border-arca-border bg-arca-surface-2">
                            <div className="flex items-center gap-3">
                              <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${tx.kind === 'income' ? 'bg-arca-positive/10 text-arca-positive' : 'bg-arca-alert/10 text-arca-alert'}`}>
                                {tx.kind === 'income' ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                              </div>
                              <div>
                                <p className="text-xs font-bold text-arca-text-primary">{tx.concept}</p>
                                <p className="text-[9px] text-arca-text-dim">{tx.dateLabel}</p>
                              </div>
                            </div>
                            <span className={`text-xs font-bold ${tx.kind === 'income' ? 'text-arca-positive' : 'text-arca-alert'}`}>
                              {tx.kind === 'income' ? '+' : '-'}{tx.amountLabel}
                            </span>
                          </div>
                        ))
                      ) : (
                        <div className="rounded-xl border border-arca-border p-5 text-center text-xs text-arca-text-dim">
                          No hay movimientos registrados para esta fuente en este período.
                        </div>
                      )}
                    </div>
                  </div>
                );
              })()}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Invoice Action Modal */}
      <AnimatePresence>
        {invoiceAction && (
          <div className="fixed inset-0 z-[600] flex items-end justify-center">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setInvoiceAction(null)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="relative w-full max-w-lg bg-arca-surface-1 rounded-t-[32px] shadow-2xl p-6 space-y-4 pb-10"
            >
              <div className="w-12 h-1.5 bg-arca-border rounded-full mx-auto mb-2" />
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-lg font-bold text-arca-text-primary tracking-tight">{invoiceAction.title}</h3>
                  <p className="text-[10px] font-bold text-arca-text-dim uppercase tracking-widest mt-0.5">
                    {invoiceAction.unitName} · {invoiceAction.dueLabel}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setInvoiceAction(null)}
                  className="w-8 h-8 rounded-full bg-arca-surface-2 flex items-center justify-center text-arca-text-dim hover:text-arca-text-primary"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="rounded-2xl bg-arca-positive/10 border border-arca-positive/20 p-4 text-center">
                <p className="text-[10px] font-bold uppercase tracking-wider text-arca-positive">Monto a Cobrar</p>
                <p className="text-2xl font-black text-arca-positive mt-1">{formatMoney.format(invoiceAction.amount)}</p>
              </div>

              <div className="space-y-2 pt-2">
                <button
                  type="button"
                  disabled={isPending || !invoiceAction.scheduledEventId}
                  onClick={() => {
                    if (!invoiceAction.scheduledEventId) return;
                    startTransition(async () => {
                      try {
                        await confirmScheduledEventNow(invoiceAction.scheduledEventId!);
                        haptics.success();
                        setInvoiceAction(null);
                        router.refresh();
                      } catch (err) {
                        haptics.error();
                        setActionError(err instanceof Error ? err.message : 'Error al confirmar');
                      }
                    });
                  }}
                  className="w-full h-12 rounded-xl bg-arca-positive text-white text-xs font-bold uppercase tracking-widest flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <Check size={16} />
                  <span>{isPending ? 'Confirmando...' : 'Marcar como Cobrado'}</span>
                </button>

                <button
                  type="button"
                  disabled={isPending || !invoiceAction.scheduledEventId}
                  onClick={() => {
                    if (!invoiceAction.scheduledEventId) return;
                    startTransition(async () => {
                      try {
                        await cancelScheduledEvent(invoiceAction.scheduledEventId!);
                        haptics.success();
                        setInvoiceAction(null);
                        router.refresh();
                      } catch (err) {
                        haptics.error();
                        setActionError(err instanceof Error ? err.message : 'Error al cancelar');
                      }
                    });
                  }}
                  className="w-full h-12 rounded-xl border border-arca-alert/40 text-arca-alert text-xs font-bold uppercase tracking-widest flex items-center justify-center gap-2 disabled:opacity-50 hover:bg-arca-alert/10"
                >
                  <X size={16} />
                  <span>{isPending ? 'Cancelando...' : 'Cancelar Cobro'}</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function PortfolioMetric({
  label,
  value,
  tone,
  align = 'left',
}: {
  label: string;
  value: string;
  tone: 'positive' | 'accent' | 'alert';
  align?: 'left' | 'center' | 'right';
}) {
  const valueClass = tone === 'positive' ? 'text-arca-positive' : tone === 'alert' ? 'text-arca-alert' : 'text-arca-accent';
  const alignClass = align === 'center' ? 'text-center' : align === 'right' ? 'text-right' : '';

  return (
    <div className={`min-w-0 px-2 first:pl-0 last:pr-0 ${alignClass}`}>
      <p className="text-[8px] font-black uppercase tracking-wider text-arca-text-dim">{label}</p>
      <p className={`mt-1 truncate text-xs font-black ${valueClass}`}>{value}</p>
    </div>
  );
}

function UnitMetric({ label, value, tone, align = 'left' }: { label: string; value: string; tone: 'positive' | 'accent' | 'neutral'; align?: 'left' | 'right' }) {
  const toneClass = tone === 'positive' ? 'text-arca-positive' : tone === 'accent' ? 'text-arca-accent' : 'text-arca-text-secondary';
  return (
    <div className={align === 'right' ? 'min-w-0 text-right' : 'min-w-0'}>
      <p className="text-[8px] font-bold uppercase tracking-wider text-arca-text-dim">{label}</p>
      <p className={`mt-1 truncate text-[10px] font-black ${toneClass}`}>{value}</p>
    </div>
  );
}

function InvoiceRow({ item, formatMoney }: { item: BusinessActiveItem; formatMoney: (value: number) => string }) {
  const overdue = item.status === 'overdue';

  return (
    <motion.div whileTap={{ scale: 0.98 }} className={`flex items-center justify-between rounded-[20px] border bg-arca-surface-1 p-4 ${overdue ? 'border-arca-alert/25' : 'border-arca-border'}`}>
      <div className="flex min-w-0 items-center space-x-3">
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${overdue ? 'bg-arca-alert/10' : 'bg-arca-positive/10'}`}>
          <Clock size={16} className={overdue ? 'text-arca-alert' : 'text-arca-positive'} />
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-arca-text-primary">{item.title}</p>
          <p className={`text-[10px] font-bold uppercase tracking-wider ${overdue ? 'text-arca-alert' : 'text-arca-text-dim'}`}>
            {item.unitName} · {item.dueLabel}
          </p>
        </div>
      </div>
      <p className="ml-3 shrink-0 text-sm font-bold text-arca-positive">{formatMoney(item.amount)}</p>
    </motion.div>
  );
}

function MiniMetric({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl bg-arca-surface-2 border border-arca-border px-3 py-3">
      <div className="flex items-center gap-2">
        {icon}
        <p className="text-[9px] uppercase tracking-wider text-arca-text-dim">{label}</p>
      </div>
      <p className="mt-2 text-sm font-bold text-arca-text-primary">{value}</p>
    </div>
  );
}

function moneyFormatter(currency: string) {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: /^[A-Z]{3}$/.test(currency) ? currency : 'COP',
    maximumFractionDigits: 0,
  });
}
