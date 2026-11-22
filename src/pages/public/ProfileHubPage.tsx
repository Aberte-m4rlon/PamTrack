import { Link } from 'react-router-dom';
import {
  ChevronRight,
  Compass,
  LocateFixed,
  Lock,
  LogIn,
  LogOut,
  Map as MapIcon,
  MapPin,
  MessageSquarePlus,
  Radio,
  Settings,
  ShieldAlert,
  Table2,
  UserPlus,
  WifiOff,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useNetwork } from '@/contexts/NetworkContext';
import { GpsConsentCard } from '@/components/gps/GpsConsentCard';
import { GlassButton, GlassCard } from '@/components/glass/GlassPrimitives';

interface HubLinkItem {
  to: string;
  label: string;
  desc: string;
  icon: React.ComponentType<{ className?: string }>;
  offlineReady?: boolean;
}

export function ProfileHubPage() {
  const { user, profile, signOut } = useAuth();
  const { isOffline } = useNetwork();

  const publicAvailableLinks: HubLinkItem[] = [
    {
      to: '/fare-search',
      label: 'Fare Finder',
      desc: 'Search verified fares & estimates',
      icon: Compass,
      offlineReady: true,
    },
    {
      to: '/fare-matrix',
      label: 'Fare Matrix',
      desc: 'Full Oriental Mindoro fare table',
      icon: Table2,
      offlineReady: true,
    },
    {
      to: '/routes',
      label: 'Route Map',
      desc: '15-LGU OpenStreetMap corridor explorer',
      icon: MapIcon,
      offlineReady: false,
    },
    {
      to: '/municipalities',
      label: '15 LGUs Directory',
      desc: 'Calapan City & 14 municipalities',
      icon: MapPin,
      offlineReady: true,
    },
  ];

  const memberLinks: HubLinkItem[] = [
    {
      to: '/live-map',
      label: 'Live GPS Map',
      desc: 'Open real-time map & stops',
      icon: LocateFixed,
      offlineReady: false,
    },
    {
      to: '/trips',
      label: 'Live Trip Monitor',
      desc: 'Moving GPS monitor & offline alerts',
      icon: Radio,
      offlineReady: true,
    },
    {
      to: '/dashboard/reports',
      label: 'Report Fare',
      desc: 'Submit & track fare observations',
      icon: MessageSquarePlus,
      offlineReady: false,
    },
    {
      to: '/safety',
      label: 'Safety & Contacts',
      desc: 'Trusted contacts & live trip sharing',
      icon: ShieldAlert,
      offlineReady: false,
    },
    {
      to: '/dashboard/profile',
      label: 'Profile Settings',
      desc: 'Account details & password',
      icon: Settings,
      offlineReady: false,
    },
  ];

  const unlockedLinks = user
    ? [...publicAvailableLinks, ...memberLinks]
    : publicAvailableLinks;

  return (
    <div className="space-y-4 sm:space-y-6">
      <GlassCard
        variant="rose"
        className="rounded-[28px] sm:rounded-[32px] p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
      >
        <div className="space-y-1.5 min-w-0">
          <p className="text-[11px] sm:text-xs font-bold uppercase tracking-[0.14em] text-[#29262B]/85 leading-snug">
            {user ? 'Commuter Account Hub' : 'Limited Guest Access • Sign In Required for Full Tools'}
          </p>
          <h1 className="font-display text-2xl sm:text-3xl font-extrabold tracking-tight text-[#29262B]">
            {user
              ? profile?.full_name || user.email?.split('@')[0]
              : 'Guest Commuter'}
          </h1>
          <p className="text-xs sm:text-sm leading-relaxed text-[#343039] font-medium">
            {user
              ? `${user.email} • Citizen Commuter`
              : 'While logged out, you have access to public fare lookup, fare matrix, route map, and 15 LGUs. Sign in to unlock GPS, live trips, safety contacts, and fare reporting.'}
          </p>
        </div>

        <div className="w-full sm:w-auto shrink-0 pt-0.5">
          {user ? (
            <GlassButton
              type="button"
              variant="secondary"
              size="md"
              className="w-full sm:w-auto"
              onClick={signOut}
              disabled={isOffline}
            >
              <LogOut className="h-4 w-4 text-[#C9182B]" />
              Sign Out
            </GlassButton>
          ) : (
            <div className="grid grid-cols-2 gap-2.5 sm:flex sm:flex-wrap">
              <Link to="/login" className="w-full sm:w-auto">
                <GlassButton variant="primary" size="md" className="w-full sm:w-auto" disabled={isOffline}>
                  <LogIn className="h-4 w-4 text-white" />
                  Sign In
                </GlassButton>
              </Link>
              <Link to="/register" className="w-full sm:w-auto">
                <GlassButton variant="secondary" size="md" className="w-full sm:w-auto" disabled={isOffline}>
                  <UserPlus className="h-4 w-4 text-[#C9182B]" />
                  Register
                </GlassButton>
              </Link>
            </div>
          )}
        </div>
      </GlassCard>

      {user && !isOffline && <GpsConsentCard compact />}

      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2 px-1">
          <div className="flex items-center gap-2">
            <span aria-hidden="true" className="h-4 w-1 rounded-full bg-[#C9182B]" />
            <h2 className="font-display text-base sm:text-lg font-extrabold text-[#29262B]">
              {isOffline ? 'Available Tools (Offline Mode)' : 'Unlocked Features'}
            </h2>
          </div>
          {isOffline && (
            <span className="inline-flex items-center gap-1 rounded-full bg-[#F8E7EA] px-2.5 py-0.5 text-[11px] font-bold text-[#B51224]">
              <WifiOff className="h-3 w-3" />
              Cached Offline Tools Highlighted
            </span>
          )}
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {unlockedLinks.map((item) => {
            const offlineLocked = isOffline && !item.offlineReady;
            return (
              <Link key={item.to} to={item.to} className="block group">
                <div
                  className={`liquid-feature-card liquid-card-enter rounded-[26px] sm:rounded-[28px] p-3.5 sm:p-4 flex items-center justify-between gap-3 h-full ${
                    offlineLocked ? 'opacity-65' : ''
                  }`}
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className="liquid-icon-ring flex h-11 w-11 sm:h-12 sm:w-12 shrink-0 items-center justify-center rounded-full text-[#C9182B]">
                      <item.icon className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-display font-extrabold text-sm sm:text-[15px] text-[#29262B] leading-snug">
                        {item.label}
                      </h3>
                      <p className="text-xs text-[#343039] leading-snug">{item.desc}</p>
                    </div>
                  </div>
                  {offlineLocked ? (
                    <span className="shrink-0 rounded-full bg-[#F8E7EA]/90 border border-white/85 px-2.5 py-0.5 text-[10px] font-bold text-[#B51224] flex items-center gap-1">
                      <WifiOff className="h-3 w-3" />
                      Online
                    </span>
                  ) : (
                    <span className="liquid-chevron-btn flex h-8 w-8 sm:h-9 sm:w-9 shrink-0 items-center justify-center rounded-full text-[#29262B] transition-transform duration-200 group-hover:translate-x-0.5">
                      <ChevronRight className="h-4 w-4" />
                    </span>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {!user && (
        <section className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2 px-1">
            <div className="flex items-center gap-2">
              <span aria-hidden="true" className="h-4 w-1 rounded-full bg-[#C9182B]" />
              <h2 className="font-display text-base sm:text-lg font-extrabold text-[#29262B]">
                Sign In Required (Locked While Logged Out)
              </h2>
            </div>
            <Link to="/login" className="inline-flex min-h-[36px] items-center text-xs font-bold text-[#C9182B] hover:underline">
              Sign In to Unlock All →
            </Link>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {memberLinks.map((item) => (
              <Link key={item.to} to="/login" state={{ from: item.to }} className="block group">
                <div className="liquid-feature-card liquid-card-enter rounded-[26px] sm:rounded-[28px] p-3.5 sm:p-4 flex items-center justify-between gap-3 h-full">
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className="liquid-icon-ring flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-[#343039]">
                      <item.icon className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-display font-extrabold text-sm text-[#29262B] leading-snug">
                        {item.label}
                      </h3>
                      <p className="text-xs text-[#343039] leading-snug">{item.desc}</p>
                    </div>
                  </div>
                  <span className="glass-pill-tile shrink-0 inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-bold text-[#B51224]">
                    <Lock className="h-3 w-3" />
                    Locked
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
