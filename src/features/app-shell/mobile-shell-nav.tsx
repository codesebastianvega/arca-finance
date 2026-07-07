"use client";

import Link from "next/link";
import { useState } from "react";
import { Building2, CalendarClock, History, Landmark, LayoutDashboard, Menu, Settings, Sparkles, X } from "lucide-react";
import { Button, Logo } from "@/components/ui-kit";
import { cn } from "@/lib/utils";

const bottomItems = [
  { href: "/app/hoy", label: "Hoy", icon: Sparkles },
  { href: "/app/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/app/dinero/cuentas", label: "Dinero", icon: Landmark },
  { href: "/app/obligaciones", label: "Obligaciones", icon: CalendarClock },
];

const drawerItems = [
  { href: "/app/planeacion/mes", label: "Planeacion", icon: CalendarClock },
  { href: "/app/negocios", label: "Negocios", icon: Building2 },
  { href: "/app/movimientos", label: "Movimientos", icon: History },
  { href: "/app/configuracion", label: "Configuracion", icon: Settings },
];

function isActivePath(currentPath: string, href: string) {
  return currentPath === href || currentPath.startsWith(`${href}/`);
}

export function MobileShellNav({
  currentPath,
  workspaceName,
  mode = "full",
}: {
  currentPath: string;
  workspaceName: string;
  mode?: "full" | "trigger" | "bottom";
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      {mode !== "bottom" ? (
        <div className="flex items-center gap-3 lg:hidden">
          <Button type="button" variant="secondary" size="sm" onClick={() => setOpen(true)} aria-label="Abrir menu">
            <Menu size={16} />
          </Button>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-[var(--foreground)]">{workspaceName}</p>
          </div>
        </div>
      ) : null}

      {open ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button type="button" className="absolute inset-0 bg-[rgba(10,8,6,0.56)]" onClick={() => setOpen(false)} aria-label="Cerrar menu" />
          <div className="absolute left-0 top-0 h-full w-[86vw] max-w-[360px] border-r border-[var(--line)] bg-[var(--surface)] p-5 shadow-[var(--elevation-strong)]">
            <div className="flex items-center justify-between gap-3 border-b border-[var(--line)] pb-4">
              <Logo href="/" compact />
              <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)} aria-label="Cerrar menu">
                <X size={16} />
              </Button>
            </div>

            <nav className="mt-5 space-y-2">
              {[...bottomItems, ...drawerItems].map((item) => {
                const Icon = item.icon;
                const active = isActivePath(currentPath, item.href);

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setOpen(false)}
                    className={cn(
                      "flex items-center gap-3 rounded-2xl border px-4 py-3 text-sm transition",
                      active
                        ? "border-[color:color-mix(in_srgb,var(--accent)_72%,var(--border)_28%)] border-t-[var(--border-top-highlight)] bg-[var(--accent-gradient)] text-[var(--on-accent)] shadow-[var(--elevation-soft)]"
                        : "border-[var(--border)] border-t-[var(--border-top-highlight)] bg-[var(--bg-surface-2)] text-[var(--text-primary)]"
                    )}
                  >
                    <Icon size={17} />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </nav>
          </div>
        </div>
      ) : null}

      {mode !== "trigger" ? (
        <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-[var(--line)] bg-[var(--header-backdrop)] px-2 pb-[calc(env(safe-area-inset-bottom)+0.55rem)] pt-2 backdrop-blur lg:hidden">
          <div className="grid grid-cols-5 gap-2">
            {bottomItems.map((item) => {
              const Icon = item.icon;
              const active = isActivePath(currentPath, item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex min-h-[58px] flex-col items-center justify-center rounded-2xl px-2 py-2 text-[11px] font-medium transition",
                    active
                      ? "bg-[var(--accent-gradient)] text-[var(--on-accent)] shadow-[var(--elevation-soft)]"
                      : "border border-[var(--border)] border-t-[var(--border-top-highlight)] bg-[var(--bg-surface-2)] text-[var(--text-primary)]"
                  )}
                >
                  <Icon size={16} />
                  <span className="mt-1 truncate">{item.label}</span>
                </Link>
              );
            })}
            <button
              type="button"
              onClick={() => setOpen(true)}
              className="flex min-h-[58px] flex-col items-center justify-center rounded-2xl border border-[var(--border)] border-t-[var(--border-top-highlight)] bg-[var(--bg-surface-2)] px-2 py-2 text-[11px] font-medium text-[var(--text-primary)]"
            >
              <Menu size={16} />
              <span className="mt-1">Mas</span>
            </button>
          </div>
        </nav>
      ) : null}
    </>
  );
}
