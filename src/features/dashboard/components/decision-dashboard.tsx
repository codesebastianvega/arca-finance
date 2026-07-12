"use client";

import { CheckCircle2, ArrowUpRight, Clock, Receipt, AlertTriangle, Bell, Search, Send, Zap, HandCoins } from "lucide-react";
import type { TodayViewModel } from "@/src/lib/today-data";

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
  const { greeting, budget, metrics, cash, criticalPayments, receivables, nextIncome } = data;

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

      {/* Quick Actions Horizontal List */}
      <section className="mb-4 overflow-x-auto no-scrollbar -mx-4 px-4 sm:mx-0 sm:px-0">
        <div className="flex space-x-4 min-w-max">
          {[
            { label: 'Transferir', icon: Send, color: 'bg-blue-500 light:bg-blue-600', action: onOpenTransfer },
            { label: 'Pago Rápido', icon: Zap, color: 'bg-arca-alert light:bg-arca-light-alert', action: onOpenObligations },
            { label: 'Subir Recibo', icon: Receipt, color: 'bg-arca-surface-2 light:bg-arca-light-surface-2', action: onOpenRegister },
            { label: 'Prestar', icon: HandCoins, color: 'bg-arca-positive light:bg-arca-light-positive', action: onOpenBusiness },
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
      <div 
        onClick={onOpenMonthPlan}
        className="card-arca p-4 flex flex-col gap-3 cursor-pointer hover:opacity-80 transition-opacity"
      >
        <div className="flex justify-between items-center text-[11px] font-bold tracking-wider text-arca-text-secondary light:text-arca-light-text-secondary">
          <span>PRESUPUESTO MENSUAL</span>
          <span className="text-arca-positive light:text-arca-light-positive uppercase">
            {budget.hasBudget ? "DEFINIDO" : "SIN DEFINIR"}
          </span>
        </div>
        <div className="h-1.5 w-full rounded-full bg-arca-surface-2 light:bg-arca-light-surface-2 overflow-hidden">
          <div 
            className="h-full bg-arca-positive light:bg-arca-light-positive" 
            style={{ width: `${budget.utilization ?? 0}%` }}
          ></div>
        </div>
        <div className="flex justify-between items-center text-[10px] font-bold text-arca-text-dim light:text-arca-light-text-secondary">
          <span>CONSUMIDO: {budget.consumed != null ? formatCOP(budget.consumed) : "SIN DATO"}</span>
          <span>LÍMITE: {budget.limit != null ? formatCOP(budget.limit) : "SIN DEFINIR"}</span>
        </div>
      </div>

      {/* TRES TARJETAS */}
      <div className="grid grid-cols-3 gap-3">
        <div onClick={onOpenObligations} className="card-arca flex flex-col items-center justify-center p-3 gap-1 cursor-pointer hover:opacity-80 transition-opacity">
          <CheckCircle2 size={18} className="text-arca-positive light:text-arca-light-positive" />
          <span className="text-xl font-bold text-arca-accent light:text-arca-light-accent">{metrics.onTime}</span>
          <span className="text-[10px] font-bold tracking-wider text-arca-text-secondary light:text-arca-light-text-secondary">A TIEMPO</span>
        </div>
        <div onClick={onOpenObligations} className="card-arca flex flex-col items-center justify-center p-3 gap-1 cursor-pointer hover:opacity-80 transition-opacity">
          <ArrowUpRight size={18} className="text-arca-accent light:text-arca-light-accent" />
          <span className="text-xl font-bold text-arca-accent light:text-arca-light-accent">{metrics.advanced}</span>
          <span className="text-[10px] font-bold tracking-wider text-arca-text-secondary light:text-arca-light-text-secondary">ADELANTADOS</span>
        </div>
        <div onClick={onOpenObligations} className="card-arca flex flex-col items-center justify-center p-3 gap-1 cursor-pointer hover:opacity-80 transition-opacity">
          <Clock size={18} className="text-arca-alert light:text-arca-light-alert" />
          <span className="text-xl font-bold text-arca-alert light:text-arca-light-alert">{metrics.late}</span>
          <span className="text-[10px] font-bold tracking-wider text-arca-text-secondary light:text-arca-light-text-secondary">ATRASADOS</span>
        </div>
      </div>

      {/* CAJA LIBRE */}
      <div className="card-arca p-5 flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <span className="text-[11px] font-bold tracking-wider text-arca-text-secondary light:text-arca-light-text-secondary">CAJA LIBRE (SAFE TO SPEND)</span>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold text-arca-text-primary light:text-arca-light-text-primary">{formatCOP(cash.safeToSpend)}</span>
            <span className="text-sm font-bold text-arca-text-secondary light:text-arca-light-text-secondary">COP</span>
          </div>
        </div>
        <div className="w-full h-[1px] bg-arca-border light:bg-arca-light-border"></div>
        <div className="flex justify-between items-center text-[11px] font-bold">
          <div className="flex flex-col gap-1 text-arca-text-secondary light:text-arca-light-text-secondary">
            <span>BALANCE TOTAL</span>
            <span className="text-arca-text-primary light:text-arca-light-text-primary text-sm">{formatCOP(cash.totalBalance)}</span>
          </div>
          <div className="flex flex-col gap-1 text-right text-arca-alert light:text-arca-light-alert">
            <span>PENDIENTE</span>
            <span className="text-sm">-{formatCOP(cash.pendingCritical)}</span>
          </div>
        </div>
      </div>

      {/* PAGOS CRITICOS */}
      <div className="flex flex-col gap-3 mt-2">
        <div className="flex justify-between items-center px-1">
          <span className="text-[12px] font-bold tracking-wider text-arca-accent light:text-arca-light-accent">PAGOS CRÍTICOS</span>
          <span className="text-[10px] font-bold tracking-wider text-arca-text-secondary light:text-arca-light-text-secondary">{criticalPayments.length} VISIBLES</span>
        </div>
        <div className="card-arca overflow-hidden flex flex-col">
          {criticalPayments.length > 0 ? (
            <div className="divide-y divide-arca-border light:divide-arca-light-border">
              {criticalPayments.map((p) => (
                <div key={p.id} className="p-4 flex justify-between items-center">
                  <div className="flex flex-col gap-1">
                    <span className={cn("text-sm font-bold", p.status === "overdue" ? "text-arca-alert light:text-arca-light-alert" : "text-arca-text-primary light:text-arca-light-text-primary")}>{p.title}</span>
                    <span className="text-[10px] text-arca-text-secondary light:text-arca-light-text-secondary font-bold">{p.dueLabel}</span>
                  </div>
                  <span className={cn("text-sm font-bold", p.kind === "income" ? "text-arca-positive light:text-arca-light-positive" : "text-arca-text-primary light:text-arca-light-text-primary")}>
                    {p.kind === "income" ? "+" : "-"}{formatCOP(p.amount)}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-8 flex items-center justify-center">
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
                <div key={r.id} className="p-4 flex justify-between items-center">
                  <div className="flex flex-col gap-1">
                    <span className="text-sm font-bold text-arca-text-primary light:text-arca-light-text-primary">{r.debtorName || r.title}</span>
                    <span className="text-[10px] text-arca-text-secondary light:text-arca-light-text-secondary font-bold">{r.dueLabel}</span>
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

      {/* SIGUIENTE INGRESO */}
      <div className="card-arca p-4 mt-2 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-arca-surface-2 light:bg-arca-light-surface-2 flex items-center justify-center">
            <div className={cn("w-2.5 h-2.5 rounded-full", nextIncome ? "bg-arca-positive light:bg-arca-light-positive" : "bg-arca-text-secondary light:bg-arca-light-text-secondary")}></div>
          </div>
          <div className="flex flex-col">
            <span className="text-sm text-arca-text-secondary light:text-arca-light-text-secondary">
              Siguiente ingreso: <br/>
              <span className="text-arca-accent light:text-arca-light-accent font-semibold">{nextIncome ? nextIncome.title : "Sin ingresos programados"}</span>
            </span>
          </div>
        </div>
        <div className="flex flex-col text-right">
          {nextIncome ? (
            <>
              <span className="text-sm text-arca-positive light:text-arca-light-positive font-semibold">{formatCOP(nextIncome.amount)}</span>
              <span className="text-[10px] text-arca-text-secondary light:text-arca-light-text-secondary font-bold">{nextIncome.dueLabel}</span>
            </>
          ) : (
            <>
              <span className="text-sm text-arca-text-secondary light:text-arca-light-text-secondary font-semibold">Sin</span>
              <span className="text-sm text-arca-text-secondary light:text-arca-light-text-secondary font-semibold">fecha</span>
            </>
          )}
        </div>
      </div>

    </div>
  );
}
