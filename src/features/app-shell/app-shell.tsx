"use client";

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useRouter } from 'next/navigation';
import { Plus, X } from 'lucide-react';
import { Screen } from '../../types';
import { haptics } from '../../lib/haptics';
import { NAV_ITEMS, getNavItem } from './nav';
import BottomTabNavigation from '../../components/BottomTabNavigation';
import BottomSheet from '../../components/BottomSheet';
import RegisterScreen from '../register/register-screen';
import type { RegisterViewModel } from '@/src/lib/register-data';
import AiChat from '../chat/ai-chat';
import { Wand2 } from 'lucide-react';

interface AppShellProps {
  currentScreen: Screen;
  setCurrentScreen: (screen: Screen) => void;
  children: React.ReactNode;
  registerData: RegisterViewModel;
  currencyCode: string;
}

export default function AppShell({ currentScreen, setCurrentScreen, children, registerData, currencyCode }: AppShellProps) {
  const router = useRouter();
  const [isRegisterOpen, setIsRegisterOpen] = useState(false);
  const [isAiChatOpen, setIsAiChatOpen] = useState(false);
  const [novaInitialPrompt, setNovaInitialPrompt] = useState<string | null>(null);
  const [defaultSegment, setDefaultSegment] = useState('Movimiento');
  const [defaultGoalType, setDefaultGoalType] = useState<'goal' | 'pocket'>('goal');
  const [defaultType, setDefaultType] = useState<'gasto' | 'ingreso'>('gasto');

  useEffect(() => {
    const handleOpen = (e: Event) => {
      const customEvent = e as CustomEvent;
      const segment = customEvent.detail?.segment || 'Grid';
      const goalType = customEvent.detail?.goalType || 'goal';
      const type = customEvent.detail?.type || 'gasto';
      setDefaultSegment(segment);
      setDefaultGoalType(goalType);
      setDefaultType(type);
      setIsRegisterOpen(true);
    };
    window.addEventListener('open-register', handleOpen);
    return () => window.removeEventListener('open-register', handleOpen);
  }, []);

  useEffect(() => {
    const handleOpenNova = (event: Event) => {
      const customEvent = event as CustomEvent<{ prompt?: string }>;
      setNovaInitialPrompt(customEvent.detail?.prompt?.trim() || null);
      setIsAiChatOpen(true);
    };

    window.addEventListener('open-nova', handleOpenNova);
    return () => window.removeEventListener('open-nova', handleOpenNova);
  }, []);

  return (
    <div className="min-h-screen bg-arca-base light:bg-arca-light-base text-arca-text-primary light:text-arca-light-text-primary transition-colors duration-500 overflow-x-hidden selection:bg-arca-accent/30 selection:text-arca-accent">
      
      {/* Main Content Area */}
      <main className="max-w-lg mx-auto px-6 pt-8 pb-32 min-h-screen">
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

      {/* Floating Action Button for AI Chat - Mezcla de Opción 2 (Glassmorphism) y Opción 3 (Cyberpulse) */}
      {currentScreen !== 'hoy' && (
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={() => {
            setNovaInitialPrompt(null);
            setIsAiChatOpen(true);
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
          setIsRegisterOpen(true);
        }}
      />

      {/* Register Bottom Sheet */}
      <BottomSheet isOpen={isRegisterOpen} onClose={() => setIsRegisterOpen(false)} title="Nuevo Registro">
        <RegisterScreen
          data={registerData}
          defaultSegment={defaultSegment}
          defaultGoalType={defaultGoalType}
          defaultType={defaultType}
          onSuccess={() => {
            router.refresh();
            setIsRegisterOpen(false);
          }}
        />
      </BottomSheet>

      {/* AI Chat Bot */}
      <AiChat
        isOpen={isAiChatOpen}
        onClose={() => setIsAiChatOpen(false)}
        initialPrompt={novaInitialPrompt}
        onInitialPromptConsumed={() => setNovaInitialPrompt(null)}
        currencyCode={currencyCode}
        onViewChanges={() => {
          setCurrentScreen('resumen');
          setIsAiChatOpen(false);
        }}
      />
    </div>
  );
}
