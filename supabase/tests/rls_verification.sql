-- ============================================================================
-- RLS & DATA INTEGRITY VERIFICATION SQL SCRIPT
-- Run against a test Supabase / PostgreSQL database to verify security rules.
-- ============================================================================

BEGIN;

-- 1. Verify all 16 core tables exist and have RLS enabled
DO $$
DECLARE
  v_tbl text;
  v_rls boolean;
  v_tables text[] := ARRAY[
    'profiles', 'user_roles', 'municipalities', 'transport_types',
    'transport_operators', 'routes', 'route_stops', 'fare_records',
    'fare_sources', 'fare_reports', 'fare_report_evidence',
    'fare_verification_logs', 'favorites', 'notifications',
    'audit_logs', 'system_settings'
  ];
BEGIN
  FOREACH v_tbl IN ARRAY v_tables LOOP
    SELECT relrowsecurity INTO v_rls
      FROM pg_class
     WHERE relnamespace = 'public'::regnamespace
       AND relname = v_tbl;
    IF v_rls IS DISTINCT FROM true THEN
      RAISE EXCEPTION 'RLS check failed: public.% does not have RLS enabled', v_tbl;
    END IF;
  END LOOP;
END $$;

-- 2. Verify all 15 Oriental Mindoro municipalities/city are seeded
DO $$
DECLARE
  v_count integer;
BEGIN
  SELECT count(*) INTO v_count FROM public.municipalities WHERE is_active = true;
  IF v_count <> 15 THEN
    RAISE EXCEPTION 'Expected 15 active Oriental Mindoro municipalities/city, found %', v_count;
  END IF;
END $$;

-- 3. Verify DB constraint blocks verified_official fare without source reference & verifier
DO $$
DECLARE
  v_calapan uuid;
  v_baco uuid;
  v_jeep uuid;
BEGIN
  SELECT id INTO v_calapan FROM public.municipalities WHERE slug = 'calapan-city';
  SELECT id INTO v_baco FROM public.municipalities WHERE slug = 'baco';
  SELECT id INTO v_jeep FROM public.transport_types WHERE code = 'jeepney';

  BEGIN
    INSERT INTO public.fare_records (
      origin_municipality_id, destination_municipality_id, transport_type_id,
      passenger_category, fare_amount, status
    )
    VALUES (v_calapan, v_baco, v_jeep, 'regular', 25.00, 'verified_official');

    RAISE EXCEPTION 'Security test failed: inserted verified_official fare without source reference!';
  EXCEPTION
    WHEN check_violation THEN
      RAISE NOTICE 'PASS: chk_official_fare_requires_verification rejected unverified official fare.';
  END;
END $$;

ROLLBACK;
