import { redirect } from "next/navigation";
import { CalendarClock, ChartNoAxesCombined, ShieldCheck, Sparkles, WalletCards } from "lucide-react";
import { GoogleAuthButton } from "@/src/components/google-auth-button";
import { bootstrapWorkspaceForUser, getCurrentWorkspaceContext, getCurrentUser } from "@/src/lib/auth";

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; message?: string }>;
}) {
  const params = await searchParams;
  const context = await getCurrentWorkspaceContext();

  if (context) {
    redirect("/app");
  }

  const user = await getCurrentUser();

  async function repairAccess() {
    "use server";

    const currentUser = await getCurrentUser();
    if (!currentUser) redirect("/sign-in?error=access");

    try {
      await bootstrapWorkspaceForUser({
        userId: currentUser.id,
        email: currentUser.email,
        fullName:
          typeof currentUser.user_metadata?.full_name === "string"
            ? currentUser.user_metadata.full_name
            : typeof currentUser.user_metadata?.name === "string"
              ? currentUser.user_metadata.name
              : undefined,
      });
    } catch {
      redirect("/sign-in?error=bootstrap");
    }

    redirect("/app");
  }

  return (
    <main className="relative min-h-[100dvh] overflow-hidden bg-arca-base text-arca-text-primary">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-32 -top-24 h-80 w-80 rounded-full bg-arca-accent/[0.09] blur-[100px]" />
        <div className="absolute -bottom-40 -right-24 h-96 w-96 rounded-full bg-arca-positive/[0.055] blur-[130px]" />
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-arca-accent/50 to-transparent" />
      </div>

      <div className="relative mx-auto grid min-h-[100dvh] w-full max-w-5xl content-center gap-6 px-5 py-5 sm:px-8 md:grid-cols-[1.08fr_0.92fr] md:grid-rows-[auto_auto] md:gap-x-10 md:gap-y-8 md:px-10 md:py-12">
        <section className="flex flex-col justify-center md:col-start-1 md:row-start-1">
          <header className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-arca-accent/30 bg-arca-accent/10 shadow-[0_8px_28px_-14px_rgba(198,138,69,0.8)]">
                <Sparkles className="text-arca-accent" size={20} />
              </div>
              <div>
                <p className="text-lg font-black tracking-[-0.03em]">ARCA<span className="text-arca-accent">.</span></p>
                <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-arca-text-dim">Con Nova</p>
              </div>
            </div>
            <span className="rounded-full border border-arca-border bg-arca-surface-1/70 px-3 py-1.5 text-[9px] font-bold uppercase tracking-[0.14em] text-arca-text-dim">
              Finanzas claras
            </span>
          </header>

          <div className="mt-8 max-w-xl md:mt-16">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-arca-accent/25 bg-arca-accent/[0.07] px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-arca-accent md:mb-5">
              <Sparkles size={13} />
              Tu agente financiera
            </div>
            <h1 className="text-[2.4rem] font-black leading-[0.98] tracking-[-0.055em] sm:text-5xl md:text-6xl">
              Tu dinero, más claro desde hoy.
            </h1>
            <p className="mt-4 max-w-lg text-sm leading-6 text-arca-text-secondary sm:text-base sm:leading-7">
              Nova reúne tus cuentas, pagos y decisiones en un solo lugar para ayudarte a saber qué hacer después.
            </p>
          </div>
        </section>

        <section className="rounded-[28px] border border-arca-border-strong bg-arca-surface-1/90 p-5 shadow-[0_28px_80px_-42px_rgba(0,0,0,0.95)] backdrop-blur-xl sm:p-7 md:col-start-2 md:row-span-2 md:row-start-1 md:self-center md:p-8">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-arca-accent text-[#15110c]">
              <ShieldCheck size={22} />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-arca-accent">Acceso seguro</p>
              <h2 className="mt-1 text-2xl font-bold tracking-[-0.035em]">Continúa con Google</h2>
            </div>
          </div>

          <p className="mt-4 text-sm leading-6 text-arca-text-secondary sm:mt-5">
            Entra sin crear otra contraseña. Si es tu primera vez, prepararemos automáticamente tu espacio en Arca.
          </p>

          {params.error ? (
            <p role="alert" className="mt-5 rounded-2xl border border-arca-alert/25 bg-arca-alert/10 px-4 py-3 text-sm text-arca-alert">
              No pudimos completar el acceso. Intenta nuevamente.
            </p>
          ) : null}
          {params.message ? (
            <p className="mt-5 rounded-2xl border border-arca-positive/25 bg-arca-positive/10 px-4 py-3 text-sm text-arca-positive">
              {params.message}
            </p>
          ) : null}

          <div className="mt-5 sm:mt-6">
            {user ? (
              <form action={repairAccess}>
                <button className="flex h-14 w-full items-center justify-between rounded-2xl bg-arca-text-primary px-5 text-sm font-black text-arca-base transition-transform active:scale-[0.99]" type="submit">
                  Completar configuración
                  <span aria-hidden="true">→</span>
                </button>
              </form>
            ) : (
              <GoogleAuthButton next="/app" />
            )}
          </div>

          <div className="mt-4 flex items-start gap-2.5 border-t border-arca-border pt-4 text-[11px] leading-5 text-arca-text-dim sm:mt-5 sm:pt-5 sm:text-xs">
            <ShieldCheck className="mt-0.5 shrink-0" size={15} />
            <p>Arca nunca recibe tu contraseña de Google. Solo usamos el acceso para proteger tu información financiera.</p>
          </div>
        </section>

        <div className="grid grid-cols-3 gap-2 md:col-start-1 md:row-start-2 md:gap-2.5">
          {[
            { icon: WalletCards, label: "Mira cuánto puedes usar" },
            { icon: CalendarClock, label: "Anticipa próximos pagos" },
            { icon: ChartNoAxesCombined, label: "Decide con contexto" },
          ].map(({ icon: Icon, label }) => (
            <div className="flex min-w-0 flex-col items-start gap-2 rounded-2xl border border-arca-border bg-arca-surface-1/70 p-3 backdrop-blur-sm md:p-4" key={label}>
              <Icon className="shrink-0 text-arca-accent" size={17} />
              <p className="text-[10px] font-semibold leading-4 text-arca-text-secondary md:text-xs md:leading-5">{label}</p>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
