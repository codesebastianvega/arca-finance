"use client";

import { useState, useTransition } from "react";
import { CheckCircle2, AlertTriangle, RefreshCw, X } from "lucide-react";
import { haptics } from "@/src/lib/haptics";
import type { TodayReceivable } from "@/src/lib/today-data";
import { resolveReceivable } from "@/app/actions";

interface ReceivableActionModalProps {
  receivable: TodayReceivable | null;
  accounts: { id: string; label: string }[];
  onClose: () => void;
  onRefresh: () => void;
}

export function ReceivableActionModal({ receivable, accounts, onClose, onRefresh }: ReceivableActionModalProps) {
  const [isPending, startTransition] = useTransition();
  const [mode, setMode] = useState<"menu" | "pay">("menu");
  const [payAmount, setPayAmount] = useState<string>("");
  const [selectedAccountId, setSelectedAccountId] = useState<string>("");

  if (!receivable) return null;

  const handlePayInit = () => {
    haptics.medium();
    setPayAmount(receivable.amount.toString());
    setMode("pay");
  };

  const handlePayConfirm = () => {
    const amount = Number(payAmount);
    if (!selectedAccountId) {
      alert("Debes seleccionar una cuenta a donde ingresará el dinero.");
      return;
    }
    if (isNaN(amount) || amount <= 0) {
      alert("Por favor ingresa un monto válido mayor a 0");
      return;
    }
    haptics.success();
    startTransition(async () => {
      try {
        await resolveReceivable(receivable.id, {
          action: "pay",
          amount,
          accountId: selectedAccountId,
        });
        onRefresh();
        onClose();
        setMode("menu");
      } catch (e) {
        alert(e instanceof Error ? e.message : "Error al registrar el pago");
      }
    });
  };

  const handleCancelReceivable = () => {
    if (!confirm("¿Seguro que quieres cancelar (condonar o borrar) este préstamo? No se generará ningún ingreso.")) return;
    haptics.success();
    startTransition(async () => {
      try {
        await resolveReceivable(receivable.id, { action: "cancel" });
        onRefresh();
        onClose();
        setMode("menu");
      } catch (e) {
        alert(e instanceof Error ? e.message : "Error al cancelar");
      }
    });
  };

  const handlePostpone = () => {
    // For simplicity, postpone by 7 days.
    haptics.medium();
    startTransition(async () => {
      try {
        await resolveReceivable(receivable.id, { action: "postpone", days: 7 });
        onRefresh();
        onClose();
        setMode("menu");
      } catch (e) {
        alert(e instanceof Error ? e.message : "Error al posponer");
      }
    });
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-end justify-center p-4">
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200" onClick={onClose} />
        
        {mode === "menu" ? (
          <div className="relative z-10 w-full max-w-sm bg-arca-base light:bg-arca-light-base rounded-3xl p-6 shadow-2xl border border-arca-border/20 slide-up">
            <div className="w-12 h-1 bg-arca-border/40 mx-auto rounded-full mb-6" />
            <h3 className="text-lg font-bold text-center text-white mb-1">Préstamo: {receivable.debtorName || receivable.title}</h3>
            <p className="text-sm text-center text-arca-text-secondary font-bold mb-6">
              Saldo: ${new Intl.NumberFormat("es-CO").format(receivable.amount)}
            </p>

            <div className="flex flex-col gap-3">
              <button 
                onClick={handlePayInit} 
                className="w-full py-4 rounded-xl bg-arca-positive hover:brightness-110 font-bold text-white transition-all flex items-center justify-center shadow-lg shadow-arca-positive/20"
              >
                <CheckCircle2 size={18} className="mr-2" />
                Registrar Pago
              </button>
              <button 
                onClick={handlePostpone}
                disabled={isPending}
                className="w-full py-4 rounded-xl bg-arca-surface-2 hover:bg-arca-surface-3 border border-arca-border font-bold text-white transition-all flex items-center justify-center disabled:opacity-50"
              >
                Posponer (7 días)
              </button>
              <button 
                onClick={handleCancelReceivable} 
                disabled={isPending}
                className="w-full py-4 rounded-xl bg-arca-alert/10 hover:bg-arca-alert/20 border border-arca-alert/30 font-bold text-arca-alert transition-all flex items-center justify-center disabled:opacity-50"
              >
                <AlertTriangle size={18} className="mr-2" />
                Condonar / Cancelar
              </button>
              <button 
                onClick={onClose} 
                className="w-full py-4 rounded-xl bg-transparent font-bold text-arca-text-dim hover:text-white transition-all mt-2"
              >
                Cerrar
              </button>
            </div>
          </div>
        ) : (
          <div className="relative z-10 w-full max-w-sm bg-arca-surface-1 light:bg-arca-light-surface-1 rounded-3xl p-6 shadow-2xl border border-arca-border/50 animate-in zoom-in-95 duration-200">
            <button onClick={() => setMode("menu")} className="absolute top-4 right-4 text-arca-text-secondary hover:text-white">
              <X size={20} />
            </button>
            <div className="w-12 h-12 rounded-full bg-arca-positive/20 flex items-center justify-center mx-auto mb-4 mt-2">
              <CheckCircle2 size={24} className="text-arca-positive" />
            </div>
            <h3 className="text-lg font-bold text-center text-white mb-1">Registrar Pago</h3>
            <p className="text-sm text-center text-arca-positive font-bold mb-4">
              De: {receivable.debtorName || receivable.title}
            </p>
            
            <div className="mb-4">
              <label className="text-[10px] uppercase tracking-widest text-arca-text-secondary font-bold mb-2 block">Monto a abonar</label>
              <div className="relative flex items-center bg-arca-surface-2 light:bg-arca-light-surface-2 border border-arca-border/40 rounded-xl px-4 py-1 focus-within:border-arca-positive transition-colors">
                <input 
                  type="text" 
                  inputMode="numeric"
                  value={payAmount ? new Intl.NumberFormat("es-CO").format(Number(payAmount)) : ""}
                  onChange={(e) => {
                    const rawValue = e.target.value.replace(/\D/g, "");
                    setPayAmount(rawValue);
                  }}
                  className="w-full bg-transparent text-white font-bold text-lg py-2 focus:outline-none placeholder:text-arca-text-dim text-right pr-2"
                  placeholder="0"
                />
                <span className="text-arca-text-dim font-bold text-xs ml-2">COP</span>
              </div>
              <span className="text-[10px] text-arca-text-dim mt-2 block text-center">Puedes ingresar un monto menor para pagos parciales.</span>
            </div>

            <div className="mb-6">
              <label className="text-[10px] uppercase tracking-widest text-arca-text-secondary font-bold mb-2 block">¿A qué cuenta ingresó?</label>
              <select 
                value={selectedAccountId}
                onChange={e => setSelectedAccountId(e.target.value)}
                className="w-full bg-arca-surface-2 border border-arca-border/40 rounded-xl p-3 text-white font-bold appearance-none outline-none focus:border-arca-positive"
              >
                <option value="" disabled>Selecciona una cuenta</option>
                {accounts.map(acc => (
                  <option key={acc.id} value={acc.id}>{acc.label}</option>
                ))}
              </select>
            </div>

            <button 
              onClick={handlePayConfirm}
              disabled={isPending}
              className="w-full py-4 rounded-xl font-bold text-sm bg-arca-positive text-white hover:brightness-110 active:scale-95 transition-all shadow-lg shadow-arca-positive/20 flex items-center justify-center disabled:opacity-50"
            >
              {isPending ? (
                <RefreshCw size={18} className="animate-spin" />
              ) : (
                "Confirmar Pago"
              )}
            </button>
          </div>
        )}
      </div>
    </>
  );
}
