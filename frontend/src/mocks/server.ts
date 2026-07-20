/**
 * Serwer MSW dla środowiska Node (SSR / testy). Nieużywany w ścieżce
 * przeglądarki, ale gotowy do podpięcia w testach lub renderze serwerowym.
 */

import { setupServer } from 'msw/node';
import { handlers } from './handlers';

export const server = setupServer(...handlers);
