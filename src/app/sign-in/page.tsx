import Link from "next/link";
import { Button, Card, Logo, SectionHeader } from "@/components/ui-kit";
import { GoogleAuthButton } from "@/components/google-auth-button";

type AuthPageProps = {
  searchParams: Promise<{
    error?: string;
    message?: string;
  }>;
};

export default async function SignInPage({ searchParams }: AuthPageProps) {
  const params = await searchParams;

  return (
    <main className="min-h-screen bg-[var(--background)] px-4 py-10">
      <div className="mx-auto grid max-w-[1120px] gap-6 lg:grid-cols-[0.92fr,1.08fr]">
        <Card className="p-6">
          <Logo href="/" />
          <div className="mt-8">
            <SectionHeader
              eyebrow="Acceso"
              title="Entra a Arca con tu cuenta de Google."
              description="Un solo acceso para abrir tus cuentas, pagos, tarjetas y decisiones del mes sin otra contrasena."
            />
          </div>
          <div className="mt-8 rounded-2xl border border-[var(--line)] bg-[color:color-mix(in_srgb,var(--surface)_88%,var(--surface-strong)_12%)] p-5">
            <p className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">Lo que encuentras adentro</p>
            <p className="mt-3 text-sm leading-6 text-[var(--foreground)]">Caja real, obligaciones, tarjetas, ahorro e historial en un solo lugar.</p>
          </div>
        </Card>

        <Card className="p-6">
          <div className="overflow-hidden rounded-[24px] border border-[var(--line)] bg-[color:color-mix(in_srgb,var(--surface)_90%,var(--surface-strong)_10%)]">
            <div className="border-b border-[var(--line)] px-5 py-4">
              <p className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">Acceso seguro</p>
              <h2 className="mt-2 text-2xl font-semibold text-[var(--foreground)]">Continua sin crear otra contrasena</h2>
            </div>
            <div className="p-5">
              {params.error ? (
                <p className="rounded-2xl bg-[var(--danger-bg)] px-4 py-3 text-sm text-[var(--danger)]">
                  No pudimos completar el acceso. Intenta de nuevo.
                </p>
              ) : null}
              {params.message ? (
                <p className="rounded-2xl bg-[var(--success-bg)] px-4 py-3 text-sm text-[var(--success)]">{params.message}</p>
              ) : null}

              <div className="mt-4">
                <GoogleAuthButton mode="sign-in" />
              </div>

              <p className="mt-5 text-sm leading-6 text-[var(--muted)]">
                Al entrar por primera vez, Arca te ayuda a nombrar tu espacio y a escoger por donde empezar.
              </p>

              <div className="mt-6">
                <Link href="/">
                  <Button variant="secondary" size="sm">
                    Volver
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </main>
  );
}
