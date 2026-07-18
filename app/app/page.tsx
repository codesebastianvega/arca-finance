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
  ]);

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
    />
  );
}
