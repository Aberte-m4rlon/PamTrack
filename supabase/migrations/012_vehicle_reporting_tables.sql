-- ============================================================================
-- 012_vehicle_reporting_tables.sql
-- Pamasahe Tracker – Oriental Mindoro
-- Phase 3: Vehicle, Driver & Transportation Violation Reporting Schema
-- ============================================================================

CREATE SEQUENCE IF NOT EXISTS public.vehicle_report_seq START 1;

-- 25. vehicle_reports
CREATE TABLE IF NOT EXISTS public.vehicle_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reference_number text NOT NULL UNIQUE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  plate_number text,
  plate_not_available boolean NOT NULL DEFAULT false,
  vehicle_type text NOT NULL CHECK (
    vehicle_type IN (
      'Jeepney',
      'Modern Jeepney',
      'Tricycle',
      'Bus',
      'UV Express',
      'Multicab',
      'Taxi',
      'Other Public Utility Vehicle'
    )
  ),
  body_number text,
  vehicle_color text,
  vehicle_model text,
  operator_name text,
  route_info text,
  origin_municipality_id uuid REFERENCES public.municipalities(id) ON DELETE SET NULL,
  destination_municipality_id uuid REFERENCES public.municipalities(id) ON DELETE SET NULL,
  municipality_id uuid NOT NULL REFERENCES public.municipalities(id) ON DELETE RESTRICT,
  incident_location text NOT NULL,
  incident_latitude numeric(9, 6),
  incident_longitude numeric(9, 6),
  incident_date date NOT NULL,
  incident_time time,
  description text NOT NULL,
  actual_fare numeric(10, 2) CHECK (actual_fare IS NULL OR actual_fare >= 0),
  expected_fare numeric(10, 2) CHECK (expected_fare IS NULL OR expected_fare >= 0),
  additional_remarks text,
  is_confidential_identity boolean NOT NULL DEFAULT false,
  external_share_consent boolean NOT NULL DEFAULT false,
  submission_idempotency_key text,
  is_duplicate_flagged boolean NOT NULL DEFAULT false,
  complaint_status text NOT NULL DEFAULT 'Submitted to Pamasahe Tracker' CHECK (
    complaint_status IN (
      'Draft',
      'Submitted to Pamasahe Tracker',
      'Pending Initial Review',
      'Under Review',
      'Additional Information Required',
      'Referred to Appropriate Agency',
      'Acknowledged by Agency',
      'Under Agency Investigation',
      'Resolved',
      'Closed',
      'Rejected',
      'Withdrawn'
    )
  ),
  assigned_admin_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  admin_remarks text,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT chk_plate_or_not_available CHECK (
    plate_not_available = true
    OR (plate_number IS NOT NULL AND length(trim(plate_number)) >= 2)
  ),
  CONSTRAINT chk_vehicle_incident_date CHECK (incident_date <= (CURRENT_DATE + INTERVAL '1 day'))
);

-- 26. vehicle_report_categories
CREATE TABLE IF NOT EXISTS public.vehicle_report_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id uuid NOT NULL REFERENCES public.vehicle_reports(id) ON DELETE CASCADE,
  category_group text NOT NULL CHECK (
    category_group IN (
      'FARE VIOLATIONS',
      'DRIVER BEHAVIOR',
      'VEHICLE SAFETY',
      'TRANSPORTATION REGULATIONS',
      'OTHER'
    )
  ),
  category text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT uq_vehicle_report_category UNIQUE (report_id, category)
);

-- 27. vehicle_report_evidence
CREATE TABLE IF NOT EXISTS public.vehicle_report_evidence (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id uuid NOT NULL REFERENCES public.vehicle_reports(id) ON DELETE CASCADE,
  storage_path text NOT NULL UNIQUE,
  evidence_type text NOT NULL DEFAULT 'other_document' CHECK (
    evidence_type IN (
      'vehicle_photo',
      'license_plate_photo',
      'video_recording',
      'receipt',
      'other_document'
    )
  ),
  file_type text NOT NULL CHECK (
    file_type IN ('image/jpeg', 'image/png', 'image/webp', 'video/mp4')
  ),
  file_size_bytes integer NOT NULL CHECK (file_size_bytes > 0 AND file_size_bytes <= 26214400),
  original_filename text NOT NULL,
  uploaded_by uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

-- 28. government_agencies
CREATE TABLE IF NOT EXISTS public.government_agencies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_code text NOT NULL UNIQUE,
  agency_name text NOT NULL,
  jurisdiction text NOT NULL,
  categories_handled text[] NOT NULL DEFAULT '{}'::text[],
  official_website text NOT NULL,
  official_complaint_url text,
  verified_contact_information text NOT NULL,
  submission_instructions text NOT NULL,
  last_verified_at date NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

-- 29. agency_referrals
CREATE TABLE IF NOT EXISTS public.agency_referrals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id uuid NOT NULL REFERENCES public.vehicle_reports(id) ON DELETE CASCADE,
  agency_id uuid NOT NULL REFERENCES public.government_agencies(id) ON DELETE RESTRICT,
  referral_status text NOT NULL DEFAULT 'Prepared for Manual Submission' CHECK (
    referral_status IN (
      'Recommended',
      'Prepared for Manual Submission',
      'Submitted Externally by Reporter',
      'Referred by Administrator',
      'Acknowledged by Agency',
      'Under Agency Investigation',
      'Closed'
    )
  ),
  referral_date timestamptz,
  external_reference_number text,
  acknowledgment_date timestamptz,
  referral_notes text,
  created_by uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

-- 30. vehicle_report_status_logs
CREATE TABLE IF NOT EXISTS public.vehicle_report_status_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id uuid NOT NULL REFERENCES public.vehicle_reports(id) ON DELETE CASCADE,
  previous_status text,
  new_status text NOT NULL,
  remarks text,
  changed_by uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

-- Auto-generate reference number PT-OM-YYYY-NNNNNN & normalize plate number
CREATE OR REPLACE FUNCTION public.prepare_vehicle_report_before_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_seq bigint;
  v_recent_count integer;
BEGIN
  -- Rate limit check (max 10 vehicle reports/hour per user)
  SELECT count(*)
    INTO v_recent_count
    FROM public.vehicle_reports
   WHERE user_id = NEW.user_id
     AND created_at >= timezone('utc', now()) - INTERVAL '1 hour';

  IF v_recent_count >= 10 THEN
    RAISE EXCEPTION 'Rate limit exceeded: maximum 10 vehicle reports per hour allowed.'
      USING ERRCODE = 'P0001';
  END IF;

  IF NEW.plate_not_available = true THEN
    NEW.plate_number := NULL;
  ELSIF NEW.plate_number IS NOT NULL THEN
    NEW.plate_number := upper(regexp_replace(trim(NEW.plate_number), '\s+', ' ', 'g'));
  END IF;

  IF NULLIF(trim(COALESCE(NEW.reference_number, '')), '') IS NULL THEN
    v_seq := nextval('public.vehicle_report_seq');
    NEW.reference_number := format('PT-OM-%s-%s', to_char(timezone('utc', now()), 'YYYY'), lpad(v_seq::text, 6, '0'));
  END IF;

  -- Flag potential duplicate if same user & plate/location submitted within 24 hours
  IF NEW.plate_number IS NOT NULL THEN
    IF EXISTS (
      SELECT 1 FROM public.vehicle_reports vr
       WHERE vr.plate_number = NEW.plate_number
         AND vr.incident_date = NEW.incident_date
         AND vr.complaint_status <> 'Withdrawn'
    ) THEN
      NEW.is_duplicate_flagged := true;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_vehicle_report_before_insert ON public.vehicle_reports;
CREATE TRIGGER trg_vehicle_report_before_insert
  BEFORE INSERT ON public.vehicle_reports
  FOR EACH ROW EXECUTE FUNCTION public.prepare_vehicle_report_before_insert();

-- Indexes
CREATE INDEX IF NOT EXISTS idx_vehicle_reports_user ON public.vehicle_reports(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_vehicle_reports_plate ON public.vehicle_reports(plate_number) WHERE plate_number IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_vehicle_reports_status ON public.vehicle_reports(complaint_status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_vehicle_reports_muni ON public.vehicle_reports(municipality_id, created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS uq_vehicle_report_idempotency
  ON public.vehicle_reports(user_id, submission_idempotency_key)
  WHERE submission_idempotency_key IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_vehicle_categories_report ON public.vehicle_report_categories(report_id, category);
CREATE INDEX IF NOT EXISTS idx_vehicle_evidence_report ON public.vehicle_report_evidence(report_id);
CREATE INDEX IF NOT EXISTS idx_agency_referrals_report ON public.agency_referrals(report_id);
CREATE INDEX IF NOT EXISTS idx_vehicle_status_logs_report ON public.vehicle_report_status_logs(report_id, created_at DESC);

-- Updated_at triggers
DROP TRIGGER IF EXISTS trg_vehicle_reports_updated_at ON public.vehicle_reports;
CREATE TRIGGER trg_vehicle_reports_updated_at BEFORE UPDATE ON public.vehicle_reports FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_government_agencies_updated_at ON public.government_agencies;
CREATE TRIGGER trg_government_agencies_updated_at BEFORE UPDATE ON public.government_agencies FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_agency_referrals_updated_at ON public.agency_referrals;
CREATE TRIGGER trg_agency_referrals_updated_at BEFORE UPDATE ON public.agency_referrals FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
