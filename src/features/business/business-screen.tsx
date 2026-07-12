'use client';

import { useMemo, useState, useTransition } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowDownLeft, Briefcase, CalendarClock, Clock, Edit2, Plus, TrendingUp, Users, Wallet, X, ChevronRight, HelpCircle } from 'lucide-react';
import {
  createBusinessUnit,
  createIncomeSource,
  updateBusinessUnit,
  updateIncomeSource,
} from '@/app/actions';
import type { BusinessActiveItem, BusinessSource, BusinessTopItem, BusinessUnitSummary, BusinessViewModel } from '@/src/lib/business-types';
import { haptics } from '@/src/lib/haptics';

type EditorMode =
  | { type: 'unit'; id?: string; name: string; key: string }
  | { type: 'source'; id?: string; name: string; unitKey: string; defaultAccountId: string };

export default function BusinessScreen({
  onBack,
  data,
}: {
  onBack: () => void;
  data: BusinessViewModel;
}) {
  const [editor, setEditor] = useState<EditorMode | null>(null);
  const [selectedDetailUnit, setSelectedDetailUnit] = useState<BusinessUnitSummary | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

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
            await updateBusinessUnit({ id: editor.id, name: editor.name, key: editor.key });
          } else {
            await createBusinessUnit({ name: editor.name, key: editor.key });
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
    <div className="space-y-6">
      <header className="flex items-center space-x-4">
        <button onClick={onBack} className="text-arca-text-dim hover:text-arca-accent transition-colors">
          <ArrowDownLeft className="rotate-45" size={24} />
        </button>
        <h2 className="text-lg font-bold text-arca-text-primary uppercase tracking-widest">Unidades de Negocio</h2>
      </header>

      <section className="grid grid-cols-2 gap-4">
        <SummaryCard label="Por cobrar total" value={data.totals.expectedIncomeLabel} helper={`${data.activeItems.length} cobros abiertos`} tone="positive" />
        <SummaryCard label="Caja consolidada" value={data.totals.netLabel} helper="Resultado real del mes" tone={data.totals.net >= 0 ? 'neutral' : 'alert'} />
      </section>

      {/* Unidades de Negocio list */}
      <section className="card-arca p-5 space-y-4">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <div className="flex items-center space-x-3 text-arca-accent">
              <Users size={20} />
              <h4 className="text-sm font-bold uppercase tracking-widest">Tus Proyectos</h4>
            </div>
            <p className="text-[10px] text-arca-text-dim leading-relaxed pr-6">
              Líneas de actividad, proyectos o áreas principales de tu negocio.
            </p>
          </div>
          <button onClick={openNewUnit} className="w-9 h-9 rounded-xl bg-arca-accent/10 text-arca-accent flex items-center justify-center shrink-0">
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
                className="w-full rounded-2xl border border-arca-border bg-arca-surface-2 px-4 py-4 text-left hover:border-arca-accent/40 transition-colors"
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-arca-text-primary">{unit.name}</p>
                    <p className="mt-1 text-[10px] uppercase tracking-wider text-arca-text-dim">ID frente: {unit.key}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-bold text-arca-accent">{unit.netLabel}</span>
                    <ChevronRight size={16} className="text-arca-text-dim shrink-0" />
                  </div>
                </div>
              </button>
            ))
          ) : (
            <p className="text-xs text-arca-text-dim text-center py-4">Aún no hay unidades de negocio.</p>
          )}
        </div>
      </section>

      {/* Facturas activas generales */}
      <div className="space-y-4">
        <h3 className="text-xs font-bold text-arca-text-dim uppercase tracking-widest px-1">Ingresos esperados (Facturas)</h3>
        {data.activeItems.length > 0 ? (
          data.activeItems.map((item) => <InvoiceRow key={item.id} item={item} />)
        ) : (
          <div className="card-arca p-4 text-xs text-arca-text-dim text-center">No hay cobros pendientes abiertos para este mes.</div>
        )}
      </div>

      {/* Top frentes / Rendimiento */}
      <section className="card-arca p-5 space-y-4">
        <div className="flex items-center space-x-3 text-arca-accent">
          <TrendingUp size={20} />
          <h4 className="text-sm font-bold uppercase tracking-widest">Rendimiento Real del Mes</h4>
        </div>
        <div className="space-y-3">
          {data.topItems.length > 0 ? (
            data.topItems.map((item) => (
              <div key={item.id} className="flex justify-between items-center text-xs">
                <div>
                  <span className="text-arca-text-secondary">{item.name}</span>
                  <p className="mt-1 text-[10px] uppercase tracking-wider text-arca-text-dim">{item.helper}</p>
                </div>
                <span className="font-bold text-arca-text-primary">{item.totalLabel}</span>
              </div>
            ))
          ) : (
            <p className="text-xs text-arca-text-dim text-center py-2">Aún no hay frentes con ingresos reales registrados.</p>
          )}
        </div>
      </section>

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
                      Unidad de Negocio · clave: {selectedDetailUnit.key}
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
                    <MiniMetric icon={<TrendingUp size={14} className="text-arca-positive" />} label="Real" value={selectedDetailUnit.realIncomeLabel} />
                    <MiniMetric icon={<CalendarClock size={14} className="text-arca-accent" />} label="Esperado" value={selectedDetailUnit.expectedIncomeLabel} />
                    <MiniMetric icon={<Briefcase size={14} className="text-arca-alert" />} label="Gasto" value={selectedDetailUnit.realExpenseLabel} />
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
                          <div>
                            <p className="text-xs font-bold text-arca-text-primary">{source.name}</p>
                            <p className="text-[9px] text-arca-text-dim mt-0.5">
                              Destino: {source.defaultAccountLabel ?? 'Sin cuenta predefinida'}
                            </p>
                          </div>
                          <button
                            onClick={() => openEditSource(source)}
                            className="p-2 text-arca-text-dim hover:text-arca-accent"
                          >
                            <Edit2 size={14} />
                          </button>
                        </div>
                      ))
                    ) : (
                      <div className="rounded-xl border border-arca-border p-4 text-center text-xs text-arca-text-dim">
                        No hay fuentes registradas para esta unidad.
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
                            <span className="text-xs font-bold text-arca-positive">{item.amountLabel}</span>
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
                  {editor.type === 'unit' ? (editor.id ? 'Editar Unidad' : 'Nueva Unidad') : editor.id ? 'Editar Fuente' : 'Nueva Fuente'}
                </h3>
                <p className="text-xs text-arca-text-dim mt-1">
                  {editor.type === 'unit'
                    ? 'Las unidades agrupan la caja de tus diferentes proyectos.'
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

                {editor.type === 'unit' ? (
                  <label className="block space-y-2">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-arca-text-dim">Identificador (Clave)</span>
                    <input
                      type="text"
                      value={editor.key}
                      onChange={(e) => setEditor({ ...editor, key: e.target.value })}
                      placeholder="ej. consultoria"
                      className="w-full h-12 px-4 rounded-xl border border-arca-border bg-arca-surface-2 text-sm font-medium text-arca-text-primary focus:outline-none focus:border-arca-accent"
                    />
                  </label>
                ) : (
                  <>
                    <label className="block space-y-2">
                      <span className="text-[10px] font-bold uppercase tracking-widest text-arca-text-dim">Unidad de Negocio</span>
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
                )}
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
      </AnimatePresence>
    </div>
  );
}

function SummaryCard({
  label,
  value,
  helper,
  tone,
}: {
  label: string;
  value: string;
  helper: string;
  tone: 'positive' | 'neutral' | 'alert';
}) {
  const valueClass = tone === 'positive' ? 'text-arca-positive' : tone === 'alert' ? 'text-arca-alert' : 'text-arca-text-primary';

  return (
    <div className="card-arca p-4 bg-arca-surface-2">
      <p className="text-[9px] font-bold text-arca-text-dim uppercase tracking-widest mb-1">{label}</p>
      <p className={`text-xl font-bold ${valueClass}`}>{value}</p>
      <p className="text-[9px] text-arca-text-dim mt-1 uppercase">{helper}</p>
    </div>
  );
}

function InvoiceRow({ item }: { item: BusinessActiveItem }) {
  const overdue = item.status === 'overdue';

  return (
    <motion.div whileTap={{ scale: 0.98 }} className="card-arca p-4 flex justify-between items-center">
      <div className="flex items-center space-x-3">
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${overdue ? 'bg-arca-alert/10' : 'bg-arca-positive/10'}`}>
          <Clock size={16} className={overdue ? 'text-arca-alert' : 'text-arca-positive'} />
        </div>
        <div>
          <p className="text-sm font-semibold text-arca-text-primary">{item.title}</p>
          <p className={`text-[10px] font-bold uppercase tracking-wider ${overdue ? 'text-arca-alert' : 'text-arca-text-dim'}`}>
            {item.unitName} · {item.dueLabel}
          </p>
        </div>
      </div>
      <p className="text-sm font-bold text-arca-positive">{item.amountLabel}</p>
    </motion.div>
  );
}

function MiniMetric({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
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
