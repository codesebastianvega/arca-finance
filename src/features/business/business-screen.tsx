'use client';

import { useMemo, useState, useTransition } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowDownLeft, Briefcase, CalendarClock, Clock, Edit2, Plus, TrendingUp, Users, Wallet } from 'lucide-react';
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
  const [actionError, setActionError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const unitOptions = useMemo(
    () => data.units.map((unit) => ({ key: unit.key, name: unit.name })),
    [data.units],
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

  const openNewSource = () => {
    if (!canCreateSource) return;
    haptics.light();
    setActionError(null);
    setEditor({
      type: 'source',
      name: '',
      unitKey: unitOptions[0]?.key ?? '',
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
        <h2 className="text-lg font-bold text-arca-text-primary uppercase tracking-widest">Negocios</h2>
      </header>

      <section className="grid grid-cols-2 gap-4">
        <SummaryCard label="Por cobrar" value={data.totals.expectedIncomeLabel} helper={`${data.activeItems.length} ingresos abiertos`} tone="positive" />
        <SummaryCard label="Caja negocio" value={data.totals.netLabel} helper="Resultado real del mes" tone={data.totals.net >= 0 ? 'neutral' : 'alert'} />
      </section>

      <section className="card-arca p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3 text-arca-accent">
            <Users size={20} />
            <h4 className="text-sm font-bold uppercase tracking-widest">Frentes</h4>
          </div>
          <button onClick={openNewUnit} className="w-9 h-9 rounded-xl bg-arca-accent/10 text-arca-accent flex items-center justify-center">
            <Plus size={16} />
          </button>
        </div>
        <div className="space-y-3">
          {data.units.length > 0 ? (
            data.units.map((unit) => (
              <button
                key={unit.id}
                onClick={() => openEditUnit(unit)}
                className="w-full rounded-2xl border border-arca-border bg-arca-surface-2 px-4 py-4 text-left"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-arca-text-primary">{unit.name}</p>
                    <p className="mt-1 text-[10px] uppercase tracking-wider text-arca-text-dim">{unit.key}</p>
                  </div>
                  <Edit2 size={16} className="text-arca-text-dim shrink-0" />
                </div>
              </button>
            ))
          ) : (
            <p className="text-xs text-arca-text-dim">Aún no hay frentes cargados.</p>
          )}
        </div>
      </section>

      <section className="card-arca p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3 text-arca-accent">
            <Wallet size={20} />
            <h4 className="text-sm font-bold uppercase tracking-widest">Fuentes de ingreso</h4>
          </div>
          <button
            onClick={openNewSource}
            disabled={!canCreateSource}
            title={!canCreateSource ? 'Primero crea un frente y una cuenta destino.' : 'Nueva fuente'}
            className="w-9 h-9 rounded-xl bg-arca-accent/10 text-arca-accent flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Plus size={16} />
          </button>
        </div>
        {!canCreateSource ? (
          <div className="rounded-2xl border border-arca-border bg-arca-surface-2 px-4 py-3 text-xs text-arca-text-dim">
            Para crear una fuente necesitas al menos un frente y una cuenta destino.
          </div>
        ) : null}
        <div className="space-y-3">
          {data.sources.length > 0 ? (
            data.sources.map((source) => (
              <button
                key={source.id}
                onClick={() => openEditSource(source)}
                className="w-full rounded-2xl border border-arca-border bg-arca-surface-2 px-4 py-4 text-left"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-arca-text-primary">{source.name}</p>
                    <p className="mt-1 text-[10px] uppercase tracking-wider text-arca-text-dim">
                      {source.unitName} · {source.defaultAccountLabel ?? 'Sin cuenta por defecto'}
                    </p>
                  </div>
                  <Edit2 size={16} className="text-arca-text-dim shrink-0" />
                </div>
              </button>
            ))
          ) : (
            <p className="text-xs text-arca-text-dim">Aún no hay fuentes de ingreso creadas.</p>
          )}
        </div>
      </section>

      <div className="space-y-4">
        <h3 className="text-xs font-bold text-arca-text-dim uppercase tracking-widest px-1">Facturas activas</h3>
        {data.activeItems.length > 0 ? data.activeItems.map((item) => <InvoiceRow key={item.id} item={item} />) : <div className="card-arca p-4 text-xs text-arca-text-dim">No hay ingresos esperados abiertos para este mes.</div>}
      </div>

      <section className="card-arca p-5 space-y-4">
        <div className="flex items-center space-x-3 text-arca-accent">
          <Users size={20} />
          <h4 className="text-sm font-bold uppercase tracking-widest">Top frentes</h4>
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
            <p className="text-xs text-arca-text-dim">Aún no hay frentes con ingreso real registrado.</p>
          )}
        </div>
      </section>

      <section className="space-y-4">
        <h3 className="text-xs font-bold text-arca-text-dim uppercase tracking-widest px-1">Detalle por frente</h3>
        {data.units.length > 0 ? data.units.map((unit) => <UnitRow key={unit.id} unit={unit} />) : <div className="card-arca p-4 text-xs text-arca-text-dim">Aún no hay frentes cargados.</div>}
      </section>

      <AnimatePresence>
        {editor ? (
          <div className="fixed inset-0 z-[620] flex items-end justify-center">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/60" onClick={closeEditor} />
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
                  {editor.type === 'unit' ? (editor.id ? 'Editar frente' : 'Nuevo frente') : editor.id ? 'Editar fuente' : 'Nueva fuente'}
                </h3>
                <p className="text-xs text-arca-text-dim mt-1">
                  {editor.type === 'unit'
                    ? 'Un frente organiza el universo económico.'
                    : 'La fuente de ingreso define de dónde llega la plata y a qué cuenta cae por defecto.'}
                </p>
              </div>

              <div className="space-y-3">
                <label className="block space-y-2">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-arca-text-dim">Nombre</span>
                  <input
                    type="text"
                    value={editor.name}
                    onChange={(e) => setEditor({ ...editor, name: e.target.value })}
                    className="w-full h-12 px-4 rounded-xl border border-arca-border bg-arca-surface-2 text-sm text-arca-text-primary focus:outline-none focus:border-arca-accent"
                  />
                </label>

                {editor.type === 'unit' ? (
                  <label className="block space-y-2">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-arca-text-dim">Clave</span>
                    <input
                      type="text"
                      value={editor.key}
                      onChange={(e) => setEditor({ ...editor, key: e.target.value })}
                      className="w-full h-12 px-4 rounded-xl border border-arca-border bg-arca-surface-2 text-sm text-arca-text-primary focus:outline-none focus:border-arca-accent"
                    />
                  </label>
                ) : (
                  <>
                    <label className="block space-y-2">
                      <span className="text-[10px] font-bold uppercase tracking-widest text-arca-text-dim">Frente</span>
                      <select
                        value={editor.unitKey}
                        onChange={(e) => setEditor({ ...editor, unitKey: e.target.value })}
                        className="w-full h-12 px-4 rounded-xl border border-arca-border bg-arca-surface-2 text-sm text-arca-text-primary focus:outline-none focus:border-arca-accent"
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
                        className="w-full h-12 px-4 rounded-xl border border-arca-border bg-arca-surface-2 text-sm text-arca-text-primary focus:outline-none focus:border-arca-accent"
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

function UnitRow({ unit }: { unit: BusinessUnitSummary }) {
  const netClass = unit.net >= 0 ? 'text-arca-positive' : 'text-arca-alert';

  return (
    <article className="card-arca p-4 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h4 className="text-sm font-semibold text-arca-text-primary">{unit.name}</h4>
          <p className="text-[10px] uppercase tracking-wider text-arca-text-dim">{unit.nextEventLabel}</p>
        </div>
        <div className="flex items-center gap-2">
          <Briefcase size={16} className="text-arca-text-dim" />
          <span className={`text-sm font-bold ${netClass}`}>{unit.netLabel}</span>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <MiniMetric icon={<TrendingUp size={14} className="text-arca-positive" />} label="Real" value={unit.realIncomeLabel} />
        <MiniMetric icon={<CalendarClock size={14} className="text-arca-accent" />} label="Esperado" value={unit.expectedIncomeLabel} />
        <MiniMetric icon={<Briefcase size={14} className={netClass} />} label="Gasto" value={unit.realExpenseLabel} />
      </div>
    </article>
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
