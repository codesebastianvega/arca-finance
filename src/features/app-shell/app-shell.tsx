"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useRouter } from 'next/navigation';
import { BellRing, ChevronRight, Plus, X } from 'lucide-react';
import { Screen } from '../../types';
import { haptics } from '../../lib/haptics';
import { NAV_ITEMS, getNavItem } from './nav';
import BottomTabNavigation from '../../components/BottomTabNavigation';
import BottomSheet from '../../components/BottomSheet';
import RegisterScreen from '../register/register-screen';
import type { RegisterViewModel } from '@/src/lib/register-data';
import AiChat from '../chat/ai-chat';
import { Wand2 } from 'lucide-react';
import { recordAppUsage } from '@/app/telemetry-actions';
import type { BillingNotice } from '@/src/lib/billing-data';
import { PullToRefresh } from '../pwa/pull-to-refresh';

interface AppShellProps {
  currentScreen: Screen;
  setCurrentScreen: (screen: Screen) => void;
  children: React.ReactNode;
  registerData: RegisterViewModel;
  currencyCode: string;
  canUseNova: boolean;
  novaMonthlyLimit: number | null;
  novaUsed: number;
  billingNotice: BillingNotice | null;
}

export default function AppShell({ currentScreen, setCurrentScreen, children, registerData, currencyCode, canUseNova, novaMonthlyLimit, novaUsed, billingNotice }: AppShellProps) {
  const router = useRouter();
  const [isRegisterOpen, setIsRegisterOpen] = useState(false);
  const [isAiChatOpen, setIsAiChatOpen] = useState(false);
  const [novaInitialPrompt, setNovaInitialPrompt] = useState<string | null>(null);
  const [defaultSegment, setDefaultSegment] = useState('Movimiento');
  const [defaultGoalType, setDefaultGoalType] = useState<'goal' | 'pocket'>('goal');
  const [defaultType, setDefaultType] = useState<'gasto' | 'ingreso'>('gasto');
  const [defaultDate, setDefaultDate] = useState('');
  const [defaultIncomeStatus, setDefaultIncomeStatus] = useState<'received' | 'expected'>('received');

  const openOverlay = useCallback((overlay: 'register' | 'nova') => {
    window.history.pushState(
      { ...window.history.state, arcaOverlay: overlay },
      '',
      window.location.href,
    );
    setIsRegisterOpen(overlay === 'register');
    setIsAiChatOpen(overlay === 'nova');
  }, []);

  const closeOverlay = useCallback((overlay: 'register' | 'nova') => {
    if (window.history.state?.arcaOverlay === overlay) {
      window.history.back();
      return;
    }
    if (overlay === 'register') setIsRegisterOpen(false);
    if (overlay === 'nova') setIsAiChatOpen(false);
  }, []);

  useEffect(() => {
    const handleOverlayHistory = (event: PopStateEvent) => {
      const overlay = event.state?.arcaOverlay;
      setIsRegisterOpen(overlay === 'register');
      setIsAiChatOpen(overlay === 'nova');
    };

    window.addEventListener('popstate', handleOverlayHistory);
    return () => window.removeEventListener('popstate', handleOverlayHistory);
  }, []);

  useEffect(() => {
    const handleOpen = (e: Event) => {
      const customEvent = e as CustomEvent;
      const segment = customEvent.detail?.segment || 'Grid';
      const goalType = customEvent.detail?.goalType || 'goal';
      const type = customEvent.detail?.type || 'gasto';
      const date = customEvent.detail?.date || '';
      const incomeStatus = customEvent.detail?.incomeStatus === 'expected' ? 'expected' : 'received';
      setDefaultSegment(segment);
      setDefaultGoalType(goalType);
      setDefaultType(type);
      setDefaultDate(date);
      setDefaultIncomeStatus(incomeStatus);
      openOverlay('register');
    };
    window.addEventListener('open-register', handleOpen);
    return () => window.removeEventListener('open-register', handleOpen);
  }, [openOverlay]);

  useEffect(() => {
    const sessionKey = crypto.randomUUID();
    void recordAppUsage({ sessionKey, activeSeconds: 1 });
    const interval = window.setInterval(() => {
      if (document.visibilityState === 'visible') {
        void recordAppUsage({ sessionKey, activeSeconds: 60 });
      }
    }, 60_000);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    const handleOpenNova = (event: Event) => {
      if (!canUseNova) {
        setCurrentScreen('configuracion');
        return;
      }
      const customEvent = event as CustomEvent<{ prompt?: string }>;
      setNovaInitialPrompt(customEvent.detail?.prompt?.trim() || null);
      openOverlay('nova');
    };

    window.addEventListener('open-nova', handleOpenNova);
    return () => window.removeEventListener('open-nova', handleOpenNova);
  }, [canUseNova, openOverlay, setCurrentScreen]);

  return (
    <div className="min-h-screen bg-arca-base light:bg-arca-light-base text-arca-text-primary light:text-arca-light-text-primary transition-colors duration-500 overflow-x-hidden selection:bg-arca-accent/30 selection:text-arca-accent">
      
      {/* Main Content Area */}
      <PullToRefresh>
      <main className="max-w-lg mx-auto px-6 pt-8 pb-32 min-h-screen">
        {billingNotice && currentScreen !== 'configuracion' ? <button type="button" onClick={() => setCurrentScreen('configuracion')} className={`mb-4 flex w-full items-center gap-3 rounded-2xl border p-3 text-left ${billingNotice.overdue ? 'border-arca-alert/30 bg-arca-alert/[0.08]' : 'border-arca-accent/30 bg-arca-accent/[0.07]'}`}><span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${billingNotice.overdue ? 'bg-arca-alert/10 text-arca-alert' : 'bg-arca-accent/10 text-arca-accent'}`}><BellRing size={18} /></span><span className="min-w-0 flex-1"><span className="block text-xs font-black text-arca-text-primary">{billingNotice.overdue ? 'Tu suscripción tiene un pago pendiente' : billingNotice.daysUntilDue <= 0 ? 'Estamos esperando tu comprobante' : `Tu suscripción vence en ${billingNotice.daysUntilDue} días`}</span><span className="mt-0.5 block text-[9px] text-arca-text-dim">{billingNotice.planName} · {new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(billingNotice.amountCop)}</span></span><ChevronRight size={16} className="shrink-0 text-arca-text-dim" /></button> : null}
        <AnimatePresence mode="wait">
          <motion.div
            key={currentScreen}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            {children}
          </motion.div>
        </AnimatePresence>
      </main>
      </PullToRefresh>

      {/* Floating Action Button for AI Chat - Mezcla de Opción 2 (Glassmorphism) y Opción 3 (Cyberpulse) */}
      {canUseNova && currentScreen !== 'hoy' && currentScreen !== 'transferir' && currentScreen !== 'dashboard' && currentScreen !== 'movimientos' && (
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={() => {
            setNovaInitialPrompt(null);
            openOverlay('nova');
          }}
          aria-label="Abrir Nova"
          className="fixed bottom-[100px] right-6 w-14 h-14 rounded-full bg-arca-surface-1/90 backdrop-blur-md border border-arca-accent/40 flex items-center justify-center shadow-[0_8px_24px_rgba(0,0,0,0.3)] z-40 text-arca-accent hover:bg-arca-surface-2 transition-colors"
        >
          <Wand2 size={24} />
        </motion.button>
      )}

      {/* Navigation (Mobile optimized for now as requested) */}
      <BottomTabNavigation 
        currentScreen={currentScreen} 
        onScreenChange={setCurrentScreen}
        onAddClick={() => {
          setDefaultSegment('Grid');
          setDefaultType('gasto');
          setDefaultDate('');
          setDefaultIncomeStatus('received');
          openOverlay('register');
        }}
      />

      {/* Register Bottom Sheet */}
      <BottomSheet
        isOpen={isRegisterOpen}
        onClose={() => closeOverlay('register')}
        title={defaultSegment === 'Obligacion' ? 'Programar gasto' : defaultType === 'ingreso' && defaultIncomeStatus === 'expected' ? 'Programar ingreso' : 'Nuevo registro'}
      >
        <RegisterScreen
          key={`${defaultSegment}-${defaultType}-${defaultDate}-${defaultIncomeStatus}`}
          data={registerData}
          defaultSegment={defaultSegment}
          defaultGoalType={defaultGoalType}
          defaultType={defaultType}
          defaultDate={defaultDate}
          defaultIncomeStatus={defaultIncomeStatus}
          onSuccess={() => {
            router.refresh();
            closeOverlay('register');
          }}
        />
      </BottomSheet>

      {/* AI Chat Bot */}
      {canUseNova ? <AiChat
        isOpen={isAiChatOpen}
        onClose={() => closeOverlay('nova')}
        initialPrompt={novaInitialPrompt}
        onInitialPromptConsumed={() => setNovaInitialPrompt(null)}
        currencyCode={currencyCode}
        monthlyLimit={novaMonthlyLimit}
        initialUsed={novaUsed}
        onViewPlans={() => {
          closeOverlay('nova');
          window.setTimeout(() => setCurrentScreen('configuracion'), 0);
        }}
        onViewChanges={() => {
          closeOverlay('nova');
          window.setTimeout(() => setCurrentScreen('resumen'), 0);
        }}
      /> : null}
    </div>
  );
}
