import React from 'react';
import { NavLink } from 'react-router-dom';
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
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useNotifications } from '@/hooks/useReferenceData';
import { cn } from '@/lib/utils';

export interface SidebarNavItem {
  to: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  end?: boolean;
}

const PUBLIC_NAV: SidebarNavItem[] = [
  { to: '/', label: 'Home', icon: Home, end: true },
  { to: '/fare-search', label: 'Fare Finder', icon: Search },
  { to: '/fare-matrix', label: 'Fare Matrix', icon: Table2 },
  { to: '/live-map', label: 'Live GPS Map', icon: LocateFixed },
  { to: '/nearby', label: 'Nearby Stops', icon: Navigation },
  { to: '/routes', label: 'Route Map', icon: MapIcon },
  { to: '/municipalities', label: '15 LGUs', icon: MapPin },
  { to: '/report-vehicle', label: 'Report a Vehicle', icon: Car },
  { to: '/authorities', label: 'Authority Directory', icon: Building },
  { to: '/about', label: 'About & Sources', icon: Info },
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

export function AppSidebar({ collapsed }: { collapsed: boolean }) {
  const { user, profile, role, isAdmin, isOperator } = useAuth();
  const { data: notifications } = useNotifications();
  const unreadCount = (notifications ?? []).filter((n) => !n.is_read).length;

  const renderNavSection = (title: string, items: SidebarNavItem[]) => (
    <div className="space-y-1">
      {!collapsed && (
        <p className="px-3 pb-1 text-[10px] font-bold uppercase tracking-widest text-[#78716C]">
          {title}
        </p>
      )}
      {items.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.end}
          title={collapsed ? item.label : undefined}
          className={({ isActive }) =>
            cn(
              'flex items-center justify-between rounded-2xl px-3 py-2.5 text-sm font-semibold transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#DC2626]',
              collapsed && 'justify-center px-2',
              isActive
                ? 'bg-gradient-to-r from-[#DC2626] to-[#B91C1C] text-white shadow-md shadow-[#DC2626]/25'
                : 'text-[#24191D]/85 hover:bg-[#FFE4E6]/75 hover:text-[#DC2626]'
            )
          }
        >
          <span className="flex items-center gap-2.5 min-w-0">
            <item.icon className="h-4 w-4 shrink-0" />
            {!collapsed && <span className="truncate">{item.label}</span>}
          </span>
          {!collapsed && item.to === '/dashboard/notifications' && unreadCount > 0 && (
            <span className="rounded-full bg-[#DC2626] px-2 py-0.5 text-[10px] font-bold text-white ring-1 ring-white/80">
              {unreadCount}
            </span>
          )}
        </NavLink>
      ))}
    </div>
  );

  return (
    <aside
      aria-label="Desktop navigation sidebar"
      className={cn(
        'desktop-sidebar-shell shrink-0 transition-all duration-200',
        collapsed ? 'w-20' : 'w-64'
      )}
    >
      <div className="sticky top-20 flex max-h-[calc(100vh-6rem)] flex-col justify-between gap-4 glass-surface rounded-3xl p-3.5">
        <div className="space-y-5 overflow-y-auto pr-0.5">
          {renderNavSection('Public Explorer', PUBLIC_NAV)}
          {user && renderNavSection('Commuter & GPS', COMMUTER_NAV)}
          {isOperator && renderNavSection('Transport Operator', OPERATOR_NAV)}
          {isAdmin && renderNavSection('Administrator Portal', ADMIN_NAV)}
        </div>

        {!collapsed && (
          <div className="rounded-2xl border border-[#FCA5A5]/45 bg-gradient-to-br from-[#FFF1F2] to-[#FFE4E6]/75 p-3">
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
      </div>
    </aside>
  );
}
