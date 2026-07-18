import App from "@/src/App";
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

export default async function AuthenticatedAppPage() {
  const context = await requireWorkspaceContext();
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
  ]);

  const trialEndsAt = context.subscription?.trialEndsAt;
  const trialDaysRemaining = trialEndsAt
    ? Math.max(0, Math.ceil((new Date(trialEndsAt).getTime() - Date.now()) / (24 * 60 * 60 * 1000)))
    : undefined;
  const planLabel = context.subscription?.planCode === "business"
    ? "Business"
    : context.subscription?.planCode === "personal_pro"
      ? context.subscription.status === "trialing"
        ? "Prueba Personal Pro"
        : "Personal Pro"
      : "Plan gratuito";

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
      initialOnboardingRequired={initialRegisterData.accounts.length === 0}
      userSummary={{
        fullName: context.profile.fullName || context.profile.email?.split("@")[0] || "Usuario de Arca",
        email: context.profile.email || "",
        planLabel,
        trialDaysRemaining,
        isSuperAdmin: context.profile.isSuperAdmin,
      }}
    />
  );
}
