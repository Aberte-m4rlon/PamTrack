import { describe, expect, it } from 'vitest';
import {
  ORIENTAL_MINDORO_MUNICIPALITIES,
  VERIFIED_TRANSPORT_STOPS_FALLBACK,
} from '@/data/orientalMindoro';
import {
  computeRouteDeviationKm,
  findNearestMunicipality,
  formatDurationSeconds,
  isInsideOrientalMindoro,
  sortStopsByDistance,
} from '@/lib/gpsUtils';

describe('GPS Geospatial, Route Deviation, and Terminal Distance Utilities', () => {
  it('identifies coordinates inside Oriental Mindoro and detects closest municipality', () => {
    expect(isInsideOrientalMindoro(13.407, 121.1778)).toBe(true);
    expect(isInsideOrientalMindoro(14.5995, 120.9842)).toBe(false); // Manila

    const match = findNearestMunicipality(
      13.412,
      121.179,
      ORIENTAL_MINDORO_MUNICIPALITIES
    );
    expect(match?.municipality.name).toBe('Calapan City');
    expect(match?.withinOrientalMindoro).toBe(true);
    expect(match?.distanceKm).toBeLessThan(1.5);

    const outOfProvince = findNearestMunicipality(
      14.5995,
      120.9842,
      ORIENTAL_MINDORO_MUNICIPALITIES
    );
    expect(outOfProvince?.withinOrientalMindoro).toBe(false);
  });

  it('computes perpendicular route deviation accurately in km', () => {
    const corridor: [number, number][] = [
      [13.407, 121.1778], // Calapan City
      [13.3242, 121.303], // Naujan
    ];

    // Near midpoint of the corridor -> minimal deviation (< 1 km)
    const onTrack = computeRouteDeviationKm(13.3656, 121.2404, corridor);
    expect(onTrack).toBeLessThan(0.5);

    // Far west in Puerto Galera -> significant route deviation (> 20 km)
    const offTrack = computeRouteDeviationKm(13.5018, 120.9541, corridor);
    expect(offTrack).toBeGreaterThan(20);
  });

  it('sorts verified transport stops by proximity to GPS coordinates', () => {
    // Near Balatero Port, Puerto Galera
    const sorted = sortStopsByDistance(
      13.504,
      120.933,
      VERIFIED_TRANSPORT_STOPS_FALLBACK
    );
    expect(sorted[0].stop_name).toBe('Balatero Port Terminal');
    expect(sorted[0].distanceKm).toBeLessThan(1);
    expect(sorted[sorted.length - 1].stop_name).toBe('Bulalacao Port Terminal');
  });

  it('formats elapsed trip durations cleanly', () => {
    expect(formatDurationSeconds(65)).toBe('01:05');
    expect(formatDurationSeconds(3665)).toBe('01:01:05');
  });
});
