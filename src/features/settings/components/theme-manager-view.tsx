'use client';

import React from 'react';
import { Palette, Check } from 'lucide-react';
import { THEME_OPTIONS, type ThemeId } from '@/src/lib/themes';
import { haptics } from '@/src/lib/haptics';

export function ThemeManagerView({
  currentTheme,
  onSelectTheme,
}: {
  currentTheme: ThemeId;
  onSelectTheme: (themeId: ThemeId) => void;
}) {
  return (
    <section className="space-y-4">
      <div className="flex items-center gap-2">
        <Palette className="text-arca-accent" size={20} />
        <h3 className="text-base font-bold text-arca-text-primary">Apariencia y Tema</h3>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {THEME_OPTIONS.map((theme) => {
          const isSelected = currentTheme === theme.id;
          return (
            <button
              key={theme.id}
              type="button"
              onClick={() => {
                haptics.light();
                onSelectTheme(theme.id);
              }}
              className={`relative flex flex-col justify-between rounded-2xl border p-3 text-left transition-all ${
                isSelected
                  ? 'border-arca-accent bg-arca-accent/10 shadow-lg'
                  : 'border-arca-border bg-arca-surface-1 hover:border-arca-border-strong'
              }`}
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-arca-text-primary">{theme.name}</span>
                  {isSelected && <Check className="text-arca-accent" size={16} />}
                </div>
                <p className="mt-0.5 text-[10px] text-arca-text-dim">{theme.description}</p>
              </div>

              <div className="mt-3 flex items-center gap-1.5">
                {theme.colors.map((color, i) => (
                  <span
                    key={i}
                    className="h-4 w-4 rounded-full border border-black/20"
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}
