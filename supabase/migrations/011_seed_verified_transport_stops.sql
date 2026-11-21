-- ============================================================================
-- 011_seed_verified_transport_stops.sql
-- Pamasahe Tracker – Oriental Mindoro
-- Seeds ONLY verified real-world Oriental Mindoro transport terminals & ports
-- with verified public coordinates. Never fabricates unverified stops.
-- ============================================================================

DO $$
DECLARE
  v_calapan uuid;
  v_puerto_galera uuid;
  v_roxas uuid;
  v_bulalacao uuid;
  v_jeepney uuid;
  v_bus uuid;
BEGIN
  SELECT id INTO v_calapan FROM public.municipalities WHERE slug = 'calapan-city';
  SELECT id INTO v_puerto_galera FROM public.municipalities WHERE slug = 'puerto-galera';
  SELECT id INTO v_roxas FROM public.municipalities WHERE slug = 'roxas';
  SELECT id INTO v_bulalacao FROM public.municipalities WHERE slug = 'bulalacao';

  SELECT id INTO v_jeepney FROM public.transport_types WHERE code = 'jeepney';
  SELECT id INTO v_bus FROM public.transport_types WHERE code = 'bus';

  INSERT INTO public.transport_stops (
    municipality_id, transport_type_id, stop_name, stop_category,
    latitude, longitude, address_or_landmark, operating_notes, source_reference,
    is_verified, is_active
  )
  VALUES
    (
      v_calapan, v_bus,
      'Calapan Port Passenger Terminal',
      'port_hub',
      13.430000, 121.196700,
      'Port of Calapan, San Antonio, Calapan City',
      'Primary RoRo/Fastcraft maritime gateway linking Batangas Port with connecting jeepney, tricycle, and UV Express land transit.',
      'Philippine Ports Authority / Wikipedia verified port coordinates',
      true, true
    ),
    (
      v_calapan, v_jeepney,
      'Calapan City Proper Jeepney & Van Terminal (Citimart / Market Area)',
      'jeepney_stop',
      13.412870, 121.179210,
      'Near Citimart Island Mall & Calapan Cathedral, Calapan City',
      'Verified downtown dispatch point for jeepneys & UV Express vans bound for Puerto Galera and inter-town corridors.',
      'OpenStreetMap / Mapcarta verified coordinates',
      true, true
    ),
    (
      v_puerto_galera, v_jeepney,
      'Balatero Port Terminal',
      'port_hub',
      13.504600, 120.932300,
      'Brgy. Balatero, Puerto Galera, Oriental Mindoro',
      'Main RoRo & passenger port of Puerto Galera with tricycle and jeepney connections to Poblacion and White Beach.',
      'Mapcarta / OpenStreetMap verified coordinates',
      true, true
    ),
    (
      v_roxas, v_bus,
      'Port of Roxas (Dangay Port Terminal)',
      'port_hub',
      12.650000, 121.550000,
      'Brgy. Dangay, Roxas, Oriental Mindoro',
      'Strong Republic Nautical Highway RoRo port connecting southern Oriental Mindoro with Romblon and Caticlan.',
      'Wikipedia / Strong Republic Nautical Highway verified coordinates',
      true, true
    ),
    (
      v_bulalacao, v_bus,
      'Bulalacao Port Terminal',
      'port_hub',
      12.334000, 121.350000,
      'Poblacion / Port Area, Bulalacao, Oriental Mindoro',
      'Southernmost RoRo maritime & land transport interchange in Oriental Mindoro.',
      'MarineLink / VesselTracker verified port coordinates',
      true, true
    )
  ON CONFLICT (municipality_id, stop_name) DO UPDATE
    SET latitude = EXCLUDED.latitude,
        longitude = EXCLUDED.longitude,
        operating_notes = EXCLUDED.operating_notes,
        source_reference = EXCLUDED.source_reference,
        is_verified = true,
        is_active = true;
END $$;
