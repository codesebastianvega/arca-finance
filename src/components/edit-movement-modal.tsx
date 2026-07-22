import { useState, useTransition, ReactNode } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { X } from "lucide-react";
import { updateManualTransaction } from "@/app/actions";

const CONTROL_CLASS = "h-11 w-full rounded-xl border border-arca-border bg-arca-surface-1 px-4 text-sm font-bold text-arca-text-primary focus:border-arca-accent focus:outline-none";

export function EditMovementModal({ 
  accountOptions, 
  item, 
  onClose 
}: { 
  accountOptions: { id: string, label: string }[]; 
  item: any; 
  onClose: () => void 
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const isLinkedMovement = Boolean(item.sourceType && item.sourceType !== 'manual');
  const lockedFieldClass = isLinkedMovement ? 'cursor-not-allowed opacity-60' : '';

  return (
    <div className="fixed inset-0 z-[680] flex items-start justify-center overflow-y-auto bg-black/80 p-4 backdrop-blur-sm sm:items-center sm:p-6">
      <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className="card-arca max-h-[calc(100dvh-2rem)] w-full max-w-md overflow-y-auto p-5 sm:p-6">
        <div className="flex items-center justify-between"><h3 className="text-lg font-black text-arca-text-primary">Editar movimiento</h3><button type="button" onClick={onClose} aria-label="Cerrar" className="text-arca-text-dim"><X size={18} /></button></div>
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
                category: String(form.get('category') ?? ''), 
                unit: String(form.get('unit') ?? ''), 
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
          <Field label="Concepto"><input name="concept" defaultValue={item.concept || ''} placeholder="Ej. Pago Codensa, Mercado, etc." className={CONTROL_CLASS} /></Field>
          <Field label="Valor"><input name="amount" type="number" min="0" step="1" defaultValue={item.amount} className={CONTROL_CLASS} /></Field>
          <Field label="Categoría">
            <select 
              name="category" 
              defaultValue={
                item.category === 'debt_payment' ? 'deudas' : 
                item.category === 'card_payment' ? 'tarjetas' : 
                item.category ?? 'otros'
              } 
              className={CONTROL_CLASS}
            >
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
              {item.category && !['deudas', 'debt_payment', 'tarjetas', 'card_payment', 'comida', 'servicios', 'hogar', 'transporte', 'ocio', 'salud', 'educacion', 'otros'].includes(item.category.toLowerCase()) && (
                <option value={item.category}>{item.category}</option>
              )}
            </select>
          </Field>
          <Field label="Unidad"><input name="unit" defaultValue={item.unit || 'Personal'} placeholder="Ej. Personal, Trabajo" className={CONTROL_CLASS} /></Field>
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
          <Field label="Fecha"><input name="date" type="date" defaultValue={item.dateInputValue ?? item.date?.split('T')[0]} className={CONTROL_CLASS} /></Field>
          {errorMessage ? <p role="alert" className="rounded-xl border border-arca-alert/30 bg-arca-alert/10 px-3 py-2 text-xs text-arca-alert">{errorMessage}</p> : null}
          <div className="flex justify-end gap-3 pt-2"><button type="button" onClick={onClose} className="h-11 rounded-xl border border-arca-border px-4 text-sm text-arca-text-dim">Cerrar</button><button type="submit" disabled={isPending} className="h-11 rounded-xl bg-arca-accent px-4 text-sm font-black text-black disabled:opacity-50">{isPending ? 'Guardando…' : 'Guardar'}</button></div>
        </form>
      </motion.div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return <label className="grid gap-2"><span className="text-[10px] font-bold uppercase tracking-widest text-arca-text-dim">{label}</span>{children}</label>;
}
