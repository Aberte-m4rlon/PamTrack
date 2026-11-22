import React from 'react';
import { Link, NavLink } from 'react-router-dom';
import {
  Home,
  LocateFixed,
  Lock,
  Map as MapIcon,
  MapPin,
  MessageSquarePlus,
  Radio,
  Search,
  Settings,
  ShieldAlert,
  Table2,
  User,
  WifiOff,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useNetwork } from '@/contexts/NetworkContext';
import { cn } from '@/lib/utils';

export interface SidebarNavItem {
  to: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  end?: boolean;
  offlineReady?: boolean;
}

const GUEST_PUBLIC_NAV: SidebarNavItem[] = [
  { to: '/', label: 'Home', icon: Home, end: true, offlineReady: true },
  { to: '/fare-search', label: 'Fare Finder', icon: Search, offlineReady: true },
  { to: '/fare-matrix', label: 'Fare Matrix', icon: Table2, offlineReady: true },
  { to: '/routes', label: 'Route Map', icon: MapIcon, offlineReady: false },
  { to: '/municipalities', label: '15 LGUs', icon: MapPin, offlineReady: true },
];

const COMMUTER_NAV: SidebarNavItem[] = [
  { to: '/live-map', label: 'Live GPS Map', icon: LocateFixed, offlineReady: false },
  { to: '/trips', label: 'Live Trip Monitor', icon: Radio, end: true, offlineReady: true },
  { to: '/dashboard/reports', label: 'Report Fare', icon: MessageSquarePlus, offlineReady: false },
  { to: '/safety', label: 'Safety & Contacts', icon: ShieldAlert, offlineReady: false },
  { to: '/profile', label: 'Account Hub', icon: User, offlineReady: true },
  { to: '/dashboard/profile', label: 'Profile Settings', icon: Settings, offlineReady: false },
];

function SidebarContent({
  collapsed = false,
  onNavigate,
}: {
  collapsed?: boolean;
  onNavigate?: () => void;
}) {
  const { user, profile } = useAuth();
  const { isOffline } = useNetwork();

  const renderNavSection = (title: string, items: SidebarNavItem[]) => (
    <div className="space-y-1">
      {!collapsed && (
        <p className="px-3 pb-1 text-[10px] font-bold uppercase tracking-widest text-[#777078]">
          {title}
        </p>
      )}
      {items.map((item) => {
        const offlineLocked = isOffline && !item.offlineReady;
        return (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            onClick={onNavigate}
            title={
              offlineLocked
                ? `${item.label} (Requires Internet)`
                : collapsed
                  ? item.label
                  : undefined
            }
            className={({ isActive }) =>
              cn(
                'group flex items-center justify-between rounded-full px-3.5 py-2 text-[13px] font-semibold transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C9182B]',
                collapsed && 'justify-center px-2',
                isActive
                  ? 'liquid-nav-active text-white'
                  : offlineLocked
                    ? 'text-[#777078]/75 hover:bg-[#F7F3EF]/75 hover:text-[#C9182B]'
                    : 'text-[#29262B] hover:bg-[#F7F3EF]/80 hover:text-[#C9182B] hover:shadow-sm'
              )
            }
          >
            {({ isActive }) => (
              <>
                <span className="flex items-center gap-2.5 min-w-0">
                  <item.icon
                    className={cn(
                      'h-4 w-4 shrink-0 transition-colors',
                      isActive ? 'text-white' : 'text-[#343039] group-hover:text-[#C9182B]'
                    )}
                  />
                  {!collapsed && <span className="truncate">{item.label}</span>}
                </span>
                {!collapsed && offlineLocked && (
                  <WifiOff className="h-3.5 w-3.5 shrink-0 opacity-70" aria-label="Requires internet" />
                )}
              </>
            )}
          </NavLink>
        );
      })}
    </div>
  );

  return (
    <>
      <div className="space-y-4 overflow-y-auto pr-0.5">
        {renderNavSection(
          user ? 'Fare & Route Guides' : 'Public Guest Access',
          GUEST_PUBLIC_NAV
        )}

        {!user && !collapsed && (
          <div className="glass-pill-tile rounded-[22px] p-3.5 space-y-2.5">
            <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-[#343039]">
              <Lock className="h-3.5 w-3.5 text-[#C9182B]" />
              <span>Sign In to Unlock More</span>
            </div>
            <p className="text-[11px] leading-snug text-[#777078]">
              Unlock Live GPS Map, Trips, Safety &amp; Fare Reporting.
            </p>
            <div className="grid grid-cols-2 gap-1.5">
              <Link
                to="/login"
                onClick={onNavigate}
                className="liquid-btn-primary inline-flex items-center justify-center whitespace-nowrap rounded-full px-2.5 py-1.5 text-[11px] font-bold text-white transition"
              >
                Sign In
              </Link>
              <Link
                to="/register"
                onClick={onNavigate}
                className="liquid-btn-secondary inline-flex items-center justify-center whitespace-nowrap rounded-full px-2.5 py-1.5 text-[11px] font-bold transition"
              >
                Register
              </Link>
            </div>
          </div>
        )}

        {user && renderNavSection('Commuter Tools', COMMUTER_NAV)}
      </div>

      {!collapsed && (
        <div className="glass-pill-tile rounded-[22px] p-3">
          {user ? (
            <div className="space-y-0.5">
              <p className="truncate text-xs font-bold text-[#29262B]">
                {profile?.full_name || user.email?.split('@')[0]}
              </p>
              <p className="text-[10px] font-bold uppercase tracking-wider text-[#C9182B]">
                Citizen Commuter
              </p>
            </div>
          ) : (
            <div>
              <p className="font-display text-xs font-extrabold italic text-[#B51224]">
                Tamang Pamasahe.
              </p>
              <p className="font-display text-xs font-extrabold italic text-[#C9182B]">
                Ligtas na Biyahe.
              </p>
            </div>
          )}
        </div>
      )}
    </>
  );
}

export function AppSidebar({ collapsed }: { collapsed: boolean }) {
  return (
    <aside
      aria-label="Desktop navigation sidebar"
      className={cn(
        'desktop-sidebar-shell shrink-0 transition-all duration-300',
        collapsed ? 'w-[84px]' : 'w-60 xl:w-64'
      )}
    >
      <div className="glass-surface liquid-glass-sheen sticky top-[88px] flex h-[calc(100vh-110px)] flex-col justify-between rounded-[30px] p-3.5">
        <SidebarContent collapsed={collapsed} />
      </div>
    </aside>
  );
}
