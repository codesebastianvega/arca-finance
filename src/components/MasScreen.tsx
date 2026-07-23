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
    items: ["obligaciones", "cadenas", "suscripciones", "transferir", "negocios"],
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
    <div className="space-y-6 pb-24">
      {/* Header */}
      <div className="rounded-3xl border border-arca-border bg-arca-surface-1 p-5 shadow-sm">
        <p className="text-[9px] font-black uppercase tracking-[0.2em] text-arca-accent">Tu Resumen</p>
        <div className="mt-1 flex items-baseline justify-between">
          <h2 className="text-2xl font-black text-arca-text-primary">{money(totalBalance, currency)}</h2>
          <span className="rounded-full bg-arca-accent/15 px-3 py-1 text-[10px] font-bold text-arca-accent">
            {fullAccess ? "VIP Full Access" : planCode === "business" ? "Plan Negocios" : planCode === "personal_pro" ? "Plan Personal" : "Plan Gratuito"}
          </span>
        </div>
      </div>

      {/* Grid of Sections */}
      <div className="space-y-6">
        {MENU_SECTIONS.map((section) => {
          const items = resolveItems(section.items);
          if (items.length === 0) return null;

          return (
            <div key={section.title} className="space-y-3">
              <div>
                <h3 className="text-sm font-black text-arca-text-primary">{section.title}</h3>
                <p className="text-[10px] font-semibold text-arca-text-dim">{section.subtitle}</p>
              </div>

              <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                {items.map((item) => {
                  const Icon = item.icon as LucideIcon;
                  const isAccessible = canAccessScreen(item.id, planCode, fullAccess);
                  const requiredPlan = requiredPlanForScreen(item.id);

                  return (
                    <button
                      key={item.id}
                      onClick={() => handleMenuClick(item.id)}
                      className={`group relative flex items-center justify-between rounded-2xl border p-4 text-left transition-all ${
                        isAccessible
                          ? "border-arca-border bg-arca-surface-1 hover:border-arca-accent/40 hover:bg-arca-surface-2"
                          : "border-arca-border/50 bg-arca-surface-1/40 opacity-70"
                      }`}
                    >
                      <div className="flex items-center gap-3.5">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-arca-border bg-arca-surface-2 text-arca-accent group-hover:border-arca-accent/30 group-hover:scale-105 transition-all">
                          <Icon size={20} />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-arca-text-primary group-hover:text-arca-accent transition-colors">
                            {item.label}
                          </p>
                          {!isAccessible && (
                            <span className="mt-0.5 inline-flex items-center gap-1 text-[9px] font-bold text-amber-400">
                              <LockKeyhole size={10} /> Requiere {requiredPlan === "business" ? "Negocios" : "Personal"}
                            </span>
                          )}
                        </div>
                      </div>

                      <ChevronRight size={16} className="text-arca-text-dim group-hover:translate-x-0.5 group-hover:text-arca-accent transition-all" />
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}

        {isSuperAdmin && (
          <div className="pt-2">
            <button
              onClick={() => handleMenuClick("superadmin")}
              className="flex w-full items-center justify-between rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-left font-bold text-amber-400"
            >
              <div className="flex items-center gap-3">
                <ShieldAlert size={20} />
                <span className="text-xs">Panel SuperAdmin</span>
              </div>
              <ChevronRight size={16} />
            </button>
          </div>
        )}

        <div className="pt-2">
          <PwaInstallCard />
        </div>
      </div>
    </div>
  );
}
