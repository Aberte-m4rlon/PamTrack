import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { SupabaseSetupBanner } from '@/components/glass/GlassPrimitives';
import { AppHeader } from '@/components/layout/AppHeader';
import { AppSidebar } from '@/components/layout/AppSidebar';
import { MobileBottomNavigation } from '@/components/layout/MobileBottomNavigation';

export function AppShell({ children }: { children: React.ReactNode }) {
  const { isConfigured } = useAuth();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <div className="pamasahe-scenic-bg relative min-h-screen text-[#24191D] flex flex-col mobile-safe-content-pad">
      {/* Subtle Rose Ambient Backdrop Glows (pointer-events-none, behind content) */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 overflow-hidden z-0"
      >
        <div className="absolute -left-24 -top-20 h-96 w-96 rounded-full bg-[#FCA5A5]/25 blur-3xl" />
        <div className="absolute right-[-6%] top-24 h-80 w-80 rounded-full bg-[#FFE4E6]/70 blur-3xl" />
        <div className="absolute bottom-[-8%] left-1/3 h-96 w-96 rounded-full bg-[#FCA5A5]/20 blur-3xl" />
      </div>

      {/* Top Frosted Header */}
      <AppHeader
        sidebarCollapsed={sidebarCollapsed}
        onToggleSidebar={() => setSidebarCollapsed((v) => !v)}
      />

      {/* Main Content + Desktop/Tablet Collapsible Sidebar (strictly hidden <= 768px) */}
      <div className="relative z-10 mx-auto flex w-full max-w-[1480px] flex-1 gap-6 px-3 py-5 sm:px-6 sm:py-6">
        <AppSidebar collapsed={sidebarCollapsed} />

        <main className="min-w-0 flex-1 space-y-5">
          {!isConfigured && <SupabaseSetupBanner compact />}
          {children}
        </main>
      </div>

      {/* Consistent Glass Footer */}
      <footer className="relative z-10 mt-auto border-t border-white/85 bg-white/70 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[1480px] flex-col gap-4 px-4 py-6 text-xs text-[#78716C] sm:px-6 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <img
              src="/assets/pamasahe-tracker-icon.png"
              alt="Pamasahe Tracker Icon"
              className="h-8 w-8 rounded-full ring-2 ring-[#FFE4E6]"
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
            <Link to="/authorities" className="hover:text-[#DC2626] transition-colors">
              Authority Directory
            </Link>
            <Link to="/safety" className="hover:text-[#DC2626] transition-colors">
              Safety Center
            </Link>
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
              LTFRB Hotline 1342
            </a>
          </div>
        </div>
      </footer>

      {/* Fixed Mobile Bottom Navigation Bar (Strictly shown <= 768px) */}
      <MobileBottomNavigation />
    </div>
  );
}
