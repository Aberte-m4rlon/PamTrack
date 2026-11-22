import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { GlassErrorBoundary } from '@/components/ErrorBoundary';
import { NetworkProvider } from '@/contexts/NetworkContext';
import { AuthProvider } from '@/contexts/AuthContext';
import { useFareRecords } from '@/hooks/useReferenceData';
import * as supabaseMod from '@/lib/supabase';

function ThrowingWidget(): React.ReactElement {
  throw new Error('Simulated render crash');
}

function MultiFareSubscribers() {
  useFareRecords();
  useFareRecords();
  return <div>Multiple subscribers mounted safely</div>;
}

describe('Post-Login Realtime Crash Prevention & GlassErrorBoundary', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('catches render errors cleanly via GlassErrorBoundary instead of blank white screen', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    render(
      <GlassErrorBoundary>
        <ThrowingWidget />
      </GlassErrorBoundary>
    );
    expect(screen.getByText('May kaunting problema lang')).toBeInTheDocument();
    expect(screen.getByText('Simulated render crash')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /I-reload ang App/i })).toBeInTheDocument();
    spy.mockRestore();
  });

  it('deduplicates concurrent Realtime subscriptions cleanly under React StrictMode', () => {
    const subscribedTopics = new Map<string, boolean>();
    const fakeSupabase = {
      channel: vi.fn((topic: string) => {
        const api = {
          on: vi.fn(() => {
            if (subscribedTopics.get(topic)) {
              throw new Error(`cannot add postgres_changes callbacks for ${topic} after subscribe().`);
            }
            return api;
          }),
          subscribe: vi.fn(() => {
            subscribedTopics.set(topic, true);
            return api;
          }),
        };
        return api;
      }),
      removeChannel: vi.fn().mockResolvedValue('ok'),
      auth: {
        getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
        onAuthStateChange: vi.fn(() => ({
          data: { subscription: { unsubscribe: vi.fn() } },
        })),
      },
    };

    vi.spyOn(supabaseMod, 'isSupabaseConfigured', 'get').mockReturnValue(true);
    vi.spyOn(supabaseMod, 'supabase', 'get').mockReturnValue(
      fakeSupabase as unknown as typeof supabaseMod.supabase
    );

    const qc = new QueryClient({
      defaultOptions: { queries: { retry: false, enabled: false } },
    });

    const { unmount } = render(
      <React.StrictMode>
        <QueryClientProvider client={qc}>
          <NetworkProvider>
            <AuthProvider>
              <MultiFareSubscribers />
            </AuthProvider>
          </NetworkProvider>
        </QueryClientProvider>
      </React.StrictMode>
    );

    expect(screen.getByText('Multiple subscribers mounted safely')).toBeInTheDocument();
    unmount();
  });
});
