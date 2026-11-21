import { NavLink } from 'react-router-dom';
import { Compass, Home, LocateFixed, Radio, User } from 'lucide-react';
import { cn } from '@/lib/utils';

const MOBILE_BOTTOM_TABS = [
  { to: '/', label: 'Home', icon: Home, end: true },
  { to: '/fare-search', label: 'Explore', icon: Compass },
  { to: '/live-map', label: 'Live Map', icon: LocateFixed },
  { to: '/trips', label: 'Trips', icon: Radio },
  { to: '/profile', label: 'Profile', icon: User },
];

export function MobileBottomNavigation() {
  return (
    <nav aria-label="Mobile bottom navigation" className="mobile-bottom-nav">
      {MOBILE_BOTTOM_TABS.map((tab) => (
        <NavLink
          key={tab.to}
          to={tab.to}
          end={tab.end}
          className={({ isActive }) =>
            cn(
              'flex min-h-[50px] flex-col items-center justify-center gap-0.5 rounded-2xl px-1 py-1 text-[11px] font-bold transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#DC2626]',
              isActive ? 'text-[#DC2626]' : 'text-[#78716C] hover:text-[#DC2626]'
            )
          }
        >
          {({ isActive }) => (
            <>
              <span
                className={cn(
                  'flex h-7 w-10 items-center justify-center rounded-xl transition-all',
                  isActive
                    ? 'bg-gradient-to-br from-[#DC2626] to-[#B91C1C] text-white shadow-sm shadow-[#DC2626]/25'
                    : 'bg-transparent text-current'
                )}
              >
                <tab.icon className="h-4 w-4 shrink-0" />
              </span>
              <span className="truncate leading-tight">{tab.label}</span>
            </>
          )}
        </NavLink>
      ))}
    </nav>
  );
}
