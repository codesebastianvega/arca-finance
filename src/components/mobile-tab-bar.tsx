"use client";

import Link from "next/link";
import { useState } from "react";
import { CalendarClock, Home, Menu, Plus, Wallet } from "lucide-react";
import type { DashboardData } from "@/lib/dashboard-data";
import { RegisterBottomSheet } from "@/components/register-bottom-sheet";
import { cn } from "@/lib/utils";

const tabs = [
  { href: "/app/hoy", label: "Hoy", icon: Home, match: (path: string) => path === "/app/hoy" || path.startsWith("/app/hoy/") },
  { href: "/app/dinero/cuentas", label: "Dinero", icon: Wallet, match: (path: string) => path.startsWith("/app/dinero") || path === "/app/cuentas" || path === "/app/tarjetas" || path === "/app/ahorro" },
  { href: "/app/obligaciones", label: "Obligaciones", icon: CalendarClock, match: (path: string) => path.startsWith("/app/obligaciones") || path.startsWith("/app/calendario") },
  { href: "/app/mas", label: "Mas", icon: Menu, match: (path: string) => path.startsWith("/app/mas") || path.startsWith("/app/dashboard") || path.startsWith("/app/planeacion") || path.startsWith("/app/negocios") || path.startsWith("/app/movimientos") || path.startsWith("/app/configuracion") },
] as const;

export function MobileTabBar({
  currentPath,
  registerData,
}: {
  currentPath: string;
  registerData: DashboardData;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-[var(--border)] bg-[var(--surface)] pb-[calc(env(safe-area-inset-bottom)+0.55rem)] pt-2 md:hidden">
        <div className="mx-auto grid max-w-xl grid-cols-5 items-end px-3">
          {tabs.slice(0, 2).map((item) => {
            const Icon = item.icon;
            const active = item.match(currentPath);
            return (
              <Link key={item.href} href={item.href} className="flex min-h-[58px] flex-col items-center justify-center gap-1 text-center">
                <Icon size={19} className={active ? "text-[var(--accent)]" : "text-[var(--text-muted)]"} />
                <span className={cn("text-[11px] font-medium", active ? "text-[var(--accent)]" : "text-[var(--text-muted)]")}>{item.label}</span>
              </Link>
            );
          })}

          <div className="flex justify-center">
            <button
              type="button"
              onClick={() => setOpen(true)}
              aria-label="Registrar"
              className="arca-focus relative -mt-5 inline-flex h-14 w-14 items-center justify-center rounded-full border border-[color:color-mix(in_srgb,var(--accent)_72%,var(--border)_28%)] border-t-[var(--border-top-highlight)] bg-[var(--accent-gradient)] text-[var(--on-accent)] shadow-[var(--elevation-strong)]"
            >
              <Plus size={22} />
            </button>
          </div>

          {tabs.slice(2).map((item) => {
            const Icon = item.icon;
            const active = item.match(currentPath);
            return (
              <Link key={item.href} href={item.href} className="flex min-h-[58px] flex-col items-center justify-center gap-1 text-center">
                <Icon size={19} className={active ? "text-[var(--accent)]" : "text-[var(--text-muted)]"} />
                <span className={cn("text-[11px] font-medium", active ? "text-[var(--accent)]" : "text-[var(--text-muted)]")}>{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>

      <RegisterBottomSheet data={registerData} open={open} onClose={() => setOpen(false)} />
    </>
  );
}
