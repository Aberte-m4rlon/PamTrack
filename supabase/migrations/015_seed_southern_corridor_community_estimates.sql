-- ============================================================================
-- 015_seed_southern_corridor_community_estimates.sql
-- Pamasahe Tracker – Oriental Mindoro
-- Seeds registered inter-municipal routes and community baseline estimates
-- strictly under status = 'community_estimate' (including user-supplied
-- Southern Oriental Mindoro corridors: Bulalacao-Bongabong PHP 180,
-- Bulalacao-Roxas PHP 100, Roxas-Bongabong PHP 50, Bongabong-Gloria PHP 50,
-- plus proportional estimates across central and northern LGUs).
-- Safe & idempotent: ON CONFLICT / NOT EXISTS guards preserve existing data
-- and never overwrite admin-verified 'verified_official' fares.
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
    ('ORM-BUL-BON-UV', 'Bulalacao – Bongabong Express Corridor', 'bulalacao', 'bongabong', 'uv_express', 49.00, 60, 'User-provided Southern Mindoro reference route (PHP 180 est.).'),
    ('ORM-BON-BUL-UV', 'Bongabong – Bulalacao Express Corridor', 'bongabong', 'bulalacao', 'uv_express', 49.00, 60, 'Return leg along Strong Republic Nautical Highway (PHP 180 est.).'),
    ('ORM-BUL-ROX-PUJ', 'Bulalacao – Roxas Coastal Corridor', 'bulalacao', 'roxas', 'jeepney', 35.00, 45, 'User-provided Southern Mindoro reference route (PHP 100 est.).'),
    ('ORM-ROX-BUL-PUJ', 'Roxas – Bulalacao Coastal Corridor', 'roxas', 'bulalacao', 'jeepney', 35.00, 45, 'Return leg serving southern port towns (PHP 100 est.).'),
    ('ORM-ROX-BON-PUJ', 'Roxas – Bongabong Inter-Town Line', 'roxas', 'bongabong', 'jeepney', 18.00, 25, 'User-provided reference corridor (PHP 50 est.).'),
    ('ORM-BON-ROX-PUJ', 'Bongabong – Roxas Inter-Town Line', 'bongabong', 'roxas', 'jeepney', 18.00, 25, 'Return leg serving Roxas RoRo port & public market (PHP 50 est.).'),
    ('ORM-BON-GLO-PUJ', 'Bongabong – Gloria Highway Corridor', 'bongabong', 'gloria', 'jeepney', 25.00, 30, 'User-provided 2nd District corridor (PHP 50 est.).'),
    ('ORM-GLO-BON-PUJ', 'Gloria – Bongabong Highway Corridor', 'gloria', 'bongabong', 'jeepney', 25.00, 30, 'Return leg along provincial highway (PHP 50 est.).'),
    ('ORM-CAL-PGL-UV', 'Calapan City – Puerto Galera Coastal Express', 'calapan-city', 'puerto-galera', 'uv_express', 47.50, 50, 'Northern coastal corridor linking Calapan Port & Puerto Galera.'),
    ('ORM-CAL-PIN-UV', 'Calapan City – Pinamalayan Nautical Highway', 'calapan-city', 'pinamalayan', 'uv_express', 66.00, 75, 'Primary 1st-to-2nd District trunk corridor.'),
    ('ORM-CAL-BUL-BUS', 'Calapan City – Bulalacao Long-Haul Trunk', 'calapan-city', 'bulalacao', 'bus', 145.00, 175, 'End-to-end Oriental Mindoro provincial highway route.'),
    ('ORM-CAL-NAU-PUJ', 'Calapan City – Naujan Feeder Corridor', 'calapan-city', 'naujan', 'jeepney', 18.00, 25, 'Daily commuter corridor linking Calapan & Naujan Poblacion.')
) AS v(route_code, route_name, orig_slug, dest_slug, tt_code, distance_km, estimated_duration_min, operating_notes)
JOIN public.municipalities orig ON orig.slug = v.orig_slug
JOIN public.municipalities dest ON dest.slug = v.dest_slug
JOIN public.transport_types tt ON tt.code = v.tt_code
ON CONFLICT (route_code) DO NOTHING;

INSERT INTO public.fare_records (
  origin_municipality_id,
  destination_municipality_id,
  transport_type_id,
  passenger_category,
  fare_amount,
  status,
  issuing_authority,
  official_document_reference,
  effective_date,
  notes
)
SELECT
  orig.id,
  dest.id,
  tt.id,
  v.passenger_category::public.passenger_category,
  v.fare_amount,
  'community_estimate'::public.fare_status,
  v.issuing_authority,
  NULL,
  CURRENT_DATE,
  v.notes
FROM (
  VALUES
    -- User-supplied exact Southern Oriental Mindoro corridors (bidirectional)
    ('bulalacao', 'bongabong', 'uv_express', 'regular', 180.00, 'Commuter Corridor Baseline (User Provided)', 'User-reported regular fare estimate between Bulalacao and Bongabong.'),
    ('bongabong', 'bulalacao', 'uv_express', 'regular', 180.00, 'Commuter Corridor Baseline (User Provided)', 'Return regular fare estimate between Bongabong and Bulalacao.'),
    ('bulalacao', 'bongabong', 'uv_express', 'student', 144.00, 'Commuter Corridor Baseline (User Provided)', 'Estimated 20% student discount based on PHP 180.00 baseline.'),
    ('bulalacao', 'bongabong', 'bus', 'regular', 160.00, 'Proportional Community Estimate', 'Estimated provincial bus rate between Bulalacao and Bongabong.'),
    ('bongabong', 'bulalacao', 'bus', 'regular', 160.00, 'Proportional Community Estimate', 'Estimated return provincial bus rate between Bongabong and Bulalacao.'),

    ('bulalacao', 'roxas', 'jeepney', 'regular', 100.00, 'Commuter Corridor Baseline (User Provided)', 'User-reported regular fare estimate between Bulalacao and Roxas.'),
    ('roxas', 'bulalacao', 'jeepney', 'regular', 100.00, 'Commuter Corridor Baseline (User Provided)', 'Return regular fare estimate between Roxas and Bulalacao.'),
    ('bulalacao', 'roxas', 'jeepney', 'student', 80.00, 'Commuter Corridor Baseline (User Provided)', 'Estimated 20% student discount based on PHP 100.00 baseline.'),
    ('bulalacao', 'roxas', 'uv_express', 'regular', 120.00, 'Proportional Community Estimate', 'Estimated UV Express rate between Bulalacao and Roxas.'),

    ('roxas', 'bongabong', 'jeepney', 'regular', 50.00, 'Commuter Corridor Baseline (User Provided)', 'User-reported regular fare estimate between Roxas and Bongabong.'),
    ('bongabong', 'roxas', 'jeepney', 'regular', 50.00, 'Commuter Corridor Baseline (User Provided)', 'Return regular fare estimate between Bongabong and Roxas.'),
    ('roxas', 'bongabong', 'jeepney', 'student', 40.00, 'Commuter Corridor Baseline (User Provided)', 'Estimated 20% student discount based on PHP 50.00 baseline.'),
    ('roxas', 'bongabong', 'multicab', 'regular', 50.00, 'Commuter Corridor Baseline (User Provided)', 'Estimated multicab fare matching Roxas – Bongabong corridor.'),

    ('bongabong', 'gloria', 'jeepney', 'regular', 50.00, 'Commuter Corridor Baseline (User Provided)', 'User-reported regular fare estimate between Bongabong and Gloria.'),
    ('gloria', 'bongabong', 'jeepney', 'regular', 50.00, 'Commuter Corridor Baseline (User Provided)', 'Return regular fare estimate between Gloria and Bongabong.'),
    ('bongabong', 'gloria', 'jeepney', 'student', 40.00, 'Commuter Corridor Baseline (User Provided)', 'Estimated 20% student discount based on PHP 50.00 baseline.'),
    ('bongabong', 'gloria', 'multicab', 'regular', 50.00, 'Commuter Corridor Baseline (User Provided)', 'Estimated multicab fare matching Bongabong – Gloria corridor.'),

    -- Proportional estimates for remaining Oriental Mindoro corridors (bidirectional)
    ('bulalacao', 'mansalay', 'jeepney', 'regular', 65.00, 'Proportional Community Estimate', 'Estimated from Bulalacao–Roxas PHP 100 corridor proportion (~23 km).'),
    ('mansalay', 'bulalacao', 'jeepney', 'regular', 65.00, 'Proportional Community Estimate', 'Return estimate Mansalay to Bulalacao.'),
    ('mansalay', 'roxas', 'jeepney', 'regular', 40.00, 'Proportional Community Estimate', 'Estimated ~12 km coastal link north to Roxas.'),
    ('roxas', 'mansalay', 'jeepney', 'regular', 40.00, 'Proportional Community Estimate', 'Return estimate Roxas to Mansalay.'),
    ('mansalay', 'bongabong', 'jeepney', 'regular', 80.00, 'Proportional Community Estimate', 'Estimated ~28 km southern highway fare estimate.'),
    ('bongabong', 'mansalay', 'jeepney', 'regular', 80.00, 'Proportional Community Estimate', 'Return estimate Bongabong to Mansalay.'),

    ('bongabong', 'bansud', 'jeepney', 'regular', 35.00, 'Proportional Community Estimate', 'Estimated adjacent town segment inside Bongabong–Gloria PHP 50 corridor.'),
    ('bansud', 'bongabong', 'jeepney', 'regular', 35.00, 'Proportional Community Estimate', 'Return estimate Bansud to Bongabong.'),
    ('bansud', 'gloria', 'jeepney', 'regular', 30.00, 'Proportional Community Estimate', 'Estimated adjacent town segment (~13 km).'),
    ('gloria', 'bansud', 'jeepney', 'regular', 30.00, 'Proportional Community Estimate', 'Return estimate Gloria to Bansud.'),
    ('gloria', 'pinamalayan', 'jeepney', 'regular', 25.00, 'Proportional Community Estimate', 'Estimated short inter-town corridor (~8 km).'),
    ('pinamalayan', 'gloria', 'jeepney', 'regular', 25.00, 'Proportional Community Estimate', 'Return estimate Pinamalayan to Gloria.'),

    ('bongabong', 'pinamalayan', 'uv_express', 'regular', 80.00, 'Proportional Community Estimate', 'Estimated Bongabong–Gloria–Pinamalayan UV Express fare.'),
    ('pinamalayan', 'bongabong', 'uv_express', 'regular', 80.00, 'Proportional Community Estimate', 'Return estimate Pinamalayan to Bongabong.'),
    ('roxas', 'pinamalayan', 'uv_express', 'regular', 130.00, 'Proportional Community Estimate', 'Estimated Roxas–Pinamalayan UV Express fare (~51 km).'),
    ('pinamalayan', 'roxas', 'uv_express', 'regular', 130.00, 'Proportional Community Estimate', 'Return estimate Pinamalayan to Roxas.'),
    ('bulalacao', 'pinamalayan', 'bus', 'regular', 220.00, 'Proportional Community Estimate', 'Estimated Bulalacao–Pinamalayan Bus fare (~86 km).'),
    ('pinamalayan', 'bulalacao', 'bus', 'regular', 220.00, 'Proportional Community Estimate', 'Return estimate Pinamalayan to Bulalacao.'),

    ('calapan-city', 'bulalacao', 'bus', 'regular', 350.00, 'Proportional Community Estimate', 'Estimated provincial Bus fare Calapan to Bulalacao (~145 km).'),
    ('bulalacao', 'calapan-city', 'bus', 'regular', 350.00, 'Proportional Community Estimate', 'Return provincial Bus fare estimate Bulalacao to Calapan City.'),
    ('calapan-city', 'bulalacao', 'uv_express', 'regular', 400.00, 'Proportional Community Estimate', 'Estimated UV Express fare Calapan City to Bulalacao.'),
    ('bulalacao', 'calapan-city', 'uv_express', 'regular', 400.00, 'Proportional Community Estimate', 'Return UV Express fare estimate Bulalacao to Calapan City.'),

    ('calapan-city', 'mansalay', 'bus', 'regular', 300.00, 'Proportional Community Estimate', 'Estimated provincial Bus fare Calapan City to Mansalay.'),
    ('mansalay', 'calapan-city', 'bus', 'regular', 300.00, 'Proportional Community Estimate', 'Return Bus fare estimate Mansalay to Calapan City.'),
    ('calapan-city', 'roxas', 'bus', 'regular', 270.00, 'Proportional Community Estimate', 'Estimated provincial Bus fare Calapan City to Roxas (~105 km).'),
    ('roxas', 'calapan-city', 'bus', 'regular', 270.00, 'Proportional Community Estimate', 'Return Bus fare estimate Roxas to Calapan City.'),
    ('calapan-city', 'bongabong', 'bus', 'regular', 220.00, 'Proportional Community Estimate', 'Estimated provincial Bus fare Calapan City to Bongabong (~85 km).'),
    ('bongabong', 'calapan-city', 'bus', 'regular', 220.00, 'Proportional Community Estimate', 'Return Bus fare estimate Bongabong to Calapan City.'),
    ('calapan-city', 'bansud', 'bus', 'regular', 200.00, 'Proportional Community Estimate', 'Estimated provincial Bus fare Calapan City to Bansud (~70 km).'),
    ('bansud', 'calapan-city', 'bus', 'regular', 200.00, 'Proportional Community Estimate', 'Return Bus fare estimate Bansud to Calapan City.'),
    ('calapan-city', 'gloria', 'bus', 'regular', 190.00, 'Proportional Community Estimate', 'Estimated provincial Bus fare Calapan City to Gloria (~58 km).'),
    ('gloria', 'calapan-city', 'bus', 'regular', 190.00, 'Proportional Community Estimate', 'Return Bus fare estimate Gloria to Calapan City.'),

    ('calapan-city', 'naujan', 'jeepney', 'regular', 40.00, 'Proportional Community Estimate', 'Estimated Jeepney fare Calapan City to Naujan (~18 km).'),
    ('naujan', 'calapan-city', 'jeepney', 'regular', 40.00, 'Proportional Community Estimate', 'Return Jeepney fare estimate Naujan to Calapan City.'),
    ('calapan-city', 'victoria', 'jeepney', 'regular', 65.00, 'Proportional Community Estimate', 'Estimated Jeepney fare Calapan City to Victoria (~31 km).'),
    ('victoria', 'calapan-city', 'jeepney', 'regular', 65.00, 'Proportional Community Estimate', 'Return Jeepney fare estimate Victoria to Calapan City.'),
    ('calapan-city', 'socorro', 'jeepney', 'regular', 100.00, 'Proportional Community Estimate', 'Estimated Jeepney fare Calapan City to Socorro (~49 km).'),
    ('socorro', 'calapan-city', 'jeepney', 'regular', 100.00, 'Proportional Community Estimate', 'Return Jeepney fare estimate Socorro to Calapan City.'),
    ('calapan-city', 'pola', 'jeepney', 'regular', 110.00, 'Proportional Community Estimate', 'Estimated Jeepney fare Calapan City to Pola (~45 km).'),
    ('pola', 'calapan-city', 'jeepney', 'regular', 110.00, 'Proportional Community Estimate', 'Return Jeepney fare estimate Pola to Calapan City.'),

    ('calapan-city', 'baco', 'jeepney', 'regular', 25.00, 'Proportional Community Estimate', 'Estimated Jeepney fare Calapan City to Baco (~12 km).'),
    ('baco', 'calapan-city', 'jeepney', 'regular', 25.00, 'Proportional Community Estimate', 'Return Jeepney fare estimate Baco to Calapan City.'),
    ('baco', 'san-teodoro', 'jeepney', 'regular', 35.00, 'Proportional Community Estimate', 'Estimated Jeepney fare Baco to San Teodoro (~14 km).'),
    ('san-teodoro', 'baco', 'jeepney', 'regular', 35.00, 'Proportional Community Estimate', 'Return Jeepney fare estimate San Teodoro to Baco.'),
    ('calapan-city', 'san-teodoro', 'jeepney', 'regular', 60.00, 'Proportional Community Estimate', 'Estimated Jeepney fare Calapan City to San Teodoro (~24 km).'),
    ('san-teodoro', 'calapan-city', 'jeepney', 'regular', 60.00, 'Proportional Community Estimate', 'Return Jeepney fare estimate San Teodoro to Calapan City.'),
    ('san-teodoro', 'puerto-galera', 'jeepney', 'regular', 45.00, 'Proportional Community Estimate', 'Estimated Jeepney fare San Teodoro to Puerto Galera (~14 km).'),
    ('puerto-galera', 'san-teodoro', 'jeepney', 'regular', 45.00, 'Proportional Community Estimate', 'Return Jeepney fare estimate Puerto Galera to San Teodoro.')
) AS v(orig_slug, dest_slug, tt_code, passenger_category, fare_amount, issuing_authority, notes)
JOIN public.municipalities orig ON orig.slug = v.orig_slug
JOIN public.municipalities dest ON dest.slug = v.dest_slug
JOIN public.transport_types tt ON tt.code = v.tt_code
WHERE NOT EXISTS (
  SELECT 1
  FROM public.fare_records existing
  WHERE existing.origin_municipality_id = orig.id
    AND existing.destination_municipality_id = dest.id
    AND existing.transport_type_id = tt.id
    AND existing.passenger_category = v.passenger_category::public.passenger_category
    AND existing.is_test_fixture = false
    AND existing.is_archived = false
);
