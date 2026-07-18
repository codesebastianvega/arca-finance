import type { AdminPlanCode } from '@/src/lib/superadmin-types';

export type BillingPlan = {
  code: AdminPlanCode;
  name: string;
  monthlyPriceCop: number;
  active: boolean;
  aiMonthlyLimit: number;
  description: string;
  features: string[];
};

export const DEFAULT_BILLING_PLANS: BillingPlan[] = [
  {
    code: 'free',
    name: 'Arca Gratis',
    monthlyPriceCop: 0,
    active: true,
    aiMonthlyLimit: 0,
    description: 'Control financiero esencial y registro manual.',
    features: ['Hasta 2 cuentas', 'Movimientos manuales', 'Agenda y presupuesto básico', 'Sin Nova'],
  },
  {
    code: 'personal_pro',
    name: 'Arca Personal',
    monthlyPriceCop: 14900,
    active: true,
    aiMonthlyLimit: 150,
    description: 'Tu dinero organizado y acompañado por Nova.',
    features: ['Cuentas ilimitadas', 'Nova y automatizaciones', 'Planeación y proyección', 'Metas y recordatorios'],
  },
  {
    code: 'business',
    name: 'Arca Negocios',
    monthlyPriceCop: 39900,
    active: true,
    aiMonthlyLimit: 500,
    description: 'Control personal y operativo para proyectos y negocios.',
    features: ['Todo Arca Personal', 'Unidades de negocio', 'Contratos, facturas y cobros', 'Métricas por proyecto y exportación'],
  },
];

export const ARCA_MANUAL_PAYMENT = {
  provider: 'Nu',
  key: '@JVH914',
  whatsappDisplay: '+57 322 228 5900',
  whatsappNumber: '573222285900',
} as const;

export function normalizeBillingPlan(row: Record<string, unknown>): BillingPlan | null {
  const code = row.code;
  if (code !== 'free' && code !== 'personal_pro' && code !== 'business') return null;
  const fallback = DEFAULT_BILLING_PLANS.find((plan) => plan.code === code)!;
  const metadata = row.metadata && typeof row.metadata === 'object' ? row.metadata as Record<string, unknown> : {};
  const storedPrice = Math.max(0, Number(row.monthly_price_cop ?? fallback.monthlyPriceCop));
  const usesLegacyPlaceholderPrice = code !== 'free' && storedPrice === 0 && !metadata.catalog_version;
  return {
    code,
    name: typeof row.name === 'string' && row.name ? row.name : fallback.name,
    monthlyPriceCop: usesLegacyPlaceholderPrice ? fallback.monthlyPriceCop : storedPrice,
    active: row.active !== false,
    aiMonthlyLimit: Math.max(0, Number(metadata.ai_monthly_limit ?? fallback.aiMonthlyLimit)),
    description: typeof metadata.description === 'string' ? metadata.description : fallback.description,
    features: Array.isArray(metadata.features) ? metadata.features.filter((feature): feature is string => typeof feature === 'string') : fallback.features,
  };
}

export function buildPaymentProofWhatsAppUrl(input: {
  fullName: string;
  email: string;
  planLabel: string;
  amountCop?: number;
  invoiceId?: string;
}) {
  const message = [
    'Hola, envío mi comprobante de pago de Arca.',
    '',
    `Nombre: ${input.fullName}`,
    `Correo: ${input.email}`,
    `Plan: ${input.planLabel}`,
    ...(input.amountCop ? [`Valor: ${new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(input.amountCop)}`] : []),
    ...(input.invoiceId ? [`Solicitud: ${input.invoiceId.slice(0, 8).toUpperCase()}`] : []),
    `Pago realizado a la llave Nu ${ARCA_MANUAL_PAYMENT.key}.`,
    '',
    'Adjunto el comprobante para validar y activar mi suscripción.',
  ].join('\n');

  return `https://wa.me/${ARCA_MANUAL_PAYMENT.whatsappNumber}?text=${encodeURIComponent(message)}`;
}
