import {
  BadgeDollarSign,
  Building2,
  CalendarClock,
  History,
  Landmark,
  LayoutDashboard,
  Settings,
  Shield,
  Sparkles,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type AppNavLeaf = {
  href: string;
  label: string;
  description: string;
  icon?: LucideIcon;
};

export type AppNavGroup = {
  label: string;
  description: string;
  href: string;
  icon: LucideIcon;
  children?: AppNavLeaf[];
};

export const primaryNavigation: AppNavGroup[] = [
  {
    href: "/app/hoy",
    label: "Hoy",
    description: "Caja y urgencias",
    icon: Sparkles,
  },
  {
    href: "/app/dashboard",
    label: "Dashboard",
    description: "Resumen ejecutivo",
    icon: LayoutDashboard,
  },
  {
    href: "/app/dinero/cuentas",
    label: "Dinero",
    description: "Caja y ahorro",
    icon: Landmark,
    children: [
      { href: "/app/dinero/cuentas", label: "Cuentas", description: "Caja disponible" },
      { href: "/app/dinero/tarjetas", label: "Tarjetas", description: "Cupo y pagos" },
      { href: "/app/dinero/ahorro", label: "Ahorro", description: "Metas y bolsillos" },
    ],
  },
  {
    href: "/app/obligaciones",
    label: "Obligaciones",
    description: "Pagos por resolver",
    icon: BadgeDollarSign,
  },
  {
    href: "/app/planeacion/mes",
    label: "Planeacion",
    description: "Mes y futuro",
    icon: CalendarClock,
    children: [
      { href: "/app/planeacion/mes", label: "Mes", description: "Plan del mes" },
      { href: "/app/planeacion/proyeccion", label: "Proyeccion", description: "Escenarios clave" },
    ],
  },
  {
    href: "/app/negocios",
    label: "Negocios",
    description: "Fuentes y frentes",
    icon: Building2,
  },
];

export const utilityNavigation: AppNavLeaf[] = [
  { href: "/app/historial", label: "Historial", description: "Movimientos reales", icon: History },
  { href: "/app/configuracion", label: "Configuracion", description: "Cuenta y reglas", icon: Settings },
];

export const superAdminNavigation: AppNavLeaf[] = [
  { href: "/superadmin", label: "Superadmin", description: "Gestion interna", icon: Shield },
];

export const quickActions: AppNavLeaf[] = [
  { href: "/app/registrar", label: "Registrar", description: "Nuevo movimiento" },
  { href: "/app/transferir", label: "Transferir", description: "Mover entre cuentas" },
];

export function isCurrentPath(currentPath: string, href: string) {
  return currentPath === href || currentPath.startsWith(`${href}/`);
}

export function resolveActiveGroup(currentPath: string, href: string, children?: AppNavLeaf[]) {
  if (isCurrentPath(currentPath, href)) {
    return true;
  }

  return Boolean(children?.some((child) => isCurrentPath(currentPath, child.href)));
}
