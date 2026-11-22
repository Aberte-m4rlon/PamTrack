import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowLeftRight,
  CalendarCheck,
  CheckCircle2,
  ExternalLink,
  FileText,
  Heart,
  Info,
  Search,
  ShieldAlert,
  WifiOff,
} from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { useNetwork } from '@/contexts/NetworkContext';
import { useToast } from '@/contexts/ToastContext';
import { useFareRecords, useMunicipalities, useRoutes, useTransportTypes } from '@/hooks/useReferenceData';
import { partitionFareRecords, PASSENGER_CATEGORY_LABELS } from '@/lib/fareIntegrity';
import { fetchOsrmDrivingRoute, type OsrmRouteResult } from '@/lib/osrm';
import { formatDateSafe, formatPhp, haversineDistanceKm } from '@/lib/utils';
import { addFavoriteRoute } from '@/services/pamasaheApi';
import type { PassengerCategory } from '@/types/database';
import {
  EmptyStateCard,
  FareStatusBadge,
  GlassButton,
  GlassCard,
  GlassSkeleton,
  TransportModeIcon,
} from '@/components/glass/GlassPrimitives';

const RECENT_SEARCHES_KEY = 'pamasahe_recent_searches_v1';

export interface RecentSearchEntry {
  originId: string;
  originName: string;
  destinationId: string;
  destinationName: string;
  transportTypeId: string;
  passengerCategory: PassengerCategory;
  searchedAt: string;
}

export function getRecentSearches(): RecentSearchEntry[] {
  try {
    const raw = localStorage.getItem(RECENT_SEARCHES_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as RecentSearchEntry[];
  } catch {
    return [];
  }
}

export function saveRecentSearch(entry: RecentSearchEntry) {
  try {
    const prev = getRecentSearches().filter(
      (item) =>
        !(
          item.originId === entry.originId &&
          item.destinationId === entry.destinationId &&
          item.transportTypeId === entry.transportTypeId
        )
    );
    localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify([entry, ...prev].slice(0, 6)));
  } catch {
    // Ignore storage quota issues
  }
}

export function FareSearchWidget({
  initialOriginId = '',
  initialDestinationId = '',
  onSelectionChange,
  compact = false,
}: {
  initialOriginId?: string;
  initialDestinationId?: string;
  onSelectionChange?: (originId: string, destinationId: string) => void;
  compact?: boolean;
}) {
  const { user, isConfigured } = useAuth();
  const { isOffline } = useNetwork();
  const { pushToast } = useToast();
  const queryClient = useQueryClient();

  const { data: muniRes } = useMunicipalities();
  const { data: transportRes } = useTransportTypes();
  const { data: allFares, isLoading: faresLoading } = useFareRecords();
  const { data: routes } = useRoutes();

  const municipalities = muniRes?.data ?? [];
  const transportTypes = transportRes?.data ?? [];

  const [originId, setOriginId] = useState(initialOriginId);
  const [destinationId, setDestinationId] = useState(initialDestinationId);
  const [transportTypeId, setTransportTypeId] = useState('all');
  const [passengerCategory, setPassengerCategory] = useState<PassengerCategory>('regular');
  const [hasSearched, setHasSearched] = useState(Boolean(initialOriginId && initialDestinationId));
  const [osrmInfo, setOsrmInfo] = useState<OsrmRouteResult | null>(null);

  useEffect(() => {
    if (initialOriginId) setOriginId(initialOriginId);
  }, [initialOriginId]);

  useEffect(() => {
    if (initialDestinationId) setDestinationId(initialDestinationId);
  }, [initialDestinationId]);

  const originMuni = municipalities.find((m) => m.id === originId);
  const destMuni = municipalities.find((m) => m.id === destinationId);
  const offlineGeodesicKm = useMemo(() => {
    if (!originMuni || !destMuni || originMuni.id === destMuni.id) return null;
    return Number(
      haversineDistanceKm(
        originMuni.latitude,
        originMuni.longitude,
        destMuni.latitude,
        destMuni.longitude
      ).toFixed(1)
    );
  }, [originMuni, destMuni]);

  const favoriteMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('Sign in to save favorite routes.');
      if (!originId || !destinationId) throw new Error('Select origin and destination first.');
      return addFavoriteRoute({
        userId: user.id,
        originMunicipalityId: originId,
        destinationMunicipalityId: destinationId,
        transportTypeId: transportTypeId === 'all' ? null : transportTypeId,
        label: `${originMuni?.name ?? 'Origin'} → ${destMuni?.name ?? 'Destination'}`,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['favorites', user?.id] });
      pushToast({
        title: 'Route saved to Favorites',
        description: `${originMuni?.name} → ${destMuni?.name}`,
        variant: 'success',
      });
    },
    onError: (err: Error) => {
      pushToast({ title: 'Could not save favorite', description: err.message, variant: 'error' });
    },
  });

  const handleSwap = () => {
    setOriginId(destinationId);
    setDestinationId(originId);
    onSelectionChange?.(destinationId, originId);
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!originId || !destinationId) {
      pushToast({
        title: 'Select origin and destination',
        description:
          'Choose your origin and destination (you may select the same LGU for local tricycle/multicab fares).',
        variant: 'error',
      });
      return;
    }

    setHasSearched(true);
    onSelectionChange?.(originId, destinationId);

    if (originMuni && destMuni) {
      saveRecentSearch({
        originId,
        originName: originMuni.name,
        destinationId,
        destinationName: destMuni.name,
        transportTypeId,
        passengerCategory,
        searchedAt: new Date().toISOString(),
      });

      if (originId !== destinationId) {
        const road = await fetchOsrmDrivingRoute(
          originMuni.latitude,
          originMuni.longitude,
          destMuni.latitude,
          destMuni.longitude
        );
        setOsrmInfo(road);
      } else {
        setOsrmInfo(null);
      }
    }
  };

  const quickAvailableCorridors = useMemo(() => {
    const seen = new Map<
      string,
      {
        originId: string;
        originName: string;
        destinationId: string;
        destinationName: string;
        sampleAmount: number;
        status: 'verified_official' | 'community_estimate';
      }
    >();
    for (const f of allFares ?? []) {
      if (f.is_archived || f.is_test_fixture) continue;
      if (f.transport_type?.is_active === false) continue;
      if (f.status !== 'verified_official' && f.status !== 'community_estimate') continue;
      if (f.passenger_category !== 'regular') continue;
      const k = `${f.origin_municipality_id}::${f.destination_municipality_id}`;
      if (!seen.has(k)) {
        seen.set(k, {
          originId: f.origin_municipality_id,
          originName: f.origin?.name ?? 'Origin',
          destinationId: f.destination_municipality_id,
          destinationName: f.destination?.name ?? 'Destination',
          sampleAmount: f.fare_amount,
          status: f.status,
        });
      }
    }
    const preferred = [
      'Bulalacao::Bongabong',
      'Bulalacao::Roxas',
      'Roxas::Bongabong',
      'Bongabong::Gloria',
      'Calapan City::Puerto Galera',
      'Calapan City::Pinamalayan',
      'Calapan City::Bulalacao',
      'Calapan City::Naujan',
    ];
    const items = Array.from(seen.values());
    items.sort((a, b) => {
      const ia = preferred.indexOf(`${a.originName}::${a.destinationName}`);
      const ib = preferred.indexOf(`${b.originName}::${b.destinationName}`);
      if (ia !== -1 && ib !== -1) return ia - ib;
      if (ia !== -1) return -1;
      if (ib !== -1) return 1;
      return 0;
    });
    return items.slice(0, 10);
  }, [allFares]);

  const matchingFares = useMemo(() => {
    if (!originId || !destinationId) return [];
    return (allFares ?? []).filter((f) => {
      if (f.transport_type?.is_active === false) return false;
      const sameCorridor =
        f.origin_municipality_id === originId &&
        f.destination_municipality_id === destinationId;
      const matchesType =
        transportTypeId === 'all' || f.transport_type_id === transportTypeId;
      const matchesCategory = f.passenger_category === passengerCategory;
      return sameCorridor && matchesType && matchesCategory;
    });
  }, [allFares, originId, destinationId, transportTypeId, passengerCategory]);

  const matchingRoutes = useMemo(() => {
    if (!originId || !destinationId) return [];
    return (routes ?? []).filter(
      (r) =>
        r.origin_municipality_id === originId &&
        r.destination_municipality_id === destinationId &&
        (transportTypeId === 'all' || r.transport_type_id === transportTypeId)
    );
  }, [routes, originId, destinationId, transportTypeId]);

  const { officialFares, communityEstimates } = useMemo(
    () => partitionFareRecords(matchingFares),
    [matchingFares]
  );

  return (
    <div className="space-y-5">
      <GlassCard variant="strong" className={compact ? 'p-4 sm:p-5' : 'p-5 sm:p-6'}>
        <form onSubmit={handleSearch} className="grid grid-cols-1 gap-3.5 md:grid-cols-12 md:items-end">
          <div className="min-w-0 md:col-span-5">
            <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-[#78716C]">
              Origin
            </label>
            <select
              value={originId}
              onChange={(e) => {
                setOriginId(e.target.value);
                onSelectionChange?.(e.target.value, destinationId);
              }}
              aria-label="Origin municipality"
              className="glass-input w-full min-w-0 truncate rounded-2xl pl-3.5 pr-9 py-2.5 text-sm font-medium"
            >
              <option value="">Select origin...</option>
              {municipalities.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex justify-center md:col-span-2 lg:col-span-1 md:pb-0.5">
            <button
              type="button"
              onClick={handleSwap}
              title="Swap origin and destination"
              aria-label="Swap origin and destination"
              className="liquid-btn-secondary inline-flex h-10 w-10 items-center justify-center rounded-full"
            >
              <ArrowLeftRight className="h-4 w-4" />
            </button>
          </div>

          <div className="min-w-0 md:col-span-5 lg:col-span-6">
            <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-[#78716C]">
              Destination
            </label>
            <select
              value={destinationId}
              onChange={(e) => {
                setDestinationId(e.target.value);
                onSelectionChange?.(originId, e.target.value);
              }}
              aria-label="Destination municipality"
              className="glass-input w-full min-w-0 truncate rounded-2xl pl-3.5 pr-9 py-2.5 text-sm font-medium"
            >
              <option value="">Select destination...</option>
              {municipalities.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </div>

          <div className="min-w-0 md:col-span-4">
            <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-[#78716C]">
              Transport Type
            </label>
            <select
              value={transportTypeId}
              onChange={(e) => setTransportTypeId(e.target.value)}
              aria-label="Transportation type"
              className="glass-input w-full min-w-0 truncate rounded-2xl pl-3.5 pr-9 py-2.5 text-sm font-medium"
            >
              <option value="all">All Modes</option>
              {transportTypes.map((tt) => (
                <option key={tt.id} value={tt.id}>
                  {tt.name}
                </option>
              ))}
            </select>
          </div>

          <div className="min-w-0 md:col-span-5">
            <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-[#78716C]">
              Passenger
            </label>
            <select
              value={passengerCategory}
              onChange={(e) => setPassengerCategory(e.target.value as PassengerCategory)}
              aria-label="Passenger category"
              className="glass-input w-full min-w-0 truncate rounded-2xl pl-3.5 pr-9 py-2.5 text-sm font-medium"
            >
              {Object.entries(PASSENGER_CATEGORY_LABELS).map(([k, label]) => (
                <option key={k} value={k}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          <div className="min-w-0 md:col-span-3">
            <GlassButton type="submit" variant="primary" className="w-full">
              <Search className="h-4 w-4 shrink-0" />
              <span>Search</span>
            </GlassButton>
          </div>
        </form>
      </GlassCard>

      {quickAvailableCorridors.length > 0 && (
        <GlassCard variant="surface" className="p-4 space-y-2.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs font-bold uppercase tracking-wider text-[#DC2626]">
              Routes With Available Fare Records (Click to View Price)
            </p>
            <Link to="/fare-matrix" className="text-xs font-bold text-[#DC2626] hover:underline">
              See Full Fare Matrix →
            </Link>
          </div>
          <div className="flex flex-wrap gap-2">
            {quickAvailableCorridors.map((c) => (
              <button
                key={`${c.originId}-${c.destinationId}`}
                type="button"
                onClick={() => {
                  setOriginId(c.originId);
                  setDestinationId(c.destinationId);
                  setHasSearched(true);
                  onSelectionChange?.(c.originId, c.destinationId);
                }}
                className="glass-pill-tile inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-xs font-bold text-[#24191D] hover:bg-gradient-to-b hover:from-[#EF4444]/85 hover:to-[#B91C1C]/90 hover:text-white transition group"
              >
                <span>
                  {c.originId === c.destinationId
                    ? `${c.originName} (Local)`
                    : `${c.originName} → ${c.destinationName}`}
                </span>
                <span className="glass-panel rounded-full px-2 py-0.5 text-[11px] font-extrabold text-[#DC2626] group-hover:bg-white/25 group-hover:text-white">
                  {formatPhp(c.sampleAmount)}
                </span>
              </button>
            ))}
          </div>
        </GlassCard>
      )}

      {hasSearched && originMuni && destMuni && (
        <div className="space-y-4">
          {/* Corridor Header & Road Distance */}
          <GlassCard variant="surface" className="p-4 sm:p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-xs font-bold uppercase tracking-wider text-[#DC2626]">
                    Route Inquiry • {PASSENGER_CATEGORY_LABELS[passengerCategory]}
                  </p>
                  {isOffline && (
                    <span className="inline-flex items-center gap-1 rounded-full border border-[#FCA5A5]/80 bg-[#FFE4E6]/85 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#B91C1C]">
                      <WifiOff className="h-3 w-3" />
                      Offline Cached Lookup
                    </span>
                  )}
                </div>
                <h3 className="font-display text-xl font-extrabold text-[#24191D]">
                  {originMuni.id === destMuni.id
                    ? `${originMuni.name} (Local / Intra-Municipality Fare)`
                    : `${originMuni.name} → ${destMuni.name}`}
                </h3>
                {osrmInfo?.available ? (
                  <p className="text-xs font-semibold text-[#78716C]">
                    OSRM Road Distance: {osrmInfo.distanceKm} km • Est. {osrmInfo.durationMin} mins
                    driving
                  </p>
                ) : (
                  offlineGeodesicKm !== null && (
                    <p className="text-xs font-semibold text-[#78716C]">
                      {isOffline
                        ? `Offline Reference Distance: ~${offlineGeodesicKm} km straight-line (live OSRM road route updates online)`
                        : `Straight-line reference: ~${offlineGeodesicKm} km`}
                    </p>
                  )
                )}
                {matchingRoutes.length > 0 && (
                  <p className="mt-1 text-xs text-[#DC2626] font-semibold">
                    {matchingRoutes.length} registered corridor(s) found:{' '}
                    {matchingRoutes.map((r) => r.route_name).join(', ')}
                  </p>
                )}
              </div>

              <div className="flex flex-wrap gap-2">
                {user && isConfigured && (
                  <GlassButton
                    type="button"
                    variant="glass"
                    size="sm"
                    onClick={() => favoriteMutation.mutate()}
                    disabled={isOffline || favoriteMutation.isPending}
                    title={isOffline ? 'Reconnect to save favorite routes' : undefined}
                  >
                    <Heart className="h-4 w-4 text-[#DC2626]" />
                    {isOffline ? 'Save Offline Disabled' : 'Save Favorite'}
                  </GlassButton>
                )}
                {isOffline ? (
                  <GlassButton
                    type="button"
                    variant="secondary"
                    size="sm"
                    disabled
                    title="Internet connection required to submit fare reports"
                  >
                    <WifiOff className="h-3.5 w-3.5" />
                    Reporting Offline Paused
                  </GlassButton>
                ) : (
                  <Link to={user ? '/dashboard/reports' : '/login'}>
                    <GlassButton variant="secondary" size="sm">
                      {user ? 'Report Observed Fare' : 'Sign In to Report Fare'}
                    </GlassButton>
                  </Link>
                )}
              </div>
            </div>
          </GlassCard>

          {faresLoading ? (
            <div className="grid gap-4 md:grid-cols-2">
              <GlassSkeleton className="h-40" />
              <GlassSkeleton className="h-40" />
            </div>
          ) : officialFares.length === 0 && communityEstimates.length === 0 ? (
            <EmptyStateCard
              icon={ShieldAlert}
              title="No commuter fare estimate found for this route yet."
              description="Browse our full 15-LGU Fare Matrix or sign in to share the actual fare you paid along this Oriental Mindoro corridor."
              action={
                <Link to="/fare-matrix">
                  <GlassButton variant="secondary" size="sm">
                    Browse Complete Fare Matrix
                  </GlassButton>
                </Link>
              }
            />
          ) : (
            <div className="space-y-5">
              {/* Official Fare Records (shown only when published) */}
              {officialFares.length > 0 && (
                <div className="space-y-3">
                  <div className="glass-pill-tile inline-flex items-center gap-2 rounded-full px-4 py-1.5">
                    <CheckCircle2 className="h-4 w-4 text-[#DC2626]" />
                    <h4 className="text-xs font-bold uppercase tracking-wider text-[#24191D]">
                      Verified Fare Records
                    </h4>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    {officialFares.map((fare) => (
                      <GlassCard key={fare.id} variant="strong" hoverable className="p-5 space-y-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2.5">
                            <div className="liquid-nav-active rounded-2xl p-2.5 text-white">
                              <TransportModeIcon code={fare.transport_type?.code} />
                            </div>
                            <div>
                              <p className="font-bold text-[#24191D]">
                                {fare.transport_type?.name ?? 'Public Transport'}
                              </p>
                              <p className="text-xs text-[#78716C]">
                                {PASSENGER_CATEGORY_LABELS[fare.passenger_category]}
                              </p>
                            </div>
                          </div>
                          <FareStatusBadge status={fare.status} compact />
                        </div>

                        <div className="flex items-baseline justify-between border-y border-[#FCA5A5]/35 py-3">
                          <span className="text-xs font-semibold uppercase tracking-wider text-[#78716C]">
                            Fare Rate
                          </span>
                          <span className="font-display text-3xl font-extrabold text-[#DC2626]">
                            {formatPhp(fare.fare_amount)}
                          </span>
                        </div>

                        <div className="space-y-1.5 text-xs text-[#78716C]">
                          <p className="flex items-center gap-1.5">
                            <FileText className="h-3.5 w-3.5 text-[#DC2626]" />
                            <span className="font-semibold text-[#24191D]">Source:</span>{' '}
                            {fare.issuing_authority || 'Commuter Reference'}
                            {fare.official_document_reference
                              ? ` (${fare.official_document_reference})`
                              : ''}
                          </p>
                          <p className="flex items-center gap-1.5">
                            <CalendarCheck className="h-3.5 w-3.5 text-[#DC2626]" />
                            <span className="font-semibold text-[#24191D]">Updated:</span>{' '}
                            {formatDateSafe(fare.last_verified_at || fare.updated_at)}
                          </p>
                          {fare.passenger_category !== 'regular' && (
                            <p className="flex items-center gap-1.5 text-[#B91C1C] font-semibold">
                              <Info className="h-3.5 w-3.5" />
                              Includes 20% discount guideline.
                            </p>
                          )}
                        </div>

                        <div className="flex items-center justify-between pt-1">
                          {fare.source_url ? (
                            <a
                              href={fare.source_url}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 text-xs font-bold text-[#DC2626] hover:underline"
                            >
                              View Source Link
                              <ExternalLink className="h-3 w-3" />
                            </a>
                          ) : (
                            <span />
                          )}
                          <Link
                            to={`/fares/${fare.id}`}
                            className="text-xs font-bold text-[#B91C1C] hover:underline"
                          >
                            Full Fare Details →
                          </Link>
                        </div>
                      </GlassCard>
                    ))}
                  </div>
                </div>
              )}

              {/* Citizen Commuter Fare Estimates Section */}
              {communityEstimates.length > 0 && (
                <div className="space-y-3">
                  <div className="glass-pill-tile inline-flex items-center gap-2 rounded-full px-4 py-1.5">
                    <AlertTriangle className="h-4 w-4 text-[#DC2626]" />
                    <h4 className="text-xs font-bold uppercase tracking-wider text-[#24191D]">
                      Commuter Fare Guide (Citizen Estimates)
                    </h4>
                  </div>

                  <div className="glass-pill-tile rounded-2xl px-3.5 py-2.5 text-xs text-[#4B3B40]">
                    <strong className="text-[#24191D]">Citizen Reference Guide:</strong> Confirm
                    posted terminal fares upon boarding.
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    {communityEstimates.map((est) => (
                      <GlassCard
                        key={est.id}
                        variant="strong"
                        hoverable
                        className="p-5 space-y-3"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2.5">
                            <div className="liquid-nav-active rounded-2xl p-2.5 text-white">
                              <TransportModeIcon code={est.transport_type?.code} />
                            </div>
                            <div>
                              <span className="block font-bold text-[#24191D]">
                                {est.transport_type?.name}
                              </span>
                              <span className="text-xs text-[#78716C]">
                                {PASSENGER_CATEGORY_LABELS[est.passenger_category]}
                              </span>
                            </div>
                          </div>
                          <FareStatusBadge status="community_estimate" compact />
                        </div>
                        <div className="flex items-baseline justify-between border-y border-[#FCA5A5]/35 py-2.5">
                          <span className="text-xs font-semibold uppercase tracking-wider text-[#78716C]">
                            Estimated Fare
                          </span>
                          <p className="font-display text-3xl font-extrabold text-[#DC2626]">
                            {formatPhp(est.fare_amount)}
                          </p>
                        </div>
                        <p className="text-xs text-[#78716C]">
                          Updated: {formatDateSafe(est.last_verified_at || est.updated_at)}
                        </p>
                        {est.notes && (
                          <p className="text-xs italic text-[#78716C]">{est.notes}</p>
                        )}
                      </GlassCard>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
