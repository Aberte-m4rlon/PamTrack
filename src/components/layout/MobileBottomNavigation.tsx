import { NavLink, useLocation } from 'react-router-dom';
import { LayoutGroup, motion } from 'framer-motion';
import { Compass, Home, LocateFixed, Lock, Radio, User, WifiOff } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useNetwork } from '@/contexts/NetworkContext';
import { cn } from '@/lib/utils';

const MOBILE_BOTTOM_TABS = [
  { to: '/', label: 'Home', icon: Home, end: true, requiresAuth: false, offlineReady: true, matchPrefixes: [] as string[] },
  {
    to: '/fare-search',
    label: 'Hanapin',
    icon: Compass,
    requiresAuth: false,
    offlineReady: true,
    matchPrefixes: ['/fare-search', '/fare-matrix', '/municipalities', '/routes', '/fares'],
  },
  {
    to: '/live-map',
    label: 'Live Map',
    icon: LocateFixed,
    requiresAuth: true,
    offlineReady: false,
    matchPrefixes: ['/live-map'],
  },
  {
    to: '/trips',
    label: 'Biyahe',
    icon: Radio,
    requiresAuth: true,
    offlineReady: true,
    matchPrefixes: ['/trips', '/shared-trip'],
  },
  {
    to: '/profile',
    label: 'Profile',
    icon: User,
    requiresAuth: false,
    offlineReady: true,
    matchPrefixes: ['/profile', '/login', '/register', '/forgot-password', '/reset-password', '/safety', '/dashboard'],
  },
];

export function MobileBottomNavigation() {
  const { user } = useAuth();
  const { isOffline } = useNetwork();
  const location = useLocation();

  return (
    <>
      <div className="mobile-bottom-dock-scrim md:hidden" aria-hidden="true" />
      <LayoutGroup id="mobile-bottom-nav">
        <nav aria-label="Mobile bottom navigation" className="mobile-bottom-nav">
          {MOBILE_BOTTOM_TABS.map((tab) => {
            const offlineLocked = isOffline && !tab.offlineReady;
            const authLocked = !user && tab.requiresAuth;
            const groupMatched = tab.end
              ? location.pathname === '/'
              : tab.matchPrefixes.some(
                  (p) => location.pathname === p || location.pathname.startsWith(`${p}/`)
                );

            return (
              <NavLink
                key={tab.to}
                to={tab.to}
                end={tab.end}
                className={({ isActive }) => {
                  const active = isActive || groupMatched;
                  return cn(
                    'relative flex min-h-[50px] flex-col items-center justify-center gap-0.5 rounded-[22px] px-1 py-1 text-[11px] font-bold transition-[color,background-color,transform] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C9182B]',
                    active
                      ? 'bg-[#F8E7EA]/75 text-[#B51224] font-extrabold shadow-[inset_0_1.5px_1.5px_rgba(255,255,255,0.95),0_4px_14px_-4px_rgba(201,24,43,0.18)]'
                      : 'text-[#29262B] hover:text-[#C9182B]'
                  );
                }}
              >
                {({ isActive }) => {
                  const active = isActive || groupMatched;
                  return (
                    <>
                      {offlineLocked ? (
                        <span
                          aria-hidden="true"
                          className="absolute right-1.5 top-1 z-10 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-[#C9182B] text-white ring-1 ring-white shadow-sm"
                        >
                          <WifiOff className="h-2 w-2" />
                        </span>
                      ) : authLocked ? (
                        <span
                          aria-hidden="true"
                          title="Kailangan mag-sign in"
                          className="absolute right-1.5 top-1 z-10 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-white/95 text-[#B51224] border border-[#E9E5E8] shadow-sm"
                        >
                          <Lock className="h-2 w-2" />
                        </span>
                      ) : null}
                      <span
                        className={cn(
                          'relative isolate flex h-7 w-10 items-center justify-center rounded-full transition-colors duration-200',
                          active ? 'text-white' : 'bg-transparent text-current'
                        )}
                      >
                        {active && (
                          <motion.span
                            layoutId="mobile-bottom-active-pill"
                            transition={{ type: 'spring', stiffness: 430, damping: 30, mass: 0.78 }}
                            className="liquid-nav-active liquid-pill-fill z-0 rounded-full"
                          />
                        )}
                        <tab.icon className="relative z-10 h-4 w-4 shrink-0" />
                      </span>
                      <span className="truncate leading-tight">{tab.label}</span>
                    </>
                  );
                }}
              </NavLink>
            );
          })}
        </nav>
      </LayoutGroup>
    </>
  );
}
