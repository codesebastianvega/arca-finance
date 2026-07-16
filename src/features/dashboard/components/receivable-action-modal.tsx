"use client";

import { useState, useTransition, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { CheckCircle2, AlertTriangle, X, MoreVertical, Building2, PencilLine, CircleSlash2, Clock } from "lucide-react";
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
  const [actionError, setActionError] = useState<string | null>(null);
  
  const [showOptions, setShowOptions] = useState(false);
  const [isEditingAmount, setIsEditingAmount] = useState(false);
  const [isEditingAccount, setIsEditingAccount] = useState(false);
  
  const [adjustAmount, setAdjustAmount] = useState("");
  const [adjustAccountId, setAdjustAccountId] = useState("");

  useEffect(() => {
    if (receivable) {
      setActionError(null);
      setIsEditingAmount(false);
      setIsEditingAccount(false);
      setShowOptions(false);
      
      setAdjustAmount(String(receivable.amount));
      setAdjustAccountId(accounts[0]?.id ?? "");
    }
  }, [receivable, accounts]);

  if (!receivable) return null;

  const handlePayConfirm = () => {
    const amount = Number(adjustAmount);
    if (!adjustAccountId) {
      setActionError("Debes seleccionar una cuenta a donde ingresará el dinero.");
      return;
    }
    if (isNaN(amount) || amount <= 0) {
      setActionError("Por favor ingresa un monto válido mayor a 0");
      return;
    }
    
    setActionError(null);
    startTransition(async () => {
      try {
        await resolveReceivable(receivable.id, {
          action: "pay",
          amount,
          accountId: adjustAccountId,
        });
        haptics.success();
        onRefresh();
        onClose();
      } catch (e) {
        setActionError(e instanceof Error ? e.message : "Error al registrar el pago");
        haptics.error();
      }
    });
  };

  const handleCancelReceivable = () => {
    if (!confirm("¿Seguro que quieres cancelar (condonar o borrar) este préstamo? No se generará ningún ingreso.")) return;
    
    setActionError(null);
    startTransition(async () => {
      try {
        await resolveReceivable(receivable.id, { action: "cancel" });
        haptics.success();
        onRefresh();
        onClose();
      } catch (e) {
        setActionError(e instanceof Error ? e.message : "Error al cancelar");
        haptics.error();
      }
    });
  };

  const handlePostpone = () => {
    setActionError(null);
    startTransition(async () => {
      try {
        await resolveReceivable(receivable.id, { action: "postpone", days: 7 });
        haptics.medium();
        onRefresh();
        onClose();
      } catch (e) {
        setActionError(e instanceof Error ? e.message : "Error al posponer");
        haptics.error();
      }
    });
  };

  const formatCOP = (val: number | string) => {
    const num = Number(val);
    if (isNaN(num)) return "$0";
    return new Intl.NumberFormat("es-CO", {
      style: "currency",
      currency: "COP",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(num);
  };

  return (
    <div className="fixed inset-0 z-[550] flex items-end justify-center">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
      />
      <motion.div
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", damping: 25, stiffness: 300 }}
        className="relative w-full max-w-lg bg-arca-base light:bg-white rounded-t-[32px] p-6 space-y-6 pb-12 shadow-2xl slide-up"
      >
        <div className="w-12 h-1 bg-arca-border/40 mx-auto rounded-full mb-2" />
        
        {/* TOP BAR */}
        <div className="flex justify-between items-start relative">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-arca-positive/10 text-arca-positive">
              <CheckCircle2 size={20} />
            </div>
            <div>
              <p className="text-[10px] font-bold text-arca-text-dim uppercase tracking-widest">
                Préstamo a Cobrar
              </p>
              <h3 className="text-lg font-bold text-arca-text-primary light:text-arca-light-text-primary line-clamp-1">{receivable.debtorName || receivable.title}</h3>
            </div>
          </div>
          
          <div className="relative">
            <button 
              onClick={() => setShowOptions(!showOptions)}
              className="w-10 h-10 rounded-full flex items-center justify-center text-arca-text-dim hover:bg-arca-surface-2 transition-colors"
            >
              <MoreVertical size={20} />
            </button>

            <AnimatePresence>
              {showOptions && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: -10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: -10 }}
                  className="absolute right-0 top-12 w-48 bg-arca-surface-1 border border-arca-border rounded-xl shadow-xl overflow-hidden z-50"
                >
                  <button 
                    onClick={handlePostpone}
                    className="w-full px-4 py-3 text-sm font-bold text-left text-arca-text-primary hover:bg-arca-surface-2 transition-colors flex items-center gap-2 border-b border-arca-border"
                  >
                    <Clock size={16} /> Posponer (7 días)
                  </button>
                  <button 
                    onClick={handleCancelReceivable}
                    className="w-full px-4 py-3 text-sm font-bold text-left text-arca-alert hover:bg-arca-alert/10 transition-colors flex items-center gap-2"
                  >
                    <CircleSlash2 size={16} /> Condonar
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* HERO AMOUNT */}
        <div className="py-4 text-center relative group">
          <span className="text-[10px] font-bold text-arca-text-dim uppercase tracking-widest block mb-1">Monto a recibir</span>
          {isEditingAmount ? (
            <div className="flex justify-center items-center gap-2">
              <span className="text-2xl font-bold text-arca-text-dim">$</span>
              <input
                type="number"
                min="0"
                step="1000"
                value={adjustAmount}
                onChange={(e) => setAdjustAmount(e.target.value)}
                autoFocus
                onBlur={() => setIsEditingAmount(false)}
                className="w-48 bg-transparent text-4xl font-black text-center text-arca-text-primary focus:outline-none border-b-2 border-arca-accent pb-1"
              />
            </div>
          ) : (
            <div 
              className="inline-flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity"
              onClick={() => { haptics.light(); setIsEditingAmount(true); }}
            >
              <h1 className="text-5xl font-black text-arca-text-primary light:text-arca-light-text-primary tracking-tighter">
                {formatCOP(adjustAmount)}
              </h1>
              <div className="w-6 h-6 rounded-full bg-arca-surface-2 flex items-center justify-center text-arca-text-dim group-hover:text-arca-positive transition-colors">
                <PencilLine size={12} />
              </div>
            </div>
          )}
          {Number(adjustAmount) !== receivable.amount && (
            <span className="text-xs font-medium text-arca-positive block mt-2">Abono parcial (Original: {formatCOP(receivable.amount)})</span>
          )}
        </div>

        {/* TICKET DETAILS */}
        <div className="bg-arca-surface-1 border border-arca-border rounded-2xl p-4 space-y-4">
          <div className="flex justify-between items-center group">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-arca-surface-2 flex items-center justify-center text-arca-text-dim">
                <Building2 size={14} />
              </div>
              <span className="text-sm font-medium text-arca-text-secondary">Cuenta donde ingresa</span>
            </div>
            {isEditingAccount ? (
              <select
                value={adjustAccountId}
                onChange={(e) => { setAdjustAccountId(e.target.value); setIsEditingAccount(false); }}
                onBlur={() => setIsEditingAccount(false)}
                autoFocus
                className="bg-arca-surface-2 border border-arca-border rounded-lg px-2 py-1 text-sm font-bold text-arca-text-primary focus:outline-none focus:border-arca-positive max-w-[140px] truncate"
              >
                {accounts.map(acc => (
                  <option key={acc.id} value={acc.id}>{acc.label}</option>
                ))}
              </select>
            ) : (
              <div 
                className="flex items-center gap-2 cursor-pointer hover:text-arca-positive transition-colors max-w-[160px]"
                onClick={() => { haptics.light(); setIsEditingAccount(true); }}
              >
                <span className="text-sm font-bold text-arca-text-primary light:text-arca-light-text-primary truncate">{accounts.find(a => a.id === adjustAccountId)?.label || "Seleccionar..."}</span>
                <PencilLine size={12} className="text-arca-text-dim group-hover:text-arca-positive shrink-0" />
              </div>
            )}
          </div>
        </div>

        {actionError && (
          <div className="p-3 bg-arca-alert/10 border border-arca-alert/20 rounded-xl text-xs text-arca-alert flex items-start gap-2">
            <AlertTriangle size={14} className="shrink-0 mt-0.5" />
            <p>{actionError}</p>
          </div>
        )}

        {/* MAIN ACTION BUTTON */}
        <div className="pt-2">
          <button
            onClick={handlePayConfirm}
            disabled={isPending}
            className="w-full h-16 rounded-2xl font-bold uppercase tracking-widest text-sm bg-arca-positive text-white shadow-xl shadow-arca-positive/20 hover:brightness-110 flex items-center justify-center transition-all disabled:opacity-60 active:scale-95"
          >
            {isPending ? "Procesando..." : "Confirmar Ingreso"}
          </button>
        </div>

      </motion.div>
    </div>
  );
}
