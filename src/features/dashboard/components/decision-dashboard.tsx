"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  CalendarClock,
  Clock,
  AlertTriangle,
  Send,
  Target,
  Receipt,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  ChevronRight,
  X,
  Sparkles,
  Mic,
  Camera,
  MessageSquareHeart,
  Plus,
  ArrowRight,
  WalletCards,
  CircleDollarSign,
  BarChart3,
} from "lucide-react";
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
import { NovaLiquidOrb } from "@/src/components/nova-liquid-orb";

function formatCOP(amount: number | null | undefined): string {
  if (amount == null) return "$0";
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function getAccountAccentColor(name: string, entity?: string | null): string {
  const norm = `${name} ${entity || ""}`.toLowerCase();
  if (norm.includes("nequi")) return "#8235E6";
  if (norm.includes("daviplata")) return "#E51C1A";
  if (norm.includes("bancolombia")) return "#FDDA24";
  if (norm.includes("nu")) return "#820AD1";
  if (norm.includes("efectivo") || norm.includes("cash")) return "#22C55E";
  if (norm.includes("davivienda")) return "#ED1C24";
  if (norm.includes("bbva")) return "#004481";
  if (norm.includes("falabella")) return "#7CB342";
  if (norm.includes("bogota") || norm.includes("bogotá")) return "#D71920";
  return "#FDDA24";
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
  onOpenFeedback,
  onNavigate,
}: {
  data: TodayViewModel;
  onOpenMovements?: () => void;
  onOpenTransfer?: () => void;
  onOpenObligations?: (filter?: ObligationFilter) => void;
  onOpenRegister?: () => void;
  onOpenBusiness?: () => void;
  onOpenMonthPlan?: () => void;
  onOpenNova: (prompt?: string, options?: { triggerCamera?: boolean; triggerVoice?: boolean }) => void;
  onOpenFeedback?: () => void;
  onNavigate: (screen: Screen) => void;
}) {
  const { greeting, budget, metrics, cash, criticalPayments, receivables, upcomingIncomes, monthlyBudget } = data;
  const router = useRouter();
  const [actionSheetIncome, setActionSheetIncome] = useState<{
    id: string;
    templateId?: string | null;
    title: string;
    amount: number;
    dueLabel: string;
    dueDate: string;
  } | null>(null);
  const [actionSheetReceivable, setActionSheetReceivable] = useState<TodayReceivable | null>(null);
  const [selectedCriticalPayment, setSelectedCriticalPayment] = useState<typeof criticalPayments[0] | null>(null);
  const [showMonthlyBudget, setShowMonthlyBudget] = useState(false);
  const [showAllCriticalPayments, setShowAllCriticalPayments] = useState(false);
  const [showAllReceivables, setShowAllReceivables] = useState(false);
  const [showAllIncomes, setShowAllIncomes] = useState(false);

  const projectedMonthlyFlow =
    monthlyBudget.receivedIncomes +
    monthlyBudget.expectedIncomes -
    monthlyBudget.paidObligations -
    monthlyBudget.pendingObligations;
  const projectedClosingBalance =
    cash.rawSafeToSpend + monthlyBudget.expectedIncomes - monthlyBudget.pendingObligations;

  const mappedObligation: ObligationItem | null = selectedCriticalPayment
    ? {
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
        templateId: null,
      }
    : null;

  const mappedIncomeObligation: ObligationItem | null = actionSheetIncome
    ? {
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
        templateId: actionSheetIncome.templateId || null,
      }
    : null;

  const visibleCriticalPayments = showAllCriticalPayments ? criticalPayments : criticalPayments.slice(0, 3);
  const visibleReceivables = showAllReceivables ? receivables : receivables.slice(0, 2);
  const visibleIncomes = showAllIncomes ? upcomingIncomes : upcomingIncomes.slice(0, 2);
  const criticalPaymentsTotal = criticalPayments.reduce((sum, item) => sum + item.amount, 0);
  const receivablesTotal = receivables.reduce((sum, item) => sum + item.amount, 0);
  const upcomingIncomesTotal = upcomingIncomes.reduce((sum, item) => sum + item.amount, 0);

  // Filter accounts showing only non-zero balances
  const activeAccounts = (data.accounts || []).filter((acc) => acc.balance !== 0);

  const handleOpenActionSheet = (income: {
    id: string;
    templateId?: string | null;
    title: string;
    amount: number;
    dueLabel: string;
    dueDate: string;
  }) => {
    haptics.medium();
    setActionSheetIncome(income);
  };

  return (
    <div className="flex flex-col gap-4 font-sans w-full pb-20 relative">
      {/* --- HEADER --- */}
      <header className="flex justify-between items-center mb-1">
        <div>
          <p className="text-[10px] font-bold text-arca-text-dim light:text-arca-light-text-secondary uppercase tracking-[0.2em]">
            {greeting.dateLabel}
          </p>
          <h1 className="text-3xl font-black tracking-tighter text-arca-text-primary light:text-arca-light-text-primary">
            Hola, {greeting.firstName}
          </h1>
        </div>
        <HomeHeaderActions
          data={data}
          onNavigate={onNavigate}
          onOpenObligations={onOpenObligations}
          onOpenNova={onOpenNova}
        />
      </header>

      {/* --- POSITION #1: SUBTLE NOVA AI INPUT TRIGGER BAR --- */}
      <div className="relative flex w-full items-center gap-2 overflow-hidden rounded-2xl border border-arca-border bg-arca-surface-1 p-2 pl-3 shadow-sm transition-all focus-within:border-arca-accent/60 focus-within:shadow-[0_4px_20px_rgba(245,158,11,0.15)]">
        <button
          type="button"
          onClick={() => {
            haptics.medium();
            onOpenNova();
          }}
          className="flex shrink-0 items-center justify-center cursor-pointer active:scale-95 transition-transform"
        >
          <NovaLiquidOrb size={32} isThinking={false} />
        </button>

        <input
          type="text"
          readOnly
          onClick={() => {
            haptics.medium();
            onOpenNova();
          }}
          placeholder="Pregúntale a Nova o dicta un gasto..."
          className="min-w-0 flex-1 bg-transparent text-xs font-semibold text-arca-text-primary placeholder:text-arca-text-dim cursor-pointer outline-none"
        />

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => {
              haptics.medium();
              onOpenNova(undefined, { triggerVoice: true });
            }}
            title="Dictar movimiento por voz"
            className="flex h-8 w-8 items-center justify-center rounded-xl bg-arca-surface-2 text-arca-text-secondary hover:text-arca-accent transition-colors"
          >
            <Mic size={15} />
          </button>
          <button
            type="button"
            onClick={() => {
              haptics.medium();
              onOpenNova(undefined, { triggerCamera: true });
            }}
            title="Escanear comprobante con cámara"
            className="flex h-8 w-8 items-center justify-center rounded-xl bg-arca-surface-2 text-arca-text-secondary hover:text-arca-accent transition-colors"
          >
            <Camera size={15} />
          </button>
          <button
            type="button"
            onClick={() => {
              haptics.medium();
              onOpenNova();
            }}
            title="Abrir chat de Nova"
            className="flex h-8 w-8 items-center justify-center rounded-xl bg-arca-accent text-black font-black active:scale-95 transition-transform"
          >
            <Send size={14} />
          </button>
        </div>
      </div>

      {/* --- ONBOARDING ALERT CARD (If no accounts exist) --- */}
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

      {/* --- PRESUPUESTO DEL MES (RESTAURADO COMPLETO) --- */}
      <div className="flex flex-col gap-3">
        <div className="flex justify-between items-center px-1">
          <span className="text-[11px] font-black tracking-wider text-arca-text-secondary uppercase">
            PRESUPUESTO DEL MES
          </span>
          <span
            className="text-[10px] font-bold text-arca-positive uppercase cursor-pointer hover:opacity-80 transition-opacity"
            onClick={onOpenMonthPlan}
          >
            {budget.hasBudget ? "LÍMITE DEFINIDO" : "CONFIGURAR"}
          </span>
        </div>
        <button
          type="button"
          onClick={() => setShowMonthlyBudget(true)}
          className="relative overflow-hidden rounded-[24px] p-4 border border-white/10 shadow-lg shadow-black/20 flex w-full flex-col gap-3 text-left transition-transform active:scale-[0.99]"
          style={{
            background: "linear-gradient(135deg, rgba(255,255,255,0.05) 0%, rgba(0,0,0,0.25) 100%)",
            backdropFilter: "blur(10px)",
          }}
        >
          {/* Decorative glows */}
          <div className="absolute -right-20 -top-20 w-40 h-40 bg-arca-positive rounded-full opacity-10 blur-3xl pointer-events-none" />
          <div className="absolute -left-20 -bottom-20 w-40 h-40 bg-arca-accent rounded-full opacity-10 blur-3xl pointer-events-none" />

          <div className="flex gap-4 relative z-10">
            {/* Ingresos (Left) */}
            <div className="flex-1 flex flex-col gap-1.5">
              <span className="text-[9px] font-extrabold text-arca-text-dim uppercase tracking-widest">
                INGRESOS
              </span>
              <div className="flex justify-between items-center text-xs">
                <span className="text-arca-text-secondary">Recibidos</span>
                <span className="font-semibold text-arca-positive drop-shadow-sm">
                  {formatCOP(monthlyBudget.receivedIncomes)}
                </span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-arca-text-secondary">Esperados</span>
                <span className="font-semibold text-arca-text-dim">
                  {formatCOP(monthlyBudget.expectedIncomes)}
                </span>
              </div>
            </div>

            {/* Vertical Divider */}
            <div className="w-[1px] bg-white/10 my-1" />

            {/* Obligaciones (Right) */}
            <div className="flex-1 flex flex-col gap-1.5">
              <span className="text-[9px] font-extrabold text-arca-text-dim uppercase tracking-widest">
                OBLIGACIONES
              </span>
              <div className="flex justify-between items-center text-xs">
                <span className="text-arca-text-secondary">Pagadas</span>
                <span className="font-semibold text-arca-text-primary">
                  {formatCOP(monthlyBudget.paidObligations)}
                </span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-arca-text-secondary">Pendientes</span>
                <span className="font-semibold text-arca-text-dim">
                  {formatCOP(monthlyBudget.pendingObligations)}
                </span>
              </div>
              <span className="text-[8px] leading-3 text-arca-text-dim mt-0.5">
                {metrics.overdue} vencidos · {metrics.today + metrics.upcoming} por vencer
              </span>
            </div>
          </div>

          <div className="w-full h-[1px] bg-white/10 my-0.5 relative z-10" />

          {/* Saldo estimado al cierre */}
          <div className="flex justify-between items-center font-bold relative z-10">
            <span className="text-xs text-arca-text-secondary">Saldo estimado al cierre</span>
            <span
              className={cn(
                "text-base drop-shadow-sm tracking-tight font-black",
                projectedClosingBalance >= 0 ? "text-arca-positive" : "text-arca-alert"
              )}
            >
              {formatCOP(projectedClosingBalance)}
            </span>
          </div>

          {/* Barra de Consumo de Límite (si hay presupuesto definido) */}
          {budget.hasBudget && (
            <div className="flex flex-col gap-2 mt-1 pt-3 border-t border-white/10">
              <div className="flex justify-between items-center text-[10px] font-bold text-arca-text-dim">
                <span>CONSUMIDO: {formatCOP(budget.consumed)}</span>
                <span>LÍMITE: {formatCOP(budget.limit)}</span>
              </div>
              <div className="h-1.5 w-full rounded-full bg-arca-surface-2 overflow-hidden">
                <div
                  className={cn(
                    "h-full transition-all",
                    (budget.utilization ?? 0) > 90 ? "bg-arca-alert" : "bg-arca-positive"
                  )}
                  style={{ width: `${Math.min(budget.utilization ?? 0, 100)}%` }}
                />
              </div>
            </div>
          )}

          <span className="relative z-10 flex items-center justify-end gap-1 text-[9px] font-black uppercase tracking-wider text-arca-accent">
            Ver detalle <ChevronRight size={13} />
          </span>
        </button>
      </div>

      <div className="px-1">
        <CalculationHelper
          title="Saldo estimado al cierre"
          description="Estimamos cuánto dinero disponible quedaría después de recibir los ingresos esperados y cubrir todas las obligaciones pendientes del mes."
          formula="Saldo disponible actual + ingresos esperados − obligaciones pendientes"
          includes={["Saldo de cuentas activas", "Ingresos pendientes del mes", "Pagos vencidos y próximos"]}
          excludes={["Ingresos ya recibidos", "Pagos ya realizados", "Ahorro protegido"]}
        />
      </div>

      {/* --- POSITION #2: MASTER CARD (CAJA LIBRE & DISPONIBLE REAL) --- */}
      <div
        className="relative overflow-hidden rounded-[26px] p-5 border border-arca-border/60 shadow-xl"
        style={{
          background: "linear-gradient(135deg, rgba(255,255,255,0.05) 0%, rgba(0,0,0,0.25) 100%)",
          backdropFilter: "blur(12px)",
        }}
      >
        {/* Decorative background glows */}
        <div className="absolute -right-12 -top-12 w-36 h-36 bg-arca-accent/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -left-12 -bottom-12 w-36 h-36 bg-arca-positive/15 rounded-full blur-3xl pointer-events-none" />

        {/* Master Card Header */}
        <div className="flex justify-between items-start mb-3 relative z-10">
          <div>
            <span className="text-[9px] font-black tracking-[0.2em] text-arca-accent uppercase">
              Caja Libre
            </span>
            <span className="block text-xs font-semibold text-arca-text-secondary">
              Disponible para gastar
            </span>
          </div>
          <span
            className={`rounded-full px-2.5 py-0.5 text-[9px] font-black uppercase tracking-wider ${
              metrics.overdue > 0 ? "bg-arca-alert/10 text-arca-alert border border-arca-alert/20" : "bg-arca-positive/10 text-arca-positive border border-arca-positive/20"
            }`}
          >
            {metrics.overdue > 0 ? `${metrics.overdue} vencidos` : "Al día ✦"}
          </span>
        </div>

        {/* Safe To Spend Amount */}
        <div className="mb-4 relative z-10">
          <div
            className={`text-4xl font-black tracking-tight ${
              cash.safeToSpend > 0 ? "text-white" : "text-arca-alert"
            } drop-shadow-md`}
          >
            <AnimatedNumber value={cash.safeToSpend} />
          </div>
          {cash.totalLent > 0 && (
            <div className="text-[11px] font-semibold text-arca-text-secondary mt-1">
              + <AnimatedNumber value={cash.totalLent} /> prestados a terceros
            </div>
          )}
        </div>

        {/* Filtered Active Accounts List (only balance !== 0) */}
        {activeAccounts.length > 0 && (
          <div className="mb-4 flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none relative z-10">
            {activeAccounts.map((acc) => {
              const color = acc.color || getAccountAccentColor(acc.name, acc.entity);
              return (
                <div
                  key={acc.id}
                  className="flex shrink-0 items-center gap-2 rounded-xl border bg-arca-surface-2/70 px-3 py-1.5 backdrop-blur-md"
                  style={{ borderColor: color ? `${color}60` : "var(--arca-border)" }}
                >
                  <span className="h-2 w-2 rounded-full shrink-0 shadow-sm" style={{ backgroundColor: color || "#fdda24" }} />
                  <span className="text-xs font-bold text-arca-text-primary">
                    {acc.name}: <span className="font-black">{formatCOP(acc.balance)}</span>
                  </span>
                </div>
              );
            })}
          </div>
        )}

        {/* Sub-Metrics Row */}
        <div className="flex justify-between items-end border-t border-white/10 pt-3 relative z-10">
          <div>
            <span className="text-[9px] font-extrabold uppercase tracking-widest text-arca-text-dim">
              Balance Total
            </span>
            <span className="block text-xs font-bold text-white/90">
              <AnimatedNumber value={cash.totalBalance} />
            </span>
          </div>

          <div className="text-right">
            <span className="text-[9px] font-extrabold uppercase tracking-widest text-arca-text-dim">
              Bolsillos
            </span>
            <span className="block text-xs font-bold text-arca-positive">
              <AnimatedNumber value={cash.protectedSavings} />
            </span>
          </div>
        </div>
      </div>

      {/* --- POSITION #3: BARRA DE ACCIONES RÁPIDAS (LUCIDE ICONS, SIN EMOJIS) --- */}
      <div className="grid grid-cols-3 gap-3">
        <button
          type="button"
          onClick={() => {
            haptics.medium();
            window.dispatchEvent(new CustomEvent("open-register", { detail: { segment: "Gasto" } }));
          }}
          className="group flex flex-col items-center justify-center gap-2 rounded-2xl border border-amber-500/30 bg-gradient-to-b from-amber-500/15 via-arca-surface-1 to-arca-surface-1 p-3.5 text-center shadow-sm backdrop-blur-md transition-all hover:border-amber-500/60 hover:shadow-md active:scale-95"
        >
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 group-hover:scale-110 transition-transform">
            <TrendingDown size={20} />
          </span>
          <span className="text-xs font-black text-amber-300 tracking-tight">+ Gasto</span>
        </button>

        <button
          type="button"
          onClick={() => {
            haptics.medium();
            window.dispatchEvent(new CustomEvent("open-register", { detail: { segment: "Ingreso" } }));
          }}
          className="group flex flex-col items-center justify-center gap-2 rounded-2xl border border-emerald-500/30 bg-gradient-to-b from-emerald-500/15 via-arca-surface-1 to-arca-surface-1 p-3.5 text-center shadow-sm backdrop-blur-md transition-all hover:border-emerald-500/60 hover:shadow-md active:scale-95"
        >
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 group-hover:scale-110 transition-transform">
            <TrendingUp size={20} />
          </span>
          <span className="text-xs font-black text-emerald-300 tracking-tight">+ Ingreso</span>
        </button>

        <button
          type="button"
          onClick={() => {
            haptics.medium();
            onOpenObligations?.("semana");
          }}
          className="group flex flex-col items-center justify-center gap-2 rounded-2xl border border-indigo-500/30 bg-gradient-to-b from-indigo-500/15 via-arca-surface-1 to-arca-surface-1 p-3.5 text-center shadow-sm backdrop-blur-md transition-all hover:border-indigo-500/60 hover:shadow-md active:scale-95"
        >
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 group-hover:scale-110 transition-transform">
            <CalendarClock size={20} />
          </span>
          <span className="text-xs font-black text-indigo-300 tracking-tight">Programar</span>
        </button>
      </div>

      {/* --- POSITION #4: ACTIONABLE LISTS (PAGOS CRÍTICOS, COBROS E INGRESOS) --- */}

      {/* PAGOS CRÍTICOS */}
      <div className="flex flex-col gap-3 mt-2">
        <div className="flex justify-between items-center px-1">
          <div className="flex items-center gap-2 text-arca-accent light:text-arca-light-accent">
            <AlertCircle size={14} />
            <span className="text-[12px] font-bold tracking-wider">PAGOS CRÍTICOS PENDIENTES</span>
          </div>
          <span className="text-[9px] font-bold tracking-wider text-arca-text-secondary light:text-arca-light-text-secondary">
            {criticalPayments.length} · {formatCOP(criticalPaymentsTotal)}
          </span>
        </div>
        <div className="flex flex-col overflow-hidden rounded-[20px] border border-arca-border/60 bg-arca-surface-1/55">
          {criticalPayments.length > 0 ? (
            <>
              <div className="divide-y divide-arca-border/60 light:divide-arca-light-border/60">
                {visibleCriticalPayments.map((p) => (
                  <button
                    type="button"
                    key={p.id}
                    className="group flex w-full items-center justify-between gap-3 px-3.5 py-3 text-left transition-colors hover:bg-arca-bg-secondary/60 light:hover:bg-arca-light-bg-secondary/60"
                    onClick={() => {
                      haptics.medium();
                      setSelectedCriticalPayment(p);
                    }}
                  >
                    <div className="min-w-0 flex flex-col gap-0.5">
                      <span className="truncate text-[13px] font-bold text-arca-text-primary light:text-arca-light-text-primary group-hover:text-arca-accent light:group-hover:text-arca-light-accent transition-colors">
                        {p.title}
                      </span>
                      <span
                        className={`text-[10px] font-bold uppercase tracking-wider ${
                          p.status === "overdue"
                            ? "text-arca-alert"
                            : p.status === "today"
                            ? "text-arca-accent light:text-arca-light-accent"
                            : "text-arca-text-secondary light:text-arca-light-text-secondary"
                        }`}
                      >
                        {p.dueLabel}
                      </span>
                    </div>
                    <span className="shrink-0 text-[13px] font-black text-arca-text-primary light:text-arca-light-text-primary">
                      {formatCOP(p.amount)}
                    </span>
                  </button>
                ))}
              </div>
              {criticalPayments.length > 3 ? (
                <CompactExpandButton
                  expanded={showAllCriticalPayments}
                  hiddenCount={criticalPayments.length - 3}
                  noun="pagos"
                  onClick={() => setShowAllCriticalPayments((value) => !value)}
                />
              ) : null}
            </>
          ) : (
            <div className="p-5 flex items-center">
              <span className="text-sm text-arca-text-dim light:text-arca-light-text-secondary font-medium">
                No hay pagos críticos pendientes. ¡Estás al día!
              </span>
            </div>
          )}
        </div>
      </div>

      {/* PRESTAMOS A COBRAR (RECEIVABLES) */}
      <div className="flex flex-col gap-3 mt-2">
        <div className="flex justify-between items-center px-1">
          <div className="flex items-center gap-2 text-arca-positive light:text-arca-light-positive">
            <Receipt size={14} />
            <span className="text-[12px] font-bold tracking-wider">INGRESOS POR COBRAR</span>
          </div>
          <span className="text-[9px] font-bold tracking-wider text-arca-text-secondary light:text-arca-light-text-secondary">
            {receivables.length} · {formatCOP(receivablesTotal)}
          </span>
        </div>
        <div className="flex flex-col overflow-hidden rounded-[20px] border border-arca-border/60 bg-arca-surface-1/55">
          {receivables.length > 0 ? (
            <>
              <div className="divide-y divide-arca-border/60 light:divide-arca-light-border/60">
                {visibleReceivables.map((r) => (
                  <button
                    type="button"
                    key={r.id}
                    className="group flex w-full items-center justify-between gap-3 px-3.5 py-3 text-left transition-colors hover:bg-arca-bg-secondary/60 light:hover:bg-arca-light-bg-secondary/60"
                    onClick={() => {
                      haptics.medium();
                      setActionSheetReceivable(r);
                    }}
                  >
                    <div className="min-w-0 flex flex-col gap-0.5">
                      <span className="truncate text-[13px] font-bold text-arca-text-primary light:text-arca-light-text-primary group-hover:text-arca-positive light:group-hover:text-arca-light-positive transition-colors">
                        {r.debtorName} · {r.title}
                      </span>
                      <span
                        className={`text-[10px] font-bold uppercase tracking-wider ${
                          r.status === "overdue"
                            ? "text-arca-alert"
                            : r.status === "today"
                            ? "text-arca-positive light:text-arca-light-positive"
                            : "text-arca-text-secondary light:text-arca-light-text-secondary"
                        }`}
                      >
                        {r.dueLabel}
                      </span>
                    </div>
                    <span className="shrink-0 text-[13px] font-black text-arca-positive light:text-arca-light-positive">
                      {formatCOP(r.amount)}
                    </span>
                  </button>
                ))}
              </div>
              {receivables.length > 2 ? (
                <CompactExpandButton
                  expanded={showAllReceivables}
                  hiddenCount={receivables.length - 2}
                  noun="cobros"
                  onClick={() => setShowAllReceivables((value) => !value)}
                />
              ) : null}
            </>
          ) : (
            <div className="p-5 flex items-center">
              <span className="text-sm text-arca-text-dim light:text-arca-light-text-secondary font-medium">
                No hay préstamos ni cuentas por cobrar registradas.
              </span>
            </div>
          )}
        </div>
      </div>

      {/* INGRESOS ESPERADOS */}
      <div className="flex flex-col gap-3 mt-2">
        <div className="flex justify-between items-center px-1">
          <div className="flex items-center gap-2 text-arca-positive light:text-arca-light-positive">
            <TrendingUp size={14} />
            <span className="text-[12px] font-bold tracking-wider">INGRESOS ESPERADOS DEL MES</span>
          </div>
          <span className="text-[9px] font-bold tracking-wider text-arca-text-secondary light:text-arca-light-text-secondary">
            {upcomingIncomes.length} · {formatCOP(upcomingIncomesTotal)}
          </span>
        </div>
        <div className="flex flex-col overflow-hidden rounded-[20px] border border-arca-border/60 bg-arca-surface-1/55">
          {upcomingIncomes.length > 0 ? (
            <>
              <div className="divide-y divide-arca-border/60 light:divide-arca-light-border/60">
                {visibleIncomes.map((inc) => (
                  <button
                    type="button"
                    key={inc.id}
                    className="group flex w-full items-center justify-between gap-3 px-3.5 py-3 text-left transition-colors hover:bg-arca-bg-secondary/60 light:hover:bg-arca-light-bg-secondary/60"
                    onClick={() => handleOpenActionSheet(inc)}
                  >
                    <div className="min-w-0 flex flex-col gap-0.5">
                      <span className="truncate text-[13px] font-bold text-arca-text-primary light:text-arca-light-text-primary group-hover:text-arca-positive light:group-hover:text-arca-light-positive transition-colors">
                        {inc.title}
                      </span>
                      <span className="text-[10px] font-bold text-arca-text-secondary light:text-arca-light-text-secondary uppercase tracking-wider">
                        {inc.dueLabel}
                      </span>
                    </div>
                    <span className="shrink-0 text-[13px] font-black text-arca-positive light:text-arca-light-positive">
                      {formatCOP(inc.amount)}
                    </span>
                  </button>
                ))}
              </div>
              {upcomingIncomes.length > 2 ? (
                <CompactExpandButton
                  expanded={showAllIncomes}
                  hiddenCount={upcomingIncomes.length - 2}
                  noun="ingresos"
                  onClick={() => setShowAllIncomes((value) => !value)}
                />
              ) : null}
            </>
          ) : (
            <div className="p-5 flex items-center">
              <span className="text-sm text-arca-text-dim light:text-arca-light-text-secondary font-medium">
                No hay ingresos programados pendientes este mes.
              </span>
            </div>
          )}
        </div>
      </div>

      {/* --- POSITION #5: CARD NOVA DECISIÓN DE HOY (FOOTER RESUMEN INTELIGENTE) --- */}
      <aside className="rounded-[24px] border border-arca-accent/30 bg-gradient-to-r from-amber-500/10 via-arca-surface-1 to-purple-600/10 p-4 shadow-md mt-4">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-arca-accent/15 text-arca-accent border border-arca-accent/30">
            <Sparkles size={18} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[9px] font-black uppercase tracking-[0.18em] text-arca-accent">
              Nova · decisión de hoy
            </p>
            <h2 className="mt-1 text-sm font-black text-arca-text-primary">
              Organiza lo importante conmigo
            </h2>
            <p className="mt-1 text-[11px] leading-5 text-arca-text-secondary">
              Puedo priorizar tus {metrics.overdue} pagos vencidos y los {metrics.today + metrics.upcoming} que vienen, cuidando tu saldo disponible.
            </p>
            <button
              type="button"
              onClick={() =>
                onOpenNova(
                  `Revisa mi situación de hoy. Tengo ${formatCOP(cash.safeToSpend)} disponibles, ${metrics.overdue} pagos vencidos, ${metrics.today + metrics.upcoming} pagos por vencer, ${formatCOP(monthlyBudget.expectedIncomes)} por ingresar y un saldo estimado al cierre de ${formatCOP(projectedClosingBalance)}. Ayúdame a priorizar acciones concretas.`
                )
              }
              className="mt-3 inline-flex h-10 items-center gap-2 rounded-xl bg-arca-accent px-4 text-[10px] font-black uppercase tracking-wider text-black active:scale-95 transition-transform shadow-md"
            >
              <Sparkles size={14} /> Revisar con Nova
            </button>
          </div>
        </div>
      </aside>

      {/* --- FLOATING BETA TESTER BUTTON --- */}
      {onOpenFeedback && (
        <div className="fixed bottom-24 right-4 z-[90]">
          <button
            type="button"
            onClick={() => {
              haptics.medium();
              onOpenFeedback();
            }}
            className="flex items-center gap-2 rounded-full border border-pink-500/40 bg-pink-500/20 px-3.5 py-2 text-pink-300 backdrop-blur-md shadow-lg transition-all hover:bg-pink-500/30 active:scale-95"
          >
            <MessageSquareHeart size={16} className="text-pink-400" />
            <span className="text-[10px] font-black uppercase tracking-wider">Feedback</span>
          </button>
        </div>
      )}

      {/* --- MODALES INTERACTIVOS --- */}
      {actionSheetIncome ? (
        <ObligationActionModal
          obligation={mappedIncomeObligation}
          accounts={data.accountOptions}
          onClose={() => setActionSheetIncome(null)}
          onRefresh={() => {
            router.refresh();
            setActionSheetIncome(null);
          }}
        />
      ) : null}

      {actionSheetReceivable ? (
        <ReceivableActionModal
          receivable={actionSheetReceivable}
          accounts={data.accountOptions}
          onClose={() => setActionSheetReceivable(null)}
          onRefresh={() => {
            router.refresh();
            setActionSheetReceivable(null);
          }}
        />
      ) : null}

      {selectedCriticalPayment ? (
        <ObligationActionModal
          obligation={mappedObligation}
          accounts={data.accountOptions}
          onClose={() => setSelectedCriticalPayment(null)}
          onRefresh={() => {
            router.refresh();
            setSelectedCriticalPayment(null);
          }}
        />
      ) : null}

      {showMonthlyBudget ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md"
          onClick={() => setShowMonthlyBudget(false)}
        >
          <div
            className="w-full max-w-md rounded-3xl border border-arca-border bg-arca-base p-6 shadow-2xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-black uppercase tracking-wider text-arca-accent">
                  Detalle del Presupuesto
                </p>
                <h3 className="text-xl font-black text-arca-text-primary">
                  Cierre de Mes Estimado
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowMonthlyBudget(false)}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-arca-surface-2 text-arca-text-dim"
              >
                <X size={16} />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <ModalMetric label="Ingresos totales" value={monthlyBudget.receivedIncomes + monthlyBudget.expectedIncomes} tone="positive" />
              <ModalMetric label="Obligaciones totales" value={monthlyBudget.paidObligations + monthlyBudget.pendingObligations} tone="alert" />
            </div>

            <div className="mt-4 rounded-2xl border border-arca-border bg-arca-surface-1 px-4 py-3">
              <div className="flex items-center justify-between gap-4">
                <span className="text-[10px] font-bold text-arca-text-secondary">
                  Flujo proyectado del mes
                </span>
                <strong className={projectedMonthlyFlow >= 0 ? "text-arca-positive" : "text-arca-alert"}>
                  {formatCOP(projectedMonthlyFlow)}
                </strong>
              </div>
            </div>

            <div className="mt-5 space-y-3">
              <BudgetDetailGroup label="Recibido" total={monthlyBudget.receivedIncomes} items={monthlyBudget.receivedItems} tone="positive" />
              <BudgetDetailGroup label="Por recibir" total={monthlyBudget.expectedIncomes} items={monthlyBudget.expectedItems} tone="positive" />
              <BudgetDetailGroup label="Pagado" total={monthlyBudget.paidObligations} items={monthlyBudget.paidItems} tone="neutral" />
              <BudgetDetailGroup label="Pendiente" total={monthlyBudget.pendingObligations} items={monthlyBudget.pendingItems} tone="alert" />
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function CompactExpandButton({
  expanded,
  hiddenCount,
  noun,
  onClick,
}: {
  expanded: boolean;
  hiddenCount: number;
  noun: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center justify-center gap-1.5 border-t border-arca-border/50 bg-arca-surface-2/20 px-3 py-2.5 text-[9px] font-black uppercase tracking-wider text-arca-text-dim transition-colors hover:text-arca-accent"
    >
      {expanded ? "Mostrar menos" : `Ver ${hiddenCount} ${noun} más`}
      <ChevronRight size={13} className={cn("transition-transform", expanded ? "-rotate-90" : "rotate-90")} />
    </button>
  );
}

function ModalMetric({ label, value, tone }: { label: string; value: number; tone: "positive" | "alert" }) {
  return (
    <div className="rounded-2xl border border-arca-border bg-arca-surface-1 p-3">
      <p className="text-[8px] font-black uppercase tracking-wider text-arca-text-dim">{label}</p>
      <p className={cn("mt-1 text-base font-black", tone === "positive" ? "text-arca-positive" : "text-arca-alert")}>
        {formatCOP(value)}
      </p>
    </div>
  );
}

function BudgetDetailGroup({
  label,
  total,
  items,
  tone,
}: {
  label: string;
  total: number;
  items: TodayMonthlyBudgetItem[];
  tone: "positive" | "alert" | "neutral";
}) {
  const toneClass = tone === "positive" ? "text-arca-positive" : tone === "alert" ? "text-arca-alert" : "text-arca-text-primary";
  return (
    <details className="group overflow-hidden rounded-2xl border border-arca-border bg-arca-surface-1">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-4">
        <span>
          <span className="block text-xs font-black text-arca-text-primary">{label}</span>
          <span className="mt-1 block text-[9px] text-arca-text-dim">
            {items.length} {items.length === 1 ? "registro" : "registros"}
          </span>
        </span>
        <span className="flex items-center gap-2">
          <strong className={cn("text-sm", toneClass)}>{formatCOP(total)}</strong>
          <ChevronRight size={15} className="text-arca-text-dim transition-transform group-open:rotate-90" />
        </span>
      </summary>
      <div className="divide-y divide-arca-border border-t border-arca-border px-4">
        {items.length ? (
          items.map((item) => (
            <div key={item.id} className="flex items-center justify-between gap-4 py-3">
              <span className="min-w-0">
                <span className="block truncate text-[11px] font-bold text-arca-text-primary">{item.title}</span>
                <span className="mt-1 block text-[9px] text-arca-text-dim">{item.dateLabel}</span>
              </span>
              <strong className={cn("shrink-0 text-xs", toneClass)}>{formatCOP(item.amount)}</strong>
            </div>
          ))
        ) : (
          <p className="py-4 text-[10px] text-arca-text-dim">No hay registros en esta sección.</p>
        )}
      </div>
    </details>
  );
}
