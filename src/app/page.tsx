import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";
import { Button, Card, Logo, SectionHeader } from "@/components/ui-kit";

const planCards: Array<{
  code: string;
  name: string;
  price: string;
  secondaryPrice?: string;
  items: string[];
  exclusions?: string[];
  featured?: boolean;
}> = [
  {
    code: "Gratis",
    name: "Personal",
    price: "$0",
    items: ["Hasta 5 cuentas", "Hasta 3 tarjetas", "Registrar y Transferir sin limite", "Hoy y Dashboard completos", "Historial de los ultimos 90 dias"],
    exclusions: ["Proyeccion", "Negocios (unidades de negocio)"],
  },
  {
    code: "Suscripcion",
    name: "Pro",
    price: "$5.900 COP/mes",
    secondaryPrice: "$49.900 COP/ano",
    items: ["Todo lo de Personal", "Cuentas y tarjetas ilimitadas", "Historial completo, sin limite de tiempo", "Planeacion: Mes y Proyeccion", "Negocios ilimitados"],
  },
  {
    code: "Pago unico",
    name: "Arca Para Siempre",
    price: "$89.900 COP",
    items: ["Todo lo de Pro", "Pago unico", "Sin mensualidades nunca mas"],
    featured: true,
  },
];

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-[var(--background)]">
      <section className="border-b border-[var(--line)]">
        <div className="mx-auto flex max-w-[1280px] items-center justify-between gap-4 px-4 py-5 sm:px-6 xl:px-10">
          <Logo href="/" />
          <div className="flex items-center gap-3">
            <Link href="/pricing">
              <Button variant="ghost" size="sm">
                Planes
              </Button>
            </Link>
            <Link href="/sign-in">
              <Button size="sm">Continuar con Google</Button>
            </Link>
          </div>
        </div>
      </section>

      <section className="shell-grid">
        <div className="mx-auto grid max-w-[1280px] gap-8 px-4 py-16 sm:px-6 lg:grid-cols-[1.1fr,0.9fr] xl:px-10 xl:py-24">
          <div className="max-w-3xl pt-4">
            <SectionHeader
              eyebrow="Arca"
              title="Tu dinero, claro y bajo control."
              description="Arca reune tus cuentas, deudas, tarjetas, ahorro y pagos del mes en un solo lugar, sin hojas de calculo ni complicaciones."
            />
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/sign-in">
                <Button size="lg">
                  Continuar con Google
                  <ArrowRight size={16} />
                </Button>
              </Link>
              <a href="#como-funciona">
                <Button size="lg" variant="secondary">
                  Ver como funciona
                </Button>
              </a>
            </div>
          </div>

          <Card className="arca-hero-frame overflow-hidden border-[var(--line-strong)] p-0">
            <div
              className="border-b border-[var(--line)] px-6 py-5"
              style={{
                backgroundImage: "linear-gradient(180deg, rgba(0,0,0,0.02), rgba(0,0,0,0)), url('/brand/arca/logo-mark-transparent.svg')",
                backgroundPosition: "right -32px top -28px",
                backgroundRepeat: "no-repeat",
                backgroundSize: "180px",
              }}
            >
              <p className="text-xs uppercase tracking-[0.28em] text-[var(--muted)]">Vista de producto</p>
              <h2 className="mt-2 text-2xl font-semibold text-[var(--foreground)]">Hoy</h2>
              <p className="mt-2 text-sm leading-6 text-[var(--muted)]">Caja libre, pagos urgentes y siguiente ingreso en una sola lectura.</p>
            </div>
            <div className="grid gap-4 p-6 sm:grid-cols-2">
              <div className="arca-soft-block rounded-2xl p-4">
                <p className="text-xs uppercase tracking-[0.24em] text-[var(--muted)]">Caja disponible</p>
                <p className="mt-4 text-3xl font-semibold text-[var(--foreground)]">$ 2.480.000</p>
                <p className="mt-2 text-sm text-[var(--muted)]">Saldo libre de ejemplo despues de separar ahorro protegido.</p>
                <div className="mt-4 flex items-center gap-2">
                  <span className="inline-flex rounded-full bg-[var(--success-bg)] px-2.5 py-1 text-xs font-medium text-[var(--success)]">Bien</span>
                  <span className="text-xs text-[var(--muted)]">Puedes cubrir lo urgente.</span>
                </div>
              </div>

              <div className="arca-soft-block rounded-2xl p-4">
                <p className="text-xs uppercase tracking-[0.24em] text-[var(--muted)]">Pagos urgentes</p>
                <div className="mt-4 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-[var(--foreground)]">Proveedor principal</p>
                      <p className="text-xs text-[var(--muted)]">Vence el 18</p>
                    </div>
                    <p className="text-sm font-semibold text-[var(--foreground)]">$ 620.000</p>
                  </div>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-[var(--foreground)]">Tarjeta empresa minimo</p>
                      <p className="text-xs text-[var(--muted)]">Vence el 22</p>
                    </div>
                    <p className="text-sm font-semibold text-[var(--foreground)]">$ 185.000</p>
                  </div>
                </div>
              </div>

              <div className="arca-soft-block rounded-2xl p-4">
                <p className="text-xs uppercase tracking-[0.24em] text-[var(--muted)]">Proximo ingreso</p>
                <p className="mt-4 text-lg font-semibold text-[var(--foreground)]">Proyecto mensual</p>
                <p className="mt-2 text-2xl font-semibold text-[var(--success)]">+$ 1.150.000</p>
                <p className="mt-2 text-sm text-[var(--muted)]">Entra el proximo dia habil.</p>
              </div>

              <div className="arca-soft-block rounded-2xl p-4">
                <p className="text-xs uppercase tracking-[0.24em] text-[var(--muted)]">Libre despues de pagos</p>
                <p className="mt-4 text-3xl font-semibold text-[var(--foreground)]">$ 1.675.000</p>
                <p className="mt-2 text-sm text-[var(--muted)]">Lectura simple para decidir si puedes comprar, esperar o mover caja.</p>
                <div className="mt-4 h-2 overflow-hidden rounded-full bg-[var(--surface-2)]">
                  <div className="h-full w-[68%] rounded-full bg-[var(--accent)]" />
                </div>
              </div>
            </div>
          </Card>
        </div>
      </section>

      <section className="border-t border-[var(--line)] bg-[var(--surface)]">
        <div className="mx-auto max-w-[1280px] px-4 py-14 sm:px-6 xl:px-10">
          <SectionHeader eyebrow="Beneficios" title="Lo que necesitas ver, sin enredos." align="center" />
          <div className="mt-10 grid gap-4 lg:grid-cols-3">
            <Card className="p-5">
              <h3 className="text-xl font-semibold text-[var(--foreground)]">Sabe que pagar primero</h3>
              <p className="mt-3 text-sm leading-7 text-[var(--muted)]">Arca prioriza tus obligaciones por fecha e impacto en tu caja.</p>
            </Card>
            <Card className="p-5">
              <h3 className="text-xl font-semibold text-[var(--foreground)]">Ve tu plata real</h3>
              <p className="mt-3 text-sm leading-7 text-[var(--muted)]">Cuentas, tarjetas y ahorro resumidos en un solo numero: lo que de verdad tienes disponible hoy.</p>
            </Card>
            <Card className="p-5">
              <h3 className="text-xl font-semibold text-[var(--foreground)]">Planea tu mes sin sorpresas</h3>
              <p className="mt-3 text-sm leading-7 text-[var(--muted)]">Anticipa lo que entra y lo que sale antes de que pase.</p>
            </Card>
          </div>
        </div>
      </section>

      <section id="como-funciona" className="border-t border-[var(--line)]">
        <div className="mx-auto max-w-[1280px] px-4 py-14 sm:px-6 xl:px-10">
          <SectionHeader eyebrow="Como funciona" title="Tres pasos para empezar." align="center" />
          <div className="mt-10 grid gap-4 lg:grid-cols-3">
            {[
              ["1", "Registra tus cuentas y pagos"],
              ["2", "Arca calcula tu caja libre real"],
              ["3", "Decide cada dia desde tu mando de control (Hoy)"],
            ].map(([step, text]) => (
              <Card key={step} className="p-5">
                <p className="text-sm font-semibold text-[var(--accent-2-strong)]">{step}</p>
                <p className="mt-4 text-xl font-semibold text-[var(--foreground)]">{text}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-[var(--line)] bg-[var(--surface)]">
        <div className="mx-auto max-w-[1280px] px-4 py-14 sm:px-6 xl:px-10">
          <SectionHeader eyebrow="Planes" title="Empieza gratis. Sin tarjeta de credito." align="center" />
          <div className="mt-6 rounded-2xl border border-[var(--copper)]/40 bg-[var(--copper-soft)] px-5 py-4 text-sm font-medium text-[var(--foreground)]">
            Acceso completo gratis mientras cerramos la v1.
          </div>
          <div className="mt-8 grid gap-5 lg:grid-cols-3">
            {planCards.map((plan) => (
              <Card key={plan.name} variant={plan.featured ? "featured" : "default"} className="p-6">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-xs uppercase tracking-[0.24em] text-[var(--muted)]">{plan.code}</p>
                  {plan.featured ? <span className="inline-flex items-center rounded-full bg-[var(--accent-2)] px-2.5 py-1 text-xs font-medium text-[var(--on-accent)]">Mejor valor</span> : null}
                </div>
                <h3 className="mt-3 text-2xl font-semibold text-[var(--foreground)]">{plan.name}</h3>
                <p className="mt-2 text-4xl font-semibold text-[var(--foreground)]">{plan.price}</p>
                {"secondaryPrice" in plan && plan.secondaryPrice ? <p className="mt-2 text-sm text-[var(--muted)]">{plan.secondaryPrice}</p> : null}
                <div className="mt-6 space-y-3">
                  {plan.items.map((item) => (
                    <div key={item} className="flex items-start gap-3">
                      <div className="mt-1 flex h-5 w-5 items-center justify-center rounded-full bg-[var(--success-bg)] text-[var(--success)]">
                        <Check size={12} />
                      </div>
                      <p className="text-sm leading-6 text-[var(--muted)]">{item}</p>
                    </div>
                  ))}
                  {"exclusions" in plan && plan.exclusions ? (
                    <div className="pt-3 text-sm leading-6 text-[var(--foreground)]">
                      <p className="font-medium">No incluye:</p>
                      {plan.exclusions.map((item) => (
                        <p key={item}>{item}</p>
                      ))}
                    </div>
                  ) : null}
                </div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <footer className="border-t border-[var(--line)]">
        <div className="mx-auto flex max-w-[1280px] flex-col gap-4 px-4 py-8 sm:px-6 xl:px-10">
          <Logo withWordmark={false} />
          <div>
            <p className="font-semibold text-[var(--foreground)]">Arca</p>
            <p className="mt-1 text-sm text-[var(--muted)]">© 2026 Arca. Todos los derechos reservados.</p>
          </div>
        </div>
      </footer>
    </main>
  );
}
