"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, ArrowUpRight, ArrowDownLeft, Clock, AlertTriangle, Bell, Search, Send, RefreshCw, Target, Receipt, TrendingUp, AlertCircle } from "lucide-react";
import type { TodayViewModel, TodayReceivable } from "@/src/lib/today-data";
import { haptics } from "@/src/lib/haptics";
import { confirmScheduledEventNow, cancelScheduledEvent, cancelIncomeTemplate } from "@/app/actions";
import { ReceivableActionModal } from "./receivable-action-modal";

function formatCOP(amount: number | null | undefined): string {
  if (amount == null) return "$0";
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function cn(...classes: (string | undefined | null | false)[]) {
  return classes.filter(Boolean).join(" ");
}

export default function DecisionDashboard({ 
  data, 
  onOpenMovements,
  onOpenTransfer,
  onOpenObligations,
  onOpenRegister,
  onOpenBusiness,
  onOpenMonthPlan
}: { 
  data: TodayViewModel;
  onOpenMovements?: () => void;
  onOpenTransfer?: () => void;
  onOpenObligations?: () => void;
  onOpenRegister?: () => void;
  onOpenBusiness?: () => void;
  onOpenMonthPlan?: () => void;
}) {
  const { greeting, budget, metrics, cash, criticalPayments, receivables, upcomingIncomes, monthlyBudget } = data;
  const router = useRouter();
  const [isConfirming, startTransition] = useTransition();
  const [selectedIncome, setSelectedIncome] = useState<{id: string, title: string, amount: number} | null>(null);
  const [confirmAmount, setConfirmAmount] = useState<string>("");
  const [actionSheetIncome, setActionSheetIncome] = useState<{id: string, templateId?: string | null, title: string, amount: number} | null>(null);
  const [actionSheetReceivable, setActionSheetReceivable] = useState<TodayReceivable | null>(null);

  const limitedIncomes = upcomingIncomes.slice(0, 3);
  const hiddenIncomesCount = upcomingIncomes.length > 3 ? upcomingIncomes.length - 3 : 0;

  const handleOpenActionSheet = (income: {id: string, templateId?: string | null, title: string, amount: number}) => {
    haptics.medium();
    setActionSheetIncome(income);
  };

  const handleSelectConfirm = () => {
    if (!actionSheetIncome) return;
    haptics.medium();
    setSelectedIncome(actionSheetIncome);
    setConfirmAmount(actionSheetIncome.amount.toString());
    setActionSheetIncome(null);
  };

  const handleCancelThisPayment = () => {
    if (!actionSheetIncome) return;
    if (!confirm("¿Seguro que quieres cancelar este pago esperado?")) return;
    haptics.success();
    startTransition(async () => {
      try {
        await cancelScheduledEvent(actionSheetIncome.id);
        setActionSheetIncome(null);
        router.refresh();
      } catch (e) {
        console.error("Error al cancelar pago:", e);
      }
    });
  };

  const handleCancelTemplate = () => {
    if (!actionSheetIncome || !actionSheetIncome.templateId) return;
    if (!confirm("¿Seguro que quieres finalizar este contrato? No se generarán más proyecciones para este ingreso.")) return;
    haptics.success();
    startTransition(async () => {
      try {
        await cancelIncomeTemplate(actionSheetIncome.templateId!);
        setActionSheetIncome(null);
        router.refresh();
      } catch (e) {
        console.error("Error al cancelar contrato:", e);
      }
    });
  };

  const executeConfirm = () => {
    if (!selectedIncome) return;
    const finalAmount = Number(confirmAmount);
    if (isNaN(finalAmount) || finalAmount <= 0) {
      alert("Por favor ingresa un monto válido mayor a 0");
      return;
    }

    haptics.success();
    startTransition(async () => {
      try {
        await confirmScheduledEventNow(selectedIncome.id, finalAmount);
        setSelectedIncome(null);
        router.refresh();
      } catch (e) {
        console.error("Error al confirmar ingreso:", e);
      }
    });
  };

  return (
    <div className="flex flex-col gap-4 font-sans w-full">
      
      {/* Header */}
      <header className="flex justify-between items-center mb-4">
        <div>
          <p className="text-[10px] font-bold text-arca-text-dim light:text-arca-light-text-secondary uppercase tracking-[0.2em]">{greeting.dateLabel}</p>
          <h1 className="text-3xl font-black tracking-tighter text-arca-text-primary light:text-arca-light-text-primary">Hola, {greeting.firstName}</h1>
        </div>
        <div className="flex space-x-2">
          <button className="w-10 h-10 rounded-full bg-arca-surface-2 light:bg-arca-light-surface-2 border border-arca-border light:border-arca-light-border flex items-center justify-center">
            <Search size={18} className="text-arca-text-secondary light:text-arca-light-text-secondary" />
          </button>
          <button className="w-10 h-10 rounded-full bg-arca-surface-2 light:bg-arca-light-surface-2 border border-arca-border light:border-arca-light-border flex items-center justify-center relative">
            <Bell size={18} className="text-arca-text-secondary light:text-arca-light-text-secondary" />
            <span className="absolute top-2 right-2 w-2 h-2 bg-arca-alert light:bg-arca-light-alert rounded-full border-2 border-arca-base light:border-arca-light-base" />
          </button>
        </div>
      </header>

      {/* Onboarding Alert Card if no accounts exist */}
      {data.accountOptions.length === 0 && (
        <div 
          onClick={() => {
            haptics.medium();
            window.dispatchEvent(new CustomEvent("open-register", { detail: { segment: "Cuenta" } }));
          }}
          className="card-arca p-5 flex flex-col gap-3 cursor-pointer hover:bg-arca-surface-2/30 border-dashed border-arca-accent/40 bg-arca-accent/5 transition-all"
        >
          <div className="flex items-center gap-3 text-arca-accent">
            <AlertTriangle size={20} />
            <span className="text-xs font-bold uppercase tracking-wider">¡Bienvenido a Arca!</span>
          </div>
          <p className="text-xs text-arca-text-secondary leading-relaxed">
            Para empezar a controlar tu dinero y proyectar tu flujo de caja, necesitas registrar tu primera cuenta bancaria, billetera digital o efectivo.
          </p>
          <button className="h-11 w-full bg-arca-accent text-white text-xs font-bold rounded-xl uppercase tracking-widest shadow-lg shadow-arca-accent/20 hover:brightness-110 active:scale-95 transition-all">
            Crear mi primera cuenta
          </button>
        </div>
      )}

      {/* Quick Actions Horizontal List */}
      <section className="mb-4 overflow-x-auto no-scrollbar -mx-4 px-4 sm:mx-0 sm:px-0">
        <div className="flex space-x-4 min-w-max">
          {[
            { label: 'Gasto', icon: ArrowUpRight, color: 'bg-arca-alert light:bg-arca-light-alert', action: () => window.dispatchEvent(new CustomEvent("open-register", { detail: { segment: "Movimiento", type: 'gasto' } })) },
            { label: 'Ingreso', icon: ArrowDownLeft, color: 'bg-arca-positive light:bg-arca-light-positive', action: () => window.dispatchEvent(new CustomEvent("open-register", { detail: { segment: "Movimiento", type: 'ingreso' } })) },
            { label: 'Transferir', icon: RefreshCw, color: 'bg-arca-accent light:bg-arca-light-accent', action: () => window.dispatchEvent(new CustomEvent("open-register", { detail: { segment: "Transferencia" } })) },
            { label: 'Meta', icon: Target, color: 'bg-[#7CB342]', action: () => window.dispatchEvent(new CustomEvent("open-register", { detail: { segment: "Ahorro", goalType: "goal" } })) },
          ].map((action, i) => (
            <button 
              key={i}
              onClick={action.action}
              className="flex flex-col items-center space-y-2 group active:scale-95 transition-transform"
            >
              <div className={`w-14 h-14 ${action.color} rounded-2xl flex items-center justify-center shadow-lg group-hover:-translate-y-1 transition-transform`}>
                <action.icon size={24} className="text-white" />
              </div>
              <span className="text-[10px] font-bold uppercase tracking-widest text-arca-text-dim light:text-arca-light-text-secondary">{action.label}</span>
            </button>
          ))}
        </div>
      </section>

      {/* PRESUPUESTO MENSUAL */}
      <div className="flex flex-col gap-3">
        <div className="flex justify-between items-center px-1">
          <span className="text-[12px] font-bold tracking-wider text-arca-text-secondary light:text-arca-light-text-secondary">PRESUPUESTO DEL MES</span>
          <span className="text-[10px] font-bold text-arca-positive light:text-arca-light-positive uppercase cursor-pointer hover:opacity-80" onClick={onOpenMonthPlan}>
            {budget.hasBudget ? "LÍMITE DEFINIDO" : "CONFIGURAR"}
          </span>
        </div>
        <div className="relative overflow-hidden rounded-2xl p-4 border border-white/10 border-t-white/20 border-l-white/10 shadow-lg shadow-black/20 flex flex-col gap-3"
           style={{
             background: "linear-gradient(135deg, rgba(255,255,255,0.05) 0%, rgba(0,0,0,0.2) 100%)",
             backdropFilter: "blur(10px)"
           }}>
          
          {/* Decorative elements */}
          <div className="absolute -right-20 -top-20 w-40 h-40 bg-arca-positive rounded-full opacity-10 blur-3xl pointer-events-none"></div>
          <div className="absolute -left-20 -bottom-20 w-40 h-40 bg-arca-accent rounded-full opacity-10 blur-3xl pointer-events-none"></div>
          
          <div className="flex gap-4 relative z-10">
            {/* Ingresos (Left) */}
            <div className="flex-1 flex flex-col gap-1.5">
              <span className="text-[9px] font-bold text-arca-text-dim uppercase tracking-widest">INGRESOS</span>
              <div className="flex justify-between items-center text-xs">
                <span className="text-arca-text-secondary">Recibidos</span>
                <span className="font-semibold text-arca-positive drop-shadow-sm">{formatCOP(monthlyBudget.receivedIncomes)}</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-arca-text-secondary">Esperados</span>
                <span className="font-semibold text-arca-text-dim">{formatCOP(monthlyBudget.expectedIncomes)}</span>
              </div>
            </div>

            {/* Divider */}
            <div className="w-[1px] bg-arca-border/50 my-1"></div>

            {/* Gastos y Obligaciones (Right) */}
            <div className="flex-1 flex flex-col gap-1.5">
              <span className="text-[9px] font-bold text-arca-text-dim uppercase tracking-widest">OBLIGACIONES</span>
              <div className="flex justify-between items-center text-xs">
                <span className="text-arca-text-secondary">Pagadas</span>
                <span className="font-semibold text-arca-text-primary">{formatCOP(monthlyBudget.paidObligations)}</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-arca-text-secondary">Pendientes</span>
                <span className="font-semibold text-arca-text-dim">{formatCOP(monthlyBudget.pendingObligations)}</span>
              </div>
            </div>
          </div>

          <div className="w-full h-[1px] bg-arca-border/50 my-0.5 relative z-10"></div>
          
          {/* Proyección Total */}
          <div className="flex justify-between items-center font-bold relative z-10">
            <span className="text-xs text-arca-text-secondary">Proyección Total</span>
            <span className="text-base text-[#9CA88D] drop-shadow-sm tracking-tight">{formatCOP(monthlyBudget.receivedIncomes + monthlyBudget.expectedIncomes)}</span>
          </div>

          {/* Barra de Consumo de Límite (si hay presupuesto global) */}
          {budget.hasBudget && (
            <div className="flex flex-col gap-2 mt-2 pt-4 border-t border-arca-border/50">
              <div className="flex justify-between items-center text-[10px] font-bold text-arca-text-dim light:text-arca-light-text-secondary">
                <span>CONSUMIDO: {formatCOP(budget.consumed)}</span>
                <span>LÍMITE: {formatCOP(budget.limit)}</span>
              </div>
              <div className="h-1.5 w-full rounded-full bg-arca-surface-2 light:bg-arca-light-surface-2 overflow-hidden">
                <div 
                  className={cn("h-full", (budget.utilization ?? 0) > 90 ? "bg-arca-alert" : "bg-arca-positive")}
                  style={{ width: `${budget.utilization ?? 0}%` }}
                ></div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* TRES TARJETAS */}
      <div className="grid grid-cols-3 gap-3">
        {/* A TIEMPO */}
        <div onClick={onOpenObligations} 
             className="bg-arca-surface-1 light:bg-arca-light-surface-1 border border-arca-border/40 light:border-arca-light-border/60 rounded-2xl flex flex-col items-center justify-center py-3.5 px-2 cursor-pointer hover:bg-arca-surface-2 light:hover:bg-arca-light-surface-2 transition-colors shadow-sm">
          <CheckCircle2 size={16} className="text-arca-positive light:text-arca-light-positive mb-1" />
          <span className="text-lg font-black text-arca-text-primary light:text-arca-light-text-primary leading-none mb-1">{metrics.onTime}</span>
          <span className="text-[9px] font-bold tracking-wider text-arca-text-secondary light:text-arca-light-text-secondary uppercase">A Tiempo</span>
        </div>

        {/* ADELANTADOS */}
        <div onClick={onOpenObligations} 
             className="bg-arca-surface-1 light:bg-arca-light-surface-1 border border-arca-border/40 light:border-arca-light-border/60 rounded-2xl flex flex-col items-center justify-center py-3.5 px-2 cursor-pointer hover:bg-arca-surface-2 light:hover:bg-arca-light-surface-2 transition-colors shadow-sm">
          <ArrowUpRight size={16} className="text-arca-accent light:text-arca-light-accent mb-1" />
          <span className="text-lg font-black text-arca-text-primary light:text-arca-light-text-primary leading-none mb-1">{metrics.advanced}</span>
          <span className="text-[9px] font-bold tracking-wider text-arca-text-secondary light:text-arca-light-text-secondary uppercase">Adelantados</span>
        </div>

        {/* ATRASADOS */}
        <div onClick={onOpenObligations} 
             className="bg-arca-surface-1 light:bg-arca-light-surface-1 border border-arca-border/40 light:border-arca-light-border/60 rounded-2xl flex flex-col items-center justify-center py-3.5 px-2 cursor-pointer hover:bg-arca-surface-2 light:hover:bg-arca-light-surface-2 transition-colors shadow-sm">
          <Clock size={16} className="text-arca-alert light:text-arca-light-alert mb-1" />
          <span className="text-lg font-black text-arca-text-primary light:text-arca-light-text-primary leading-none mb-1">{metrics.late}</span>
          <span className="text-[9px] font-bold tracking-wider text-arca-text-secondary light:text-arca-light-text-secondary uppercase">Atrasados</span>
        </div>
      </div>
      {/* CAJA LIBRE (Credit Card Glass) */}
      <div className="relative overflow-hidden rounded-2xl p-5 border border-arca-border/50 shadow-lg"
           style={{
             background: "linear-gradient(135deg, rgba(255,255,255,0.05) 0%, rgba(0,0,0,0.2) 100%)",
             backdropFilter: "blur(10px)"
           }}>
        {/* Decorative elements */}
        <div className="absolute -right-10 -top-10 w-32 h-32 bg-arca-accent rounded-full opacity-20 blur-3xl"></div>
        <div className="absolute -left-10 -bottom-10 w-32 h-32 bg-arca-positive rounded-full opacity-20 blur-3xl"></div>
        
        <div className="flex justify-between items-start mb-6">
          <span className="text-[10px] font-bold tracking-widest text-arca-text-secondary/70 uppercase">Caja Libre</span>
          <div className="w-8 h-5 rounded bg-arca-surface-3 flex items-center justify-center opacity-70 border border-arca-border/30">
            <div className="w-4 h-3 border border-arca-border/40 rounded-sm"></div>
          </div>
        </div>
        
        <div className="mb-6 relative z-10">
          <div className="text-[10px] font-medium text-arca-text-secondary mb-1">Disponible para gastar</div>
          <div className={`text-4xl font-bold tracking-tight ${cash.safeToSpend > 0 ? "text-white" : "text-arca-alert"} drop-shadow-md`}>
            {formatCOP(cash.safeToSpend)}
          </div>
          {cash.totalLent > 0 && (
            <div className="text-[11px] text-arca-text-secondary mt-1">
              + {formatCOP(cash.totalLent)} prestados
            </div>
          )}
        </div>

        <div className="flex justify-between items-end border-t border-white/5 pt-3 relative z-10">
          <div className="flex flex-col gap-1">
            <span className="text-[11px] uppercase tracking-widest text-arca-text-secondary">Balance Total</span>
            <span className="text-sm font-bold text-white/90">{formatCOP(cash.totalBalance)}</span>
          </div>
          
          <div className="flex flex-col gap-1 items-end">
            <span className="text-[11px] uppercase tracking-widest text-arca-text-secondary">Bolsillos</span>
            <span className="text-sm font-bold text-arca-positive">{formatCOP(cash.protectedSavings)}</span>
          </div>
        </div>
      </div>
  
        {/* PAGOS CRITICOS */}
        <div className="flex flex-col gap-3 mt-4">
          <div className="flex justify-between items-center px-1">
            <div className="flex items-center gap-2 text-arca-accent light:text-arca-light-accent">
              <AlertCircle size={14} />
              <span className="text-[12px] font-bold tracking-wider">PAGOS CRÍTICOS</span>
            </div>
            <span className="text-[10px] font-bold tracking-wider text-arca-text-secondary light:text-arca-light-text-secondary">{criticalPayments.length} VISIBLES</span>
          </div>
          <div className="card-arca overflow-hidden flex flex-col">
            {criticalPayments.length > 0 ? (
              <div className="divide-y divide-arca-border light:divide-arca-light-border">
                {criticalPayments.map((p) => (
                  <div key={p.id} className="p-4 flex justify-between items-center group cursor-pointer hover:bg-arca-bg-secondary light:hover:bg-arca-light-bg-secondary transition-colors" onClick={() => onOpenObligations?.()}>
                    <div className="flex flex-col gap-1">
                      <span className="text-sm font-bold text-arca-text-primary light:text-arca-light-text-primary group-hover:text-arca-accent light:group-hover:text-arca-light-accent transition-colors">{p.title}</span>
                      {p.status === "overdue" ? (
                        <span className="text-[9px] font-bold tracking-widest text-white bg-arca-alert px-2 py-0.5 rounded-full uppercase self-start animate-pulse shadow-sm shadow-arca-alert/50">
                          URGENTE: {p.dueLabel}
                        </span>
                      ) : (
                        <span className={`text-[10px] font-bold ${p.status === "today" ? "text-arca-accent light:text-arca-light-accent" : "text-arca-text-secondary light:text-arca-light-text-secondary"}`}>{p.dueLabel}</span>
                      )}
                    </div>
                    <span className="text-sm font-bold text-arca-alert">-{formatCOP(p.amount)}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-5 flex items-center">
                <span className="text-sm text-arca-text-dim light:text-arca-light-text-secondary font-medium">No hay pagos críticos para mostrar.</span>
              </div>
            )}
          </div>
        </div>
  
        {/* PRESTAMOS A COBRAR */}
        <div className="flex flex-col gap-3 mt-2">
          <div className="flex justify-between items-center px-1">
            <div className="flex items-center gap-2 text-arca-accent light:text-arca-light-accent">
              <Receipt size={14} />
              <span className="text-[12px] font-bold tracking-wider">PRÉSTAMOS A COBRAR</span>
            </div>
            <span className="text-[10px] font-bold tracking-wider text-arca-text-secondary light:text-arca-light-text-secondary">{receivables.length} ABIERTOS</span>
          </div>
          <div className="card-arca overflow-hidden flex flex-col">
            {receivables.length > 0 ? (
              <div className="divide-y divide-arca-border light:divide-arca-light-border">
                {receivables.map((r) => (
                  <div key={r.id} className="p-4 flex justify-between items-center group cursor-pointer hover:bg-arca-bg-secondary light:hover:bg-arca-light-bg-secondary transition-colors" onClick={() => {
                    haptics.medium();
                    setActionSheetReceivable(r);
                  }}>
                    <div className="flex flex-col gap-1">
                      <span className="text-sm font-bold text-arca-text-primary light:text-arca-light-text-primary group-hover:text-arca-accent light:group-hover:text-arca-light-accent transition-colors">{r.debtorName || r.title}</span>
                      <span className={`text-[10px] font-bold ${r.status === "overdue" ? "text-arca-alert" : r.status === "today" ? "text-arca-accent light:text-arca-light-accent" : "text-arca-text-secondary light:text-arca-light-text-secondary"}`}>{r.dueLabel}</span>
                    </div>
                    <span className="text-sm font-bold text-arca-positive light:text-arca-light-positive">{formatCOP(r.amount)}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-5 flex items-center">
                <span className="text-sm text-arca-text-dim light:text-arca-light-text-secondary font-medium">Aún no hay cobros pendientes.</span>
              </div>
            )}
          </div>
        </div>

      {/* PRÓXIMOS INGRESOS */}
      <div className="flex flex-col gap-3 mt-2">
        <div className="flex justify-between items-center px-1">
          <span className="text-[12px] font-bold tracking-wider text-arca-positive light:text-arca-light-positive">PRÓXIMOS INGRESOS</span>
          <span className="text-[10px] font-bold tracking-wider text-arca-text-secondary light:text-arca-light-text-secondary">{limitedIncomes.length} VISIBLES</span>
        </div>
        <div className="card-arca overflow-hidden flex flex-col">
          {limitedIncomes.length > 0 ? (
            <>
              <div className="divide-y divide-arca-border light:divide-arca-light-border">
                {limitedIncomes.map((income) => (
                  <button
                    key={income.id}
                    disabled={isConfirming}
                    onClick={() => handleOpenActionSheet({id: income.id, templateId: income.templateId, title: income.title, amount: income.amount})}
                    className="w-full p-4 flex items-center justify-between hover:bg-arca-border/30 transition-colors text-left disabled:opacity-50"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-arca-positive/10 flex items-center justify-center">
                        <Target size={14} className="text-arca-positive" />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-sm text-arca-text-primary light:text-arca-light-text-primary font-semibold">{income.title}</span>
                        <span className="text-xs text-arca-text-dim light:text-arca-light-text-secondary">{income.dueLabel}</span>
                      </div>
                    </div>
                    <div className="flex flex-col text-right">
                      <span className="text-sm font-bold text-arca-positive">+{formatCOP(income.amount)}</span>
                    </div>
                  </button>
                ))}
              </div>
              {hiddenIncomesCount > 0 && (
                <button 
                  onClick={onOpenObligations}
                  className="w-full p-3 text-center bg-arca-surface-2/30 hover:bg-arca-surface-2/50 border-t border-arca-border/30 transition-colors"
                >
                  <span className="text-[10px] font-bold text-arca-text-dim uppercase tracking-widest">+ {hiddenIncomesCount} ingresos futuros</span>
                </button>
              )}
            </>
          ) : (
            <div className="p-5 flex items-center">
              <span className="text-sm text-arca-text-dim light:text-arca-light-text-secondary font-medium">No hay ingresos programados.</span>
            </div>
          )}
        </div>
      </div>

      {/* Custom Confirmation Modal */}
      {selectedIncome && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-sm bg-arca-surface-1 light:bg-arca-light-surface-1 rounded-3xl p-6 shadow-2xl border border-arca-border/50 animate-in zoom-in-95 duration-200">
            <div className="w-12 h-12 rounded-full bg-arca-positive/20 flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 size={24} className="text-arca-positive" />
            </div>
            <h3 className="text-lg font-bold text-center text-white mb-1">Confirmar Ingreso</h3>
            <p className="text-sm text-center text-arca-positive font-bold mb-4">
              {selectedIncome.title}
            </p>
            <div className="mb-6">
              <div className="relative flex items-center bg-arca-surface-2 light:bg-arca-light-surface-2 border border-arca-border/40 rounded-xl px-4 py-1 focus-within:border-arca-positive transition-colors">
                <input 
                  type="text" 
                  inputMode="numeric"
                  value={confirmAmount ? new Intl.NumberFormat("es-CO").format(Number(confirmAmount)) : ""}
                  onChange={(e) => {
                    const rawValue = e.target.value.replace(/\D/g, "");
                    setConfirmAmount(rawValue);
                  }}
                  className="w-full bg-transparent text-white font-bold text-lg py-2 focus:outline-none placeholder:text-arca-text-dim text-right pr-2"
                  placeholder="0"
                />
                <span className="text-arca-text-dim font-bold text-xs ml-2">COP</span>
              </div>
              <span className="text-[10px] text-arca-text-dim mt-2 block text-center">Ajusta el monto si recibiste un valor distinto.</span>
            </div>
            <div className="flex gap-3">
              <button 
                onClick={() => setSelectedIncome(null)} 
                disabled={isConfirming}
                className="flex-1 py-3.5 rounded-xl font-bold text-sm bg-arca-surface-2 light:bg-arca-light-surface-2 text-arca-text-secondary hover:brightness-110 active:scale-95 transition-all disabled:opacity-50"
              >
                Cancelar
              </button>
              <button 
                onClick={executeConfirm}
                disabled={isConfirming}
                className="flex-1 py-3.5 rounded-xl font-bold text-sm bg-arca-positive text-white hover:brightness-110 active:scale-95 transition-all shadow-lg shadow-arca-positive/20 flex items-center justify-center disabled:opacity-50"
              >
                {isConfirming ? (
                  <RefreshCw size={18} className="animate-spin" />
                ) : (
                  "Confirmar"
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Action Sheet para Próximos Ingresos */}
      {actionSheetIncome && (
        <div className="fixed inset-0 z-50 flex items-end justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setActionSheetIncome(null)} />
          <div className="relative z-10 w-full max-w-sm bg-arca-base light:bg-arca-light-base rounded-3xl p-6 shadow-2xl border border-arca-border/20 slide-up">
            <div className="w-12 h-1 bg-arca-border/40 mx-auto rounded-full mb-6" />
            <h3 className="text-lg font-bold text-center text-white mb-1">{actionSheetIncome.title}</h3>
            <p className="text-sm text-center text-arca-text-secondary font-bold mb-6">
              {formatCOP(actionSheetIncome.amount)}
            </p>

            <div className="flex flex-col gap-3">
              <button 
                onClick={handleSelectConfirm} 
                className="w-full py-4 rounded-xl bg-arca-surface-2 hover:bg-arca-surface-3 border border-arca-border font-bold text-white transition-all flex items-center justify-center"
              >
                <CheckCircle2 size={18} className="mr-2 text-arca-positive" />
                Confirmar / Editar Monto
              </button>
              <button 
                onClick={handleCancelThisPayment} 
                className="w-full py-4 rounded-xl bg-arca-surface-2 hover:bg-arca-surface-3 border border-arca-border font-bold text-white transition-all flex items-center justify-center"
              >
                Omitir este pago (cancelar)
              </button>
              {actionSheetIncome.templateId && (
                <button 
                  onClick={handleCancelTemplate} 
                  className="w-full py-4 rounded-xl bg-arca-alert/10 hover:bg-arca-alert/20 border border-arca-alert/30 font-bold text-arca-alert transition-all flex items-center justify-center"
                >
                  <AlertTriangle size={18} className="mr-2" />
                  Finalizar Contrato
                </button>
              )}
              <button 
                onClick={() => setActionSheetIncome(null)} 
                className="w-full py-4 rounded-xl bg-transparent font-bold text-arca-text-dim hover:text-white transition-all mt-2"
              >
                Volver
              </button>
            </div>
          </div>
        </div>
      )}

      <ReceivableActionModal 
        receivable={actionSheetReceivable}
        accounts={data.accountOptions}
        onClose={() => setActionSheetReceivable(null)}
        onRefresh={() => router.refresh()}
      />
    </div>
  );
}
