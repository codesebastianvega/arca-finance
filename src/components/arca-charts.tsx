"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card } from "./ui-kit";

type Point = {
  name: string;
  value: number;
};

export function ArcaCharts({
  flowData,
  sourceData,
}: {
  flowData: Point[];
  sourceData: Point[];
}) {
  const hasFlowData = flowData.length > 0;
  const hasSourceData = sourceData.length > 0;

  return (
    <div className="grid gap-4 xl:grid-cols-2">
      <Card className="p-4">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">Proyeccion</p>
            <h2 className="mt-1 text-lg font-semibold text-[var(--foreground)]">Saldo proyectado</h2>
          </div>
          <span className="rounded-full bg-[var(--surface-2)] px-2.5 py-1 text-xs text-[var(--muted)]">Eventos abiertos</span>
        </div>
        <div className="h-[280px]">
          {hasFlowData ? (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={flowData} margin={{ top: 8, right: 8, bottom: 0, left: -10 }}>
                <CartesianGrid stroke="rgba(16,16,16,0.12)" vertical={false} />
                <XAxis dataKey="name" tickLine={false} axisLine={false} fontSize={12} />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  fontSize={12}
                  tickFormatter={(value) => `$${value / 1000000}M`}
                />
                <Tooltip
                  formatter={(value) => [`$${Number(value).toLocaleString("es-CO")}`, "Saldo"]}
                  contentStyle={{ borderRadius: 12, border: "1px solid rgba(16,16,16,0.12)" }}
                />
                <Line type="monotone" dataKey="value" stroke="#0f3554" strokeWidth={3} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-full items-center justify-center rounded-2xl border border-dashed border-[var(--line-strong)] text-sm text-[var(--muted)]">
              Sin eventos suficientes para proyectar.
            </div>
          )}
        </div>
      </Card>

      <Card className="p-4">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">Ingresos</p>
            <h2 className="mt-1 text-lg font-semibold text-[var(--foreground)]">Estimados por fuente</h2>
          </div>
        </div>
        <div className="h-[280px]">
          {hasSourceData ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={sourceData} margin={{ top: 8, right: 8, bottom: 0, left: -10 }}>
                <CartesianGrid stroke="rgba(16,16,16,0.12)" vertical={false} />
                <XAxis dataKey="name" tickLine={false} axisLine={false} fontSize={12} />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  fontSize={12}
                  tickFormatter={(value) => `$${value / 1000000}M`}
                />
                <Tooltip
                  formatter={(value) => [`$${Number(value).toLocaleString("es-CO")}`, "Ingreso"]}
                  contentStyle={{ borderRadius: 12, border: "1px solid rgba(16,16,16,0.12)" }}
                />
                <Bar dataKey="value" fill="#a27734" radius={[10, 10, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-full items-center justify-center rounded-2xl border border-dashed border-[var(--line-strong)] text-sm text-[var(--muted)]">
              Sin ingresos estimados para este mes.
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
