import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { WifiOff } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useNetwork } from '@/contexts/NetworkContext';
import { useToast } from '@/contexts/ToastContext';
import { syncPendingOfflineTripData } from '@/lib/offlineTripsAndAlerts';
import { formatDateTimeSafe } from '@/lib/utils';
import { AmbientLiquidBackdrop } from '@/components/glass/AmbientLiquidBackdrop';
import { AppHeader } from '@/components/layout/AppHeader';
import { AppSidebar } from '@/components/layout/AppSidebar';
import { MobileBottomNavigation } from '@/components/layout/MobileBottomNavigation';

export function AppShell({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const { isOnline, isOffline, lastSyncedAt } = useNetwork();
  const { pushToast } = useToast();
  const queryClient = useQueryClient();
  const location = useLocation();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  useEffect(() => {
    if (!isOnline || !user?.id) return;
    let cancelled = false;
    syncPendingOfflineTripData(user.id)
      .then((count) => {
        if (!cancelled && count > 0) {
          queryClient.invalidateQueries({ queryKey: ['myTrips', user.id] });
          queryClient.invalidateQueries({ queryKey: ['notifications', user.id] });
          pushToast({
            title: 'Offline trips & alerts synced',
            description: `Synced ${count} offline item(s) to your account.`,
            variant: 'success',
          });
        }
      })
      .catch(() => null);
    return () => {
      cancelled = true;
    };
  }, [isOnline, user?.id, queryClient, pushToast]);

  return (
    <div className="pamasahe-scenic-bg relative min-h-screen text-[#29262B] flex flex-col mobile-safe-content-pad">
      {/* Fixed Scenic Backdrop + 28 FPS GPU Ambient Light Reflections */}
      <div aria-hidden="true" className="pamasahe-backdrop-canvas" />
      <AmbientLiquidBackdrop />

      {/* Top Floating Liquid Glass Header */}
      <AppHeader
        sidebarCollapsed={sidebarCollapsed}
        onToggleSidebar={() => setSidebarCollapsed((v) => !v)}
      />

      {/* Main Content + Desktop/Tablet Floating Sidebar (hidden <= 768px) */}
      <div className="relative z-10 mx-auto flex w-full max-w-[1480px] flex-1 gap-4 lg:gap-5 px-2.5 py-2.5 sm:px-5 sm:py-5 lg:px-6 overflow-x-clip">
        <AppSidebar collapsed={sidebarCollapsed} />

        <main key={location.pathname} className="liquid-page-enter min-w-0 w-full flex-1 space-y-4 sm:space-y-5">
          {isOffline && (
            <div
              role="status"
              aria-live="polite"
              className="glass-card-strong liquid-glass-sheen flex flex-col gap-2 rounded-[24px] px-4 py-3 text-xs text-[#29262B] sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="flex items-start gap-2.5">
                <div className="mt-0.5 rounded-full border border-white/90 bg-[#F8E7EA]/90 p-1.5 text-[#C9182B] shadow-sm">
                  <WifiOff className="h-4 w-4" />
                </div>
                <div>
                  <p className="font-bold text-[#B51224]">
                    Offline Mode Active — Limited Features Available
                  </p>
                  <p className="text-[#343039]">
                    Cached <strong>Fare Finder</strong>, <strong>Fare Matrix</strong>,{' '}
                    <strong>15 LGUs</strong>, <strong>Live Trip Monitor</strong> &amp; alerts work
                    offline.
                  </p>
                </div>
              </div>
              {lastSyncedAt && (
                <span className="shrink-0 rounded-full border border-white/90 bg-white/75 px-3 py-1 text-[11px] font-semibold text-[#777078]">
                  Synced {formatDateTimeSafe(lastSyncedAt)}
                </span>
              )}
            </div>
          )}

          {children}
        </main>
      </div>

      {/* Minimal Commuter Branding Strip (Desktop/Tablet) */}
      <footer className="hidden md:block glass-footer relative z-10 mt-auto">
        <div className="mx-auto flex max-w-[1480px] items-center justify-between gap-4 px-6 py-4 text-xs text-[#777078]">
          <div className="flex items-center gap-3">
            <img
              src="/assets/pamasahe-tracker-icon.png"
              alt="Pamasahe Tracker Icon"
              className="h-7 w-7 rounded-full ring-2 ring-white/95 shadow-sm shrink-0"
            />
            <p>
              <strong className="text-[#29262B]">Pamasahe Tracker – Oriental Mindoro</strong> •
              Tamang Pamasahe. Ligtas na Biyahe.
            </p>
          </div>
          <p className="font-semibold text-[#C9182B]">Calapan City &amp; 14 Municipalities</p>
        </div>
      </footer>

      {/* Floating Bottom Liquid Glass Dock for Mobile (<= 768px) */}
      <MobileBottomNavigation />
    </div>
  );
}
