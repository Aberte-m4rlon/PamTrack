import { describe, expect, it } from 'vitest';
import {
  DEFAULT_TRANSPORT_TYPES,
  ORIENTAL_MINDORO_MUNICIPALITIES,
} from '@/data/orientalMindoro';
import { fetchTransportTypes } from '@/services/pamasaheApi';
import { haversineDistanceKm } from '@/lib/utils';

const REQUIRED_15_LGUS = [
  'Calapan City',
  'Baco',
  'Puerto Galera',
  'San Teodoro',
  'Naujan',
  'Victoria',
  'Socorro',
  'Pola',
  'Pinamalayan',
  'Gloria',
  'Bansud',
  'Bongabong',
  'Roxas',
  'Mansalay',
  'Bulalacao',
];

describe('Oriental Mindoro Geospatial Reference Integrity', () => {
  it('contains all 15 required city and municipalities with verified Mindoro coordinates', () => {
    expect(ORIENTAL_MINDORO_MUNICIPALITIES).toHaveLength(15);

    const names = ORIENTAL_MINDORO_MUNICIPALITIES.map((m) => m.name);
    for (const required of REQUIRED_15_LGUS) {
      expect(names).toContain(required);
    }

    for (const m of ORIENTAL_MINDORO_MUNICIPALITIES) {
      expect(m.latitude).toBeGreaterThanOrEqual(12.2);
      expect(m.latitude).toBeLessThanOrEqual(13.6);
      expect(m.longitude).toBeGreaterThanOrEqual(120.8);
      expect(m.longitude).toBeLessThanOrEqual(121.6);
    }
  });

  it('includes all 5 schema modes with Jeepney deactivated across active public modes', async () => {
    const allModes = DEFAULT_TRANSPORT_TYPES.map((t) => t.name);
    expect(allModes).toEqual(['Jeepney', 'Tricycle', 'UV Express', 'Bus', 'Multicab']);

    const { data: activeModes } = await fetchTransportTypes(false);
    expect(activeModes.map((t) => t.name)).toEqual(['Tricycle', 'UV Express', 'Bus', 'Multicab']);
  });

  it('computes accurate geodesic distance reference between Calapan City and Bulalacao', () => {
    const calapan = ORIENTAL_MINDORO_MUNICIPALITIES.find((m) => m.name === 'Calapan City')!;
    const bulalacao = ORIENTAL_MINDORO_MUNICIPALITIES.find((m) => m.name === 'Bulalacao')!;
    const dist = haversineDistanceKm(
      calapan.latitude,
      calapan.longitude,
      bulalacao.latitude,
      bulalacao.longitude
    );
    expect(dist).toBeGreaterThan(110);
    expect(dist).toBeLessThan(140);
  });
});
