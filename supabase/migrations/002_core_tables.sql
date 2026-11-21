-- ============================================================================
-- 002_core_tables.sql
-- Pamasahe Tracker – Oriental Mindoro
-- All 16 core PostgreSQL tables, constraints, relationships, and indexes.
-- ============================================================================

-- 1. profiles (1:1 with auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  full_name text NOT NULL DEFAULT '',
  phone_number text,
  home_municipality_id uuid,
  avatar_url text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT uq_profiles_email UNIQUE (email)
);

-- 2. user_roles (isolated authorization table; never editable directly by non-super-admins)
CREATE TABLE IF NOT EXISTS public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role public.app_role NOT NULL DEFAULT 'commuter',
  assigned_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  reason text,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT uq_user_roles_user UNIQUE (user_id)
);

-- 3. municipalities (all 15 LGUs of Oriental Mindoro)
CREATE TABLE IF NOT EXISTS public.municipalities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL,
  classification text NOT NULL CHECK (classification IN ('component_city', 'municipality')),
  district text NOT NULL CHECK (district IN ('1st District', '2nd District')),
  is_capital boolean NOT NULL DEFAULT false,
  psgc_code text,
  latitude numeric(9, 6) NOT NULL CHECK (latitude BETWEEN 12.0 AND 14.0),
  longitude numeric(9, 6) NOT NULL CHECK (longitude BETWEEN 120.5 AND 122.0),
  description text,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT uq_municipalities_name UNIQUE (name),
  CONSTRAINT uq_municipalities_slug UNIQUE (slug)
);

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS fk_profiles_home_municipality;
ALTER TABLE public.profiles
  ADD CONSTRAINT fk_profiles_home_municipality
  FOREIGN KEY (home_municipality_id) REFERENCES public.municipalities(id) ON DELETE SET NULL;

-- 4. transport_types (Jeepney, Tricycle, UV Express, Bus, Multicab)
CREATE TABLE IF NOT EXISTS public.transport_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL,
  name text NOT NULL,
  description text,
  regulatory_body text,
  supports_statutory_discount boolean NOT NULL DEFAULT true,
  icon_name text NOT NULL DEFAULT 'Bus',
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT uq_transport_types_code UNIQUE (code),
  CONSTRAINT uq_transport_types_name UNIQUE (name)
);

-- 5. transport_operators
CREATE TABLE IF NOT EXISTS public.transport_operators (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  operator_name text NOT NULL,
  franchise_or_permit_number text,
  transport_type_id uuid REFERENCES public.transport_types(id) ON DELETE SET NULL,
  primary_municipality_id uuid REFERENCES public.municipalities(id) ON DELETE SET NULL,
  contact_email text,
  contact_phone text,
  office_address text,
  verification_status text NOT NULL DEFAULT 'pending' CHECK (verification_status IN ('pending', 'verified', 'suspended')),
  verified_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  verified_at timestamptz,
  notes text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT uq_transport_operators_name UNIQUE (operator_name)
);

-- 6. routes
CREATE TABLE IF NOT EXISTS public.routes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  route_code text NOT NULL,
  route_name text NOT NULL,
  origin_municipality_id uuid NOT NULL REFERENCES public.municipalities(id) ON DELETE RESTRICT,
  destination_municipality_id uuid NOT NULL REFERENCES public.municipalities(id) ON DELETE RESTRICT,
  transport_type_id uuid NOT NULL REFERENCES public.transport_types(id) ON DELETE RESTRICT,
  operator_id uuid REFERENCES public.transport_operators(id) ON DELETE SET NULL,
  distance_km numeric(8, 2) CHECK (distance_km IS NULL OR distance_km > 0),
  distance_source text CHECK (distance_source IN ('osrm', 'official_survey', 'unverified') OR distance_source IS NULL),
  estimated_duration_min integer CHECK (estimated_duration_min IS NULL OR estimated_duration_min > 0),
  route_geometry jsonb,
  operating_notes text,
  is_verified boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT uq_routes_code UNIQUE (route_code),
  CONSTRAINT chk_routes_distinct_endpoints CHECK (origin_municipality_id <> destination_municipality_id)
);

-- 7. route_stops
CREATE TABLE IF NOT EXISTS public.route_stops (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  route_id uuid NOT NULL REFERENCES public.routes(id) ON DELETE CASCADE,
  municipality_id uuid REFERENCES public.municipalities(id) ON DELETE SET NULL,
  stop_name text NOT NULL,
  stop_order integer NOT NULL CHECK (stop_order >= 1),
  latitude numeric(9, 6) CHECK (latitude IS NULL OR latitude BETWEEN 12.0 AND 14.0),
  longitude numeric(9, 6) CHECK (longitude IS NULL OR longitude BETWEEN 120.5 AND 122.0),
  km_from_origin numeric(8, 2) CHECK (km_from_origin IS NULL OR km_from_origin >= 0),
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT uq_route_stops_order UNIQUE (route_id, stop_order)
);

-- 8. fare_sources (authoritative LTFRB orders, LGU ordinances, verified operator tariffs)
CREATE TABLE IF NOT EXISTS public.fare_sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  issuing_authority text NOT NULL,
  document_reference text NOT NULL,
  title text NOT NULL,
  source_url text,
  effective_date date NOT NULL,
  jurisdiction text NOT NULL DEFAULT 'Oriental Mindoro',
  notes text,
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT uq_fare_sources_doc UNIQUE (issuing_authority, document_reference)
);

-- 9. fare_records (strict separation between verified_official and community_estimate)
CREATE TABLE IF NOT EXISTS public.fare_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  route_id uuid REFERENCES public.routes(id) ON DELETE SET NULL,
  origin_municipality_id uuid NOT NULL REFERENCES public.municipalities(id) ON DELETE RESTRICT,
  destination_municipality_id uuid NOT NULL REFERENCES public.municipalities(id) ON DELETE RESTRICT,
  transport_type_id uuid NOT NULL REFERENCES public.transport_types(id) ON DELETE RESTRICT,
  passenger_category public.passenger_category NOT NULL DEFAULT 'regular',
  fare_amount numeric(10, 2) NOT NULL CHECK (fare_amount > 0 AND fare_amount <= 50000),
  currency text NOT NULL DEFAULT 'PHP' CHECK (currency = 'PHP'),
  status public.fare_status NOT NULL DEFAULT 'pending_verification',
  fare_source_id uuid REFERENCES public.fare_sources(id) ON DELETE RESTRICT,
  issuing_authority text,
  official_document_reference text,
  source_url text,
  effective_date date,
  last_verified_at timestamptz,
  verified_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  is_archived boolean NOT NULL DEFAULT false,
  is_test_fixture boolean NOT NULL DEFAULT false,
  notes text,
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT chk_official_fare_requires_verification CHECK (
    status <> 'verified_official'
    OR (
      (fare_source_id IS NOT NULL OR (official_document_reference IS NOT NULL AND length(trim(official_document_reference)) >= 3))
      AND (issuing_authority IS NOT NULL AND length(trim(issuing_authority)) >= 2)
      AND effective_date IS NOT NULL
      AND last_verified_at IS NOT NULL
      AND verified_by IS NOT NULL
    )
  )
);

-- 10. fare_reports (commuter/operator submitted reports)
CREATE TABLE IF NOT EXISTS public.fare_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  route_id uuid REFERENCES public.routes(id) ON DELETE SET NULL,
  origin_municipality_id uuid NOT NULL REFERENCES public.municipalities(id) ON DELETE RESTRICT,
  destination_municipality_id uuid NOT NULL REFERENCES public.municipalities(id) ON DELETE RESTRICT,
  transport_type_id uuid NOT NULL REFERENCES public.transport_types(id) ON DELETE RESTRICT,
  fare_paid numeric(10, 2) NOT NULL CHECK (fare_paid > 0 AND fare_paid <= 50000),
  passenger_category public.passenger_category NOT NULL DEFAULT 'regular',
  travel_date date NOT NULL,
  operator_id uuid REFERENCES public.transport_operators(id) ON DELETE SET NULL,
  operator_or_vehicle_details text,
  remarks text,
  status public.report_status NOT NULL DEFAULT 'pending',
  is_flagged_suspicious boolean NOT NULL DEFAULT false,
  admin_feedback text,
  reviewed_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  reviewed_at timestamptz,
  linked_fare_record_id uuid REFERENCES public.fare_records(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT chk_report_travel_date CHECK (travel_date <= (CURRENT_DATE + INTERVAL '1 day'))
);

-- 11. fare_report_evidence (references private Supabase Storage objects in 'fare-evidence')
CREATE TABLE IF NOT EXISTS public.fare_report_evidence (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id uuid NOT NULL REFERENCES public.fare_reports(id) ON DELETE CASCADE,
  uploaded_by uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  storage_path text NOT NULL,
  file_name text NOT NULL,
  mime_type text NOT NULL CHECK (mime_type IN ('image/jpeg', 'image/png', 'image/webp', 'application/pdf')),
  file_size_bytes integer NOT NULL CHECK (file_size_bytes > 0 AND file_size_bytes <= 5242880),
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT uq_evidence_storage_path UNIQUE (storage_path)
);

-- 12. fare_verification_logs (immutable verification audit trail)
CREATE TABLE IF NOT EXISTS public.fare_verification_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fare_record_id uuid REFERENCES public.fare_records(id) ON DELETE SET NULL,
  report_id uuid REFERENCES public.fare_reports(id) ON DELETE SET NULL,
  action text NOT NULL,
  previous_status text,
  new_status text NOT NULL,
  previous_amount numeric(10, 2),
  new_amount numeric(10, 2),
  source_reference text,
  reason text,
  performed_by uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

-- 13. favorites (saved commuter routes)
CREATE TABLE IF NOT EXISTS public.favorites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  route_id uuid REFERENCES public.routes(id) ON DELETE CASCADE,
  origin_municipality_id uuid NOT NULL REFERENCES public.municipalities(id) ON DELETE CASCADE,
  destination_municipality_id uuid NOT NULL REFERENCES public.municipalities(id) ON DELETE CASCADE,
  transport_type_id uuid REFERENCES public.transport_types(id) ON DELETE SET NULL,
  label text,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT uq_favorites_user_corridor UNIQUE (user_id, origin_municipality_id, destination_municipality_id, transport_type_id)
);

-- 14. notifications (deduplicated realtime notifications)
CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type public.notification_type NOT NULL,
  title text NOT NULL,
  message text NOT NULL,
  related_report_id uuid REFERENCES public.fare_reports(id) ON DELETE SET NULL,
  related_fare_id uuid REFERENCES public.fare_records(id) ON DELETE SET NULL,
  is_read boolean NOT NULL DEFAULT false,
  read_at timestamptz,
  dedupe_key text,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

-- 15. audit_logs (system-wide security & operational log)
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  actor_role public.app_role,
  action text NOT NULL,
  entity_type text NOT NULL,
  entity_id text,
  old_values jsonb,
  new_values jsonb,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

-- 16. system_settings (application configuration managed by Super Administrators)
CREATE TABLE IF NOT EXISTS public.system_settings (
  key text PRIMARY KEY,
  value jsonb NOT NULL,
  description text,
  updated_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

-- Indexes for query performance
CREATE INDEX IF NOT EXISTS idx_user_roles_role ON public.user_roles(role);
CREATE INDEX IF NOT EXISTS idx_routes_origin_dest ON public.routes(origin_municipality_id, destination_municipality_id, transport_type_id);
CREATE INDEX IF NOT EXISTS idx_fare_records_lookup ON public.fare_records(origin_municipality_id, destination_municipality_id, transport_type_id, passenger_category, status) WHERE is_archived = false;
CREATE INDEX IF NOT EXISTS idx_fare_records_status ON public.fare_records(status, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_fare_reports_reporter ON public.fare_reports(reporter_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_fare_reports_status ON public.fare_reports(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_fare_evidence_report ON public.fare_report_evidence(report_id);
CREATE INDEX IF NOT EXISTS idx_verification_logs_created ON public.fare_verification_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON public.notifications(user_id, is_read, created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS uq_notifications_user_dedupe ON public.notifications(user_id, dedupe_key) WHERE dedupe_key IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON public.audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON public.audit_logs(entity_type, entity_id);

-- Updated_at triggers
DROP TRIGGER IF EXISTS trg_profiles_updated_at ON public.profiles;
CREATE TRIGGER trg_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_user_roles_updated_at ON public.user_roles;
CREATE TRIGGER trg_user_roles_updated_at BEFORE UPDATE ON public.user_roles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_municipalities_updated_at ON public.municipalities;
CREATE TRIGGER trg_municipalities_updated_at BEFORE UPDATE ON public.municipalities FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_transport_types_updated_at ON public.transport_types;
CREATE TRIGGER trg_transport_types_updated_at BEFORE UPDATE ON public.transport_types FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_transport_operators_updated_at ON public.transport_operators;
CREATE TRIGGER trg_transport_operators_updated_at BEFORE UPDATE ON public.transport_operators FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_routes_updated_at ON public.routes;
CREATE TRIGGER trg_routes_updated_at BEFORE UPDATE ON public.routes FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_route_stops_updated_at ON public.route_stops;
CREATE TRIGGER trg_route_stops_updated_at BEFORE UPDATE ON public.route_stops FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_fare_sources_updated_at ON public.fare_sources;
CREATE TRIGGER trg_fare_sources_updated_at BEFORE UPDATE ON public.fare_sources FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_fare_records_updated_at ON public.fare_records;
CREATE TRIGGER trg_fare_records_updated_at BEFORE UPDATE ON public.fare_records FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_fare_reports_updated_at ON public.fare_reports;
CREATE TRIGGER trg_fare_reports_updated_at BEFORE UPDATE ON public.fare_reports FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_system_settings_updated_at ON public.system_settings;
CREATE TRIGGER trg_system_settings_updated_at BEFORE UPDATE ON public.system_settings FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
