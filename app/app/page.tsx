import App from "@/src/App";
import { redirect } from "next/navigation";
import { requireWorkspaceContext } from "@/src/lib/auth";
import { loadBusinessViewModel } from "@/src/lib/business-data";
import { loadCalendarViewModel } from "@/src/lib/calendar-data";
import { loadHistoryViewModel } from "@/src/lib/history-data";
import { loadMoneyViewModel } from "@/src/lib/money-data";
import { loadMonthViewModel } from "@/src/lib/month-data";
import { loadObligationsViewModel } from "@/src/lib/obligations-data";
import { loadProjectionViewModel } from "@/src/lib/projection-data";
import { loadRegisterViewModel } from "@/src/lib/register-data";
import { loadTodayViewModel } from "@/src/lib/today-data";
import { loadSubscriptionsViewModel } from "@/src/lib/subscriptions-data";
import { loadAnalyticsViewModel } from "@/src/lib/analytics-data";
import { loadSuperAdminViewModel } from "@/src/lib/superadmin-data";
import { loadBillingNotice, loadBillingPlans, loadNovaAllowance } from "@/src/lib/billing-data";

export default async function AuthenticatedAppPage() {
  const context = await requireWorkspaceContext();
  if (context.workspace.status === "paused" && !context.profile.isSuperAdmin) redirect("/account-paused");
  const [
    initialTodayData,
    initialMoneyData,
    initialObligationsData,
    initialMonthData,
    initialProjectionData,
    initialCalendarData,
    initialBusinessData,
    initialHistoryData,
    initialRegisterData,
    initialSubscriptionsData,
    initialAnalyticsData,
    initialBillingPlans,
    initialBillingNotice,
  ] = await Promise.all([
    loadTodayViewModel(context),
    loadMoneyViewModel(context),
    loadObligationsViewModel(context),
    loadMonthViewModel(context),
    loadProjectionViewModel(context),
    loadCalendarViewModel(context),
    loadBusinessViewModel(context),
    loadHistoryViewModel(context),
    loadRegisterViewModel(context),
    loadSubscriptionsViewModel(context),
    loadAnalyticsViewModel(context),
    loadBillingPlans(),
    loadBillingNotice(context),
  ]);

  const trialEndsAt = context.subscription?.trialEndsAt;
  const initialSuperAdminData = context.profile.isSuperAdmin ? await loadSuperAdminViewModel() : null;
  const trialDaysRemaining = trialEndsAt
    ? Math.max(0, Math.ceil((new Date(trialEndsAt).getTime() - Date.now()) / (24 * 60 * 60 * 1000)))
    : undefined;
  const planLabel = context.subscription?.planCode === "business"
    ? "Arca Negocios"
    : context.subscription?.planCode === "personal_pro"
      ? context.subscription.status === "trialing"
        ? "Prueba Arca Personal"
        : "Arca Personal"
      : "Arca Gratis";
  const vipExpiresAt = typeof context.subscription?.metadata?.vip_expires_at === "string"
    ? new Date(context.subscription.metadata.vip_expires_at).getTime()
    : null;
  const hasVipAccess = Boolean(context.subscription?.metadata?.vip_full_access)
    && (!vipExpiresAt || vipExpiresAt > Date.now());
  const canUseNova = true;
  const novaAllowance = await loadNovaAllowance(context, initialBillingPlans);

  return (
    <App
      currencyCode={context.workspace.currencyCode?.trim().toUpperCase() || "COP"}
      initialTodayData={initialTodayData}
      initialMoneyData={initialMoneyData}
      initialObligationsData={initialObligationsData}
      initialMonthData={initialMonthData}
      initialProjectionData={initialProjectionData}
      initialCalendarData={initialCalendarData}
      initialBusinessData={initialBusinessData}
      initialHistoryData={initialHistoryData}
      initialRegisterData={initialRegisterData}
      initialSubscriptionsData={initialSubscriptionsData}
      initialAnalyticsData={initialAnalyticsData}
      initialSuperAdminData={initialSuperAdminData}
      initialBillingPlans={initialBillingPlans}
      initialBillingNotice={initialBillingNotice}
      initialOnboardingRequired={initialRegisterData.accounts.length === 0}
      userSummary={{
        fullName: context.profile.fullName || context.profile.email?.split("@")[0] || "Usuario de Arca",
        email: context.profile.email || "",
        planLabel,
        planCode: context.subscription?.planCode ?? "free",
        trialDaysRemaining,
        isSuperAdmin: context.profile.isSuperAdmin,
        hasVipAccess,
        canUseNova,
        novaMonthlyLimit: novaAllowance.monthlyLimit,
        novaUsed: novaAllowance.used,
      }}
    />
  );
}
