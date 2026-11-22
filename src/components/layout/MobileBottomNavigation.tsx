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
                'flex min-h-[50px] flex-col items-center justify-center gap-0.5 rounded-2xl px-1 py-1 text-[11px] font-bold transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#DC2626]',
                isActive
                  ? 'text-[#B91C1C] font-extrabold'
                  : 'text-[#4B3B40] hover:text-[#DC2626]'
              )
            }
          >
            {({ isActive }) => (
              <>
                <span
                  className={cn(
                    'relative flex h-7 w-11 items-center justify-center rounded-full transition-all',
                    isActive ? 'liquid-nav-active text-white' : 'bg-transparent text-current'
                  )}
                >
                  <tab.icon className="h-4 w-4 shrink-0" />
                  {offlineLocked ? (
                    <span
                      aria-hidden="true"
                      className="absolute -right-0.5 -top-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-[#FFE4E6] text-[#B91C1C] ring-1 ring-white"
                    >
                      <WifiOff className="h-2 w-2" />
                    </span>
                  ) : authLocked ? (
                    <span
                      aria-hidden="true"
                      className="absolute -right-0.5 -top-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-[#FFE4E6] text-[#B91C1C] ring-1 ring-white"
                    >
                      <Lock className="h-2 w-2" />
                    </span>
                  ) : null}
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
