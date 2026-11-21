import React from 'react';
import { Link, Navigate, useLocation } from 'react-router-dom';
import {
  Compass,
  Lock,
  LogIn,
  MapPin,
  ShieldAlert,
  Table2,
  UserPlus,
  WifiOff,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useNetwork } from '@/contexts/NetworkContext';
import {
  EmptyStateCard,
  GlassButton,
  GlassCard,
  GlassSkeleton,
  PageHeader,
} from '@/components/glass/GlassPrimitives';

export function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="space-y-4">
        <GlassSkeleton className="h-24 w-full" />
        <GlassSkeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  return <>{children}</>;
}

/**
 * Gates features that require an active internet connection (live map tiles,
 * OSRM road routing, server reporting uploads, auth, admin mutations) while
 * leaving core fare-lookup tools operational offline.
 */
export function OfflineFeatureGate({
  featureTitle,
  featureDescription,
  children,
}: {
  featureTitle: string;
  featureDescription?: string;
  children: React.ReactNode;
}) {
  const { isOffline } = useNetwork();

  if (!isOffline) {
    return <>{children}</>;
  }

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Offline Mode • Limited Features Active"
        title={featureTitle}
        description={
          featureDescription ||
          'Only core cached commuter tools run without an internet connection.'
        }
        breadcrumbs={[{ label: 'Home', to: '/' }, { label: featureTitle }]}
      />

      <GlassCard variant="strong" className="p-6 sm:p-8 space-y-5">
        <div className="flex flex-col sm:flex-row items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#FFE4E6]/90 text-[#DC2626] border border-[#FCA5A5]/60">
            <WifiOff className="h-6 w-6" />
          </div>
          <div className="space-y-2">
            <h2 className="font-display text-xl font-extrabold text-[#24191D]">
              Internet Connection Required for {featureTitle}
            </h2>
            <p className="text-sm text-[#78716C] max-w-2xl">
              To prevent incomplete submissions, broken map tiles, or stale verification checks,{' '}
              <strong className="text-[#24191D]">{featureTitle}</strong> is paused while offline.
              Reconnect to Wi-Fi or mobile data to restore full live access.
            </p>
          </div>
        </div>

        <div className="rounded-2xl border border-white/85 bg-white/50 backdrop-blur-md p-4 space-y-3">
          <p className="text-xs font-bold uppercase tracking-wider text-[#DC2626]">
            Features Available Right Now in Offline Mode
          </p>
          <div className="grid gap-2.5 sm:grid-cols-3">
            <Link to="/fare-search">
              <div className="rounded-2xl border border-white/85 bg-white/60 p-3 hover:bg-white/85 transition flex items-center gap-2.5 text-xs font-bold text-[#24191D]">
                <Compass className="h-4 w-4 text-[#DC2626] shrink-0" />
                <span>Cached Fare Finder</span>
              </div>
            </Link>
            <Link to="/fare-matrix">
              <div className="rounded-2xl border border-white/85 bg-white/60 p-3 hover:bg-white/85 transition flex items-center gap-2.5 text-xs font-bold text-[#24191D]">
                <Table2 className="h-4 w-4 text-[#DC2626] shrink-0" />
                <span>Cached Fare Matrix</span>
              </div>
            </Link>
            <Link to="/municipalities">
              <div className="rounded-2xl border border-white/85 bg-white/60 p-3 hover:bg-white/85 transition flex items-center gap-2.5 text-xs font-bold text-[#24191D]">
                <MapPin className="h-4 w-4 text-[#DC2626] shrink-0" />
                <span>15 LGUs Directory</span>
              </div>
            </Link>
          </div>
        </div>
      </GlassCard>
    </div>
  );
}

/**
 * Enforces limited guest access when logged out: renders an explicit Sign-In
 * glass gate while preserving the route heading & navigation context.
 */
export function RequireAccountAccess({
  featureTitle,
  featureDescription,
  unlocks,
  children,
}: {
  featureTitle: string;
  featureDescription: string;
  unlocks?: string[];
  children: React.ReactNode;
}) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="space-y-4">
        <GlassSkeleton className="h-24 w-full" />
        <GlassSkeleton className="h-64 w-full" />
      </div>
    );
  }

  if (user) {
    return <>{children}</>;
  }

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Sign In Required • Limited Guest Access"
        title={featureTitle}
        description={featureDescription}
        breadcrumbs={[{ label: 'Home', to: '/' }, { label: featureTitle }]}
      />

      <GlassCard variant="strong" className="p-6 sm:p-8 space-y-5">
        <div className="flex flex-col sm:flex-row items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#DC2626] to-[#B91C1C] text-white shadow-md shadow-[#DC2626]/25">
            <Lock className="h-5 w-5" />
          </div>
          <div className="space-y-2 flex-1">
            <div className="inline-flex items-center gap-1.5 rounded-full bg-[#FFE4E6]/90 px-3 py-0.5 text-[11px] font-bold uppercase tracking-wider text-[#B91C1C] border border-[#FCA5A5]/60">
              Sign In Required
            </div>
            <h2 className="font-display text-xl font-extrabold text-[#24191D]">
              Account Access Locked While Logged Out
            </h2>
            <p className="text-sm text-[#78716C] max-w-2xl">
              To keep GPS, reporting, and commuter data secure,{' '}
              <strong className="text-[#24191D]">{featureTitle}</strong> is locked when logged out.
              Guests can explore public fare references (Home, Fare Finder, Fare Matrix, Route
              Overview, and 15 LGUs). Sign in to unlock this workspace.
            </p>
          </div>
        </div>

        {unlocks && unlocks.length > 0 && (
          <div className="rounded-2xl border border-white/85 bg-white/50 backdrop-blur-md p-4">
            <p className="mb-2 text-xs font-bold uppercase tracking-wider text-[#DC2626]">
              Unlocked With Your Commuter Account
            </p>
            <ul className="grid gap-1.5 sm:grid-cols-2 text-xs font-medium text-[#24191D]">
              {unlocks.map((item) => (
                <li key={item} className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#DC2626] shrink-0" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="flex flex-wrap items-center gap-3 pt-1">
          <Link to="/login" state={{ from: location.pathname }}>
            <GlassButton variant="primary">
              <LogIn className="h-4 w-4" />
              Sign In to Unlock
            </GlassButton>
          </Link>
          <Link to="/register" state={{ from: location.pathname }}>
            <GlassButton variant="secondary">
              <UserPlus className="h-4 w-4" />
              Create Commuter Account
            </GlassButton>
          </Link>
          <Link to="/fare-search">
            <GlassButton variant="glass">
              <Compass className="h-4 w-4 text-[#DC2626]" />
              Use Public Fare Finder
            </GlassButton>
          </Link>
        </div>
      </GlassCard>
    </div>
  );
}

export function RequireOperator({ children }: { children: React.ReactNode }) {
  const { user, loading, isOperator } = useAuth();
  const location = useLocation();

  if (loading) {
    return <GlassSkeleton className="h-48 w-full" />;
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  if (!isOperator) {
    return (
      <EmptyStateCard
        icon={ShieldAlert}
        title="Transport Operator Access Required"
        description="This area is reserved for authorized Transport Operators and Administrators. Database Row Level Security enforces these permissions on the backend."
        action={
          <Link to="/dashboard">
            <GlassButton variant="primary">Return to Commuter Dashboard</GlassButton>
          </Link>
        }
      />
    );
  }

  return <>{children}</>;
}

export function RequireAdmin({ children }: { children: React.ReactNode }) {
  const { user, loading, isAdmin } = useAuth();
  const location = useLocation();

  if (loading) {
    return <GlassSkeleton className="h-48 w-full" />;
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  if (!isAdmin) {
    return (
      <EmptyStateCard
        icon={ShieldAlert}
        title="Administrator Privileges Required"
        description="Your account does not hold an Administrator or Super Administrator role. All administrative mutations are also strictly guarded by PostgreSQL Row Level Security."
        action={
          <Link to="/dashboard">
            <GlassButton variant="primary">Go to Commuter Dashboard</GlassButton>
          </Link>
        }
      />
    );
  }

  return <>{children}</>;
}
