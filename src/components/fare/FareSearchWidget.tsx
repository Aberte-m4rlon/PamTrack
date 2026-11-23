import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowLeftRight,
  CalendarCheck,
  CheckCircle2,
  ExternalLink,
  FileText,
  Info,
  Search,
  ShieldAlert,
  WifiOff,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useNetwork } from '@/contexts/NetworkContext';
import { useToast } from '@/contexts/ToastContext';
import { useFareRecords, useMunicipalities, useRoutes, useTransportTypes } from '@/hooks/useReferenceData';
import { partitionFareRecords, PASSENGER_CATEGORY_LABELS } from '@/lib/fareIntegrity';
import { fetchOsrmDrivingRoute, type OsrmRouteResult } from '@/lib/osrm';
import { formatDateSafe, formatPhp, haversineDistanceKm } from '@/lib/utils';
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
  const { user } = useAuth();
  const { isOffline } = useNetwork();
  const { pushToast } = useToast();

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
  const [swapSpinCount, setSwapSpinCount] = useState(0);

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

  const handleSwap = () => {
    setSwapSpinCount((c) => c + 1);
    setOriginId(destinationId);
    setDestinationId(originId);
    onSelectionChange?.(destinationId, originId);
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!originId || !destinationId) {
      pushToast({
        title: 'Piliin kung saan galing at pupunta',
        description:
          'Piliin ang iyong pinanggalingan at pupuntahan (pwedeng parehong bayan para sa lokal na tricycle o multicab).',
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
      'Bongabong::Pinamalayan',
      'Bongabong::Gloria',
      'Bongabong::Roxas',
      'Bulalacao::Bongabong',
      'Bulalacao::Roxas',
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
    <div className="space-y-4 sm:space-y-5">
      <GlassCard variant="strong" className={compact ? 'p-3.5 sm:p-5' : 'p-4 sm:p-6'}>
        <form onSubmit={handleSearch} className="grid grid-cols-2 gap-2.5 sm:gap-3.5 md:grid-cols-12 md:items-end">
          <div className="col-span-2 min-w-0 md:col-span-5">
            <label className="mb-1 block text-[11px] sm:text-xs font-bold uppercase tracking-wider text-[#343039]">
              Saan Galing (Origin)
            </label>
            <select
              value={originId}
              onChange={(e) => {
                setOriginId(e.target.value);
                onSelectionChange?.(e.target.value, destinationId);
              }}
              aria-label="Origin municipality"
              className="glass-input min-h-[42px] w-full min-w-0 truncate rounded-2xl px-3.5 py-2.5 text-sm font-medium"
            >
              <option value="">Piliin kung saan galing...</option>
              {municipalities.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </div>

          <div className="col-span-2 flex items-center gap-2 md:col-span-2 lg:col-span-1 md:justify-center md:pb-0.5">
            <div className="h-px flex-1 bg-white/85 md:hidden" />
            <button
              type="button"
              onClick={handleSwap}
              title="Pagpalitin ang galing at pupuntahan"
              aria-label="Swap origin and destination"
              className="liquid-btn-secondary inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full"
            >
              <ArrowLeftRight
                className="h-4 w-4 transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]"
                style={{ transform: `rotate(${swapSpinCount * 180}deg)` }}
              />
            </button>
            <div className="h-px flex-1 bg-white/85 md:hidden" />
          </div>

          <div className="col-span-2 min-w-0 md:col-span-5 lg:col-span-6">
            <label className="mb-1 block text-[11px] sm:text-xs font-bold uppercase tracking-wider text-[#343039]">
              Saan Pupunta (Destination)
            </label>
            <select
              value={destinationId}
              onChange={(e) => {
                setDestinationId(e.target.value);
                onSelectionChange?.(originId, e.target.value);
              }}
              aria-label="Destination municipality"
              className="glass-input min-h-[42px] w-full min-w-0 truncate rounded-2xl px-3.5 py-2.5 text-sm font-medium"
            >
              <option value="">Piliin kung saan pupunta...</option>
              {municipalities.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </div>

          <div className="col-span-1 min-w-0 md:col-span-4">
            <label className="mb-1 block text-[11px] sm:text-xs font-bold uppercase tracking-wider text-[#343039]">
              Uri ng Sasakyan
            </label>
            <select
              value={transportTypeId}
              onChange={(e) => setTransportTypeId(e.target.value)}
              aria-label="Transportation type"
              className="glass-input min-h-[42px] w-full min-w-0 truncate rounded-2xl px-3 sm:px-3.5 py-2.5 text-xs sm:text-sm font-medium"
            >
              <option value="all">Lahat ng Sasakyan</option>
              {transportTypes.map((tt) => (
                <option key={tt.id} value={tt.id}>
                  {tt.name}
                </option>
              ))}
            </select>
          </div>

          <div className="col-span-1 min-w-0 md:col-span-5">
            <label className="mb-1 block text-[11px] sm:text-xs font-bold uppercase tracking-wider text-[#343039]">
              Pasahero
            </label>
            <select
              value={passengerCategory}
              onChange={(e) => setPassengerCategory(e.target.value as PassengerCategory)}
              aria-label="Passenger category"
              className="glass-input min-h-[42px] w-full min-w-0 truncate rounded-2xl px-3 sm:px-3.5 py-2.5 text-xs sm:text-sm font-medium"
            >
              {Object.entries(PASSENGER_CATEGORY_LABELS).map(([k, label]) => (
                <option key={k} value={k}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          <div className="col-span-2 min-w-0 md:col-span-3 pt-0.5 md:pt-0">
            <GlassButton type="submit" variant="primary" className="w-full">
              <Search className="h-4 w-4 shrink-0" />
              <span>Hanapin</span>
            </GlassButton>
          </div>
        </form>
      </GlassCard>

      {quickAvailableCorridors.length > 0 && (
        <GlassCard variant="surface" className="p-3.5 sm:p-4 space-y-2.5">
          <div className="flex items-center justify-between gap-2">
            <p className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-[#C9182B]">
              Mga Madalas Hanapin na Ruta
            </p>
            <Link
              to="/fare-matrix"
              className="inline-flex min-h-[32px] items-center text-xs font-bold text-[#C9182B] hover:underline whitespace-nowrap"
            >
              Fare Matrix →
            </Link>
          </div>
          <div className="flex flex-wrap gap-1.5 sm:gap-2">
            {quickAvailableCorridors.map((c, idx) => (
              <button
                key={`${c.originId}-${c.destinationId}`}
                type="button"
                onClick={() => {
                  setOriginId(c.originId);
                  setDestinationId(c.destinationId);
                  setHasSearched(true);
                  onSelectionChange?.(c.originId, c.destinationId);
                }}
                className={`${
                  idx >= 4 ? 'hidden sm:inline-flex' : 'inline-flex'
                } glass-pill-tile min-h-[36px] sm:min-h-[40px] max-w-full items-center gap-1.5 sm:gap-2 rounded-full px-3 sm:px-3.5 py-1.5 sm:py-2 text-[11px] sm:text-xs font-bold text-[#29262B] hover:-translate-y-0.5 active:scale-95 hover:bg-gradient-to-b hover:from-[#C9182B]/85 hover:to-[#B51224]/90 hover:text-white group`}
              >
                <span className="truncate">
                  {c.originId === c.destinationId
                    ? `${c.originName} (Loob ng Bayan)`
                    : `${c.originName} → ${c.destinationName}`}
                </span>
                <span className="glass-panel shrink-0 rounded-full px-2 py-0.5 text-[10px] sm:text-[11px] font-extrabold text-[#C9182B] group-hover:bg-white/25 group-hover:text-white tabular-nums">
                  {formatPhp(c.sampleAmount)}
                </span>
              </button>
            ))}
          </div>
        </GlassCard>
      )}

      {hasSearched && originMuni && destMuni && (
        <div
          key={`${originId}-${destinationId}-${transportTypeId}-${passengerCategory}`}
          className="liquid-reveal-enter space-y-4"
        >
          {/* Corridor Header & Road Distance */}
          <GlassCard variant="surface" className="p-4 sm:p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-xs font-bold uppercase tracking-wider text-[#C9182B]">
                    Resulta ng Ruta • {PASSENGER_CATEGORY_LABELS[passengerCategory]}
                  </p>
                  {isOffline && (
                    <span className="inline-flex items-center gap-1 rounded-full border border-[#E9E5E8]/80 bg-[#F8E7EA]/85 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#B51224]">
                      <WifiOff className="h-3 w-3" />
                      Naka-save Offline
                    </span>
                  )}
                </div>
                <h3 className="font-display text-xl font-extrabold text-[#29262B]">
                  {originMuni.id === destMuni.id
                    ? `${originMuni.name} (Lokal / Loob ng Bayan)`
                    : `${originMuni.name} → ${destMuni.name}`}
                </h3>
                {osrmInfo?.available ? (
                  <p className="text-xs font-semibold text-[#777078]">
                    Distansya sa Kalsada (OSRM): {osrmInfo.distanceKm} km • Tinatayang {osrmInfo.durationMin} min
                    na biyahe
                  </p>
                ) : (
                  offlineGeodesicKm !== null && (
                    <p className="text-xs font-semibold text-[#777078]">
                      {isOffline
                        ? `Offline Ref. Distance: ~${offlineGeodesicKm} km (mag-u-update ang eksaktong ruta kapag online)`
                        : `Tinatayang diretso: ~${offlineGeodesicKm} km`}
                    </p>
                  )
                )}
                {matchingRoutes.length > 0 && (
                  <p className="mt-1 text-xs text-[#C9182B] font-semibold">
                    May {matchingRoutes.length} nakarehistrong ruta:{' '}
                    {matchingRoutes.map((r) => r.route_name).join(', ')}
                  </p>
                )}
              </div>

              <div className="flex flex-wrap gap-2">
                {isOffline ? (
                  <GlassButton
                    type="button"
                    variant="secondary"
                    size="sm"
                    disabled
                    title="Kailangan ng internet para mag-submit ng fare report"
                  >
                    <WifiOff className="h-3.5 w-3.5" />
                    Naka-pause Offline
                  </GlassButton>
                ) : (
                  <Link to={user ? '/dashboard/reports' : '/login'}>
                    <GlassButton variant="secondary" size="sm">
                      {user ? 'Mag-report ng Pamasahe' : 'Mag-sign In Para Mag-report'}
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
              title="Wala pang naka-save na pamasahe para sa rutang ito."
              description="Tingnan ang buong Fare Matrix ng 15 LGU o mag-sign in para i-share ang aktwal na binayaran mong pamasahe sa rutang ito."
              action={
                <Link to="/fare-matrix">
                  <GlassButton variant="secondary" size="sm">
                    Tingnan ang Buong Fare Matrix
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
                    <CheckCircle2 className="h-4 w-4 text-[#C9182B]" />
                    <h4 className="text-xs font-bold uppercase tracking-wider text-[#29262B]">
                      Opisyal at Verified na Pamasahe
                    </h4>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    {officialFares.map((fare, idx) => (
                      <GlassCard
                        key={fare.id}
                        variant="strong"
                        hoverable
                        staggerIndex={idx}
                        className="p-5 space-y-3"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2.5">
                            <div className="liquid-nav-active rounded-2xl p-2.5 text-white">
                              <TransportModeIcon code={fare.transport_type?.code} />
                            </div>
                            <div>
                              <p className="font-bold text-[#29262B]">
                                {fare.transport_type?.name ?? 'Pampublikong Sasakyan'}
                              </p>
                              <p className="text-xs text-[#777078]">
                                {PASSENGER_CATEGORY_LABELS[fare.passenger_category]}
                              </p>
                            </div>
                          </div>
                          <FareStatusBadge status={fare.status} compact />
                        </div>

                        <div className="flex items-baseline justify-between border-y border-[#E9E5E8]/35 py-3">
                          <span className="text-xs font-semibold uppercase tracking-wider text-[#777078]">
                            Taripa ng Pamasahe
                          </span>
                          <span className="font-display text-3xl font-extrabold text-[#C9182B]">
                            {formatPhp(fare.fare_amount)}
                          </span>
                        </div>

                        <div className="space-y-1.5 text-xs text-[#777078]">
                          <p className="flex items-center gap-1.5">
                            <FileText className="h-3.5 w-3.5 text-[#C9182B]" />
                            <span className="font-semibold text-[#29262B]">Pinagmulan:</span>{' '}
                            {fare.issuing_authority || 'Gabay ng Pasahero'}
                            {fare.official_document_reference
                              ? ` (${fare.official_document_reference})`
                              : ''}
                          </p>
                          <p className="flex items-center gap-1.5">
                            <CalendarCheck className="h-3.5 w-3.5 text-[#C9182B]" />
                            <span className="font-semibold text-[#29262B]">Na-update:</span>{' '}
                            {formatDateSafe(fare.last_verified_at || fare.updated_at)}
                          </p>
                          {fare.passenger_category !== 'regular' && (
                            <p className="flex items-center gap-1.5 text-[#B51224] font-semibold">
                              <Info className="h-3.5 w-3.5" />
                              May kasamang 20% discount guideline.
                            </p>
                          )}
                        </div>

                        <div className="flex items-center justify-between pt-1">
                          {fare.source_url ? (
                            <a
                              href={fare.source_url}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 text-xs font-bold text-[#C9182B] hover:underline"
                            >
                              Tingnan ang Source Link
                              <ExternalLink className="h-3 w-3" />
                            </a>
                          ) : (
                            <span />
                          )}
                          <Link
                            to={`/fares/${fare.id}`}
                            className="text-xs font-bold text-[#B51224] hover:underline"
                          >
                            Buong Detalye →
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
                    <AlertTriangle className="h-4 w-4 text-[#C9182B]" />
                    <h4 className="text-xs font-bold uppercase tracking-wider text-[#29262B]">
                      Gabay sa Pamasahe (Tantya ng Komunidad)
                    </h4>
                  </div>

                  <div className="glass-pill-tile rounded-2xl px-3.5 py-2.5 text-xs text-[#343039]">
                    <strong className="text-[#29262B]">Paalala:</strong> I-check pa rin ang
                    naka-post na taripa sa terminal pag-akyat ng sasakyan.
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    {communityEstimates.map((est, idx) => (
                      <GlassCard
                        key={est.id}
                        variant="strong"
                        hoverable
                        staggerIndex={idx}
                        className="p-5 space-y-3"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2.5">
                            <div className="liquid-nav-active rounded-2xl p-2.5 text-white">
                              <TransportModeIcon code={est.transport_type?.code} />
                            </div>
                            <div>
                              <span className="block font-bold text-[#29262B]">
                                {est.transport_type?.name}
                              </span>
                              <span className="text-xs text-[#777078]">
                                {PASSENGER_CATEGORY_LABELS[est.passenger_category]}
                              </span>
                            </div>
                          </div>
                          <FareStatusBadge status="community_estimate" compact />
                        </div>
                        <div className="flex items-baseline justify-between border-y border-[#E9E5E8]/35 py-2.5">
                          <span className="text-xs font-semibold uppercase tracking-wider text-[#777078]">
                            Tinatayang Pamasahe
                          </span>
                          <p className="font-display text-3xl font-extrabold text-[#C9182B]">
                            {formatPhp(est.fare_amount)}
                          </p>
                        </div>
                        <p className="text-xs text-[#777078]">
                          Na-update: {formatDateSafe(est.last_verified_at || est.updated_at)}
                        </p>
                        {est.notes && (
                          <p className="text-xs italic text-[#777078]">{est.notes}</p>
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
