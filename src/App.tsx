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
import AppShell from './features/app-shell/app-shell';
import DecisionDashboard from './features/dashboard/components/decision-dashboard';
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

export default function App({
  initialTodayData,
  initialMoneyData,
  initialObligationsData,
  initialMonthData,
  initialProjectionData,
  initialCalendarData,
  initialBusinessData,
  initialHistoryData,
  initialRegisterData,
}: {
  initialTodayData: TodayViewModel;
  initialMoneyData: MoneyViewModel;
  initialObligationsData: ObligationsViewModel;
  initialMonthData: MonthViewModel;
  initialProjectionData: ProjectionViewModel;
  initialCalendarData: CalendarViewModel;
  initialBusinessData: BusinessViewModel;
  initialHistoryData: HistoryViewModel;
  initialRegisterData: RegisterViewModel;
}) {
  const [currentScreen, setCurrentScreen] = useState<Screen>('hoy');
  const [isDarkMode, setIsDarkMode] = useState(true);

  // Apply dark mode class to root
  useEffect(() => {
    const root = window.document.documentElement;
    if (isDarkMode) {
      root.classList.add('dark');
      root.classList.remove('light');
    } else {
      root.classList.remove('dark');
      root.classList.add('light');
    }
  }, [isDarkMode]);

  const renderScreen = () => {
    const backToMas = () => setCurrentScreen('mas');
    
    switch (currentScreen) {
      case 'hoy': return <DecisionDashboard 
        data={initialTodayData} 
        onOpenMovements={() => setCurrentScreen('movimientos')} 
        onOpenTransfer={() => setCurrentScreen('transferir')}
        onOpenObligations={() => setCurrentScreen('obligaciones')}
        onOpenRegister={() => setCurrentScreen('registrar')}
        onOpenBusiness={() => setCurrentScreen('negocios')}
        onOpenMonthPlan={() => setCurrentScreen('planeacion_mes')}
      />;
      case 'dinero_cuentas': return <AccountsScreen defaultTab="cuentas" data={initialMoneyData} />;
      case 'dinero_tarjetas': return <AccountsScreen defaultTab="tarjetas" data={initialMoneyData} />;
      case 'dinero_ahorro': return <AccountsScreen defaultTab="ahorro" data={initialMoneyData} />;
      case 'obligaciones': return <ObligationsScreen data={initialObligationsData} />;
      case 'mas': return <MasScreen onScreenChange={setCurrentScreen} totalBalance={initialTodayData.cash.totalBalance} />;
      case 'dashboard': return <ExecutiveDashboard onBack={backToMas} />;
      case 'planeacion_mes': return <MonthScreen onBack={backToMas} data={initialMonthData} />;
      case 'planeacion_proyeccion': return <ProjectionScreen onBack={backToMas} data={initialProjectionData} />;
      case 'negocios': return <BusinessScreen onBack={backToMas} data={initialBusinessData} />;
      case 'movimientos': return <HistoryScreen onBack={backToMas} data={initialHistoryData} />;
      case 'configuracion': return <ConfiguracionScreen onBack={backToMas} isDarkMode={isDarkMode} setIsDarkMode={setIsDarkMode} />;
      case 'calendario': return <CalendarScreen onBack={backToMas} data={initialCalendarData} />;
      case 'transferir': return <TransferScreen onBack={backToMas} data={initialMoneyData} />;
      case 'superadmin': return <SuperAdminScreen onBack={backToMas} />;
      case 'registrar': return <div className="pt-4"><RegisterScreen data={initialRegisterData} /></div>;
      default: return <DecisionDashboard data={initialTodayData} onOpenMovements={() => setCurrentScreen('movimientos')} />;
    }
  };

  return (
    <AppShell currentScreen={currentScreen} setCurrentScreen={setCurrentScreen} registerData={initialRegisterData}>
      {renderScreen()}
    </AppShell>
  );
}
