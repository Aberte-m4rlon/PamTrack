import { Link } from 'react-router-dom';
import {
  BarChart3,
  Bell,
  Clock,
  Heart,
  LocateFixed,
  MapPin,
  MessageSquarePlus,
  Navigation,
  PhoneCall,
  Radio,
  Search,
  ShieldAlert,
  Sparkles,
  TrendingUp,
  UserCheck,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useGps } from '@/contexts/GpsContext';
import {
  useFareRecords,
  useMunicipalities,
  useMyFareReports,
  useMyFavorites,
  useMyTrips,
  useNotifications,
  useTransportStops,
} from '@/hooks/useReferenceData';
import {
  FareSearchWidget,
  getRecentSearches,
} from '@/components/fare/FareSearchWidget';
import { GpsConsentCard } from '@/components/gps/GpsConsentCard';
import { formatDurationSeconds, sortStopsByDistance } from '@/lib/gpsUtils';
import { formatDateSafe, formatPhp } from '@/lib/utils';
import {
  EmptyStateCard,
  FareStatusBadge,
  GlassButton,
  GlassCard,
  ReportStatusBadge,
} from '@/components/glass/GlassPrimitives';

export function CommuterDashboardPage() {
  const { user, profile, role } = useAuth();
  const { currentPosition, nearestMunicipality, trackingActive } = useGps();
  const { data: muniRes } = useMunicipalities();
  const { data: fares } = useFareRecords();
  const { data: favorites } = useMyFavorites();
  const { data: myReports } = useMyFareReports();
  const { data: notifications } = useNotifications();
  const { data: myTrips } = useMyTrips();
  const { data: stops } = useTransportStops();

  const municipalities = muniRes?.data ?? [];
  const homeMuni = municipalities.find((m) => m.id === profile?.home_municipality_id);
  const recentSearches = getRecentSearches();
  const recentFareUpdates = (fares ?? []).slice(0, 4);
  const unreadNotifs = (notifications ?? []).filter((n) => !n.is_read);

  const totalTripDistanceKm = (myTrips ?? []).reduce(
    (sum, t) => sum + Number(t.distance_km ?? 0),
    0
  );

  const refCoords = currentPosition
    ? { lat: currentPosition.latitude, lng: currentPosition.longitude }
    : homeMuni
      ? { lat: homeMuni.latitude, lng: homeMuni.longitude }
      : { lat: 13.407, lng: 121.1778 };

  const nearbyStopsPreview = sortStopsByDistance(
    refCoords.lat,
    refCoords.lng,
    stops ?? []
  ).slice(0, 3);

  return (
    <div className="space-y-6">
      {/* Welcome & Profile Banner */}
      <GlassCard variant="rose" className="p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-[11px] font-bold uppercase tracking-wider">
                <Sparkles className="h-3.5 w-3.5 text-[#F8E7EA]" />
                Commuter Portal • {role.replace('_', ' ')}
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-[11px] font-bold">
                <LocateFixed className="h-3 w-3" />
                {trackingActive ? 'GPS Tracking Active' : 'GPS Standby'}
              </span>
            </div>
            <h1 className="font-display text-2xl font-extrabold sm:text-3xl">
              Mabuhay, {profile?.full_name || user?.email?.split('@')[0] || 'Commuter'}!
            </h1>
            <p className="text-xs text-[#F8E7EA]/95 sm:text-sm">
              {nearestMunicipality?.withinOrientalMindoro
                ? `Current GPS LGU: ${nearestMunicipality.municipality.name}`
                : homeMuni
                  ? `Home LGU: ${homeMuni.name} (${homeMuni.district})`
                  : 'Grant GPS consent below or set your home LGU in Profile Settings.'}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link to="/trips">
              <GlassButton variant="secondary" size="sm">
                <Radio className="h-4 w-4" />
                Live Trip Monitor
              </GlassButton>
            </Link>
            <Link to="/report-vehicle">
              <GlassButton variant="glass" size="sm">
                Report Vehicle
              </GlassButton>
            </Link>
            <Link to="/dashboard/reports">
              <GlassButton variant="glass" size="sm">
                <MessageSquarePlus className="h-4 w-4 text-[#C9182B]" />
                Report Fare
              </GlassButton>
            </Link>
            <Link to="/dashboard/profile">
              <GlassButton variant="glass" size="sm">
                <UserCheck className="h-4 w-4 text-[#C9182B]" />
                Profile
              </GlassButton>
            </Link>
          </div>
        </div>
      </GlassCard>

      {/* GPS Status Control */}
      <GpsConsentCard compact />

      {/* Travel & Portal KPI Summary */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <GlassCard variant="strong" className="p-4">
          <p className="text-xs font-bold uppercase tracking-wider text-[#777078]">
            Trips &amp; Distance
          </p>
          <p className="mt-1 font-display text-2xl font-extrabold text-[#C9182B]">
            {myTrips?.length ?? 0} ({totalTripDistanceKm.toFixed(1)} km)
          </p>
          <Link to="/trips/analytics" className="mt-1 inline-flex items-center gap-1 text-xs font-bold text-[#B51224] hover:underline">
            <BarChart3 className="h-3.5 w-3.5" /> Travel Analytics →
          </Link>
        </GlassCard>

        <GlassCard variant="strong" className="p-4">
          <p className="text-xs font-bold uppercase tracking-wider text-[#777078]">
            Favorite Routes
          </p>
          <p className="mt-1 font-display text-2xl font-extrabold text-[#C9182B]">
            {favorites?.length ?? 0}
          </p>
          <Link to="/dashboard/favorites" className="mt-1 inline-block text-xs font-bold text-[#B51224] hover:underline">
            Manage Favorites →
          </Link>
        </GlassCard>

        <GlassCard variant="strong" className="p-4">
          <p className="text-xs font-bold uppercase tracking-wider text-[#777078]">
            My Submitted Reports
          </p>
          <p className="mt-1 font-display text-2xl font-extrabold text-[#C9182B]">
            {myReports?.length ?? 0}
          </p>
          <Link to="/dashboard/reports" className="mt-1 inline-block text-xs font-bold text-[#B51224] hover:underline">
            Track Verification →
          </Link>
        </GlassCard>

        <GlassCard variant="strong" className="p-4">
          <p className="text-xs font-bold uppercase tracking-wider text-[#777078]">
            Unread Notifications
          </p>
          <p className="mt-1 font-display text-2xl font-extrabold text-[#C9182B]">
            {unreadNotifs.length}
          </p>
          <Link to="/dashboard/notifications" className="mt-1 inline-block text-xs font-bold text-[#B51224] hover:underline">
            Open Inbox →
          </Link>
        </GlassCard>
      </div>

      {/* Safety Shortcuts + Nearby Verified Stops */}
      <div className="grid gap-5 lg:grid-cols-2">
        <GlassCard variant="strong" className="p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="flex items-center gap-2 font-display text-lg font-bold text-[#29262B]">
              <Navigation className="h-4 w-4 text-[#C9182B]" />
              Nearby Verified Terminals
            </h2>
            <Link to="/nearby" className="text-xs font-bold text-[#C9182B] hover:underline">
              Explore All →
            </Link>
          </div>
          <div className="space-y-2">
            {nearbyStopsPreview.map((stop) => (
              <div
                key={stop.id}
                className="flex items-center justify-between rounded-2xl bg-white/85 border border-[#F8E7EA] p-3 text-xs"
              >
                <div>
                  <p className="font-bold text-[#29262B]">{stop.stop_name}</p>
                  <p className="text-[#777078]">{stop.address_or_landmark}</p>
                </div>
                <span className="rounded-full bg-[#F8E7EA] px-2.5 py-1 font-bold text-[#C9182B] shrink-0">
                  {stop.distanceKm} km
                </span>
              </div>
            ))}
          </div>
        </GlassCard>

        <GlassCard variant="strong" className="p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="flex items-center gap-2 font-display text-lg font-bold text-[#29262B]">
              <ShieldAlert className="h-4 w-4 text-[#C9182B]" />
              Safety Shortcuts &amp; Trusted Sharing
            </h2>
            <Link to="/safety" className="text-xs font-bold text-[#C9182B] hover:underline">
              Open Safety Center →
            </Link>
          </div>
          <p className="text-xs text-[#777078]">
            Quickly share an active trip with trusted contacts, check in safely, or call official
            emergency/transport hotlines.
          </p>
          <div className="flex flex-wrap gap-2">
            <Link to="/safety">
              <GlassButton variant="primary" size="sm">
                Manage Trusted Contacts
              </GlassButton>
            </Link>
            <a href="tel:911">
              <GlassButton variant="danger" size="sm">
                <PhoneCall className="h-3.5 w-3.5" /> 911
              </GlassButton>
            </a>
            <a href="tel:1342">
              <GlassButton variant="secondary" size="sm">
                <PhoneCall className="h-3.5 w-3.5" /> LTFRB 1342
              </GlassButton>
            </a>
          </div>
        </GlassCard>
      </div>

      {/* Embedded Route Search Widget */}
      <div className="space-y-2">
        <div className="flex items-center gap-2 px-1">
          <Search className="h-4 w-4 text-[#C9182B]" />
          <h2 className="font-display text-lg font-bold text-[#29262B]">Quick Route &amp; Fare Search</h2>
        </div>
        <FareSearchWidget
          compact
          initialOriginId={
            nearestMunicipality?.withinOrientalMindoro
              ? nearestMunicipality.municipality.id
              : (profile?.home_municipality_id ?? '')
          }
        />
      </div>

      {/* Recent Trips + Recent Fare Updates */}
      <div className="grid gap-5 lg:grid-cols-2">
        <GlassCard variant="strong" className="p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="flex items-center gap-2 font-display text-lg font-bold text-[#29262B]">
              <Radio className="h-4 w-4 text-[#C9182B]" />
              Recent Trips
            </h2>
            <Link to="/trips/analytics" className="text-xs font-bold text-[#C9182B] hover:underline">
              All Trips
            </Link>
          </div>
          {!myTrips || myTrips.length === 0 ? (
            <EmptyStateCard
              icon={Navigation}
              title="No trips recorded yet"
              description="Use Live Trip Monitor to track trip distance, time, and fare expenses."
            />
          ) : (
            <div className="space-y-2">
              {myTrips.slice(0, 4).map((t) => (
                <div
                  key={t.id}
                  className="flex items-center justify-between rounded-2xl bg-white/85 border border-[#F8E7EA] p-3 text-xs"
                >
                  <div>
                    <p className="font-bold text-[#29262B]">
                      {t.origin?.name ?? 'Origin'} → {t.destination?.name ?? 'Destination'}
                    </p>
                    <p className="text-[#777078]">
                      {t.distance_km} km • {formatDurationSeconds(t.duration_seconds)}
                    </p>
                  </div>
                  <span className="rounded-full bg-[#F8E7EA] px-2.5 py-0.5 font-bold uppercase text-[#C9182B]">
                    {t.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </GlassCard>

        <GlassCard variant="strong" className="p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="flex items-center gap-2 font-display text-lg font-bold text-[#29262B]">
              <TrendingUp className="h-4 w-4 text-[#C9182B]" />
              Recent Fare Updates
            </h2>
            <Link to="/fare-matrix" className="text-xs font-bold text-[#C9182B] hover:underline">
              Full Matrix
            </Link>
          </div>
          {recentFareUpdates.length === 0 ? (
            <p className="text-xs text-[#777078]">
              No published fare records yet.
            </p>
          ) : (
            <div className="space-y-2.5">
              {recentFareUpdates.map((fare) => (
                <Link
                  key={fare.id}
                  to={`/fares/${fare.id}`}
                  className="glass-pill-tile flex items-center justify-between rounded-[20px] p-3 hover:border-white transition"
                >
                  <div>
                    <p className="text-sm font-bold text-[#29262B]">
                      {fare.origin?.name} → {fare.destination?.name}
                    </p>
                    <p className="text-xs text-[#777078]">
                      {fare.transport_type?.name} • {formatDateSafe(fare.updated_at)}
                    </p>
                  </div>
                  <div className="text-right space-y-1">
                    <p className="font-display text-base font-extrabold text-[#C9182B]">
                      {formatPhp(fare.fare_amount)}
                    </p>
                    <FareStatusBadge status={fare.status} compact />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </GlassCard>
      </div>

      {/* Favorites + Reports + Recent Searches + Notifications */}
      <div className="grid gap-5 lg:grid-cols-2">
        <GlassCard variant="strong" className="p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="flex items-center gap-2 font-display text-lg font-bold text-[#29262B]">
              <Heart className="h-4 w-4 text-[#C9182B]" />
              Saved Favorite Routes
            </h2>
            <Link to="/dashboard/favorites" className="text-xs font-bold text-[#C9182B] hover:underline">
              Manage
            </Link>
          </div>
          {!favorites || favorites.length === 0 ? (
            <p className="text-xs text-[#777078]">No favorite routes saved yet.</p>
          ) : (
            <div className="space-y-2">
              {favorites.slice(0, 4).map((fav) => (
                <Link
                  key={fav.id}
                  to={`/fare-search?origin=${fav.origin_municipality_id}&destination=${fav.destination_municipality_id}`}
                  className="glass-pill-tile flex items-center justify-between rounded-[20px] p-3 text-xs font-bold hover:border-white transition"
                >
                  <span className="text-[#29262B]">
                    {fav.origin?.name} → {fav.destination?.name}
                  </span>
                  <span className="text-[#B51224]">
                    {fav.transport_type?.name || 'All Modes'}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </GlassCard>

        <GlassCard variant="strong" className="p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="flex items-center gap-2 font-display text-lg font-bold text-[#29262B]">
              <MessageSquarePlus className="h-4 w-4 text-[#C9182B]" />
              My Community Fare Reports
            </h2>
            <Link to="/dashboard/reports" className="text-xs font-bold text-[#C9182B] hover:underline">
              Submit / View All
            </Link>
          </div>
          {!myReports || myReports.length === 0 ? (
            <p className="text-xs text-[#777078]">No reports submitted yet.</p>
          ) : (
            <div className="space-y-2">
              {myReports.slice(0, 4).map((rep) => (
                <div
                  key={rep.id}
                  className="glass-pill-tile flex items-center justify-between rounded-[20px] p-3 text-xs"
                >
                  <div>
                    <p className="font-bold text-[#29262B]">
                      {rep.origin?.name} → {rep.destination?.name}
                    </p>
                    <p className="text-[#777078]">
                      {rep.transport_type?.name} • Paid {formatPhp(rep.fare_paid)}
                    </p>
                  </div>
                  <ReportStatusBadge status={rep.status} />
                </div>
              ))}
            </div>
          )}
        </GlassCard>
      </div>

      {/* Recent Searches + Notifications */}
      <div className="grid gap-5 lg:grid-cols-2">
        <GlassCard variant="strong" className="p-5 space-y-3">
          <h2 className="flex items-center gap-2 font-display text-lg font-bold text-[#29262B]">
            <Clock className="h-4 w-4 text-[#C9182B]" />
            Recently Searched Routes
          </h2>
          {recentSearches.length === 0 ? (
            <p className="text-xs text-[#777078]">No recent searches yet.</p>
          ) : (
            <div className="space-y-2">
              {recentSearches.map((item, i) => (
                <Link
                  key={`${item.originId}-${item.destinationId}-${i}`}
                  to={`/fare-search?origin=${item.originId}&destination=${item.destinationId}`}
                  className="glass-pill-tile flex items-center justify-between rounded-full px-4 py-2.5 text-xs font-semibold hover:border-white transition"
                >
                  <span className="text-[#29262B]">
                    {item.originName} → {item.destinationName}
                  </span>
                  <span className="text-[#C9182B] capitalize">{item.passengerCategory}</span>
                </Link>
              ))}
            </div>
          )}
        </GlassCard>

        <GlassCard variant="strong" className="p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="flex items-center gap-2 font-display text-lg font-bold text-[#29262B]">
              <Bell className="h-4 w-4 text-[#C9182B]" />
              Latest Notifications
            </h2>
            <Link to="/dashboard/notifications" className="text-xs font-bold text-[#C9182B] hover:underline">
              View All
            </Link>
          </div>
          {(notifications ?? []).length === 0 ? (
            <p className="text-xs text-[#777078]">No notifications yet.</p>
          ) : (
            <div className="space-y-2">
              {(notifications ?? []).slice(0, 3).map((n) => (
                <div
                  key={n.id}
                  className={`rounded-[20px] p-3 text-xs border backdrop-blur-md ${
                    n.is_read
                      ? 'bg-white/60 border-white/85'
                      : 'bg-[#F8E7EA]/75 border-white/95 shadow-sm'
                  }`}
                >
                  <p className="font-bold text-[#29262B]">{n.title}</p>
                  <p className="text-[#777078]">{n.message}</p>
                </div>
              ))}
            </div>
          )}
        </GlassCard>
      </div>

      {/* 15 Municipality Coverage */}
      <GlassCard variant="surface" className="p-5 space-y-3">
        <div className="flex items-center gap-2">
          <MapPin className="h-4 w-4 text-[#C9182B]" />
          <h2 className="font-display text-base font-bold text-[#29262B]">
            Oriental Mindoro 15-LGU Quick Jump
          </h2>
        </div>
        <div className="flex flex-wrap gap-2">
          {municipalities.map((m) => (
            <Link
              key={m.id}
              to={`/fare-search?origin=${m.id}`}
              className="rounded-full border border-white/90 bg-white/85 px-3 py-1.5 text-xs font-semibold text-[#29262B] hover:bg-gradient-to-r hover:from-[#C9182B] hover:to-[#B51224] hover:text-white transition shadow-sm"
            >
              {m.name}
            </Link>
          ))}
        </div>
      </GlassCard>
    </div>
  );
}
