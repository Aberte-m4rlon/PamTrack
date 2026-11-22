import React from 'react';
import { Link, NavLink } from 'react-router-dom';
import {
  Activity,
  BarChart3,
  Bell,
  Building,
  Building2,
  Car,
  FileCheck2,
  FileText,
  Heart,
  Home,
  Info,
  LayoutDashboard,
  LocateFixed,
  Lock,
  Map as MapIcon,
  MapPin,
  MessageSquarePlus,
  Navigation,
  Radio,
  Search,
  Send,
  Settings,
  ShieldAlert,
  ShieldCheck,
  SlidersHorizontal,
  Table2,
  Truck,
  User,
  Users,
  WifiOff,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useNetwork } from '@/contexts/NetworkContext';
import { useNotifications } from '@/hooks/useReferenceData';
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
  { to: '/about', label: 'About & Sources', icon: Info, offlineReady: true },
];

const MEMBER_EXPLORER_EXTRA: SidebarNavItem[] = [
  { to: '/live-map', label: 'Live GPS Map', icon: LocateFixed, offlineReady: false },
  { to: '/nearby', label: 'Nearby Stops', icon: Navigation, offlineReady: false },
  { to: '/report-vehicle', label: 'Report a Vehicle', icon: Car, offlineReady: false },
  { to: '/authorities', label: 'Authority Directory', icon: Building, offlineReady: false },
];

const AUTH_PUBLIC_NAV: SidebarNavItem[] = [
  ...GUEST_PUBLIC_NAV.slice(0, 3),
  ...MEMBER_EXPLORER_EXTRA.slice(0, 2),
  ...GUEST_PUBLIC_NAV.slice(3, 5),
  ...MEMBER_EXPLORER_EXTRA.slice(2),
  GUEST_PUBLIC_NAV[5],
];

const COMMUTER_NAV: SidebarNavItem[] = [
  { to: '/dashboard', label: 'Commuter Dashboard', icon: LayoutDashboard, end: true },
  { to: '/trips', label: 'Live Trip Monitor', icon: Radio, end: true, offlineReady: true },
  { to: '/trips/analytics', label: 'Trip Analytics', icon: BarChart3 },
  { to: '/safety', label: 'Safety & Contacts', icon: ShieldAlert },
  { to: '/dashboard/vehicle-reports', label: 'My Vehicle Reports', icon: Car },
  { to: '/dashboard/reports', label: 'My Fare Reports', icon: MessageSquarePlus },
  { to: '/dashboard/favorites', label: 'Favorite Routes', icon: Heart },
  { to: '/dashboard/notifications', label: 'Notifications', icon: Bell },
  { to: '/dashboard/profile', label: 'Profile Settings', icon: Settings },
];

const OPERATOR_NAV: SidebarNavItem[] = [
  { to: '/operator', label: 'Operator Portal', icon: Truck, end: true },
];

const ADMIN_NAV: SidebarNavItem[] = [
  { to: '/admin', label: 'Admin Dashboard', icon: ShieldCheck, end: true },
  { to: '/admin/verification', label: 'Fare Verification', icon: FileCheck2 },
  { to: '/admin/fares', label: 'Fare Management', icon: Table2 },
  { to: '/admin/reports', label: 'Community Reports', icon: MessageSquarePlus },
  { to: '/admin/routes', label: 'Route Management', icon: MapIcon },
  { to: '/admin/municipalities', label: 'Municipalities', icon: Building2 },
  { to: '/admin/operators', label: 'Transport Operators', icon: Truck },
  { to: '/admin/trip-analytics', label: 'Trip Analytics', icon: Activity },
  { to: '/admin/location-analytics', label: 'Location & Stops', icon: LocateFixed },
  { to: '/admin/safety-reports', label: 'Safety Reports', icon: ShieldAlert },
  { to: '/admin/vehicle-reports', label: 'Vehicle Reports', icon: Car },
  { to: '/admin/driver-complaints', label: 'Driver Complaints', icon: User },
  { to: '/admin/fare-violations', label: 'Fare Violations', icon: ShieldAlert },
  { to: '/admin/vehicle-safety-incidents', label: 'Safety Incidents', icon: ShieldAlert },
  { to: '/admin/agencies', label: 'Agency Directory', icon: Building },
  { to: '/admin/agency-referrals', label: 'Agency Referrals', icon: Send },
  { to: '/admin/vehicle-analytics', label: 'Vehicle Analytics', icon: BarChart3 },
  { to: '/admin/users', label: 'User Management', icon: Users },
  { to: '/admin/notifications', label: 'Broadcast Notices', icon: Bell },
  { to: '/admin/audit-logs', label: 'Audit Logs', icon: FileText },
  { to: '/admin/settings', label: 'System Settings', icon: SlidersHorizontal },
];

function SidebarContent({
  collapsed = false,
  onNavigate,
}: {
  collapsed?: boolean;
  onNavigate?: () => void;
}) {
  const { user, profile, role, isAdmin, isOperator } = useAuth();
  const { isOffline } = useNetwork();
  const { data: notifications } = useNotifications();
  const unreadCount = (notifications ?? []).filter((n) => !n.is_read).length;

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
                {!collapsed && !offlineLocked && item.to === '/dashboard/notifications' && unreadCount > 0 && (
                  <span className="liquid-nav-active rounded-full px-2 py-0.5 text-[10px] font-bold text-white">
                    {unreadCount}
                  </span>
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
          user ? 'Public & Explorer' : 'Public Guest Access',
          user ? AUTH_PUBLIC_NAV : GUEST_PUBLIC_NAV
        )}

        {!user && !collapsed && (
          <div className="glass-pill-tile rounded-[22px] p-3.5 space-y-2.5">
            <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-[#343039]">
              <Lock className="h-3.5 w-3.5 text-[#C9182B]" />
              <span>Sign In to Unlock More</span>
            </div>
            <p className="text-[11px] leading-snug text-[#777078]">
              Unlock GPS Map, Trips, Safety &amp; Reporting.
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

        {user && renderNavSection('Commuter & GPS', COMMUTER_NAV)}
        {isOperator && renderNavSection('Transport Operator', OPERATOR_NAV)}
        {isAdmin && renderNavSection('Administrator Portal', ADMIN_NAV)}
      </div>

      {!collapsed && (
        <div className="glass-pill-tile rounded-[22px] p-3">
          {user ? (
            <div className="space-y-0.5">
              <p className="truncate text-xs font-bold text-[#29262B]">
                {profile?.full_name || user.email?.split('@')[0]}
              </p>
              <p className="text-[10px] font-bold uppercase tracking-wider text-[#C9182B]">
                {role.replace('_', ' ')}
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
        'desktop-sidebar-shell shrink-0 transition-all duration-200',
        collapsed ? 'w-20' : 'w-52 lg:w-60 xl:w-64'
      )}
    >
      <div className="sticky top-24 flex max-h-[calc(100vh-7.25rem)] flex-col justify-between gap-4 glass-surface liquid-glass-sheen rounded-[30px] p-3.5">
        <SidebarContent collapsed={collapsed} />
      </div>
    </aside>
  );
}
