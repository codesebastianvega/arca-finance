"use client";

import { useEffect, useMemo, useState, type ComponentType, type ReactNode } from "react";
import { AlertTriangle, Bell, CalendarClock, CheckCheck, ChevronRight, CircleDollarSign, Landmark, Search, Sparkles, WalletCards, X } from "lucide-react";
import type { TodayViewModel } from "@/src/lib/today-data";
import type { ObligationFilter } from "@/src/lib/obligations-types";
import type { Screen } from "@/src/types";
import { haptics } from "@/src/lib/haptics";
import { PushNotificationSettings } from "@/src/features/pwa/push-notification-settings";

type Icon = ComponentType<{ size?: number; className?: string }>;

type AlertItem = {
  id: string;
  title: string;
  detail: string;
  tone: "danger" | "warning" | "positive";
  icon: Icon;
  action: () => void;
};

type SearchItem = {
  id: string;
  title: string;
  detail: string;
  keywords: string;
  icon: Icon;
  action: () => void;
};

const SEEN_KEY = "arca-seen-alerts-v1";

function daysUntil(rawDate: string) {
  const todayText = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Bogota", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
  const today = new Date(`${todayText}T00:00:00-05:00`);
  return Math.round((new Date(`${rawDate}T00:00:00-05:00`).getTime() - today.getTime()) / 86400000);
}

export function HomeHeaderActions({
  data,
  onNavigate,
  onOpenObligations,
  onOpenNova,
}: {
  data: TodayViewModel;
  onNavigate: (screen: Screen) => void;
  onOpenObligations: (filter?: ObligationFilter) => void;
  onOpenNova: (prompt?: string) => void;
}) {
  const [showSearch, setShowSearch] = useState(false);
  const [showAlerts, setShowAlerts] = useState(false);
  const [query, setQuery] = useState("");
  const [seenIds, setSeenIds] = useState<string[]>([]);

  useEffect(() => {
    try {
      const stored = JSON.parse(window.localStorage.getItem(SEEN_KEY) ?? "[]");
      if (Array.isArray(stored)) setSeenIds(stored.filter((value): value is string => typeof value === "string"));
    } catch {
      setSeenIds([]);
    }
  }, []);

  useEffect(() => {
    if (window.sessionStorage.getItem("arca-open-notifications") !== "1") return;
    window.sessionStorage.removeItem("arca-open-notifications");
    setShowAlerts(true);
    const url = new URL(window.location.href);
    url.searchParams.delete("open");
    window.history.replaceState({}, "", `${url.pathname}${url.search}${url.hash}`);
  }, []);

  const rememberSeen = (ids: string[]) => {
    const next = Array.from(new Set([...seenIds, ...ids])).slice(-200);
    setSeenIds(next);
    window.localStorage.setItem(SEEN_KEY, JSON.stringify(next));
  };

  const alerts = useMemo<AlertItem[]>(() => {
    const paymentAlerts: AlertItem[] = data.criticalPayments.map((payment) => ({
      id: `payment:${payment.id}:${payment.status}`,
      title: payment.status === "overdue" ? `${payment.title} está vencido` : payment.status === "today" ? `${payment.title} vence hoy` : `Próximo pago: ${payment.title}`,
      detail: `${payment.dueLabel} · ${new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(payment.amount)}`,
      tone: payment.status === "overdue" ? "danger" : "warning",
      icon: payment.status === "overdue" ? AlertTriangle : CalendarClock,
      action: () => onOpenObligations(payment.status === "overdue" ? "vencido" : payment.status === "today" ? "hoy" : "semana"),
    }));

    const receivableAlerts: AlertItem[] = data.receivables
      .filter((item) => item.status === "overdue" || item.status === "today")
      .map((item) => ({
        id: `receivable:${item.id}:${item.status}`,
        title: item.status === "overdue" ? `Cobro pendiente de ${item.debtorName}` : `Cobro esperado hoy de ${item.debtorName}`,
        detail: `${item.title} · ${new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(item.amount)}`,
        tone: item.status === "overdue" ? "danger" : "positive",
        icon: CircleDollarSign,
        action: () => onNavigate("calendario"),
      }));

    const incomeAlerts: AlertItem[] = data.upcomingIncomes
      .filter((item) => daysUntil(item.dueDate) >= 0 && daysUntil(item.dueDate) <= 3)
      .map((item) => ({
        id: `income:${item.id}:${item.dueDate}`,
        title: daysUntil(item.dueDate) === 0 ? `${item.title} se espera hoy` : `Ingreso próximo: ${item.title}`,
        detail: `${item.dueLabel} · ${new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(item.amount)}`,
        tone: "positive",
        icon: CircleDollarSign,
        action: () => onNavigate("calendario"),
      }));

    return [...paymentAlerts, ...receivableAlerts, ...incomeAlerts];
  }, [data.criticalPayments, data.receivables, data.upcomingIncomes, onNavigate, onOpenObligations]);

  const searchItems = useMemo<SearchItem[]>(() => {
    const destinations: SearchItem[] = [
      { id: "movements", title: "Movimientos", detail: "Busca y revisa transacciones", keywords: "gastos ingresos transacciones historial", icon: Search, action: () => onNavigate("movimientos") },
      { id: "money", title: "Dinero y cuentas", detail: "Saldos, cuentas, tarjetas y ahorro", keywords: "saldo banco cuentas tarjetas bolsillos", icon: WalletCards, action: () => onNavigate("dinero_cuentas") },
      { id: "payments", title: "Pagos y deudas", detail: "Compromisos vencidos y próximos", keywords: "deudas pagos obligaciones vencidos", icon: CalendarClock, action: () => onOpenObligations("todo") },
      { id: "calendar", title: "Agenda", detail: "Fechas, cobros e ingresos esperados", keywords: "calendario agenda fechas cobros", icon: CalendarClock, action: () => onNavigate("calendario") },
      { id: "register", title: "Registrar", detail: "Agrega un gasto, ingreso o producto", keywords: "crear agregar movimiento gasto ingreso", icon: CircleDollarSign, action: () => onNavigate("registrar") },
      { id: "planning", title: "Plan del mes", detail: "Distribuye y controla tu presupuesto", keywords: "planeacion presupuesto categorias", icon: Landmark, action: () => onNavigate("planeacion_mes") },
      { id: "nova", title: "Preguntarle a Nova", detail: "Consulta tu situación financiera", keywords: "ia asistente consejo ayuda", icon: Sparkles, action: () => onOpenNova() },
    ];

    const accounts: SearchItem[] = data.accountOptions.map((account) => ({ id: `account:${account.id}`, title: account.label, detail: "Cuenta en Dinero", keywords: `cuenta banco ${account.label}`, icon: WalletCards, action: () => onNavigate("dinero_cuentas") }));
    const commitments: SearchItem[] = data.criticalPayments.map((payment) => ({ id: `commitment:${payment.id}`, title: payment.title, detail: payment.dueLabel, keywords: `${payment.title} pago deuda ${payment.status}`, icon: CalendarClock, action: () => onOpenObligations(payment.status === "overdue" ? "vencido" : payment.status === "today" ? "hoy" : "semana") }));
    return [...destinations, ...accounts, ...commitments];
  }, [data.accountOptions, data.criticalPayments, onNavigate, onOpenNova, onOpenObligations]);

  const normalizedQuery = query.trim().toLocaleLowerCase("es-CO");
  const visibleResults = searchItems.filter((item) => !normalizedQuery || `${item.title} ${item.detail} ${item.keywords}`.toLocaleLowerCase("es-CO").includes(normalizedQuery)).slice(0, 10);
  const unreadCount = alerts.filter((item) => !seenIds.includes(item.id)).length;

  const runAction = (action: () => void, alertId?: string) => {
    haptics.medium();
    if (alertId) rememberSeen([alertId]);
    setShowSearch(false);
    setShowAlerts(false);
    setQuery("");
    action();
  };

  return (
    <>
      <div className="flex space-x-2">
        <button type="button" onClick={() => setShowSearch(true)} aria-label="Buscar en Arca" className="flex h-10 w-10 items-center justify-center rounded-full border border-arca-border bg-arca-surface-2"><Search size={18} className="text-arca-text-secondary" /></button>
        <button type="button" onClick={() => setShowAlerts(true)} aria-label={`Notificaciones${unreadCount ? `, ${unreadCount} nuevas` : ""}`} className="relative flex h-10 w-10 items-center justify-center rounded-full border border-arca-border bg-arca-surface-2"><Bell size={18} className="text-arca-text-secondary" />{unreadCount ? <span className="absolute right-1.5 top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full border-2 border-arca-base bg-arca-alert px-0.5 text-[7px] font-black text-white">{unreadCount > 9 ? "9+" : unreadCount}</span> : null}</button>
      </div>

      {showSearch ? <Overlay title="Buscar en Arca" subtitle="Encuentra una función, cuenta o compromiso" onClose={() => { setShowSearch(false); setQuery(""); }}>
        <div className="relative"><Search className="absolute left-4 top-1/2 -translate-y-1/2 text-arca-text-dim" size={17} /><input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Ej. movimientos, Nu, pagos…" className="h-13 w-full rounded-2xl border border-arca-border bg-arca-surface-2 pl-11 pr-4 text-sm font-semibold outline-none focus:border-arca-accent" /></div>
        <div className="mt-4 overflow-hidden rounded-2xl border border-arca-border bg-arca-surface-1 divide-y divide-arca-border">{visibleResults.length ? visibleResults.map((item) => <ResultRow key={item.id} icon={item.icon} title={item.title} detail={item.detail} onClick={() => runAction(item.action)} />) : <p className="p-6 text-center text-xs text-arca-text-dim">No encontramos resultados. Prueba con otra palabra.</p>}</div>
      </Overlay> : null}

      {showAlerts ? <Overlay title="Centro de alertas" subtitle={unreadCount ? `${unreadCount} ${unreadCount === 1 ? "alerta nueva" : "alertas nuevas"}` : "Estás al día con tus alertas"} onClose={() => setShowAlerts(false)} action={unreadCount ? <button type="button" onClick={() => rememberSeen(alerts.map((item) => item.id))} className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-wider text-arca-accent"><CheckCheck size={14} /> Marcar leídas</button> : undefined}>
        <div className="space-y-2">{alerts.length ? alerts.map((item) => <AlertRow key={item.id} item={item} unread={!seenIds.includes(item.id)} onClick={() => runAction(item.action, item.id)} />) : <div className="rounded-2xl border border-arca-positive/20 bg-arca-positive/[0.06] p-6 text-center"><CheckCheck className="mx-auto text-arca-positive" size={26} /><p className="mt-3 text-sm font-black">No tienes alertas pendientes</p><p className="mt-1 text-xs text-arca-text-dim">Arca te avisará aquí cuando algo requiera atención.</p></div>}</div>
        <div className="mt-4"><PushNotificationSettings /></div>
      </Overlay> : null}
    </>
  );
}

function Overlay({ title, subtitle, action, onClose, children }: { title: string; subtitle: string; action?: ReactNode; onClose: () => void; children: ReactNode }) {
  return <div className="fixed inset-0 z-[220] flex items-end bg-black/70 backdrop-blur-sm sm:items-center sm:justify-center" role="dialog" aria-modal="true" aria-label={title}><section className="max-h-[88dvh] w-full overflow-y-auto rounded-t-[28px] border border-arca-border bg-arca-base p-5 pb-safe sm:max-w-md sm:rounded-[28px]"><header className="mb-5 flex items-start justify-between gap-3"><div><h2 className="text-xl font-black tracking-tight">{title}</h2><p className="mt-1 text-[10px] text-arca-text-dim">{subtitle}</p>{action ? <div className="mt-2">{action}</div> : null}</div><button type="button" onClick={onClose} aria-label="Cerrar" className="flex h-9 w-9 items-center justify-center rounded-full bg-arca-surface-2 text-arca-text-dim"><X size={17} /></button></header>{children}</section></div>;
}

function ResultRow({ icon: Icon, title, detail, onClick }: { icon: Icon; title: string; detail: string; onClick: () => void }) {
  return <button type="button" onClick={onClick} className="flex w-full items-center gap-3 p-4 text-left"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-arca-accent/10 text-arca-accent"><Icon size={17} /></span><span className="min-w-0 flex-1"><span className="block truncate text-sm font-black">{title}</span><span className="mt-0.5 block truncate text-[10px] text-arca-text-dim">{detail}</span></span><ChevronRight size={15} className="text-arca-text-dim" /></button>;
}

function AlertRow({ item, unread, onClick }: { item: AlertItem; unread: boolean; onClick: () => void }) {
  const Icon = item.icon;
  const tone = item.tone === "danger" ? "bg-arca-alert/10 text-arca-alert" : item.tone === "positive" ? "bg-arca-positive/10 text-arca-positive" : "bg-arca-accent/10 text-arca-accent";
  return <button type="button" onClick={onClick} className={`flex w-full items-center gap-3 rounded-2xl border p-4 text-left ${unread ? "border-arca-accent/25 bg-arca-surface-1" : "border-arca-border bg-arca-surface-1/60"}`}><span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${tone}`}><Icon size={17} /></span><span className="min-w-0 flex-1"><span className="flex items-center gap-2 text-sm font-black">{item.title}{unread ? <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-arca-alert" /> : null}</span><span className="mt-1 block text-[10px] text-arca-text-dim">{item.detail}</span></span><ChevronRight size={15} className="text-arca-text-dim" /></button>;
}
