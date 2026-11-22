import { haversineDistanceKm } from '@/lib/utils';
import type { Municipality, StopCategory, TransportStop, TripStatus } from '@/types/database';

export const STOP_CATEGORY_LABELS: Record<StopCategory, string> = {
  jeepney_stop: 'PUV & Multicab Stop',
  tricycle_terminal: 'Tricycle Terminal',
  bus_terminal: 'Bus Terminal',
  uv_express_terminal: 'UV Express Terminal',
  port_hub: 'Port & Transit Hub',
};

export function isInsideOrientalMindoro(lat: number, lng: number): boolean {
  return lat >= 12.1 && lat <= 13.7 && lng >= 120.7 && lng <= 121.75;
}

export interface NearestMunicipalityMatch {
  municipality: Municipality;
  distanceKm: number;
  withinOrientalMindoro: boolean;
}

/**
 * Finds the closest verified Oriental Mindoro city/municipality to a GPS fix.
 * Explicitly flags whether the coordinate lies inside Oriental Mindoro bounds.
 */
export function findNearestMunicipality(
  lat: number,
  lng: number,
  municipalities: Municipality[]
): NearestMunicipalityMatch | null {
  if (!municipalities.length) return null;
  let best: Municipality | null = null;
  let bestDist = Infinity;

  for (const m of municipalities) {
    const d = haversineDistanceKm(lat, lng, m.latitude, m.longitude);
    if (d < bestDist) {
      bestDist = d;
      best = m;
    }
  }

  if (!best) return null;
  return {
    municipality: best,
    distanceKm: Number(bestDist.toFixed(2)),
    withinOrientalMindoro: isInsideOrientalMindoro(lat, lng),
  };
}

/**
 * Projects point P onto segment AB in local equirectangular coordinates (km)
 * to measure perpendicular distance from an active planned route polyline.
 */
function pointToSegmentKm(
  pLat: number,
  pLng: number,
  aLat: number,
  aLng: number,
  bLat: number,
  bLng: number
): number {
  const meanLatRad = (((aLat + bLat) / 2) * Math.PI) / 180;
  const kmPerDegLat = 111.32;
  const kmPerDegLng = 111.32 * Math.cos(meanLatRad);

  const px = (pLng - aLng) * kmPerDegLng;
  const py = (pLat - aLat) * kmPerDegLat;
  const bx = (bLng - aLng) * kmPerDegLng;
  const by = (bLat - aLat) * kmPerDegLat;

  const lenSq = bx * bx + by * by;
  if (lenSq <= 1e-9) {
    return Math.hypot(px, py);
  }
  const t = Math.max(0, Math.min(1, (px * bx + py * by) / lenSq));
  const projX = t * bx;
  const projY = t * by;
  return Math.hypot(px - projX, py - projY);
}

/**
 * Computes minimum distance (km) from current GPS coordinates to a route polyline
 * (`[lat, lng][]`). Returns 0 if route path has < 2 points.
 */
export function computeRouteDeviationKm(
  currentLat: number,
  currentLng: number,
  polylinePoints: [number, number][]
): number {
  if (polylinePoints.length === 0) return 0;
  if (polylinePoints.length === 1) {
    return haversineDistanceKm(
      currentLat,
      currentLng,
      polylinePoints[0][0],
      polylinePoints[0][1]
    );
  }

  let minDist = Infinity;
  for (let i = 0; i < polylinePoints.length - 1; i++) {
    const [aLat, aLng] = polylinePoints[i];
    const [bLat, bLng] = polylinePoints[i + 1];
    const segDist = pointToSegmentKm(currentLat, currentLng, aLat, aLng, bLat, bLng);
    if (segDist < minDist) {
      minDist = segDist;
    }
  }
  return Number(minDist.toFixed(2));
}

export function sortStopsByDistance(
  lat: number,
  lng: number,
  stops: TransportStop[]
): Array<TransportStop & { distanceKm: number }> {
  return stops
    .map((s) => ({
      ...s,
      distanceKm: haversineDistanceKm(lat, lng, s.latitude, s.longitude),
    }))
    .sort((a, b) => a.distanceKm - b.distanceKm);
}

export function formatDurationSeconds(totalSeconds: number): string {
  const sec = Math.max(0, Math.floor(totalSeconds));
  const hrs = Math.floor(sec / 3600);
  const mins = Math.floor((sec % 3600) / 60);
  const rem = sec % 60;
  if (hrs > 0) {
    return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(rem).padStart(2, '0')}`;
  }
  return `${String(mins).padStart(2, '0')}:${String(rem).padStart(2, '0')}`;
}

/**
 * Computes initial forward compass bearing (0..359 degrees) between two WGS84 points.
 */
export function computeBearingDeg(
  fromLat: number,
  fromLng: number,
  toLat: number,
  toLng: number
): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const lat1 = toRad(fromLat);
  const lat2 = toRad(toLat);
  const dLng = toRad(toLng - fromLng);
  const y = Math.sin(dLng) * Math.cos(lat2);
  const x =
    Math.cos(lat1) * Math.sin(lat2) -
    Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);
  if (Math.abs(x) < 1e-12 && Math.abs(y) < 1e-12) return 0;
  const deg = (Math.atan2(y, x) * 180) / Math.PI;
  return Math.round((deg + 360) % 360);
}

const COMPASS_SECTORS = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'] as const;

export function formatCompassDirection(headingDeg: number | null | undefined): string {
  if (headingDeg === null || headingDeg === undefined || !Number.isFinite(headingDeg)) {
    return '—';
  }
  const normalized = ((headingDeg % 360) + 360) % 360;
  const index = Math.round(normalized / 45) % 8;
  return COMPASS_SECTORS[index];
}

export interface MovementTelemetryInput {
  currentLat: number;
  currentLng: number;
  currentTimestampMs: number;
  hardwareSpeedMps?: number | null;
  hardwareHeadingDeg?: number | null;
  previousPoint?: {
    latitude: number;
    longitude: number;
    timestampMs: number;
  } | null;
}

export interface MovementTelemetryResult {
  speedKmh: number;
  speedMps: number;
  headingDeg: number | null;
  stepKm: number;
}

/**
 * Resolves live movement speed and heading, falling back to consecutive
 * distance/timestamp deltas when device GPS omits speedMps or headingDeg.
 */
export function resolveMovementTelemetry(
  input: MovementTelemetryInput
): MovementTelemetryResult {
  let stepKm = 0;
  let derivedBearing: number | null = null;
  let derivedSpeedKmh = 0;

  if (input.previousPoint) {
    stepKm = haversineDistanceKm(
      input.previousPoint.latitude,
      input.previousPoint.longitude,
      input.currentLat,
      input.currentLng
    );
    const dtSeconds =
      (input.currentTimestampMs - input.previousPoint.timestampMs) / 1000;
    // Ignore tiny stationary GPS drift (< 3m) or wild cross-island jumps (> 10 km in one tick)
    if (stepKm >= 0.003 && stepKm < 10) {
      derivedBearing = computeBearingDeg(
        input.previousPoint.latitude,
        input.previousPoint.longitude,
        input.currentLat,
        input.currentLng
      );
      if (dtSeconds >= 0.8) {
        derivedSpeedKmh = Math.min(160, (stepKm / dtSeconds) * 3600);
      }
    }
  }

  const hasHardwareSpeed =
    typeof input.hardwareSpeedMps === 'number' &&
    Number.isFinite(input.hardwareSpeedMps) &&
    input.hardwareSpeedMps >= 0;

  const speedKmhRaw = hasHardwareSpeed
    ? Math.min(160, (input.hardwareSpeedMps as number) * 3.6)
    : derivedSpeedKmh;

  const speedKmh = Number(speedKmhRaw.toFixed(1));
  const speedMps = Number((speedKmhRaw / 3.6).toFixed(2));

  const hasHardwareHeading =
    typeof input.hardwareHeadingDeg === 'number' &&
    Number.isFinite(input.hardwareHeadingDeg) &&
    input.hardwareHeadingDeg >= 0;

  const headingDeg = hasHardwareHeading
    ? Math.round(((input.hardwareHeadingDeg as number) % 360 + 360) % 360)
    : derivedBearing;

  return {
    speedKmh,
    speedMps,
    headingDeg,
    stepKm,
  };
}

export interface MovementClassification {
  label: string;
  isMoving: boolean;
}

export function classifyMovementState(
  speedKmh: number,
  staleSeconds = 0,
  tripStatus: TripStatus = 'active'
): MovementClassification {
  if (tripStatus === 'completed') {
    return { label: 'Trip Completed', isMoving: false };
  }
  if (tripStatus === 'cancelled') {
    return { label: 'Trip Cancelled', isMoving: false };
  }
  if (staleSeconds > 60) {
    return { label: 'Signal Delayed', isMoving: false };
  }
  if (speedKmh < 1.5) {
    return { label: 'Stopped / Waiting', isMoving: false };
  }
  if (speedKmh < 15) {
    return { label: 'Slow / Traffic', isMoving: true };
  }
  if (speedKmh < 45) {
    return { label: 'Moving Steadily', isMoving: true };
  }
  return { label: 'Fast Travel', isMoving: true };
}

export function estimateEtaMinutes(
  remainingKm: number | null,
  currentSpeedKmh: number,
  avgSpeedKmh = 0
): number | null {
  if (remainingKm === null || !Number.isFinite(remainingKm) || remainingKm <= 0) {
    return null;
  }
  if (remainingKm <= 0.15) return 1;
  const effectiveSpeed =
    currentSpeedKmh >= 4 ? currentSpeedKmh : avgSpeedKmh >= 4 ? avgSpeedKmh : 0;
  if (effectiveSpeed <= 0) return null;
  return Math.max(1, Math.round((remainingKm / effectiveSpeed) * 60));
}
