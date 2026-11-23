import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
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
            title: 'Na-sync na ang offline trips at alerts',
            description: `Nai-save sa account mo ang ${count} offline item(s).`,
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

        <motion.main
          key={location.pathname}
          initial={{ opacity: 0, y: 12, scale: 0.994 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
          className="liquid-page-enter min-w-0 w-full flex-1 space-y-4 sm:space-y-5"
        >
          <AnimatePresence initial={false}>
            {isOffline && (
              <motion.div
                key="offline-banner"
                role="status"
                aria-live="polite"
                initial={{ opacity: 0, y: -10, scale: 0.985 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -8, scale: 0.985 }}
                transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
                className="glass-card-strong liquid-glass-sheen flex flex-col gap-2 rounded-[24px] px-4 py-3 text-xs text-[#29262B] sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex items-start gap-2.5">
                  <div className="mt-0.5 rounded-full border border-white/90 bg-[#F8E7EA]/90 p-1.5 text-[#C9182B] shadow-sm">
                    <WifiOff className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="font-bold text-[#B51224]">
                      Naka-Offline Mode — Limitado ang Ilang Feature
                    </p>
                    <p className="text-[#343039]">
                      Gumagana pa rin offline ang naka-save na <strong>Fare Finder</strong>,{' '}
                      <strong>Fare Matrix</strong>, <strong>15 LGUs</strong>,{' '}
                      <strong>Live Trip Monitor</strong>, at mga alerto.
                    </p>
                  </div>
                </div>
                {lastSyncedAt && (
                  <span className="shrink-0 rounded-full border border-white/90 bg-white/75 px-3 py-1 text-[11px] font-semibold text-[#777078]">
                    Huling na-sync {formatDateTimeSafe(lastSyncedAt)}
                  </span>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {children}
        </motion.main>
      </div>

      {/* Minimal Commuter Branding Strip (Desktop/Tablet) */}
      <footer className="hidden md:block glass-footer relative z-10 mt-auto">
        <div className="mx-auto flex max-w-[1480px] items-center justify-between gap-4 px-6 py-4 text-xs text-[#777078]">
          <div className="flex items-center gap-3">
            <img
              src="/assets/pamasahe-tracker-icon.png"
              alt="Pamasahe Tracker Icon"
              className="h-8 w-8 rounded-lg ring-1 ring-white/95 shadow-sm shrink-0 object-contain"
            />
            <p>
              <strong className="text-[#29262B]">Pamasahe Tracker – Oriental Mindoro</strong> •
              Tamang Pamasahe. Ligtas na Biyahe.
            </p>
          </div>
          <p className="font-semibold text-[#C9182B]">Calapan City at 14 pang Bayan</p>
        </div>
      </footer>

      {/* Floating Bottom Liquid Glass Dock for Mobile (<= 768px) */}
      <MobileBottomNavigation />
    </div>
  );
}
