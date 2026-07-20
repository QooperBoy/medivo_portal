/**
 * Warstwa domenowa `@/domain` — barrel re-eksportujący modele, stany, eventy,
 * weryfikację i kontrakty API mocka. Import z `@/domain`.
 *
 * Warstwa czysto domenowa — BEZ importów react/next/msw. Używalna po stronie
 * serwera, klienta i w handlerach MSW.
 */

export * from './booking-states';
export * from './events';
export * from './verification';
export * from './types';
export * from './api-contracts';
export * from './auth';
export * from './patient';
export * from './onboarding';
export * from './admin';
export * from './panel-extra';
