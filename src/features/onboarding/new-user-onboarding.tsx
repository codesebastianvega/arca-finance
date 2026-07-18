"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Check, Crown, Landmark, ShieldCheck, Sparkles, WalletCards } from "lucide-react";
import { completeFirstRunSetup } from "@/app/actions";
import { selectInitialSubscriptionPlan } from "@/app/billing-actions";
import type { BillingPlan } from "@/src/lib/billing";
import type { AdminPlanCode } from "@/src/lib/superadmin-types";

type OnboardingStep = "welcome" | "account" | "plans";

type NewUserOnboardingProps = {
  firstName: string;
  currency: string;
  plans: BillingPlan[];
  onComplete: () => void;
};

const STEP_NUMBER: Record<OnboardingStep, number> = { welcome: 1, account: 2, plans: 3 };

function money(value: number) {
  if (value === 0) return "Gratis";
  return new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(value);
}

export default function NewUserOnboarding({ firstName, currency, plans, onComplete }: NewUserOnboardingProps) {
  const router = useRouter();
  const [step, setStep] = useState<OnboardingStep>("welcome");
  const [accountName, setAccountName] = useState("Cuenta principal");
  const [entity, setEntity] = useState("");
  const [accountType, setAccountType] = useState("Ahorros");
  const [balance, setBalance] = useState("");
  const [selectedPlan, setSelectedPlan] = useState<AdminPlanCode | null>(null);
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  const submitAccount = () => {
    setError("");
    const parsedBalance = Number(balance.replace(/[^0-9]/g, ""));
    startTransition(async () => {
      try {
        await completeFirstRunSetup({ accountName, entity, accountType, balance: Number.isFinite(parsedBalance) ? parsedBalance : 0 });
        setStep("plans");
      } catch (submitError) {
        setError(submitError instanceof Error ? submitError.message : "No pudimos completar la configuración.");
      }
    });
  };

  const finishWithPlan = (planCode: AdminPlanCode) => {
    setError("");
    setSelectedPlan(planCode);
    startTransition(async () => {
      try {
        await selectInitialSubscriptionPlan({ planCode });
        router.refresh();
        onComplete();
      } catch (submitError) {
        setError(submitError instanceof Error ? submitError.message : "No pudimos guardar tu plan.");
        setSelectedPlan(null);
      }
    });
  };

  return (
    <div className="fixed inset-0 z-[100] overflow-y-auto bg-arca-base text-arca-text-primary">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -left-24 top-[-5rem] h-72 w-72 rounded-full bg-arca-accent/10 blur-[100px]" />
        <div className="absolute -bottom-32 right-[-6rem] h-80 w-80 rounded-full bg-arca-positive/[0.06] blur-[110px]" />
      </div>

      <main className="relative mx-auto flex min-h-[100dvh] w-full max-w-md flex-col px-5 py-6 sm:justify-center sm:py-10">
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl border border-arca-accent/30 bg-arca-accent/10 text-arca-accent"><Sparkles size={19} /></span>
            <div><p className="font-black tracking-[-0.03em]">ARCA<span className="text-arca-accent">.</span></p><p className="text-[9px] font-bold uppercase tracking-[0.18em] text-arca-text-dim">Con Nova</p></div>
          </div>
          <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-arca-text-dim">Paso {STEP_NUMBER[step]} de 3</span>
        </header>

        {step === "welcome" ? (
          <section className="flex flex-1 flex-col justify-center py-12">
            <span className="mb-5 flex h-14 w-14 items-center justify-center rounded-[20px] bg-arca-accent text-[#15110c] shadow-[0_18px_40px_-20px_rgba(198,138,69,0.9)]"><Sparkles size={26} /></span>
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-arca-accent">Tu espacio financiero empieza aquí</p>
            <h1 className="mt-3 text-[2.55rem] font-black leading-[0.98] tracking-[-0.055em]">Hola, {firstName}. Vamos a preparar Arca para ti.</h1>
            <p className="mt-5 text-sm leading-6 text-arca-text-secondary">En tres pasos tendrás tu primera cuenta, un resumen inicial y sabrás exactamente qué incluye cada nivel de Arca.</p>
            <div className="mt-8 space-y-3">
              {[
                { icon: WalletCards, text: "Registra dónde está tu dinero hoy" },
                { icon: ShieldCheck, text: "Tus datos vivirán en un espacio privado" },
                { icon: Crown, text: "Elige entre Gratis, Personal o Negocios" },
              ].map(({ icon: Icon, text }) => <div className="flex items-center gap-3 rounded-2xl border border-arca-border bg-arca-surface-1/75 p-4" key={text}><Icon className="shrink-0 text-arca-accent" size={18} /><p className="text-xs font-semibold leading-5 text-arca-text-secondary">{text}</p></div>)}
            </div>
            <button type="button" onClick={() => setStep("account")} className="mt-8 flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-arca-accent text-sm font-black text-[#15110c]">Empezar configuración <ArrowRight size={18} /></button>
          </section>
        ) : null}

        {step === "account" ? (
          <section className="flex flex-1 flex-col justify-center py-10">
            <button type="button" onClick={() => setStep("welcome")} className="mb-7 w-fit text-xs font-bold text-arca-text-dim">← Volver</button>
            <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-[20px] bg-arca-accent/10 text-arca-accent"><Landmark size={26} /></div>
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-arca-accent">Tu punto de partida</p>
            <h1 className="mt-2 text-3xl font-black tracking-[-0.045em]">¿Dónde tienes tu dinero disponible?</h1>
            <p className="mt-3 text-sm leading-6 text-arca-text-secondary">Puedes agregar las demás cuentas y productos más adelante.</p>
            <div className="mt-7 space-y-4">
              <label className="block"><span className="mb-2 block text-[10px] font-black uppercase tracking-[0.14em] text-arca-text-dim">Nombre de la cuenta</span><input value={accountName} onChange={(event) => setAccountName(event.target.value)} className="h-13 w-full rounded-2xl border border-arca-border bg-arca-surface-1 px-4 text-sm font-semibold outline-none focus:border-arca-accent" placeholder="Ej. Cuenta principal" /></label>
              <label className="block"><span className="mb-2 block text-[10px] font-black uppercase tracking-[0.14em] text-arca-text-dim">Banco o entidad <span className="normal-case tracking-normal">(opcional)</span></span><input value={entity} onChange={(event) => setEntity(event.target.value)} className="h-13 w-full rounded-2xl border border-arca-border bg-arca-surface-1 px-4 text-sm font-semibold outline-none focus:border-arca-accent" placeholder="Ej. Bancolombia, Nu, efectivo" /></label>
              <div className="grid grid-cols-[0.9fr_1.1fr] gap-3">
                <label className="block"><span className="mb-2 block text-[10px] font-black uppercase tracking-[0.14em] text-arca-text-dim">Tipo</span><select value={accountType} onChange={(event) => setAccountType(event.target.value)} className="h-13 w-full rounded-2xl border border-arca-border bg-arca-surface-1 px-3 text-sm font-semibold outline-none focus:border-arca-accent"><option>Ahorros</option><option>Corriente</option><option>Efectivo</option><option>Billetera digital</option></select></label>
                <label className="block"><span className="mb-2 block text-[10px] font-black uppercase tracking-[0.14em] text-arca-text-dim">Saldo actual</span><div className="flex h-13 items-center rounded-2xl border border-arca-border bg-arca-surface-1 px-4 focus-within:border-arca-accent"><span className="mr-2 text-xs font-black text-arca-accent">{currency}</span><input inputMode="numeric" value={balance} onChange={(event) => setBalance(event.target.value)} className="min-w-0 flex-1 bg-transparent text-sm font-bold outline-none" placeholder="0" /></div></label>
              </div>
            </div>
            {error ? <p role="alert" className="mt-4 rounded-2xl border border-arca-alert/30 bg-arca-alert/10 px-4 py-3 text-xs leading-5 text-arca-alert">{error}</p> : null}
            <button type="button" onClick={submitAccount} disabled={isPending || !accountName.trim()} className="mt-7 flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-arca-accent text-sm font-black text-[#15110c] disabled:opacity-50">{isPending ? "Preparando tu espacio…" : "Continuar y elegir plan"}{!isPending ? <ArrowRight size={18} /> : null}</button>
            <p className="mt-3 text-center text-[10px] leading-4 text-arca-text-dim">Este saldo será tu punto de partida, no un ingreso del mes.</p>
          </section>
        ) : null}

        {step === "plans" ? (
          <section className="py-9">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-arca-accent">Tu cuenta ya está lista</p>
            <h1 className="mt-2 text-3xl font-black tracking-[-0.045em]">Elige cómo quieres empezar.</h1>
            <p className="mt-3 text-sm leading-6 text-arca-text-secondary">Gratis cubre lo esencial. Personal y Negocios incluyen 14 días de prueba, sin pago automático.</p>
            <div className="mt-7 space-y-4">
              {plans.filter((plan) => plan.active).map((plan) => {
                const recommended = plan.code === "personal_pro";
                return <article key={plan.code} className={`relative rounded-[24px] border p-5 ${recommended ? "border-arca-accent bg-arca-accent/[0.06]" : "border-arca-border bg-arca-surface-1"}`}>
                  {recommended ? <span className="absolute -top-2.5 right-4 rounded-full bg-arca-accent px-3 py-1 text-[8px] font-black uppercase tracking-wider text-black">Recomendado</span> : null}
                  <div className="flex items-start justify-between gap-4"><div><h2 className="text-lg font-black">{plan.name}</h2><p className="mt-1 text-[11px] leading-4 text-arca-text-secondary">{plan.description}</p></div><div className="shrink-0 text-right"><p className="text-base font-black text-arca-accent">{money(plan.monthlyPriceCop)}</p>{plan.monthlyPriceCop > 0 ? <p className="text-[8px] uppercase text-arca-text-dim">al mes</p> : null}</div></div>
                  <div className="mt-4 grid gap-2">{plan.features.slice(0, 4).map((feature) => <p key={feature} className="flex items-center gap-2 text-[10px] font-semibold text-arca-text-secondary"><Check size={13} className="shrink-0 text-arca-success" />{feature}</p>)}</div>
                  <button type="button" disabled={isPending} onClick={() => finishWithPlan(plan.code)} className={`mt-5 h-11 w-full rounded-xl text-xs font-black disabled:opacity-50 ${recommended ? "bg-arca-accent text-black" : "border border-arca-border-strong bg-arca-surface-2 text-arca-text-primary"}`}>{isPending && selectedPlan === plan.code ? "Activando…" : plan.code === "free" ? "Continuar gratis" : "Probar 14 días"}</button>
                </article>;
              })}
            </div>
            {error ? <p role="alert" className="mt-4 rounded-2xl border border-arca-alert/30 bg-arca-alert/10 px-4 py-3 text-xs leading-5 text-arca-alert">{error}</p> : null}
            <p className="mt-5 text-center text-[9px] leading-4 text-arca-text-dim">Podrás cambiar de plan después desde Configuración. Las pruebas no generan cobros automáticos.</p>
          </section>
        ) : null}
      </main>
    </div>
  );
}
