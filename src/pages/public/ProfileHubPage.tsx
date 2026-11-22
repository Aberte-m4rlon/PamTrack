import { Link } from 'react-router-dom';
import {
  BarChart3,
  Bell,
  Building,
  Car,
  Compass,
  Heart,
  Info,
  LayoutDashboard,
  LocateFixed,
  Lock,
  LogIn,
  LogOut,
  Map as MapIcon,
  MapPin,
  MessageSquarePlus,
  Navigation,
  Radio,
  Settings,
  ShieldAlert,
  ShieldCheck,
  Table2,
  Truck,
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
  const { user, profile, role, isAdmin, isOperator, signOut } = useAuth();
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
      to: '/municipalities',
      label: '15 LGUs Directory',
      desc: 'Calapan City & 14 municipalities',
      icon: MapPin,
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
      to: '/about',
      label: 'About & Sources',
      desc: 'Regulatory references & integrity rules',
      icon: Info,
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
      to: '/nearby',
      label: 'Nearby Stops',
      desc: 'Verified terminals & ports near you',
      icon: Navigation,
      offlineReady: false,
    },
    {
      to: '/report-vehicle',
      label: 'Report a Vehicle',
      desc: 'Report plate, driver, or violation',
      icon: Car,
      offlineReady: false,
    },
    {
      to: '/authorities',
      label: 'Authority Directory',
      desc: 'LTFRB, LTO, LGU & PNP HPG channels',
      icon: Building,
      offlineReady: false,
    },
    {
      to: '/dashboard',
      label: 'Commuter Dashboard',
      desc: 'Personalized summary & quick search',
      icon: LayoutDashboard,
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
      to: '/dashboard/vehicle-reports',
      label: 'My Vehicle Reports',
      desc: 'Track PT-OM complaint status & referrals',
      icon: Car,
      offlineReady: false,
    },
    {
      to: '/trips/analytics',
      label: 'Trip History & Analytics',
      desc: 'Daily/weekly/monthly travel stats',
      icon: BarChart3,
      offlineReady: false,
    },
    {
      to: '/safety',
      label: 'Safety Center & Contacts',
      desc: 'Trusted contacts & live trip sharing',
      icon: ShieldAlert,
      offlineReady: false,
    },
    {
      to: '/dashboard/reports',
      label: 'My Fare Reports',
      desc: 'Submit & track community reports',
      icon: MessageSquarePlus,
      offlineReady: false,
    },
    {
      to: '/dashboard/favorites',
      label: 'Favorite Routes',
      desc: 'Saved corridors & price alerts',
      icon: Heart,
      offlineReady: false,
    },
    {
      to: '/dashboard/notifications',
      label: 'Notifications',
      desc: 'Fare & trip alerts',
      icon: Bell,
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

  const roleLinks: HubLinkItem[] = [
    ...(isOperator
      ? [
          {
            to: '/operator',
            label: 'Operator Portal',
            desc: 'Authorized operator records',
            icon: Truck,
            offlineReady: false,
          },
        ]
      : []),
    ...(isAdmin
      ? [
          {
            to: '/admin',
            label: 'Administrator Portal',
            desc: 'Verification, analytics & governance',
            icon: ShieldCheck,
            offlineReady: false,
          },
        ]
      : []),
  ];

  const unlockedLinks = user
    ? [...publicAvailableLinks, ...memberLinks, ...roleLinks]
    : publicAvailableLinks;

  return (
    <div className="space-y-6">
      <GlassCard variant="rose" className="p-6 flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-1">
          <p className="text-xs font-bold uppercase tracking-widest text-[#F8E7EA]">
            {user ? 'Account & Features Hub' : 'Limited Guest Access • Sign In Required for Full Tools'}
          </p>
          <h1 className="font-display text-2xl font-extrabold">
            {user
              ? profile?.full_name || user.email?.split('@')[0]
              : 'Guest Commuter'}
          </h1>
          <p className="text-xs text-white/90">
            {user
              ? `${user.email} • ${role.replace('_', ' ').toUpperCase()}`
              : 'Browse public fares anytime. Sign in for GPS, trips, safety & reporting.'}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {user ? (
            <GlassButton type="button" variant="glass" size="sm" onClick={signOut} disabled={isOffline}>
              <LogOut className="h-4 w-4 text-[#C9182B]" />
              Sign Out
            </GlassButton>
          ) : (
            <>
              <Link to="/login">
                <GlassButton variant="glass" size="sm" className="text-white" disabled={isOffline}>
                  <LogIn className="h-4 w-4 text-white" />
                  Sign In
                </GlassButton>
              </Link>
              <Link to="/register">
                <GlassButton variant="secondary" size="sm" disabled={isOffline}>
                  <UserPlus className="h-4 w-4" />
                  Register
                </GlassButton>
              </Link>
            </>
          )}
        </div>
      </GlassCard>

      {user && !isOffline && <GpsConsentCard compact />}

      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2 px-1">
          <h2 className="font-display text-lg font-extrabold text-[#29262B]">
            {isOffline ? 'Available Tools (Offline Mode)' : 'Unlocked Features'}
          </h2>
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
              <Link key={item.to} to={item.to}>
                <GlassCard
                  variant="strong"
                  hoverable
                  className={`p-4 flex items-center justify-between gap-3 h-full ${
                    offlineLocked ? 'opacity-65' : ''
                  }`}
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className="glass-pill-tile rounded-2xl p-2.5 text-[#C9182B] shrink-0">
                      <item.icon className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-bold text-sm text-[#29262B] leading-snug">{item.label}</h3>
                      <p className="text-xs text-[#777078]">{item.desc}</p>
                    </div>
                  </div>
                  {offlineLocked && (
                    <span className="shrink-0 rounded-full bg-[#F8E7EA] px-2 py-0.5 text-[10px] font-bold text-[#B51224] flex items-center gap-1">
                      <WifiOff className="h-3 w-3" />
                      Online
                    </span>
                  )}
                </GlassCard>
              </Link>
            );
          })}
        </div>
      </section>

      {!user && (
        <section className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2 px-1">
            <h2 className="font-display text-lg font-extrabold text-[#29262B]">
              Sign In Required (Locked While Logged Out)
            </h2>
            <Link to="/login" className="text-xs font-bold text-[#C9182B] hover:underline">
              Sign In to Unlock All →
            </Link>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {memberLinks.slice(0, 6).map((item) => (
              <Link key={item.to} to="/login" state={{ from: item.to }}>
                <GlassCard
                  variant="panel"
                  hoverable
                  className="p-4 flex items-center justify-between gap-3 h-full border-dashed border-[#E9E5E8]/70"
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className="glass-pill-tile rounded-2xl p-2.5 text-[#777078] shrink-0">
                      <item.icon className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-bold text-sm text-[#29262B] leading-snug">{item.label}</h3>
                      <p className="text-xs text-[#777078]">{item.desc}</p>
                    </div>
                  </div>
                  <span className="glass-pill-tile shrink-0 inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold text-[#B51224]">
                    <Lock className="h-3 w-3" />
                    Locked
                  </span>
                </GlassCard>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
