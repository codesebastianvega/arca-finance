"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Check, Landmark, ShieldCheck, Sparkles, WalletCards } from "lucide-react";
import { completeFirstRunSetup } from "@/app/actions";

type NewUserOnboardingProps = {
  firstName: string;
  currency: string;
  onComplete: () => void;
};

export default function NewUserOnboarding({ firstName, currency, onComplete }: NewUserOnboardingProps) {
  const router = useRouter();
  const [step, setStep] = useState<"welcome" | "account">("welcome");
  const [accountName, setAccountName] = useState("Cuenta principal");
  const [entity, setEntity] = useState("");
  const [accountType, setAccountType] = useState("Ahorros");
  const [balance, setBalance] = useState("");
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  const submit = () => {
    setError("");
    const parsedBalance = Number(balance.replace(/[^0-9]/g, ""));

    startTransition(async () => {
      try {
        await completeFirstRunSetup({
          accountName,
          entity,
          accountType,
          balance: Number.isFinite(parsedBalance) ? parsedBalance : 0,
        });
        router.refresh();
        onComplete();
      } catch (submitError) {
        setError(submitError instanceof Error ? submitError.message : "No pudimos completar la configuración.");
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
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl border border-arca-accent/30 bg-arca-accent/10 text-arca-accent">
              <Sparkles size={19} />
            </span>
            <div>
              <p className="font-black tracking-[-0.03em]">ARCA<span className="text-arca-accent">.</span></p>
              <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-arca-text-dim">Con Nova</p>
            </div>
          </div>
          <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-arca-text-dim">
            Paso {step === "welcome" ? "1" : "2"} de 2
          </span>
        </header>

        {step === "welcome" ? (
          <section className="flex flex-1 flex-col justify-center py-12">
            <span className="mb-5 flex h-14 w-14 items-center justify-center rounded-[20px] bg-arca-accent text-[#15110c] shadow-[0_18px_40px_-20px_rgba(198,138,69,0.9)]">
              <Sparkles size={26} />
            </span>
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-arca-accent">Tu agente financiera está lista</p>
            <h1 className="mt-3 text-[2.55rem] font-black leading-[0.98] tracking-[-0.055em]">
              Hola, {firstName}. Empecemos por lo esencial.
            </h1>
            <p className="mt-5 text-sm leading-6 text-arca-text-secondary">
              Para darte recomendaciones reales, Nova necesita conocer dónde está tu dinero. No tienes que configurar toda la app hoy.
            </p>

            <div className="mt-8 space-y-3">
              {[
                { icon: WalletCards, text: "Agrega tu cuenta principal y su saldo actual" },
                { icon: ShieldCheck, text: "Tus datos quedarán separados en tu espacio privado" },
                { icon: Sparkles, text: "Nova preparará tu primer resumen automáticamente" },
              ].map(({ icon: Icon, text }) => (
                <div className="flex items-center gap-3 rounded-2xl border border-arca-border bg-arca-surface-1/75 p-4" key={text}>
                  <Icon className="shrink-0 text-arca-accent" size={18} />
                  <p className="text-xs font-semibold leading-5 text-arca-text-secondary">{text}</p>
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={() => setStep("account")}
              className="mt-8 flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-arca-accent text-sm font-black text-[#15110c] shadow-[0_14px_32px_-18px_rgba(198,138,69,0.85)]"
            >
              Configurar mi primera cuenta
              <ArrowRight size={18} />
            </button>
          </section>
        ) : (
          <section className="flex flex-1 flex-col justify-center py-10">
            <button type="button" onClick={() => setStep("welcome")} className="mb-7 w-fit text-xs font-bold text-arca-text-dim">
              ← Volver
            </button>
            <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-[20px] bg-arca-accent/10 text-arca-accent">
              <Landmark size={26} />
            </div>
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-arca-accent">Tu punto de partida</p>
            <h1 className="mt-2 text-3xl font-black tracking-[-0.045em]">¿Dónde tienes tu dinero disponible?</h1>
            <p className="mt-3 text-sm leading-6 text-arca-text-secondary">Puedes agregar las demás cuentas y productos más adelante.</p>

            <div className="mt-7 space-y-4">
              <label className="block">
                <span className="mb-2 block text-[10px] font-black uppercase tracking-[0.14em] text-arca-text-dim">Nombre de la cuenta</span>
                <input value={accountName} onChange={(event) => setAccountName(event.target.value)} className="h-13 w-full rounded-2xl border border-arca-border bg-arca-surface-1 px-4 text-sm font-semibold outline-none focus:border-arca-accent" placeholder="Ej. Cuenta principal" />
              </label>
              <label className="block">
                <span className="mb-2 block text-[10px] font-black uppercase tracking-[0.14em] text-arca-text-dim">Banco o entidad <span className="normal-case tracking-normal">(opcional)</span></span>
                <input value={entity} onChange={(event) => setEntity(event.target.value)} className="h-13 w-full rounded-2xl border border-arca-border bg-arca-surface-1 px-4 text-sm font-semibold outline-none focus:border-arca-accent" placeholder="Ej. Bancolombia, Nu, efectivo" />
              </label>
              <div className="grid grid-cols-[0.9fr_1.1fr] gap-3">
                <label className="block">
                  <span className="mb-2 block text-[10px] font-black uppercase tracking-[0.14em] text-arca-text-dim">Tipo</span>
                  <select value={accountType} onChange={(event) => setAccountType(event.target.value)} className="h-13 w-full rounded-2xl border border-arca-border bg-arca-surface-1 px-3 text-sm font-semibold outline-none focus:border-arca-accent">
                    <option>Ahorros</option>
                    <option>Corriente</option>
                    <option>Efectivo</option>
                    <option>Billetera digital</option>
                  </select>
                </label>
                <label className="block">
                  <span className="mb-2 block text-[10px] font-black uppercase tracking-[0.14em] text-arca-text-dim">Saldo actual</span>
                  <div className="flex h-13 items-center rounded-2xl border border-arca-border bg-arca-surface-1 px-4 focus-within:border-arca-accent">
                    <span className="mr-2 text-xs font-black text-arca-accent">{currency}</span>
                    <input inputMode="numeric" value={balance} onChange={(event) => setBalance(event.target.value)} className="min-w-0 flex-1 bg-transparent text-sm font-bold outline-none" placeholder="0" />
                  </div>
                </label>
              </div>
            </div>

            {error ? <p role="alert" className="mt-4 rounded-2xl border border-arca-alert/30 bg-arca-alert/10 px-4 py-3 text-xs leading-5 text-arca-alert">{error}</p> : null}

            <button type="button" onClick={submit} disabled={isPending || !accountName.trim()} className="mt-7 flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-arca-accent text-sm font-black text-[#15110c] disabled:cursor-not-allowed disabled:opacity-50">
              {isPending ? "Preparando tu espacio…" : "Crear mi primer resumen"}
              {!isPending ? <Check size={18} /> : null}
            </button>
            <p className="mt-3 text-center text-[10px] leading-4 text-arca-text-dim">Este saldo se registrará como tu punto de partida, no como un ingreso del mes.</p>
          </section>
        )}
      </main>
    </div>
  );
}
