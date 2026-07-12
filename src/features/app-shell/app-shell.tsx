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

interface AppShellProps {
  currentScreen: Screen;
  setCurrentScreen: (screen: Screen) => void;
  children: React.ReactNode;
  registerData: RegisterViewModel;
}

export default function AppShell({ currentScreen, setCurrentScreen, children, registerData }: AppShellProps) {
  const router = useRouter();
  const [isRegisterOpen, setIsRegisterOpen] = useState(false);

  useEffect(() => {
    const handleOpen = () => setIsRegisterOpen(true);
    window.addEventListener('open-register', handleOpen);
    return () => window.removeEventListener('open-register', handleOpen);
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

      {/* Navigation (Mobile optimized for now as requested) */}
      <BottomTabNavigation 
        currentScreen={currentScreen} 
        onScreenChange={setCurrentScreen}
        onAddClick={() => setIsRegisterOpen(true)}
      />

      {/* Register Bottom Sheet */}
      <BottomSheet isOpen={isRegisterOpen} onClose={() => setIsRegisterOpen(false)} title="Nuevo Registro">
        <RegisterScreen
          data={registerData}
          onSuccess={() => {
            router.refresh();
            setIsRegisterOpen(false);
          }}
        />
      </BottomSheet>
    </div>
  );
}
