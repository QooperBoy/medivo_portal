/**
 * Worker MSW dla środowiska przeglądarki (Service Worker).
 * Startowany leniwie przez `MswProvider` (dynamiczny import po stronie klienta).
 */

import { setupWorker } from 'msw/browser';
import { handlers } from './handlers';

export const worker = setupWorker(...handlers);
