import type { GeoJsonLineString } from '@/types/database';

export interface OsrmRouteResult {
  available: boolean;
  distanceKm: number | null;
  durationMin: number | null;
  geometry: GeoJsonLineString | null;
  error?: string;
}

const DEFAULT_OSRM_BASE =
  import.meta.env.VITE_OSRM_BASE_URL?.trim() || 'https://router.project-osrm.org';

/**
 * Queries real road distance & geometry via OSRM between two coordinates.
 * Never fabricates road geometry or fares when OSRM is unreachable.
 */
export async function fetchOsrmDrivingRoute(
  originLat: number,
  originLng: number,
  destLat: number,
  destLng: number,
  signal?: AbortSignal
): Promise<OsrmRouteResult> {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    return {
      available: false,
      distanceKm: null,
      durationMin: null,
      geometry: null,
      error: 'Offline Mode: road routing paused until internet connection returns.',
    };
  }

  if (originLat === destLat && originLng === destLng) {
    return {
      available: false,
      distanceKm: null,
      durationMin: null,
      geometry: null,
      error: 'Origin and destination must be different locations.',
    };
  }

  try {
    const url = `${DEFAULT_OSRM_BASE}/route/v1/driving/${originLng},${originLat};${destLng},${destLat}?overview=full&geometries=geojson`;
    const response = await fetch(url, { signal });
    if (!response.ok) {
      return {
        available: false,
        distanceKm: null,
        durationMin: null,
        geometry: null,
        error: `Road routing service returned HTTP ${response.status}.`,
      };
    }

    const data = await response.json();
    const firstRoute = data?.routes?.[0];
    if (!firstRoute || typeof firstRoute.distance !== 'number') {
      return {
        available: false,
        distanceKm: null,
        durationMin: null,
        geometry: null,
        error: 'No verified road route was returned between these points.',
      };
    }

    return {
      available: true,
      distanceKm: Number((firstRoute.distance / 1000).toFixed(2)),
      durationMin: Math.max(1, Math.round(firstRoute.duration / 60)),
      geometry: firstRoute.geometry ?? null,
    };
  } catch (err) {
    return {
      available: false,
      distanceKm: null,
      durationMin: null,
      geometry: null,
      error:
        err instanceof Error
          ? err.message
          : 'Unable to reach OSRM road routing service.',
    };
  }
}
