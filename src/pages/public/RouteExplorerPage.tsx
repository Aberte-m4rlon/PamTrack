import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  CheckCircle2,
  Compass,
  FileText,
  MapPin,
  Route as RouteIcon,
  Search,
  ShieldAlert,
} from 'lucide-react';
import { useFareRecords, useMunicipalities, useRoutes } from '@/hooks/useReferenceData';
import {
  PASSENGER_CATEGORY_LABELS,
  partitionFareRecords,
} from '@/lib/fareIntegrity';
import { formatDateSafe, formatPhp } from '@/lib/utils';
import type { FareRecord } from '@/types/database';
import { OrientalMindoroMap } from '@/components/map/OrientalMindoroMap';
import {
  EmptyStateCard,
  FareStatusBadge,
  GlassButton,
  GlassCard,
  GlassSkeleton,
  TransportModeIcon,
} from '@/components/glass/GlassPrimitives';

function summarizeCorridorFares(records: FareRecord[]) {
  const { officialFares, communityEstimates } = partitionFareRecords(records);
  const officialRegular = officialFares.find((f) => f.passenger_category === 'regular') ?? officialFares[0] ?? null;
  const officialDiscounted = officialFares.find((f) => f.passenger_category !== 'regular') ?? null;
  const communityRegular =
    communityEstimates.find((f) => f.passenger_category === 'regular') ??
    communityEstimates[0] ??
    null;

  return {
    officialFares,
    communityEstimates,
    officialRegular,
    officialDiscounted,
    communityRegular,
  };
}

export function RouteExplorerPage() {
  const { data: muniRes, isLoading: muniLoading } = useMunicipalities();
  const { data: routes, isLoading: routesLoading } = useRoutes();
  const { data: fareRecords, isLoading: faresLoading } = useFareRecords();

  const municipalities = muniRes?.data ?? [];
  const [originId, setOriginId] = useState('');
  const [destinationId, setDestinationId] = useState('');

  const allFares = useMemo(
    () => (fareRecords ?? []).filter((f) => f.transport_type?.is_active !== false),
    [fareRecords]
  );

  const quickFareCorridors = useMemo(() => {
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
    for (const f of allFares) {
      if (f.is_archived || f.is_test_fixture) continue;
      if (f.status !== 'verified_official' && f.status !== 'community_estimate') continue;
      if (f.passenger_category !== 'regular') continue;
      const key = `${f.origin_municipality_id}::${f.destination_municipality_id}`;
      if (!seen.has(key)) {
        seen.set(key, {
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
    const list = Array.from(seen.values());
    list.sort((a, b) => {
      const ia = preferred.indexOf(`${a.originName}::${a.destinationName}`);
      const ib = preferred.indexOf(`${b.originName}::${b.destinationName}`);
      if (ia !== -1 && ib !== -1) return ia - ib;
      if (ia !== -1) return -1;
      if (ib !== -1) return 1;
      return 0;
    });
    return list.slice(0, 12);
  }, [allFares]);

  const selectedCorridorFares = useMemo(() => {
    if (!originId || !destinationId) return null;
    const matching = allFares.filter(
      (f) =>
        f.origin_municipality_id === originId &&
        f.destination_municipality_id === destinationId
    );
    return summarizeCorridorFares(matching);
  }, [allFares, originId, destinationId]);

  const originName = municipalities.find((m) => m.id === originId)?.name;
  const destinationName = municipalities.find((m) => m.id === destinationId)?.name;

  return (
    <div className="space-y-4 sm:space-y-6">
      <GlassCard variant="strong" className="p-4 sm:p-6 space-y-1.5 sm:space-y-2">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[11px] sm:text-xs font-bold uppercase tracking-widest text-[#C9182B]">
              Interactive OpenStreetMap Explorer &amp; Fare Guide
            </p>
            <h1 className="font-display text-xl leading-tight font-extrabold text-[#29262B] sm:text-3xl">
              Oriental Mindoro Route Map &amp; Fares
            </h1>
            <p className="text-xs sm:text-sm text-[#343039]">
              Pick two LGUs to view the road corridor and fare guide.
            </p>
          </div>
          {originId && destinationId && (
            <Link
              to={`/fare-search?origin=${encodeURIComponent(originId)}&destination=${encodeURIComponent(destinationId)}`}
              className="w-full sm:w-auto shrink-0"
            >
              <GlassButton variant="primary" className="w-full sm:w-auto">
                <Search className="h-4 w-4" />
                Compare All Filters
              </GlassButton>
            </Link>
          )}
        </div>
      </GlassCard>

      {quickFareCorridors.length > 0 && (
        <GlassCard variant="surface" className="p-3.5 sm:p-4 space-y-2">
          <p className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-[#C9182B]">
            Popular Corridors
          </p>
          <div className="flex sm:flex-wrap gap-2 overflow-x-auto pb-1 -mx-1 px-1 sm:mx-0 sm:px-0 sm:pb-0 sm:overflow-visible">
            {quickFareCorridors.map((c) => (
              <button
                key={`${c.originId}-${c.destinationId}`}
                type="button"
                onClick={() => {
                  setOriginId(c.originId);
                  setDestinationId(c.destinationId);
                }}
                className="glass-pill-tile inline-flex min-h-[40px] shrink-0 items-center gap-2 whitespace-nowrap rounded-full px-3.5 py-2 text-xs font-bold text-[#29262B] hover:bg-gradient-to-b hover:from-[#C9182B] hover:to-[#B51224] hover:text-white transition group"
              >
                <span>
                  {c.originId === c.destinationId
                    ? `${c.originName} (Local)`
                    : `${c.originName} → ${c.destinationName}`}
                </span>
                <span className="rounded-full bg-[#F8E7EA] px-2 py-0.5 text-[11px] font-extrabold text-[#C9182B] group-hover:bg-white/25 group-hover:text-white tabular-nums">
                  {formatPhp(c.sampleAmount)}
                </span>
              </button>
            ))}
          </div>
        </GlassCard>
      )}

      <GlassCard variant="surface" className="p-3.5 sm:p-5 space-y-3.5 sm:space-y-4">
        <div className="grid gap-2.5 sm:gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-[11px] sm:text-xs font-bold uppercase tracking-wider text-[#777078]">
              Map Origin
            </label>
            <select
              value={originId}
              onChange={(e) => setOriginId(e.target.value)}
              aria-label="Route map origin municipality"
              className="glass-input min-h-[42px] w-full rounded-2xl px-3.5 py-2.5 text-sm font-medium"
            >
              <option value="">Choose origin on map or dropdown...</option>
              {municipalities.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name} ({m.district})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-[11px] sm:text-xs font-bold uppercase tracking-wider text-[#777078]">
              Map Destination
            </label>
            <select
              value={destinationId}
              onChange={(e) => setDestinationId(e.target.value)}
              aria-label="Route map destination municipality"
              className="glass-input min-h-[42px] w-full rounded-2xl px-3.5 py-2.5 text-sm font-medium"
            >
              <option value="">Choose destination on map or dropdown...</option>
              {municipalities.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name} ({m.district})
                </option>
              ))}
            </select>
          </div>
        </div>

        {muniLoading ? (
          <GlassSkeleton className="h-[280px] sm:h-[430px]" />
        ) : (
          <OrientalMindoroMap
            municipalities={municipalities}
            originId={originId}
            destinationId={destinationId}
            onSelectOrigin={setOriginId}
            onSelectDestination={setDestinationId}
            heightClassName="h-[280px] sm:h-[460px]"
          />
        )}
      </GlassCard>

      {/* Selected Route Fares Directly on /routes */}
      {originId && destinationId && selectedCorridorFares && (
        <section className="space-y-4" aria-label="Selected route fare prices">
          <div className="glass-surface rounded-3xl p-4 sm:p-5 flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-[#C9182B]">
                Selected Route Fare Breakdown
              </p>
              <h2 className="font-display text-xl font-extrabold text-[#29262B]">
                {originId === destinationId
                  ? `${originName ?? 'Origin'} (Local / Intra-Municipality)`
                  : `${originName ?? 'Origin'} → ${destinationName ?? 'Destination'}`}
              </h2>
            </div>
            <Link
              to={`/fare-search?origin=${encodeURIComponent(originId)}&destination=${encodeURIComponent(destinationId)}`}
            >
              <GlassButton variant="secondary" size="sm">
                Open Full Fare Search →
              </GlassButton>
            </Link>
          </div>

          {faresLoading ? (
            <div className="grid gap-4 md:grid-cols-2">
              <GlassSkeleton className="h-32" />
              <GlassSkeleton className="h-32" />
            </div>
          ) : selectedCorridorFares.officialFares.length === 0 &&
            selectedCorridorFares.communityEstimates.length === 0 ? (
            <EmptyStateCard
              icon={ShieldAlert}
              title="No commuter fare estimate found for this route yet."
              description="Browse available estimates in the Fare Matrix or check back after syncing online."
            />
          ) : (
            <div className="space-y-4">
              {selectedCorridorFares.officialFares.length > 0 && (
                <div className="space-y-2.5">
                  <div className="glass-pill-tile inline-flex items-center gap-2 rounded-full px-3.5 py-1 text-xs font-bold text-[#29262B]">
                    <CheckCircle2 className="h-4 w-4 text-[#C9182B]" />
                    <span>Verified Fare Records</span>
                  </div>
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {selectedCorridorFares.officialFares.map((fare) => (
                      <GlassCard key={fare.id} variant="strong" hoverable className="p-4 space-y-2.5">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className="liquid-nav-active rounded-xl p-2 text-white">
                              <TransportModeIcon code={fare.transport_type?.code} className="h-4 w-4" />
                            </span>
                            <div>
                              <p className="font-bold text-sm text-[#29262B]">
                                {fare.transport_type?.name ?? 'Public Transport'}
                              </p>
                              <p className="text-[11px] font-semibold text-[#777078]">
                                {PASSENGER_CATEGORY_LABELS[fare.passenger_category]}
                              </p>
                            </div>
                          </div>
                          <FareStatusBadge status="verified_official" compact />
                        </div>
                        <p className="font-display text-2xl font-extrabold text-[#C9182B]">
                          {formatPhp(fare.fare_amount)}
                        </p>
                        <p className="flex items-center gap-1.5 text-[11px] text-[#777078]">
                          <FileText className="h-3.5 w-3.5 text-[#C9182B] shrink-0" />
                          <span>
                            {fare.issuing_authority} ({fare.official_document_reference})
                          </span>
                        </p>
                        <Link
                          to={`/fares/${fare.id}`}
                          className="inline-block text-xs font-bold text-[#B51224] hover:underline"
                        >
                          View Details →
                        </Link>
                      </GlassCard>
                    ))}
                  </div>
                </div>
              )}

              {selectedCorridorFares.communityEstimates.length > 0 && (
                <div className="space-y-2.5">
                  <div className="glass-pill-tile inline-flex items-center gap-2 rounded-full px-3.5 py-1 text-xs font-bold text-[#29262B]">
                    <AlertTriangle className="h-4 w-4 text-[#C9182B]" />
                    <span>Commuter Fare Guide (Citizen Estimates)</span>
                  </div>
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {selectedCorridorFares.communityEstimates.map((est) => (
                      <GlassCard
                        key={est.id}
                        variant="strong"
                        hoverable
                        className="p-4 space-y-2"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className="liquid-nav-active rounded-xl p-2 text-white">
                              <TransportModeIcon code={est.transport_type?.code} className="h-4 w-4" />
                            </span>
                            <div>
                              <p className="font-bold text-sm text-[#29262B]">
                                {est.transport_type?.name ?? 'Public Transport'}
                              </p>
                              <p className="text-[11px] font-semibold text-[#777078]">
                                {PASSENGER_CATEGORY_LABELS[est.passenger_category]}
                              </p>
                            </div>
                          </div>
                          <FareStatusBadge status="community_estimate" compact />
                        </div>
                        <p className="font-display text-2xl font-extrabold text-[#C9182B]">
                          {formatPhp(est.fare_amount)}
                        </p>
                        <p className="text-[11px] text-[#777078]">
                          Updated {formatDateSafe(est.last_verified_at || est.updated_at)} • Citizen
                          commuter reference
                        </p>
                      </GlassCard>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </section>
      )}

      {/* Registered Route Catalog With Fare Prices */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 px-1">
          <RouteIcon className="h-4 w-4 text-[#C9182B]" />
          <h2 className="font-display text-xl font-extrabold text-[#29262B]">
            Registered Transport Corridors &amp; Fares
          </h2>
        </div>

        {routesLoading ? (
          <div className="grid gap-4 md:grid-cols-2">
            <GlassSkeleton className="h-32" />
            <GlassSkeleton className="h-32" />
          </div>
        ) : !routes || routes.length === 0 ? (
          <EmptyStateCard
            icon={Compass}
            title="No transport corridors registered in the database yet"
            description="Select any two municipalities above to compute live OpenStreetMap road routing, or browse available routes in the Fare Matrix."
          />
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {routes.map((route) => {
              const routeFares = allFares.filter(
                (f) =>
                  f.origin_municipality_id === route.origin_municipality_id &&
                  f.destination_municipality_id === route.destination_municipality_id &&
                  (!route.transport_type_id || f.transport_type_id === route.transport_type_id)
              );
              const {
                officialRegular,
                officialDiscounted,
                communityRegular,
              } = summarizeCorridorFares(routeFares);

              return (
                <GlassCard key={route.id} variant="strong" hoverable className="p-4 space-y-3 flex flex-col justify-between">
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-[#F8E7EA] px-2.5 py-1 text-[11px] font-bold text-[#C9182B]">
                        <TransportModeIcon code={route.transport_type?.code} className="h-3.5 w-3.5" />
                        {route.transport_type?.name}
                      </span>
                      <span className="text-[11px] font-mono text-[#777078]">
                        {route.route_code}
                      </span>
                    </div>

                    <h3 className="font-bold text-sm text-[#29262B]">{route.route_name}</h3>

                    <p className="flex items-center gap-1.5 text-xs text-[#777078]">
                      <MapPin className="h-3.5 w-3.5 text-[#C9182B] shrink-0" />
                      <span>
                        {route.origin?.name} → {route.destination?.name}
                      </span>
                    </p>

                    {route.distance_km && (
                      <p className="text-xs font-semibold text-[#B51224]">
                        Distance: {route.distance_km} km ({route.distance_source ?? 'survey'})
                      </p>
                    )}

                    {/* Direct Fare Display on Route Card */}
                    {officialRegular ? (
                      <div className="glass-pill-tile rounded-[20px] p-3 space-y-1 border-[#E9E5E8]">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-[#B51224]">
                            Approved Tariff Rate
                          </span>
                          <FareStatusBadge status="verified_official" compact />
                        </div>
                        <p className="font-display text-2xl font-extrabold text-[#C9182B]">
                          {formatPhp(officialRegular.fare_amount)}{' '}
                          <span className="text-xs font-semibold text-[#343039]">
                            ({PASSENGER_CATEGORY_LABELS[officialRegular.passenger_category]})
                          </span>
                        </p>
                        {officialDiscounted && (
                          <p className="text-[11px] font-semibold text-[#29262B]">
                            Discounted ({PASSENGER_CATEGORY_LABELS[officialDiscounted.passenger_category]}):{' '}
                            {formatPhp(officialDiscounted.fare_amount)}
                          </p>
                        )}
                      </div>
                    ) : communityRegular ? (
                      <div className="glass-pill-tile rounded-[20px] p-3 space-y-1">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-[#B51224]">
                            Citizen Guide Rate
                          </span>
                          <FareStatusBadge status="community_estimate" compact />
                        </div>
                        <p className="font-display text-2xl font-extrabold text-[#C9182B]">
                          {formatPhp(communityRegular.fare_amount)}{' '}
                          <span className="text-xs font-semibold text-[#343039]">
                            ({PASSENGER_CATEGORY_LABELS[communityRegular.passenger_category]})
                          </span>
                        </p>
                      </div>
                    ) : (
                      <div className="glass-pill-tile rounded-[20px] p-2.5 text-[11px] font-semibold text-[#343039]">
                        No fare estimate yet.
                      </div>
                    )}
                  </div>

                  <div className="pt-1 flex justify-between items-center border-t border-[#E9E5E8]/30">
                    <button
                      type="button"
                      onClick={() => {
                        setOriginId(route.origin_municipality_id);
                        setDestinationId(route.destination_municipality_id);
                      }}
                      className="text-xs font-bold text-[#B51224] hover:underline"
                    >
                      Show on Map &amp; Details
                    </button>
                    <Link
                      to={`/fare-search?origin=${route.origin_municipality_id}&destination=${route.destination_municipality_id}`}
                      className="text-xs font-bold text-[#C9182B] hover:underline"
                    >
                      Full Fare Search →
                    </Link>
                  </div>
                </GlassCard>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
