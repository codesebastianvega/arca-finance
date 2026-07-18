export type AdminPlanCode = 'free' | 'personal_pro' | 'business';
export type AdminSubscriptionStatus = 'trialing' | 'active' | 'past_due' | 'canceled' | 'paused';

export type SuperAdminClient = {
  userId: string;
  workspaceId: string;
  fullName: string;
  email: string;
  isSuperAdmin: boolean;
  joinedAt: string;
  lastActiveAt: string | null;
  activeMinutes: number;
  sessionCount: number;
  aiRequests: number;
  onboardingCompleted: boolean;
  workspaceStatus: string;
  planCode: AdminPlanCode;
  subscriptionStatus: AdminSubscriptionStatus;
  trialEndsAt: string | null;
  vipFullAccess: boolean;
  vipReason: string | null;
  vipExpiresAt: string | null;
};

export type AdminSubscriptionInvoice = {
  id: string;
  workspaceId: string;
  clientName: string;
  clientEmail: string;
  planCode: AdminPlanCode;
  amountCop: number;
  status: 'pending' | 'paid' | 'overdue' | 'void';
  dueAt: string;
  paidAt: string | null;
  createdAt: string;
};

export type SuperAdminViewModel = {
  generatedAt: string;
  telemetryReady: boolean;
  billingReady: boolean;
  summary: {
    totalClients: number;
    newClients30d: number;
    activeClients7d: number;
    recurringClients30d: number;
    trialingClients: number;
    vipClients: number;
    pastDueClients: number;
    aiRequests30d: number;
    aiTokens30d: number;
    aiErrors30d: number;
    activeMinutes30d: number;
    monthlyRecurringRevenue: number;
    annualRunRate: number;
    payingClients: number;
    averageRevenuePerPayingClient: number;
    collectedThisMonth: number;
    pendingRevenue: number;
    overdueInvoices: number;
  };
  clients: SuperAdminClient[];
  plans: BillingPlan[];
  invoices: AdminSubscriptionInvoice[];
  growth: Array<{ label: string; newClients: number; activeClients: number }>;
};
import type { BillingPlan } from '@/src/lib/billing';
