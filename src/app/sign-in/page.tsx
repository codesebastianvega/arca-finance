import Link from "next/link";
import { redirect } from "next/navigation";
import { Button, Card, Logo, SectionHeader } from "@/components/ui-kit";
import { GoogleAuthButton } from "@/components/google-auth-button";
import { getCurrentWorkspaceContext, getCurrentUser } from "@/lib/auth";

type AuthPageProps = {
  searchParams: Promise<{
    error?: string;
    message?: string;
  }>;
};

export default async function SignInPage({ searchParams }: AuthPageProps) {
  const params = await searchParams;
  const { context } = await getCurrentWorkspaceContext();

  if (context) {
    redirect("/app/hoy");
  }

  const user = await getCurrentUser();

  if (user) {
    redirect("/onboarding");
  }

  return (
    <main className="min-h-screen bg-[var(--background)] px-4 py-10">
      <div className="mx-auto max-w-[680px]">
        <Card className="p-6 sm:p-8">
          <Logo href="/" />

          <div className="mt-8">
            <SectionHeader
              eyebrow="Acceso"
              title="Entra a Arca con tu cuenta de Google."
              description="Un solo acceso para abrir tus cuentas, pagos, tarjetas y decisiones del mes sin otra contrasena."
            />
          </div>

          <div className="mt-8 space-y-4">
            {params.error ? (
              <p className="rounded-2xl bg-[var(--danger-bg)] px-4 py-3 text-sm text-[var(--danger)]">
                No pudimos completar el acceso. Intenta de nuevo.
              </p>
            ) : null}
            {params.message ? (
              <p className="rounded-2xl bg-[var(--success-bg)] px-4 py-3 text-sm text-[var(--success)]">{params.message}</p>
            ) : null}

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
        </Card>
      </div>
    </main>
  );
}
