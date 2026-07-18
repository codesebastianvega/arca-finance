"use client";

import { useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  BarChart3,
  CalendarClock,
  CircleDollarSign,
  Plus,
  ReceiptText,
  Send,
  Sparkles,
  WalletCards,
} from "lucide-react";
import type { TodayViewModel } from "@/src/lib/today-data";
import { haptics } from "@/src/lib/haptics";

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

export default function NovaHome({
  data,
  currency,
  onOpenNova,
  onOpenObligations,
  onOpenMovements,
  onOpenSummary,
}: NovaHomeProps) {
  const [prompt, setPrompt] = useState("");
  const overduePayments = data.criticalPayments.filter((payment) => payment.status === "overdue");
  const nextPayment = data.criticalPayments[0] ?? null;
  const overdueTotal = overduePayments.reduce((sum, payment) => sum + payment.amount, 0);
  const upcomingPaymentsTotal = data.criticalPayments.reduce((sum, payment) => sum + payment.amount, 0);

  const submitPrompt = () => {
    const value = prompt.trim();
    if (!value) return;
    haptics.medium();
    onOpenNova(value);
    setPrompt("");
  };

  const openRegister = () => {
    haptics.medium();
    window.dispatchEvent(new CustomEvent("open-register", { detail: { segment: "Grid" } }));
  };

  return (
    <div className="flex w-full flex-col gap-5 font-sans">
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
          onClick={() => onOpenNova()}
          aria-label="Abrir Nova"
          className="flex h-11 w-11 items-center justify-center rounded-full border border-arca-accent/30 bg-arca-accent/10 text-arca-accent transition-colors hover:bg-arca-accent/15"
        >
          <Sparkles size={20} />
        </button>
      </header>

      <section className="relative overflow-hidden rounded-[30px] border border-arca-border-strong bg-arca-surface-1 p-5 shadow-[0_20px_55px_-32px_rgba(0,0,0,0.85)] light:border-arca-light-border light:bg-arca-light-surface-1">
        <div className="absolute -right-14 -top-16 h-36 w-36 rounded-full bg-arca-accent/[0.07] blur-3xl" />
        <div className="relative">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-arca-accent/10 text-arca-accent">
                <Sparkles size={17} />
              </span>
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-arca-accent">Nova</p>
                <p className="text-xs font-semibold text-arca-text-secondary">Resumen de hoy</p>
              </div>
            </div>
            <span className={`rounded-full px-2.5 py-1 text-[9px] font-black uppercase tracking-wider ${overduePayments.length > 0 ? "bg-arca-alert/10 text-arca-alert" : "bg-arca-positive/10 text-arca-positive"}`}>
              {overduePayments.length > 0 ? `${overduePayments.length} vencidos` : "Al día"}
            </span>
          </div>

          <div className="mt-7">
            <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-arca-text-dim">
              Disponible ahora
            </p>
            <p className="mt-1.5 text-[42px] font-black leading-none tracking-[-0.055em] text-arca-text-primary light:text-arca-light-text-primary">
              {formatMoney(data.cash.safeToSpend, currency)}
            </p>
            <p className="mt-2 text-xs text-arca-text-secondary">
              Saldo disponible en tus cuentas activas
            </p>
          </div>

          <div className="mt-6 grid grid-cols-2 gap-2.5">
            <div className="rounded-2xl border border-arca-border bg-arca-surface-2/70 p-3.5">
              <div className="flex items-center gap-2 text-arca-text-dim">
                <CalendarClock size={14} />
                <span className="text-[9px] font-black uppercase tracking-wider">Próximos 7 días</span>
              </div>
              <p className="mt-2 text-lg font-black text-arca-text-primary">
                {formatMoney(upcomingPaymentsTotal, currency)}
              </p>
              <p className="mt-0.5 text-[10px] text-arca-text-dim">
                {data.criticalPayments.length} {data.criticalPayments.length === 1 ? "pago" : "pagos"}
              </p>
            </div>
            <div className="rounded-2xl border border-arca-border bg-arca-surface-2/70 p-3.5">
              <div className="flex items-center gap-2 text-arca-text-dim">
                <CircleDollarSign size={14} />
                <span className="text-[9px] font-black uppercase tracking-wider">Por ingresar</span>
              </div>
              <p className="mt-2 text-lg font-black text-arca-text-primary">
                {formatMoney(data.monthlyBudget.expectedIncomes, currency)}
              </p>
              <p className="mt-0.5 text-[10px] text-arca-text-dim">Este mes</p>
            </div>
          </div>

          <div className="mt-3 rounded-2xl border border-arca-border bg-arca-base/35 p-4 light:border-arca-light-border light:bg-arca-light-base/60">
            {overduePayments.length > 0 ? (
              <div className="flex items-start gap-3">
                <AlertTriangle className="mt-0.5 shrink-0 text-arca-alert" size={18} />
                <div>
                  <p className="text-sm font-bold text-arca-text-primary light:text-arca-light-text-primary">
                    Tienes {overduePayments.length} {overduePayments.length === 1 ? "pago vencido" : "pagos vencidos"}
                  </p>
                  <p className="mt-1 text-xs leading-relaxed text-arca-text-secondary light:text-arca-light-text-secondary">
                    Suman {formatMoney(overdueTotal, currency)}. Puedo priorizarlos según tu saldo disponible.
                  </p>
                </div>
              </div>
            ) : nextPayment ? (
              <div className="flex items-start gap-3">
                <CalendarClock className="mt-0.5 shrink-0 text-arca-accent" size={18} />
                <div>
                  <p className="text-sm font-bold text-arca-text-primary light:text-arca-light-text-primary">
                    Tu siguiente compromiso es {nextPayment.title}
                  </p>
                  <p className="mt-1 text-xs leading-relaxed text-arca-text-secondary light:text-arca-light-text-secondary">
                    {nextPayment.dueLabel} · {formatMoney(nextPayment.amount, currency)}
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex items-start gap-3">
                <CircleDollarSign className="mt-0.5 shrink-0 text-arca-positive" size={18} />
                <div>
                  <p className="text-sm font-bold text-arca-text-primary light:text-arca-light-text-primary">
                    Tu semana está bajo control
                  </p>
                  <p className="mt-1 text-xs leading-relaxed text-arca-text-secondary light:text-arca-light-text-secondary">
                    Puedes preguntarme cómo distribuir tu dinero o preparar el resto del mes.
                  </p>
                </div>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={() => onOpenNova("Revisa mi situación financiera y ayúdame a organizar lo más importante de esta semana")}
            className="mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-arca-accent px-4 text-sm font-black text-[#15110c] shadow-[0_10px_24px_-14px_rgba(198,138,69,0.8)] transition-transform active:scale-[0.98]"
          >
            Organizar mi semana
            <ArrowRight size={17} />
          </button>
        </div>
      </section>

      <button
        type="button"
        onClick={onOpenSummary}
        className="group flex w-full items-center gap-4 rounded-[24px] border border-arca-border-strong bg-arca-surface-1 p-4 text-left shadow-[0_16px_36px_-28px_rgba(0,0,0,0.9)] transition-colors hover:bg-arca-surface-2 light:border-arca-light-border light:bg-arca-light-surface-1"
      >
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-arca-accent/10 text-arca-accent">
          <BarChart3 size={22} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[10px] font-black uppercase tracking-[0.16em] text-arca-accent">
            Vista completa
          </span>
          <span className="mt-0.5 block text-base font-black text-arca-text-primary light:text-arca-light-text-primary">
            Ver resumen financiero
          </span>
          <span className="mt-1 block text-[11px] leading-relaxed text-arca-text-secondary light:text-arca-light-text-secondary">
            Presupuesto, pagos, ingresos, cobros y movimientos del mes.
          </span>
        </span>
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-arca-border bg-arca-surface-2 text-arca-accent transition-transform group-hover:translate-x-0.5">
          <ArrowRight size={17} />
        </span>
      </button>

      <form
        onSubmit={(event) => {
          event.preventDefault();
          submitPrompt();
        }}
        className="flex items-center gap-2 rounded-2xl border border-arca-border bg-arca-surface-1 p-2 pl-4 shadow-sm light:border-arca-light-border light:bg-arca-light-surface-1"
      >
        <Sparkles size={17} className="shrink-0 text-arca-accent" />
        <input
          value={prompt}
          onChange={(event) => setPrompt(event.target.value)}
          placeholder="Pregúntale o pídele algo a Nova"
          aria-label="Escribe una solicitud para Nova"
          className="min-w-0 flex-1 bg-transparent py-2 text-sm text-arca-text-primary outline-none placeholder:text-arca-text-dim light:text-arca-light-text-primary"
        />
        <button
          type="submit"
          disabled={!prompt.trim()}
          aria-label="Enviar a Nova"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-arca-accent text-arca-base transition-opacity disabled:opacity-30"
        >
          <Send size={17} />
        </button>
      </form>

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
            className="shrink-0 rounded-full border border-arca-border bg-arca-surface-1 px-3 py-2 text-[11px] font-semibold text-arca-text-secondary light:border-arca-light-border light:bg-arca-light-surface-1 light:text-arca-light-text-secondary"
          >
            {suggestion}
          </button>
        ))}
      </div>

      <section>
        <h2 className="mb-3 text-xs font-black uppercase tracking-[0.16em] text-arca-text-secondary light:text-arca-light-text-secondary">
          Acciones rápidas
        </h2>

        <div className="grid grid-cols-3 gap-2">
          <button type="button" onClick={openRegister} className="rounded-2xl border border-arca-border bg-arca-surface-1 p-3 text-left light:border-arca-light-border light:bg-arca-light-surface-1">
            <Plus size={18} className="text-arca-accent" />
            <span className="mt-3 block text-xs font-bold">Registrar</span>
          </button>
          <button type="button" onClick={onOpenObligations} className="rounded-2xl border border-arca-border bg-arca-surface-1 p-3 text-left light:border-arca-light-border light:bg-arca-light-surface-1">
            <ReceiptText size={18} className="text-arca-accent" />
            <span className="mt-3 block text-xs font-bold">Pagos</span>
          </button>
          <button type="button" onClick={onOpenMovements} className="rounded-2xl border border-arca-border bg-arca-surface-1 p-3 text-left light:border-arca-light-border light:bg-arca-light-surface-1">
            <WalletCards size={18} className="text-arca-accent" />
            <span className="mt-3 block text-xs font-bold">Movimientos</span>
          </button>
        </div>
      </section>
    </div>
  );
}
