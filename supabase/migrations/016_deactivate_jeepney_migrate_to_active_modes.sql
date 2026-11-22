-- ============================================================================
-- 016_deactivate_jeepney_migrate_to_active_modes.sql
-- Pamasahe Tracker – Oriental Mindoro
-- Deactivates traditional PUJ Jeepney (`is_active = false`) since jeepneys
-- are no longer plying active routes in Oriental Mindoro, migrating active
-- commuter baseline routes & community estimates to Multicab (without deleting
-- historical audit/compliance references).
-- ============================================================================

DO $$
DECLARE
  v_jeepney uuid;
  v_multicab uuid;
  rec RECORD;
BEGIN
  SELECT id INTO v_jeepney FROM public.transport_types WHERE code = 'jeepney';
  SELECT id INTO v_multicab FROM public.transport_types WHERE code = 'multicab';

  IF v_jeepney IS NULL OR v_multicab IS NULL THEN
    RETURN;
  END IF;

  -- 1. Mark traditional Jeepney inactive (active modes: Tricycle, UV Express, Bus, Multicab)
  UPDATE public.transport_types
  SET is_active = false,
      description = 'Traditional PUJ Jeepneys are currently inactive across active Oriental Mindoro routes; active modes are Multicab, UV Express, Bus, and Tricycle.'
  WHERE id = v_jeepney;

  -- 2. Reassign routes referencing Jeepney -> Multicab with updated codes/names
  UPDATE public.routes
  SET transport_type_id = v_multicab,
      route_code = replace(route_code, '-PUJ', '-MCB'),
      route_name = replace(route_name, 'Jeepney', 'Multicab')
  WHERE transport_type_id = v_jeepney;

  -- 3. Update Jeepney stops metadata to PUV & Multicab
  UPDATE public.transport_stops
  SET transport_type_id = v_multicab,
      stop_name = replace(stop_name, 'Jeepney & Van Terminal', 'Multicab & Van Terminal'),
      operating_notes = replace(replace(operating_notes, 'jeepneys', 'multicabs'), 'jeepney', 'multicab')
  WHERE transport_type_id = v_jeepney OR stop_name ILIKE '%Jeepney%';

  -- 4. Reassign non-conflicting community fare estimates to Multicab; archive duplicates
  FOR rec IN
    SELECT *
    FROM public.fare_records
    WHERE transport_type_id = v_jeepney
      AND is_archived = false
  LOOP
    IF NOT EXISTS (
      SELECT 1
      FROM public.fare_records existing
      WHERE existing.origin_municipality_id = rec.origin_municipality_id
        AND existing.destination_municipality_id = rec.destination_municipality_id
        AND existing.transport_type_id = v_multicab
        AND existing.passenger_category = rec.passenger_category
        AND existing.is_archived = false
        AND existing.is_test_fixture = rec.is_test_fixture
    ) AND rec.status = 'community_estimate' THEN
      UPDATE public.fare_records
      SET transport_type_id = v_multicab,
          notes = COALESCE(replace(replace(notes, 'Jeepney', 'Multicab'), 'PUJ', 'Multicab'), 'Multicab community fare estimate')
      WHERE id = rec.id;
    ELSE
      UPDATE public.fare_records
      SET is_archived = true
      WHERE id = rec.id;
    END IF;
  END LOOP;
END $$;
