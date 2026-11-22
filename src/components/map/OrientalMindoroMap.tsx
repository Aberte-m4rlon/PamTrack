import { useEffect, useMemo, useState } from 'react';
import {
  MapContainer,
  Marker,
  Polyline,
  Popup,
  TileLayer,
  useMap,
} from 'react-leaflet';
import L from 'leaflet';
import { Compass, LocateFixed, Navigation, Route as RouteIcon } from 'lucide-react';
import {
  ORIENTAL_MINDORO_DEFAULT_ZOOM,
  ORIENTAL_MINDORO_MAP_CENTER,
} from '@/data/orientalMindoro';
import { fetchOsrmDrivingRoute, type OsrmRouteResult } from '@/lib/osrm';
import { haversineDistanceKm } from '@/lib/utils';
import type { Municipality } from '@/types/database';
import { GlassButton, GlassCard } from '@/components/glass/GlassPrimitives';

function createPinIcon(variant: 'default' | 'capital' | 'origin' | 'destination') {
  const bg =
    variant === 'origin'
      ? '#C9182B'
      : variant === 'destination'
        ? '#B51224'
        : variant === 'capital'
          ? '#B51224'
          : '#C9182B';

  const ring =
    variant === 'origin' || variant === 'destination'
      ? '0 0 0 5px rgba(255, 228, 230, 0.92)'
      : '0 0 0 3px rgba(255, 255, 255, 0.88)';

  return L.divIcon({
    className: 'pamasahe-map-marker',
    html: `<div style="width:18px;height:18px;border-radius:9999px;background:${bg};box-shadow:${ring},0 4px 10px rgba(0,0,0,0.28);border:2px solid #ffffff;"></div>`,
    iconSize: [18, 18],
    iconAnchor: [9, 9],
    popupAnchor: [0, -10],
  });
}

function MapViewportController({
  center,
  zoom,
  boundsPoints,
}: {
  center: [number, number];
  zoom: number;
  boundsPoints: [number, number][] | null;
}) {
  const map = useMap();

  useEffect(() => {
    if (boundsPoints && boundsPoints.length >= 2) {
      map.fitBounds(boundsPoints, { padding: [48, 48], maxZoom: 12 });
    }
  }, [map, boundsPoints]);

  useEffect(() => {
    if (!boundsPoints) {
      map.setView(center, zoom);
    }
  }, [map, center, zoom, boundsPoints]);

  return null;
}

export interface OrientalMindoroMapProps {
  municipalities: Municipality[];
  originId?: string;
  destinationId?: string;
  onSelectOrigin?: (municipalityId: string) => void;
  onSelectDestination?: (municipalityId: string) => void;
  onRouteComputed?: (result: OsrmRouteResult) => void;
  heightClassName?: string;
}

export function OrientalMindoroMap({
  municipalities,
  originId,
  destinationId,
  onSelectOrigin,
  onSelectDestination,
  onRouteComputed,
  heightClassName = 'h-[430px]',
}: OrientalMindoroMapProps) {
  const [districtFilter, setDistrictFilter] = useState<'all' | '1st District' | '2nd District'>(
    'all'
  );
  const [osrmRoute, setOsrmRoute] = useState<OsrmRouteResult | null>(null);
  const [routingLoading, setRoutingLoading] = useState(false);
  const [resetSignal, setResetSignal] = useState(0);

  const origin = useMemo(
    () => municipalities.find((m) => m.id === originId) ?? null,
    [municipalities, originId]
  );
  const destination = useMemo(
    () => municipalities.find((m) => m.id === destinationId) ?? null,
    [municipalities, destinationId]
  );

  const visibleMunicipalities = useMemo(() => {
    if (districtFilter === 'all') return municipalities;
    return municipalities.filter(
      (m) => m.district === districtFilter || m.id === originId || m.id === destinationId
    );
  }, [municipalities, districtFilter, originId, destinationId]);

  useEffect(() => {
    if (!origin || !destination || origin.id === destination.id) {
      setOsrmRoute(null);
      return;
    }

    const controller = new AbortController();
    setRoutingLoading(true);

    fetchOsrmDrivingRoute(
      origin.latitude,
      origin.longitude,
      destination.latitude,
      destination.longitude,
      controller.signal
    )
      .then((res) => {
        if (!controller.signal.aborted) {
          setOsrmRoute(res);
          onRouteComputed?.(res);
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setRoutingLoading(false);
        }
      });

    return () => controller.abort();
  }, [origin, destination, onRouteComputed]);

  const polylinePositions = useMemo<[number, number][] | null>(() => {
    if (osrmRoute?.available && osrmRoute.geometry?.coordinates?.length) {
      return osrmRoute.geometry.coordinates.map(([lng, lat]) => [lat, lng]);
    }
    return null;
  }, [osrmRoute]);

  const boundsPoints = useMemo<[number, number][] | null>(() => {
    if (origin && destination && origin.id !== destination.id) {
      return [
        [origin.latitude, origin.longitude],
        [destination.latitude, destination.longitude],
      ];
    }
    return null;
  }, [origin, destination, resetSignal]);

  const straightLineRefKm =
    origin && destination && origin.id !== destination.id
      ? haversineDistanceKm(
          origin.latitude,
          origin.longitude,
          destination.latitude,
          destination.longitude
        )
      : null;

  return (
    <div className="space-y-3">
      {/* Controls Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-1.5">
          {(['all', '1st District', '2nd District'] as const).map((dist) => (
            <button
              key={dist}
              type="button"
              onClick={() => setDistrictFilter(dist)}
              className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition ${
                districtFilter === dist
                  ? 'liquid-nav-active text-white'
                  : 'liquid-btn-glass text-[#29262B] hover:text-[#C9182B]'
              }`}
            >
              {dist === 'all' ? `All 15 LGUs (${municipalities.length})` : dist}
            </button>
          ))}
        </div>

        <GlassButton
          type="button"
          variant="glass"
          size="sm"
          onClick={() => {
            setDistrictFilter('all');
            setResetSignal((n) => n + 1);
          }}
        >
          <LocateFixed className="h-3.5 w-3.5" />
          Reset Province View
        </GlassButton>
      </div>

      {/* Leaflet Interactive Map */}
      <div
        className={`relative overflow-hidden rounded-3xl border border-white/60 shadow-glass ${heightClassName}`}
      >
        <MapContainer
          center={ORIENTAL_MINDORO_MAP_CENTER}
          zoom={ORIENTAL_MINDORO_DEFAULT_ZOOM}
          scrollWheelZoom
          className="h-full w-full z-0"
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          <MapViewportController
            center={ORIENTAL_MINDORO_MAP_CENTER}
            zoom={ORIENTAL_MINDORO_DEFAULT_ZOOM}
            boundsPoints={boundsPoints}
          />

          {visibleMunicipalities.map((muni) => {
            const variant =
              muni.id === originId
                ? 'origin'
                : muni.id === destinationId
                  ? 'destination'
                  : muni.is_capital
                    ? 'capital'
                    : 'default';

            return (
              <Marker
                key={muni.id}
                position={[muni.latitude, muni.longitude]}
                icon={createPinIcon(variant)}
              >
                <Popup>
                  <div className="min-w-[190px] space-y-2 p-0.5 text-[#29262B]">
                    <div>
                      <div className="flex items-center justify-between gap-2">
                        <h4 className="font-bold text-sm">{muni.name}</h4>
                        {muni.is_capital && (
                          <span className="rounded-full bg-[#F8E7EA] px-2 py-0.5 text-[10px] font-bold text-[#C9182B]">
                            Capital
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-[#777078]">
                        {muni.district} • {muni.latitude.toFixed(4)}°N, {muni.longitude.toFixed(4)}°E
                      </p>
                    </div>
                    {muni.description && (
                      <p className="text-xs leading-snug text-[#777078]">{muni.description}</p>
                    )}
                    {(onSelectOrigin || onSelectDestination) && (
                      <div className="flex gap-1.5 pt-1">
                        {onSelectOrigin && (
                          <button
                            type="button"
                            onClick={() => onSelectOrigin(muni.id)}
                            className="liquid-btn-primary flex-1 rounded-full px-2.5 py-1.5 text-[11px] font-bold text-white"
                          >
                            Set Origin
                          </button>
                        )}
                        {onSelectDestination && (
                          <button
                            type="button"
                            onClick={() => onSelectDestination(muni.id)}
                            className="liquid-btn-primary flex-1 rounded-full px-2.5 py-1.5 text-[11px] font-bold text-white"
                          >
                            Set Destination
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </Popup>
              </Marker>
            );
          })}

          {polylinePositions && (
            <Polyline
              positions={polylinePositions}
              pathOptions={{
                color: '#C9182B',
                weight: 5,
                opacity: 0.88,
              }}
            />
          )}
        </MapContainer>

        {/* Legend Overlay */}
        <div className="pointer-events-none absolute bottom-3 left-3 z-[400] hidden sm:block">
          <div className="glass-card-strong flex items-center gap-3 rounded-2xl px-3 py-2 text-[11px] font-semibold text-[#29262B]">
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-[#C9182B]" /> Origin
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-[#B51224]" /> Destination
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-[#B51224]" /> Calapan Capital
            </span>
          </div>
        </div>
      </div>

      {/* Road Routing Telemetry Bar */}
      {origin && destination && origin.id !== destination.id && (
        <GlassCard variant="strong" className="p-3.5">
          <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
            <div className="flex items-center gap-2.5">
              <div className="glass-pill-tile rounded-xl p-2 text-[#C9182B]">
                <RouteIcon className="h-4 w-4" />
              </div>
              <div>
                <p className="font-bold text-[#29262B]">
                  {origin.name} → {destination.name}
                </p>
                {routingLoading ? (
                  <p className="text-xs text-[#777078]">
                    Calculating road geometry via OpenStreetMap / OSRM...
                  </p>
                ) : osrmRoute?.available ? (
                  <p className="text-xs text-[#C9182B] font-semibold">
                    Verified OSRM road distance: {osrmRoute.distanceKm} km (approx.{' '}
                    {osrmRoute.durationMin} mins driving)
                  </p>
                ) : (
                  <p className="text-xs text-[#B51224]">
                    Road routing unavailable ({osrmRoute?.error ?? 'offline'}). Straight-line: ~
                    {straightLineRefKm} km.
                  </p>
                )}
              </div>
            </div>
            <div className="glass-pill-tile flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[11px] font-semibold text-[#777078]">
              <Compass className="h-3.5 w-3.5 text-[#C9182B]" />
              <span>Distance is never used to invent an official fare</span>
            </div>
          </div>
        </GlassCard>
      )}

      {(!origin || !destination) && (
        <div className="flex items-center gap-2 text-xs text-[#777078] px-1">
          <Navigation className="h-3.5 w-3.5 text-[#C9182B]" />
          <span>
            Click any municipality marker on the map to inspect details or choose Origin &amp;
            Destination.
          </span>
        </div>
      )}
    </div>
  );
}
