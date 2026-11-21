-- ============================================================================
-- OPTIONAL QA / TEST FIXTURE DATA (DO NOT RUN IN PRODUCTION)
-- Marked explicitly with is_test_fixture = true and [TEST FIXTURE] labels so
-- test fares are NEVER mixed with verified production fare records.
-- ============================================================================

-- Note: Production public queries strictly filter `WHERE is_test_fixture = false`.
-- Use this file only in isolated staging/QA environments after creating test users.

DO $$
DECLARE
  v_calapan uuid;
  v_naujan uuid;
  v_pinamalayan uuid;
  v_jeepney uuid;
  v_van uuid;
BEGIN
  SELECT id INTO v_calapan FROM public.municipalities WHERE slug = 'calapan-city';
  SELECT id INTO v_naujan FROM public.municipalities WHERE slug = 'naujan';
  SELECT id INTO v_pinamalayan FROM public.municipalities WHERE slug = 'pinamalayan';
  SELECT id INTO v_jeepney FROM public.transport_types WHERE code = 'jeepney';
  SELECT id INTO v_van FROM public.transport_types WHERE code = 'uv_express';

  IF v_calapan IS NOT NULL AND v_naujan IS NOT NULL AND v_jeepney IS NOT NULL THEN
    INSERT INTO public.routes (
      route_code, route_name, origin_municipality_id, destination_municipality_id,
      transport_type_id, operating_notes, is_verified, is_active
    )
    VALUES (
      'TEST-CAL-NAU-PUJ',
      '[TEST FIXTURE] Calapan City – Naujan Jeepney Corridor',
      v_calapan,
      v_naujan,
      v_jeepney,
      '[TEST FIXTURE] Sample corridor structure for staging tests only; not a live schedule.',
      false,
      false
    )
    ON CONFLICT (route_code) DO NOTHING;

    INSERT INTO public.fare_records (
      origin_municipality_id, destination_municipality_id, transport_type_id,
      passenger_category, fare_amount, status, issuing_authority,
      is_test_fixture, notes
    )
    VALUES (
      v_calapan,
      v_naujan,
      v_jeepney,
      'regular',
      1.00,
      'community_estimate',
      '[TEST FIXTURE] Staging QA Record',
      true,
      '[TEST FIXTURE] Synthetic amount for QA isolation testing only.'
    );
  END IF;
END $$;
