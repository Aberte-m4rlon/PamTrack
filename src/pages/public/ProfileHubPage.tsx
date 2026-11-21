import { Link } from 'react-router-dom';
import {
  BarChart3,
  Bell,
  Heart,
  LayoutDashboard,
  LocateFixed,
  LogIn,
  LogOut,
  Map as MapIcon,
  MapPin,
  MessageSquarePlus,
  Navigation,
  Settings,
  ShieldAlert,
  ShieldCheck,
  Table2,
  Truck,
  UserPlus,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { GpsConsentCard } from '@/components/gps/GpsConsentCard';
import { GlassButton, GlassCard } from '@/components/glass/GlassPrimitives';

export function ProfileHubPage() {
  const { user, profile, role, isAdmin, isOperator, signOut } = useAuth();

  const quickLinks = [
    {
      to: '/fare-matrix',
      label: 'Fare Matrix',
      desc: 'Full Oriental Mindoro fare table',
      icon: Table2,
    },
    {
      to: '/nearby',
      label: 'Nearby Stops',
      desc: 'Verified terminals & ports near you',
      icon: Navigation,
    },
    {
      to: '/routes',
      label: 'Route Map',
      desc: '15-LGU OpenStreetMap corridor explorer',
      icon: MapIcon,
    },
    {
      to: '/municipalities',
      label: '15 LGUs Directory',
      desc: 'Calapan City & 14 municipalities',
      icon: MapPin,
    },
    ...(user
      ? [
          {
            to: '/dashboard',
            label: 'Commuter Dashboard',
            desc: 'Personalized summary & quick search',
            icon: LayoutDashboard,
          },
          {
            to: '/trips/analytics',
            label: 'Trip History & Analytics',
            desc: 'Daily/weekly/monthly travel stats',
            icon: BarChart3,
          },
          {
            to: '/safety',
            label: 'Safety Center & Contacts',
            desc: 'Trusted contacts & live trip sharing',
            icon: ShieldAlert,
          },
          {
            to: '/dashboard/reports',
            label: 'My Fare Reports',
            desc: 'Submit & track community reports',
            icon: MessageSquarePlus,
          },
          {
            to: '/dashboard/favorites',
            label: 'Favorite Routes',
            desc: 'Saved corridors & price alerts',
            icon: Heart,
          },
          {
            to: '/dashboard/notifications',
            label: 'Notifications',
            desc: 'Fare & trip alerts',
            icon: Bell,
          },
          {
            to: '/dashboard/profile',
            label: 'Profile Settings',
            desc: 'Account details & password',
            icon: Settings,
          },
        ]
      : []),
    ...(isOperator
      ? [
          {
            to: '/operator',
            label: 'Operator Portal',
            desc: 'Authorized operator records',
            icon: Truck,
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
          },
        ]
      : []),
  ];

  return (
    <div className="space-y-6">
      <GlassCard variant="green" className="p-6 flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-1">
          <p className="text-xs font-bold uppercase tracking-widest text-[#DFF7E8]">
            Account &amp; More Menu
          </p>
          <h1 className="font-display text-2xl font-extrabold">
            {user
              ? profile?.full_name || user.email?.split('@')[0]
              : 'Guest Commuter'}
          </h1>
          <p className="text-xs text-[#DFF7E8]/90">
            {user
              ? `${user.email} • Role: ${role.replace('_', ' ').toUpperCase()}`
              : 'Sign in or register to unlock trip saving, fare reporting, favorites, and safety sharing.'}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {user ? (
            <GlassButton type="button" variant="glass" size="sm" onClick={signOut}>
              <LogOut className="h-4 w-4 text-[#176B4B]" />
              Sign Out
            </GlassButton>
          ) : (
            <>
              <Link to="/login">
                <GlassButton variant="glass" size="sm">
                  <LogIn className="h-4 w-4 text-[#176B4B]" />
                  Sign In
                </GlassButton>
              </Link>
              <Link to="/register">
                <GlassButton variant="emerald" size="sm">
                  <UserPlus className="h-4 w-4" />
                  Register
                </GlassButton>
              </Link>
            </>
          )}
        </div>
      </GlassCard>

      <GpsConsentCard compact />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {quickLinks.map((item) => (
          <Link key={item.to} to={item.to}>
            <GlassCard
              variant="strong"
              hoverable
              className="p-4 flex items-center gap-3.5 h-full"
            >
              <div className="rounded-2xl bg-[#DFF7E8] p-2.5 text-[#176B4B] shrink-0">
                <item.icon className="h-5 w-5" />
              </div>
              <div>
                <h2 className="font-bold text-sm text-[#183329]">{item.label}</h2>
                <p className="text-xs text-[#183329]/75">{item.desc}</p>
              </div>
            </GlassCard>
          </Link>
        ))}

        <Link to="/live-map">
          <GlassCard variant="strong" hoverable className="p-4 flex items-center gap-3.5 h-full">
            <div className="rounded-2xl bg-[#DFF7E8] p-2.5 text-[#176B4B] shrink-0">
              <LocateFixed className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-bold text-sm text-[#183329]">Live GPS Map</h2>
              <p className="text-xs text-[#183329]/75">Open real-time map &amp; stops</p>
            </div>
          </GlassCard>
        </Link>
      </div>
    </div>
  );
}
