import { redirect } from "next/navigation";
import { GoogleAuthButton } from "@/src/components/google-auth-button";
import { getCurrentWorkspaceContext, getCurrentUser } from "@/src/lib/auth";

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

  if (user) {
    redirect("/app");
  }

  return (
    <main className="min-h-screen bg-arca-base px-6 py-10 text-arca-text-primary">
      <div className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-lg flex-col justify-center">
        <section className="card-arca p-8 space-y-8">
          <div className="space-y-3">
            <p className="text-[10px] font-bold uppercase tracking-widest text-arca-text-dim">Acceso</p>
            <h1 className="text-4xl font-semibold leading-tight text-arca-text-primary">Entra a Arca con tu cuenta de Google.</h1>
            <p className="text-sm leading-6 text-arca-text-secondary">
              Un solo acceso para abrir tus cuentas, pagos, tarjetas y decisiones del mes sin otra contrasena.
            </p>
          </div>

          <div className="rounded-3xl border border-arca-border bg-arca-surface-2 p-6">
            <p className="text-[10px] font-bold uppercase tracking-widest text-arca-text-dim">Lo que encuentras adentro</p>
            <p className="mt-4 text-sm font-semibold text-arca-text-primary">Caja real, obligaciones, tarjetas, ahorro e historial en un solo lugar.</p>
          </div>

          <div className="rounded-[28px] border border-arca-border bg-arca-surface-1 p-6 space-y-5">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-arca-text-dim">Acceso seguro</p>
              <h2 className="mt-3 text-2xl font-semibold text-arca-text-primary">Continua sin crear otra contrasena</h2>
            </div>

            {params.error ? (
              <p className="rounded-2xl bg-arca-alert/10 px-4 py-3 text-sm text-arca-alert">No pudimos completar el acceso. Intenta de nuevo.</p>
            ) : null}
            {params.message ? (
              <p className="rounded-2xl bg-arca-positive/10 px-4 py-3 text-sm text-arca-positive">{params.message}</p>
            ) : null}

            <GoogleAuthButton next="/app" />

            <p className="text-sm leading-6 text-arca-text-secondary">
              Al entrar por primera vez, Arca crea tu espacio principal y te deja listo para empezar.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
