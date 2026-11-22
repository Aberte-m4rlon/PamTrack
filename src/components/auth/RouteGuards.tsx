import React from 'react';
import { Link, Navigate, useLocation } from 'react-router-dom';
import {
  Compass,
  Lock,
  LogIn,
  MapPin,
  Table2,
  UserPlus,
  WifiOff,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useNetwork } from '@/contexts/NetworkContext';
import {
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
    <div className="liquid-reveal-enter space-y-5">
      <PageHeader
        eyebrow="Offline Mode • Limitado ang Bukas"
        title={featureTitle}
        description={
          featureDescription ||
          'Mga naka-save na gabay sa pamasahe lang muna ang gumagana kapag walang internet.'
        }
        breadcrumbs={[{ label: 'Home', to: '/' }, { label: featureTitle }]}
      />

      <GlassCard variant="strong" className="p-4 sm:p-8 space-y-4 sm:space-y-5">
        <div className="flex items-start gap-3.5 sm:gap-4">
          <div className="flex h-11 w-11 sm:h-12 sm:w-12 shrink-0 items-center justify-center rounded-2xl bg-[#F8E7EA]/90 text-[#C9182B] border border-[#E9E5E8]/60">
            <WifiOff className="h-5 w-5 sm:h-6 sm:w-6" />
          </div>
          <div className="space-y-1.5 min-w-0">
            <h2 className="font-display text-lg sm:text-xl font-extrabold text-[#29262B] leading-snug">
              Kailangan ng Internet Para sa {featureTitle}
            </h2>
            <p className="text-xs sm:text-sm text-[#343039] max-w-2xl leading-relaxed">
              Kumonekta muna sa Wi-Fi o mobile data para magamit ang{' '}
              <strong className="text-[#29262B]">{featureTitle}</strong>.
            </p>
          </div>
        </div>

        <div className="rounded-2xl border border-white/85 bg-white/50 backdrop-blur-md p-3.5 sm:p-4 space-y-2.5 sm:space-y-3">
          <p className="text-xs font-bold uppercase tracking-wider text-[#C9182B]">
            Mga Pwede Pang Gamitin Kahit Offline Ngayon
          </p>
          <div className="grid gap-2.5 sm:grid-cols-3">
            <Link to="/fare-search">
              <div className="glass-pill-tile min-h-[42px] rounded-2xl p-3 hover:-translate-y-0.5 hover:border-white transition flex items-center gap-2.5 text-xs font-bold text-[#29262B]">
                <Compass className="h-4 w-4 text-[#C9182B] shrink-0" />
                <span>Naka-save na Fare Finder</span>
              </div>
            </Link>
            <Link to="/fare-matrix">
              <div className="glass-pill-tile min-h-[42px] rounded-2xl p-3 hover:-translate-y-0.5 hover:border-white transition flex items-center gap-2.5 text-xs font-bold text-[#29262B]">
                <Table2 className="h-4 w-4 text-[#C9182B] shrink-0" />
                <span>Naka-save na Fare Matrix</span>
              </div>
            </Link>
            <Link to="/municipalities">
              <div className="glass-pill-tile min-h-[42px] rounded-2xl p-3 hover:-translate-y-0.5 hover:border-white transition flex items-center gap-2.5 text-xs font-bold text-[#29262B]">
                <MapPin className="h-4 w-4 text-[#C9182B] shrink-0" />
                <span>Mga Bayan (15 LGUs)</span>
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
    <div className="liquid-reveal-enter space-y-3.5 sm:space-y-5">
      <PageHeader
        eyebrow="Kailangan Mag-sign In"
        title={featureTitle}
        description={featureDescription}
        breadcrumbs={[{ label: 'Home', to: '/' }, { label: featureTitle }]}
      />

      <GlassCard variant="rose" className="p-4 sm:p-7 space-y-3.5 sm:space-y-5">
        <div className="flex items-start gap-3 sm:gap-4">
          <div className="liquid-icon-ring flex h-10 w-10 sm:h-12 sm:w-12 shrink-0 items-center justify-center rounded-full text-[#C9182B]">
            <Lock className="h-4 w-4 sm:h-5 sm:w-5" />
          </div>
          <div className="space-y-1 flex-1 min-w-0">
            <h2 className="font-display text-base sm:text-xl font-extrabold text-[#29262B] leading-snug">
              Naka-lock Muna Habang Hindi Naka-Sign In
            </h2>
            <p className="text-xs sm:text-sm text-[#343039] max-w-2xl leading-relaxed font-medium">
              Mag-sign in para mabuksan ang <strong className="text-[#29262B]">{featureTitle}</strong>.
              Bukas pa rin para sa lahat ang paghahanap ng pamasahe at matrix.
            </p>
          </div>
        </div>

        {unlocks && unlocks.length > 0 && (
          <div className="glass-pill-tile rounded-2xl p-3.5 sm:p-4">
            <p className="mb-2 text-[11px] sm:text-xs font-bold uppercase tracking-wider text-[#C9182B]">
              Mga Mabubuksan Gamit ang Account Mo
            </p>
            <ul className="grid gap-1.5 sm:grid-cols-2 text-xs font-medium text-[#29262B]">
              {unlocks.map((item) => (
                <li key={item} className="flex items-start gap-2 leading-snug">
                  <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-[#C9182B] shrink-0" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="grid grid-cols-2 gap-2.5 sm:flex sm:flex-wrap sm:items-center sm:gap-3 pt-0.5">
          <Link to="/login" state={{ from: location.pathname }} className="w-full sm:w-auto">
            <GlassButton variant="primary" size="sm" className="w-full sm:w-auto sm:px-5 sm:py-2.5 sm:text-sm sm:min-h-[42px]">
              <LogIn className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0" />
              Mag-sign In
            </GlassButton>
          </Link>
          <Link to="/register" state={{ from: location.pathname }} className="w-full sm:w-auto">
            <GlassButton variant="secondary" size="sm" className="w-full sm:w-auto sm:px-5 sm:py-2.5 sm:text-sm sm:min-h-[42px]">
              <UserPlus className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0" />
              Gumawa ng Account
            </GlassButton>
          </Link>
          <Link to="/fare-search" className="col-span-2 sm:col-span-1 w-full sm:w-auto">
            <GlassButton variant="glass" size="sm" className="w-full sm:w-auto sm:px-5 sm:py-2.5 sm:text-sm sm:min-h-[42px]">
              <Compass className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0 text-[#C9182B]" />
              Gamitin ang Fare Finder
            </GlassButton>
          </Link>
        </div>
      </GlassCard>
    </div>
  );
}
