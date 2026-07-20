'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'motion/react';
import {
  ArrowLeft,
  BadgeDollarSign,
  Bot,
  CalendarClock,
  CheckCircle2,
  ChevronRight,
  CircleAlert,
  Clock3,
  Crown,
  Search,
  ReceiptText,
  Settings2,
  ShieldCheck,
  Sparkles,
  UserRound,
  UsersRound,
  X,
} from 'lucide-react';
import { ConfirmDialog } from './ui-kit';
import {
  adminChangePlan,
  adminSetSubscriptionStatus,
  adminSetVipAccess,
  adminSetWorkspaceStatus,
  adminUpdateBillingPlan,
  adminConfirmSubscriptionPayment,
  adminRejectSubscriptionPayment,
} from '@/app/superadmin-actions';
import type { AdminPlanCode, AdminSubscriptionInvoice, AdminSubscriptionStatus, SuperAdminClient, SuperAdminViewModel } from '@/src/lib/superadmin-types';
import type { BillingPlan } from '@/src/lib/billing';
import { useLoader } from '@/src/lib/loader-context';

type AdminTab = 'resumen' | 'clientes' | 'cobros' | 'planes' | 'ia';

const PLAN_LABELS: Record<AdminPlanCode, string> = {
  free: 'Arca Gratis',
  personal_pro: 'Arca Personal',
  business: 'Arca Negocios',
};

const STATUS_LABELS: Record<AdminSubscriptionStatus, string> = {
  trialing: 'Prueba',
  active: 'Activo',
  past_due: 'Pago pendiente',
  canceled: 'Cancelado',
  paused: 'Pausado',
};

function formatCompact(value: number) {
  return new Intl.NumberFormat('es-CO', { notation: value >= 10000 ? 'compact' : 'standard', maximumFractionDigits: 1 }).format(value);
}

function formatCop(value: number) {
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(value);
}

function formatDate(value: string | null) {
  if (!value) return 'Sin actividad';
  return new Intl.DateTimeFormat('es-CO', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(value));
}

function relativeActivity(value: string | null) {
  if (!value) return 'Sin actividad';
  const days = Math.floor((Date.now() - new Date(value).getTime()) / (24 * 60 * 60 * 1000));
  if (days <= 0) return 'Hoy';
  if (days === 1) return 'Ayer';
  return `Hace ${days} días`;
}

export default function SuperAdminScreen({ onBack, data }: { onBack: () => void; data: SuperAdminViewModel }) {
  const router = useRouter();
  const [tab, setTab] = useState<AdminTab>('resumen');
  const [search, setSearch] = useState('');
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const { showLoader, hideLoader, notify } = useLoader();
  
  const handleRun = (operation: Promise<unknown>, successMessage: string = 'Operación completada') => {
    showLoader('Procesando...');
    operation
      .then(() => {
        router.refresh();
        notify(successMessage, 'success');
      })
      .catch((error: Error) => {
        notify(error.message || 'No se pudo completar la acción.', 'error');
      })
      .finally(() => {
        hideLoader();
      });
  };

  const selectedClient = data.clients.find((client) => client.userId === selectedClientId) ?? null;
  const filteredClients = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return data.clients;
    return data.clients.filter((client) => `${client.fullName} ${client.email} ${PLAN_LABELS[client.planCode]} ${client.isSuperAdmin ? 'propietario superadmin' : ''}`.toLowerCase().includes(query));
  }, [data.clients, search]);

  return (
    <div className="space-y-5 pb-6">
      <header className="flex items-center gap-3">
        <button onClick={onBack} aria-label="Volver" className="flex h-10 w-10 items-center justify-center rounded-2xl bg-arca-surface-2 text-arca-text-dim"><ArrowLeft size={19} /></button>
        <div className="min-w-0 flex-1">
          <p className="text-[9px] font-black uppercase tracking-[0.2em] text-arca-accent">Operación interna</p>
          <h1 className="truncate text-xl font-black text-arca-text-primary">Panel de Arca</h1>
        </div>
        <span className="rounded-full border border-arca-alert/25 bg-arca-alert/10 px-2.5 py-1 text-[8px] font-black uppercase tracking-wider text-arca-alert">Solo tú</span>
      </header>

      {!data.telemetryReady && (
        <div className="flex gap-3 rounded-2xl border border-arca-accent/25 bg-arca-accent/[0.06] p-4">
          <CircleAlert size={17} className="mt-0.5 shrink-0 text-arca-accent" />
          <div><p className="text-xs font-bold text-arca-text-primary">Telemetría preparada</p><p className="mt-1 text-[10px] leading-relaxed text-arca-text-dim">Aplica la migración de analítica para empezar a medir sesiones, tiempo activo y consumo de Nova.</p></div>
        </div>
      )}
      {!data.billingReady && <div className="flex gap-3 rounded-2xl border border-arca-alert/25 bg-arca-alert/[0.06] p-4"><ReceiptText size={17} className="mt-0.5 shrink-0 text-arca-alert" /><div><p className="text-xs font-bold text-arca-text-primary">Cobros pendientes de activar</p><p className="mt-1 text-[10px] leading-relaxed text-arca-text-dim">Aplica la migración arca-subscription-billing.sql para registrar comprobantes, pagos y renovaciones.</p></div></div>}

      <nav className="flex overflow-x-auto rounded-2xl border border-arca-border bg-arca-surface-1 p-1">
        {([['resumen', 'Resumen'], ['clientes', 'Clientes'], ['cobros', 'Cobros'], ['planes', 'Planes'], ['ia', 'Uso IA']] as const).map(([value, label]) => (
          <button key={value} onClick={() => setTab(value)} className={`min-w-[74px] flex-1 rounded-xl px-2 py-2.5 text-[10px] font-black transition-colors ${tab === value ? 'bg-arca-accent text-black' : 'text-arca-text-dim'}`}>{label}</button>
        ))}
      </nav>

      {tab === 'resumen' && <OverviewTab data={data} onOpenClients={() => setTab('clientes')} />}
      {tab === 'clientes' && <ClientsTab clients={filteredClients} search={search} onSearch={setSearch} onSelect={(client) => setSelectedClientId(client.userId)} />}
      {tab === 'cobros' && <BillingTab invoices={data.invoices} pending={false} onRun={(operation) => handleRun(operation, 'Cobro procesado correctamente')} />}
      {tab === 'planes' && <PlansTab plans={data.plans} clients={data.clients} pending={false} onRun={(operation) => handleRun(operation, 'Plan actualizado correctamente')} />}
      {tab === 'ia' && <AiUsageTab data={data} onSelect={(client) => setSelectedClientId(client.userId)} />}

      <AnimatePresence>
        {selectedClient && (
          <ClientAdminSheet
            key={selectedClient.userId}
            client={selectedClient}
            pending={false}
            onClose={() => setSelectedClientId(null)}
            onRun={(operation, msg) => handleRun(operation, msg || 'Cliente actualizado correctamente')}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function OverviewTab({ data, onOpenClients }: { data: SuperAdminViewModel; onOpenClients: () => void }) {
  const maxGrowth = Math.max(1, ...data.growth.flatMap((week) => [week.newClients, week.activeClients]));
  return (
    <div className="space-y-5">
      <section className="grid grid-cols-2 gap-3">
        <MetricCard icon={BadgeDollarSign} label="MRR activo" value={formatCop(data.summary.monthlyRecurringRevenue)} helper={`${data.summary.payingClients} clientes de pago`} tone="positive" />
        <MetricCard icon={Settings2} label="Ingreso promedio" value={formatCop(data.summary.averageRevenuePerPayingClient)} helper={`${formatCop(data.summary.annualRunRate)} ARR`} tone="accent" />
        <MetricCard icon={CheckCircle2} label="Cobrado este mes" value={formatCop(data.summary.collectedThisMonth)} helper="Pagos confirmados" tone="positive" />
        <MetricCard icon={ReceiptText} label="Por cobrar" value={formatCop(data.summary.pendingRevenue)} helper={`${data.summary.overdueInvoices} vencidos`} tone={data.summary.overdueInvoices ? 'alert' : 'neutral'} />
        <MetricCard icon={UsersRound} label="Usuarios" value={data.summary.totalClients} helper={`${data.summary.newClients30d} nuevos este mes`} tone="accent" />
        <MetricCard icon={ShieldCheck} label="Activos 7 días" value={data.summary.activeClients7d} helper={`${data.summary.recurringClients30d} recurrentes`} tone="positive" />
        <MetricCard icon={CalendarClock} label="En prueba" value={data.summary.trialingClients} helper={`${data.summary.pastDueClients} pagos pendientes`} tone="neutral" />
        <MetricCard icon={Bot} label="Consultas Nova" value={data.summary.aiRequests30d} helper={`${formatCompact(data.summary.aiTokens30d)} tokens`} tone="accent" />
      </section>

      <section className="rounded-3xl border border-arca-border bg-arca-surface-1 p-4">
        <div className="flex items-start justify-between"><div><p className="text-[9px] font-black uppercase tracking-[0.18em] text-arca-text-dim">Últimas 6 semanas</p><h2 className="mt-1 text-sm font-bold text-arca-text-primary">Crecimiento y actividad</h2></div><div className="text-right text-[8px] text-arca-text-dim"><span className="text-arca-accent">●</span> Nuevos &nbsp; <span className="text-arca-success">●</span> Activos</div></div>
        <div className="mt-5 flex h-28 items-end gap-3 border-b border-arca-border pb-2">
          {data.growth.map((week) => (
            <div key={week.label} className="flex flex-1 flex-col items-center gap-1">
              <div className="flex h-20 items-end gap-1">
                <div className="w-2 rounded-t bg-arca-accent" style={{ height: `${Math.max(4, (week.newClients / maxGrowth) * 80)}px` }} />
                <div className="w-2 rounded-t bg-arca-success" style={{ height: `${Math.max(4, (week.activeClients / maxGrowth) * 80)}px` }} />
              </div>
              <span className="text-[7px] text-arca-text-dim">{week.label}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-3xl border border-arca-border bg-arca-surface-1 p-4">
        <p className="text-[9px] font-black uppercase tracking-[0.18em] text-arca-text-dim">Requiere atención</p>
        <div className="mt-3 divide-y divide-arca-border">
          <AttentionRow tone="alert" label="Pagos pendientes" value={data.summary.pastDueClients} />
          <AttentionRow tone="accent" label="Usuarios VIP" value={data.summary.vipClients} />
          <AttentionRow tone="neutral" label="Errores de Nova este mes" value={data.summary.aiErrors30d} />
        </div>
        <button onClick={onOpenClients} className="mt-3 flex w-full items-center justify-center gap-1 rounded-xl bg-arca-surface-2 py-3 text-[10px] font-black uppercase tracking-wider text-arca-accent">Gestionar clientes <ChevronRight size={14} /></button>
      </section>
    </div>
  );
}

function BillingTab({ invoices, pending, onRun }: { invoices: AdminSubscriptionInvoice[]; pending: boolean; onRun: (operation: Promise<unknown>) => void }) {
  const openInvoices = invoices.filter((invoice) => invoice.status === 'pending' || invoice.status === 'overdue');
  const paidInvoices = invoices.filter((invoice) => invoice.status === 'paid').slice(0, 8);
  return (
    <div className="space-y-5">
      <section><p className="px-1 text-[9px] font-black uppercase tracking-[0.18em] text-arca-text-dim">Por validar · {openInvoices.length}</p><div className="mt-2 overflow-hidden rounded-3xl border border-arca-border bg-arca-surface-1 divide-y divide-arca-border">{openInvoices.length ? openInvoices.map((invoice) => <InvoiceRow key={invoice.id} invoice={invoice} pending={pending} onRun={onRun} />) : <p className="p-8 text-center text-xs text-arca-text-dim">No hay comprobantes pendientes.</p>}</div></section>
      <section><p className="px-1 text-[9px] font-black uppercase tracking-[0.18em] text-arca-text-dim">Pagos confirmados</p><div className="mt-2 overflow-hidden rounded-3xl border border-arca-border bg-arca-surface-1 divide-y divide-arca-border">{paidInvoices.length ? paidInvoices.map((invoice) => <InvoiceRow key={invoice.id} invoice={invoice} pending={pending} onRun={onRun} />) : <p className="p-8 text-center text-xs text-arca-text-dim">Todavía no hay pagos confirmados.</p>}</div></section>
    </div>
  );
}

function InvoiceRow({ invoice, pending, onRun }: { invoice: AdminSubscriptionInvoice; pending: boolean; onRun: (operation: Promise<unknown>) => void }) {
  const isOpen = invoice.status === 'pending' || invoice.status === 'overdue';
  const confirmPayment = () => {
    if (!window.confirm(`¿Confirmar el pago de ${formatCop(invoice.amountCop)} de ${invoice.clientName}?`)) return;
    const reference = window.prompt('Referencia del comprobante (opcional)') ?? '';
    onRun(adminConfirmSubscriptionPayment({ invoiceId: invoice.id, reference }));
  };
  const rejectPayment = () => {
    const note = window.prompt('Motivo del rechazo') ?? '';
    if (!note.trim()) return;
    onRun(adminRejectSubscriptionPayment({ invoiceId: invoice.id, note }));
  };
  return <div className="p-4"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="truncate text-sm font-bold text-arca-text-primary">{invoice.clientName}</p><p className="mt-0.5 truncate text-[9px] text-arca-text-dim">{invoice.clientEmail} · {PLAN_LABELS[invoice.planCode]}</p><p className="mt-1 text-[8px] font-bold uppercase tracking-wider text-arca-text-dim">Solicitud {invoice.id.slice(0, 8)} · {formatDate(invoice.createdAt)}</p></div><div className="shrink-0 text-right"><p className="text-sm font-black text-arca-text-primary">{formatCop(invoice.amountCop)}</p><p className={`text-[8px] font-black uppercase ${invoice.status === 'paid' ? 'text-arca-success' : 'text-arca-accent'}`}>{invoice.status === 'paid' ? 'Confirmado' : 'Por validar'}</p></div></div>{isOpen ? <div className="mt-3 grid grid-cols-2 gap-2"><button disabled={pending} onClick={rejectPayment} className="rounded-xl border border-arca-alert/25 py-2.5 text-[9px] font-black uppercase text-arca-alert disabled:opacity-40">Rechazar</button><button disabled={pending} onClick={confirmPayment} className="rounded-xl bg-arca-accent py-2.5 text-[9px] font-black uppercase text-black disabled:opacity-40">Confirmar pago</button></div> : null}</div>;
}

function PlansTab({ plans, clients, pending, onRun }: { plans: BillingPlan[]; clients: SuperAdminClient[]; pending: boolean; onRun: (operation: Promise<unknown>) => void }) {
  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-arca-accent/25 bg-arca-accent/[0.06] p-4">
        <p className="text-xs font-bold text-arca-text-primary">Catálogo comercial</p>
        <p className="mt-1 text-[10px] leading-relaxed text-arca-text-dim">Los cambios de precio afectan el MRR calculado y lo que verán los usuarios. No generan cobros retroactivos.</p>
      </div>
      {plans.map((plan) => (
        <PlanAdminCard
          key={plan.code}
          plan={plan}
          clients={clients.filter((client) => client.planCode === plan.code).length}
          pending={pending}
          onRun={onRun}
        />
      ))}
    </div>
  );
}

function PlanAdminCard({ plan, clients, pending, onRun }: { plan: BillingPlan; clients: number; pending: boolean; onRun: (operation: Promise<unknown>) => void }) {
  const [price, setPrice] = useState(String(plan.monthlyPriceCop));
  const [aiLimit, setAiLimit] = useState(String(plan.aiMonthlyLimit));
  const [active, setActive] = useState(plan.active);
  const parsedPrice = Number(price);
  const parsedAiLimit = Number(aiLimit);
  const changed = parsedPrice !== plan.monthlyPriceCop || parsedAiLimit !== plan.aiMonthlyLimit || active !== plan.active;

  return (
    <section className={`rounded-3xl border p-4 ${plan.code === 'personal_pro' ? 'border-arca-accent/40 bg-arca-accent/[0.05]' : 'border-arca-border bg-arca-surface-1'}`}>
      <div className="flex items-start justify-between gap-3">
        <div><p className="text-sm font-black text-arca-text-primary">{plan.name}</p><p className="mt-1 text-[9px] text-arca-text-dim">{clients} usuarios asignados · {plan.description}</p></div>
        <button type="button" disabled={plan.code === 'free'} onClick={() => setActive((value) => !value)} className={`rounded-full px-2.5 py-1 text-[8px] font-black uppercase tracking-wider ${active ? 'bg-arca-success/10 text-arca-success' : 'bg-arca-alert/10 text-arca-alert'} disabled:opacity-60`}>{active ? 'Activo' : 'Oculto'}</button>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3">
        <label><span className="text-[8px] font-black uppercase tracking-wider text-arca-text-dim">Precio mensual</span><input value={price} onChange={(event) => setPrice(event.target.value.replace(/\D/g, ''))} inputMode="numeric" className="mt-1.5 w-full rounded-xl border border-arca-border bg-arca-surface-2 px-3 py-3 text-sm font-black text-arca-text-primary outline-none focus:border-arca-accent" /></label>
        <label><span className="text-[8px] font-black uppercase tracking-wider text-arca-text-dim">Acciones Nova</span><input value={aiLimit} onChange={(event) => setAiLimit(event.target.value.replace(/\D/g, ''))} inputMode="numeric" className="mt-1.5 w-full rounded-xl border border-arca-border bg-arca-surface-2 px-3 py-3 text-sm font-black text-arca-text-primary outline-none focus:border-arca-accent" /></label>
      </div>
      <div className="mt-3 flex flex-wrap gap-1.5">{plan.features.map((feature) => <span key={feature} className="rounded-full bg-arca-surface-2 px-2 py-1 text-[8px] text-arca-text-secondary">{feature}</span>)}</div>
      <button type="button" disabled={pending || !changed || !Number.isInteger(parsedPrice) || !Number.isInteger(parsedAiLimit)} onClick={() => onRun(adminUpdateBillingPlan({ planCode: plan.code, monthlyPriceCop: parsedPrice, aiMonthlyLimit: parsedAiLimit, active }))} className="mt-4 w-full rounded-xl bg-arca-accent py-3 text-[10px] font-black uppercase tracking-wider text-black disabled:opacity-40">Guardar configuración</button>
    </section>
  );
}

function ClientsTab({ clients, search, onSearch, onSelect }: { clients: SuperAdminClient[]; search: string; onSearch: (value: string) => void; onSelect: (client: SuperAdminClient) => void }) {
  return (
    <div className="space-y-3">
      <label className="flex items-center gap-2 rounded-2xl border border-arca-border bg-arca-surface-1 px-4 py-3"><Search size={16} className="text-arca-text-dim" /><input value={search} onChange={(event) => onSearch(event.target.value)} className="min-w-0 flex-1 bg-transparent text-sm text-arca-text-primary outline-none" placeholder="Buscar cliente, correo o plan…" /></label>
      <div className="overflow-hidden rounded-3xl border border-arca-border bg-arca-surface-1 divide-y divide-arca-border">
        {clients.length ? clients.map((client) => <ClientRow key={client.userId} client={client} onClick={() => onSelect(client)} />) : <p className="p-8 text-center text-sm text-arca-text-dim">No encontramos clientes.</p>}
      </div>
    </div>
  );
}

function AiUsageTab({ data, onSelect }: { data: SuperAdminViewModel; onSelect: (client: SuperAdminClient) => void }) {
  const topClients = [...data.clients].sort((left, right) => right.aiRequests - left.aiRequests).slice(0, 6);
  return (
    <div className="space-y-4">
      <section className="grid grid-cols-2 gap-3">
        <MetricCard icon={Sparkles} label="Solicitudes" value={data.summary.aiRequests30d} helper="Últimos 30 días" tone="accent" />
        <MetricCard icon={Bot} label="Tokens" value={formatCompact(data.summary.aiTokens30d)} helper="Costo pendiente" tone="neutral" />
        <MetricCard icon={CircleAlert} label="Errores" value={data.summary.aiErrors30d} helper="Solicitudes fallidas" tone="alert" />
        <MetricCard icon={Clock3} label="Tiempo en Arca" value={`${formatCompact(data.summary.activeMinutes30d)}m`} helper="Actividad medida" tone="positive" />
      </section>
      <section className="rounded-3xl border border-arca-border bg-arca-surface-1 p-4">
        <p className="text-[9px] font-black uppercase tracking-[0.18em] text-arca-text-dim">Mayor uso de Nova</p>
        <div className="mt-3 divide-y divide-arca-border">
          {topClients.map((client) => <button key={client.userId} onClick={() => onSelect(client)} className="flex w-full items-center justify-between py-3 text-left"><div className="min-w-0"><p className="truncate text-xs font-bold text-arca-text-primary">{client.fullName}</p><p className="text-[9px] text-arca-text-dim">{PLAN_LABELS[client.planCode]}</p></div><span className="text-sm font-black text-arca-accent">{client.aiRequests}</span></button>)}
          {!topClients.length && <p className="py-5 text-center text-xs text-arca-text-dim">Aún no hay consumo registrado.</p>}
        </div>
      </section>
      <p className="px-2 text-center text-[9px] leading-relaxed text-arca-text-dim">Arca registra consumo y rendimiento, nunca el contenido financiero de las conversaciones.</p>
    </div>
  );
}

function ClientRow({ client, onClick }: { client: SuperAdminClient; onClick: () => void }) {
  return (
    <button onClick={onClick} className="flex w-full items-center gap-3 p-4 text-left transition-colors hover:bg-arca-surface-2">
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-arca-surface-2 text-sm font-black text-arca-accent">{client.fullName.split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase()}</div>
      <div className="min-w-0 flex-1"><div className="flex items-center gap-1.5"><p className="truncate text-sm font-bold text-arca-text-primary">{client.fullName}</p>{client.isSuperAdmin ? <span className="shrink-0 rounded-full bg-arca-accent/15 px-1.5 py-0.5 text-[7px] font-black uppercase text-arca-accent">Propietario</span> : client.vipFullAccess ? <Crown size={13} className="shrink-0 text-arca-accent" /> : null}</div><p className="truncate text-[9px] text-arca-text-dim">{client.email}</p><div className="mt-1 flex gap-2 text-[8px] font-bold uppercase tracking-wider"><span className="text-arca-text-secondary">{PLAN_LABELS[client.planCode]}</span><span className={client.subscriptionStatus === 'past_due' || client.subscriptionStatus === 'canceled' ? 'text-arca-alert' : 'text-arca-success'}>{STATUS_LABELS[client.subscriptionStatus]}</span></div></div>
      <div className="text-right"><p className="text-[9px] font-bold text-arca-text-secondary">{relativeActivity(client.lastActiveAt)}</p><p className="mt-1 text-[8px] text-arca-text-dim">{client.aiRequests} IA</p></div>
      <ChevronRight size={15} className="shrink-0 text-arca-text-dim" />
    </button>
  );
}

function ClientAdminSheet({ client, pending, onClose, onRun }: { client: SuperAdminClient; pending: boolean; onClose: () => void; onRun: (operation: Promise<unknown>, successMessage?: string) => void }) {
  const [plan, setPlan] = useState<AdminPlanCode>(client.planCode);
  const [vipEnabled, setVipEnabled] = useState(client.vipFullAccess);
  const [vipReason, setVipReason] = useState(client.vipReason ?? '');
  const [vipExpiresAt, setVipExpiresAt] = useState(client.vipExpiresAt?.slice(0, 10) ?? '');
  const [note, setNote] = useState('');
  
  const [confirmState, setConfirmState] = useState<{
    isOpen: boolean;
    title: string;
    description?: string;
    summaryData?: Array<{ label: string; value: React.ReactNode }>;
    onConfirm: () => void;
  }>({ isOpen: false, title: '', onConfirm: () => {} });

  const confirmStatus = (status: AdminSubscriptionStatus, question: string) => {
    setConfirmState({
      isOpen: true,
      title: 'Cambiar estado de suscripción',
      description: question,
      summaryData: [
        { label: 'Usuario', value: client.fullName },
        { label: 'Estado nuevo', value: STATUS_LABELS[status] }
      ],
      onConfirm: () => {
        setConfirmState(prev => ({ ...prev, isOpen: false }));
        onRun(adminSetSubscriptionStatus({ workspaceId: client.workspaceId, status, note }), `Suscripción de ${client.fullName} marcada como ${STATUS_LABELS[status]}`);
      }
    });
  };

  const confirmPlanChange = () => {
    setConfirmState({
      isOpen: true,
      title: 'Cambiar Plan Comercial',
      summaryData: [
        { label: 'Usuario', value: client.fullName },
        { label: 'Plan Actual', value: PLAN_LABELS[client.planCode] },
        { label: 'Nuevo Plan', value: PLAN_LABELS[plan] }
      ],
      onConfirm: () => {
        setConfirmState(prev => ({ ...prev, isOpen: false }));
        onRun(adminChangePlan({ workspaceId: client.workspaceId, planCode: plan, note }), `Plan de ${client.fullName} actualizado a ${PLAN_LABELS[plan]}`);
      }
    });
  };

  const confirmVipChange = () => {
    setConfirmState({
      isOpen: true,
      title: vipEnabled ? 'Otorgar Acceso VIP' : 'Revocar Acceso VIP',
      description: vipEnabled ? 'El usuario tendrá acceso total sin generar cobros.' : 'El usuario volverá a su plan y facturación normal.',
      summaryData: [
        { label: 'Usuario', value: client.fullName },
        { label: 'Estado VIP Nuevo', value: vipEnabled ? 'Activo' : 'Revocado' },
        ...(vipEnabled && vipExpiresAt ? [{ label: 'Vencimiento', value: formatDate(vipExpiresAt) }] : [])
      ],
      onConfirm: () => {
        setConfirmState(prev => ({ ...prev, isOpen: false }));
        onRun(adminSetVipAccess({ workspaceId: client.workspaceId, enabled: vipEnabled, reason: vipReason, expiresAt: vipExpiresAt || null }), vipEnabled ? `Acceso VIP otorgado a ${client.fullName}` : `Acceso VIP revocado a ${client.fullName}`);
      }
    });
  };

  return (
    <motion.div className="fixed inset-0 z-[600] flex items-end bg-black/65 backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
      <motion.section role="dialog" aria-modal="true" aria-label={`Administrar a ${client.fullName}`} initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', stiffness: 320, damping: 32 }} onClick={(event) => event.stopPropagation()} className="max-h-[90dvh] w-full overflow-y-auto rounded-t-[30px] border border-b-0 border-arca-border bg-arca-bg px-5 pb-[calc(1.5rem+env(safe-area-inset-bottom))] pt-5">
        <div className="flex items-start justify-between"><div><p className="text-[9px] font-black uppercase tracking-[0.2em] text-arca-accent">Administrar cliente</p><h2 className="mt-1 text-xl font-black text-arca-text-primary">{client.fullName}</h2><p className="mt-1 text-[10px] text-arca-text-dim">{client.email}</p></div><button onClick={onClose} aria-label="Cerrar cliente" className="flex h-10 w-10 items-center justify-center rounded-full bg-arca-surface-2 text-arca-text-dim"><X size={18} /></button></div>

        <div className="mt-5 grid grid-cols-3 gap-2"><MiniFact label="Registro" value={formatDate(client.joinedAt)} /><MiniFact label="Sesiones" value={String(client.sessionCount)} /><MiniFact label="Tiempo" value={`${client.activeMinutes}m`} /></div>

        <section className="mt-5 space-y-3 rounded-3xl border border-arca-border bg-arca-surface-1 p-4">
          <div><p className="text-[9px] font-black uppercase tracking-[0.16em] text-arca-text-dim">Plan comercial</p><select value={plan} onChange={(event) => setPlan(event.target.value as AdminPlanCode)} className="mt-2 w-full rounded-xl border border-arca-border bg-arca-surface-2 px-3 py-3 text-sm font-bold text-arca-text-primary outline-none"><option value="free">Arca Gratis</option><option value="personal_pro">Personal Pro</option><option value="business">Arca Business</option></select></div>
          <button disabled={pending || plan === client.planCode} onClick={confirmPlanChange} className="w-full rounded-xl bg-arca-accent py-3 text-xs font-black text-black disabled:opacity-40">Guardar cambio de plan</button>
        </section>

        <section className="mt-3 space-y-3 rounded-3xl border border-arca-accent/25 bg-arca-accent/[0.05] p-4">
          <button onClick={() => setVipEnabled((current) => !current)} role="switch" aria-checked={vipEnabled} className="flex w-full items-center justify-between text-left"><div className="flex gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-arca-accent/15 text-arca-accent"><Crown size={18} /></div><div><p className="text-sm font-bold text-arca-text-primary">Acceso VIP completo</p><p className="mt-0.5 text-[9px] text-arca-text-dim">Todo el acceso sin generar cobros</p></div></div><div className={`h-6 w-11 rounded-full p-0.5 ${vipEnabled ? 'bg-arca-accent' : 'bg-arca-surface-2 ring-1 ring-arca-border'}`}><motion.div animate={{ x: vipEnabled ? 20 : 0 }} className="h-5 w-5 rounded-full bg-white" /></div></button>
          {vipEnabled && <><input value={vipReason} onChange={(event) => setVipReason(event.target.value)} className="w-full rounded-xl border border-arca-border bg-arca-surface-2 px-3 py-3 text-xs text-arca-text-primary outline-none" placeholder="Motivo de la cortesía" /><label className="block text-[9px] font-bold uppercase tracking-wider text-arca-text-dim">Vence opcionalmente<input type="date" value={vipExpiresAt} onChange={(event) => setVipExpiresAt(event.target.value)} className="mt-1.5 w-full rounded-xl border border-arca-border bg-arca-surface-2 px-3 py-3 text-xs text-arca-text-primary outline-none" /></label></>}
          <button disabled={pending || (vipEnabled && !vipReason.trim())} onClick={confirmVipChange} className="w-full rounded-xl border border-arca-accent/35 py-3 text-xs font-black text-arca-accent disabled:opacity-40">Guardar acceso VIP</button>
        </section>

        <section className="mt-3 space-y-3 rounded-3xl border border-arca-border bg-arca-surface-1 p-4">
          <label className="block text-[9px] font-black uppercase tracking-[0.16em] text-arca-text-dim">Nota administrativa<input value={note} onChange={(event) => setNote(event.target.value)} className="mt-2 w-full rounded-xl border border-arca-border bg-arca-surface-2 px-3 py-3 text-xs normal-case tracking-normal text-arca-text-primary outline-none" placeholder="Motivo del cambio o seguimiento…" /></label>
          <div className="grid grid-cols-2 gap-2">
            <button disabled={pending} onClick={() => confirmStatus('past_due', '¿Marcar esta suscripción con pago pendiente?')} className="rounded-xl border border-arca-alert/25 bg-arca-alert/[0.06] py-3 text-[10px] font-black text-arca-alert">Pago pendiente</button>
            <button disabled={pending} onClick={() => confirmStatus('canceled', '¿Cancelar el plan? Sus datos se conservarán y su acceso volverá al nivel gratuito.')} className="rounded-xl border border-arca-alert/25 bg-arca-alert/[0.06] py-3 text-[10px] font-black text-arca-alert">Cancelar plan</button>
            <button disabled={pending} onClick={() => confirmStatus('active', '¿Reactivar esta suscripción?')} className="rounded-xl border border-arca-success/25 bg-arca-success/[0.06] py-3 text-[10px] font-black text-arca-success">Reactivar plan</button>
            <button disabled={pending} onClick={() => { 
              const pause = client.workspaceStatus !== 'paused'; 
              setConfirmState({
                isOpen: true,
                title: pause ? 'Suspender cuenta' : 'Reactivar cuenta',
                description: pause ? 'El usuario no podrá acceder a su información.' : 'El usuario recuperará el acceso a su cuenta.',
                summaryData: [{ label: 'Usuario', value: client.fullName }],
                onConfirm: () => {
                  setConfirmState(prev => ({ ...prev, isOpen: false }));
                  onRun(adminSetWorkspaceStatus({ workspaceId: client.workspaceId, status: pause ? 'paused' : 'active', note }), pause ? `Cuenta de ${client.fullName} suspendida` : `Cuenta de ${client.fullName} reactivada`);
                }
              });
            }} className="rounded-xl border border-arca-border bg-arca-surface-2 py-3 text-[10px] font-black text-arca-text-secondary">{client.workspaceStatus === 'paused' ? 'Activar cuenta' : 'Suspender cuenta'}</button>
          </div>
        </section>
      </motion.section>

      <ConfirmDialog
        isOpen={confirmState.isOpen}
        title={confirmState.title}
        description={confirmState.description}
        summaryData={confirmState.summaryData}
        onCancel={() => setConfirmState(prev => ({ ...prev, isOpen: false }))}
        onConfirm={confirmState.onConfirm}
      />
    </motion.div>
  );
}

function MetricCard({ icon: Icon, label, value, helper, tone }: { icon: React.ComponentType<{ size?: number; className?: string }>; label: string; value: string | number; helper: string; tone: 'accent' | 'positive' | 'alert' | 'neutral' }) {
  const toneClass = tone === 'positive' ? 'text-arca-success' : tone === 'alert' ? 'text-arca-alert' : tone === 'accent' ? 'text-arca-accent' : 'text-arca-text-secondary';
  return <div className="rounded-2xl border border-arca-border bg-arca-surface-1 p-4"><Icon size={16} className={toneClass} /><p className="mt-3 text-[8px] font-black uppercase tracking-[0.16em] text-arca-text-dim">{label}</p><p className={`mt-1 text-xl font-black ${toneClass}`}>{value}</p><p className="mt-1 text-[8px] text-arca-text-dim">{helper}</p></div>;
}

function AttentionRow({ label, value, tone }: { label: string; value: number; tone: 'alert' | 'accent' | 'neutral' }) {
  const color = tone === 'alert' ? 'text-arca-alert' : tone === 'accent' ? 'text-arca-accent' : 'text-arca-text-secondary';
  return <div className="flex items-center justify-between py-3"><span className="text-xs font-semibold text-arca-text-primary">{label}</span><span className={`text-sm font-black ${color}`}>{value}</span></div>;
}

function MiniFact({ label, value }: { label: string; value: string }) {
  return <div className="rounded-xl border border-arca-border bg-arca-surface-1 p-3"><p className="text-[7px] font-black uppercase tracking-wider text-arca-text-dim">{label}</p><p className="mt-1 truncate text-[10px] font-bold text-arca-text-primary">{value}</p></div>;
}
