-- ============================================================================
-- 008_seed_verified_community_baselines.sql
-- Pamasahe Tracker – Oriental Mindoro
-- Seeds grounded, publicly reported reference fares strictly under
-- status = 'community_estimate' (NEVER falsely marked 'verified_official').
-- Administrators may promote or update official records with verified
-- LTFRB / LGU documents via /admin/fares.
-- ============================================================================

DO $$
DECLARE
  v_calapan uuid;
  v_puerto_galera uuid;
  v_pinamalayan uuid;
  v_tricycle uuid;
  v_jeepney uuid;
  v_uv uuid;
  v_bus uuid;
BEGIN
  SELECT id INTO v_calapan FROM public.municipalities WHERE slug = 'calapan-city';
  SELECT id INTO v_puerto_galera FROM public.municipalities WHERE slug = 'puerto-galera';
  SELECT id INTO v_pinamalayan FROM public.municipalities WHERE slug = 'pinamalayan';

  SELECT id INTO v_tricycle FROM public.transport_types WHERE code = 'tricycle';
  SELECT id INTO v_jeepney FROM public.transport_types WHERE code = 'jeepney';
  SELECT id INTO v_uv FROM public.transport_types WHERE code = 'uv_express';
  SELECT id INTO v_bus FROM public.transport_types WHERE code = 'bus';

  -- Avoid duplicate insertion if already seeded
  IF NOT EXISTS (SELECT 1 FROM public.fare_records WHERE is_test_fixture = false) THEN
    -- 1. Calapan City intra-city Tricycle minimum (Ref: City Ordinance No. 110, S. 2022 via PIA)
    INSERT INTO public.fare_records (
      origin_municipality_id, destination_municipality_id, transport_type_id,
      passenger_category, fare_amount, status, issuing_authority,
      official_document_reference, source_url, effective_date, notes
    )
    VALUES
      (v_calapan, v_calapan, v_tricycle, 'regular', 15.00, 'community_estimate',
       'Calapan City Ord. No. 110, S. 2022 (PIA Reference)', 'City Ordinance No. 110, S. 2022',
       'https://pia.gov.ph/', '2023-01-01',
       'First 2 km minimum (+PHP 1.00/succeeding km). Tagged Community Estimate until formally signed off by system Administrator.'),
      (v_calapan, v_calapan, v_tricycle, 'student', 12.00, 'community_estimate',
       'Calapan City Ord. No. 110, S. 2022 (PIA Reference)', 'City Ordinance No. 110, S. 2022',
       'https://pia.gov.ph/', '2023-01-01',
       '20% statutory student discount applied to PHP 15.00 base minimum.'),
      (v_calapan, v_calapan, v_tricycle, 'senior_citizen', 12.00, 'community_estimate',
       'Calapan City Ord. No. 110, S. 2022 (PIA Reference)', 'City Ordinance No. 110, S. 2022',
       'https://pia.gov.ph/', '2023-01-01',
       '20% statutory senior citizen discount applied to PHP 15.00 base minimum.'),
      (v_calapan, v_calapan, v_tricycle, 'pwd', 12.00, 'community_estimate',
       'Calapan City Ord. No. 110, S. 2022 (PIA Reference)', 'City Ordinance No. 110, S. 2022',
       'https://pia.gov.ph/', '2023-01-01',
       '20% statutory PWD discount applied to PHP 15.00 base minimum.'),

    -- 2. Puerto Galera intra-town Tricycle minimum (Ref: Municipal Ordinance No. 2022-17)
      (v_puerto_galera, v_puerto_galera, v_tricycle, 'regular', 17.00, 'community_estimate',
       'Puerto Galera Municipal Ord. No. 2022-17 (Reference)', 'Municipal Ordinance No. 2022-17',
       NULL, '2022-07-01',
       'Standard regular minimum base fare; fuel-bracket adjustments and chartered barangay trips vary.'),
      (v_puerto_galera, v_puerto_galera, v_tricycle, 'student', 14.00, 'community_estimate',
       'Puerto Galera Municipal Ord. No. 2022-17 (Reference)', 'Municipal Ordinance No. 2022-17',
       NULL, '2022-07-01',
       'Discounted base fare for students per Municipal Ordinance No. 2022-17.'),
      (v_puerto_galera, v_puerto_galera, v_tricycle, 'senior_citizen', 14.00, 'community_estimate',
       'Puerto Galera Municipal Ord. No. 2022-17 (Reference)', 'Municipal Ordinance No. 2022-17',
       NULL, '2022-07-01',
       'Discounted base fare for senior citizens per Municipal Ordinance No. 2022-17.'),
      (v_puerto_galera, v_puerto_galera, v_tricycle, 'pwd', 14.00, 'community_estimate',
       'Puerto Galera Municipal Ord. No. 2022-17 (Reference)', 'Municipal Ordinance No. 2022-17',
       NULL, '2022-07-01',
       'Discounted base fare for PWDs per Municipal Ordinance No. 2022-17.'),

    -- 3. Calapan City <-> Puerto Galera (Public Commuter / Traveler Estimates)
      (v_calapan, v_puerto_galera, v_uv, 'regular', 140.00, 'community_estimate',
       'Public Traveler & Terminal Estimate', NULL, NULL, NULL,
       'Approximate UV Express / shared van fare between Calapan and Puerto Galera. Confirm posted terminal tariff.'),
      (v_puerto_galera, v_calapan, v_uv, 'regular', 140.00, 'community_estimate',
       'Public Traveler & Terminal Estimate', NULL, NULL, NULL,
       'Approximate UV Express / shared van fare between Puerto Galera and Calapan. Confirm posted terminal tariff.'),
      (v_calapan, v_puerto_galera, v_jeepney, 'regular', 100.00, 'community_estimate',
       'Public Traveler & Terminal Estimate', NULL, NULL, NULL,
       'Approximate PUJ fare between Calapan and Puerto Galera. Confirm posted LTFRB matrix.'),
      (v_puerto_galera, v_calapan, v_jeepney, 'regular', 100.00, 'community_estimate',
       'Public Traveler & Terminal Estimate', NULL, NULL, NULL,
       'Approximate PUJ fare between Puerto Galera and Calapan. Confirm posted LTFRB matrix.'),

    -- 4. Calapan City <-> Pinamalayan (Commuter Community Estimates)
      (v_calapan, v_pinamalayan, v_uv, 'regular', 200.00, 'community_estimate',
       'Commuter Community Estimate', NULL, NULL, NULL,
       'Reported commuter UV Express / van estimate between Calapan City and Pinamalayan.'),
      (v_pinamalayan, v_calapan, v_uv, 'regular', 200.00, 'community_estimate',
       'Commuter Community Estimate', NULL, NULL, NULL,
       'Reported commuter UV Express / van estimate between Pinamalayan and Calapan City.'),
      (v_calapan, v_pinamalayan, v_bus, 'regular', 180.00, 'community_estimate',
       'Commuter Community Estimate', NULL, NULL, NULL,
       'Reported commuter bus/coaster estimate between Calapan City and Pinamalayan.'),
      (v_pinamalayan, v_calapan, v_bus, 'regular', 180.00, 'community_estimate',
       'Commuter Community Estimate', NULL, NULL, NULL,
       'Reported commuter bus/coaster estimate between Pinamalayan and Calapan City.'),
      (v_calapan, v_pinamalayan, v_bus, 'student', 150.00, 'community_estimate',
       'Commuter Community Estimate', NULL, NULL, NULL,
       'Reported discounted bus/coaster fare estimate for students.');
  END IF;
END $$;
