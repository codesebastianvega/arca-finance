export type ThemeId =
  | 'arca-dark'
  | 'neon-night'
  | 'glass-ocean'
  | 'forest-ledger'
  | 'burgundy-vault'
  | 'arca-light';

export type ThemeOption = {
  id: ThemeId;
  name: string;
  description: string;
  colors: readonly [string, string, string, string];
  accent: string;
};

export const THEME_OPTIONS: readonly ThemeOption[] = [
  { id: 'arca-dark', name: 'Bronce', description: 'Clásico y elegante', colors: ['#090B0A', '#1A1E1C', '#C68A45', '#F4F7F5'], accent: '#C68A45' },
  { id: 'neon-night', name: 'Neón', description: 'Violeta nocturno', colors: ['#07080E', '#141624', '#6C5CE7', '#E4E8F7'], accent: '#6C5CE7' },
  { id: 'glass-ocean', name: 'Océano', description: 'Azul profundo', colors: ['#050A0F', '#0F1E2E', '#0EA5E9', '#E0F0FF'], accent: '#0EA5E9' },
  { id: 'forest-ledger', name: 'Bosque', description: 'Verde sereno', colors: ['#07100C', '#122019', '#82A96B', '#EEF6EC'], accent: '#82A96B' },
  { id: 'burgundy-vault', name: 'Reserva', description: 'Vino sofisticado', colors: ['#11080B', '#241217', '#C36B7D', '#F8EEF0'], accent: '#C36B7D' },
  { id: 'arca-light', name: 'Claro', description: 'Cálido y luminoso', colors: ['#F8F2E4', '#FFFDF8', '#A9713C', '#2A2117'], accent: '#A9713C' },
] as const;

export function isThemeId(value: string | null): value is ThemeId {
  return THEME_OPTIONS.some((theme) => theme.id === value);
}
