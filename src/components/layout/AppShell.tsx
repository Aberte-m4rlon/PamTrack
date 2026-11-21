import React, { useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import {
  Activity,
  BarChart3,
  Bell,
  Building,
  Building2,
  Car,
  Compass,
  FileCheck2,
  FileText,
  Heart,
  Home,
  Info,
  LayoutDashboard,
  LocateFixed,
  LogIn,
  LogOut,
  Map as MapIcon,
  MapPin,
  Navigation,
  PanelLeftClose,
  PanelLeftOpen,
  Radio,
  Search,
  Send,
  Settings,
  ShieldAlert,
  ShieldCheck,
  SlidersHorizontal,
  Square,
  Table2,
  Truck,
  User,
  UserCheck,
  Users,
  MessageSquarePlus,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useGps } from '@/contexts/GpsContext';
import { useNotifications } from '@/hooks/useReferenceData';
import { cn } from '@/lib/utils';
import { GlassButton, SupabaseSetupBanner } from '@/components/glass/GlassPrimitives';

interface NavItem {
  to: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  end?: boolean;
}

const PUBLIC_NAV: NavItem[] = [
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

const COMMUTER_NAV: NavItem[] = [
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

const OPERATOR_NAV: NavItem[] = [
  { to: '/operator', label: 'Operator Portal', icon: Truck, end: true },
];

const ADMIN_NAV: NavItem[] = [
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

const MOBILE_BOTTOM_TABS: NavItem[] = [
  { to: '/', label: 'Home', icon: Home, end: true },
  { to: '/fare-search', label: 'Explore', icon: Compass },
  { to: '/live-map', label: 'Live Map', icon: LocateFixed },
  { to: '/trips', label: 'Trips', icon: Radio },
  { to: '/profile', label: 'Profile', icon: User },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const { user, profile, role, isConfigured, isAdmin, isOperator, signOut } = useAuth();
  const { trackingActive, nearestMunicipality, stopTracking } = useGps();
  const { data: notifications } = useNotifications();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const navigate = useNavigate();

  const unreadCount = (notifications ?? []).filter((n) => !n.is_read).length;

  const handleLogout = async () => {
    await signOut();
    navigate('/');
  };

  const renderNavSection = (title: string, items: NavItem[]) => (
    <div className="space-y-1">
      {!sidebarCollapsed && (
        <p className="px-3 pb-1 text-[10px] font-bold uppercase tracking-widest text-[#183329]/60">
          {title}
        </p>
      )}
      {items.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.end}
          title={sidebarCollapsed ? item.label : undefined}
          className={({ isActive }) =>
            cn(
              'flex items-center justify-between rounded-2xl px-3 py-2.5 text-sm font-semibold transition-all',
              sidebarCollapsed && 'justify-center px-2',
              isActive
                ? 'bg-[#176B4B] text-white shadow-md shadow-[#176B4B]/20'
                : 'text-[#183329]/85 hover:bg-white/60 hover:text-[#176B4B]'
            )
          }
        >
          <span className="flex items-center gap-2.5">
            <item.icon className="h-4 w-4 shrink-0" />
            {!sidebarCollapsed && <span>{item.label}</span>}
          </span>
          {!sidebarCollapsed &&
            item.to === '/dashboard/notifications' &&
            unreadCount > 0 && (
              <span className="rounded-full bg-[#10B981] px-2 py-0.5 text-[10px] font-bold text-white">
                {unreadCount}
              </span>
            )}
        </NavLink>
      ))}
    </div>
  );

  return (
    <div className="pamasahe-scenic-bg min-h-screen text-[#183329] flex flex-col mobile-safe-content-pad">
      {/* Top Frosted Header */}
      <header className="sticky top-0 z-40 border-b border-white/40 bg-white/35 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[1480px] items-center justify-between gap-2 px-3 py-2.5 sm:px-6">
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => setSidebarCollapsed((v) => !v)}
              className="desktop-sidebar-shell rounded-xl bg-white/60 p-2 text-[#176B4B] hover:bg-white transition"
              aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {sidebarCollapsed ? (
                <PanelLeftOpen className="h-4 w-4" />
              ) : (
                <PanelLeftClose className="h-4 w-4" />
              )}
            </button>

            <Link to="/" className="flex items-center gap-2.5 group">
              <img
                src="/assets/pamasahe-tracker-icon.png"
                alt="Pamasahe Tracker Logo"
                className="h-9 w-9 sm:h-10 sm:w-10 rounded-full object-contain drop-shadow-sm transition-transform group-hover:scale-105"
              />
              <div>
                <span className="block font-display text-sm font-extrabold tracking-tight text-[#183329] sm:text-lg">
                  Pamasahe Tracker
                </span>
                <span className="hidden text-[11px] font-semibold text-[#176B4B] sm:block">
                  Oriental Mindoro • Tamang Pamasahe. Ligtas na Biyahe.
                </span>
              </div>
            </Link>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            {/* Explicit Visible GPS Tracking Indicator */}
            {trackingActive && (
              <div className="flex items-center gap-1.5 rounded-full border border-emerald-400/70 bg-emerald-600/90 px-2.5 py-1 text-[11px] font-bold text-white shadow-sm">
                <span className="h-2 w-2 rounded-full bg-[#DFF7E8] animate-pulse" />
                <span className="hidden sm:inline">
                  GPS Active
                  {nearestMunicipality?.withinOrientalMindoro
                    ? ` (${nearestMunicipality.municipality.name})`
                    : ''}
                </span>
                <button
                  type="button"
                  onClick={stopTracking}
                  title="Stop GPS Tracking immediately"
                  className="ml-1 inline-flex items-center gap-0.5 rounded-full bg-white/20 px-1.5 py-0.5 text-[10px] hover:bg-white/30"
                >
                  <Square className="h-2.5 w-2.5 fill-current" />
                  Stop
                </button>
              </div>
            )}

            <Link to="/fare-search" className="hidden sm:inline-flex">
              <GlassButton variant="glass" size="sm">
                <Search className="h-3.5 w-3.5 text-[#176B4B]" />
                Check Fare
              </GlassButton>
            </Link>

            {user ? (
              <>
                <Link
                  to="/dashboard/notifications"
                  className="relative rounded-2xl bg-white/65 p-2 text-[#183329] border border-white/80 hover:bg-white transition"
                  aria-label="Notifications"
                >
                  <Bell className="h-4 w-4 text-[#176B4B]" />
                  {unreadCount > 0 && (
                    <span className="absolute -right-1 -top-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-[#10B981] px-1 text-[10px] font-bold text-white">
                      {unreadCount}
                    </span>
                  )}
                </Link>

                <Link
                  to={isAdmin ? '/admin' : '/dashboard'}
                  className="hidden md:flex items-center gap-2 rounded-2xl bg-white/65 px-3 py-1.5 border border-white/80 hover:bg-white transition"
                >
                  <UserCheck className="h-4 w-4 text-[#176B4B]" />
                  <div className="text-left">
                    <p className="text-xs font-bold leading-none text-[#183329]">
                      {profile?.full_name || user.email?.split('@')[0]}
                    </p>
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-[#24966A]">
                      {role.replace('_', ' ')}
                    </p>
                  </div>
                </Link>

                <GlassButton
                  type="button"
                  variant="glass"
                  size="sm"
                  onClick={handleLogout}
                  title="Sign out"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Logout</span>
                </GlassButton>
              </>
            ) : (
              <div className="flex items-center gap-1.5 sm:gap-2">
                <Link to="/login">
                  <GlassButton variant="glass" size="sm">
                    <LogIn className="h-3.5 w-3.5" />
                    Sign In
                  </GlassButton>
                </Link>
                <Link to="/register" className="hidden sm:inline-flex">
                  <GlassButton variant="primary" size="sm">
                    Register
                  </GlassButton>
                </Link>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Content + Desktop/Tablet Collapsible Sidebar (strictly hidden <= 768px) */}
      <div className="mx-auto flex w-full max-w-[1480px] flex-1 gap-6 px-3 py-5 sm:px-6 sm:py-6">
        <aside
          aria-label="Desktop navigation sidebar"
          className={cn(
            'desktop-sidebar-shell shrink-0 transition-all duration-200',
            sidebarCollapsed ? 'w-20' : 'w-64'
          )}
        >
          <div className="sticky top-20 space-y-5 glass-surface rounded-3xl p-3.5 max-h-[calc(100vh-6.5rem)] overflow-y-auto">
            {renderNavSection('Public Explorer', PUBLIC_NAV)}
            {user && renderNavSection('Commuter & GPS', COMMUTER_NAV)}
            {isOperator && renderNavSection('Transport Operator', OPERATOR_NAV)}
            {isAdmin && renderNavSection('Administrator Portal', ADMIN_NAV)}
          </div>
        </aside>

        {/* Main Workspace */}
        <main className="min-w-0 flex-1 space-y-5">
          {!isConfigured && <SupabaseSetupBanner compact />}
          {children}
        </main>
      </div>

      {/* Consistent Glass Footer */}
      <footer className="mt-auto border-t border-white/45 bg-white/45 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[1480px] flex-col gap-4 px-4 py-6 text-xs text-[#183329]/85 sm:px-6 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <img
              src="/assets/pamasahe-tracker-icon.png"
              alt="Pamasahe Tracker Icon"
              className="h-8 w-8 rounded-full"
            />
            <div>
              <p className="font-bold text-[#183329]">
                Pamasahe Tracker – Oriental Mindoro
              </p>
              <p>Tamang Pamasahe. Ligtas na Biyahe. • Serving Calapan City &amp; 14 Municipalities</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-4 font-semibold">
            <Link to="/about" className="hover:text-[#176B4B]">
              About
            </Link>
            <Link to="/fare-matrix" className="hover:text-[#176B4B]">
              Official Sources
            </Link>
            <Link to="/safety" className="hover:text-[#176B4B]">
              Safety Center
            </Link>
            <Link to="/privacy" className="hover:text-[#176B4B]">
              Privacy Policy
            </Link>
            <Link to="/terms" className="hover:text-[#176B4B]">
              Terms &amp; Conditions
            </Link>
            <a
              href="https://ltfrb.gov.ph/"
              target="_blank"
              rel="noreferrer"
              className="text-[#176B4B] underline underline-offset-2"
            >
              LTFRB Hotline 1342
            </a>
          </div>
        </div>
      </footer>

      {/* Fixed Mobile Bottom Navigation Bar (Strictly shown <= 768px) */}
      <nav
        aria-label="Mobile bottom navigation"
        className="mobile-bottom-nav"
      >
        {MOBILE_BOTTOM_TABS.map((tab) => (
          <NavLink
            key={tab.to}
            to={tab.to}
            end={tab.end}
            className={({ isActive }) =>
              cn(
                'flex min-h-[54px] flex-col items-center justify-center gap-0.5 rounded-2xl px-1 py-1.5 text-[11px] font-bold transition-all active:scale-95',
                isActive
                  ? 'bg-white/25 text-white shadow-sm ring-1 ring-white/50'
                  : 'text-[#DFF7E8]/85 hover:bg-white/10 hover:text-white'
              )
            }
          >
            <tab.icon className="h-5 w-5 shrink-0" />
            <span className="truncate">{tab.label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
