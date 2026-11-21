import '@testing-library/jest-dom/vitest';
import { afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';

// Keep Vitest UI component tests hermetic and independent of local .env credentials
vi.mock('@/lib/supabase', () => ({
  isSupabaseConfigured: false,
  supabase: null,
  getSupabaseClientOrThrow: () => {
    throw new Error('Supabase test mock: unconfigured');
  },
}));

afterEach(() => {
  cleanup();
});

// Polyfill ResizeObserver for Recharts / Radix in jsdom
class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}
if (typeof window !== 'undefined' && !window.ResizeObserver) {
  window.ResizeObserver = ResizeObserverMock;
}
