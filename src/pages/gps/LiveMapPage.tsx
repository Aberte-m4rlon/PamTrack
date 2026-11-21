import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Circle,
  MapContainer,
  Marker,
  Polyline,
  Popup,
  TileLayer,
  useMap,
} from 'react-leaflet';
import L from 'leaflet';
import { Compass, Navigation, Route as RouteIcon } from 'lucide-react';
import { useGps } from '@/contexts/GpsContext';
import {
  ORIENTAL_MINDORO_DEFAULT_ZOOM,
  ORIENTAL_MINDORO_MAP_CENTER,
} from '@/data/orientalMindoro';
import { useMunicipalities, useTransportStops } from '@/hooks/useReferenceData';
import { STOP_CATEGORY_LABELS } from '@/lib/gpsUtils';
import { fetchOsrmDrivingRoute, type OsrmRouteResult } from '@/lib/osrm';
import { haversineDistanceKm } from '@/lib/utils';
import type { StopCategory } from '@/types/database';
import { GpsConsentCard } from '@/components/gps/GpsConsentCard';
import { GlassButton, GlassCard } from '@/components/glass/GlassPrimitives';

const userGpsIcon = L.divIcon({
  className: 'user-gps-marker',
  html: `<div style="width:20px;height:20px;border-radius:9999px;background:#2563EB;border:3px solid #fff;box-shadow:0 0 0 6px rgba(37,99,235,0.28);"></div>`,
  iconSize: [20, 20],
  iconAnchor: [10, 10],
});

const stopPinIcon = L.divIcon({
  className: 'stop-pin-marker',
  html: `<div style="width:16px;height:16px;border-radius:6px;background:#DC2626;border:2px solid #FFE4E6;box-shadow:0 3px 8px rgba(0,0,0,0.3);"></div>`,
  iconSize: [16, 16],
  iconAnchor: [8, 8],
});

const destPinIcon = L.divIcon({
  className: 'dest-pin-marker',
  html: `<div style="width:18px;height:18px;border-radius:9999px;background:#B91C1C;border:2px solid #fff;box-shadow:0 0 0 4px rgba(252,165,165,0.65);"></div>`,
  iconSize: [18, 18],
  iconAnchor: [9, 9],
});

function LiveMapFocus({
  center,
  zoom,
}: {
  center: [number, number] | null;
  zoom: number;
}) {
  const map = useMap();
  useEffect(() => {
    if (center) {
      map.setView(center, zoom);
    }
  }, [map, center, zoom]);
  return null;
}

export function LiveMapPage() {
  const { currentPosition } = useGps();
  const { data: muniRes } = useMunicipalities();
  const { data: stops } = useTransportStops();

  const municipalities = muniRes?.data ?? [];
  const [categoryFilter, setCategoryFilter] = useState<'all' | StopCategory>('all');
  const [selectedDest, setSelectedDest] = useState<{
    name: string;
    lat: number;
    lng: number;
    municipalityId?: string;
  } | null>(null);
  const [osrmRoute, setOsrmRoute] = useState<OsrmRouteResult | null>(null);
  const [focusUserTrigger, setFocusUserTrigger] = useState(0);

  const visibleStops = useMemo(() => {
    return (stops ?? []).filter((s) =>
      categoryFilter === 'all' ? true : s.stop_category === categoryFilter
    );
  }, [stops, categoryFilter]);

  useEffect(() => {
    if (!currentPosition || !selectedDest) {
      setOsrmRoute(null);
      return;
    }
    const ctrl = new AbortController();
    fetchOsrmDrivingRoute(
      currentPosition.latitude,
      currentPosition.longitude,
      selectedDest.lat,
      selectedDest.lng,
      ctrl.signal
    ).then((res) => {
      if (!ctrl.signal.aborted) setOsrmRoute(res);
    });
    return () => ctrl.abort();
  }, [currentPosition, selectedDest]);

  const polyline = useMemo<[number, number][] | null>(() => {
    if (!osrmRoute?.available || !osrmRoute.geometry?.coordinates?.length) return null;
    return osrmRoute.geometry.coordinates.map(([lng, lat]) => [lat, lng]);
  }, [osrmRoute]);

  const mapFocusCenter = useMemo<[number, number] | null>(() => {
    if (focusUserTrigger > 0 && currentPosition) {
      return [currentPosition.latitude, currentPosition.longitude];
    }
    return null;
  }, [focusUserTrigger, currentPosition]);

  return (
    <div className="space-y-5">
      <GlassCard variant="strong" className="p-5 sm:p-6 space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-[#DC2626]">
              Real-Time Geospatial View
            </p>
            <h1 className="font-display text-2xl font-extrabold text-[#24191D] sm:text-3xl">
              Live GPS Location &amp; Verified Terminals Map
            </h1>
            <p className="text-xs sm:text-sm text-[#78716C]">
              View your live browser GPS position, accuracy circle, verified Oriental Mindoro ports
              &amp; terminals, and OSRM directions to any selected destination.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link to="/nearby">
              <GlassButton variant="secondary" size="sm">
                <Navigation className="h-3.5 w-3.5" />
                Nearby Stops List
              </GlassButton>
            </Link>
            <Link to="/trips">
              <GlassButton variant="primary" size="sm">
                Start Live Trip
              </GlassButton>
            </Link>
          </div>
        </div>
      </GlassCard>

      <GpsConsentCard />

      <GlassCard variant="surface" className="p-4 sm:p-5 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap gap-1.5">
            {(['all', 'port_hub', 'jeepney_stop', 'bus_terminal', 'uv_express_terminal', 'tricycle_terminal'] as const).map(
              (cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setCategoryFilter(cat)}
                  className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                    categoryFilter === cat
                      ? 'bg-gradient-to-r from-[#DC2626] to-[#B91C1C] text-white shadow-sm'
                      : 'bg-white/80 text-[#24191D] border border-white hover:bg-[#FFE4E6]/80 hover:text-[#DC2626]'
                  }`}
                >
                  {cat === 'all'
                    ? `All Verified Stops (${stops?.length ?? 0})`
                    : STOP_CATEGORY_LABELS[cat]}
                </button>
              )
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              value={selectedDest?.name ?? ''}
              onChange={(e) => {
                const muni = municipalities.find((m) => m.name === e.target.value);
                if (muni) {
                  setSelectedDest({
                    name: muni.name,
                    lat: muni.latitude,
                    lng: muni.longitude,
                    municipalityId: muni.id,
                  });
                } else {
                  setSelectedDest(null);
                }
              }}
              aria-label="Choose destination municipality"
              className="glass-input rounded-2xl px-3 py-1.5 text-xs font-semibold"
            >
              <option value="">Select destination LGU...</option>
              {municipalities.map((m) => (
                <option key={m.id} value={m.name}>
                  Dest: {m.name}
                </option>
              ))}
            </select>

            {currentPosition && (
              <GlassButton
                type="button"
                variant="glass"
                size="sm"
                onClick={() => setFocusUserTrigger((n) => n + 1)}
              >
                Center on Me
              </GlassButton>
            )}
          </div>
        </div>

        <div className="h-[340px] sm:h-[440px] overflow-hidden rounded-3xl border border-white/80 shadow-glass">
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
            <LiveMapFocus center={mapFocusCenter} zoom={13} />

            {/* User Live GPS Marker + Accuracy Radius */}
            {currentPosition && (
              <>
                <Marker
                  position={[currentPosition.latitude, currentPosition.longitude]}
                  icon={userGpsIcon}
                >
                  <Popup>
                    <div className="text-xs space-y-1 text-[#24191D]">
                      <p className="font-bold text-[#2563EB]">Your Current GPS Position</p>
                      <p>
                        {currentPosition.latitude.toFixed(5)}°N,{' '}
                        {currentPosition.longitude.toFixed(5)}°E
                      </p>
                      <p>Accuracy: ±{currentPosition.accuracyMeters} m</p>
                    </div>
                  </Popup>
                </Marker>
                <Circle
                  center={[currentPosition.latitude, currentPosition.longitude]}
                  radius={Math.min(currentPosition.accuracyMeters, 2000)}
                  pathOptions={{
                    color: '#2563EB',
                    fillColor: '#60A5FA',
                    fillOpacity: 0.18,
                    weight: 1.5,
                  }}
                />
              </>
            )}

            {/* Verified Transport Stops */}
            {visibleStops.map((stop) => (
              <Marker
                key={stop.id}
                position={[stop.latitude, stop.longitude]}
                icon={stopPinIcon}
              >
                <Popup>
                  <div className="min-w-[200px] space-y-1.5 text-xs">
                    <span className="inline-block rounded-full bg-[#FFE4E6] px-2 py-0.5 text-[10px] font-bold text-[#DC2626]">
                      {STOP_CATEGORY_LABELS[stop.stop_category]}
                    </span>
                    <h3 className="font-bold text-sm text-[#24191D]">{stop.stop_name}</h3>
                    {stop.address_or_landmark && (
                      <p className="text-[#78716C]">{stop.address_or_landmark}</p>
                    )}
                    {stop.operating_notes && (
                      <p className="text-[#78716C]">{stop.operating_notes}</p>
                    )}
                    {currentPosition && (
                      <p className="font-bold text-[#DC2626]">
                        ~
                        {haversineDistanceKm(
                          currentPosition.latitude,
                          currentPosition.longitude,
                          stop.latitude,
                          stop.longitude
                        )}{' '}
                        km away
                      </p>
                    )}
                    <button
                      type="button"
                      onClick={() =>
                        setSelectedDest({
                          name: stop.stop_name,
                          lat: stop.latitude,
                          lng: stop.longitude,
                          municipalityId: stop.municipality_id,
                        })
                      }
                      className="w-full rounded-xl bg-gradient-to-r from-[#DC2626] to-[#B91C1C] px-2.5 py-1.5 text-[11px] font-bold text-white"
                    >
                      Route to This Stop
                    </button>
                  </div>
                </Popup>
              </Marker>
            ))}

            {/* Selected Destination Marker */}
            {selectedDest && (
              <Marker
                position={[selectedDest.lat, selectedDest.lng]}
                icon={destPinIcon}
              >
                <Popup>
                  <div className="text-xs font-bold text-[#24191D]">
                    Destination: {selectedDest.name}
                  </div>
                </Popup>
              </Marker>
            )}

            {polyline && (
              <Polyline
                positions={polyline}
                pathOptions={{ color: '#DC2626', weight: 5, opacity: 0.88 }}
              />
            )}
          </MapContainer>
        </div>

        {selectedDest && (
          <GlassCard variant="strong" className="p-3.5 flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2">
              <RouteIcon className="h-4 w-4 text-[#DC2626]" />
              <span>
                Selected Destination: <strong>{selectedDest.name}</strong>
              </span>
            </div>
            {currentPosition ? (
              osrmRoute?.available ? (
                <span className="font-bold text-[#DC2626]">
                  OSRM Route from your location: {osrmRoute.distanceKm} km (~{osrmRoute.durationMin}{' '}
                  mins)
                </span>
              ) : (
                <span className="text-amber-800">
                  Straight-line distance:{' '}
                  {haversineDistanceKm(
                    currentPosition.latitude,
                    currentPosition.longitude,
                    selectedDest.lat,
                    selectedDest.lng
                  )}{' '}
                  km
                </span>
              )
            ) : (
              <span className="inline-flex items-center gap-1 text-[#78716C]">
                <Compass className="h-3.5 w-3.5" />
                Enable GPS above to calculate driving directions from your location.
              </span>
            )}
          </GlassCard>
        )}
      </GlassCard>
    </div>
  );
}
