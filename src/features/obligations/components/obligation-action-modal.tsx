"use client";

import { useState, useTransition, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { AlertCircle, CheckCircle2, CircleSlash2, PencilLine, X, MoreVertical, Building2, Calendar, FileText, AlertTriangle } from "lucide-react";
import { adjustAndConfirmScheduledEvent, cancelScheduledEvent, updateScheduledObligation, cancelIncomeTemplate } from "@/app/actions";
import { canEditObligation } from "@/src/lib/obligations-types";
import type { ObligationItem } from "@/src/lib/obligations-types";
import { haptics } from "@/src/lib/haptics";
import { useRouter } from "next/navigation";

interface ObligationActionModalProps {
  obligation: ObligationItem | null;
  accounts: { id: string; label: string }[];
  onClose: () => void;
  onRefresh: () => void;
}

export function ObligationActionModal({
  obligation,
  accounts,
  onClose,
  onRefresh,
}: ObligationActionModalProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [actionError, setActionError] = useState<string | null>(null);
  
  const [showOptions, setShowOptions] = useState(false);
  const [isEditingAmount, setIsEditingAmount] = useState(false);
  const [isEditingDate, setIsEditingDate] = useState(false);
  const [isEditingAccount, setIsEditingAccount] = useState(false);
  const [isFullEditMode, setIsFullEditMode] = useState(false);
  
  const [adjustAmount, setAdjustAmount] = useState("");
  const [adjustDate, setAdjustDate] = useState("");
  const [adjustAccountId, setAdjustAccountId] = useState("");
  
  const [editTitle, setEditTitle] = useState("");
  const [editNotes, setEditNotes] = useState("");

  useEffect(() => {
    if (obligation) {
      setActionError(null);
      setIsEditingAmount(false);
      setIsEditingDate(false);
      setIsEditingAccount(false);
      setIsFullEditMode(false);
      setShowOptions(false);
      
      setAdjustAmount(String(obligation.amount));
      setAdjustDate(new Date().toLocaleDateString("en-CA", { timeZone: "America/Bogota" }));
      setAdjustAccountId(obligation.accountId ?? obligation.suggestedAccountId ?? accounts[0]?.id ?? "");
      setEditTitle(obligation.name);
      setEditNotes(obligation.notes ?? "");
    }
  }, [obligation, accounts]);

  if (!obligation) return null;

  const handleCancel = () => {
    setActionError(null);
    startTransition(async () => {
      try {
        await cancelScheduledEvent(obligation.id);
        haptics.success();
        onRefresh();
        onClose();
      } catch (error) {
        setActionError(error instanceof Error ? error.message : "No se pudo cancelar la obligación.");
        haptics.error();
      }
    });
  };

  const handleCancelTemplate = () => {
    if (!obligation.templateId) return;
    if (!confirm("¿Seguro que quieres finalizar este contrato/plantilla? Ya no se generarán más de estos eventos en el futuro.")) return;
    
    setActionError(null);
    startTransition(async () => {
      try {
        await cancelIncomeTemplate(obligation.templateId!);
        haptics.success();
        onRefresh();
        onClose();
      } catch (error) {
        setActionError(error instanceof Error ? error.message : "No se pudo finalizar el contrato.");
        haptics.error();
      }
    });
  };

  const handleAdjustConfirm = () => {
    setActionError(null);
    startTransition(async () => {
      try {
        await adjustAndConfirmScheduledEvent({
          eventId: obligation.id,
          amount: Number(adjustAmount),
          effectiveDate: adjustDate,
          accountId: adjustAccountId || undefined,
        });
        haptics.success();
        onRefresh();
        onClose();
      } catch (error) {
        setActionError(error instanceof Error ? error.message : "No se pudo confirmar el pago.");
        haptics.error();
      }
    });
  };

  const handleEditDetails = () => {
    if (!canEditObligation(obligation)) {
      setActionError("Esta obligación está agrupada. Debes editarla individualmente.");
      return;
    }
    window.dispatchEvent(new CustomEvent("open-register", { 
      detail: { 
        segment: obligation.kind === 'income' ? 'Ingreso' : 'Movimiento', 
        type: obligation.kind === 'income' ? 'ingreso' : 'gasto',
        prefill: {
          id: obligation.id,
          title: obligation.name,
          amount: obligation.amount,
          date: obligation.dueDate,
          notes: obligation.notes,
          account_id: obligation.accountId
        }
      } 
    }));
    onClose();
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
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${obligation.kind === 'income' ? 'bg-arca-positive/10 text-arca-positive' : 'bg-arca-alert/10 text-arca-alert'}`}>
              {obligation.kind === 'income' ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}
            </div>
            <div>
              <p className="text-[10px] font-bold text-arca-text-dim uppercase tracking-widest">
                {obligation.groupedOccurrences > 1
                  ? `${obligation.groupedOccurrences} ocurrencias`
                  : obligation.kind === 'income' ? 'Ingreso programado' : 'Pago pendiente'}
              </p>
              <h3 className="text-lg font-bold text-arca-text-primary light:text-arca-light-text-primary line-clamp-1">{obligation.name}</h3>
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
                    onClick={handleEditDetails}
                    className="w-full px-4 py-3 text-sm font-bold text-left text-arca-text-primary hover:bg-arca-surface-2 transition-colors flex items-center gap-2 border-b border-arca-border"
                  >
                    <PencilLine size={16} /> Editar detalles
                  </button>
                  <button 
                    onClick={handleCancel}
                    className="w-full px-4 py-3 text-sm font-bold text-left text-arca-alert hover:bg-arca-alert/10 transition-colors flex items-center gap-2 border-b border-arca-border"
                  >
                    <CircleSlash2 size={16} /> Omitir pago
                  </button>
                  {obligation.templateId && (
                    <button 
                      onClick={handleCancelTemplate}
                      className="w-full px-4 py-3 text-sm font-bold text-left text-arca-alert hover:bg-arca-alert/10 transition-colors flex items-center gap-2"
                    >
                      <AlertTriangle size={16} /> Finalizar contrato
                    </button>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* HERO AMOUNT */}
        <div className="py-4 text-center relative group">
          <span className="text-[10px] font-bold text-arca-text-dim uppercase tracking-widest block mb-1">Monto a {obligation.kind === 'income' ? 'recibir' : 'pagar'}</span>
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
              <div className="w-6 h-6 rounded-full bg-arca-surface-2 flex items-center justify-center text-arca-text-dim group-hover:text-arca-accent transition-colors">
                <PencilLine size={12} />
              </div>
            </div>
          )}
          {Number(adjustAmount) !== obligation.amount && (
            <span className="text-xs font-medium text-arca-accent block mt-2">Monto modificado (Original: {formatCOP(obligation.amount)})</span>
          )}
        </div>

        {/* TICKET DETAILS */}
        <div className="bg-arca-surface-1 border border-arca-border rounded-2xl p-4 space-y-4">
          
          <div className="flex justify-between items-center group">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-arca-surface-2 flex items-center justify-center text-arca-text-dim">
                <Calendar size={14} />
              </div>
              <span className="text-sm font-medium text-arca-text-secondary">Fecha de pago</span>
            </div>
            {isEditingDate ? (
              <input
                type="date"
                value={adjustDate}
                onChange={(e) => setAdjustDate(e.target.value)}
                onBlur={() => setIsEditingDate(false)}
                autoFocus
                className="bg-arca-surface-2 border border-arca-border rounded-lg px-2 py-1 text-sm font-bold text-arca-text-primary focus:outline-none focus:border-arca-accent"
              />
            ) : (
              <div 
                className="flex items-center gap-2 cursor-pointer hover:text-arca-accent transition-colors"
                onClick={() => { haptics.light(); setIsEditingDate(true); }}
              >
                <span className="text-sm font-bold text-arca-text-primary light:text-arca-light-text-primary">{adjustDate === new Date().toLocaleDateString("en-CA", { timeZone: "America/Bogota" }) ? "Hoy" : adjustDate}</span>
                <PencilLine size={12} className="text-arca-text-dim group-hover:text-arca-accent" />
              </div>
            )}
          </div>

          <div className="h-[1px] w-full bg-arca-border/50" />

          <div className="flex justify-between items-center group">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-arca-surface-2 flex items-center justify-center text-arca-text-dim">
                <Building2 size={14} />
              </div>
              <span className="text-sm font-medium text-arca-text-secondary">Cuenta origen</span>
            </div>
            {isEditingAccount ? (
              <select
                value={adjustAccountId}
                onChange={(e) => { setAdjustAccountId(e.target.value); setIsEditingAccount(false); }}
                onBlur={() => setIsEditingAccount(false)}
                autoFocus
                className="bg-arca-surface-2 border border-arca-border rounded-lg px-2 py-1 text-sm font-bold text-arca-text-primary focus:outline-none focus:border-arca-accent max-w-[140px] truncate"
              >
                {accounts.map(acc => (
                  <option key={acc.id} value={acc.id}>{acc.label}</option>
                ))}
              </select>
            ) : (
              <div 
                className="flex items-center gap-2 cursor-pointer hover:text-arca-accent transition-colors max-w-[160px]"
                onClick={() => { haptics.light(); setIsEditingAccount(true); }}
              >
                <span className="text-sm font-bold text-arca-text-primary light:text-arca-light-text-primary truncate">{accounts.find(a => a.id === adjustAccountId)?.label || "Seleccionar..."}</span>
                <PencilLine size={12} className="text-arca-text-dim group-hover:text-arca-accent shrink-0" />
              </div>
            )}
          </div>
          
          {obligation.notes && (
            <>
              <div className="h-[1px] w-full bg-arca-border/50" />
              <div className="flex gap-3 items-start">
                <div className="w-8 h-8 shrink-0 rounded-full bg-arca-surface-2 flex items-center justify-center text-arca-text-dim mt-1">
                  <FileText size={14} />
                </div>
                <div>
                  <span className="text-[10px] font-bold text-arca-text-dim uppercase tracking-widest block mb-1">Notas</span>
                  <p className="text-xs text-arca-text-secondary">{obligation.notes}</p>
                </div>
              </div>
            </>
          )}
        </div>

        {actionError && (
          <div className="p-3 bg-arca-alert/10 border border-arca-alert/20 rounded-xl text-xs text-arca-alert flex items-start gap-2">
            <AlertCircle size={14} className="shrink-0 mt-0.5" />
            <p>{actionError}</p>
          </div>
        )}

        {/* MAIN ACTION BUTTON */}
        <div className="pt-2">
          <button
            onClick={handleAdjustConfirm}
            disabled={isPending}
            className={`w-full h-16 rounded-2xl font-bold uppercase tracking-widest text-sm shadow-xl flex items-center justify-center transition-all disabled:opacity-60 active:scale-95 ${
              obligation.kind === 'income' 
                ? 'bg-arca-positive text-white shadow-arca-positive/20 hover:brightness-110' 
                : 'bg-arca-accent text-white shadow-arca-accent/20 hover:brightness-110'
            }`}
          >
            {isPending ? "Procesando..." : `Confirmar ${obligation.kind === 'income' ? 'Ingreso' : 'Pago'}`}
          </button>
        </div>

      </motion.div>
    </div>
  );
}
