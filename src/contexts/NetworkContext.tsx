import React, { createContext, useContext, useEffect, useState } from 'react';
import { getLastSyncedAt, isBrowserOnline } from '@/lib/offlineCache';

interface NetworkContextValue {
  isOnline: boolean;
  isOffline: boolean;
  lastSyncedAt: string | null;
}

const NetworkContext = createContext<NetworkContextValue>({
  isOnline: true,
  isOffline: false,
  lastSyncedAt: null,
});

export function NetworkProvider({ children }: { children: React.ReactNode }) {
  const [isOnline, setIsOnline] = useState<boolean>(() => isBrowserOnline());
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(() => getLastSyncedAt());

  useEffect(() => {
    const syncState = () => setIsOnline(isBrowserOnline());
    const onSyncUpdated = (e: Event) => {
      const detail = (e as CustomEvent<string>).detail;
      setLastSyncedAt(detail || getLastSyncedAt());
    };

    window.addEventListener('online', syncState);
    window.addEventListener('offline', syncState);
    window.addEventListener('pamtrack:sync-updated', onSyncUpdated);

    return () => {
      window.removeEventListener('online', syncState);
      window.removeEventListener('offline', syncState);
      window.removeEventListener('pamtrack:sync-updated', onSyncUpdated);
    };
  }, []);

  return (
    <NetworkContext.Provider
      value={{
        isOnline,
        isOffline: !isOnline,
        lastSyncedAt,
      }}
    >
      {children}
    </NetworkContext.Provider>
  );
}

export function useNetwork() {
  return useContext(NetworkContext);
}
