-- ============================================================================
-- 018_enhanced_shared_trip_telemetry.sql
-- Pamasahe Tracker – Oriental Mindoro
-- Extends get_shared_trip_status(p_share_token) to return live movement speed,
-- average/max speed, heading, accuracy, start/destination coordinates, and
-- recent movement trail points ONLY for active, unexpired, unrevoked tokens.
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
  v_latest_point public.trip_location_points;
  v_prev_point public.trip_location_points;
  v_latest_speed_kmh numeric := NULL;
  v_max_speed_kmh numeric := NULL;
  v_avg_speed_kmh numeric := NULL;
  v_dt_seconds numeric := 0;
  v_delta_km numeric := 0;
  v_trail_points jsonb := '[]'::jsonb;
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

  SELECT * INTO v_latest_point
    FROM public.trip_location_points
   WHERE trip_id = v_trip.id
   ORDER BY recorded_at DESC
   LIMIT 1;

  IF v_latest_point.id IS NOT NULL THEN
    IF v_latest_point.speed_mps IS NOT NULL AND v_latest_point.speed_mps >= 0 THEN
      v_latest_speed_kmh := round((v_latest_point.speed_mps * 3.6)::numeric, 1);
    ELSE
      SELECT * INTO v_prev_point
        FROM public.trip_location_points
       WHERE trip_id = v_trip.id AND id <> v_latest_point.id
       ORDER BY recorded_at DESC
       LIMIT 1;

      IF v_prev_point.id IS NOT NULL THEN
        v_dt_seconds := EXTRACT(EPOCH FROM (v_latest_point.recorded_at - v_prev_point.recorded_at));
        IF v_dt_seconds >= 1 THEN
          -- Equirectangular local distance approximation (km)
          v_delta_km := sqrt(
            power((v_latest_point.latitude - v_prev_point.latitude) * 111.32, 2) +
            power((v_latest_point.longitude - v_prev_point.longitude) * 111.32 * cos(radians(v_latest_point.latitude)), 2)
          );
          IF v_delta_km < 10 THEN
            v_latest_speed_kmh := round(LEAST(160.0, (v_delta_km / v_dt_seconds) * 3600.0)::numeric, 1);
          END IF;
        END IF;
      END IF;
    END IF;
  END IF;

  SELECT round(MAX(COALESCE(speed_mps, 0) * 3.6)::numeric, 1)
    INTO v_max_speed_kmh
    FROM public.trip_location_points
   WHERE trip_id = v_trip.id;

  IF COALESCE(v_trip.duration_seconds, 0) > 5 AND COALESCE(v_trip.distance_km, 0) > 0 THEN
    v_avg_speed_kmh := round(LEAST(160.0, (v_trip.distance_km / (v_trip.duration_seconds::numeric / 3600.0))), 1);
  END IF;

  SELECT COALESCE(jsonb_agg(row_to_json(pts) ORDER BY pts.recorded_at ASC), '[]'::jsonb)
    INTO v_trail_points
    FROM (
      SELECT
        latitude,
        longitude,
        CASE WHEN speed_mps IS NOT NULL AND speed_mps >= 0 THEN round((speed_mps * 3.6)::numeric, 1) ELSE NULL END AS speed_kmh,
        heading_deg,
        accuracy_meters,
        recorded_at
      FROM public.trip_location_points
      WHERE trip_id = v_trip.id
      ORDER BY recorded_at DESC
      LIMIT 120
    ) pts;

  RETURN jsonb_build_object(
    'available', true,
    'commuter_name', v_commuter_first,
    'trip_status', v_trip.status,
    'origin_name', v_origin_name,
    'destination_name', v_dest_name,
    'transport_mode', v_mode_name,
    'current_latitude', COALESCE(v_latest_point.latitude, v_trip.current_latitude),
    'current_longitude', COALESCE(v_latest_point.longitude, v_trip.current_longitude),
    'start_latitude', v_trip.start_latitude,
    'start_longitude', v_trip.start_longitude,
    'destination_latitude', v_trip.destination_latitude,
    'destination_longitude', v_trip.destination_longitude,
    'distance_km', v_trip.distance_km,
    'duration_seconds', v_trip.duration_seconds,
    'deviation_detected', v_trip.deviation_detected,
    'max_deviation_km', v_trip.max_deviation_km,
    'latest_speed_kmh', v_latest_speed_kmh,
    'avg_speed_kmh', v_avg_speed_kmh,
    'max_speed_kmh', v_max_speed_kmh,
    'heading_deg', v_latest_point.heading_deg,
    'accuracy_meters', v_latest_point.accuracy_meters,
    'last_recorded_at', COALESCE(v_latest_point.recorded_at, v_trip.updated_at),
    'trail_points', v_trail_points,
    'started_at', v_trip.started_at,
    'ended_at', v_trip.ended_at,
    'expires_at', v_session.expires_at
  );
END;
$$;
