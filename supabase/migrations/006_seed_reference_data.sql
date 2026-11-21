-- ============================================================================
-- 006_seed_reference_data.sql
-- Pamasahe Tracker – Oriental Mindoro
-- Authentic reference seed data:
--   - All 15 cities/municipalities of Oriental Mindoro with verified coordinates
--   - 5 transport modes
--   - Statutory Philippine public discount reference frameworks (NO fake fares!)
--   - Default system settings
-- NOTE: No fabricated fare prices or invented routes are preloaded.
-- ============================================================================

INSERT INTO public.municipalities (
  name, slug, classification, district, is_capital, latitude, longitude, description, sort_order
)
VALUES
  ('Calapan City', 'calapan-city', 'component_city', '1st District', true, 13.407000, 121.177800, 'Provincial capital and primary port & commercial hub of Oriental Mindoro.', 1),
  ('Baco', 'baco', 'municipality', '1st District', false, 13.358000, 121.096500, 'Coastal and agricultural municipality west of Calapan City.', 2),
  ('Puerto Galera', 'puerto-galera', 'municipality', '1st District', false, 13.501800, 120.954100, 'Northern coastal municipality and major tourism gateway.', 3),
  ('San Teodoro', 'san-teodoro', 'municipality', '1st District', false, 13.436500, 121.019900, 'Northern coastal municipality between Puerto Galera and Baco.', 4),
  ('Naujan', 'naujan', 'municipality', '1st District', false, 13.324200, 121.303000, 'Largest municipality by land area in Oriental Mindoro, home to Naujan Lake.', 5),
  ('Victoria', 'victoria', 'municipality', '1st District', false, 13.173300, 121.278700, 'Inland agro-industrial center south of Naujan.', 6),
  ('Socorro', 'socorro', 'municipality', '1st District', false, 13.056200, 121.406000, 'Central agricultural municipality along the Strong Republic Nautical Highway.', 7),
  ('Pola', 'pola', 'municipality', '1st District', false, 13.143500, 121.441600, 'Coastal municipality east of Socorro and Victoria.', 8),
  ('Pinamalayan', 'pinamalayan', 'municipality', '2nd District', false, 13.038700, 121.480100, 'Major commercial center of southern Oriental Mindoro (2nd District).', 9),
  ('Gloria', 'gloria', 'municipality', '2nd District', false, 12.970000, 121.477800, 'Agricultural municipality immediately south of Pinamalayan.', 10),
  ('Bansud', 'bansud', 'municipality', '2nd District', false, 12.860200, 121.456000, 'Central 2nd District municipality along the provincial highway.', 11),
  ('Bongabong', 'bongabong', 'municipality', '2nd District', false, 12.745200, 121.486600, 'Coastal and upland municipality south of Bansud.', 12),
  ('Roxas', 'roxas', 'municipality', '2nd District', false, 12.589800, 121.516700, 'Key Roll-on/Roll-off (RoRo) port municipality in southern Oriental Mindoro.', 13),
  ('Mansalay', 'mansalay', 'municipality', '2nd District', false, 12.519800, 121.438300, 'Coastal municipality north of Bulalacao.', 14),
  ('Bulalacao', 'bulalacao', 'municipality', '2nd District', false, 12.325400, 121.343500, 'Southernmost municipality of Oriental Mindoro with RoRo port access.', 15)
ON CONFLICT (slug) DO UPDATE
  SET latitude = EXCLUDED.latitude,
      longitude = EXCLUDED.longitude,
      district = EXCLUDED.district,
      classification = EXCLUDED.classification,
      is_capital = EXCLUDED.is_capital,
      description = EXCLUDED.description,
      sort_order = EXCLUDED.sort_order;

INSERT INTO public.transport_types (
  code, name, description, regulatory_body, supports_statutory_discount, icon_name, sort_order
)
VALUES
  ('jeepney', 'Jeepney', 'Traditional and modern Public Utility Jeepneys (PUJ) operating municipal and inter-town corridors.', 'LTFRB Region IV-B (MIMAROPA)', true, 'BusFront', 1),
  ('tricycle', 'Tricycle', 'Motorized tricycles regulated by respective City/Municipal LGU Sanggunian ordinances.', 'City / Municipal LGU (TODA / Tricycle Regulatory Board)', true, 'Bike', 2),
  ('uv_express', 'UV Express', 'Point-to-point air-conditioned utility vehicle vans serving provincial corridors.', 'LTFRB Region IV-B (MIMAROPA)', true, 'CarFront', 3),
  ('bus', 'Bus', 'Provincial and inter-municipal Public Utility Buses (Ordinary & Air-Conditioned).', 'LTFRB Region IV-B (MIMAROPA)', true, 'Bus', 4),
  ('multicab', 'Multicab', 'Compact public utility multicabs serving barangay and inter-town feeder lines.', 'LTFRB / Municipal LGU', true, 'Truck', 5)
ON CONFLICT (code) DO UPDATE
  SET name = EXCLUDED.name,
      description = EXCLUDED.description,
      regulatory_body = EXCLUDED.regulatory_body,
      supports_statutory_discount = EXCLUDED.supports_statutory_discount,
      icon_name = EXCLUDED.icon_name,
      sort_order = EXCLUDED.sort_order;

-- Authentic Statutory Reference Frameworks (no fake route prices)
INSERT INTO public.fare_sources (
  issuing_authority, document_reference, title, source_url, effective_date, jurisdiction, notes
)
VALUES
  (
    'Republic of the Philippines (Congress)',
    'RA 11314',
    'Student Fare Discount Act (20% Statutory Student Discount)',
    'https://www.officialgazette.gov.ph/2019/04/17/republic-act-no-11314/',
    '2019-04-17',
    'National / Oriental Mindoro',
    'Grants 20% fare discount to qualified Filipino students on public transportation upon presentation of valid student ID.'
  ),
  (
    'Republic of the Philippines (Congress)',
    'RA 9994',
    'Expanded Senior Citizens Act of 2010 (20% Fare Discount)',
    'https://www.officialgazette.gov.ph/2010/02/15/republic-act-no-9994/',
    '2010-02-15',
    'National / Oriental Mindoro',
    'Grants 20% fare discount to senior citizens (60+ years old) on public land transportation.'
  ),
  (
    'Republic of the Philippines (Congress)',
    'RA 10754',
    'An Act Expanding the Benefits and Privileges of Persons with Disability (PWD)',
    'https://www.officialgazette.gov.ph/2016/03/23/republic-act-no-10754/',
    '2016-03-23',
    'National / Oriental Mindoro',
    'Grants 20% fare discount on public land transport to registered Persons with Disability.'
  )
ON CONFLICT (issuing_authority, document_reference) DO NOTHING;

-- Default system settings
INSERT INTO public.system_settings (key, value, description)
VALUES
  ('platform_identity', '{"name": "Pamasahe Tracker – Oriental Mindoro", "tagline": "Tamang Pamasahe. Ligtas na Biyahe.", "coverage_province": "Oriental Mindoro"}'::jsonb, 'Core platform metadata'),
  ('rate_limits', '{"max_reports_per_hour": 10, "max_evidence_files_per_report": 3, "max_evidence_size_bytes": 5242880}'::jsonb, 'Rate limits and upload restrictions for fare reporting'),
  ('verification_policy', '{"require_official_document_for_verified": true, "allow_community_estimate_auto_official": false}'::jsonb, 'Strict separation between community estimates and official verified fares')
ON CONFLICT (key) DO NOTHING;
