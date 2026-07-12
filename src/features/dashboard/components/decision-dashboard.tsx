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

export default function DecisionDashboard({ data }: { data: TodayViewModel }) {
  const { greeting, budget, metrics, cash, criticalPayments, receivables, nextIncome } = data;

  return (
    <div className="flex flex-col gap-4 font-sans w-full">
      
      {/* Header */}
      <header className="flex justify-between items-center mb-4">
        <div>
          <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-[0.2em]">{greeting.dateLabel}</p>
          <h1 className="text-3xl font-black tracking-tighter text-white">Hola, {greeting.firstName}</h1>
        </div>
        <div className="flex space-x-2">
          <button className="w-10 h-10 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center">
            <Search size={18} className="text-zinc-400" />
          </button>
          <button className="w-10 h-10 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center relative">
            <Bell size={18} className="text-zinc-400" />
            <span className="absolute top-2 right-2 w-2 h-2 bg-orange-500 rounded-full border-2 border-black" />
          </button>
        </div>
      </header>

      {/* Quick Actions Horizontal List */}
      <section className="mb-4 overflow-x-auto no-scrollbar -mx-4 px-4 sm:mx-0 sm:px-0">
        <div className="flex space-x-4 min-w-max">
          {[
            { label: 'Transferir', icon: Send, color: 'bg-blue-500' },
            { label: 'Pago Rápido', icon: Zap, color: 'bg-orange-500' },
            { label: 'Subir Recibo', icon: Receipt, color: 'bg-zinc-700' },
            { label: 'Prestar', icon: HandCoins, color: 'bg-emerald-500' },
          ].map((action, i) => (
            <button 
              key={i}
              className="flex flex-col items-center space-y-2 group active:scale-95 transition-transform"
            >
              <div className={`w-14 h-14 ${action.color} rounded-2xl flex items-center justify-center shadow-lg group-hover:-translate-y-1 transition-transform`}>
                <action.icon size={24} className="text-white" />
              </div>
              <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">{action.label}</span>
            </button>
          ))}
        </div>
      </section>

      {/* PRESUPUESTO MENSUAL */}
      <div className="rounded-[20px] p-4 flex flex-col gap-3" style={{ backgroundColor: "#1A1614", border: "1px solid #2A2420" }}>
        <div className="flex justify-between items-center text-[11px] font-bold tracking-wider text-[#A08E83]">
          <span>PRESUPUESTO MENSUAL</span>
          <span className="text-[#4ADE80] uppercase">
            {budget.hasBudget ? "DEFINIDO" : "SIN DEFINIR"}
          </span>
        </div>
        <div className="h-1.5 w-full rounded-full bg-[#2A2420] overflow-hidden">
          <div 
            className="h-full bg-[#4ADE80]" 
            style={{ width: `${budget.utilization ?? 0}%` }}
          ></div>
        </div>
        <div className="flex justify-between items-center text-[10px] font-bold text-[#7A6A61]">
          <span>CONSUMIDO: {budget.consumed != null ? formatCOP(budget.consumed) : "SIN DATO"}</span>
          <span>LÍMITE: {budget.limit != null ? formatCOP(budget.limit) : "SIN DEFINIR"}</span>
        </div>
      </div>

      {/* TRES TARJETAS */}
      <div className="grid grid-cols-3 gap-3">
        <div className="flex flex-col items-center justify-center rounded-[20px] p-3 gap-1 cursor-pointer hover:opacity-80 transition-opacity" style={{ backgroundColor: "#1A1614", border: "1px solid #2A2420" }}>
          <CheckCircle2 size={18} className="text-[#4ADE80]" />
          <span className="text-xl font-bold text-[#E5A874]">{metrics.onTime}</span>
          <span className="text-[10px] font-bold tracking-wider text-[#A08E83]">A TIEMPO</span>
        </div>
        <div className="flex flex-col items-center justify-center rounded-[20px] p-3 gap-1 cursor-pointer hover:opacity-80 transition-opacity" style={{ backgroundColor: "#1A1614", border: "1px solid #2A2420" }}>
          <ArrowUpRight size={18} className="text-[#E5A874]" />
          <span className="text-xl font-bold text-[#E5A874]">{metrics.advanced}</span>
          <span className="text-[10px] font-bold tracking-wider text-[#A08E83]">ADELANTADOS</span>
        </div>
        <div className="flex flex-col items-center justify-center rounded-[20px] p-3 gap-1 cursor-pointer hover:opacity-80 transition-opacity" style={{ backgroundColor: "#1A1614", border: "1px solid #2A2420" }}>
          <Clock size={18} className="text-[#F87171]" />
          <span className="text-xl font-bold text-[#F87171]">{metrics.late}</span>
          <span className="text-[10px] font-bold tracking-wider text-[#A08E83]">ATRASADOS</span>
        </div>
      </div>

      {/* CAJA LIBRE */}
      <div className="rounded-[20px] p-5 flex flex-col gap-4" style={{ backgroundColor: "#1A1614", border: "1px solid #2A2420" }}>
        <div className="flex flex-col gap-1">
          <span className="text-[11px] font-bold tracking-wider text-[#A08E83]">CAJA LIBRE (SAFE TO SPEND)</span>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold text-white">{formatCOP(cash.safeToSpend)}</span>
            <span className="text-sm font-bold text-[#A08E83]">COP</span>
          </div>
        </div>
        <div className="w-full h-[1px] bg-[#2A2420]"></div>
        <div className="flex justify-between items-center text-[11px] font-bold">
          <div className="flex flex-col gap-1 text-[#A08E83]">
            <span>BALANCE TOTAL</span>
            <span className="text-white text-sm">{formatCOP(cash.totalBalance)}</span>
          </div>
          <div className="flex flex-col gap-1 text-right text-[#F87171]">
            <span>PENDIENTE</span>
            <span className="text-sm">-{formatCOP(cash.pendingCritical)}</span>
          </div>
        </div>
      </div>

      {/* PAGOS CRITICOS */}
      <div className="flex flex-col gap-3 mt-2">
        <div className="flex justify-between items-center px-1">
          <span className="text-[12px] font-bold tracking-wider text-[#E5A874]">PAGOS CRÍTICOS</span>
          <span className="text-[10px] font-bold tracking-wider text-[#A08E83]">{criticalPayments.length} VISIBLES</span>
        </div>
        <div className="rounded-[20px] overflow-hidden flex flex-col" style={{ backgroundColor: "#1A1614", border: "1px solid #2A2420" }}>
          {criticalPayments.length > 0 ? (
            <div className="divide-y divide-[#2A2420]">
              {criticalPayments.map((p) => (
                <div key={p.id} className="p-4 flex justify-between items-center">
                  <div className="flex flex-col gap-1">
                    <span className={cn("text-sm font-bold", p.status === "overdue" ? "text-[#F87171]" : "text-white")}>{p.title}</span>
                    <span className="text-[10px] text-[#A08E83] font-bold">{p.dueLabel}</span>
                  </div>
                  <span className={cn("text-sm font-bold", p.kind === "income" ? "text-[#4ADE80]" : "text-white")}>
                    {p.kind === "income" ? "+" : "-"}{formatCOP(p.amount)}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-8 flex items-center justify-center">
              <span className="text-sm text-[#7A6A61] font-medium">No hay pagos críticos para mostrar.</span>
            </div>
          )}
        </div>
      </div>

      {/* PRESTAMOS A COBRAR */}
      <div className="flex flex-col gap-3 mt-2">
        <div className="flex justify-between items-center px-1">
          <div className="flex items-center gap-2 text-[#E5A874]">
            <Receipt size={14} />
            <span className="text-[12px] font-bold tracking-wider">PRÉSTAMOS A COBRAR</span>
          </div>
          <span className="text-[10px] font-bold tracking-wider text-[#A08E83]">{receivables.length} ABIERTOS</span>
        </div>
        <div className="rounded-[20px] overflow-hidden flex flex-col" style={{ backgroundColor: "#1A1614", border: "1px solid #2A2420" }}>
          {receivables.length > 0 ? (
            <div className="divide-y divide-[#2A2420]">
              {receivables.map((r) => (
                <div key={r.id} className="p-4 flex justify-between items-center">
                  <div className="flex flex-col gap-1">
                    <span className="text-sm font-bold text-white">{r.debtorName || r.title}</span>
                    <span className="text-[10px] text-[#A08E83] font-bold">{r.dueLabel}</span>
                  </div>
                  <span className="text-sm font-bold text-[#4ADE80]">{formatCOP(r.amount)}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-5 flex items-center">
              <span className="text-sm text-[#7A6A61] font-medium">Aún no hay cobros pendientes.</span>
            </div>
          )}
        </div>
      </div>

      {/* SIGUIENTE INGRESO */}
      <div className="rounded-[20px] p-4 mt-2 flex items-center justify-between" style={{ backgroundColor: "#1A1614", border: "1px solid #2A2420" }}>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-[#2A2420] flex items-center justify-center">
            <div className={cn("w-2.5 h-2.5 rounded-full", nextIncome ? "bg-[#4ADE80]" : "bg-[#A08E83]")}></div>
          </div>
          <div className="flex flex-col">
            <span className="text-sm text-[#A08E83]">
              Siguiente ingreso: <br/>
              <span className="text-[#E5A874] font-semibold">{nextIncome ? nextIncome.title : "Sin ingresos programados"}</span>
            </span>
          </div>
        </div>
        <div className="flex flex-col text-right">
          {nextIncome ? (
            <>
              <span className="text-sm text-[#4ADE80] font-semibold">{formatCOP(nextIncome.amount)}</span>
              <span className="text-[10px] text-[#A08E83] font-bold">{nextIncome.dueLabel}</span>
            </>
          ) : (
            <>
              <span className="text-sm text-[#A08E83] font-semibold">Sin</span>
              <span className="text-sm text-[#A08E83] font-semibold">fecha</span>
            </>
          )}
        </div>
      </div>

    </div>
  );
}
