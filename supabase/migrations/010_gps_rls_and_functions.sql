-- ============================================================================
-- 010_gps_rls_and_functions.sql
-- Pamasahe Tracker – Oriental Mindoro
-- Strict Privacy-First RLS Policies, Grants, User Location Deletion,
-- Token-Scoped Trip Sharing, and Aggregated Non-PII Admin Analytics RPCs.
-- ============================================================================

-- Enable RLS on all 8 new tables
ALTER TABLE public.transport_stops ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_location_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_location_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trip_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trip_location_points ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trusted_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.location_sharing_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.safety_reports ENABLE ROW LEVEL SECURITY;

-- 1. transport_stops (public read active verified stops; admin write)
DROP POLICY IF EXISTS "transport_stops_public_select" ON public.transport_stops;
CREATE POLICY "transport_stops_public_select"
  ON public.transport_stops FOR SELECT
  USING ((is_active = true AND is_verified = true) OR public.is_admin());

DROP POLICY IF EXISTS "transport_stops_admin_write" ON public.transport_stops;
CREATE POLICY "transport_stops_admin_write"
  ON public.transport_stops FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- 2. user_location_preferences (STRICT OWNER-ONLY: admins cannot view/change)
DROP POLICY IF EXISTS "location_prefs_owner_all" ON public.user_location_preferences;
CREATE POLICY "location_prefs_owner_all"
  ON public.user_location_preferences FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- 3. user_location_sessions (STRICT OWNER-ONLY: admins cannot access individual GPS)
DROP POLICY IF EXISTS "location_sessions_owner_all" ON public.user_location_sessions;
CREATE POLICY "location_sessions_owner_all"
  ON public.user_location_sessions FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- 4. trip_records (STRICT OWNER-ONLY: admins receive aggregated RPC stats only)
DROP POLICY IF EXISTS "trip_records_owner_all" ON public.trip_records;
CREATE POLICY "trip_records_owner_all"
  ON public.trip_records FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- 5. trip_location_points (STRICT OWNER-ONLY: never exposed to admins or public)
DROP POLICY IF EXISTS "trip_points_owner_all" ON public.trip_location_points;
CREATE POLICY "trip_points_owner_all"
  ON public.trip_location_points FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.trip_records tr
      WHERE tr.id = trip_location_points.trip_id AND tr.user_id = auth.uid()
    )
  );

-- 6. trusted_contacts (STRICT OWNER-ONLY)
DROP POLICY IF EXISTS "trusted_contacts_owner_all" ON public.trusted_contacts;
CREATE POLICY "trusted_contacts_owner_all"
  ON public.trusted_contacts FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- 7. location_sharing_sessions (OWNER CRUD)
DROP POLICY IF EXISTS "location_sharing_owner_all" ON public.location_sharing_sessions;
CREATE POLICY "location_sharing_owner_all"
  ON public.location_sharing_sessions FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- 8. safety_reports (reporter sees/creates own; admin reviews & updates status)
DROP POLICY IF EXISTS "safety_reports_select_authorized" ON public.safety_reports;
CREATE POLICY "safety_reports_select_authorized"
  ON public.safety_reports FOR SELECT
  USING (reporter_id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS "safety_reports_insert_authenticated" ON public.safety_reports;
CREATE POLICY "safety_reports_insert_authenticated"
  ON public.safety_reports FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND reporter_id = auth.uid()
    AND status = 'open'
    AND reviewed_by IS NULL
  );

DROP POLICY IF EXISTS "safety_reports_admin_update" ON public.safety_reports;
CREATE POLICY "safety_reports_admin_update"
  ON public.safety_reports FOR UPDATE
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ============================================================================
-- User-Controlled Personal Location History Deletion RPC
-- ============================================================================
CREATE OR REPLACE FUNCTION public.delete_my_location_history(
  p_include_trips boolean DEFAULT true
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_points_deleted integer := 0;
  v_sessions_deleted integer := 0;
  v_shares_deleted integer := 0;
  v_trips_affected integer := 0;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Authentication required.' USING ERRCODE = '42501';
  END IF;

  DELETE FROM public.trip_location_points WHERE user_id = v_uid;
  GET DIAGNOSTICS v_points_deleted = ROW_COUNT;

  DELETE FROM public.user_location_sessions WHERE user_id = v_uid;
  GET DIAGNOSTICS v_sessions_deleted = ROW_COUNT;

  DELETE FROM public.location_sharing_sessions WHERE user_id = v_uid;
  GET DIAGNOSTICS v_shares_deleted = ROW_COUNT;

  IF p_include_trips THEN
    DELETE FROM public.trip_records WHERE user_id = v_uid;
    GET DIAGNOSTICS v_trips_affected = ROW_COUNT;
  ELSE
    UPDATE public.trip_records
       SET start_latitude = NULL,
           start_longitude = NULL,
           destination_latitude = NULL,
           destination_longitude = NULL,
           current_latitude = NULL,
           current_longitude = NULL
     WHERE user_id = v_uid;
    GET DIAGNOSTICS v_trips_affected = ROW_COUNT;
  END IF;

  RETURN jsonb_build_object(
    'points_deleted', v_points_deleted,
    'sessions_deleted', v_sessions_deleted,
    'shares_deleted', v_shares_deleted,
    'trips_affected', v_trips_affected
  );
END;
$$;

-- ============================================================================
-- Token-Scoped Shared Trip Status Viewer (Only active, unrevoked, non-expired)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.get_shared_trip_status(
  p_share_token text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_session public.location_sharing_sessions;
  v_trip public.trip_records;
  v_origin_name text;
  v_dest_name text;
  v_mode_name text;
  v_commuter_first text;
BEGIN
  SELECT * INTO v_session
    FROM public.location_sharing_sessions
   WHERE share_token = p_share_token
     AND is_active = true
     AND revoked_at IS NULL
     AND consent_confirmed = true
     AND expires_at > timezone('utc', now())
   LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('available', false, 'reason', 'Sharing link is invalid, expired, or has been revoked.');
  END IF;

  SELECT * INTO v_trip FROM public.trip_records WHERE id = v_session.trip_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('available', false, 'reason', 'Associated trip is no longer available.');
  END IF;

  SELECT name INTO v_origin_name FROM public.municipalities WHERE id = v_trip.origin_municipality_id;
  SELECT name INTO v_dest_name FROM public.municipalities WHERE id = v_trip.destination_municipality_id;
  SELECT name INTO v_mode_name FROM public.transport_types WHERE id = v_trip.transport_type_id;
  SELECT split_part(COALESCE(full_name, 'Commuter'), ' ', 1) INTO v_commuter_first FROM public.profiles WHERE id = v_session.user_id;

  RETURN jsonb_build_object(
    'available', true,
    'commuter_name', v_commuter_first,
    'trip_status', v_trip.status,
    'origin_name', v_origin_name,
    'destination_name', v_dest_name,
    'transport_mode', v_mode_name,
    'current_latitude', v_trip.current_latitude,
    'current_longitude', v_trip.current_longitude,
    'distance_km', v_trip.distance_km,
    'duration_seconds', v_trip.duration_seconds,
    'deviation_detected', v_trip.deviation_detected,
    'started_at', v_trip.started_at,
    'ended_at', v_trip.ended_at,
    'expires_at', v_session.expires_at
  );
END;
$$;

-- ============================================================================
-- Privacy-Preserving Admin Aggregated Trip & Location Analytics RPC
-- NEVER returns individual user coordinates or personal location trails!
-- ============================================================================
CREATE OR REPLACE FUNCTION public.get_admin_aggregated_analytics()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_active_trips integer := 0;
  v_completed_trips integer := 0;
  v_total_distance numeric := 0;
  v_active_gps_consent_users integer := 0;
  v_open_safety_reports integer := 0;
  v_mode_usage jsonb := '[]'::jsonb;
  v_muni_activity jsonb := '[]'::jsonb;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Forbidden: administrator access required.' USING ERRCODE = '42501';
  END IF;

  SELECT count(*)::int INTO v_active_trips FROM public.trip_records WHERE status = 'active';
  SELECT count(*)::int, COALESCE(sum(distance_km), 0)
    INTO v_completed_trips, v_total_distance
    FROM public.trip_records
   WHERE status = 'completed';

  SELECT count(*)::int INTO v_active_gps_consent_users
    FROM public.user_location_preferences
   WHERE gps_consent_granted = true;

  SELECT count(*)::int INTO v_open_safety_reports
    FROM public.safety_reports
   WHERE status IN ('open', 'investigating');

  SELECT COALESCE(jsonb_agg(row_to_json(t)), '[]'::jsonb)
    INTO v_mode_usage
    FROM (
      SELECT COALESCE(tt.name, 'Unspecified') AS mode_name, count(*)::int AS trip_count
      FROM public.trip_records tr
      LEFT JOIN public.transport_types tt ON tt.id = tr.transport_type_id
      GROUP BY tt.name
      ORDER BY trip_count DESC
    ) t;

  SELECT COALESCE(jsonb_agg(row_to_json(m)), '[]'::jsonb)
    INTO v_muni_activity
    FROM (
      SELECT mu.name AS municipality_name, count(*)::int AS trip_count
      FROM public.trip_records tr
      JOIN public.municipalities mu ON mu.id = tr.destination_municipality_id
      GROUP BY mu.name
      ORDER BY trip_count DESC
      LIMIT 15
    ) m;

  RETURN jsonb_build_object(
    'active_trips', v_active_trips,
    'completed_trips', v_completed_trips,
    'total_distance_km', round(v_total_distance, 2),
    'gps_consented_users', v_active_gps_consent_users,
    'open_safety_reports', v_open_safety_reports,
    'mode_usage', v_mode_usage,
    'municipality_destinations', v_muni_activity
  );
END;
$$;

-- ============================================================================
-- Automatic Notifications for Trip Completion & Safety Report Updates
-- ============================================================================
CREATE OR REPLACE FUNCTION public.notify_trip_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'completed' AND COALESCE(OLD.status, '') <> 'completed' THEN
    PERFORM public.create_notification(
      NEW.user_id,
      'trip_completed',
      'Trip completed & saved',
      format('Your trip (%s km) has been recorded in your Trip History.', to_char(NEW.distance_km, 'FM999990.00')),
      NULL,
      NEW.associated_fare_record_id,
      format('trip-completed-%s', NEW.id)
    );
  END IF;

  IF NEW.deviation_detected = true AND COALESCE(OLD.deviation_detected, false) = false THEN
    PERFORM public.create_notification(
      NEW.user_id,
      'route_deviation_warning',
      'Route deviation detected',
      format('Your live position moved %s km away from the planned corridor.', to_char(NEW.max_deviation_km, 'FM999990.00')),
      NULL,
      NULL,
      format('trip-deviation-%s', NEW.id)
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_trip_records_notify ON public.trip_records;
CREATE TRIGGER trg_trip_records_notify
  AFTER UPDATE ON public.trip_records
  FOR EACH ROW EXECUTE FUNCTION public.notify_trip_status_change();

CREATE OR REPLACE FUNCTION public.notify_safety_report_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM public.create_notification(
      NEW.reporter_id,
      'safety_alert',
      'Safety incident report logged',
      format('Your %s safety report has been received for administrator review.', NEW.incident_type),
      NULL,
      NULL,
      format('safety-created-%s', NEW.id)
    );
  ELSIF TG_OP = 'UPDATE' AND NEW.status IS DISTINCT FROM OLD.status THEN
    PERFORM public.create_notification(
      NEW.reporter_id,
      'safety_alert',
      'Safety report status updated',
      format('Your safety incident report is now marked: %s.', NEW.status),
      NULL,
      NULL,
      format('safety-status-%s-%s', NEW.id, NEW.status)
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_safety_reports_notify ON public.safety_reports;
CREATE TRIGGER trg_safety_reports_notify
  AFTER INSERT OR UPDATE ON public.safety_reports
  FOR EACH ROW EXECUTE FUNCTION public.notify_safety_report_change();

-- Grants on new tables & functions
GRANT SELECT ON public.transport_stops TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON
  public.transport_stops,
  public.user_location_preferences,
  public.user_location_sessions,
  public.trip_records,
  public.trip_location_points,
  public.trusted_contacts,
  public.location_sharing_sessions,
  public.safety_reports
TO authenticated;
GRANT ALL ON
  public.transport_stops,
  public.user_location_preferences,
  public.user_location_sessions,
  public.trip_records,
  public.trip_location_points,
  public.trusted_contacts,
  public.location_sharing_sessions,
  public.safety_reports
TO service_role;

GRANT EXECUTE ON FUNCTION
  public.delete_my_location_history(boolean),
  public.get_shared_trip_status(text),
  public.get_admin_aggregated_analytics()
TO authenticated;

GRANT EXECUTE ON FUNCTION public.get_shared_trip_status(text) TO anon;
