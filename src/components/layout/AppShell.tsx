import React, { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { WifiOff } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useNetwork } from '@/contexts/NetworkContext';
import { formatDateTimeSafe } from '@/lib/utils';
import { SupabaseSetupBanner } from '@/components/glass/GlassPrimitives';
import { AppHeader } from '@/components/layout/AppHeader';
import { AppSidebar, MobileNavigationDrawer } from '@/components/layout/AppSidebar';
import { MobileBottomNavigation } from '@/components/layout/MobileBottomNavigation';

export function AppShell({ children }: { children: React.ReactNode }) {
  const { user, isConfigured } = useAuth();
  const { isOffline, lastSyncedAt } = useNetwork();
  const location = useLocation();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);

  useEffect(() => {
    setMobileDrawerOpen(false);
  }, [location.pathname]);

  return (
    <div className="pamasahe-scenic-bg relative min-h-screen text-[#24191D] flex flex-col mobile-safe-content-pad">
      {/* Fixed Frosted Scenic Backdrop + Subtle Blush Ambient Light */}
      <div aria-hidden="true" className="pamasahe-backdrop-canvas" />
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 overflow-hidden z-0"
      >
        <div className="absolute -left-24 -top-20 h-96 w-96 rounded-full bg-[#FCA5A5]/24 blur-3xl" />
        <div className="absolute right-[-6%] top-20 h-80 w-80 rounded-full bg-white/55 blur-3xl" />
        <div className="absolute bottom-[-8%] left-1/3 h-96 w-96 rounded-full bg-[#DC2626]/10 blur-3xl" />
      </div>

      {/* Top Floating Liquid Glass Header */}
      <AppHeader
        sidebarCollapsed={sidebarCollapsed}
        onToggleSidebar={() => setSidebarCollapsed((v) => !v)}
        mobileDrawerOpen={mobileDrawerOpen}
        onToggleMobileDrawer={() => setMobileDrawerOpen((v) => !v)}
      />

      {/* Collapsible Mobile Liquid Glass Drawer (< 768px) */}
      <MobileNavigationDrawer
        open={mobileDrawerOpen}
        onClose={() => setMobileDrawerOpen(false)}
      />

      {/* Main Content + Desktop/Tablet Floating Sidebar (hidden <= 767px) */}
      <div className="relative z-10 mx-auto flex w-full max-w-[1480px] flex-1 gap-4 lg:gap-5 px-2.5 py-3.5 sm:px-5 sm:py-5 lg:px-6">
        <AppSidebar collapsed={sidebarCollapsed} />

        <main className="min-w-0 flex-1 space-y-5">
          {isOffline && (
            <div
              role="status"
              aria-live="polite"
              className="glass-card-strong liquid-glass-sheen flex flex-col gap-2 rounded-[24px] px-4 py-3 text-xs text-[#24191D] sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="flex items-start gap-2.5">
                <div className="mt-0.5 rounded-full border border-white/90 bg-[#FFE4E6]/90 p-1.5 text-[#DC2626] shadow-sm">
                  <WifiOff className="h-4 w-4" />
                </div>
                <div>
                  <p className="font-bold text-[#B91C1C]">
                    Offline Mode Active — Limited Features Available
                  </p>
                  <p className="text-[#78716C]">
                    Cached <strong>Fare Finder</strong>, <strong>Fare Matrix</strong>,{' '}
                    <strong>15 LGUs</strong>, and <strong>Platform Guide</strong> remain usable
                    offline. Live GPS map tiles, OSRM routing, sign in, and online reporting pause
                    until reconnected.
                  </p>
                </div>
              </div>
              {lastSyncedAt && (
                <span className="shrink-0 rounded-full border border-white/90 bg-white/75 px-3 py-1 text-[11px] font-semibold text-[#78716C]">
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
        <div className="mx-auto flex max-w-[1480px] flex-col gap-4 px-4 py-6 text-xs text-[#78716C] sm:px-6 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <img
              src="/assets/pamasahe-tracker-icon.png"
              alt="Pamasahe Tracker Icon"
              className="h-8 w-8 rounded-full ring-2 ring-white/95 shadow-sm"
            />
            <div>
              <p className="font-bold text-[#24191D]">Pamasahe Tracker – Oriental Mindoro</p>
              <p>Tamang Pamasahe. Ligtas na Biyahe. • Serving Calapan City &amp; 14 Municipalities</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-4 font-semibold text-[#24191D]/85">
            <Link to="/about" className="hover:text-[#DC2626] transition-colors">
              About
            </Link>
            <Link to="/fare-matrix" className="hover:text-[#DC2626] transition-colors">
              Official Sources
            </Link>
            <Link to="/municipalities" className="hover:text-[#DC2626] transition-colors">
              15 LGUs
            </Link>
            {user && (
              <>
                <Link to="/authorities" className="hover:text-[#DC2626] transition-colors">
                  Authority Directory
                </Link>
                <Link to="/safety" className="hover:text-[#DC2626] transition-colors">
                  Safety Center
                </Link>
              </>
            )}
            <Link to="/privacy" className="hover:text-[#DC2626] transition-colors">
              Privacy Policy
            </Link>
            <Link to="/terms" className="hover:text-[#DC2626] transition-colors">
              Terms &amp; Conditions
            </Link>
            <a
              href="https://ltfrb.gov.ph/"
              target="_blank"
              rel="noreferrer"
              className="font-bold text-[#DC2626] underline underline-offset-2 hover:text-[#B91C1C]"
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
