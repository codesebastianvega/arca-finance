import Link from "next/link";
import { Check } from "lucide-react";
import { Button, Card, Logo, SectionHeader } from "@/components/ui-kit";

const plans = [
  {
    name: "Personal",
    price: "$0",
    code: "Gratis",
    items: ["Hasta 5 cuentas", "Hasta 3 tarjetas", "Registrar y Transferir sin limite", "Hoy y Dashboard completos", "Historial de los ultimos 90 dias"],
    exclusions: ["Proyeccion", "Negocios (unidades de negocio)"],
  },
  {
    name: "Pro",
    price: "$5.900 COP/mes",
    secondaryPrice: "$49.900 COP/ano",
    code: "Suscripcion",
    items: ["Todo lo de Personal", "Cuentas y tarjetas ilimitadas", "Historial completo, sin limite de tiempo", "Planeacion: Mes y Proyeccion", "Negocios ilimitados"],
  },
  {
    name: "Arca Para Siempre",
    price: "$89.900 COP",
    code: "Pago unico",
    items: ["Todo lo de Pro", "Pago unico", "Sin mensualidades nunca mas"],
    featured: true,
  },
];

export default function PricingPage() {
  return (
    <main className="min-h-screen bg-[var(--background)]">
      <div className="mx-auto max-w-[1180px] px-4 py-14 sm:px-6 xl:px-10">
        <Logo href="/" />
        <div className="mt-8">
          <SectionHeader eyebrow="Planes" title="Empieza gratis. Sin tarjeta de credito." description="Todos los usuarios tienen acceso completo mientras cerramos la v1." />
        </div>
        <div className="mt-6 rounded-2xl border border-[var(--copper)]/40 bg-[var(--copper-soft)] px-5 py-4 text-sm font-medium text-[var(--foreground)]">
          Acceso completo gratis mientras cerramos la v1.
        </div>

        <div className="mt-10 grid gap-5 lg:grid-cols-3">
          {plans.map((plan) => (
            <Card key={plan.code} variant={plan.featured ? "featured" : "default"} className="p-6">
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs uppercase tracking-[0.24em] text-[var(--muted)]">{plan.code}</p>
                {plan.featured ? <span className="inline-flex items-center rounded-full bg-[var(--accent-2)] px-2.5 py-1 text-xs font-medium text-[var(--on-accent)]">Mejor valor</span> : null}
              </div>
              <h2 className="mt-3 text-2xl font-semibold text-[var(--foreground)]">{plan.name}</h2>
              <p className="mt-3 text-4xl font-semibold text-[var(--foreground)]">{plan.price}</p>
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

        <div className="mt-10 flex gap-3">
          <Link href="/sign-in">
            <Button size="lg">Continuar con Google</Button>
          </Link>
          <Link href="/">
            <Button size="lg" variant="secondary">
              Volver
            </Button>
          </Link>
        </div>
      </div>
    </main>
  );
}
