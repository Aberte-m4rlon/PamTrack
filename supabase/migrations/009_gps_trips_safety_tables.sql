-- ============================================================================
-- 009_gps_trips_safety_tables.sql
-- Pamasahe Tracker – Oriental Mindoro
-- Phase 2 Schema: Transport Stops, GPS Sessions/Preferences, Live Trip
-- Monitoring, Trusted Contacts, Location Sharing, and Safety Reports.
-- ============================================================================

-- Extend notification_type enum safely
ALTER TYPE public.notification_type ADD VALUE IF NOT EXISTS 'trip_completed';
ALTER TYPE public.notification_type ADD VALUE IF NOT EXISTS 'arrival_alert';
ALTER TYPE public.notification_type ADD VALUE IF NOT EXISTS 'route_deviation_warning';
ALTER TYPE public.notification_type ADD VALUE IF NOT EXISTS 'safety_alert';

-- 17. transport_stops (verified real-world terminals & stops)
CREATE TABLE IF NOT EXISTS public.transport_stops (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  municipality_id uuid NOT NULL REFERENCES public.municipalities(id) ON DELETE RESTRICT,
  transport_type_id uuid REFERENCES public.transport_types(id) ON DELETE SET NULL,
  stop_name text NOT NULL,
  stop_category text NOT NULL CHECK (
    stop_category IN ('jeepney_stop', 'tricycle_terminal', 'bus_terminal', 'uv_express_terminal', 'port_hub')
  ),
  latitude numeric(9, 6) NOT NULL CHECK (latitude BETWEEN 12.0 AND 14.0),
  longitude numeric(9, 6) NOT NULL CHECK (longitude BETWEEN 120.5 AND 122.0),
  address_or_landmark text,
  operating_notes text,
  source_reference text,
  is_verified boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT uq_transport_stops_name_muni UNIQUE (municipality_id, stop_name)
);

-- 18. user_location_preferences (explicit GPS consent & retention policy)
CREATE TABLE IF NOT EXISTS public.user_location_preferences (
  user_id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  gps_consent_granted boolean NOT NULL DEFAULT false,
  consent_updated_at timestamptz,
  allow_live_trip_tracking boolean NOT NULL DEFAULT false,
  share_anonymized_municipality_stats boolean NOT NULL DEFAULT false,
  retention_days integer NOT NULL DEFAULT 30 CHECK (retention_days BETWEEN 1 AND 365),
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

-- 19. user_location_sessions (visible user-initiated GPS sessions; never covert)
CREATE TABLE IF NOT EXISTS public.user_location_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  permission_state text NOT NULL CHECK (permission_state IN ('granted', 'denied', 'prompt', 'unsupported')),
  is_active boolean NOT NULL DEFAULT true,
  last_latitude numeric(9, 6),
  last_longitude numeric(9, 6),
  last_accuracy_meters numeric(10, 2),
  detected_municipality_id uuid REFERENCES public.municipalities(id) ON DELETE SET NULL,
  started_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  stopped_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

-- 20. trip_records (live and historical trips)
CREATE TABLE IF NOT EXISTS public.trip_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  origin_municipality_id uuid REFERENCES public.municipalities(id) ON DELETE SET NULL,
  destination_municipality_id uuid REFERENCES public.municipalities(id) ON DELETE SET NULL,
  route_id uuid REFERENCES public.routes(id) ON DELETE SET NULL,
  transport_type_id uuid REFERENCES public.transport_types(id) ON DELETE SET NULL,
  associated_fare_record_id uuid REFERENCES public.fare_records(id) ON DELETE SET NULL,
  recorded_fare_amount numeric(10, 2) CHECK (recorded_fare_amount IS NULL OR recorded_fare_amount >= 0),
  fare_expense_type text NOT NULL DEFAULT 'none' CHECK (fare_expense_type IN ('recorded', 'estimated', 'none')),
  start_latitude numeric(9, 6),
  start_longitude numeric(9, 6),
  destination_latitude numeric(9, 6),
  destination_longitude numeric(9, 6),
  current_latitude numeric(9, 6),
  current_longitude numeric(9, 6),
  distance_km numeric(8, 2) NOT NULL DEFAULT 0 CHECK (distance_km >= 0),
  duration_seconds integer NOT NULL DEFAULT 0 CHECK (duration_seconds >= 0),
  deviation_detected boolean NOT NULL DEFAULT false,
  max_deviation_km numeric(8, 2) NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled')),
  started_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  ended_at timestamptz,
  notes text,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

-- 21. trip_location_points (GPS breadcrumbs for active trips; strictly owner-only)
CREATE TABLE IF NOT EXISTS public.trip_location_points (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id uuid NOT NULL REFERENCES public.trip_records(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  latitude numeric(9, 6) NOT NULL,
  longitude numeric(9, 6) NOT NULL,
  accuracy_meters numeric(10, 2),
  speed_mps numeric(8, 2),
  heading_deg numeric(6, 2),
  recorded_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

-- 22. trusted_contacts (commuter emergency & arrival contacts)
CREATE TABLE IF NOT EXISTS public.trusted_contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  contact_name text NOT NULL,
  relationship text,
  phone_number text,
  email text,
  notify_on_trip_start boolean NOT NULL DEFAULT false,
  notify_on_arrival boolean NOT NULL DEFAULT true,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

-- 23. location_sharing_sessions (time-limited explicit consent trip sharing)
CREATE TABLE IF NOT EXISTS public.location_sharing_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  trip_id uuid REFERENCES public.trip_records(id) ON DELETE CASCADE,
  trusted_contact_id uuid REFERENCES public.trusted_contacts(id) ON DELETE SET NULL,
  share_token text NOT NULL DEFAULT encode(gen_random_bytes(16), 'hex'),
  consent_confirmed boolean NOT NULL DEFAULT false CHECK (consent_confirmed = true),
  expires_at timestamptz NOT NULL,
  revoked_at timestamptz,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT uq_location_sharing_token UNIQUE (share_token)
);

-- 24. safety_reports (commuter safety incident reports)
CREATE TABLE IF NOT EXISTS public.safety_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  trip_id uuid REFERENCES public.trip_records(id) ON DELETE SET NULL,
  municipality_id uuid REFERENCES public.municipalities(id) ON DELETE SET NULL,
  transport_type_id uuid REFERENCES public.transport_types(id) ON DELETE SET NULL,
  incident_type text NOT NULL,
  severity text NOT NULL DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  description text NOT NULL,
  vehicle_or_operator_details text,
  latitude numeric(9, 6),
  longitude numeric(9, 6),
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'investigating', 'resolved', 'dismissed')),
  admin_notes text,
  reviewed_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_transport_stops_muni ON public.transport_stops(municipality_id, stop_category) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_location_sessions_user ON public.user_location_sessions(user_id, is_active, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_trip_records_user ON public.trip_records(user_id, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_trip_points_trip ON public.trip_location_points(trip_id, recorded_at ASC);
CREATE INDEX IF NOT EXISTS idx_trusted_contacts_user ON public.trusted_contacts(user_id, is_active);
CREATE INDEX IF NOT EXISTS idx_sharing_sessions_user ON public.location_sharing_sessions(user_id, is_active, expires_at);
CREATE INDEX IF NOT EXISTS idx_safety_reports_reporter ON public.safety_reports(reporter_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_safety_reports_status ON public.safety_reports(status, created_at DESC);

-- Updated_at triggers
DROP TRIGGER IF EXISTS trg_transport_stops_updated_at ON public.transport_stops;
CREATE TRIGGER trg_transport_stops_updated_at BEFORE UPDATE ON public.transport_stops FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_user_location_prefs_updated_at ON public.user_location_preferences;
CREATE TRIGGER trg_user_location_prefs_updated_at BEFORE UPDATE ON public.user_location_preferences FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_user_location_sessions_updated_at ON public.user_location_sessions;
CREATE TRIGGER trg_user_location_sessions_updated_at BEFORE UPDATE ON public.user_location_sessions FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_trip_records_updated_at ON public.trip_records;
CREATE TRIGGER trg_trip_records_updated_at BEFORE UPDATE ON public.trip_records FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_trusted_contacts_updated_at ON public.trusted_contacts;
CREATE TRIGGER trg_trusted_contacts_updated_at BEFORE UPDATE ON public.trusted_contacts FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_location_sharing_updated_at ON public.location_sharing_sessions;
CREATE TRIGGER trg_location_sharing_updated_at BEFORE UPDATE ON public.location_sharing_sessions FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_safety_reports_updated_at ON public.safety_reports;
CREATE TRIGGER trg_safety_reports_updated_at BEFORE UPDATE ON public.safety_reports FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
