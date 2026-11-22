import { LocateFixed, WifiOff } from 'lucide-react';
import type { GpsPositionSnapshot } from '@/contexts/GpsContext';

interface OfflineTripRadarProps {
  originName?: string;
  destName?: string;
  originCoords?: [number, number] | null;
  destCoords?: [number, number] | null;
  plannedPolyline: [number, number][];
  trail: [number, number][];
  currentPosition: GpsPositionSnapshot | null;
  distanceTraveledKm: number;
  remainingDestKm: number | null;
  deviationKm: number;
  nearestLguName?: string | null;
}

/**
 * Renders a self-contained SVG corridor radar when OpenStreetMap tiles are
 * unavailable offline so commuters can continuously monitor moving GPS
 * coordinates, trail breadcrumbs, and corridor offset.
 */
export function OfflineTripRadar({
  originName = 'Origin',
  destName = 'Destination',
  originCoords,
  destCoords,
  plannedPolyline,
  trail,
  currentPosition,
  distanceTraveledKm,
  remainingDestKm,
  deviationKm,
  nearestLguName,
}: OfflineTripRadarProps) {
  const allPoints: [number, number][] = [
    ...plannedPolyline,
    ...trail,
    ...(originCoords ? [originCoords] : []),
    ...(destCoords ? [destCoords] : []),
    ...(currentPosition ? [[currentPosition.latitude, currentPosition.longitude] as [number, number]] : []),
  ];

  const lats = allPoints.map((p) => p[0]);
  const lngs = allPoints.map((p) => p[1]);
  const minLat = lats.length ? Math.min(...lats) : 12.2;
  const maxLat = lats.length ? Math.max(...lats) : 13.5;
  const minLng = lngs.length ? Math.min(...lngs) : 120.8;
  const maxLng = lngs.length ? Math.max(...lngs) : 121.6;

  const latSpan = Math.max(0.02, maxLat - minLat);
  const lngSpan = Math.max(0.02, maxLng - minLng);

  const project = ([lat, lng]: [number, number]): [number, number] => {
    const x = 36 + ((lng - minLng) / lngSpan) * 328;
    const y = 204 - ((lat - minLat) / latSpan) * 168;
    return [Number(x.toFixed(1)), Number(y.toFixed(1))];
  };

  const toSvgPoints = (pts: [number, number][]) =>
    pts.map((p) => project(p).join(',')).join(' ');

  const liveXY = currentPosition
    ? project([currentPosition.latitude, currentPosition.longitude])
    : null;
  const originXY = originCoords ? project(originCoords) : null;
  const destXY = destCoords ? project(destCoords) : null;
  const speedKmh =
    currentPosition?.speedMps !== null &&
    currentPosition?.speedMps !== undefined &&
    currentPosition.speedMps >= 0
      ? Math.round(currentPosition.speedMps * 3.6)
      : 0;

  return (
    <div
      data-testid="offline-gps-radar"
      className="glass-pill-tile rounded-3xl p-4 space-y-3"
    >
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-[#FFE4E6] px-3 py-1 font-bold text-[#B91C1C]">
          <WifiOff className="h-3.5 w-3.5" />
          Offline GPS Corridor Monitor
        </span>
        <span className="inline-flex items-center gap-1 font-semibold text-[#4B3B40]">
          <LocateFixed className="h-3.5 w-3.5 text-[#DC2626]" />
          {currentPosition
            ? `${currentPosition.latitude.toFixed(4)}°N, ${currentPosition.longitude.toFixed(4)}°E (±${currentPosition.accuracyMeters}m)`
            : 'Waiting for GPS fix...'}
        </span>
      </div>

      <div className="overflow-hidden rounded-2xl border border-white/85 bg-white/55">
        <svg
          viewBox="0 0 400 240"
          role="img"
          aria-label="Offline moving GPS corridor view"
          className="h-56 w-full"
        >
          <defs>
            <linearGradient id="offlineRadarBg" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#FFF1F2" stopOpacity="0.9" />
              <stop offset="100%" stopColor="#FFE4E6" stopOpacity="0.65" />
            </linearGradient>
          </defs>
          <rect width="400" height="240" fill="url(#offlineRadarBg)" />
          <g stroke="#FCA5A5" strokeOpacity="0.35" strokeWidth="1">
            <line x1="0" y1="60" x2="400" y2="60" />
            <line x1="0" y1="120" x2="400" y2="120" />
            <line x1="0" y1="180" x2="400" y2="180" />
            <line x1="100" y1="0" x2="100" y2="240" />
            <line x1="200" y1="0" x2="200" y2="240" />
            <line x1="300" y1="0" x2="300" y2="240" />
          </g>

          {plannedPolyline.length >= 2 && (
            <polyline
              fill="none"
              stroke="#FCA5A5"
              strokeWidth="4"
              strokeDasharray="6 6"
              strokeLinecap="round"
              points={toSvgPoints(plannedPolyline)}
            />
          )}

          {trail.length >= 2 && (
            <polyline
              fill="none"
              stroke="#DC2626"
              strokeWidth="4"
              strokeLinecap="round"
              strokeLinejoin="round"
              points={toSvgPoints(trail)}
            />
          )}

          {originXY && (
            <g>
              <circle cx={originXY[0]} cy={originXY[1]} r="7" fill="#FFFFFF" stroke="#DC2626" strokeWidth="3" />
              <text x={originXY[0] + 10} y={originXY[1] + 4} fontSize="10" fontWeight="700" fill="#24191D">
                {originName}
              </text>
            </g>
          )}

          {destXY && (
            <g>
              <circle cx={destXY[0]} cy={destXY[1]} r="7" fill="#B91C1C" stroke="#FFFFFF" strokeWidth="2.5" />
              <text x={destXY[0] - 10} y={destXY[1] - 10} textAnchor="end" fontSize="10" fontWeight="700" fill="#B91C1C">
                {destName}
              </text>
            </g>
          )}

          {liveXY && (
            <g>
              <circle cx={liveXY[0]} cy={liveXY[1]} r="13" fill="#DC2626" fillOpacity="0.22" />
              <circle cx={liveXY[0]} cy={liveXY[1]} r="6.5" fill="#DC2626" stroke="#FFFFFF" strokeWidth="2.5" />
            </g>
          )}
        </svg>
      </div>

      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4 text-xs">
        <div className="glass-panel rounded-2xl p-2.5 text-center">
          <p className="text-[10px] font-bold uppercase text-[#4B3B40]">Moved</p>
          <p className="font-display text-base font-extrabold text-[#DC2626]">
            {distanceTraveledKm.toFixed(2)} km
          </p>
        </div>
        <div className="glass-panel rounded-2xl p-2.5 text-center">
          <p className="text-[10px] font-bold uppercase text-[#4B3B40]">To Dest</p>
          <p className="font-display text-base font-extrabold text-[#B91C1C]">
            {remainingDestKm !== null ? `${remainingDestKm.toFixed(1)} km` : '—'}
          </p>
        </div>
        <div className="glass-panel rounded-2xl p-2.5 text-center">
          <p className="text-[10px] font-bold uppercase text-[#4B3B40]">Speed</p>
          <p className="font-display text-base font-extrabold text-[#24191D]">{speedKmh} km/h</p>
        </div>
        <div className="glass-panel rounded-2xl p-2.5 text-center">
          <p className="text-[10px] font-bold uppercase text-[#4B3B40]">
            {nearestLguName ? 'Nearest LGU' : 'Offset'}
          </p>
          <p className="truncate font-display text-sm font-extrabold text-[#DC2626]">
            {nearestLguName || `${deviationKm.toFixed(1)} km`}
          </p>
        </div>
      </div>
    </div>
  );
}
