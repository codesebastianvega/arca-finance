import type { Screen } from '@/src/types';
import type { AdminPlanCode } from '@/src/lib/superadmin-types';

export type RequiredPlan = Exclude<AdminPlanCode, 'free'>;

const PERSONAL_SCREENS = new Set<Screen>(['dashboard', 'planeacion_mes', 'planeacion_proyeccion', 'suscripciones']);
const BUSINESS_SCREENS = new Set<Screen>(['negocios']);

export function requiredPlanForScreen(screen: Screen): RequiredPlan | null {
  if (BUSINESS_SCREENS.has(screen)) return 'business';
  if (PERSONAL_SCREENS.has(screen)) return 'personal_pro';
  return null;
}

export function canAccessScreen(screen: Screen, planCode: AdminPlanCode, fullAccess = false) {
  if (fullAccess || planCode === 'business') return true;
  const required = requiredPlanForScreen(screen);
  if (!required) return true;
  return required === 'personal_pro' && planCode === 'personal_pro';
}
