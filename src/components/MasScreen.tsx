import { motion } from "motion/react";
import { ChevronRight, LockKeyhole, LogOut, ShieldAlert, Sparkles, type LucideIcon } from "lucide-react";
import type { Screen } from "../types";
import type { AdminPlanCode } from "../lib/superadmin-types";
import { canAccessScreen, requiredPlanForScreen } from "../lib/plan-entitlements";
import { haptics } from "../lib/haptics";
import { getNavItem, type NavItem } from "../features/app-shell/nav";
import { PwaInstallCard } from "../features/pwa/pwa-install-card";

interface MasScreenProps {
  onScreenChange: (screen: Screen) => void;
  totalBalance: number;
  currency: string;
  isSuperAdmin: boolean;
  planCode: AdminPlanCode;
  fullAccess: boolean;
}

type MenuSection = {
  title: string;
  subtitle: string;
  items: Screen[];
};

const MENU_SECTIONS: MenuSection[] = [
  {
    title: "Planifica",
    subtitle: "Anticipa decisiones y compromisos",
    items: ["planeacion_mes", "calendario", "planeacion_proyeccion"],
  },
  {
    title: "Organiza",
    subtitle: "Administra lo que se repite y se mueve",
    items: ["obligaciones", "suscripciones", "transferir", "negocios"],
  },
  {
    title: "Revisa",
    subtitle: "Entiende tu historia financiera",
    items: ["dashboard", "movimientos"],
  },
  {
    title: "Tu Arca",
    subtitle: "Personaliza y protege tu espacio",
    items: ["configuracion"],
  },
];

function money(value: number, currency: string) {
  const safeCurrency = /^[A-Z]{3}$/.test(currency) ? currency : "COP";
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: safeCurrency,
    maximumFractionDigits: 0,
  }).format(value);
}

function resolveItems(ids: Screen[]) {
  return ids.map((id) => getNavItem(id)).filter((item): item is NavItem => Boolean(item));
}

export default function MasScreen({ onScreenChange, totalBalance, currency, isSuperAdmin, planCode, fullAccess }: MasScreenProps) {
  const handleMenuClick = (screen: Screen) => {
    haptics.medium();
    onScreenChange(screen);
  };

  return (
    <div className="relative space-y-6 pb-5">
      <header>
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-arca-accent">Tu espacio</p>
        <h1 className="mt-1 text-3xl font-black tracking-[-0.045em] text-arca-text-primary">Más herramientas</h1>
        <p className="mt-2 text-xs leading-5 text-arca-text-secondary">Planifica, organiza y revisa tus finanzas desde un solo lugar.</p>
      </header>

      <section className="relative overflow-hidden rounded-[26px] border border-arca-border-strong bg-arca-surface-1 p-5">
        <div className="absolute -right-12 -top-16 h-36 w-36 rounded-full bg-arca-accent/[0.08] blur-3xl" />
        <div className="relative flex items-end justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-arca-accent">
              <Sparkles size={14} />
              <p className="text-[9px] font-black uppercase tracking-[0.16em]">Vista rápida</p>
            </div>
            <p className="mt-3 text-xs font-semibold text-arca-text-secondary">Balance total visible</p>
            <p className="mt-1 text-2xl font-black tracking-[-0.04em] text-arca-text-primary">{money(totalBalance, currency)}</p>
          </div>
          <span className="rounded-full border border-arca-border bg-arca-surface-2 px-3 py-1.5 text-[9px] font-black uppercase tracking-wider text-arca-text-dim">{currency}</span>
        </div>
      </section>

      {MENU_SECTIONS.map((section) => (
        <section key={section.title}>
          <div className="mb-3 px-1">
            <h2 className="text-[10px] font-black uppercase tracking-[0.18em] text-arca-text-primary">{section.title}</h2>
            <p className="mt-1 text-[10px] text-arca-text-dim">{section.subtitle}</p>
          </div>
          <div className="overflow-hidden rounded-[22px] border border-arca-border bg-arca-surface-1 divide-y divide-arca-border light:divide-arca-light-border">
            {resolveItems(section.items).map((item) => {
              const locked = !canAccessScreen(item.id, planCode, fullAccess);
              const requiredPlan = requiredPlanForScreen(item.id);
              const lockedLabel = requiredPlan === "business" ? "Requiere Arca Negocios" : "Requiere Arca Personal";
              return <MenuRow key={item.id} icon={item.icon} label={item.label} description={locked ? lockedLabel : undefined} locked={locked} onClick={() => handleMenuClick(item.id)} />;
            })}
          </div>
        </section>
      ))}

      {isSuperAdmin ? (
        <section>
          <div className="mb-3 px-1">
            <h2 className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.18em] text-arca-accent"><ShieldAlert size={13} /> Administración</h2>
            <p className="mt-1 text-[10px] text-arca-text-dim">Acceso exclusivo del propietario de Arca</p>
          </div>
          <div className="overflow-hidden rounded-[22px] border border-arca-accent/25 bg-arca-accent/[0.04]">
            <MenuRow icon={ShieldAlert} label="Panel de Arca" description="Clientes, uso de Nova y operación" onClick={() => handleMenuClick("superadmin")} />
          </div>
        </section>
      ) : null}

      <div className="overflow-hidden rounded-[22px] border border-arca-border bg-arca-surface-1">
        <MenuRow icon={LogOut} label="Cerrar sesión" highlight="danger" showChevron={false} onClick={() => window.location.assign("/auth/sign-out")} />
      </div>

      <PwaInstallCard />
    </div>
  );
}

function MenuRow({ icon: Icon, label, description, highlight = "default", showChevron = true, locked = false, onClick }: { icon: LucideIcon; label: string; description?: string; highlight?: "default" | "danger"; showChevron?: boolean; locked?: boolean; onClick: () => void }) {
  const danger = highlight === "danger";
  return (
    <motion.button type="button" whileTap={{ scale: 0.985 }} onClick={onClick} className="flex w-full items-center justify-between px-5 py-4 text-left transition-colors hover:bg-arca-surface-2/70">
      <span className="flex items-center gap-4">
        <span className={`flex h-9 w-9 items-center justify-center rounded-xl ${danger ? "bg-arca-alert/10 text-arca-alert" : "bg-arca-accent/[0.08] text-arca-accent"}`}><Icon size={18} /></span>
        <span><span className={`block text-sm font-bold ${danger ? "text-arca-alert" : "text-arca-text-primary"}`}>{label}</span>{description ? <span className="mt-0.5 block text-[9px] text-arca-text-dim">{description}</span> : null}</span>
      </span>
      {locked ? <span className="flex h-8 w-8 items-center justify-center rounded-full border border-arca-accent/20 bg-arca-accent/[0.06] text-arca-accent"><LockKeyhole size={14} /></span> : showChevron ? <ChevronRight size={17} className="text-arca-text-dim" /> : null}
    </motion.button>
  );
}
