'use client';

import { useMemo, useState, useTransition } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { useRouter } from 'next/navigation';
import {
  ArrowDownLeft,
  Edit2,
  Eye,
  FileText,
  Filter,
  Search,
  Trash2,
  X,
} from 'lucide-react';
import { deleteManualTransaction, updateManualTransaction } from '@/app/actions';
import type { HistoryItem, HistoryViewModel } from '@/src/lib/history-types';
import { generateMonthlyReportPDF } from '@/src/lib/pdf';

export default function HistoryScreen({
  onBack,
  data,
}: {
  onBack: () => void;
  data: HistoryViewModel;
}) {
  const [search, setSearch] = useState('');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [activeItem, setActiveItem] = useState<HistoryItem | null>(null);
  const [editingItem, setEditingItem] = useState<HistoryItem | null>(null);
  const [isPending, startTransition] = useTransition();

  const allTags = useMemo(() => Array.from(new Set(data.items.flatMap((item) => item.tags))), [data.items]);

  const filteredHistory = useMemo(
    () =>
      data.items.filter((item) => {
        const matchesSearch = item.concept.toLowerCase().includes(search.toLowerCase());
        const matchesTag = !selectedTag || item.tags.includes(selectedTag);
        return matchesSearch && matchesTag;
      }),
    [data.items, search, selectedTag],
  );

  const handleDelete = (item: HistoryItem) => {
    startTransition(async () => {
      await deleteManualTransaction(item.id);
      setActiveItem(null);
    });
  };

  const handleExportPDF = () => {
    const exportRows = filteredHistory.map((item) => ({
      date: item.dateLabel,
      name: item.concept,
      category: item.category,
      method: item.method,
      amount: item.signedAmountLabel,
    }));
    generateMonthlyReportPDF(exportRows);
  };

  return (
    <div className="space-y-6 relative">
      <header className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button onClick={onBack} className="text-arca-text-dim hover:text-arca-accent transition-colors">
            <ArrowDownLeft className="rotate-45" size={24} />
          </button>
          <h2 className="text-lg font-bold text-arca-text-primary uppercase tracking-widest">Movimientos</h2>
        </div>
        <button
          onClick={handleExportPDF}
          className="flex items-center space-x-2 px-3 py-1.5 bg-arca-accent/10 text-arca-accent rounded-lg text-[10px] font-bold uppercase tracking-widest hover:bg-arca-accent hover:text-white transition-all"
        >
          <FileText size={14} />
          <span>Exportar PDF</span>
        </button>
      </header>

      <div className="space-y-4">
        <div className="flex gap-3">
          <div className="flex-1 relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-arca-text-dim" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar movimiento..."
              className="w-full h-11 pl-10 pr-4 bg-arca-surface-2 border border-arca-border rounded-xl text-xs font-medium focus:outline-none focus:border-arca-accent"
            />
          </div>
          <button
            onClick={() => setShowFilters((current) => !current)}
            className={`w-11 h-11 rounded-xl border flex items-center justify-center transition-colors ${
              showFilters
                ? 'bg-arca-accent/10 border-arca-accent/20 text-arca-accent'
                : 'bg-arca-surface-2 border-arca-border text-arca-text-dim'
            }`}
            aria-label={showFilters ? 'Ocultar filtros' : 'Mostrar filtros'}
          >
            <Filter size={18} />
          </button>
        </div>

        {showFilters ? (
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide px-1">
          <button
            onClick={() => setSelectedTag(null)}
            className={`px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest whitespace-nowrap transition-all border ${
              !selectedTag ? 'bg-arca-accent text-white border-arca-accent' : 'bg-arca-surface-2 text-arca-text-dim border-arca-border'
            }`}
          >
            Todos
          </button>
          {allTags.map((tag) => (
            <button
              key={tag}
              onClick={() => setSelectedTag(tag)}
              className={`px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest whitespace-nowrap transition-all border ${
                selectedTag === tag ? 'bg-arca-accent text-white border-arca-accent' : 'bg-arca-surface-2 text-arca-text-dim border-arca-border'
              }`}
            >
              {tag}
            </button>
          ))}
          </div>
        ) : null}
      </div>

      <div className="space-y-2">
        <h3 className="text-[10px] font-bold text-arca-text-dim uppercase tracking-widest px-1">Recientes</h3>
        <div className="card-arca divide-y divide-arca-border overflow-hidden">
          {filteredHistory.length > 0 ? (
            filteredHistory.map((item) => (
              <motion.div key={item.id} whileTap={{ scale: 0.98 }} className="flex items-center justify-between p-4 bg-arca-surface-1">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-xl bg-arca-surface-2 flex items-center justify-center text-arca-text-secondary">
                    <span className="text-[10px] font-bold uppercase">{item.kind === 'income' ? 'In' : 'Mv'}</span>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-arca-text-primary">{item.concept}</p>
                    <div className="flex gap-1 mt-0.5 flex-wrap">
                      {item.tags.map((tag) => (
                        <span key={tag} className="text-[8px] font-bold text-arca-accent uppercase tracking-tighter">
                          {tag}
                        </span>
                      ))}
                      <span className="text-[8px] font-bold text-arca-text-dim uppercase tracking-tighter ml-1 opacity-50">
                        - {item.dateLabel}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="text-right">
                    <p className={`text-sm font-bold ${item.signedAmountLabel.startsWith('+') ? 'text-arca-positive' : 'text-arca-alert'}`}>
                      {item.signedAmountLabel}
                    </p>
                  </div>
                  <button
                    onClick={() => setActiveItem(item)}
                    className="p-2 text-arca-text-dim hover:text-arca-accent transition-colors"
                    aria-label="Ver detalle del movimiento"
                  >
                    <Eye size={16} />
                  </button>
                </div>
              </motion.div>
            ))
          ) : (
            <div className="p-4 text-xs text-arca-text-dim">No hay movimientos para ese filtro.</div>
          )}
        </div>
      </div>

      <AnimatePresence>
        {activeItem ? (
          <div className="fixed inset-0 z-[300] flex items-center justify-center p-6 bg-black/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="w-full max-w-sm bg-[#F3ECDC] rounded-3xl overflow-hidden shadow-2xl relative"
            >
              <div className="p-8 space-y-6 text-arca-base">
                <div className="flex justify-between items-start">
                  <div className="w-12 h-12 rounded-xl bg-arca-base flex items-center justify-center text-[#F3ECDC]">
                    <span className="text-xs font-black uppercase">{activeItem.kind === 'income' ? 'IN' : 'MV'}</span>
                  </div>
                  <button onClick={() => setActiveItem(null)} className="text-arca-base/30">
                    <X size={20} />
                  </button>
                </div>

                <div className="space-y-1">
                  <p className="text-[10px] font-bold uppercase tracking-widest opacity-60">Movimiento</p>
                  <h3 className="text-2xl font-bold tracking-tight">{activeItem.concept}</h3>
                </div>

                <div className="py-6 border-y border-arca-base/10 space-y-4">
                  <ReceiptRow label="Monto" value={activeItem.signedAmountLabel} />
                  <ReceiptRow label="Fecha" value={activeItem.dateLabel} />
                  <ReceiptRow label="Método" value={activeItem.method} />
                  <ReceiptRow label="Unidad" value={activeItem.unit} />
                </div>

                <div className="pt-4 flex gap-3">
                  {activeItem.editable ? (
                    <>
                      <button
                        onClick={() => {
                          setEditingItem(activeItem);
                          setActiveItem(null);
                        }}
                        className="flex-1 h-12 bg-arca-base text-[#F3ECDC] rounded-xl font-bold text-xs uppercase tracking-widest flex items-center justify-center space-x-2"
                      >
                        <Edit2 size={16} />
                        <span>Editar</span>
                      </button>
                      <button
                        onClick={() => handleDelete(activeItem)}
                        disabled={isPending}
                        className="h-12 px-4 bg-arca-alert/10 text-arca-alert rounded-xl font-bold text-xs uppercase tracking-widest disabled:opacity-50"
                      >
                        <Trash2 size={16} />
                      </button>
                    </>
                  ) : (
                    <div className="text-[11px] text-arca-base/60">Este movimiento viene de otro flujo y aquí solo se puede consultar.</div>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        ) : null}
      </AnimatePresence>

      <AnimatePresence>
        {editingItem ? (
          <EditMovementModal
            accountOptions={data.accountOptions}
            item={editingItem}
            onClose={() => setEditingItem(null)}
          />
        ) : null}
      </AnimatePresence>
    </div>
  );
}

function ReceiptRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-[10px] font-bold uppercase opacity-60">{label}</span>
      <span className="text-xs font-semibold">{value}</span>
    </div>
  );
}

function EditMovementModal({
  accountOptions,
  item,
  onClose,
}: {
  accountOptions: HistoryViewModel['accountOptions'];
  item: HistoryItem;
  onClose: () => void;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const isLinkedMovement = Boolean(item.sourceType && item.sourceType !== 'manual');
  const lockedFieldClass = isLinkedMovement ? 'cursor-not-allowed opacity-60' : '';

  return (
    <div className="fixed inset-0 z-[320] flex items-start justify-center overflow-y-auto bg-black/80 p-4 backdrop-blur-sm sm:items-center sm:p-6">
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        className="card-arca max-h-[calc(100dvh-2rem)] w-full max-w-md overflow-y-auto p-5 sm:p-6"
      >
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-arca-text-primary uppercase tracking-widest">Editar movimiento</h3>
          <button onClick={onClose} className="text-arca-text-dim">
            <X size={18} />
          </button>
        </div>

        <form
          className="mt-5 grid gap-3"
          onSubmit={(event) => {
            event.preventDefault();
            const form = new FormData(event.currentTarget);
            startTransition(async () => {
              setErrorMessage(null);
              try {
                await updateManualTransaction({
                  id: item.id,
                  concept: String(form.get('concept') ?? ''),
                  amount: Number(form.get('amount') ?? 0),
                  category: String(form.get('category') ?? ''),
                  unit: String(form.get('unit') ?? ''),
                  date: String(form.get('date') ?? ''),
                  accountId: String(form.get('accountId') ?? ''),
                });
                router.refresh();
                onClose();
              } catch (error) {
                setErrorMessage(error instanceof Error ? error.message : 'No se pudo actualizar el movimiento.');
              }
            });
          }}
        >
          {isLinkedMovement ? (
            <p className="rounded-xl border border-arca-accent/25 bg-arca-accent/10 px-3 py-2 text-xs leading-relaxed text-arca-text-secondary">
              Este movimiento proviene de otro flujo. Puedes corregir la cuenta, mientras sus demás datos permanecen protegidos.
            </p>
          ) : null}
          <Field label="Concepto">
            <input name="concept" readOnly={isLinkedMovement} defaultValue={item.concept} className={`w-full h-11 px-3 bg-arca-surface-2 border border-arca-border rounded-xl text-sm ${lockedFieldClass}`} />
          </Field>
          <Field label="Valor">
            <input name="amount" readOnly={isLinkedMovement} type="number" min="0" step="1" defaultValue={item.amount} className={`w-full h-11 px-3 bg-arca-surface-2 border border-arca-border rounded-xl text-sm ${lockedFieldClass}`} />
          </Field>
          <Field label="Categoria">
            <input name="category" readOnly={isLinkedMovement} defaultValue={item.category} className={`w-full h-11 px-3 bg-arca-surface-2 border border-arca-border rounded-xl text-sm ${lockedFieldClass}`} />
          </Field>
          <Field label="Unidad">
            <input name="unit" readOnly={isLinkedMovement} defaultValue={item.unit} className={`w-full h-11 px-3 bg-arca-surface-2 border border-arca-border rounded-xl text-sm ${lockedFieldClass}`} />
          </Field>
          <Field label="Cuenta o banco">
            <select
              name="accountId"
              required
              defaultValue={item.accountId ?? ''}
              className="w-full h-11 px-3 bg-arca-surface-2 border border-arca-border rounded-xl text-sm"
            >
              <option value="" disabled>Selecciona una cuenta</option>
              {accountOptions.map((account) => (
                <option key={account.id} value={account.id}>{account.label}</option>
              ))}
            </select>
          </Field>
          <Field label="Fecha">
            <input name="date" readOnly={isLinkedMovement} type="date" defaultValue={item.dateInputValue} className={`w-full h-11 px-3 bg-arca-surface-2 border border-arca-border rounded-xl text-sm ${lockedFieldClass}`} />
          </Field>
          {errorMessage ? (
            <p role="alert" className="rounded-xl border border-arca-alert/30 bg-arca-alert/10 px-3 py-2 text-xs text-arca-alert">
              {errorMessage}
            </p>
          ) : null}
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="px-4 h-11 rounded-xl border border-arca-border text-sm text-arca-text-dim">
              Cerrar
            </button>
            <button type="submit" disabled={isPending} className="px-4 h-11 rounded-xl bg-arca-accent text-white text-sm font-semibold disabled:opacity-50">
              {isPending ? 'Guardando…' : 'Guardar'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="space-y-2">
      <span className="text-[10px] font-bold text-arca-text-dim uppercase tracking-widest">{label}</span>
      {children}
    </label>
  );
}
