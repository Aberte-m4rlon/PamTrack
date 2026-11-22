-- ============================================================================
-- 017_seed_all_mindoro_corridor_estimates.sql
-- Pamasahe Tracker – Oriental Mindoro
-- Populates complete 15x15 province-wide citizen commuter fare estimates across
-- active public transport modes (Multicab, UV Express, Bus, Tricycle) so
-- any Origin -> Destination lookup anywhere in Oriental Mindoro has an initial
-- community reference estimate while preserving user-provided corridor baselines.
-- Safe & idempotent: checks existing active fare_records before inserting.
-- ============================================================================

WITH pairs AS (
  SELECT
    o.id AS origin_id,
    d.id AS dest_id,
    o.slug AS orig_slug,
    d.slug AS dest_slug,
    -- Approximate geodesic distance (km)
    2 * 6371 * asin(
      sqrt(
        power(sin(radians(d.latitude - o.latitude) / 2), 2) +
        cos(radians(o.latitude)) * cos(radians(d.latitude)) *
        power(sin(radians(d.longitude - o.longitude) / 2), 2)
      )
    ) AS geo_km
  FROM public.municipalities o
  CROSS JOIN public.municipalities d
  WHERE o.is_active = true AND d.is_active = true
),
modes AS (
  SELECT
    (SELECT id FROM public.transport_types WHERE code = 'tricycle') AS trike_id,
    (SELECT id FROM public.transport_types WHERE code = 'multicab') AS mcb_id,
    (SELECT id FROM public.transport_types WHERE code = 'uv_express') AS uv_id,
    (SELECT id FROM public.transport_types WHERE code = 'bus') AS bus_id
),
candidates AS (
  -- 1. Intra-municipality Tricycle regular estimates across all 15 LGUs
  SELECT
    p.origin_id,
    p.dest_id,
    m.trike_id AS transport_type_id,
    'regular'::public.passenger_category AS passenger_category,
    CASE
      WHEN p.orig_slug IN ('puerto-galera', 'bulalacao') THEN 17.00
      ELSE 15.00
    END AS fare_amount,
    'Intra-municipality tricycle base minimum estimate (first 2 km).' AS notes
  FROM pairs p, modes m
  WHERE p.origin_id = p.dest_id

  UNION ALL

  -- 2. Short & medium inter-town corridors (<= 45 km geodesic): Multicab estimate
  SELECT
    p.origin_id,
    p.dest_id,
    m.mcb_id AS transport_type_id,
    'regular'::public.passenger_category AS passenger_category,
    GREATEST(25, round((15 + (p.geo_km * 1.28) * 2.15) / 5.0) * 5)::numeric(10, 2) AS fare_amount,
    'Province-wide proportional Multicab commuter estimate along Mindoro corridor.' AS notes
  FROM pairs p, modes m
  WHERE p.origin_id <> p.dest_id AND p.geo_km <= 45

  UNION ALL

  -- 3. Longer provincial inter-district corridors (> 45 km geodesic): Bus estimate
  SELECT
    p.origin_id,
    p.dest_id,
    m.bus_id AS transport_type_id,
    'regular'::public.passenger_category AS passenger_category,
    GREATEST(110, round((30 + (p.geo_km * 1.28) * 2.15) / 5.0) * 5)::numeric(10, 2) AS fare_amount,
    'Province-wide proportional provincial Bus commuter estimate along Mindoro Nautical Highway.' AS notes
  FROM pairs p, modes m
  WHERE p.origin_id <> p.dest_id AND p.geo_km > 45

  UNION ALL

  -- 4. All inter-town corridors: UV Express commuter estimate
  SELECT
    p.origin_id,
    p.dest_id,
    m.uv_id AS transport_type_id,
    'regular'::public.passenger_category AS passenger_category,
    CASE
      WHEN p.geo_km <= 45 THEN GREATEST(40, round((25 + (p.geo_km * 1.28) * 2.65) / 5.0) * 5)
      ELSE GREATEST(130, round((40 + (p.geo_km * 1.28) * 2.45) / 5.0) * 5)
    END::numeric(10, 2) AS fare_amount,
    'Province-wide proportional UV Express commuter estimate.' AS notes
  FROM pairs p, modes m
  WHERE p.origin_id <> p.dest_id
)
INSERT INTO public.fare_records (
  origin_municipality_id,
  destination_municipality_id,
  transport_type_id,
  passenger_category,
  fare_amount,
  status,
  issuing_authority,
  effective_date,
  notes
)
SELECT
  c.origin_id,
  c.dest_id,
  c.transport_type_id,
  c.passenger_category,
  c.fare_amount,
  'community_estimate'::public.fare_status,
  'Citizen Commuter Fare Guide',
  CURRENT_DATE,
  c.notes
FROM candidates c
WHERE c.transport_type_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM public.fare_records existing
    WHERE existing.origin_municipality_id = c.origin_id
      AND existing.destination_municipality_id = c.dest_id
      AND existing.transport_type_id = c.transport_type_id
      AND existing.passenger_category = c.passenger_category
      AND existing.is_archived = false
      AND existing.is_test_fixture = false
  );
