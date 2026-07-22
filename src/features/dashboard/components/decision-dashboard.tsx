"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, CalendarClock, Clock, AlertTriangle, Send, Target, Receipt, TrendingUp, AlertCircle, ChevronRight, X, Sparkles } from "lucide-react";
import type { TodayViewModel, TodayReceivable, TodayMonthlyBudgetItem } from "@/src/lib/today-data";
import type { ObligationFilter } from "@/src/lib/obligations-types";
import { haptics } from "@/src/lib/haptics";
import { confirmScheduledEventNow, cancelScheduledEvent, cancelIncomeTemplate } from "@/app/actions";
import { ReceivableActionModal } from "./receivable-action-modal";
import { ObligationActionModal } from "../../../features/obligations/components/obligation-action-modal";
import type { ObligationItem } from "@/src/lib/obligations-types";
import { CalculationHelper } from "@/src/components/calculation-helper";
import { HomeHeaderActions } from "./home-header-actions";
import type { Screen } from "@/src/types";
import { AnimatedNumber } from "@/src/components/animated-number";

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
  onOpenMonthPlan,
  onOpenNova,
  onNavigate,
}: { 
  data: TodayViewModel;
  onOpenMovements?: () => void;
  onOpenTransfer?: () => void;
  onOpenObligations?: (filter?: ObligationFilter) => void;
  onOpenRegister?: () => void;
  onOpenBusiness?: () => void;
  onOpenMonthPlan?: () => void;
  onOpenNova: (prompt?: string) => void;
  onNavigate: (screen: Screen) => void;
}) {
  const { greeting, budget, metrics, cash, criticalPayments, receivables, upcomingIncomes, monthlyBudget } = data;
  const router = useRouter();
  const [actionSheetIncome, setActionSheetIncome] = useState<{id: string, templateId?: string | null, title: string, amount: number, dueLabel: string, dueDate: string} | null>(null);
  const [actionSheetReceivable, setActionSheetReceivable] = useState<TodayReceivable | null>(null);
  const [selectedCriticalPayment, setSelectedCriticalPayment] = useState<typeof criticalPayments[0] | null>(null);
  const [showMonthlyBudget, setShowMonthlyBudget] = useState(false);
  const [showAllCriticalPayments, setShowAllCriticalPayments] = useState(false);
  const [showAllReceivables, setShowAllReceivables] = useState(false);
  const [showAllIncomes, setShowAllIncomes] = useState(false);
  const projectedMonthlyFlow = monthlyBudget.receivedIncomes + monthlyBudget.expectedIncomes - monthlyBudget.paidObligations - monthlyBudget.pendingObligations;
  const projectedClosingBalance = cash.rawSafeToSpend + monthlyBudget.expectedIncomes - monthlyBudget.pendingObligations;

  const mappedObligation: ObligationItem | null = selectedCriticalPayment ? {
    id: selectedCriticalPayment.id,
    name: selectedCriticalPayment.title,
    amount: selectedCriticalPayment.amount,
    date: selectedCriticalPayment.dueLabel,
    amountLabel: formatCOP(selectedCriticalPayment.amount),
    status: selectedCriticalPayment.status,
    priority: "high",
    groupedOccurrences: 1,
    kind: selectedCriticalPayment.kind as any,
    dueDate: selectedCriticalPayment.dueDate,
    accountId: selectedCriticalPayment.accountId,
    suggestedAccountId: selectedCriticalPayment.suggestedAccountId,
    notes: selectedCriticalPayment.notes,
    templateId: null
  } : null;

  const mappedIncomeObligation: ObligationItem | null = actionSheetIncome ? {
    id: actionSheetIncome.id,
    name: actionSheetIncome.title,
    amount: actionSheetIncome.amount,
    date: actionSheetIncome.dueLabel,
    amountLabel: formatCOP(actionSheetIncome.amount),
    status: "upcoming",
    priority: "medium",
    groupedOccurrences: 1,
    kind: "income",
    dueDate: actionSheetIncome.dueDate,
    accountId: null,
    suggestedAccountId: null,
    notes: null,
    templateId: actionSheetIncome.templateId || null
  } : null;

  const visibleCriticalPayments = showAllCriticalPayments ? criticalPayments : criticalPayments.slice(0, 3);
  const visibleReceivables = showAllReceivables ? receivables : receivables.slice(0, 2);
  const visibleIncomes = showAllIncomes ? upcomingIncomes : upcomingIncomes.slice(0, 2);
  const criticalPaymentsTotal = criticalPayments.reduce((sum, item) => sum + item.amount, 0);
  const receivablesTotal = receivables.reduce((sum, item) => sum + item.amount, 0);
  const upcomingIncomesTotal = upcomingIncomes.reduce((sum, item) => sum + item.amount, 0);

  const handleOpenActionSheet = (income: {id: string, templateId?: string | null, title: string, amount: number, dueLabel: string, dueDate: string}) => {
    haptics.medium();
    setActionSheetIncome(income);
  };

  return (
    <div className="flex flex-col gap-4 font-sans w-full">
      
      {/* Header */}
      <header className="flex justify-between items-center mb-4">
        <div>
          <p className="text-[10px] font-bold text-arca-text-dim light:text-arca-light-text-secondary uppercase tracking-[0.2em]">{greeting.dateLabel}</p>
          <h1 className="text-3xl font-black tracking-tighter text-arca-text-primary light:text-arca-light-text-primary">Hola, {greeting.firstName}</h1>
        </div>
        <HomeHeaderActions data={data} onNavigate={onNavigate} onOpenObligations={onOpenObligations} onOpenNova={onOpenNova} />
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

      {/* PRESUPUESTO MENSUAL */}
      <div className="flex flex-col gap-3">
        <div className="flex justify-between items-center px-1">
          <span className="text-[12px] font-bold tracking-wider text-arca-text-secondary light:text-arca-light-text-secondary">PRESUPUESTO DEL MES</span>
          <span className="text-[10px] font-bold text-arca-positive light:text-arca-light-positive uppercase cursor-pointer hover:opacity-80" onClick={onOpenMonthPlan}>
            {budget.hasBudget ? "LÍMITE DEFINIDO" : "CONFIGURAR"}
          </span>
        </div>
        <button type="button" onClick={() => setShowMonthlyBudget(true)} className="relative overflow-hidden rounded-2xl p-4 border border-white/10 border-t-white/20 border-l-white/10 shadow-lg shadow-black/20 flex w-full flex-col gap-3 text-left transition-transform active:scale-[0.99]"
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
              <span className="text-[8px] leading-3 text-arca-text-dim">{metrics.overdue} vencidos · {metrics.today + metrics.upcoming} por vencer</span>
            </div>
          </div>

          <div className="w-full h-[1px] bg-arca-border/50 my-0.5 relative z-10"></div>
          
          {/* Saldo estimado al cierre */}
          <div className="flex justify-between items-center font-bold relative z-10">
            <span className="text-xs text-arca-text-secondary">Saldo estimado al cierre</span>
            <span className={cn("text-base drop-shadow-sm tracking-tight", projectedClosingBalance >= 0 ? "text-arca-positive" : "text-arca-alert")}>{formatCOP(projectedClosingBalance)}</span>
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
          <span className="relative z-10 mt-1 flex items-center justify-end gap-1 text-[9px] font-black uppercase tracking-wider text-arca-accent">Ver detalle <ChevronRight size={13} /></span>
        </button>
        <div className="px-1">
          <CalculationHelper
            title="Saldo estimado al cierre"
            description="Estimamos cuánto dinero disponible quedaría después de recibir los ingresos esperados y cubrir todas las obligaciones todavía pendientes del mes."
            formula="Saldo disponible actual + ingresos esperados − obligaciones pendientes"
            includes={["Saldo de cuentas activas", "Ingresos pendientes del mes", "Pagos vencidos y próximos"]}
            excludes={["Ingresos ya recibidos", "Pagos ya realizados", "Ahorro protegido"]}
          />
        </div>
      </div>

      {/* TRES TARJETAS */}
      <div className="grid grid-cols-3 gap-3">
        {/* HOY */}
        <button type="button" onClick={() => onOpenObligations?.('hoy')}
             className="bg-arca-surface-1 light:bg-arca-light-surface-1 border border-arca-border/40 light:border-arca-light-border/60 rounded-2xl flex flex-col items-center justify-center py-3.5 px-2 cursor-pointer hover:bg-arca-surface-2 light:hover:bg-arca-light-surface-2 transition-colors shadow-sm">
          <CalendarClock size={16} className="text-arca-accent light:text-arca-light-accent mb-1" />
          <span className="text-lg font-black text-arca-text-primary light:text-arca-light-text-primary leading-none mb-1">{metrics.today}</span>
          <span className="text-[9px] font-bold tracking-wider text-arca-text-secondary light:text-arca-light-text-secondary uppercase">Hoy</span>
        </button>

        {/* PRÓXIMOS */}
        <button type="button" onClick={() => onOpenObligations?.('proximos')}
             className="bg-arca-surface-1 light:bg-arca-light-surface-1 border border-arca-border/40 light:border-arca-light-border/60 rounded-2xl flex flex-col items-center justify-center py-3.5 px-2 cursor-pointer hover:bg-arca-surface-2 light:hover:bg-arca-light-surface-2 transition-colors shadow-sm">
          <CheckCircle2 size={16} className="text-arca-positive light:text-arca-light-positive mb-1" />
          <span className="text-lg font-black text-arca-text-primary light:text-arca-light-text-primary leading-none mb-1">{metrics.upcoming}</span>
          <span className="text-[9px] font-bold tracking-wider text-arca-text-secondary light:text-arca-light-text-secondary uppercase">Próximos</span>
        </button>

        {/* ATRASADOS */}
        <button type="button" onClick={() => onOpenObligations?.('vencido')}
             className="bg-arca-surface-1 light:bg-arca-light-surface-1 border border-arca-border/40 light:border-arca-light-border/60 rounded-2xl flex flex-col items-center justify-center py-3.5 px-2 cursor-pointer hover:bg-arca-surface-2 light:hover:bg-arca-light-surface-2 transition-colors shadow-sm">
          <Clock size={16} className="text-arca-alert light:text-arca-light-alert mb-1" />
          <span className="text-lg font-black text-arca-text-primary light:text-arca-light-text-primary leading-none mb-1">{metrics.overdue}</span>
          <span className="text-[9px] font-bold tracking-wider text-arca-text-secondary light:text-arca-light-text-secondary uppercase">Vencidos</span>
        </button>
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
            <AnimatedNumber value={cash.safeToSpend} />
          </div>
          {cash.totalLent > 0 && (
            <div className="text-[11px] text-arca-text-secondary mt-1">
              + <AnimatedNumber value={cash.totalLent} /> prestados
            </div>
          )}
        </div>

        <div className="flex justify-between items-end border-t border-white/5 pt-3 relative z-10">
          <div className="flex flex-col gap-1">
            <span className="text-[11px] uppercase tracking-widest text-arca-text-secondary">Balance Total</span>
            <span className="text-sm font-bold text-white/90"><AnimatedNumber value={cash.totalBalance} /></span>
          </div>
          
          <div className="flex flex-col gap-1 items-end">
            <span className="text-[11px] uppercase tracking-widest text-arca-text-secondary">Bolsillos</span>
            <span className="text-sm font-bold text-arca-positive"><AnimatedNumber value={cash.protectedSavings} /></span>
          </div>
        </div>
      </div>

      <aside className="rounded-[22px] border border-arca-accent/25 bg-arca-accent/[0.06] p-4">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-arca-accent/10 text-arca-accent"><Sparkles size={18} /></span>
          <div className="min-w-0 flex-1"><p className="text-[9px] font-black uppercase tracking-[0.16em] text-arca-accent">Nova · decisión de hoy</p><h2 className="mt-1 text-sm font-black text-arca-text-primary">Organiza lo importante conmigo</h2><p className="mt-1 text-[11px] leading-5 text-arca-text-secondary">Puedo priorizar tus {metrics.overdue} pagos vencidos y los {metrics.today + metrics.upcoming} que vienen, cuidando tu saldo disponible.</p><button type="button" onClick={() => onOpenNova(`Revisa mi situación de hoy. Tengo ${formatCOP(cash.safeToSpend)} disponibles, ${metrics.overdue} pagos vencidos, ${metrics.today + metrics.upcoming} pagos por vencer, ${formatCOP(monthlyBudget.expectedIncomes)} por ingresar y un saldo estimado al cierre de ${formatCOP(projectedClosingBalance)}. Ayúdame a priorizar acciones concretas.`)} className="mt-3 inline-flex h-10 items-center gap-2 rounded-xl bg-arca-accent px-4 text-[10px] font-black uppercase tracking-wider text-black"><Sparkles size={14} /> Revisar con Nova</button></div>
        </div>
      </aside>
  
        {/* PAGOS CRITICOS */}
        <div className="flex flex-col gap-3 mt-4">
          <div className="flex justify-between items-center px-1">
            <div className="flex items-center gap-2 text-arca-accent light:text-arca-light-accent">
              <AlertCircle size={14} />
              <span className="text-[12px] font-bold tracking-wider">PAGOS CRÍTICOS</span>
            </div>
            <span className="text-[9px] font-bold tracking-wider text-arca-text-secondary light:text-arca-light-text-secondary">{criticalPayments.length} · {formatCOP(criticalPaymentsTotal)}</span>
          </div>
          <div className="flex flex-col overflow-hidden rounded-[20px] border border-arca-border/60 bg-arca-surface-1/55">
            {criticalPayments.length > 0 ? (
              <>
              <div className="divide-y divide-arca-border/60 light:divide-arca-light-border/60">
                {visibleCriticalPayments.map((p) => (
                  <button type="button" key={p.id} className="group flex w-full items-center justify-between gap-3 px-3.5 py-3 text-left transition-colors hover:bg-arca-bg-secondary/60 light:hover:bg-arca-light-bg-secondary/60" onClick={() => {
                     haptics.medium();
                     setSelectedCriticalPayment(p);
                   }}>
                    <div className="min-w-0 flex flex-col gap-0.5">
                      <span className="truncate text-[13px] font-bold text-arca-text-primary light:text-arca-light-text-primary group-hover:text-arca-accent light:group-hover:text-arca-light-accent transition-colors">{p.title}</span>
                      <span className={`text-[10px] font-bold uppercase tracking-wider ${
                        p.status === "overdue" ? "text-arca-alert" :
                        p.status === "today" ? "text-arca-accent light:text-arca-light-accent" :
                        "text-arca-text-secondary light:text-arca-light-text-secondary"
                      }`}>
                        {p.dueLabel}
                      </span>
                    </div>
                    <span className="shrink-0 text-[13px] font-black text-arca-text-primary light:text-arca-light-text-primary">{formatCOP(p.amount)}</span>
                  </button>
                ))}
              </div>
              {criticalPayments.length > 3 ? <CompactExpandButton expanded={showAllCriticalPayments} hiddenCount={criticalPayments.length - 3} noun="pagos" onClick={() => setShowAllCriticalPayments((value) => !value)} /> : null}
              </>
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
            <span className="text-[9px] font-bold tracking-wider text-arca-text-secondary light:text-arca-light-text-secondary">{receivables.length} · {formatCOP(receivablesTotal)}</span>
          </div>
          <div className="flex flex-col overflow-hidden rounded-[20px] border border-arca-border/60 bg-arca-surface-1/55">
            {receivables.length > 0 ? (
              <>
              <div className="divide-y divide-arca-border/60 light:divide-arca-light-border/60">
                {visibleReceivables.map((r) => (
                  <button type="button" key={r.id} className="group flex w-full items-center justify-between gap-3 px-3.5 py-3 text-left transition-colors hover:bg-arca-bg-secondary/60 light:hover:bg-arca-light-bg-secondary/60" onClick={() => {
                     haptics.medium();
                     setActionSheetReceivable(r);
                   }}>
                    <div className="min-w-0 flex flex-col gap-0.5">
                      <span className="truncate text-[13px] font-bold text-arca-text-primary light:text-arca-light-text-primary group-hover:text-arca-accent light:group-hover:text-arca-light-accent transition-colors">{r.debtorName || r.title}</span>
                      <span className={`text-[10px] font-bold ${r.status === "overdue" ? "text-arca-alert" : r.status === "today" ? "text-arca-accent light:text-arca-light-accent" : "text-arca-text-secondary light:text-arca-light-text-secondary"}`}>{r.dueLabel}</span>
                    </div>
                    <span className="shrink-0 text-[13px] font-black text-arca-positive light:text-arca-light-positive">{formatCOP(r.amount)}</span>
                  </button>
                ))}
              </div>
              {receivables.length > 2 ? <CompactExpandButton expanded={showAllReceivables} hiddenCount={receivables.length - 2} noun="cobros" onClick={() => setShowAllReceivables((value) => !value)} /> : null}
              </>
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
          <span className="text-[9px] font-bold tracking-wider text-arca-text-secondary light:text-arca-light-text-secondary">{upcomingIncomes.length} · {formatCOP(upcomingIncomesTotal)}</span>
        </div>
        <div className="flex flex-col overflow-hidden rounded-[20px] border border-arca-border/60 bg-arca-surface-1/55">
          {upcomingIncomes.length > 0 ? (
            <>
              <div className="divide-y divide-arca-border/60 light:divide-arca-light-border/60">
                {visibleIncomes.map((income) => (
                  <button
                    key={income.id}
                    onClick={() => handleOpenActionSheet({id: income.id, templateId: income.templateId, title: income.title, amount: income.amount, dueLabel: income.dueLabel, dueDate: income.dueDate})}
                    className="flex w-full items-center justify-between gap-3 px-3.5 py-3 text-left transition-colors hover:bg-arca-border/20"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-arca-positive/10">
                        <Target size={14} className="text-arca-positive" />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[13px] text-arca-text-primary light:text-arca-light-text-primary font-semibold">{income.title}</span>
                        <span className="text-[10px] text-arca-text-dim light:text-arca-light-text-secondary">{income.dueLabel}</span>
                      </div>
                    </div>
                    <div className="flex flex-col text-right">
                      <span className="text-[13px] font-black text-arca-positive">+{formatCOP(income.amount)}</span>
                    </div>
                  </button>
                ))}
              </div>
              {upcomingIncomes.length > 2 ? <CompactExpandButton expanded={showAllIncomes} hiddenCount={upcomingIncomes.length - 2} noun="ingresos" onClick={() => setShowAllIncomes((value) => !value)} /> : null}
            </>
          ) : (
            <div className="p-5 flex items-center">
              <span className="text-sm text-arca-text-dim light:text-arca-light-text-secondary font-medium">No hay ingresos programados.</span>
            </div>
          )}
        </div>
      </div>

      <ObligationActionModal
        obligation={mappedIncomeObligation}
        accounts={data.accountOptions}
        onClose={() => setActionSheetIncome(null)}
        onRefresh={() => router.refresh()}
      />

      <ReceivableActionModal 
        receivable={actionSheetReceivable}
        accounts={data.accountOptions}
        onClose={() => setActionSheetReceivable(null)}
        onRefresh={() => router.refresh()}
      />

      <ObligationActionModal
        obligation={mappedObligation}
        accounts={data.accountOptions}
        onClose={() => setSelectedCriticalPayment(null)}
        onRefresh={() => router.refresh()}
      />

      {showMonthlyBudget ? (
        <MonthlyBudgetModal
          data={monthlyBudget}
          projectedFlow={projectedMonthlyFlow}
          projectedClosingBalance={projectedClosingBalance}
          onClose={() => setShowMonthlyBudget(false)}
        />
      ) : null}
    </div>
  );
}

function MonthlyBudgetModal({ data, projectedFlow, projectedClosingBalance, onClose }: { data: TodayViewModel['monthlyBudget']; projectedFlow: number; projectedClosingBalance: number; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[700] flex items-end justify-center">
      <button type="button" aria-label="Cerrar resumen mensual" onClick={onClose} className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
      <section role="dialog" aria-modal="true" aria-labelledby="monthly-budget-title" className="relative max-h-[88dvh] w-full max-w-lg overflow-y-auto rounded-t-[30px] border-t border-arca-border-strong bg-arca-base px-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-3 shadow-2xl">
        <div className="mx-auto h-1.5 w-12 rounded-full bg-arca-border" />
        <header className="mt-4 flex items-start justify-between gap-4">
          <div><p className="text-[9px] font-black uppercase tracking-[0.18em] text-arca-accent">Presupuesto del mes</p><h2 id="monthly-budget-title" className="mt-1 text-xl font-black text-arca-text-primary">Así se mueve tu dinero</h2></div>
          <button type="button" onClick={onClose} aria-label="Cerrar" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-arca-border bg-arca-surface-1 text-arca-text-secondary"><X size={18} /></button>
        </header>

        <div className={cn("mt-5 rounded-[22px] border p-5", projectedClosingBalance >= 0 ? "border-arca-positive/20 bg-arca-positive/[0.06]" : "border-arca-alert/25 bg-arca-alert/[0.07]") }>
          <p className="text-[9px] font-black uppercase tracking-[0.16em] text-arca-text-dim">Saldo estimado al cierre</p>
          <p className={cn("mt-1 text-3xl font-black tracking-tight", projectedClosingBalance >= 0 ? "text-arca-positive" : "text-arca-alert")}>{formatCOP(projectedClosingBalance)}</p>
          <p className="mt-2 text-[10px] leading-relaxed text-arca-text-secondary">Saldo disponible actual + ingresos por recibir − obligaciones pendientes.</p>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <ModalMetric label="Ingresos previstos" value={data.receivedIncomes + data.expectedIncomes} tone="positive" />
          <ModalMetric label="Compromisos del mes" value={data.paidObligations + data.pendingObligations} tone="alert" />
        </div>

        <div className="mt-4 rounded-2xl border border-arca-border bg-arca-surface-1 px-4 py-3">
          <div className="flex items-center justify-between gap-4"><span className="text-[10px] font-bold text-arca-text-secondary">Flujo proyectado del mes</span><strong className={projectedFlow >= 0 ? "text-arca-positive" : "text-arca-alert"}>{formatCOP(projectedFlow)}</strong></div>
        </div>

        <div className="mt-5 space-y-3">
          <BudgetDetailGroup label="Recibido" total={data.receivedIncomes} items={data.receivedItems} tone="positive" />
          <BudgetDetailGroup label="Por recibir" total={data.expectedIncomes} items={data.expectedItems} tone="positive" />
          <BudgetDetailGroup label="Pagado" total={data.paidObligations} items={data.paidItems} tone="neutral" />
          <BudgetDetailGroup label="Pendiente" total={data.pendingObligations} items={data.pendingItems} tone="alert" />
        </div>
      </section>
    </div>
  );
}

function CompactExpandButton({ expanded, hiddenCount, noun, onClick }: { expanded: boolean; hiddenCount: number; noun: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="flex w-full items-center justify-center gap-1.5 border-t border-arca-border/50 bg-arca-surface-2/20 px-3 py-2.5 text-[9px] font-black uppercase tracking-wider text-arca-text-dim transition-colors hover:text-arca-accent">
      {expanded ? 'Mostrar menos' : `Ver ${hiddenCount} ${noun} más`}
      <ChevronRight size={13} className={cn("transition-transform", expanded ? "-rotate-90" : "rotate-90")} />
    </button>
  );
}

function ModalMetric({ label, value, tone }: { label: string; value: number; tone: 'positive' | 'alert' }) {
  return <div className="rounded-2xl border border-arca-border bg-arca-surface-1 p-3"><p className="text-[8px] font-black uppercase tracking-wider text-arca-text-dim">{label}</p><p className={cn("mt-1 text-base font-black", tone === 'positive' ? "text-arca-positive" : "text-arca-alert")}>{formatCOP(value)}</p></div>;
}

function BudgetDetailGroup({ label, total, items, tone }: { label: string; total: number; items: TodayMonthlyBudgetItem[]; tone: 'positive' | 'alert' | 'neutral' }) {
  const toneClass = tone === 'positive' ? 'text-arca-positive' : tone === 'alert' ? 'text-arca-alert' : 'text-arca-text-primary';
  return (
    <details className="group overflow-hidden rounded-2xl border border-arca-border bg-arca-surface-1">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-4">
        <span><span className="block text-xs font-black text-arca-text-primary">{label}</span><span className="mt-1 block text-[9px] text-arca-text-dim">{items.length} {items.length === 1 ? 'registro' : 'registros'}</span></span>
        <span className="flex items-center gap-2"><strong className={cn("text-sm", toneClass)}>{formatCOP(total)}</strong><ChevronRight size={15} className="text-arca-text-dim transition-transform group-open:rotate-90" /></span>
      </summary>
      <div className="divide-y divide-arca-border border-t border-arca-border px-4">
        {items.length ? items.map((item) => <div key={item.id} className="flex items-center justify-between gap-4 py-3"><span className="min-w-0"><span className="block truncate text-[11px] font-bold text-arca-text-primary">{item.title}</span><span className="mt-1 block text-[9px] text-arca-text-dim">{item.dateLabel}</span></span><strong className={cn("shrink-0 text-xs", toneClass)}>{formatCOP(item.amount)}</strong></div>) : <p className="py-4 text-[10px] text-arca-text-dim">No hay registros en esta sección.</p>}
      </div>
    </details>
  );
}
