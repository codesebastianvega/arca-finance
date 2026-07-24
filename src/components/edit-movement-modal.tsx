import { useState, useTransition, ReactNode } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { X } from "lucide-react";
import { updateManualTransaction } from "@/app/actions";

const CONTROL_CLASS = "h-11 w-full rounded-xl border border-arca-border bg-arca-surface-1 px-4 text-sm font-bold text-arca-text-primary focus:border-arca-accent focus:outline-none appearance-none";

export function EditMovementModal({ 
  accountOptions,
  categoryOptions, 
  unitOptions = [],
  incomeSources = [],
  item, 
  onClose 
}: { 
  accountOptions: { id: string, label: string }[];
  categoryOptions?: { id: string, label: string, value: string }[];
  unitOptions?: { id: string, label: string, value: string }[];
  incomeSources?: { id: string, label: string, unitKey: string }[];
  item: any; 
  onClose: () => void 
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const initialUnit = (() => {
    const raw = String(item.unit || '').trim().toLowerCase();
    if (!raw || raw === 'personal' || raw === 'general' || raw.startsWith('personal-')) return 'general';
    const match = unitOptions.find(u => u.value.toLowerCase() === raw || u.label.toLowerCase() === raw || u.value.toLowerCase().replace(/[-_]/g, '') === raw.replace(/[-_]/g, ''));
    return match ? match.value : raw;
  })();

  const [selectedUnit, setSelectedUnit] = useState(initialUnit);
  const [selectedSourceId, setSelectedSourceId] = useState(String(item.sourceId || item.source_id || ''));
  const isIncome = String(item.kind).toLowerCase() === 'income';

  const filteredSources = incomeSources.filter(s => s.unitKey === selectedUnit);

  return (
    <div className="fixed inset-0 z-[680] flex items-start justify-center overflow-y-auto bg-black/80 p-4 backdrop-blur-sm sm:items-center sm:p-6">
      <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className="card-arca max-h-[calc(100dvh-2rem)] w-full max-w-md overflow-y-auto p-5 sm:p-6">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-black text-arca-text-primary">Editar movimiento</h3>
          <button type="button" onClick={onClose} aria-label="Cerrar" className="text-arca-text-dim hover:text-arca-text-primary"><X size={18} /></button>
        </div>
        
        <form className="mt-5 grid gap-3" onSubmit={(event) => {
          event.preventDefault();
          const form = new FormData(event.currentTarget);
          startTransition(async () => {
            setErrorMessage(null);
            try {
              await updateManualTransaction({ 
                id: item.id, 
                concept: String(form.get('concept') ?? ''), 
                amount: Number(form.get('amount') ?? 0), 
                category: isIncome ? 'Ingreso' : String(form.get('category') ?? 'general'), 
                unit: String(form.get('unit') ?? 'general'), 
                sourceId: String(form.get('sourceId') ?? '') || null,
                date: String(form.get('date') ?? ''), 
                accountId: String(form.get('accountId') ?? '') 
              });
              router.refresh();
              onClose();
            } catch (error) {
              setErrorMessage(error instanceof Error ? error.message : 'No se pudo actualizar el movimiento.');
            }
          });
        }}>
          <Field label="Concepto">
            <input name="concept" defaultValue={item.concept || ''} placeholder="Ej. Pago Codensa, Pan de azúcar, etc." className={CONTROL_CLASS} />
          </Field>
          
          <Field label="Valor">
            <input name="amount" type="number" min="0" step="1" defaultValue={item.amount} className={CONTROL_CLASS} />
          </Field>
          
          <Field label="Categoría">
            {isIncome ? (
              <div className="relative">
                <input type="hidden" name="category" value="Ingreso" />
                <div className={`${CONTROL_CLASS} flex items-center bg-arca-surface-2 text-arca-positive font-bold`}>
                  Ingreso
                </div>
              </div>
            ) : (
              <select 
                name="category" 
                defaultValue={
                  item.category === 'debt_payment' ? 'deudas' : 
                  item.category === 'card_payment' ? 'tarjetas' : 
                  item.category ?? 'otros'
                } 
                className={CONTROL_CLASS}
              >
                {categoryOptions ? (
                  <>
                    {categoryOptions.map((opt) => (
                      <option key={opt.id} value={opt.value}>{opt.label}</option>
                    ))}
                    {item.category && !['debt_payment', 'card_payment'].includes(item.category) && !categoryOptions.some(c => c.value.toLowerCase() === item.category.toLowerCase()) && (
                      <option value={item.category}>{item.category}</option>
                    )}
                  </>
                ) : (
                  <>
                    <option value="deudas">Deudas</option>
                    <option value="tarjetas">Tarjetas</option>
                    <option value="comida">Comida</option>
                    <option value="servicios">Servicios</option>
                    <option value="hogar">Hogar</option>
                    <option value="transporte">Transporte</option>
                    <option value="ocio">Ocio</option>
                    <option value="salud">Salud</option>
                    <option value="educacion">Educación</option>
                    <option value="otros">Otros</option>
                  </>
                )}
              </select>
            )}
          </Field>

          <Field label="Proyecto / Unidad">
            <select
              name="unit"
              value={selectedUnit}
              onChange={(e) => {
                setSelectedUnit(e.target.value);
                setSelectedSourceId('');
              }}
              className={CONTROL_CLASS}
            >
              <option value="general">Personal</option>
              {unitOptions.map((unit) => (
                <option key={unit.id} value={unit.value}>{unit.label}</option>
              ))}
            </select>
          </Field>

          {filteredSources.length > 0 && (
            <Field label="Fuente / Canal de Ingreso">
              <select
                name="sourceId"
                value={selectedSourceId}
                onChange={(e) => setSelectedSourceId(e.target.value)}
                className={CONTROL_CLASS}
              >
                <option value="">Ninguna (Sin fuente específica)</option>
                {filteredSources.map((source) => (
                  <option key={source.id} value={source.id}>{source.label}</option>
                ))}
              </select>
            </Field>
          )}

          <Field label="Cuenta o banco">
            <select 
              name="accountId" 
              required 
              defaultValue={item.accountId ?? item.account_id ?? accountOptions[0]?.id ?? ''} 
              className={CONTROL_CLASS}
            >
              <option value="" disabled>Selecciona una cuenta</option>
              {accountOptions.map((account) => (
                <option key={account.id} value={account.id}>{account.label}</option>
              ))}
            </select>
          </Field>

          <Field label="Fecha">
            <input name="date" type="date" defaultValue={item.dateInputValue ?? item.date?.split('T')[0]} className={CONTROL_CLASS} />
          </Field>

          {errorMessage ? <p role="alert" className="rounded-xl border border-arca-alert/30 bg-arca-alert/10 px-3 py-2 text-xs text-arca-alert">{errorMessage}</p> : null}

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="h-11 rounded-xl border border-arca-border px-4 text-sm text-arca-text-dim">Cerrar</button>
            <button type="submit" disabled={isPending} className="h-11 rounded-xl bg-arca-accent px-4 text-sm font-black text-black disabled:opacity-50">{isPending ? 'Guardando…' : 'Guardar'}</button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return <label className="grid gap-2"><span className="text-[10px] font-bold uppercase tracking-widest text-arca-text-dim">{label}</span>{children}</label>;
}
