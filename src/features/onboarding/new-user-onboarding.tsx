"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  Banknote,
  Briefcase,
  Check,
  CircleDollarSign,
  Crown,
  Landmark,
  PiggyBank,
  ReceiptText,
  ShieldCheck,
  Sparkles,
  Target,
  UserRound,
  WalletCards,
} from "lucide-react";
import { completeFirstRunSetup } from "@/app/actions";
import { selectInitialSubscriptionPlan } from "@/app/billing-actions";
import type { BillingPlan } from "@/src/lib/billing";
import type { AdminPlanCode } from "@/src/lib/superadmin-types";

type OnboardingStep = "welcome" | "goal" | "usage" | "accountType" | "accountDetails" | "balance" | "review" | "plans" | "done";
type OnboardingGoal = "clarity" | "expenses" | "debt" | "savings";
type UsageMode = "personal" | "projects";

type NewUserOnboardingProps = {
  firstName: string;
  currency: string;
  plans: BillingPlan[];
  onComplete: () => void;
};

const STEPS: OnboardingStep[] = ["welcome", "goal", "usage", "accountType", "accountDetails", "balance", "review", "plans", "done"];

const GOALS: Array<{ value: OnboardingGoal; title: string; description: string; icon: typeof Target }> = [
  { value: "clarity", title: "Entender mi dinero", description: "Saber cuánto tengo y qué viene después.", icon: Target },
  { value: "expenses", title: "Controlar mis gastos", description: "Descubrir en qué se está yendo mi dinero.", icon: ReceiptText },
  { value: "debt", title: "Organizar mis deudas", description: "Priorizar pagos y dejar de atrasarme.", icon: CircleDollarSign },
  { value: "savings", title: "Empezar a ahorrar", description: "Separar dinero y avanzar hacia una meta.", icon: PiggyBank },
];

const ACCOUNT_TYPES = [
  { value: "Ahorros", title: "Cuenta bancaria", description: "Ahorros o corriente", icon: Landmark },
  { value: "Billetera digital", title: "Billetera digital", description: "Nequi, Daviplata u otra", icon: WalletCards },
  { value: "Efectivo", title: "Efectivo", description: "Dinero que tienes a mano", icon: Banknote },
] as const;

function money(value: number) {
  if (value === 0) return "Gratis";
  return new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(value);
}

function balanceLabel(value: string, currency: string) {
  const amount = Number(value || 0);
  return `${currency} ${new Intl.NumberFormat("es-CO", { maximumFractionDigits: 0 }).format(amount)}`;
}

export default function NewUserOnboarding({ firstName, currency, plans, onComplete }: NewUserOnboardingProps) {
  const router = useRouter();
  const [step, setStep] = useState<OnboardingStep>("welcome");
  const [goal, setGoal] = useState<OnboardingGoal | null>(null);
  const [usageMode, setUsageMode] = useState<UsageMode | null>(null);
  const [projectName, setProjectName] = useState("");
  const [accountName, setAccountName] = useState("Cuenta principal");
  const [entity, setEntity] = useState("");
  const [accountType, setAccountType] = useState("");
  const [balance, setBalance] = useState("");
  const [selectedPlan, setSelectedPlan] = useState<AdminPlanCode | null>(() => {
    const recommended = plans.find((plan) => plan.active && plan.code === "personal_pro");
    return recommended?.code ?? plans.find((plan) => plan.active)?.code ?? null;
  });
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  const stepIndex = STEPS.indexOf(step);
  const progress = ((stepIndex + 1) / STEPS.length) * 100;
  const activePlans = plans.filter((plan) => plan.active);
  const selectedGoal = GOALS.find((item) => item.value === goal);
  const selectedPlanDetails = activePlans.find((plan) => plan.code === selectedPlan);

  const goTo = (nextStep: OnboardingStep) => {
    setError("");
    setStep(nextStep);
  };

  const goBack = () => {
    if (stepIndex > 0) goTo(STEPS[stepIndex - 1]);
  };

  const submitAccount = () => {
    setError("");
    const parsedBalance = Number(balance || 0);
    startTransition(async () => {
      try {
        await completeFirstRunSetup({
          accountName,
          entity,
          accountType,
          balance: Number.isFinite(parsedBalance) ? parsedBalance : 0,
          initialProjectName: usageMode === "projects" ? projectName : null,
        });
        setStep("plans");
      } catch (submitError) {
        setError(submitError instanceof Error ? submitError.message : "No pudimos preparar tu cuenta.");
      }
    });
  };

  const finishWithPlan = () => {
    if (!selectedPlan) return;
    setError("");
    startTransition(async () => {
      try {
        await selectInitialSubscriptionPlan({ planCode: selectedPlan, onboardingGoal: goal ?? undefined });
        router.refresh();
        setStep("done");
      } catch (submitError) {
        setError(submitError instanceof Error ? submitError.message : "No pudimos guardar tu plan.");
      }
    });
  };

  return (
    <div className="fixed inset-0 z-[100] overflow-y-auto bg-arca-base text-arca-text-primary">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -left-24 top-[-5rem] h-72 w-72 rounded-full bg-arca-accent/10 blur-[100px]" />
        <div className="absolute -bottom-32 right-[-6rem] h-80 w-80 rounded-full bg-arca-positive/[0.06] blur-[110px]" />
      </div>

      <main className="relative mx-auto flex min-h-[100dvh] w-full max-w-md flex-col px-5 pb-6 pt-safe">
        <header className="pt-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className="flex h-10 w-10 items-center justify-center rounded-2xl border border-arca-accent/30 bg-arca-accent/10 text-arca-accent"><Sparkles size={19} /></span>
              <div><p className="font-black tracking-[-0.03em]">ARCA<span className="text-arca-accent">.</span></p><p className="text-[9px] font-bold uppercase tracking-[0.18em] text-arca-text-dim">Tu punto de partida</p></div>
            </div>
            <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-arca-text-dim">{stepIndex + 1} de {STEPS.length}</span>
          </div>
          <div className="mt-4 h-1 overflow-hidden rounded-full bg-arca-surface-2">
            <div className="h-full rounded-full bg-arca-accent transition-[width] duration-300" style={{ width: `${progress}%` }} />
          </div>
        </header>

        {step !== "welcome" && step !== "plans" && step !== "done" ? (
          <button type="button" onClick={goBack} disabled={isPending} className="mt-6 flex w-fit items-center gap-1.5 text-xs font-bold text-arca-text-dim disabled:opacity-40">
            <ArrowLeft size={15} /> Volver
          </button>
        ) : null}

        {step === "welcome" ? (
          <section className="flex flex-1 flex-col justify-center py-10">
            <span className="mb-6 flex h-16 w-16 items-center justify-center rounded-[22px] bg-arca-accent text-[#15110c] shadow-[0_18px_40px_-20px_rgba(198,138,69,0.9)]"><Sparkles size={29} /></span>
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-arca-accent">Bienvenido a Arca</p>
            <h1 className="mt-3 text-[2.65rem] font-black leading-[0.98] tracking-[-0.055em]">Hola, {firstName}. Empecemos por lo importante.</h1>
            <p className="mt-5 max-w-sm text-sm leading-6 text-arca-text-secondary">Te haré unas preguntas cortas para mostrarte una vista útil desde el primer día.</p>
            <div className="mt-7 flex items-start gap-3 rounded-2xl border border-arca-border bg-arca-surface-1/75 p-4">
              <ShieldCheck className="mt-0.5 shrink-0 text-arca-positive" size={18} />
              <p className="text-xs leading-5 text-arca-text-secondary">Tus respuestas quedan en tu espacio privado. Podrás cambiarlas después.</p>
            </div>
            <button type="button" onClick={() => goTo("goal")} className="mt-8 flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-arca-accent text-sm font-black text-[#15110c]">Empezar <ArrowRight size={18} /></button>
          </section>
        ) : null}

        {step === "goal" ? (
          <section className="flex flex-1 flex-col justify-center py-8">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-arca-accent">Primero tú</p>
            <h1 className="mt-2 text-3xl font-black tracking-[-0.045em]">¿Qué quieres mejorar primero?</h1>
            <p className="mt-3 text-sm leading-6 text-arca-text-secondary">Elige una. Arca se organizará alrededor de esa prioridad.</p>
            <div className="mt-7 space-y-3">
              {GOALS.map(({ value, title, description, icon: Icon }) => (
                <button key={value} type="button" aria-pressed={goal === value} onClick={() => setGoal(value)} className={`flex w-full items-center gap-4 rounded-2xl border p-4 text-left transition ${goal === value ? "border-arca-accent bg-arca-accent/[0.09]" : "border-arca-border bg-arca-surface-1"}`}>
                  <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${goal === value ? "bg-arca-accent text-black" : "bg-arca-surface-2 text-arca-accent"}`}><Icon size={20} /></span>
                  <span className="min-w-0 flex-1"><strong className="block text-sm">{title}</strong><span className="mt-1 block text-[11px] leading-4 text-arca-text-secondary">{description}</span></span>
                  {goal === value ? <Check className="shrink-0 text-arca-accent" size={18} /> : null}
                </button>
              ))}
            </div>
            <button type="button" disabled={!goal} onClick={() => goTo("usage")} className="mt-7 flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-arca-accent text-sm font-black text-[#15110c] disabled:opacity-40">Continuar <ArrowRight size={18} /></button>
          </section>
        ) : null}

        {step === "usage" ? (
          <section className="flex flex-1 flex-col justify-center py-8">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-arca-accent">Tu forma de usar Arca</p>
            <h1 className="mt-2 text-3xl font-black tracking-[-0.045em]">¿Cómo vas a organizar tu dinero?</h1>
            <p className="mt-3 text-sm leading-6 text-arca-text-secondary">Personal funciona sin configuraciones extra. Los proyectos te permiten separar un negocio o actividad.</p>
            <div className="mt-7 space-y-3">
              <button type="button" aria-pressed={usageMode === "personal"} onClick={() => setUsageMode("personal")} className={`flex w-full items-center gap-4 rounded-2xl border p-4 text-left transition ${usageMode === "personal" ? "border-arca-accent bg-arca-accent/[0.09]" : "border-arca-border bg-arca-surface-1"}`}>
                <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${usageMode === "personal" ? "bg-arca-accent text-black" : "bg-arca-surface-2 text-arca-accent"}`}><UserRound size={20} /></span>
                <span className="min-w-0 flex-1"><strong className="block text-sm">Solo mis finanzas personales</strong><span className="mt-1 block text-[11px] leading-4 text-arca-text-secondary">Arca guardará todo en Personal automáticamente.</span></span>
                {usageMode === "personal" ? <Check className="shrink-0 text-arca-accent" size={18} /> : null}
              </button>
              <button type="button" aria-pressed={usageMode === "projects"} onClick={() => setUsageMode("projects")} className={`flex w-full items-center gap-4 rounded-2xl border p-4 text-left transition ${usageMode === "projects" ? "border-arca-accent bg-arca-accent/[0.09]" : "border-arca-border bg-arca-surface-1"}`}>
                <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${usageMode === "projects" ? "bg-arca-accent text-black" : "bg-arca-surface-2 text-arca-accent"}`}><Briefcase size={20} /></span>
                <span className="min-w-0 flex-1"><strong className="block text-sm">También manejo proyectos</strong><span className="mt-1 block text-[11px] leading-4 text-arca-text-secondary">Separa un negocio, cliente, trabajo o actividad.</span></span>
                {usageMode === "projects" ? <Check className="shrink-0 text-arca-accent" size={18} /> : null}
              </button>
            </div>
            {usageMode === "projects" ? (
              <label className="mt-5 block"><span className="mb-2 block text-[10px] font-black uppercase tracking-[0.14em] text-arca-text-dim">Nombre del primer proyecto</span><input autoFocus value={projectName} onChange={(event) => setProjectName(event.target.value)} className="h-14 w-full rounded-2xl border border-arca-border bg-arca-surface-1 px-4 text-base font-semibold outline-none focus:border-arca-accent" placeholder="Ej. Mi negocio, Freelance, Recreo" /></label>
            ) : null}
            <button type="button" disabled={!usageMode || (usageMode === "projects" && !projectName.trim())} onClick={() => goTo("accountType")} className="mt-7 flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-arca-accent text-sm font-black text-[#15110c] disabled:opacity-40">Continuar <ArrowRight size={18} /></button>
          </section>
        ) : null}

        {step === "accountType" ? (
          <section className="flex flex-1 flex-col justify-center py-8">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-arca-accent">Tu dinero hoy</p>
            <h1 className="mt-2 text-3xl font-black tracking-[-0.045em]">¿Dónde tienes la mayor parte de tu dinero?</h1>
            <p className="mt-3 text-sm leading-6 text-arca-text-secondary">Empezaremos con un solo lugar. Podrás agregar los demás después.</p>
            <div className="mt-7 space-y-3">
              {ACCOUNT_TYPES.map(({ value, title, description, icon: Icon }) => (
                <button key={value} type="button" aria-pressed={accountType === value} onClick={() => setAccountType(value)} className={`flex w-full items-center gap-4 rounded-2xl border p-4 text-left transition ${accountType === value ? "border-arca-accent bg-arca-accent/[0.09]" : "border-arca-border bg-arca-surface-1"}`}>
                  <span className={`flex h-11 w-11 items-center justify-center rounded-xl ${accountType === value ? "bg-arca-accent text-black" : "bg-arca-surface-2 text-arca-accent"}`}><Icon size={20} /></span>
                  <span className="flex-1"><strong className="block text-sm">{title}</strong><span className="mt-1 block text-[11px] text-arca-text-secondary">{description}</span></span>
                  {accountType === value ? <Check className="text-arca-accent" size={18} /> : null}
                </button>
              ))}
            </div>
            <button type="button" disabled={!accountType} onClick={() => goTo("accountDetails")} className="mt-7 flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-arca-accent text-sm font-black text-[#15110c] disabled:opacity-40">Continuar <ArrowRight size={18} /></button>
          </section>
        ) : null}

        {step === "accountDetails" ? (
          <section className="flex flex-1 flex-col justify-center py-8">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-arca-accent">Identifiquemos la cuenta</p>
            <h1 className="mt-2 text-3xl font-black tracking-[-0.045em]">¿Cómo quieres reconocerla?</h1>
            <p className="mt-3 text-sm leading-6 text-arca-text-secondary">Usa un nombre que entiendas fácilmente cuando revises tus movimientos.</p>
            <div className="mt-8 space-y-5">
              <label className="block"><span className="mb-2 block text-[10px] font-black uppercase tracking-[0.14em] text-arca-text-dim">Nombre de la cuenta</span><input autoFocus value={accountName} onChange={(event) => setAccountName(event.target.value)} className="h-14 w-full rounded-2xl border border-arca-border bg-arca-surface-1 px-4 text-base font-semibold outline-none focus:border-arca-accent" placeholder="Ej. Cuenta principal" /></label>
              <label className="block"><span className="mb-2 block text-[10px] font-black uppercase tracking-[0.14em] text-arca-text-dim">Banco o entidad <span className="normal-case tracking-normal">(opcional)</span></span><input value={entity} onChange={(event) => setEntity(event.target.value)} className="h-14 w-full rounded-2xl border border-arca-border bg-arca-surface-1 px-4 text-base font-semibold outline-none focus:border-arca-accent" placeholder={accountType === "Efectivo" ? "Ej. Billetera" : "Ej. Bancolombia, Nu, Nequi"} /></label>
            </div>
            <button type="button" disabled={!accountName.trim()} onClick={() => goTo("balance")} className="mt-8 flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-arca-accent text-sm font-black text-[#15110c] disabled:opacity-40">Continuar <ArrowRight size={18} /></button>
          </section>
        ) : null}

        {step === "balance" ? (
          <section className="flex flex-1 flex-col justify-center py-8">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-arca-accent">Punto de partida</p>
            <h1 className="mt-2 text-3xl font-black tracking-[-0.045em]">¿Cuánto dinero tienes allí hoy?</h1>
            <p className="mt-3 text-sm leading-6 text-arca-text-secondary">No es un ingreso. Es el saldo desde el que Arca empezará a calcular.</p>
            <label className="mt-9 block">
              <span className="mb-2 block text-[10px] font-black uppercase tracking-[0.14em] text-arca-text-dim">Saldo actual</span>
              <div className="flex h-20 items-center rounded-[22px] border border-arca-border bg-arca-surface-1 px-5 focus-within:border-arca-accent">
                <span className="mr-3 text-sm font-black text-arca-accent">{currency}</span>
                <input autoFocus inputMode="numeric" value={balance ? new Intl.NumberFormat("es-CO").format(Number(balance)) : ""} onChange={(event) => setBalance(event.target.value.replace(/[^0-9]/g, ""))} className="min-w-0 flex-1 bg-transparent text-3xl font-black tracking-[-0.04em] outline-none" placeholder="0" />
              </div>
            </label>
            <button type="button" onClick={() => goTo("review")} className="mt-8 flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-arca-accent text-sm font-black text-[#15110c]">Revisar <ArrowRight size={18} /></button>
            <button type="button" onClick={() => { setBalance(""); goTo("review"); }} className="mt-3 h-10 text-xs font-bold text-arca-text-dim">Aún no conozco el saldo</button>
          </section>
        ) : null}

        {step === "review" ? (
          <section className="flex flex-1 flex-col justify-center py-8">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-arca-accent">Todo claro</p>
            <h1 className="mt-2 text-3xl font-black tracking-[-0.045em]">Este será tu punto de partida.</h1>
            <div className="mt-7 rounded-[24px] border border-arca-border-strong bg-arca-surface-1 p-5">
              <div className="flex items-center gap-3 border-b border-arca-border pb-4"><span className="flex h-11 w-11 items-center justify-center rounded-xl bg-arca-accent/10 text-arca-accent"><Landmark size={20} /></span><div><p className="text-sm font-black">{accountName}</p><p className="mt-1 text-[10px] text-arca-text-secondary">{entity || accountType}</p></div></div>
              <div className="pt-5"><p className="text-[9px] font-black uppercase tracking-[0.14em] text-arca-text-dim">Saldo inicial</p><p className="mt-1 text-3xl font-black tracking-[-0.04em]">{balanceLabel(balance, currency)}</p></div>
            </div>
            {selectedGoal ? <p className="mt-5 text-center text-xs leading-5 text-arca-text-secondary">Tu prioridad: <strong className="text-arca-text-primary">{selectedGoal.title}</strong></p> : null}
            <p className="mt-2 text-center text-xs leading-5 text-arca-text-secondary">Organización: <strong className="text-arca-text-primary">{usageMode === "projects" ? projectName : "Personal"}</strong></p>
            {error ? <p role="alert" className="mt-4 rounded-2xl border border-arca-alert/30 bg-arca-alert/10 px-4 py-3 text-xs leading-5 text-arca-alert">{error}</p> : null}
            <button type="button" onClick={submitAccount} disabled={isPending} className="mt-7 flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-arca-accent text-sm font-black text-[#15110c] disabled:opacity-50">{isPending ? "Preparando tu espacio…" : "Crear mi espacio"}{!isPending ? <ArrowRight size={18} /> : null}</button>
          </section>
        ) : null}

        {step === "plans" ? (
          <section className="flex flex-1 flex-col justify-center py-7">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-arca-accent">Elige tu experiencia</p>
            <h1 className="mt-2 text-3xl font-black tracking-[-0.045em]">¿Cómo quieres empezar?</h1>
            <p className="mt-3 text-sm leading-6 text-arca-text-secondary">Puedes cambiar de plan después. Las pruebas no generan cobros automáticos.</p>
            <div className="mt-6 space-y-3">
              {activePlans.map((plan) => {
                const selected = selectedPlan === plan.code;
                const recommended = plan.code === "personal_pro";
                return (
                  <button key={plan.code} type="button" aria-pressed={selected} onClick={() => setSelectedPlan(plan.code)} className={`relative w-full rounded-2xl border p-4 text-left transition ${selected ? "border-arca-accent bg-arca-accent/[0.09]" : "border-arca-border bg-arca-surface-1"}`}>
                    <div className="flex items-start justify-between gap-3"><div><span className="flex items-center gap-2"><strong className="text-sm">{plan.name}</strong>{recommended ? <span className="rounded-full bg-arca-accent/15 px-2 py-1 text-[7px] font-black uppercase tracking-wider text-arca-accent">Recomendado</span> : null}</span><span className="mt-1 block text-[10px] leading-4 text-arca-text-secondary">{plan.description}</span></div><div className="shrink-0 text-right"><strong className="text-sm text-arca-accent">{money(plan.monthlyPriceCop)}</strong>{plan.monthlyPriceCop > 0 ? <span className="block text-[7px] uppercase text-arca-text-dim">al mes</span> : null}</div></div>
                    <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1.5">{plan.features.slice(0, 3).map((feature) => <span key={feature} className="flex items-center gap-1 text-[9px] text-arca-text-secondary"><Check size={11} className="text-arca-positive" />{feature}</span>)}</div>
                  </button>
                );
              })}
            </div>
            {error ? <p role="alert" className="mt-4 rounded-2xl border border-arca-alert/30 bg-arca-alert/10 px-4 py-3 text-xs leading-5 text-arca-alert">{error}</p> : null}
            <button type="button" disabled={!selectedPlan || isPending} onClick={finishWithPlan} className="mt-6 flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-arca-accent text-sm font-black text-[#15110c] disabled:opacity-40">{isPending ? "Activando…" : selectedPlan === "free" ? "Continuar gratis" : "Probar 14 días"}<ArrowRight size={18} /></button>
          </section>
        ) : null}

        {step === "done" ? (
          <section className="flex flex-1 flex-col justify-center py-10 text-center">
            <span className="mx-auto flex h-20 w-20 items-center justify-center rounded-[26px] bg-arca-positive/15 text-arca-positive"><Check size={38} strokeWidth={2.4} /></span>
            <p className="mt-7 text-[10px] font-black uppercase tracking-[0.18em] text-arca-accent">Tu espacio está listo</p>
            <h1 className="mx-auto mt-3 max-w-sm text-[2.4rem] font-black leading-[1] tracking-[-0.055em]">Ya tienes un punto de partida real.</h1>
            <p className="mx-auto mt-5 max-w-xs text-sm leading-6 text-arca-text-secondary">Arca mostrará tu saldo y te indicará cuál es la siguiente información más útil para completar.</p>
            <div className="mt-7 rounded-2xl border border-arca-border bg-arca-surface-1 p-4 text-left"><p className="text-[9px] font-black uppercase tracking-[0.14em] text-arca-text-dim">Configuración inicial</p><div className="mt-3 flex items-center justify-between"><div><p className="text-sm font-black">{accountName}</p><p className="mt-1 text-[10px] text-arca-text-secondary">{selectedPlanDetails?.name ?? "Arca"}</p></div><p className="text-base font-black text-arca-positive">{balanceLabel(balance, currency)}</p></div></div>
            <button type="button" onClick={onComplete} className="mt-8 flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-arca-accent text-sm font-black text-[#15110c]">Ver mi resumen de hoy <ArrowRight size={18} /></button>
            <p className="mt-4 text-[10px] leading-4 text-arca-text-dim">Después podrás agregar ingresos, pagos y otras cuentas.</p>
          </section>
        ) : null}
      </main>
    </div>
  );
}
