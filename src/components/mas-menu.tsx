import Link from "next/link";
import { CalendarClock, ChevronRight, LayoutDashboard, LogOut, ReceiptText, Settings, BriefcaseBusiness } from "lucide-react";
import { signOutAction } from "@/app/auth-actions";

export function MasMenu() {
  return (
    <section className="md:hidden">
      <div className="mb-4">
        <p className="text-xs uppercase tracking-[0.28em] text-[var(--muted)]">Mas</p>
      </div>

      <div className="overflow-hidden rounded-[24px] border border-[var(--border)] bg-[var(--surface)]">
        <MenuRow href="/app/dashboard" label="Dashboard" icon={LayoutDashboard} />
        <div className="border-b border-[var(--border)] px-4 py-3 text-xs uppercase tracking-[0.24em] text-[var(--muted)]">Planeacion</div>
        <MenuRow href="/app/planeacion/mes" label="Mes" icon={CalendarClock} inset />
        <MenuRow href="/app/planeacion/proyeccion" label="Proyeccion" icon={CalendarClock} inset />
        <MenuRow href="/app/negocios" label="Negocios" icon={BriefcaseBusiness} />
        <MenuRow href="/app/movimientos" label="Historial" icon={ReceiptText} />
        <MenuRow href="/app/configuracion" label="Configuracion" icon={Settings} />

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
    </section>
  );
}

function MenuRow({
  href,
  label,
  icon: Icon,
  inset = false,
}: {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  inset?: boolean;
}) {
  return (
    <Link
      href={href}
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
