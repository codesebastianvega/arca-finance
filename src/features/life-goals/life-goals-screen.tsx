'use client';

import React, { useState } from 'react';
import { Plane, Car, Home, Sparkles, Compass } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { haptics } from '@/src/lib/haptics';
import { TripPlannerTab } from './trip-planner-tab';
import { VehiclePlannerTab } from './vehicle-planner-tab';
import { HomePurchaseTab } from './home-purchase-tab';

type LifeGoalsTab = 'trip' | 'vehicle' | 'home';

type LifeGoalsScreenProps = {
  initialTab?: LifeGoalsTab;
  onOpenChatWithPrompt?: (prompt: string) => void;
};

export function LifeGoalsScreen({ initialTab = 'trip', onOpenChatWithPrompt }: LifeGoalsScreenProps) {
  const [activeTab, setActiveTab] = useState<LifeGoalsTab>(initialTab);

  const tabs = [
    { id: 'trip', label: 'Viajes', icon: Plane, color: 'text-sky-400', activeBg: 'bg-sky-500 text-black' },
    { id: 'vehicle', label: 'Vehículo & SOAT', icon: Car, color: 'text-amber-400', activeBg: 'bg-amber-500 text-black' },
    { id: 'home', label: 'Vivienda', icon: Home, color: 'text-emerald-400', activeBg: 'bg-emerald-500 text-black' },
  ];

  return (
    <div className="min-h-screen bg-arca-background p-4 sm:p-6 pb-28 text-arca-text-primary">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-arca-surface-2 border border-arca-border text-arca-accent shadow-md">
            <Compass size={22} />
          </span>
          <div>
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-arca-accent">
              ✦ PLANIFICADOR
            </span>
            <h1 className="text-xl font-black leading-tight">Metas de Vida</h1>
          </div>
        </div>

        {onOpenChatWithPrompt && (
          <button
            type="button"
            onClick={() => {
              haptics.medium();
              onOpenChatWithPrompt('Asesórame sobre mis metas de vida y planes a futuro');
            }}
            className="flex items-center gap-1.5 rounded-full bg-arca-accent/10 border border-arca-accent/30 px-3 py-1.5 text-xs font-bold text-arca-accent hover:bg-arca-accent/20 active:scale-95 transition-all"
          >
            <Sparkles size={14} />
            <span>Consultar a Nova</span>
          </button>
        )}
      </div>

      {/* Navigation Tabs */}
      <div className="grid grid-cols-3 gap-2 rounded-2xl bg-arca-surface-1 p-1.5 border border-arca-border mb-6">
        {tabs.map((tab) => {
          const TabIcon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              type="button"
              key={tab.id}
              onClick={() => {
                haptics.light();
                setActiveTab(tab.id as LifeGoalsTab);
              }}
              className={`flex items-center justify-center gap-1.5 rounded-xl py-2.5 text-xs font-black transition-all ${
                isActive
                  ? `${tab.activeBg} shadow-md scale-[1.02]`
                  : 'text-arca-text-secondary hover:text-arca-text-primary'
              }`}
            >
              <TabIcon size={16} />
              <span className="hidden sm:inline">{tab.label}</span>
              <span className="sm:hidden">{tab.label.split(' ')[0]}</span>
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
        >
          {activeTab === 'trip' && <TripPlannerTab />}
          {activeTab === 'vehicle' && <VehiclePlannerTab />}
          {activeTab === 'home' && <HomePurchaseTab />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
