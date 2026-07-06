import Link from "next/link";
import { bootstrapWorkspaceAction } from "@/app/auth-actions";
import { getCurrentUser } from "@/lib/auth";
import { Button, Card, Logo, SectionHeader } from "@/components/ui-kit";

type OnboardingPageProps = {
  searchParams: Promise<{
    mode?: string;
    error?: string;
  }>;
};

export default async function OnboardingPage({ searchParams }: OnboardingPageProps) {
  const params = await searchParams;
  const user = await getCurrentUser();

  if (!user) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[var(--background)] px-4 py-10">
        <Card className="w-full max-w-lg p-6">
          <Logo href="/" />
          <h1 className="mt-6 text-3xl font-semibold">Necesitas entrar primero</h1>
          <p className="mt-3 text-sm leading-6 text-[var(--muted)]">Usa tu cuenta de Google para continuar y abrir tu espacio en Arca.</p>
          <div className="mt-6">
            <Link href="/sign-in">
              <Button>Ir a Arca</Button>
            </Link>
          </div>
        </Card>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[var(--background)] px-4 py-10">
      <div className="mx-auto grid max-w-[1180px] gap-6 lg:grid-cols-[0.9fr,1.1fr]">
        <Card className="p-6">
          <Logo href="/" />
          <div className="mt-8">
            <SectionHeader
              eyebrow="Primer paso"
              title="Vamos a dejar lista tu base de trabajo."
              description="Aqui no solo nombras tu espacio. Tambien dejas conectadas tu primera cuenta, tu primer frente y tu primera entrada recurrente."
            />
          </div>
          <div className="mt-8 space-y-4">
            <div className="arca-soft-block rounded-2xl p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">Lo que sigue</p>
              <p className="mt-2 text-sm leading-6 text-[var(--foreground)]">1. Nombras tu espacio</p>
              <p className="mt-1 text-sm leading-6 text-[var(--foreground)]">2. Creas la cuenta donde entra la plata</p>
              <p className="mt-1 text-sm leading-6 text-[var(--foreground)]">3. Defines tu primer frente y fuente</p>
              <p className="mt-1 text-sm leading-6 text-[var(--foreground)]">4. Dejas lista la primera entrada recurrente</p>
            </div>
            <div className="rounded-2xl border border-[var(--line)] p-4">
              <p className="text-sm leading-6 text-[var(--muted)]">
                Arca te deja entrar solo cuando ya existe una base minima coherente. Asi evitas cuentas, fuentes o pagos sueltos que luego confunden la lectura.
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="rounded-[24px] border border-[var(--line)] bg-[color:color-mix(in_srgb,var(--surface)_88%,var(--surface-strong)_12%)] p-5">
            <p className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">Tu acceso</p>
            <p className="mt-2 text-lg font-semibold text-[var(--foreground)]">
              {typeof user.user_metadata?.full_name === "string" ? user.user_metadata.full_name : user.email ?? "Cuenta de Google"}
            </p>
          </div>

          {params.mode === "schema" || params.error ? (
            <p className="mt-4 rounded-2xl bg-[var(--danger-bg)] px-4 py-3 text-sm text-[var(--danger)]">
              No pudimos terminar tu acceso. Intenta de nuevo.
            </p>
          ) : null}

          <form action={bootstrapWorkspaceAction} className="mt-6 space-y-5">
            <div>
              <label className="text-sm font-medium text-[var(--foreground)]">Tu nombre</label>
              <input
                className="mt-2 arca-input"
                name="fullName"
                defaultValue={typeof user.user_metadata?.full_name === "string" ? user.user_metadata.full_name : ""}
                placeholder="Como quieres aparecer en Arca"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-[var(--foreground)]">Nombre de tu espacio en Arca</label>
              <input
                className="mt-2 arca-input"
                name="workspaceName"
                defaultValue="Mis finanzas"
                placeholder="Mis finanzas"
                required
              />
            </div>

            <div>
              <p className="text-sm font-medium text-[var(--foreground)]">Tu primera cuenta principal</p>
              <div className="mt-3 grid gap-3 md:grid-cols-2">
                <label className="space-y-2">
                  <span className="text-sm text-[var(--muted)]">Nombre visible</span>
                  <input className="arca-input" name="accountName" placeholder="Daviplata nomina, Nequi principal..." required />
                </label>
                <label className="space-y-2">
                  <span className="text-sm text-[var(--muted)]">Tipo</span>
                  <select className="arca-input" name="accountType" defaultValue="wallet">
                    <option value="wallet">Billetera</option>
                    <option value="bank">Banco</option>
                    <option value="cash">Efectivo</option>
                    <option value="savings">Ahorro</option>
                    <option value="other">Otra</option>
                  </select>
                </label>
                <label className="space-y-2 md:col-span-2">
                  <span className="text-sm text-[var(--muted)]">Entidad o marca</span>
                  <select className="arca-input" name="accountColor" defaultValue="nequi">
                    <option value="nequi">Nequi</option>
                    <option value="daviplata">Daviplata</option>
                    <option value="davivienda">Davivienda</option>
                    <option value="nu">Nu</option>
                    <option value="bancolombia">Bancolombia</option>
                    <option value="bbva">BBVA</option>
                    <option value="bogota">Banco de Bogota</option>
                    <option value="success">Efectivo</option>
                    <option value="paypal">PayPal</option>
                    <option value="accent">Otra entidad</option>
                  </select>
                </label>
              </div>
            </div>

            <div>
              <p className="text-sm font-medium text-[var(--foreground)]">Tu primer frente y fuente</p>
              <div className="mt-3 grid gap-3 md:grid-cols-2">
                <label className="space-y-2">
                  <span className="text-sm text-[var(--muted)]">Frente o unidad</span>
                  <input className="arca-input" name="businessUnitName" placeholder="Personal, Freelance, Empresa..." required />
                </label>
                <label className="space-y-2">
                  <span className="text-sm text-[var(--muted)]">Fuente de ingreso</span>
                  <input className="arca-input" name="incomeSourceName" placeholder="Salario, contrato, comision..." required />
                </label>
              </div>
            </div>

            <div>
              <p className="text-sm font-medium text-[var(--foreground)]">Primera entrada recurrente</p>
              <div className="mt-3 grid gap-3 md:grid-cols-2">
                <label className="space-y-2 md:col-span-2">
                  <span className="text-sm text-[var(--muted)]">Nombre de la entrada</span>
                  <input className="arca-input" name="templateName" placeholder="Pago mensual, quincena, contrato..." required />
                </label>
                <label className="space-y-2">
                  <span className="text-sm text-[var(--muted)]">Monto esperado</span>
                  <input className="arca-input" name="templateAmount" type="number" min="0" step="1" inputMode="numeric" required />
                </label>
                <label className="space-y-2">
                  <span className="text-sm text-[var(--muted)]">Inicio</span>
                  <input className="arca-input" name="templateStartDate" type="date" required />
                </label>
                <label className="space-y-2">
                  <span className="text-sm text-[var(--muted)]">Frecuencia</span>
                  <select className="arca-input" name="templateFrequency" defaultValue="monthly">
                    <option value="monthly">Mensual</option>
                    <option value="biweekly">Quincenal</option>
                    <option value="weekly">Semanal</option>
                    <option value="bimonthly">Bimestral</option>
                    <option value="custom_days_of_month">Dias del mes</option>
                  </select>
                </label>
                <label className="space-y-2">
                  <span className="text-sm text-[var(--muted)]">Dias del mes</span>
                  <input className="arca-input" name="templateDaysOfMonth" placeholder="15,30" />
                </label>
                <label className="space-y-2">
                  <span className="text-sm text-[var(--muted)]">Modo</span>
                  <select className="arca-input" name="templateRecurrenceMode" defaultValue="open_recurring">
                    <option value="open_recurring">Indefinido</option>
                    <option value="date_bounded">Con fecha fin</option>
                    <option value="occurrence_bounded">Por numero de veces</option>
                  </select>
                </label>
                <label className="space-y-2">
                  <span className="text-sm text-[var(--muted)]">Fecha fin</span>
                  <input className="arca-input" name="templateEndDate" type="date" />
                </label>
                <label className="space-y-2">
                  <span className="text-sm text-[var(--muted)]">Numero de veces</span>
                  <input className="arca-input" name="templateOccurrenceLimit" type="number" min="1" />
                </label>
              </div>
            </div>

            <Button type="submit" size="lg">
              Crear base y entrar
            </Button>
          </form>
        </Card>
      </div>
    </main>
  );
}
