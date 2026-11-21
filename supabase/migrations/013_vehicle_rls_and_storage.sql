-- ============================================================================
-- 013_vehicle_rls_and_storage.sql
-- Pamasahe Tracker – Oriental Mindoro
-- Strict RLS, Private Evidence Storage Bucket ('vehicle-evidence'),
-- Admin Status Transition RPC, and Notification Triggers.
-- ============================================================================

-- Enable RLS on all 6 new tables
ALTER TABLE public.vehicle_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicle_report_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicle_report_evidence ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.government_agencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agency_referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicle_report_status_logs ENABLE ROW LEVEL SECURITY;

-- 1. vehicle_reports (STRICT PRIVATE: only reporter or administrator; NO public blacklist)
DROP POLICY IF EXISTS "vehicle_reports_select_owner_or_admin" ON public.vehicle_reports;
CREATE POLICY "vehicle_reports_select_owner_or_admin"
  ON public.vehicle_reports FOR SELECT
  USING (user_id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS "vehicle_reports_insert_authenticated" ON public.vehicle_reports;
CREATE POLICY "vehicle_reports_insert_authenticated"
  ON public.vehicle_reports FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND user_id = auth.uid()
    AND assigned_admin_id IS NULL
    AND complaint_status IN ('Draft', 'Submitted to Pamasahe Tracker')
  );

DROP POLICY IF EXISTS "vehicle_reports_update_owner_eligible" ON public.vehicle_reports;
CREATE POLICY "vehicle_reports_update_owner_eligible"
  ON public.vehicle_reports FOR UPDATE
  USING (
    user_id = auth.uid()
    AND complaint_status IN (
      'Draft',
      'Submitted to Pamasahe Tracker',
      'Pending Initial Review',
      'Additional Information Required'
    )
  )
  WITH CHECK (
    user_id = auth.uid()
    AND assigned_admin_id IS NULL
    AND complaint_status IN (
      'Draft',
      'Submitted to Pamasahe Tracker',
      'Pending Initial Review',
      'Additional Information Required',
      'Withdrawn'
    )
  );

DROP POLICY IF EXISTS "vehicle_reports_admin_update" ON public.vehicle_reports;
CREATE POLICY "vehicle_reports_admin_update"
  ON public.vehicle_reports FOR UPDATE
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- 2. vehicle_report_categories
DROP POLICY IF EXISTS "vehicle_categories_select_owner_or_admin" ON public.vehicle_report_categories;
CREATE POLICY "vehicle_categories_select_owner_or_admin"
  ON public.vehicle_report_categories FOR SELECT
  USING (
    public.is_admin()
    OR EXISTS (
      SELECT 1 FROM public.vehicle_reports vr
      WHERE vr.id = vehicle_report_categories.report_id AND vr.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "vehicle_categories_insert_owner" ON public.vehicle_report_categories;
CREATE POLICY "vehicle_categories_insert_owner"
  ON public.vehicle_report_categories FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.vehicle_reports vr
      WHERE vr.id = vehicle_report_categories.report_id AND vr.user_id = auth.uid()
    )
  );

-- 3. vehicle_report_evidence
DROP POLICY IF EXISTS "vehicle_evidence_select_owner_or_admin" ON public.vehicle_report_evidence;
CREATE POLICY "vehicle_evidence_select_owner_or_admin"
  ON public.vehicle_report_evidence FOR SELECT
  USING (
    uploaded_by = auth.uid()
    OR public.is_admin()
    OR EXISTS (
      SELECT 1 FROM public.vehicle_reports vr
      WHERE vr.id = vehicle_report_evidence.report_id AND vr.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "vehicle_evidence_insert_owner" ON public.vehicle_report_evidence;
CREATE POLICY "vehicle_evidence_insert_owner"
  ON public.vehicle_report_evidence FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND uploaded_by = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.vehicle_reports vr
      WHERE vr.id = vehicle_report_evidence.report_id AND vr.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "vehicle_evidence_delete_owner_or_admin" ON public.vehicle_report_evidence;
CREATE POLICY "vehicle_evidence_delete_owner_or_admin"
  ON public.vehicle_report_evidence FOR DELETE
  USING (
    public.is_admin()
    OR (
      uploaded_by = auth.uid()
      AND EXISTS (
        SELECT 1 FROM public.vehicle_reports vr
        WHERE vr.id = vehicle_report_evidence.report_id
          AND vr.complaint_status IN ('Draft', 'Submitted to Pamasahe Tracker', 'Additional Information Required')
      )
    )
  );

-- 4. government_agencies (public read active agencies; admin manage)
DROP POLICY IF EXISTS "government_agencies_public_select" ON public.government_agencies;
CREATE POLICY "government_agencies_public_select"
  ON public.government_agencies FOR SELECT
  USING (is_active = true OR public.is_admin());

DROP POLICY IF EXISTS "government_agencies_admin_write" ON public.government_agencies;
CREATE POLICY "government_agencies_admin_write"
  ON public.government_agencies FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- 5. agency_referrals (owner read own referrals; admin manage)
DROP POLICY IF EXISTS "agency_referrals_select_owner_or_admin" ON public.agency_referrals;
CREATE POLICY "agency_referrals_select_owner_or_admin"
  ON public.agency_referrals FOR SELECT
  USING (
    public.is_admin()
    OR EXISTS (
      SELECT 1 FROM public.vehicle_reports vr
      WHERE vr.id = agency_referrals.report_id AND vr.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "agency_referrals_admin_or_consented_owner_insert" ON public.agency_referrals;
CREATE POLICY "agency_referrals_admin_or_consented_owner_insert"
  ON public.agency_referrals FOR INSERT
  WITH CHECK (
    public.is_admin()
    OR (
      auth.uid() IS NOT NULL
      AND created_by = auth.uid()
      AND referral_status IN ('Recommended', 'Prepared for Manual Submission', 'Submitted Externally by Reporter')
      AND EXISTS (
        SELECT 1 FROM public.vehicle_reports vr
        WHERE vr.id = agency_referrals.report_id
          AND vr.user_id = auth.uid()
          AND vr.external_share_consent = true
      )
    )
  );

DROP POLICY IF EXISTS "agency_referrals_admin_update" ON public.agency_referrals;
CREATE POLICY "agency_referrals_admin_update"
  ON public.agency_referrals FOR UPDATE
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- 6. vehicle_report_status_logs (owner read; admin + system triggers write)
DROP POLICY IF EXISTS "vehicle_status_logs_select_owner_or_admin" ON public.vehicle_report_status_logs;
CREATE POLICY "vehicle_status_logs_select_owner_or_admin"
  ON public.vehicle_report_status_logs FOR SELECT
  USING (
    public.is_admin()
    OR EXISTS (
      SELECT 1 FROM public.vehicle_reports vr
      WHERE vr.id = vehicle_report_status_logs.report_id AND vr.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "vehicle_status_logs_insert_authenticated" ON public.vehicle_report_status_logs;
CREATE POLICY "vehicle_status_logs_insert_authenticated"
  ON public.vehicle_report_status_logs FOR INSERT
  WITH CHECK (
    public.is_admin()
    OR (
      changed_by = auth.uid()
      AND EXISTS (
        SELECT 1 FROM public.vehicle_reports vr
        WHERE vr.id = vehicle_report_status_logs.report_id AND vr.user_id = auth.uid()
      )
    )
  );

-- Private Storage bucket for vehicle-evidence (JPG, PNG, WEBP, MP4 up to 25MB)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'vehicle-evidence',
  'vehicle-evidence',
  false,
  26214400,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'video/mp4']
)
ON CONFLICT (id) DO UPDATE
  SET public = false,
      file_size_limit = 26214400,
      allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'video/mp4'];

DROP POLICY IF EXISTS "vehicle_evidence_upload_own" ON storage.objects;
CREATE POLICY "vehicle_evidence_upload_own"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'vehicle-evidence'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "vehicle_evidence_read_owner_or_admin" ON storage.objects;
CREATE POLICY "vehicle_evidence_read_owner_or_admin"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'vehicle-evidence'
    AND (
      (storage.foldername(name))[1] = auth.uid()::text
      OR public.is_admin()
    )
  );

DROP POLICY IF EXISTS "vehicle_evidence_delete_owner_or_admin" ON storage.objects;
CREATE POLICY "vehicle_evidence_delete_owner_or_admin"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'vehicle-evidence'
    AND (
      (storage.foldername(name))[1] = auth.uid()::text
      OR public.is_admin()
    )
  );

-- Automatic status logging + notifications trigger
CREATE OR REPLACE FUNCTION public.handle_vehicle_report_audit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.vehicle_report_status_logs (
      report_id, previous_status, new_status, remarks, changed_by
    )
    VALUES (
      NEW.id, NULL, NEW.complaint_status, 'Initial submission recorded in Pamasahe Tracker.', NEW.user_id
    );

    IF NEW.complaint_status <> 'Draft' THEN
      PERFORM public.create_notification(
        NEW.user_id,
        'report_submitted',
        format('Vehicle report %s received', NEW.reference_number),
        format('Reported %s incident logged under reference %s for initial review.', NEW.vehicle_type, NEW.reference_number),
        NULL,
        NULL,
        format('veh-sub-%s', NEW.id)
      );
    END IF;
  ELSIF TG_OP = 'UPDATE' AND NEW.complaint_status IS DISTINCT FROM OLD.complaint_status THEN
    INSERT INTO public.vehicle_report_status_logs (
      report_id, previous_status, new_status, remarks, changed_by
    )
    VALUES (
      NEW.id, OLD.complaint_status, NEW.complaint_status, NEW.admin_remarks, COALESCE(auth.uid(), NEW.user_id)
    );

    PERFORM public.create_notification(
      NEW.user_id,
      CASE
        WHEN NEW.complaint_status IN ('Resolved', 'Closed') THEN 'report_approved'::public.notification_type
        WHEN NEW.complaint_status = 'Rejected' THEN 'report_rejected'::public.notification_type
        ELSE 'announcement'::public.notification_type
      END,
      format('Report %s status updated', NEW.reference_number),
      format('Complaint %s moved to status: %s.', NEW.reference_number, NEW.complaint_status),
      NULL,
      NULL,
      format('veh-stat-%s-%s', NEW.id, NEW.complaint_status)
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_vehicle_report_audit ON public.vehicle_reports;
CREATE TRIGGER trg_vehicle_report_audit
  AFTER INSERT OR UPDATE ON public.vehicle_reports
  FOR EACH ROW EXECUTE FUNCTION public.handle_vehicle_report_audit();

-- Administrator status transition + audit log RPC
-- Prevents setting 'Acknowledged by Agency' or 'Under Agency Investigation' without verified confirmation!
CREATE OR REPLACE FUNCTION public.admin_update_vehicle_report(
  p_report_id uuid,
  p_new_status text,
  p_admin_remarks text DEFAULT NULL,
  p_assign_to_me boolean DEFAULT true,
  p_agency_id uuid DEFAULT NULL,
  p_referral_status text DEFAULT NULL,
  p_external_reference text DEFAULT NULL,
  p_referral_notes text DEFAULT NULL
)
RETURNS public.vehicle_reports
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor uuid := auth.uid();
  v_actor_role public.app_role := public.current_user_role();
  v_report public.vehicle_reports;
  v_old_status text;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Forbidden: administrator access required.' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_report FROM public.vehicle_reports WHERE id = p_report_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Vehicle report not found.' USING ERRCODE = 'P0002';
  END IF;
  v_old_status := v_report.complaint_status;

  IF p_new_status IN ('Acknowledged by Agency', 'Under Agency Investigation')
     AND NULLIF(trim(COALESCE(p_external_reference, '')), '') IS NULL
     AND NOT EXISTS (
       SELECT 1 FROM public.agency_referrals ar
        WHERE ar.report_id = p_report_id
          AND NULLIF(trim(COALESCE(ar.external_reference_number, '')), '') IS NOT NULL
     ) THEN
    RAISE EXCEPTION 'Marking a complaint as Acknowledged by Agency or Under Agency Investigation requires a verified external agency acknowledgment reference.'
      USING ERRCODE = '22023';
  END IF;

  UPDATE public.vehicle_reports
     SET complaint_status = p_new_status,
         admin_remarks = COALESCE(p_admin_remarks, admin_remarks),
         assigned_admin_id = CASE WHEN p_assign_to_me THEN v_actor ELSE assigned_admin_id END
   WHERE id = p_report_id
  RETURNING * INTO v_report;

  IF p_agency_id IS NOT NULL THEN
    INSERT INTO public.agency_referrals (
      report_id, agency_id, referral_status, referral_date,
      external_reference_number, acknowledgment_date, referral_notes, created_by
    )
    VALUES (
      p_report_id,
      p_agency_id,
      COALESCE(p_referral_status, 'Referred by Administrator'),
      timezone('utc', now()),
      NULLIF(trim(COALESCE(p_external_reference, '')), ''),
      CASE WHEN NULLIF(trim(COALESCE(p_external_reference, '')), '') IS NOT NULL THEN timezone('utc', now()) ELSE NULL END,
      p_referral_notes,
      v_actor
    );
  END IF;

  INSERT INTO public.audit_logs (
    actor_id, actor_role, action, entity_type, entity_id, old_values, new_values
  )
  VALUES (
    v_actor, v_actor_role, 'admin_update_vehicle_report', 'vehicle_reports', p_report_id::text,
    jsonb_build_object('complaint_status', v_old_status),
    jsonb_build_object(
      'complaint_status', p_new_status,
      'agency_id', p_agency_id,
      'external_reference', p_external_reference
    )
  );

  RETURN v_report;
END;
$$;

-- Grants
GRANT SELECT ON public.government_agencies TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON
  public.vehicle_reports,
  public.vehicle_report_categories,
  public.vehicle_report_evidence,
  public.government_agencies,
  public.agency_referrals,
  public.vehicle_report_status_logs
TO authenticated;
GRANT ALL ON
  public.vehicle_reports,
  public.vehicle_report_categories,
  public.vehicle_report_evidence,
  public.government_agencies,
  public.agency_referrals,
  public.vehicle_report_status_logs
TO service_role;
GRANT USAGE, SELECT ON SEQUENCE public.vehicle_report_seq TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_update_vehicle_report(uuid, text, text, boolean, uuid, text, text, text) TO authenticated;
