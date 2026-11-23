-- ============================================================================
-- 020_update_bongabong_corridor_fares_and_fix_discounts.sql
-- Pamasahe Tracker – Oriental Mindoro
-- Updates user-specified Southern Oriental Mindoro commuter baselines
-- bidirectionally under status = 'community_estimate' (never overwriting
-- admin-verified 'verified_official' fares):
--   - Bongabong <-> Pinamalayan : PHP 100.00 regular (PHP 80.00 discounted)
--   - Bongabong <-> Gloria      : PHP 50.00 regular  (PHP 40.00 discounted)
--   - Bongabong <-> Roxas       : PHP 50.00 regular  (PHP 40.00 discounted)
--   - Bulalacao <-> Bongabong   : PHP 180.00 regular (PHP 144.00 discounted)
--   - Bulalacao <-> Roxas       : PHP 100.00 regular (PHP 80.00 discounted)
-- Also repairs province-wide inverted community_estimate discounts where
-- student/senior_citizen/pwd fare_amount exceeded the active regular fare.
-- ============================================================================

INSERT INTO public.routes (
  route_code,
  route_name,
  origin_municipality_id,
  destination_municipality_id,
  transport_type_id,
  distance_km,
  distance_source,
  estimated_duration_min,
  operating_notes,
  is_verified,
  is_active
)
SELECT
  v.route_code,
  v.route_name,
  orig.id,
  dest.id,
  tt.id,
  v.distance_km,
  'osrm',
  v.estimated_duration_min,
  v.operating_notes,
  false,
  true
FROM (
  VALUES
    ('ORM-BON-PIN-MCB', 'Bongabong – Pinamalayan Nautical Highway', 'bongabong', 'pinamalayan', 'multicab', 41.00, 50, 'User-provided 2nd District commuter corridor (PHP 100 est.).'),
    ('ORM-PIN-BON-MCB', 'Pinamalayan – Bongabong Nautical Highway', 'pinamalayan', 'bongabong', 'multicab', 41.00, 50, 'Return leg along Strong Republic Nautical Highway (PHP 100 est.).')
) AS v(route_code, route_name, orig_slug, dest_slug, tt_code, distance_km, estimated_duration_min, operating_notes)
JOIN public.municipalities orig ON orig.slug = v.orig_slug
JOIN public.municipalities dest ON dest.slug = v.dest_slug
JOIN public.transport_types tt ON tt.code = v.tt_code
ON CONFLICT (route_code) DO NOTHING;

WITH desired_baselines(orig_slug, dest_slug, tt_code, regular_amount, is_primary_mode, corridor_label) AS (
  VALUES
    -- Bongabong <-> Pinamalayan: PHP 100
    ('bongabong', 'pinamalayan', 'multicab',   100.00::numeric(10,2), true,  'Bongabong – Pinamalayan'),
    ('pinamalayan', 'bongabong', 'multicab',   100.00::numeric(10,2), true,  'Pinamalayan – Bongabong'),
    ('bongabong', 'pinamalayan', 'uv_express', 100.00::numeric(10,2), false, 'Bongabong – Pinamalayan'),
    ('pinamalayan', 'bongabong', 'uv_express', 100.00::numeric(10,2), false, 'Pinamalayan – Bongabong'),

    -- Bongabong <-> Gloria: PHP 50
    ('bongabong', 'gloria',      'multicab',    50.00::numeric(10,2), true,  'Bongabong – Gloria'),
    ('gloria', 'bongabong',      'multicab',    50.00::numeric(10,2), true,  'Gloria – Bongabong'),
    ('bongabong', 'gloria',      'uv_express',  50.00::numeric(10,2), false, 'Bongabong – Gloria'),
    ('gloria', 'bongabong',      'uv_express',  50.00::numeric(10,2), false, 'Gloria – Bongabong'),

    -- Bongabong <-> Roxas: PHP 50
    ('bongabong', 'roxas',       'multicab',    50.00::numeric(10,2), true,  'Bongabong – Roxas'),
    ('roxas', 'bongabong',       'multicab',    50.00::numeric(10,2), true,  'Roxas – Bongabong'),
    ('bongabong', 'roxas',       'uv_express',  50.00::numeric(10,2), false, 'Bongabong – Roxas'),
    ('roxas', 'bongabong',       'uv_express',  50.00::numeric(10,2), false, 'Roxas – Bongabong'),

    -- Bulalacao <-> Bongabong: PHP 180
    ('bulalacao', 'bongabong',   'uv_express', 180.00::numeric(10,2), true,  'Bulalacao – Bongabong'),
    ('bongabong', 'bulalacao',   'uv_express', 180.00::numeric(10,2), true,  'Bongabong – Bulalacao'),
    ('bulalacao', 'bongabong',   'bus',        180.00::numeric(10,2), false, 'Bulalacao – Bongabong'),
    ('bongabong', 'bulalacao',   'bus',        180.00::numeric(10,2), false, 'Bongabong – Bulalacao'),

    -- Bulalacao <-> Roxas: PHP 100 (aligns discounted tiers to exact PHP 80 baseline)
    ('bulalacao', 'roxas',       'multicab',   100.00::numeric(10,2), true,  'Bulalacao – Roxas'),
    ('roxas', 'bulalacao',       'multicab',   100.00::numeric(10,2), true,  'Roxas – Bulalacao')
),
categories(passenger_category, mult, cat_label) AS (
  VALUES
    ('regular'::public.passenger_category,        1.00::numeric, 'regular'),
    ('student'::public.passenger_category,        0.80::numeric, 'student (20% discount)'),
    ('senior_citizen'::public.passenger_category, 0.80::numeric, 'senior citizen (20% discount)'),
    ('pwd'::public.passenger_category,            0.80::numeric, 'PWD (20% discount)')
),
resolved AS (
  SELECT
    orig.id AS origin_id,
    dest.id AS dest_id,
    tt.id AS transport_type_id,
    tt.name AS mode_name,
    c.passenger_category,
    round(b.regular_amount * c.mult, 2)::numeric(10,2) AS fare_amount,
    b.regular_amount,
    b.is_primary_mode,
    b.corridor_label,
    c.cat_label
  FROM desired_baselines b
  JOIN public.municipalities orig ON orig.slug = b.orig_slug
  JOIN public.municipalities dest ON dest.slug = b.dest_slug
  JOIN public.transport_types tt ON tt.code = b.tt_code
  CROSS JOIN categories c
)
UPDATE public.fare_records fr
SET
  fare_amount = r.fare_amount,
  issuing_authority = 'Commuter Corridor Baseline (User Provided)',
  effective_date = CURRENT_DATE,
  notes = format(
    'User-reported %s %s baseline for %s (PHP %s regular).',
    r.mode_name,
    r.cat_label,
    r.corridor_label,
    r.regular_amount
  ),
  updated_at = timezone('utc', now()) + CASE WHEN r.is_primary_mode THEN interval '2 seconds' ELSE interval '0 seconds' END
FROM resolved r
WHERE fr.origin_municipality_id = r.origin_id
  AND fr.destination_municipality_id = r.dest_id
  AND fr.transport_type_id = r.transport_type_id
  AND fr.passenger_category = r.passenger_category
  AND fr.status = 'community_estimate'
  AND fr.is_archived = false
  AND fr.is_test_fixture = false;

WITH desired_baselines(orig_slug, dest_slug, tt_code, regular_amount, is_primary_mode, corridor_label) AS (
  VALUES
    -- Bongabong <-> Pinamalayan: PHP 100
    ('bongabong', 'pinamalayan', 'multicab',   100.00::numeric(10,2), true,  'Bongabong – Pinamalayan'),
    ('pinamalayan', 'bongabong', 'multicab',   100.00::numeric(10,2), true,  'Pinamalayan – Bongabong'),
    ('bongabong', 'pinamalayan', 'uv_express', 100.00::numeric(10,2), false, 'Bongabong – Pinamalayan'),
    ('pinamalayan', 'bongabong', 'uv_express', 100.00::numeric(10,2), false, 'Pinamalayan – Bongabong'),

    -- Bongabong <-> Gloria: PHP 50
    ('bongabong', 'gloria',      'multicab',    50.00::numeric(10,2), true,  'Bongabong – Gloria'),
    ('gloria', 'bongabong',      'multicab',    50.00::numeric(10,2), true,  'Gloria – Bongabong'),
    ('bongabong', 'gloria',      'uv_express',  50.00::numeric(10,2), false, 'Bongabong – Gloria'),
    ('gloria', 'bongabong',      'uv_express',  50.00::numeric(10,2), false, 'Gloria – Bongabong'),

    -- Bongabong <-> Roxas: PHP 50
    ('bongabong', 'roxas',       'multicab',    50.00::numeric(10,2), true,  'Bongabong – Roxas'),
    ('roxas', 'bongabong',       'multicab',    50.00::numeric(10,2), true,  'Roxas – Bongabong'),
    ('bongabong', 'roxas',       'uv_express',  50.00::numeric(10,2), false, 'Bongabong – Roxas'),
    ('roxas', 'bongabong',       'uv_express',  50.00::numeric(10,2), false, 'Roxas – Bongabong'),

    -- Bulalacao <-> Bongabong: PHP 180
    ('bulalacao', 'bongabong',   'uv_express', 180.00::numeric(10,2), true,  'Bulalacao – Bongabong'),
    ('bongabong', 'bulalacao',   'uv_express', 180.00::numeric(10,2), true,  'Bongabong – Bulalacao'),
    ('bulalacao', 'bongabong',   'bus',        180.00::numeric(10,2), false, 'Bulalacao – Bongabong'),
    ('bongabong', 'bulalacao',   'bus',        180.00::numeric(10,2), false, 'Bongabong – Bulalacao'),

    -- Bulalacao <-> Roxas: PHP 100
    ('bulalacao', 'roxas',       'multicab',   100.00::numeric(10,2), true,  'Bulalacao – Roxas'),
    ('roxas', 'bulalacao',       'multicab',   100.00::numeric(10,2), true,  'Roxas – Bulalacao')
),
categories(passenger_category, mult, cat_label) AS (
  VALUES
    ('regular'::public.passenger_category,        1.00::numeric, 'regular'),
    ('student'::public.passenger_category,        0.80::numeric, 'student (20% discount)'),
    ('senior_citizen'::public.passenger_category, 0.80::numeric, 'senior citizen (20% discount)'),
    ('pwd'::public.passenger_category,            0.80::numeric, 'PWD (20% discount)')
),
resolved AS (
  SELECT
    orig.id AS origin_id,
    dest.id AS dest_id,
    tt.id AS transport_type_id,
    tt.name AS mode_name,
    c.passenger_category,
    round(b.regular_amount * c.mult, 2)::numeric(10,2) AS fare_amount,
    b.regular_amount,
    b.is_primary_mode,
    b.corridor_label,
    c.cat_label
  FROM desired_baselines b
  JOIN public.municipalities orig ON orig.slug = b.orig_slug
  JOIN public.municipalities dest ON dest.slug = b.dest_slug
  JOIN public.transport_types tt ON tt.code = b.tt_code
  CROSS JOIN categories c
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
  notes,
  updated_at
)
SELECT
  r.origin_id,
  r.dest_id,
  r.transport_type_id,
  r.passenger_category,
  r.fare_amount,
  'community_estimate'::public.fare_status,
  'Commuter Corridor Baseline (User Provided)',
  CURRENT_DATE,
  format(
    'User-reported %s %s baseline for %s (PHP %s regular).',
    r.mode_name,
    r.cat_label,
    r.corridor_label,
    r.regular_amount
  ),
  timezone('utc', now()) + CASE WHEN r.is_primary_mode THEN interval '2 seconds' ELSE interval '0 seconds' END
FROM resolved r
WHERE NOT EXISTS (
  SELECT 1
  FROM public.fare_records existing
  WHERE existing.origin_municipality_id = r.origin_id
    AND existing.destination_municipality_id = r.dest_id
    AND existing.transport_type_id = r.transport_type_id
    AND existing.passenger_category = r.passenger_category
    AND existing.is_archived = false
    AND existing.is_test_fixture = false
);

-- Repair any remaining province-wide community_estimate discounted rows whose fare_amount >= active regular fare
WITH active_regulars AS (
  SELECT DISTINCT ON (origin_municipality_id, destination_municipality_id, transport_type_id)
    origin_municipality_id,
    destination_municipality_id,
    transport_type_id,
    fare_amount AS regular_fare
  FROM public.fare_records
  WHERE passenger_category = 'regular'
    AND is_archived = false
    AND is_test_fixture = false
  ORDER BY
    origin_municipality_id,
    destination_municipality_id,
    transport_type_id,
    CASE WHEN status = 'verified_official' THEN 0 ELSE 1 END,
    updated_at DESC
)
UPDATE public.fare_records fr
SET
  fare_amount = round(ar.regular_fare * 0.80, 2)::numeric(10,2),
  notes = format('Estimated 20%% %s discount based on PHP %s regular fare.', replace(fr.passenger_category::text, '_', ' '), ar.regular_fare),
  updated_at = timezone('utc', now())
FROM active_regulars ar
WHERE fr.origin_municipality_id = ar.origin_municipality_id
  AND fr.destination_municipality_id = ar.destination_municipality_id
  AND fr.transport_type_id = ar.transport_type_id
  AND fr.passenger_category IN ('student', 'senior_citizen', 'pwd')
  AND fr.status = 'community_estimate'
  AND fr.is_archived = false
  AND fr.is_test_fixture = false
  AND fr.fare_amount >= ar.regular_fare;
