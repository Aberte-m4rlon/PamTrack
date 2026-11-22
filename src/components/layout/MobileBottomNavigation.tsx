import { NavLink } from 'react-router-dom';
import { Compass, Home, LocateFixed, Lock, Radio, User, WifiOff } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useNetwork } from '@/contexts/NetworkContext';
import { cn } from '@/lib/utils';

const MOBILE_BOTTOM_TABS = [
  { to: '/', label: 'Home', icon: Home, end: true, requiresAuth: false, offlineReady: true },
  {
    to: '/fare-search',
    label: 'Explore',
    icon: Compass,
    requiresAuth: false,
    offlineReady: true,
  },
  {
    to: '/live-map',
    label: 'Live Map',
    icon: LocateFixed,
    requiresAuth: true,
    offlineReady: false,
  },
  {
    to: '/trips',
    label: 'Trips',
    icon: Radio,
    requiresAuth: true,
    offlineReady: true,
  },
  {
    to: '/profile',
    label: 'Profile',
    icon: User,
    requiresAuth: false,
    offlineReady: true,
  },
];

export function MobileBottomNavigation() {
  const { user } = useAuth();
  const { isOffline } = useNetwork();

  return (
    <nav aria-label="Mobile bottom navigation" className="mobile-bottom-nav">
      {MOBILE_BOTTOM_TABS.map((tab) => {
        const offlineLocked = isOffline && !tab.offlineReady;
        const authLocked = !user && tab.requiresAuth;

        return (
          <NavLink
            key={tab.to}
            to={tab.to}
            end={tab.end}
            className={({ isActive }) =>
              cn(
                'relative flex min-h-[52px] flex-col items-center justify-center gap-0.5 rounded-[22px] px-1 py-1 text-[11px] font-bold transition-all duration-200 ease-out active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C9182B]',
                isActive
                  ? 'bg-[#F8E7EA]/55 text-[#B51224] font-extrabold shadow-[inset_0_1.5px_1.5px_rgba(255,255,255,0.92),0_4px_14px_-4px_rgba(201,24,43,0.22)]'
                  : 'text-[#29262B] hover:text-[#C9182B]'
              )
            }
          >
            {({ isActive }) => (
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
                    title="Sign in required"
                    className="absolute right-2 top-1.5 z-10 flex h-2.5 w-2.5 items-center justify-center rounded-full bg-[#C9182B] ring-2 ring-white/95 shadow-[0_2px_6px_rgba(201,24,43,0.55)]"
                  >
                    <Lock className="sr-only" />
                  </span>
                ) : null}
                <span
                  className={cn(
                    'relative flex h-7 w-11 items-center justify-center rounded-full transition-all duration-200 ease-out',
                    isActive
                      ? 'liquid-nav-active text-white scale-[1.03]'
                      : 'bg-transparent text-current'
                  )}
                >
                  <tab.icon className="h-4 w-4 shrink-0" />
                </span>
                <span className="truncate leading-tight">{tab.label}</span>
              </>
            )}
          </NavLink>
        );
      })}
    </nav>
  );
}
