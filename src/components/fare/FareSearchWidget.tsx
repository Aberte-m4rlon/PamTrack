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
} from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { useFareRecords, useMunicipalities, useRoutes, useTransportTypes } from '@/hooks/useReferenceData';
import { partitionFareRecords, PASSENGER_CATEGORY_LABELS } from '@/lib/fareIntegrity';
import { fetchOsrmDrivingRoute, type OsrmRouteResult } from '@/lib/osrm';
import { formatDateSafe, formatPhp } from '@/lib/utils';
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
          'Choose your origin and destination (you may select the same LGU for local tricycle/jeepney fares).',
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
    return Array.from(seen.values()).slice(0, 6);
  }, [allFares]);

  const matchingFares = useMemo(() => {
    if (!originId || !destinationId) return [];
    return (allFares ?? []).filter((f) => {
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
              className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-[#FCA5A5]/60 bg-white/85 text-[#DC2626] transition hover:bg-[#FFE4E6]"
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
                className="inline-flex items-center gap-2 rounded-full border border-white/90 bg-white/85 px-3.5 py-1.5 text-xs font-bold text-[#24191D] hover:bg-gradient-to-r hover:from-[#DC2626] hover:to-[#B91C1C] hover:text-white transition shadow-sm group"
              >
                <span>
                  {c.originId === c.destinationId
                    ? `${c.originName} (Local)`
                    : `${c.originName} → ${c.destinationName}`}
                </span>
                <span className="rounded-full bg-[#FFE4E6] px-2 py-0.5 text-[11px] font-extrabold text-[#DC2626] group-hover:bg-white/25 group-hover:text-white">
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
                <p className="text-xs font-bold uppercase tracking-wider text-[#DC2626]">
                  Route Inquiry • {PASSENGER_CATEGORY_LABELS[passengerCategory]}
                </p>
                <h3 className="font-display text-xl font-extrabold text-[#24191D]">
                  {originMuni.id === destMuni.id
                    ? `${originMuni.name} (Local / Intra-Municipality Fare)`
                    : `${originMuni.name} → ${destMuni.name}`}
                </h3>
                {osrmInfo?.available && (
                  <p className="text-xs font-semibold text-[#78716C]">
                    OSRM Road Distance: {osrmInfo.distanceKm} km • Est. {osrmInfo.durationMin} mins
                    driving
                  </p>
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
                    disabled={favoriteMutation.isPending}
                  >
                    <Heart className="h-4 w-4 text-[#DC2626]" />
                    Save Favorite
                  </GlassButton>
                )}
                <Link to={user ? '/dashboard/reports' : '/register'}>
                  <GlassButton variant="secondary" size="sm">
                    Report Observed Fare
                  </GlassButton>
                </Link>
              </div>
            </div>
          </GlassCard>

          {faresLoading ? (
            <div className="grid gap-4 md:grid-cols-2">
              <GlassSkeleton className="h-40" />
              <GlassSkeleton className="h-40" />
            </div>
          ) : (
            <>
              {/* Official Verified Fares Section */}
              <div className="space-y-3">
                <div className="inline-flex items-center gap-2 rounded-full border border-green-300/80 bg-white/85 px-3.5 py-1.5 backdrop-blur-md shadow-sm">
                  <CheckCircle2 className="h-4 w-4 text-[#16A34A]" />
                  <h4 className="text-xs font-bold uppercase tracking-wider text-[#24191D]">
                    Official Verified Fare Records
                  </h4>
                </div>

                {officialFares.length === 0 ? (
                  <EmptyStateCard
                    icon={ShieldAlert}
                    title="No verified official fare is currently available for this route."
                    description="Pamasahe Tracker never invents official fares or calculates official prices from map distance. An authorized administrator must first verify and publish an official LTFRB order, LGU ordinance, or operator tariff."
                    action={
                      <Link to="/fare-matrix">
                        <GlassButton variant="secondary" size="sm">
                          Browse Complete Fare Matrix
                        </GlassButton>
                      </Link>
                    }
                  />
                ) : (
                  <div className="grid gap-4 md:grid-cols-2">
                    {officialFares.map((fare) => (
                      <GlassCard key={fare.id} variant="strong" hoverable className="p-5 space-y-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2.5">
                            <div className="rounded-2xl bg-[#FFE4E6] p-2.5 text-[#DC2626]">
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
                            Verified Fare
                          </span>
                          <span className="font-display text-3xl font-extrabold text-[#DC2626]">
                            {formatPhp(fare.fare_amount)}
                          </span>
                        </div>

                        <div className="space-y-1.5 text-xs text-[#78716C]">
                          <p className="flex items-center gap-1.5">
                            <FileText className="h-3.5 w-3.5 text-[#DC2626]" />
                            <span className="font-semibold text-[#24191D]">Source:</span>{' '}
                            {fare.issuing_authority} ({fare.official_document_reference})
                          </p>
                          <p className="flex items-center gap-1.5">
                            <CalendarCheck className="h-3.5 w-3.5 text-[#DC2626]" />
                            <span className="font-semibold text-[#24191D]">Last verified:</span>{' '}
                            {formatDateSafe(fare.last_verified_at)}
                          </p>
                          {fare.passenger_category !== 'regular' && (
                            <p className="flex items-center gap-1.5 text-[#16A34A] font-semibold">
                              <Info className="h-3.5 w-3.5" />
                              Statutory 20% discount category verified against official tariff.
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
                              View Official Reference
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
                )}
              </div>

              {/* Separate Community Estimates Section */}
              {communityEstimates.length > 0 && (
                <div className="space-y-3">
                  <div className="inline-flex items-center gap-2 rounded-full border border-amber-300 bg-amber-50/90 px-3.5 py-1.5 backdrop-blur-md shadow-sm">
                    <AlertTriangle className="h-4 w-4 text-amber-600" />
                    <h4 className="text-xs font-bold uppercase tracking-wider text-amber-900">
                      Community Estimates (Unverified Reference Only)
                    </h4>
                  </div>

                  <div className="rounded-2xl border border-amber-300 bg-amber-50/85 p-3 text-xs text-amber-950">
                    <strong>Transparency Notice:</strong> The figures below come from reviewed
                    commuter reports and are <strong>NOT</strong> official government-approved fares.
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    {communityEstimates.map((est) => (
                      <GlassCard
                        key={est.id}
                        variant="strong"
                        className="border-amber-300/80 p-5 space-y-2.5"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-bold text-[#24191D]">
                            {est.transport_type?.name} •{' '}
                            {PASSENGER_CATEGORY_LABELS[est.passenger_category]}
                          </span>
                          <FareStatusBadge status="community_estimate" compact />
                        </div>
                        <p className="font-display text-2xl font-extrabold text-amber-800">
                          {formatPhp(est.fare_amount)}
                        </p>
                        <p className="text-xs text-[#78716C]">
                          Reviewed: {formatDateSafe(est.last_verified_at || est.updated_at)}
                        </p>
                        {est.notes && (
                          <p className="text-xs italic text-[#78716C]">{est.notes}</p>
                        )}
                      </GlassCard>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
