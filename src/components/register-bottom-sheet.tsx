"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRightLeft, BadgeDollarSign, CreditCard, Landmark, PiggyBank, Plus, Wallet, X } from "lucide-react";
import { Button } from "@/components/ui-kit";
import type { DashboardData } from "@/lib/dashboard-data";
import { RegisterFormsPanel, type RegisterSegmentKey } from "@/features/register/register-screen";
import { cn } from "@/lib/utils";

const mobileSegments: Array<{
  key: RegisterSegmentKey;
  label: string;
  icon: typeof Wallet;
}> = [
  { key: "movimiento", label: "Movimiento", icon: Wallet },
  { key: "cuenta", label: "Cuenta", icon: Landmark },
  { key: "deuda", label: "Deuda", icon: BadgeDollarSign },
  { key: "tarjeta", label: "Tarjeta", icon: CreditCard },
  { key: "ahorro", label: "Ahorro", icon: PiggyBank },
];

export function RegisterBottomSheet({
  data,
  open,
  onClose,
}: {
  data: DashboardData;
  open: boolean;
  onClose: () => void;
}) {
  const [segment, setSegment] = useState<RegisterSegmentKey>("movimiento");
  const [touchStartY, setTouchStartY] = useState<number | null>(null);

  const activeLabel = useMemo(() => mobileSegments.find((item) => item.key === segment)?.label ?? "Movimiento", [segment]);

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 md:hidden">
      <button type="button" aria-label="Cerrar registro" className="absolute inset-0 bg-[rgba(10,8,6,0.48)] backdrop-blur-sm" onClick={onClose} />
      <section
        className="absolute inset-x-0 bottom-0 flex max-h-[85vh] flex-col rounded-t-[32px] border border-[var(--border)] border-b-0 bg-[var(--surface)] shadow-[var(--elevation-strong)]"
        onTouchStart={(event) => setTouchStartY(event.touches[0]?.clientY ?? null)}
        onTouchEnd={(event) => {
          const endY = event.changedTouches[0]?.clientY ?? null;
          if (touchStartY != null && endY != null && endY - touchStartY > 72) {
            onClose();
          }
          setTouchStartY(null);
        }}
      >
        <div className="mx-auto mt-3 h-1.5 w-12 rounded-full bg-[var(--border)]" />
        <div className="flex items-center justify-between gap-3 px-4 pb-3 pt-4">
          <div className="min-w-0">
            <p className="text-xs uppercase tracking-[0.24em] text-[var(--muted)]">Registrar</p>
            <p className="mt-1 truncate text-lg font-semibold text-[var(--foreground)]">{activeLabel}</p>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/app/transferir" onClick={onClose} className="arca-active-scale">
              <Button type="button" variant="secondary" size="sm">
                <ArrowRightLeft size={16} />
                Transferir
              </Button>
            </Link>
            <Button type="button" variant="ghost" size="sm" onClick={onClose} aria-label="Cerrar" className="arca-active-scale">
              <X size={18} />
            </Button>
          </div>
        </div>

        <div className="overflow-x-auto px-4 pb-3">
          <div className="flex min-w-max gap-2">
            {mobileSegments.map((item) => {
              const Icon = item.icon;
              const active = item.key === segment;

              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => setSegment(item.key)}
                  className={cn(
                    "arca-active-scale inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition",
                    active ? "arca-chip-active" : "arca-chip"
                  )}
                >
                  <Icon size={16} />
                  {item.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto overscroll-contain px-4 pb-[calc(env(safe-area-inset-bottom)+1rem)]">
          <div className="rounded-[24px] border border-[var(--border)] bg-[var(--surface)] p-4">
            <RegisterFormsPanel data={data} segment={segment} />
          </div>
        </div>
      </section>
    </div>
  );
}
