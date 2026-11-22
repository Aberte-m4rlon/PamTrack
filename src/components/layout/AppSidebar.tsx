import React, { useEffect } from 'react';
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
  X,
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
  { to: '/trips', label: 'Live Trip Monitor', icon: Radio, end: true },
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
        <p className="px-3 pb-1 text-[10px] font-bold uppercase tracking-widest text-[#78716C]">
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
                'flex items-center justify-between rounded-full px-3.5 py-2 text-[13px] font-semibold transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#DC2626]',
                collapsed && 'justify-center px-2',
                isActive
                  ? 'liquid-nav-active text-white'
                  : offlineLocked
                    ? 'text-[#78716C]/70 hover:bg-white/55 hover:text-[#DC2626]'
                    : 'text-[#24191D]/90 hover:bg-white/70 hover:text-[#DC2626] hover:shadow-sm'
              )
            }
          >
            <span className="flex items-center gap-2.5 min-w-0">
              <item.icon className="h-4 w-4 shrink-0" />
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
            <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-[#B91C1C]">
              <Lock className="h-3.5 w-3.5" />
              <span>Sign In to Unlock More</span>
            </div>
            <p className="text-[11px] leading-snug text-[#78716C]">
              Live GPS Map, Nearby Stops, Trip Monitor, Safety Contacts, Vehicle &amp; Fare
              Reporting.
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
              <p className="truncate text-xs font-bold text-[#24191D]">
                {profile?.full_name || user.email?.split('@')[0]}
              </p>
              <p className="text-[10px] font-bold uppercase tracking-wider text-[#DC2626]">
                {role.replace('_', ' ')}
              </p>
            </div>
          ) : (
            <div>
              <p className="font-display text-xs font-extrabold italic text-[#B91C1C]">
                Tamang Pamasahe.
              </p>
              <p className="font-display text-xs font-extrabold italic text-[#DC2626]">
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

export function MobileNavigationDrawer({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="md:hidden fixed inset-0 z-50 flex">
      <button
        type="button"
        aria-label="Close navigation backdrop"
        onClick={onClose}
        className="fixed inset-0 bg-[#24191D]/30 backdrop-blur-sm"
      />
      <nav
        aria-label="Mobile navigation drawer"
        className="relative z-10 m-3 flex max-h-[calc(100vh-1.5rem)] w-[min(82vw,20rem)] flex-col justify-between gap-4 glass-card-strong liquid-glass-sheen rounded-[30px] p-4 shadow-2xl"
      >
        <div className="flex items-center justify-between border-b border-white/75 pb-3">
          <div className="flex items-center gap-2 min-w-0">
            <img
              src="/assets/pamasahe-tracker-icon.png"
              alt="Pamasahe Tracker"
              className="h-8 w-8 rounded-full border border-white/95"
            />
            <span className="truncate font-display text-sm font-extrabold text-[#24191D]">
              Pamasahe Tracker
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close navigation drawer"
            className="liquid-btn-glass rounded-full p-1.5 text-[#78716C] hover:text-[#DC2626]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <SidebarContent onNavigate={onClose} />
      </nav>
    </div>
  );
}
