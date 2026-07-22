"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  AlertTriangle,
  ArrowRight,
  BarChart3,
  CalendarClock,
  CircleDollarSign,
  Lightbulb,
  Plus,
  ReceiptText,
  Sparkles,
  WalletCards,
  X,
} from "lucide-react";
import type { TodayViewModel } from "@/src/lib/today-data";
import { haptics } from "@/src/lib/haptics";
import { AnimatedNumber } from "@/src/components/animated-number";

function formatMoney(amount: number, currency: string) {
  const normalizedCurrency = currency?.trim().toUpperCase();
  const safeCurrency = normalizedCurrency && /^[A-Z]{3}$/.test(normalizedCurrency)
    ? normalizedCurrency
    : "COP";

  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: safeCurrency,
    maximumFractionDigits: 0,
  }).format(amount);
}

type NovaHomeProps = {
  data: TodayViewModel;
  currency: string;
  onOpenNova: (prompt?: string) => void;
  onOpenObligations: () => void;
  onOpenMovements: () => void;
  onOpenSummary: () => void;
};

const NOVA_EXAMPLES = [
  { emoji: "📊", label: "Revisa mis gastos del mes", prompt: "Revisa mis gastos del mes y dime cómo voy" },
  { emoji: "💰", label: "¿Cuánto puedo gastar esta semana?", prompt: "¿Cuánto puedo gastar esta semana sin afectar mis pagos?" },
  { emoji: "📅", label: "¿Qué pagos tengo pendientes?", prompt: "¿Qué pagos tengo pendientes?" },
  { emoji: "🏦", label: "Programa un pago nuevo", prompt: "Quiero programar un pago" },
  { emoji: "📈", label: "Analiza mis ingresos vs gastos", prompt: "Analiza mis ingresos vs mis gastos de este mes" },
];

export default function NovaHome({
  data,
  currency,
  onOpenNova,
  onOpenObligations,
  onOpenMovements,
  onOpenSummary,
}: NovaHomeProps) {
  const [showExamples, setShowExamples] = useState(false);
  const [showUpcomingModal, setShowUpcomingModal] = useState(false);
  const [showIncomesModal, setShowIncomesModal] = useState(false);

  const overduePayments = data.criticalPayments.filter((payment) => payment.status === "overdue");
  const upcomingPayments = data.criticalPayments.filter((payment) => payment.status !== "overdue");
  const nextPayment = upcomingPayments[0] ?? null;
  const overdueTotal = overduePayments.reduce((sum, payment) => sum + payment.amount, 0);
  const upcomingPaymentsTotal = upcomingPayments.reduce((sum, payment) => sum + payment.amount, 0);

  // Filter incomes to current month only
  const currentMonthStr = new Date().toISOString().slice(0, 7);
  const thisMonthIncomes = data.upcomingIncomes.filter((inc) => {
    if (inc.dueDate) return inc.dueDate.startsWith(currentMonthStr);
    return true;
  });

  const openRegister = () => {
    haptics.medium();
    window.dispatchEvent(new CustomEvent("open-register", { detail: { segment: "Grid" } }));
  };

  return (
    <div className="flex w-full flex-col gap-4 font-sans pb-4">
      {/* HEADER */}
      <header className="flex items-start justify-between">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-arca-text-dim light:text-arca-light-text-secondary">
            {data.greeting.dateLabel}
          </p>
          <h1 className="mt-1 text-3xl font-black tracking-tight text-arca-text-primary light:text-arca-light-text-primary">
            Hola, {data.greeting.firstName}
          </h1>
        </div>
        <button
          type="button"
          onClick={() => { haptics.medium(); onOpenNova(); }}
          aria-label="Abrir Nova AI"
          className="relative flex h-11 w-11 items-center justify-center rounded-2xl border border-arca-accent/35 bg-arca-accent/10 text-arca-accent shadow-[0_0_12px_rgba(245,158,11,0.2)] transition-all hover:bg-arca-accent/20 active:scale-95 light:bg-arca-light-surface-2"
        >
          <Sparkles size={20} />
          <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-arca-accent text-[8px] font-black text-black">
            ✦
          </span>
        </button>
      </header>

      {/* --- RESUMEN FINANCIERO CARD --- */}
      <button
        type="button"
        onClick={() => { haptics.medium(); onOpenSummary(); }}
        className="group flex w-full items-center gap-4 rounded-2xl border border-arca-border border-l-4 border-l-arca-accent bg-gradient-to-r from-arca-surface-1 via-arca-surface-2 to-arca-surface-1 p-4 text-left shadow-sm transition-all hover:border-arca-accent/50 light:from-arca-light-surface-1 light:to-arca-light-surface-2 light:border-arca-light-border active:scale-[0.99]"
      >
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-arca-accent/10 border border-arca-accent/20 text-arca-accent">
          <BarChart3 size={20} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[10px] font-black uppercase tracking-[0.16em] text-arca-accent">
            Vista completa
          </span>
          <span className="mt-0.5 block text-sm font-black text-arca-text-primary light:text-arca-light-text-primary">
            Ver resumen financiero
          </span>
        </span>
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-arca-border bg-arca-surface-2 text-arca-accent transition-transform group-hover:translate-x-1 light:border-arca-light-border light:bg-arca-light-surface-2">
          <ArrowRight size={15} />
        </span>
      </button>

      {/* --- MAIN FINANCIAL CARD --- */}
      <section className="relative overflow-hidden rounded-[28px] border border-arca-border-strong bg-arca-surface-1 p-5 shadow-lg light:border-arca-light-border light:bg-arca-light-surface-1">
        <div className="relative">
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-arca-accent/10 text-arca-accent">
              <Sparkles size={16} />
            </span>
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-arca-accent">Nova</p>
              <p className="text-xs font-semibold text-arca-text-secondary light:text-arca-light-text-secondary">Tu resumen de hoy</p>
            </div>
            <span className={`ml-auto rounded-full px-2.5 py-1 text-[9px] font-black uppercase tracking-wider ${overduePayments.length > 0 ? "bg-arca-alert/10 text-arca-alert" : "bg-arca-positive/10 text-arca-positive"}`}>
              {overduePayments.length > 0 ? `${overduePayments.length} vencidos` : "Al día"}
            </span>
          </div>

          <div className="mt-5">
            <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-arca-text-dim light:text-arca-light-text-secondary">
              Disponible ahora
            </p>
            <p className="mt-1.5 text-[38px] font-black leading-none tracking-[-0.055em] text-arca-text-primary light:text-arca-light-text-primary">
              <AnimatedNumber value={data.cash.safeToSpend} />
            </p>
          </div>

          {/* METRIC CARDS WITH BREAKDOWN MODALS */}
          <div className="mt-5 grid grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={() => { haptics.medium(); setShowUpcomingModal(true); }}
              className="group rounded-2xl border border-arca-border bg-arca-surface-2/70 p-3.5 text-left transition-colors hover:border-arca-accent/40 light:border-arca-light-border light:bg-arca-light-surface-2"
            >
              <div className="flex items-center justify-between text-arca-text-dim light:text-arca-light-text-secondary">
                <div className="flex items-center gap-1.5">
                  <CalendarClock size={14} />
                  <span className="text-[9px] font-black uppercase tracking-wider">Próximos 7 días</span>
                </div>
              </div>
              <p className="mt-2 text-base font-black text-arca-text-primary light:text-arca-light-text-primary">
                <AnimatedNumber value={upcomingPaymentsTotal} />
              </p>
              <p className="mt-0.5 text-[10px] font-bold text-arca-accent">
                {upcomingPayments.length} {upcomingPayments.length === 1 ? "pago" : "pagos"}
              </p>
            </button>

            <button
              type="button"
              onClick={() => { haptics.medium(); setShowIncomesModal(true); }}
              className="group rounded-2xl border border-arca-border bg-arca-surface-2/70 p-3.5 text-left transition-colors hover:border-arca-positive/40 light:border-arca-light-border light:bg-arca-light-surface-2"
            >
              <div className="flex items-center justify-between text-arca-text-dim light:text-arca-light-text-secondary">
                <div className="flex items-center gap-1.5">
                  <CircleDollarSign size={14} />
                  <span className="text-[9px] font-black uppercase tracking-wider">Por ingresar</span>
                </div>
              </div>
              <p className="mt-2 text-base font-black text-arca-text-primary light:text-arca-light-text-primary">
                <AnimatedNumber value={data.monthlyBudget.expectedIncomes} />
              </p>
              <p className="mt-0.5 text-[10px] font-bold text-arca-positive">Este mes</p>
            </button>
          </div>

          {/* Context alert */}
          <div className="mt-3 rounded-2xl border border-arca-border bg-arca-base/35 p-3.5 light:border-arca-light-border light:bg-arca-light-base/60">
            {overduePayments.length > 0 ? (
              <div className="flex items-start gap-3">
                <AlertTriangle className="mt-0.5 shrink-0 text-arca-alert" size={17} />
                <div>
                  <p className="text-xs font-bold text-arca-text-primary light:text-arca-light-text-primary">
                    Tienes {overduePayments.length} {overduePayments.length === 1 ? "pago vencido" : "pagos vencidos"}
                  </p>
                  <p className="mt-0.5 text-[11px] text-arca-text-secondary light:text-arca-light-text-secondary">
                    Suman <AnimatedNumber value={overdueTotal} />.
                  </p>
                </div>
              </div>
            ) : nextPayment ? (
              <div className="flex items-start gap-3">
                <CalendarClock className="mt-0.5 shrink-0 text-arca-accent" size={17} />
                <div>
                  <p className="text-xs font-bold text-arca-text-primary light:text-arca-light-text-primary">
                    Tu siguiente compromiso es {nextPayment.title}
                  </p>
                  <p className="mt-0.5 text-[11px] text-arca-text-secondary light:text-arca-light-text-secondary">
                    {nextPayment.dueLabel} · <AnimatedNumber value={nextPayment.amount} />
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex items-start gap-3">
                <CircleDollarSign className="mt-0.5 shrink-0 text-arca-positive" size={17} />
                <div>
                  <p className="text-xs font-bold text-arca-text-primary light:text-arca-light-text-primary">
                    Tu semana está bajo control
                  </p>
                  <p className="mt-0.5 text-[11px] text-arca-text-secondary light:text-arca-light-text-secondary">
                    No tienes compromisos pendientes.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* PRIMARY CTA */}
          <button
            type="button"
            onClick={() => { haptics.medium(); setShowExamples(true); }}
            className="mt-4 flex h-11 w-full items-center justify-center gap-2 rounded-2xl bg-arca-accent px-4 text-xs font-black text-black transition-transform active:scale-[0.98]"
          >
            <Lightbulb size={16} />
            Pídele algo a Nova
          </button>
        </div>
      </section>

      {/* --- SUGGESTION CHIPS --- */}
      <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
        {[
          "¿Qué pagos tengo pendientes?",
          "Resume mis gastos del mes",
          "¿Cuánto puedo gastar esta semana?",
        ].map((suggestion) => (
          <button
            type="button"
            key={suggestion}
            onClick={() => onOpenNova(suggestion)}
            className="shrink-0 rounded-full border border-arca-border bg-arca-surface-1 px-3 py-1.5 text-[11px] font-semibold text-arca-text-secondary light:border-arca-light-border light:bg-arca-light-surface-1 light:text-arca-light-text-secondary"
          >
            {suggestion}
          </button>
        ))}
      </div>

      {/* --- QUICK ACTIONS --- */}
      <section>
        <h2 className="mb-2.5 text-[10px] font-black uppercase tracking-[0.16em] text-arca-text-secondary light:text-arca-light-text-secondary">
          Acciones rápidas
        </h2>

        <div className="grid grid-cols-3 gap-2">
          <button type="button" onClick={openRegister} className="rounded-2xl border border-arca-border bg-arca-surface-1 p-3 text-left light:border-arca-light-border light:bg-arca-light-surface-1">
            <Plus size={17} className="text-arca-accent" />
            <span className="mt-2 block text-xs font-bold">Registrar</span>
          </button>
          <button type="button" onClick={onOpenObligations} className="rounded-2xl border border-arca-border bg-arca-surface-1 p-3 text-left light:border-arca-light-border light:bg-arca-light-surface-1">
            <ReceiptText size={17} className="text-arca-accent" />
            <span className="mt-2 block text-xs font-bold">Pagos</span>
          </button>
          <button type="button" onClick={onOpenMovements} className="rounded-2xl border border-arca-border bg-arca-surface-1 p-3 text-left light:border-arca-light-border light:bg-arca-light-surface-1">
            <WalletCards size={17} className="text-arca-accent" />
            <span className="mt-2 block text-xs font-bold">Movimientos</span>
          </button>
        </div>
      </section>

      {/* --- MODAL 1: DESGLOSE PRÓXIMOS 7 DÍAS --- */}
      <AnimatePresence>
        {showUpcomingModal && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[5000] flex items-end sm:items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
            onClick={() => setShowUpcomingModal(false)}
          >
            <motion.div
              initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              onClick={(e) => e.stopPropagation()}
              className="card-arca max-h-[80vh] w-full max-w-md overflow-y-auto p-5 sm:p-6"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[9px] font-black uppercase tracking-[0.2em] text-arca-accent">Próximos 7 días</p>
                  <h3 className="text-base font-black text-arca-text-primary">Compromisos de la semana</h3>
                </div>
                <button type="button" onClick={() => setShowUpcomingModal(false)} className="rounded-full bg-arca-surface-2 p-2 text-arca-text-dim">
                  <X size={16} />
                </button>
              </div>

              <div className="mt-4 space-y-2.5">
                {upcomingPayments.length > 0 ? (
                  upcomingPayments.map((p) => (
                    <div key={p.id} className="flex items-center justify-between rounded-xl border border-arca-border bg-arca-surface-1 p-3">
                      <div>
                        <p className="text-xs font-bold text-arca-text-primary">{p.title}</p>
                        <p className="text-[10px] text-arca-accent font-semibold">{p.dueLabel}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs font-black text-arca-text-primary">{formatMoney(p.amount, currency)}</p>
                        <button
                          type="button"
                          onClick={() => {
                            setShowUpcomingModal(false);
                            onOpenObligations();
                          }}
                          className="mt-1 inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-wider text-arca-accent"
                        >
                          Pagar <ArrowRight size={10} />
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-arca-text-dim py-2">No tienes compromisos en los próximos 7 días.</p>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* --- MODAL 2: DESGLOSE POR INGRESAR (ESTE MES SOLAMENTE) --- */}
      <AnimatePresence>
        {showIncomesModal && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[5000] flex items-end sm:items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
            onClick={() => setShowIncomesModal(false)}
          >
            <motion.div
              initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              onClick={(e) => e.stopPropagation()}
              className="card-arca max-h-[80vh] w-full max-w-md overflow-y-auto p-5 sm:p-6"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[9px] font-black uppercase tracking-[0.2em] text-arca-positive">Proyección</p>
                  <h3 className="text-base font-black text-arca-text-primary">Ingresos esperados este mes</h3>
                </div>
                <button type="button" onClick={() => setShowIncomesModal(false)} className="rounded-full bg-arca-surface-2 p-2 text-arca-text-dim">
                  <X size={16} />
                </button>
              </div>

              <div className="mt-4 space-y-2.5">
                {thisMonthIncomes.length > 0 ? (
                  thisMonthIncomes.map((inc) => (
                    <div key={inc.id} className="flex items-center justify-between rounded-xl border border-arca-border bg-arca-surface-1 p-3">
                      <div>
                        <p className="text-xs font-bold text-arca-text-primary">{inc.title}</p>
                        <p className="text-[10px] text-arca-positive font-semibold">{inc.dueLabel}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs font-black text-arca-positive">+{formatMoney(inc.amount, currency)}</p>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-arca-text-dim py-2">No hay ingresos adicionales programados para este mes.</p>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* --- NOVA EXAMPLES MODAL --- */}
      <AnimatePresence>
        {showExamples && (
          <motion.div
            key="nova-examples-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[5000] flex items-end justify-center bg-black/60 backdrop-blur-sm"
            onClick={() => setShowExamples(false)}
          >
            <motion.div
              key="nova-examples-modal"
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', stiffness: 320, damping: 32 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md rounded-t-[30px] border border-b-0 border-arca-border bg-arca-bg px-5 pb-[calc(1.5rem+env(safe-area-inset-bottom))] pt-5"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[9px] font-black uppercase tracking-[0.2em] text-arca-accent">Nova</p>
                  <h3 className="mt-0.5 text-lg font-black text-arca-text-primary">¿Qué puedo hacer por ti?</h3>
                </div>
                <button
                  onClick={() => setShowExamples(false)}
                  aria-label="Cerrar"
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-arca-surface-2 text-arca-text-dim"
                >
                  <X size={18} />
                </button>
              </div>
              <p className="mt-2 text-xs text-arca-text-dim">Toca una sugerencia para preguntarme directamente.</p>
              <div className="mt-5 space-y-2">
                {NOVA_EXAMPLES.map((example) => (
                  <button
                    key={example.prompt}
                    type="button"
                    onClick={() => {
                      setShowExamples(false);
                      haptics.medium();
                      onOpenNova(example.prompt);
                    }}
                    className="flex w-full items-center gap-3 rounded-2xl border border-arca-border bg-arca-surface-1 p-4 text-left transition-colors hover:bg-arca-surface-2 active:scale-[0.99]"
                  >
                    <span className="text-lg">{example.emoji}</span>
                    <span className="flex-1 text-sm font-bold text-arca-text-primary">{example.label}</span>
                    <ArrowRight size={16} className="shrink-0 text-arca-text-dim" />
                  </button>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
