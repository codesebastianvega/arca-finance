'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Screen } from './types';
import type { BusinessViewModel } from './lib/business-types';
import type { CalendarViewModel } from './lib/calendar-types';
import type { HistoryViewModel } from './lib/history-types';
import type { MonthViewModel } from './lib/month-types';
import type { MoneyViewModel } from './lib/money-data';
import type { ObligationsViewModel } from './lib/obligations-types';
import type { ProjectionViewModel } from './lib/projection-types';
import type { RegisterViewModel } from './lib/register-data';
import type { TodayViewModel } from './lib/today-data';
import type { SubscriptionsViewModel } from './lib/subscriptions-data';
import type { ObligationFilter } from './lib/obligations-types';
import type { AnalyticsViewModel } from './lib/analytics-types';
import type { SuperAdminViewModel } from './lib/superadmin-types';
import type { BillingPlan } from './lib/billing';
import type { BillingNotice } from './lib/billing-data';
import AppShell from './features/app-shell/app-shell';
import DecisionDashboard from './features/dashboard/components/decision-dashboard';
import NovaHome from './features/dashboard/components/nova-home';
import ExecutiveDashboard from './features/dashboard/components/executive-dashboard';
import ObligationsScreen from './features/obligations/obligations-screen';
import AccountsScreen from './features/accounts/accounts-screen';
import HistoryScreen from './features/history/history-screen';
import BusinessScreen from './features/business/business-screen';
import CalendarScreen from './features/calendar/calendar-screen';
import MonthScreen from './features/planning/month-screen';
import ProjectionScreen from './features/planning/projection-screen';
import TransferScreen from './features/transfers/transfer-screen';
import RegisterScreen from './features/register/register-screen';
import ConfiguracionScreen from './components/ConfiguracionScreen';
import SuperAdminScreen from './components/SuperAdminScreen';
import MasScreen from './components/MasScreen';
import SubscriptionsScreen from './features/more/subscriptions-screen';
import CadenasScreen from './features/cadenas/cadenas-screen';
import NewUserOnboarding from './features/onboarding/new-user-onboarding';
import PlanLockedScreen from './components/PlanLockedScreen';
import { canAccessScreen, requiredPlanForScreen } from './lib/plan-entitlements';
import { isThemeId, type ThemeId } from './lib/themes';
import { LoaderProvider } from './lib/loader-context';

export type { ThemeId } from './lib/themes';
export type AppUserSummary = {
  fullName: string;
  email: string;
  planLabel: string;
  planCode: 'free' | 'personal_pro' | 'business';
  trialDaysRemaining?: number;
  isSuperAdmin: boolean;
  hasVipAccess: boolean;
  canUseNova: boolean;
  novaMonthlyLimit: number | null;
  novaUsed: number;
};

const APP_SCREENS: Screen[] = [
  'hoy', 'resumen', 'dashboard', 'dinero_cuentas', 'dinero_tarjetas', 'dinero_ahorro',
  'obligaciones', 'calendario', 'planeacion_mes', 'planeacion_proyeccion', 'negocios',
  'movimientos', 'configuracion', 'registrar', 'transferir', 'mas', 'superadmin', 'suscripciones', 'cadenas',
];

const ARCA_SCREEN_HISTORY_KEY = 'arcaScreen';
const ARCA_SCREEN_HISTORY_DEPTH_KEY = 'arcaScreenDepth';

function isAppScreen(value: unknown): value is Screen {
  return typeof value === 'string' && APP_SCREENS.includes(value as Screen);
}

export default function App({
  currencyCode,
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
  initialSuperAdminData,
  initialBillingPlans,
  initialBillingNotice,
  initialOnboardingRequired,
  userSummary,
}: {
  currencyCode: string;
  initialTodayData: TodayViewModel;
  initialMoneyData: MoneyViewModel;
  initialObligationsData: ObligationsViewModel;
  initialMonthData: MonthViewModel;
  initialProjectionData: ProjectionViewModel;
  initialCalendarData: CalendarViewModel;
  initialBusinessData: BusinessViewModel;
  initialHistoryData: HistoryViewModel;
  initialRegisterData: RegisterViewModel;
  initialSubscriptionsData: SubscriptionsViewModel;
  initialAnalyticsData: AnalyticsViewModel;
  initialSuperAdminData: SuperAdminViewModel | null;
  initialBillingPlans: BillingPlan[];
  initialBillingNotice: BillingNotice | null;
  initialOnboardingRequired: boolean;
  userSummary: AppUserSummary;
}) {
  const [currentScreen, setCurrentScreenState] = useState<Screen>('hoy');
  const currentScreenRef = useRef<Screen>('hoy');
  const [obligationsInitialMode, setObligationsInitialMode] = useState<'gastos' | 'ingresos'>('gastos');
  const [obligationsInitialFilter, setObligationsInitialFilter] = useState<ObligationFilter>('todo');
  const [showOnboarding, setShowOnboarding] = useState(initialOnboardingRequired);
  const [registerParams, setRegisterParams] = useState<{defaultSegment?: string, defaultType?: 'gasto' | 'ingreso'}>({});
  
  const applyScreen = useCallback((screen: Screen) => {
    if (screen !== 'registrar') setRegisterParams({});
    if (screen === 'obligaciones') setObligationsInitialMode('gastos');
    if (screen === 'obligaciones') setObligationsInitialFilter('todo');
    currentScreenRef.current = screen;
    setCurrentScreenState(screen);
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, []);

  const setCurrentScreen = useCallback((screen: Screen) => {
    if (screen === currentScreenRef.current) return;
    const currentDepth = Number(window.history.state?.[ARCA_SCREEN_HISTORY_DEPTH_KEY]);
    const nextState = { ...(window.history.state ?? {}) };
    delete nextState.arcaOverlay;
    window.history.pushState(
      {
        ...nextState,
        [ARCA_SCREEN_HISTORY_KEY]: screen,
        [ARCA_SCREEN_HISTORY_DEPTH_KEY]: Number.isInteger(currentDepth) && currentDepth >= 0 ? currentDepth + 1 : 1,
      },
      '',
      window.location.href,
    );
    applyScreen(screen);
  }, [applyScreen]);

  const goBackOneScreen = useCallback((fallback: Screen) => {
    const currentDepth = Number(window.history.state?.[ARCA_SCREEN_HISTORY_DEPTH_KEY]);
    if (Number.isInteger(currentDepth) && currentDepth > 0) {
      window.history.back();
      return;
    }

    const fallbackState = { ...(window.history.state ?? {}) };
    delete fallbackState.arcaOverlay;
    window.history.replaceState(
      {
        ...fallbackState,
        [ARCA_SCREEN_HISTORY_KEY]: fallback,
        [ARCA_SCREEN_HISTORY_DEPTH_KEY]: 0,
      },
      '',
      window.location.href,
    );
    applyScreen(fallback);
  }, [applyScreen]);

  const handleSetCurrentScreen = setCurrentScreen;

  useEffect(() => {
    const historyScreen = window.history.state?.[ARCA_SCREEN_HISTORY_KEY];
    const initialScreen = isAppScreen(historyScreen) ? historyScreen : 'hoy';
    const historyDepth = Number(window.history.state?.[ARCA_SCREEN_HISTORY_DEPTH_KEY]);
    const initialState = { ...(window.history.state ?? {}) };
    delete initialState.arcaOverlay;

    window.history.replaceState(
      {
        ...initialState,
        [ARCA_SCREEN_HISTORY_KEY]: initialScreen,
        [ARCA_SCREEN_HISTORY_DEPTH_KEY]: Number.isInteger(historyDepth) && historyDepth >= 0 ? historyDepth : 0,
      },
      '',
      window.location.href,
    );
    applyScreen(initialScreen);

    const handlePopState = (event: PopStateEvent) => {
      const previousScreen = event.state?.[ARCA_SCREEN_HISTORY_KEY];
      applyScreen(isAppScreen(previousScreen) ? previousScreen : 'hoy');
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [applyScreen]);

  const [theme, setTheme] = useState<ThemeId>(() => {
    if (typeof window !== 'undefined') {
      const storedTheme = localStorage.getItem('arca-theme');
      return isThemeId(storedTheme) ? storedTheme : 'arca-dark';
    }
    return 'arca-dark';
  });

  // Apply theme attribute to <html>
  useEffect(() => {
    const root = window.document.documentElement;
    root.setAttribute('data-theme', theme);
    localStorage.setItem('arca-theme', theme);
    
    // Backward compat: keep dark/light classes for any components still using them
    if (theme === 'arca-light') {
      root.classList.add('light');
      root.classList.remove('dark');
    } else {
      root.classList.add('dark');
      root.classList.remove('light');
    }
  }, [theme]);

  useEffect(() => {
    const openNotifications = () => {
      window.sessionStorage.setItem('arca-open-notifications', '1');
      setCurrentScreen('resumen');
    };
    if (new URLSearchParams(window.location.search).get('open') === 'notifications') openNotifications();
    const handleServiceWorkerMessage = (event: MessageEvent) => {
      if (event.data?.type === 'PUSH_NAVIGATE' && String(event.data.url ?? '').includes('open=notifications')) openNotifications();
    };
    navigator.serviceWorker?.addEventListener('message', handleServiceWorkerMessage);
    return () => navigator.serviceWorker?.removeEventListener('message', handleServiceWorkerMessage);
  }, []);

  const renderScreen = () => {
    const backToMas = () => setCurrentScreen('mas');
    const backFromSettings = () => goBackOneScreen('mas');
    const openNova = (prompt?: string) => {
      window.dispatchEvent(new CustomEvent('open-nova', { detail: { prompt } }));
    };

    const fullAccess = userSummary.isSuperAdmin || userSummary.hasVipAccess;
    const requiredPlan = requiredPlanForScreen(currentScreen);
    if (requiredPlan && !canAccessScreen(currentScreen, userSummary.planCode, fullAccess)) {
      return <PlanLockedScreen requiredPlan={requiredPlan} onBack={backToMas} onViewPlans={() => setCurrentScreen('configuracion')} />;
    }
    
    switch (currentScreen) {
      case 'hoy': return <NovaHome
        data={initialTodayData}
        currency={currencyCode}
        onOpenNova={openNova}
        onOpenObligations={() => {
          setObligationsInitialMode('gastos');
          setObligationsInitialFilter('todo');
          setCurrentScreen('obligaciones');
        }}
        onOpenMovements={() => setCurrentScreen('movimientos')}
        onOpenSummary={() => setCurrentScreen('resumen')}
      />;
      case 'resumen': return <DecisionDashboard
        data={initialTodayData} 
        onOpenNova={openNova}
        onOpenMovements={() => setCurrentScreen('movimientos')} 
        onOpenTransfer={() => setCurrentScreen('transferir')}
        onOpenObligations={(filter) => {
          setObligationsInitialMode('gastos');
          setObligationsInitialFilter(filter ?? 'todo');
          setCurrentScreen('obligaciones');
        }}
        onOpenRegister={() => setCurrentScreen('registrar')}
        onOpenBusiness={() => setCurrentScreen('negocios')}
        onOpenMonthPlan={() => setCurrentScreen('planeacion_mes')}
        onNavigate={handleSetCurrentScreen}
      />;
      case 'dinero_cuentas': return <AccountsScreen defaultTab="cuentas" data={initialMoneyData} onOpenMovements={() => setCurrentScreen('movimientos')} />;
      case 'dinero_tarjetas': return <AccountsScreen defaultTab="tarjetas" data={initialMoneyData} onOpenMovements={() => setCurrentScreen('movimientos')} />;
      case 'dinero_ahorro': return <AccountsScreen defaultTab="ahorro" data={initialMoneyData} onOpenMovements={() => setCurrentScreen('movimientos')} />;
      case 'obligaciones': return <ObligationsScreen data={initialObligationsData} currency={currencyCode} onBack={backToMas} onOpenNova={openNova} initialMode={obligationsInitialMode} initialFilter={obligationsInitialFilter} />;
      case 'mas': return <MasScreen onScreenChange={handleSetCurrentScreen} totalBalance={initialTodayData.cash.totalBalance} currency={currencyCode} isSuperAdmin={userSummary.isSuperAdmin} planCode={userSummary.planCode} fullAccess={fullAccess} />;
      case 'dashboard': return <ExecutiveDashboard data={initialAnalyticsData} currency={currencyCode} onBack={backToMas} onOpenNova={openNova} onOpenMovements={() => setCurrentScreen('movimientos')} />;
      case 'planeacion_mes': return <MonthScreen onBack={backToMas} onOpenNova={openNova} data={initialMonthData} currency={currencyCode} />;
      case 'planeacion_proyeccion': return <ProjectionScreen onBack={backToMas} onOpenNova={openNova} data={initialProjectionData} currency={currencyCode} />;
      case 'negocios': return (
        <BusinessScreen
          onBack={backToMas}
          data={initialBusinessData}
          currency={currencyCode}
          onOpenNova={openNova}
          onOpenReceivables={() => {
            setObligationsInitialMode('ingresos');
            setObligationsInitialFilter('todo');
            setCurrentScreen('obligaciones');
          }}
        />
      );
      case 'movimientos': return <HistoryScreen onBack={backToMas} onOpenNova={openNova} data={initialHistoryData} currency={currencyCode} />;
      case 'configuracion': return <ConfiguracionScreen onBack={backFromSettings} theme={theme} setTheme={setTheme} data={initialRegisterData} user={userSummary} plans={initialBillingPlans} />;
      case 'calendario': return <CalendarScreen onBack={backToMas} onOpenNova={openNova} data={initialCalendarData} accounts={initialTodayData.accountOptions} currency={currencyCode} />;
      case 'transferir': return (
        <TransferScreen
          onBack={backToMas}
          onOpenMovements={() => setCurrentScreen('movimientos')}
          onOpenMoney={() => setCurrentScreen('dinero_cuentas')}
          onOpenNova={openNova}
          accounts={initialMoneyData.accounts.map(a => ({ id: a.id, name: a.name, balance: a.balance }))}
          currency={currencyCode}
        />
      );
      case 'superadmin': return userSummary.isSuperAdmin && initialSuperAdminData ? <SuperAdminScreen onBack={backToMas} data={initialSuperAdminData} /> : <MasScreen onScreenChange={handleSetCurrentScreen} totalBalance={initialTodayData.cash.totalBalance} currency={currencyCode} isSuperAdmin={false} planCode={userSummary.planCode} fullAccess={fullAccess} />;
      case 'suscripciones': return <SubscriptionsScreen 
        onBack={backToMas} 
        onNavigateToRegister={(type) => {
          setRegisterParams({ defaultSegment: type === 'ingreso' ? 'Movimiento' : 'Obligacion', defaultType: type });
          setCurrentScreen('registrar');
        }} 
        data={initialSubscriptionsData} 
        currency={currencyCode}
        onOpenNova={openNova}
      />;
      case 'cadenas': return <CadenasScreen onBack={backToMas} />;
      case 'registrar': return <div className="pt-4"><RegisterScreen data={initialRegisterData} defaultSegment={registerParams.defaultSegment} defaultType={registerParams.defaultType} /></div>;
      default: return <NovaHome
        data={initialTodayData}
        currency={currencyCode}
        onOpenNova={openNova}
        onOpenObligations={() => {
          setObligationsInitialMode('gastos');
          setObligationsInitialFilter('todo');
          setCurrentScreen('obligaciones');
        }}
        onOpenMovements={() => setCurrentScreen('movimientos')}
        onOpenSummary={() => setCurrentScreen('resumen')}
      />;
    }
  };

  return (
    <LoaderProvider>
      <AppShell currencyCode={currencyCode} currentScreen={currentScreen} setCurrentScreen={handleSetCurrentScreen} registerData={initialRegisterData} canUseNova={userSummary.canUseNova} novaMonthlyLimit={userSummary.novaMonthlyLimit} novaUsed={userSummary.novaUsed} billingNotice={initialBillingNotice}>
        {renderScreen()}
      </AppShell>
      {showOnboarding ? (
        <NewUserOnboarding
          firstName={userSummary.fullName.split(/\s+/)[0] || "hola"}
          currency={currencyCode}
          plans={initialBillingPlans}
          theme={theme}
          setTheme={setTheme}
          onComplete={() => setShowOnboarding(false)}
        />
      ) : null}
    </LoaderProvider>
  );
}
