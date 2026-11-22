import { haversineDistanceKm } from '@/lib/utils';
import type { Municipality, StopCategory, TransportStop } from '@/types/database';

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
