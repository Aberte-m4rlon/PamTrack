import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { WifiOff } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useNetwork } from '@/contexts/NetworkContext';
import { useToast } from '@/contexts/ToastContext';
import { syncPendingOfflineTripData } from '@/lib/offlineTripsAndAlerts';
import { formatDateTimeSafe } from '@/lib/utils';
import { SupabaseSetupBanner } from '@/components/glass/GlassPrimitives';
import { AppHeader } from '@/components/layout/AppHeader';
import { AppSidebar } from '@/components/layout/AppSidebar';
import { MobileBottomNavigation } from '@/components/layout/MobileBottomNavigation';

export function AppShell({ children }: { children: React.ReactNode }) {
  const { user, isConfigured } = useAuth();
  const { isOnline, isOffline, lastSyncedAt } = useNetwork();
  const { pushToast } = useToast();
  const queryClient = useQueryClient();
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
      {/* Fixed Frosted Scenic Backdrop + Subtle Blush Ambient Light */}
      <div aria-hidden="true" className="pamasahe-backdrop-canvas" />
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 overflow-hidden z-0"
      >
        <div className="absolute -left-24 -top-20 h-96 w-96 rounded-full bg-[#E9E5E8]/24 blur-3xl" />
        <div className="absolute right-[-6%] top-20 h-80 w-80 rounded-full bg-white/55 blur-3xl" />
        <div className="absolute bottom-[-8%] left-1/3 h-96 w-96 rounded-full bg-[#C9182B]/10 blur-3xl" />
      </div>

      {/* Top Floating Liquid Glass Header */}
      <AppHeader
        sidebarCollapsed={sidebarCollapsed}
        onToggleSidebar={() => setSidebarCollapsed((v) => !v)}
      />

      {/* Main Content + Desktop/Tablet Floating Sidebar (hidden <= 768px) */}
      <div className="relative z-10 mx-auto flex w-full max-w-[1480px] flex-1 gap-4 lg:gap-5 px-2.5 py-2.5 sm:px-5 sm:py-5 lg:px-6">
        <AppSidebar collapsed={sidebarCollapsed} />

        <main className="min-w-0 flex-1 space-y-4 sm:space-y-5">
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

          {!isConfigured && <SupabaseSetupBanner compact />}
          {children}
        </main>
      </div>

      {/* Consistent Liquid Glass Footer */}
      <footer className="glass-footer relative z-10 mt-auto">
        <div className="mx-auto flex max-w-[1480px] flex-col gap-3 px-4 py-4 sm:py-6 text-xs text-[#777078] sm:px-6 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <img
              src="/assets/pamasahe-tracker-icon.png"
              alt="Pamasahe Tracker Icon"
              className="h-8 w-8 rounded-full ring-2 ring-white/95 shadow-sm shrink-0"
            />
            <div className="min-w-0">
              <p className="font-bold text-[#29262B]">Pamasahe Tracker – Oriental Mindoro</p>
              <p className="leading-snug">
                Tamang Pamasahe. Ligtas na Biyahe. • Calapan City &amp; 14 Municipalities
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 font-semibold text-[#29262B]/85">
            <Link to="/about" className="inline-flex min-h-[38px] items-center hover:text-[#C9182B] transition-colors">
              About
            </Link>
            <Link to="/fare-matrix" className="inline-flex min-h-[38px] items-center hover:text-[#C9182B] transition-colors">
              Official Sources
            </Link>
            <Link to="/municipalities" className="inline-flex min-h-[38px] items-center hover:text-[#C9182B] transition-colors">
              15 LGUs
            </Link>
            {user && (
              <>
                <Link to="/authorities" className="inline-flex min-h-[38px] items-center hover:text-[#C9182B] transition-colors">
                  Authority Directory
                </Link>
                <Link to="/safety" className="inline-flex min-h-[38px] items-center hover:text-[#C9182B] transition-colors">
                  Safety Center
                </Link>
              </>
            )}
            <Link to="/privacy" className="inline-flex min-h-[38px] items-center hover:text-[#C9182B] transition-colors">
              Privacy Policy
            </Link>
            <Link to="/terms" className="inline-flex min-h-[38px] items-center hover:text-[#C9182B] transition-colors">
              Terms &amp; Conditions
            </Link>
            <a
              href="https://ltfrb.gov.ph/"
              target="_blank"
              rel="noreferrer"
              className="inline-flex min-h-[38px] items-center font-bold text-[#C9182B] underline underline-offset-2 hover:text-[#B51224]"
            >
              LTFRB Official Portal ↗
            </a>
          </div>
        </div>
      </footer>

      {/* Floating Bottom Liquid Glass Dock for Mobile (<= 768px) */}
      <MobileBottomNavigation />
    </div>
  );
}
