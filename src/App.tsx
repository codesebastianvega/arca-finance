'use client';

import React, { useState, useEffect } from 'react';
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
import NewUserOnboarding from './features/onboarding/new-user-onboarding';

export type ThemeId = 'arca-dark' | 'neon-night' | 'glass-ocean' | 'arca-light';
export type AppUserSummary = {
  fullName: string;
  email: string;
  planLabel: string;
  trialDaysRemaining?: number;
  isSuperAdmin: boolean;
};

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
  initialOnboardingRequired: boolean;
  userSummary: AppUserSummary;
}) {
  const [currentScreen, setCurrentScreen] = useState<Screen>('hoy');
  const [obligationsInitialMode, setObligationsInitialMode] = useState<'gastos' | 'ingresos'>('gastos');
  const [obligationsInitialFilter, setObligationsInitialFilter] = useState<ObligationFilter>('todo');
  const [showOnboarding, setShowOnboarding] = useState(initialOnboardingRequired);
  const [registerParams, setRegisterParams] = useState<{defaultSegment?: string, defaultType?: 'gasto' | 'ingreso'}>({});
  
  const handleSetCurrentScreen = (screen: Screen) => {
    if (screen !== 'registrar') setRegisterParams({});
    if (screen === 'obligaciones') setObligationsInitialMode('gastos');
    if (screen === 'obligaciones') setObligationsInitialFilter('todo');
    setCurrentScreen(screen);
  };

  const [theme, setTheme] = useState<ThemeId>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('arca-theme') as ThemeId) || 'arca-dark';
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

  const renderScreen = () => {
    const backToMas = () => setCurrentScreen('mas');
    const openNova = (prompt?: string) => {
      window.dispatchEvent(new CustomEvent('open-nova', { detail: { prompt } }));
    };
    
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
      />;
      case 'dinero_cuentas': return <AccountsScreen defaultTab="cuentas" data={initialMoneyData} onOpenMovements={() => setCurrentScreen('movimientos')} />;
      case 'dinero_tarjetas': return <AccountsScreen defaultTab="tarjetas" data={initialMoneyData} onOpenMovements={() => setCurrentScreen('movimientos')} />;
      case 'dinero_ahorro': return <AccountsScreen defaultTab="ahorro" data={initialMoneyData} onOpenMovements={() => setCurrentScreen('movimientos')} />;
      case 'obligaciones': return <ObligationsScreen data={initialObligationsData} currency={currencyCode} onBack={backToMas} onOpenNova={openNova} initialMode={obligationsInitialMode} initialFilter={obligationsInitialFilter} />;
      case 'mas': return <MasScreen onScreenChange={setCurrentScreen} totalBalance={initialTodayData.cash.totalBalance} currency={currencyCode} isSuperAdmin={userSummary.isSuperAdmin} />;
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
      case 'configuracion': return <ConfiguracionScreen onBack={backToMas} theme={theme} setTheme={setTheme} data={initialRegisterData} user={userSummary} />;
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
      case 'superadmin': return userSummary.isSuperAdmin ? <SuperAdminScreen onBack={backToMas} /> : <MasScreen onScreenChange={setCurrentScreen} totalBalance={initialTodayData.cash.totalBalance} currency={currencyCode} isSuperAdmin={false} />;
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
    <>
      <AppShell currencyCode={currencyCode} currentScreen={currentScreen} setCurrentScreen={handleSetCurrentScreen} registerData={initialRegisterData}>
        {renderScreen()}
      </AppShell>
      {showOnboarding ? (
        <NewUserOnboarding
          firstName={userSummary.fullName.split(/\s+/)[0] || "hola"}
          currency={currencyCode}
          onComplete={() => setShowOnboarding(false)}
        />
      ) : null}
    </>
  );
}
