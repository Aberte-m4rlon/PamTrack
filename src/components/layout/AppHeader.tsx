import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Bell,
  ChevronDown,
  LayoutDashboard,
  LogIn,
  LogOut,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  Search,
  Settings,
  ShieldAlert,
  ShieldCheck,
  Square,
  Truck,
  UserCheck,
  WifiOff,
  X,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useGps } from '@/contexts/GpsContext';
import { useNetwork } from '@/contexts/NetworkContext';
import { useNotifications } from '@/hooks/useReferenceData';
import { formatDateTimeSafe } from '@/lib/utils';
import { GlassButton } from '@/components/glass/GlassPrimitives';

export function AppHeader({
  sidebarCollapsed,
  onToggleSidebar,
  mobileDrawerOpen,
  onToggleMobileDrawer,
}: {
  sidebarCollapsed: boolean;
  onToggleSidebar: () => void;
  mobileDrawerOpen?: boolean;
  onToggleMobileDrawer?: () => void;
}) {
  const { user, profile, role, isAdmin, isOperator, signOut } = useAuth();
  const { trackingActive, nearestMunicipality, stopTracking } = useGps();
  const { isOffline } = useNetwork();
  const { data: notifications } = useNotifications();
  const navigate = useNavigate();

  const [notifOpen, setNotifOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuContainerRef = useRef<HTMLDivElement | null>(null);

  const unreadCount = (notifications ?? []).filter((n) => !n.is_read).length;

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (
        menuContainerRef.current &&
        !menuContainerRef.current.contains(e.target as Node)
      ) {
        setNotifOpen(false);
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  const handleLogout = async () => {
    setMenuOpen(false);
    await signOut();
    navigate('/');
  };

  return (
    <header className="sticky top-2.5 sm:top-3.5 z-40 px-2.5 sm:px-6">
      <div className="glass-header liquid-glass-sheen mx-auto flex max-w-[1480px] items-center justify-between gap-2 rounded-[26px] sm:rounded-full px-3 py-2 sm:px-4">
        <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
          {onToggleMobileDrawer && (
            <button
              type="button"
              onClick={onToggleMobileDrawer}
              aria-label={mobileDrawerOpen ? 'Close navigation menu' : 'Open navigation menu'}
              aria-expanded={mobileDrawerOpen}
              className="md:hidden liquid-btn-glass flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[#DC2626] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#DC2626]"
            >
              {mobileDrawerOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
            </button>
          )}

          <button
            type="button"
            onClick={onToggleSidebar}
            className="desktop-sidebar-shell liquid-btn-glass rounded-full p-2 text-[#DC2626] transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#DC2626]"
            aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {sidebarCollapsed ? (
              <PanelLeftOpen className="h-4 w-4" />
            ) : (
              <PanelLeftClose className="h-4 w-4" />
            )}
          </button>

          <Link to="/" className="flex items-center gap-2.5 group min-w-0">
            <div className="relative flex h-9 w-9 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-full border border-white/95 bg-white/75 p-0.5 shadow-sm transition-transform group-hover:scale-105">
              <img
                src="/assets/pamasahe-tracker-icon.png"
                alt="Pamasahe Tracker Logo"
                className="h-full w-full rounded-full object-contain"
              />
            </div>
            <div className="min-w-0">
              <span className="block truncate font-display text-sm font-extrabold tracking-tight text-[#24191D] sm:text-base">
                Pamasahe Tracker
              </span>
              <span className="hidden truncate text-[11px] font-semibold text-[#78716C] sm:block">
                Oriental Mindoro •{' '}
                <span className="text-[#DC2626]">Tamang Pamasahe. Ligtas na Biyahe.</span>
              </span>
            </div>
          </Link>
        </div>

        <div ref={menuContainerRef} className="relative flex items-center gap-1.5 sm:gap-2 shrink-0">
          {isOffline && (
            <div
              role="status"
              className="inline-flex items-center gap-1.5 rounded-full border border-white/90 bg-[#FFE4E6]/85 backdrop-blur-md px-2.5 py-1 text-[11px] font-bold text-[#B91C1C] shadow-sm"
              title="Offline Mode: showing cached fare tools only"
            >
              <WifiOff className="h-3.5 w-3.5 shrink-0" />
              <span>Offline</span>
            </div>
          )}

          {trackingActive && (
            <div className="liquid-btn-glass flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold text-[#24191D]">
              <span className="h-2 w-2 rounded-full bg-[#16A34A] animate-pulse" />
              <span className="hidden sm:inline text-[#16A34A]">
                GPS Active
                {nearestMunicipality?.withinOrientalMindoro
                  ? ` (${nearestMunicipality.municipality.name})`
                  : ''}
              </span>
              <button
                type="button"
                onClick={stopTracking}
                title="Stop GPS Tracking immediately"
                className="ml-0.5 inline-flex items-center gap-0.5 rounded-full bg-[#FFE4E6] px-2 py-0.5 text-[10px] font-bold text-[#B91C1C] hover:bg-[#FECACA] transition"
              >
                <Square className="h-2.5 w-2.5 fill-current" />
                Stop
              </button>
            </div>
          )}

          <Link to="/fare-search" className="hidden md:inline-flex">
            <GlassButton variant="secondary" size="sm">
              <Search className="h-3.5 w-3.5" />
              Check Fare
            </GlassButton>
          </Link>

          {user ? (
            <>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => {
                    setNotifOpen((v) => !v);
                    setMenuOpen(false);
                  }}
                  className="liquid-btn-glass relative flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-full text-[#24191D] hover:text-[#DC2626] transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#DC2626]"
                  aria-label="Notifications"
                >
                  <Bell className="h-4 w-4" />
                  {unreadCount > 0 && (
                    <span className="liquid-nav-active absolute -right-0.5 -top-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full px-1 text-[10px] font-bold text-white">
                      {unreadCount}
                    </span>
                  )}
                </button>

                {notifOpen && (
                  <div className="glass-card-strong liquid-glass-sheen absolute right-0 mt-2.5 w-72 sm:w-80 rounded-[28px] p-4 shadow-2xl z-50 space-y-3">
                    <div className="flex items-center justify-between">
                      <p className="font-display text-sm font-bold text-[#24191D]">
                        Notifications ({unreadCount} unread)
                      </p>
                      <Link
                        to="/dashboard/notifications"
                        onClick={() => setNotifOpen(false)}
                        className="text-xs font-bold text-[#DC2626] hover:underline"
                      >
                        View all →
                      </Link>
                    </div>
                    {(notifications ?? []).slice(0, 4).length === 0 ? (
                      <p className="rounded-2xl border border-white/85 bg-white/60 p-3 text-xs text-[#78716C]">
                        No notifications yet. Fare verification and vehicle status alerts appear here.
                      </p>
                    ) : (
                      <ul className="space-y-2 max-h-60 overflow-y-auto">
                        {(notifications ?? []).slice(0, 4).map((n) => (
                          <li
                            key={n.id}
                            className={`rounded-2xl p-2.5 text-xs border transition ${
                              n.is_read
                                ? 'bg-white/60 border-white/80'
                                : 'bg-[#FFE4E6]/65 border-white/95'
                            }`}
                          >
                            <p className="font-bold text-[#24191D]">{n.title}</p>
                            <p className="mt-0.5 text-[11px] text-[#78716C] line-clamp-2">
                              {n.message}
                            </p>
                            <p className="mt-1 text-[10px] text-[#A8A29E]">
                              {formatDateTimeSafe(n.created_at)}
                            </p>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
              </div>

              <div className="relative">
                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen((v) => !v);
                    setNotifOpen(false);
                  }}
                  aria-label="User profile menu"
                  className="liquid-btn-secondary flex min-h-[38px] items-center gap-2 rounded-full px-2 py-1 sm:px-3 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#DC2626]"
                >
                  <div className="liquid-nav-active flex h-7 w-7 items-center justify-center rounded-full text-white">
                    <UserCheck className="h-3.5 w-3.5" />
                  </div>
                  <div className="hidden md:block text-left">
                    <p className="text-xs font-bold leading-none text-[#24191D]">
                      {profile?.full_name || user.email?.split('@')[0]}
                    </p>
                    <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#DC2626]">
                      {role.replace('_', ' ')}
                    </p>
                  </div>
                  <ChevronDown className="hidden md:block h-3.5 w-3.5 text-[#78716C]" />
                </button>

                {menuOpen && (
                  <div className="glass-card-strong liquid-glass-sheen absolute right-0 mt-2.5 w-60 rounded-[28px] p-2.5 shadow-2xl z-50 space-y-1 text-xs font-semibold text-[#24191D]">
                    <div className="px-3 py-2 border-b border-white/75">
                      <p className="font-bold truncate">{profile?.full_name || user.email}</p>
                      <p className="text-[10px] uppercase tracking-wider text-[#DC2626]">
                        {role.replace('_', ' ')}
                      </p>
                    </div>
                    <Link
                      to="/dashboard"
                      onClick={() => setMenuOpen(false)}
                      className="flex items-center gap-2 rounded-full px-3 py-2 hover:bg-white/75 hover:text-[#DC2626] transition"
                    >
                      <LayoutDashboard className="h-3.5 w-3.5" /> Commuter Dashboard
                    </Link>
                    <Link
                      to="/safety"
                      onClick={() => setMenuOpen(false)}
                      className="flex items-center gap-2 rounded-full px-3 py-2 hover:bg-white/75 hover:text-[#DC2626] transition"
                    >
                      <ShieldAlert className="h-3.5 w-3.5" /> Safety Center
                    </Link>
                    {isOperator && (
                      <Link
                        to="/operator"
                        onClick={() => setMenuOpen(false)}
                        className="flex items-center gap-2 rounded-full px-3 py-2 hover:bg-white/75 hover:text-[#DC2626] transition"
                      >
                        <Truck className="h-3.5 w-3.5" /> Operator Portal
                      </Link>
                    )}
                    {isAdmin && (
                      <Link
                        to="/admin"
                        onClick={() => setMenuOpen(false)}
                        className="flex items-center gap-2 rounded-full px-3 py-2 hover:bg-white/75 hover:text-[#DC2626] transition"
                      >
                        <ShieldCheck className="h-3.5 w-3.5" /> Administrator Portal
                      </Link>
                    )}
                    <Link
                      to="/dashboard/profile"
                      onClick={() => setMenuOpen(false)}
                      className="flex items-center gap-2 rounded-full px-3 py-2 hover:bg-white/75 hover:text-[#DC2626] transition"
                    >
                      <Settings className="h-3.5 w-3.5" /> Profile Settings
                    </Link>
                    <button
                      type="button"
                      onClick={handleLogout}
                      className="flex w-full items-center gap-2 rounded-full px-3 py-2 text-[#B91C1C] hover:bg-[#FFE4E6]/75 transition"
                    >
                      <LogOut className="h-3.5 w-3.5" /> Sign Out
                    </button>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="flex items-center gap-1.5 sm:gap-2">
              <Link to="/login">
                <GlassButton variant="secondary" size="sm">
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
  );
}
