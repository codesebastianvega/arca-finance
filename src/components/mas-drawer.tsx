"use client";

import { useState } from "react";
import Link from "next/link";
import { CalendarClock, ChevronRight, LayoutDashboard, LogOut, ReceiptText, Settings, BriefcaseBusiness, X } from "lucide-react";
import { signOutAction } from "@/app/auth-actions";
import { Button } from "@/components/ui-kit";

export function MasDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [touchStartY, setTouchStartY] = useState<number | null>(null);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 md:hidden">
      <button type="button" aria-label="Cerrar menu" className="absolute inset-0 bg-[rgba(10,8,6,0.48)] backdrop-blur-sm" onClick={onClose} />
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
        <div className="mx-auto mt-3 h-1.5 w-12 shrink-0 rounded-full bg-[var(--border)]" />
        <div className="flex shrink-0 items-center justify-between gap-3 px-4 pb-3 pt-4">
          <div className="min-w-0">
            <p className="text-xs uppercase tracking-[0.24em] text-[var(--muted)]">Menu</p>
            <p className="mt-1 text-lg font-semibold text-[var(--foreground)]">Opciones</p>
          </div>
          <Button type="button" variant="ghost" size="sm" onClick={onClose} aria-label="Cerrar" className="arca-active-scale">
            <X size={18} />
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto overscroll-contain px-4 pb-[calc(env(safe-area-inset-bottom)+1rem)]">
          <div className="overflow-hidden rounded-[24px] border border-[var(--border)] bg-[var(--surface)]">
            <MenuRow href="/app/dashboard" label="Dashboard" icon={LayoutDashboard} onClick={onClose} />
            <div className="border-b border-[var(--border)] px-4 py-3 text-xs uppercase tracking-[0.24em] text-[var(--muted)]">Planeacion</div>
            <MenuRow href="/app/planeacion/mes" label="Mes" icon={CalendarClock} inset onClick={onClose} />
            <MenuRow href="/app/planeacion/proyeccion" label="Proyeccion" icon={CalendarClock} inset onClick={onClose} />
            <MenuRow href="/app/negocios" label="Negocios" icon={BriefcaseBusiness} onClick={onClose} />
            <MenuRow href="/app/movimientos" label="Historial" icon={ReceiptText} onClick={onClose} />
            <MenuRow href="/app/configuracion" label="Configuracion" icon={Settings} onClick={onClose} />

            <form action={signOutAction} className="border-t border-[var(--border)]">
              <button type="submit" className="arca-active-scale flex w-full items-center justify-between gap-3 px-4 py-4 text-left transition hover:bg-[color:color-mix(in_srgb,var(--surface)_84%,var(--surface-strong)_16%)]">
                <div className="flex items-center gap-3">
                  <LogOut size={18} className="text-[var(--danger)]" />
                  <span className="text-sm font-medium text-[var(--danger)]">Salir</span>
                </div>
                <ChevronRight size={16} className="text-[var(--text-muted)]" />
              </button>
            </form>
          </div>
        </div>
      </section>
    </div>
  );
}

function MenuRow({
  href,
  label,
  icon: Icon,
  inset = false,
  onClick,
}: {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  inset?: boolean;
  onClick: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className="arca-active-scale flex items-center justify-between gap-3 border-b border-[var(--border)] px-4 py-4 last:border-b-0 transition hover:bg-[color:color-mix(in_srgb,var(--surface)_84%,var(--surface-strong)_16%)]"
    >
      <div className="flex items-center gap-3">
        <Icon size={18} className="text-[var(--text-primary)]" />
        <span className={inset ? "pl-6 text-sm font-medium text-[var(--text-primary)]" : "text-sm font-medium text-[var(--text-primary)]"}>{label}</span>
      </div>
      <ChevronRight size={16} className="text-[var(--text-muted)]" />
    </Link>
  );
}
