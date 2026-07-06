"use client";

import type React from "react";
import Link from "next/link";
import { ArrowRight, BadgeDollarSign, PencilLine, Sparkles } from "lucide-react";
import { Bar, BarChart, CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Badge, Button, Card, EmptyState, MetricCard } from "@/components/ui-kit";
import { formatCOP } from "@/lib/finance";
import type { DashboardSummary } from "@/lib/types";

export function ExecutiveDashboardView({ summary, isEmpty = false }: { summary: DashboardSummary; isEmpty?: boolean }) {
  if (isEmpty) {
    return (
      <div className="space-y-6">
        <section className="rounded-[28px] border border-[var(--line)] bg-[var(--surface)] p-6 shadow-[var(--elevation-strong)]">
          <div className="max-w-4xl">
            <p className="text-xs uppercase tracking-[0.28em] text-[var(--muted)]">Dashboard</p>
            <h1 className="mt-3 text-4xl font-semibold tracking-tight text-[var(--foreground)] sm:text-5xl">Lectura ejecutiva de tu dinero.</h1>
            <p className="mt-4 text-sm leading-7 text-[var(--muted)]">Cuando empieces a registrar movimientos, aqui veras tu caja real, compromisos y tendencia.</p>
          </div>
        </section>
        <EmptyState
          title="Todavia no tienes movimientos"
          description="Crea tu primera cuenta o registra un ingreso para empezar a ver tu caja real."
          actions={
            <>
              <Link href="/app/registrar?segment=cuenta">
                <Button size="sm">Crear cuenta</Button>
              </Link>
              <Link href="/app/registrar?segment=movimiento">
                <Button size="sm" variant="secondary">
                  Registrar movimiento
                </Button>
              </Link>
            </>
          }
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section className="rounded-[28px] border border-[var(--line)] bg-[var(--surface)] p-6 shadow-[var(--elevation-strong)]">
        <div className="max-w-4xl">
          <p className="text-xs uppercase tracking-[0.28em] text-[var(--muted)]">Dashboard</p>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight text-[var(--foreground)] sm:text-5xl">Lectura ejecutiva de caja y presion financiera.</h1>
          <p className="mt-4 text-sm leading-7 text-[var(--muted)]">Panel de control del mes. Aqui solo viven metricas, tendencia y accesos rapidos a decisiones.</p>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Caja total" value={formatCOP(summary.currentCash)} delta={`Libre: ${formatCOP(summary.freeCash)}`} tone="success" />
        <MetricCard label="Entradas del mes" value={formatCOP(summary.monthlyIncome)} delta={`Compromisos: ${formatCOP(summary.monthlyCommitments)}`} tone="neutral" />
        <MetricCard label="Salidas del mes" value={formatCOP(summary.monthlyExpenses)} delta={`Ahorro protegido: ${formatCOP(summary.protectedSavings)}`} tone="warning" />
        <MetricCard
          label="% caja comprometido"
          value={`${summary.commitmentRatio.toFixed(1)}%`}
          delta={`${summary.overdueCount} vencidos - ${summary.openObligations} abiertos`}
          tone={summary.overdueCount > 0 ? "danger" : "neutral"}
        />
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.7fr,1fr]">
        <Card className="p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.24em] text-[var(--muted)]">Tendencia</p>
              <h2 className="mt-2 text-2xl font-semibold text-[var(--foreground)]">Flujo y balance de 6 meses</h2>
            </div>
            <Badge tone="neutral">Serie base</Badge>
          </div>
          <div className="mt-6 h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={summary.timeline}>
                <CartesianGrid stroke="var(--border)" vertical={false} />
                <XAxis dataKey="month" tickLine={false} axisLine={false} tickMargin={10} />
                <YAxis tickLine={false} axisLine={false} tickFormatter={(value) => formatCOP(Number(value))} width={96} />
                <Tooltip formatter={(value) => formatCOP(Number(value ?? 0))} contentStyle={{ border: "1px solid var(--border)", background: "var(--surface)" }} />
                <Legend />
                <Line type="monotone" dataKey="closingBalance" name="Saldo" stroke="var(--accent)" strokeWidth={3} dot={false} />
                <Line type="monotone" dataKey="commitments" name="Compromisos" stroke="var(--danger)" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="p-5">
          <p className="text-xs uppercase tracking-[0.24em] text-[var(--muted)]">Atajos</p>
          <h2 className="mt-2 text-2xl font-semibold text-[var(--foreground)]">Ir a operar</h2>
          <div className="mt-5 space-y-3">
            <QuickLink href="/app/hoy" icon={<Sparkles size={16} />} title="Hoy" text="Urgencias, pagos sugeridos y siguiente ingreso." />
            <QuickLink href="/app/registrar" icon={<PencilLine size={16} />} title="Registrar" text="Captura manual de movimientos, deuda, tarjeta o ahorro." />
            <QuickLink href="/app/obligaciones" icon={<BadgeDollarSign size={16} />} title="Obligaciones" text="Pagos, deudas y servicios por resolver." />
          </div>
          <div className="arca-soft-block mt-6 rounded-2xl p-4">
            <p className="text-sm text-[var(--muted)]">Deuda viva</p>
            <p className="mt-1 text-3xl font-semibold text-[var(--foreground)]">{formatCOP(summary.debtExposure)}</p>
          </div>
        </Card>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.2fr,1fr]">
        <Card className="p-5">
          <p className="text-xs uppercase tracking-[0.24em] text-[var(--muted)]">Mensual</p>
          <h2 className="mt-2 text-2xl font-semibold text-[var(--foreground)]">Entradas vs salidas</h2>
          <div className="mt-6 h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={summary.timeline}>
                <CartesianGrid stroke="var(--border)" vertical={false} />
                <XAxis dataKey="month" tickLine={false} axisLine={false} tickMargin={10} />
                <YAxis tickLine={false} axisLine={false} tickFormatter={(value) => formatCOP(Number(value))} width={96} />
                <Tooltip formatter={(value) => formatCOP(Number(value ?? 0))} contentStyle={{ border: "1px solid var(--border)", background: "var(--surface)" }} />
                <Legend />
                <Bar dataKey="income" name="Ingresos" fill="var(--success)" radius={[6, 6, 0, 0]} />
                <Bar dataKey="expenses" name="Gastos posteados" fill="var(--accent-2)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="p-5">
          <p className="text-xs uppercase tracking-[0.24em] text-[var(--muted)]">Riesgo</p>
          <h2 className="mt-2 text-2xl font-semibold text-[var(--foreground)]">Estado del mes</h2>
          <div className="mt-5 space-y-3">
            <StatusRow label="Compromisos abiertos" value={String(summary.openObligations)} />
            <StatusRow label="Vencidos" value={String(summary.overdueCount)} tone={summary.overdueCount > 0 ? "danger" : "success"} />
            <StatusRow label="Caja libre" value={formatCOP(summary.freeCash)} />
            <StatusRow label="Compromisos del mes" value={formatCOP(summary.monthlyCommitments)} />
          </div>
        </Card>
      </section>
    </div>
  );
}

function QuickLink({
  href,
  icon,
  title,
  text,
}: {
  href: string;
  icon: React.ReactNode;
  title: string;
  text: string;
}) {
  return (
    <Link
      href={href}
      className="arca-soft-block flex items-center justify-between gap-3 rounded-2xl px-4 py-3 transition hover:bg-[color:color-mix(in_srgb,var(--surface)_84%,var(--surface-strong)_16%)]"
    >
      <div className="flex items-start gap-3">
        <div className="arca-soft-block mt-0.5 flex h-8 w-8 items-center justify-center rounded-xl">{icon}</div>
        <div>
          <p className="text-sm font-semibold text-[var(--foreground)]">{title}</p>
          <p className="mt-1 text-xs leading-5 text-[var(--muted)]">{text}</p>
        </div>
      </div>
      <ArrowRight size={16} className="text-[var(--muted)]" />
    </Link>
  );
}

function StatusRow({ label, value, tone = "neutral" }: { label: string; value: string; tone?: "neutral" | "success" | "danger" }) {
  return (
    <div className="arca-soft-block flex items-center justify-between gap-3 rounded-2xl px-4 py-3">
      <p className="text-sm text-[var(--muted)]">{label}</p>
      <Badge tone={tone === "danger" ? "danger" : tone === "success" ? "success" : "neutral"}>{value}</Badge>
    </div>
  );
}
