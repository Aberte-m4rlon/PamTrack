import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ChevronDown,
  LogIn,
  LogOut,
  MessageSquarePlus,
  PanelLeftClose,
  PanelLeftOpen,
  Radio,
  Search,
  Settings,
  ShieldAlert,
  Square,
  User,
  UserCheck,
  WifiOff,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useGps } from '@/contexts/GpsContext';
import { useNetwork } from '@/contexts/NetworkContext';
import { GlassButton } from '@/components/glass/GlassPrimitives';

export function AppHeader({
  sidebarCollapsed,
  onToggleSidebar,
}: {
  sidebarCollapsed: boolean;
  onToggleSidebar: () => void;
}) {
  const { user, profile, signOut } = useAuth();
  const { trackingActive, nearestMunicipality, stopTracking } = useGps();
  const { isOffline } = useNetwork();
  const navigate = useNavigate();
  const location = useLocation();
  const isLoginRoute = location.pathname === '/login';

  const [menuOpen, setMenuOpen] = useState(false);
  const menuContainerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (
        menuContainerRef.current &&
        !menuContainerRef.current.contains(e.target as Node)
      ) {
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
    <header className="sticky top-0 z-40 mobile-header-scrim md:bg-none md:top-3 px-2.5 pt-2 pb-1 sm:px-5 sm:pt-3 sm:pb-0 lg:px-6">
      <div className="glass-header liquid-glass-sheen mx-auto flex max-w-[1480px] items-center justify-between gap-2 rounded-full px-2.5 py-1.5 sm:px-4 sm:py-2">
        <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
          <button
            type="button"
            onClick={onToggleSidebar}
            className="desktop-sidebar-shell liquid-btn-glass rounded-full p-2 text-[#C9182B] transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C9182B]"
            aria-label={sidebarCollapsed ? 'Buksan ang sidebar' : 'Isara ang sidebar'}
            title={sidebarCollapsed ? 'Buksan ang sidebar' : 'Isara ang sidebar'}
          >
            {sidebarCollapsed ? (
              <PanelLeftOpen className="h-4 w-4" />
            ) : (
              <PanelLeftClose className="h-4 w-4" />
            )}
          </button>

          <Link to="/" className="flex items-center gap-2 sm:gap-2.5 group min-w-0">
            <div className="relative flex h-9 w-9 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-xl border border-white/95 bg-white/75 p-0.5 shadow-sm transition-transform duration-200 group-hover:scale-105">
              <img
                src="/assets/pamasahe-tracker-icon.png"
                alt="Pamasahe Tracker Logo"
                className="h-full w-full rounded-[10px] object-contain"
              />
            </div>
            <div className="min-w-0">
              <span className="block truncate font-display text-[13.5px] sm:text-base font-extrabold tracking-tight text-[#29262B] leading-tight">
                Pamasahe Tracker
              </span>
              <span className="block truncate text-[10.5px] sm:text-[11px] font-semibold text-[#5B555E] leading-tight">
                Oriental Mindoro
                <span className="hidden sm:inline text-[#C9182B]">
                  {' '}
                  • Tamang Pamasahe. Ligtas na Biyahe.
                </span>
              </span>
            </div>
          </Link>
        </div>

        <div ref={menuContainerRef} className="relative flex items-center gap-1 sm:gap-2 shrink-0">
          {isOffline && (
            <div
              role="status"
              className="liquid-reveal-enter inline-flex items-center gap-1 rounded-full border border-white/90 bg-[#F8E7EA]/85 backdrop-blur-md px-2 py-1 text-[11px] font-bold text-[#B51224] shadow-sm"
              title="Offline Mode: gumagana pa rin ang naka-save na pamasahe at offline trip monitor"
            >
              <WifiOff className="h-3.5 w-3.5 shrink-0" />
              <span className="hidden min-[380px]:inline">Offline</span>
            </div>
          )}

          {trackingActive && (
            <div className="liquid-btn-glass liquid-reveal-enter flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold text-[#29262B]">
              <span className="h-2 w-2 rounded-full bg-[#C9182B] animate-pulse" />
              <span className="hidden sm:inline text-[#B51224]">
                Naka-on GPS
                {nearestMunicipality?.withinOrientalMindoro
                  ? ` (${nearestMunicipality.municipality.name})`
                  : ''}
              </span>
              <button
                type="button"
                onClick={stopTracking}
                title="Ihinto muna ang GPS Tracking"
                className="ml-0.5 inline-flex items-center gap-0.5 rounded-full bg-[#F8E7EA] px-2 py-0.5 text-[10px] font-bold text-[#B51224] hover:bg-[#E9E5E8] transition-all duration-150 active:scale-95"
              >
                <Square className="h-2.5 w-2.5 fill-current" />
                Ihinto
              </button>
            </div>
          )}

          <Link to="/fare-search" className="hidden md:inline-flex">
            <GlassButton variant="secondary" size="sm">
              <Search className="h-3.5 w-3.5 text-[#C9182B]" />
              Check Pamasahe
            </GlassButton>
          </Link>

          {user ? (
            <div className="relative">
              <button
                type="button"
                onClick={() => setMenuOpen((v) => !v)}
                aria-label="Menu ng profile"
                aria-expanded={menuOpen}
                className="liquid-btn-secondary flex min-h-[38px] items-center gap-2 rounded-full px-2 py-1 sm:px-3 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C9182B]"
              >
                <div className="liquid-nav-active flex h-7 w-7 items-center justify-center rounded-full text-white">
                  <UserCheck className="h-3.5 w-3.5" />
                </div>
                <div className="hidden md:block text-left">
                  <p className="text-xs font-bold leading-none text-[#29262B]">
                    {profile?.full_name || user.email?.split('@')[0]}
                  </p>
                  <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#C9182B]">
                    Pasahero
                  </p>
                </div>
                <ChevronDown
                  className={`hidden md:block h-3.5 w-3.5 text-[#777078] transition-transform duration-200 ${
                    menuOpen ? 'rotate-180' : ''
                  }`}
                />
              </button>

              <AnimatePresence>
                {menuOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -8, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -6, scale: 0.96 }}
                    transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
                    className="glass-card-strong liquid-glass-sheen absolute right-0 mt-2.5 w-[calc(100vw-2rem)] max-w-[15rem] rounded-[28px] p-2.5 shadow-2xl z-50 space-y-1 text-xs font-semibold text-[#29262B]"
                  >
                    <div className="px-3 py-2 border-b border-white/75">
                      <p className="font-bold truncate">{profile?.full_name || user.email}</p>
                      <p className="text-[10px] uppercase tracking-wider text-[#C9182B]">
                        Account ng Pasahero
                      </p>
                    </div>
                    <Link
                      to="/profile"
                      onClick={() => setMenuOpen(false)}
                      className="flex items-center gap-2 rounded-full px-3 py-2 hover:bg-white/75 hover:text-[#C9182B] transition-all duration-150 active:scale-95"
                    >
                      <User className="h-3.5 w-3.5" /> Account Hub
                    </Link>
                    <Link
                      to="/trips"
                      onClick={() => setMenuOpen(false)}
                      className="flex items-center gap-2 rounded-full px-3 py-2 hover:bg-white/75 hover:text-[#C9182B] transition-all duration-150 active:scale-95"
                    >
                      <Radio className="h-3.5 w-3.5" /> Live Trip Monitor
                    </Link>
                    <Link
                      to="/dashboard/reports"
                      onClick={() => setMenuOpen(false)}
                      className="flex items-center gap-2 rounded-full px-3 py-2 hover:bg-white/75 hover:text-[#C9182B] transition-all duration-150 active:scale-95"
                    >
                      <MessageSquarePlus className="h-3.5 w-3.5" /> Mag-report ng Pamasahe
                    </Link>
                    <Link
                      to="/safety"
                      onClick={() => setMenuOpen(false)}
                      className="flex items-center gap-2 rounded-full px-3 py-2 hover:bg-white/75 hover:text-[#C9182B] transition-all duration-150 active:scale-95"
                    >
                      <ShieldAlert className="h-3.5 w-3.5" /> Safety at Contacts
                    </Link>
                    <Link
                      to="/dashboard/profile"
                      onClick={() => setMenuOpen(false)}
                      className="flex items-center gap-2 rounded-full px-3 py-2 hover:bg-white/75 hover:text-[#C9182B] transition-all duration-150 active:scale-95"
                    >
                      <Settings className="h-3.5 w-3.5" /> Settings ng Profile
                    </Link>
                    <button
                      type="button"
                      onClick={handleLogout}
                      className="flex w-full items-center gap-2 rounded-full px-3 py-2 text-[#B51224] hover:bg-[#F8E7EA]/75 transition-all duration-150 active:scale-95"
                    >
                      <LogOut className="h-3.5 w-3.5" /> Mag-sign Out
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ) : !isLoginRoute ? (
            <div className="flex items-center gap-1.5 sm:gap-2">
              <Link to="/login">
                <GlassButton variant="secondary" size="sm">
                  <LogIn className="h-3.5 w-3.5 text-[#C9182B]" />
                  Mag-sign In
                </GlassButton>
              </Link>
              <Link to="/register" className="hidden sm:inline-flex">
                <GlassButton variant="primary" size="sm">
                  Mag-register
                </GlassButton>
              </Link>
            </div>
          ) : (
            <Link to="/register" className="inline-flex">
              <GlassButton variant="secondary" size="sm">
                Mag-register
              </GlassButton>
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
