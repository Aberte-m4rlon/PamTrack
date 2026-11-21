-- ============================================================================
-- 004_functions_and_triggers.sql
-- Pamasahe Tracker – Oriental Mindoro
-- Secure server-side functions: new-user provisioning, rate limiting,
-- report verification RPC, official fare publishing RPC, role updates,
-- notification deduplication, and fare matrix summary view.
-- ============================================================================

-- 1. Automatic profile + default commuter role on signup (never trusts metadata role)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.email, ''),
    COALESCE(NULLIF(trim(NEW.raw_user_meta_data ->> 'full_name'), ''), split_part(COALESCE(NEW.email, 'Commuter'), '@', 1))
  )
  ON CONFLICT (id) DO UPDATE
    SET email = EXCLUDED.email;

  INSERT INTO public.user_roles (user_id, role, reason)
  VALUES (NEW.id, 'commuter', 'Initial signup provisioning')
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 2. Deduplicated notification helper
CREATE OR REPLACE FUNCTION public.create_notification(
  p_user_id uuid,
  p_type public.notification_type,
  p_title text,
  p_message text,
  p_related_report_id uuid DEFAULT NULL,
  p_related_fare_id uuid DEFAULT NULL,
  p_dedupe_key text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
BEGIN
  INSERT INTO public.notifications (
    user_id, type, title, message, related_report_id, related_fare_id, dedupe_key
  )
  VALUES (
    p_user_id, p_type, p_title, p_message, p_related_report_id, p_related_fare_id, p_dedupe_key
  )
  ON CONFLICT (user_id, dedupe_key) WHERE dedupe_key IS NOT NULL
  DO NOTHING
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

-- 3. Rate limit check (BEFORE INSERT) + automatic submission notification (AFTER INSERT)
CREATE OR REPLACE FUNCTION public.check_fare_report_rate_limit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_recent_count integer;
  v_max_per_hour integer;
BEGIN
  SELECT COALESCE((value ->> 'max_reports_per_hour')::integer, 10)
    INTO v_max_per_hour
    FROM public.system_settings
   WHERE key = 'rate_limits';

  IF v_max_per_hour IS NULL THEN
    v_max_per_hour := 10;
  END IF;

  SELECT count(*)
    INTO v_recent_count
    FROM public.fare_reports
   WHERE reporter_id = NEW.reporter_id
     AND created_at >= timezone('utc', now()) - INTERVAL '1 hour';

  IF v_recent_count >= v_max_per_hour THEN
    RAISE EXCEPTION 'Rate limit exceeded: maximum % fare reports per hour allowed.', v_max_per_hour
      USING ERRCODE = 'P0001';
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.notify_fare_report_submitted()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.create_notification(
    NEW.reporter_id,
    'report_submitted',
    'Fare report received',
    format('Your fare report (PHP %s) has been queued for administrator review.', to_char(NEW.fare_paid, 'FM999990.00')),
    NEW.id,
    NULL,
    format('report-submitted-%s', NEW.id)
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_fare_report_before_insert ON public.fare_reports;
CREATE TRIGGER trg_fare_report_before_insert
  BEFORE INSERT ON public.fare_reports
  FOR EACH ROW EXECUTE FUNCTION public.check_fare_report_rate_limit();

DROP TRIGGER IF EXISTS trg_fare_report_after_insert ON public.fare_reports;
CREATE TRIGGER trg_fare_report_after_insert
  AFTER INSERT ON public.fare_reports
  FOR EACH ROW EXECUTE FUNCTION public.notify_fare_report_submitted();

-- 4. Administrator Fare Report Review & Verification RPC
-- Strictly prevents community estimate approvals from becoming official fares!
CREATE OR REPLACE FUNCTION public.review_fare_report(
  p_report_id uuid,
  p_new_status public.report_status,
  p_admin_feedback text DEFAULT NULL,
  p_flag_suspicious boolean DEFAULT false,
  p_issuing_authority text DEFAULT NULL,
  p_official_document_reference text DEFAULT NULL,
  p_source_url text DEFAULT NULL,
  p_effective_date date DEFAULT NULL
)
RETURNS public.fare_reports
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor uuid := auth.uid();
  v_actor_role public.app_role := public.current_user_role();
  v_report public.fare_reports;
  v_prev_status public.report_status;
  v_fare_id uuid;
  v_source_id uuid;
  v_notif_type public.notification_type;
  v_notif_title text;
  v_notif_msg text;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Forbidden: administrator access required.' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_report FROM public.fare_reports WHERE id = p_report_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Fare report not found.' USING ERRCODE = 'P0002';
  END IF;
  v_prev_status := v_report.status;

  -- Strict rule: verified_official requires real source reference + authority + effective date
  IF p_new_status = 'verified_official' THEN
    IF NULLIF(trim(COALESCE(p_issuing_authority, '')), '') IS NULL
       OR NULLIF(trim(COALESCE(p_official_document_reference, '')), '') IS NULL
       OR p_effective_date IS NULL THEN
      RAISE EXCEPTION 'Publishing an official fare requires issuing authority, official document reference, and effective date.'
        USING ERRCODE = '22023';
    END IF;

    INSERT INTO public.fare_sources (
      issuing_authority, document_reference, title, source_url, effective_date, created_by
    )
    VALUES (
      trim(p_issuing_authority),
      trim(p_official_document_reference),
      format('%s — %s', trim(p_issuing_authority), trim(p_official_document_reference)),
      NULLIF(trim(COALESCE(p_source_url, '')), ''),
      p_effective_date,
      v_actor
    )
    ON CONFLICT (issuing_authority, document_reference) DO UPDATE
      SET source_url = COALESCE(EXCLUDED.source_url, public.fare_sources.source_url)
    RETURNING id INTO v_source_id;

    INSERT INTO public.fare_records (
      route_id, origin_municipality_id, destination_municipality_id,
      transport_type_id, passenger_category, fare_amount, status,
      fare_source_id, issuing_authority, official_document_reference,
      source_url, effective_date, last_verified_at, verified_by, created_by, notes
    )
    VALUES (
      v_report.route_id, v_report.origin_municipality_id, v_report.destination_municipality_id,
      v_report.transport_type_id, v_report.passenger_category, v_report.fare_paid, 'verified_official',
      v_source_id, trim(p_issuing_authority), trim(p_official_document_reference),
      NULLIF(trim(COALESCE(p_source_url, '')), ''), p_effective_date, timezone('utc', now()), v_actor, v_actor,
      p_admin_feedback
    )
    RETURNING id INTO v_fare_id;

    v_notif_type := 'verification_completed';
    v_notif_title := 'Fare report verified as Official';
    v_notif_msg := format('Your reported fare (PHP %s) matched official reference %s and was published.', to_char(v_report.fare_paid, 'FM999990.00'), trim(p_official_document_reference));

  ELSIF p_new_status = 'approved_community_estimate' THEN
    -- Approving as a community estimate NEVER creates an official fare!
    INSERT INTO public.fare_records (
      route_id, origin_municipality_id, destination_municipality_id,
      transport_type_id, passenger_category, fare_amount, status,
      issuing_authority, last_verified_at, verified_by, created_by, notes
    )
    VALUES (
      v_report.route_id, v_report.origin_municipality_id, v_report.destination_municipality_id,
      v_report.transport_type_id, v_report.passenger_category, v_report.fare_paid, 'community_estimate',
      'Commuter Community Submission (Reviewed)', timezone('utc', now()), v_actor, v_actor,
      COALESCE(p_admin_feedback, 'Approved as unverified community estimate only; not an official fare order.')
    )
    RETURNING id INTO v_fare_id;

    v_notif_type := 'report_approved';
    v_notif_title := 'Report approved as Community Estimate';
    v_notif_msg := format('Your fare report (PHP %s) is now published as a Community Estimate.', to_char(v_report.fare_paid, 'FM999990.00'));

  ELSIF p_new_status IN ('rejected', 'disputed') THEN
    v_notif_type := 'report_rejected';
    v_notif_title := CASE WHEN p_new_status = 'disputed' THEN 'Fare report flagged as Disputed' ELSE 'Fare report rejected' END;
    v_notif_msg := COALESCE(NULLIF(trim(COALESCE(p_admin_feedback, '')), ''), 'Your fare report did not pass verification review.');
  ELSE
    v_notif_type := 'announcement';
    v_notif_title := 'Fare report status updated';
    v_notif_msg := format('Report status changed to %s.', p_new_status::text);
  END IF;

  UPDATE public.fare_reports
     SET status = p_new_status,
         is_flagged_suspicious = p_flag_suspicious,
         admin_feedback = COALESCE(p_admin_feedback, admin_feedback),
         reviewed_by = v_actor,
         reviewed_at = timezone('utc', now()),
         linked_fare_record_id = COALESCE(v_fare_id, linked_fare_record_id)
   WHERE id = p_report_id
  RETURNING * INTO v_report;

  INSERT INTO public.fare_verification_logs (
    fare_record_id, report_id, action, previous_status, new_status,
    new_amount, source_reference, reason, performed_by
  )
  VALUES (
    v_fare_id, p_report_id, 'review_fare_report', v_prev_status::text, p_new_status::text,
    v_report.fare_paid, p_official_document_reference, p_admin_feedback, v_actor
  );

  INSERT INTO public.audit_logs (
    actor_id, actor_role, action, entity_type, entity_id, old_values, new_values
  )
  VALUES (
    v_actor, v_actor_role, 'review_fare_report', 'fare_reports', p_report_id::text,
    jsonb_build_object('status', v_prev_status),
    jsonb_build_object(
      'status', p_new_status,
      'linked_fare_record_id', v_fare_id,
      'flagged_suspicious', p_flag_suspicious,
      'document_reference', p_official_document_reference
    )
  );

  PERFORM public.create_notification(
    v_report.reporter_id,
    v_notif_type,
    v_notif_title,
    v_notif_msg,
    v_report.id,
    v_fare_id,
    format('report-review-%s-%s', v_report.id, p_new_status::text)
  );

  RETURN v_report;
END;
$$;

-- 5. Publish or Update Official Fare Record RPC
CREATE OR REPLACE FUNCTION public.publish_official_fare(
  p_origin_municipality_id uuid,
  p_destination_municipality_id uuid,
  p_transport_type_id uuid,
  p_passenger_category public.passenger_category,
  p_fare_amount numeric,
  p_issuing_authority text,
  p_official_document_reference text,
  p_effective_date date,
  p_source_url text DEFAULT NULL,
  p_route_id uuid DEFAULT NULL,
  p_notes text DEFAULT NULL,
  p_existing_fare_id uuid DEFAULT NULL
)
RETURNS public.fare_records
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor uuid := auth.uid();
  v_actor_role public.app_role := public.current_user_role();
  v_source_id uuid;
  v_old_record public.fare_records;
  v_new_record public.fare_records;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Forbidden: administrator access required.' USING ERRCODE = '42501';
  END IF;

  IF NULLIF(trim(COALESCE(p_issuing_authority, '')), '') IS NULL
     OR NULLIF(trim(COALESCE(p_official_document_reference, '')), '') IS NULL
     OR p_effective_date IS NULL THEN
    RAISE EXCEPTION 'Official fare requires issuing authority, official document reference, and effective date.'
      USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.fare_sources (
    issuing_authority, document_reference, title, source_url, effective_date, created_by
  )
  VALUES (
    trim(p_issuing_authority),
    trim(p_official_document_reference),
    format('%s — %s', trim(p_issuing_authority), trim(p_official_document_reference)),
    NULLIF(trim(COALESCE(p_source_url, '')), ''),
    p_effective_date,
    v_actor
  )
  ON CONFLICT (issuing_authority, document_reference) DO UPDATE
    SET source_url = COALESCE(EXCLUDED.source_url, public.fare_sources.source_url),
        effective_date = EXCLUDED.effective_date
  RETURNING id INTO v_source_id;

  IF p_existing_fare_id IS NOT NULL THEN
    SELECT * INTO v_old_record FROM public.fare_records WHERE id = p_existing_fare_id FOR UPDATE;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Target fare record not found.' USING ERRCODE = 'P0002';
    END IF;

    UPDATE public.fare_records
       SET route_id = COALESCE(p_route_id, route_id),
           origin_municipality_id = p_origin_municipality_id,
           destination_municipality_id = p_destination_municipality_id,
           transport_type_id = p_transport_type_id,
           passenger_category = p_passenger_category,
           fare_amount = p_fare_amount,
           status = 'verified_official',
           fare_source_id = v_source_id,
           issuing_authority = trim(p_issuing_authority),
           official_document_reference = trim(p_official_document_reference),
           source_url = NULLIF(trim(COALESCE(p_source_url, '')), ''),
           effective_date = p_effective_date,
           last_verified_at = timezone('utc', now()),
           verified_by = v_actor,
           is_archived = false,
           notes = p_notes
     WHERE id = p_existing_fare_id
    RETURNING * INTO v_new_record;
  ELSE
    INSERT INTO public.fare_records (
      route_id, origin_municipality_id, destination_municipality_id,
      transport_type_id, passenger_category, fare_amount, status,
      fare_source_id, issuing_authority, official_document_reference,
      source_url, effective_date, last_verified_at, verified_by, created_by, notes
    )
    VALUES (
      p_route_id, p_origin_municipality_id, p_destination_municipality_id,
      p_transport_type_id, p_passenger_category, p_fare_amount, 'verified_official',
      v_source_id, trim(p_issuing_authority), trim(p_official_document_reference),
      NULLIF(trim(COALESCE(p_source_url, '')), ''), p_effective_date, timezone('utc', now()), v_actor, v_actor, p_notes
    )
    RETURNING * INTO v_new_record;
  END IF;

  INSERT INTO public.fare_verification_logs (
    fare_record_id, action, previous_status, new_status,
    previous_amount, new_amount, source_reference, reason, performed_by
  )
  VALUES (
    v_new_record.id,
    CASE WHEN p_existing_fare_id IS NULL THEN 'publish_official_fare' ELSE 'update_official_fare' END,
    v_old_record.status::text,
    'verified_official',
    v_old_record.fare_amount,
    v_new_record.fare_amount,
    trim(p_official_document_reference),
    p_notes,
    v_actor
  );

  INSERT INTO public.audit_logs (
    actor_id, actor_role, action, entity_type, entity_id, old_values, new_values
  )
  VALUES (
    v_actor,
    v_actor_role,
    CASE WHEN p_existing_fare_id IS NULL THEN 'publish_official_fare' ELSE 'update_official_fare' END,
    'fare_records',
    v_new_record.id::text,
    to_jsonb(v_old_record),
    to_jsonb(v_new_record)
  );

  -- Notify commuters who favorited this corridor (deduplicated)
  INSERT INTO public.notifications (user_id, type, title, message, related_fare_id, dedupe_key)
  SELECT DISTINCT
    f.user_id,
    'official_fare_updated'::public.notification_type,
    'Official fare updated',
    format('Verified official fare updated (PHP %s, Ref: %s).', to_char(v_new_record.fare_amount, 'FM999990.00'), trim(p_official_document_reference)),
    v_new_record.id,
    format('official-fare-%s-%s', v_new_record.id, to_char(timezone('utc', now()), 'YYYYMMDDHH24MI'))
  FROM public.favorites f
  WHERE f.origin_municipality_id = v_new_record.origin_municipality_id
    AND f.destination_municipality_id = v_new_record.destination_municipality_id
    AND (f.transport_type_id IS NULL OR f.transport_type_id = v_new_record.transport_type_id)
  ON CONFLICT (user_id, dedupe_key) WHERE dedupe_key IS NOT NULL DO NOTHING;

  RETURN v_new_record;
END;
$$;

-- 6. Super Administrator Role Management RPC (protects against self-lockout)
CREATE OR REPLACE FUNCTION public.update_user_role(
  p_target_user_id uuid,
  p_new_role public.app_role,
  p_reason text DEFAULT NULL
)
RETURNS public.user_roles
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor uuid := auth.uid();
  v_old_role public.app_role;
  v_super_admin_count integer;
  v_result public.user_roles;
BEGIN
  IF NOT public.is_super_admin() THEN
    RAISE EXCEPTION 'Forbidden: Super Administrator privileges required.' USING ERRCODE = '42501';
  END IF;

  IF p_new_role = 'guest' THEN
    RAISE EXCEPTION 'Cannot assign guest role to a registered user.' USING ERRCODE = '22023';
  END IF;

  SELECT role INTO v_old_role FROM public.user_roles WHERE user_id = p_target_user_id FOR UPDATE;

  IF v_old_role = 'super_administrator' AND p_new_role <> 'super_administrator' THEN
    SELECT count(*) INTO v_super_admin_count FROM public.user_roles WHERE role = 'super_administrator';
    IF v_super_admin_count <= 1 THEN
      RAISE EXCEPTION 'Cannot demote the last remaining Super Administrator.' USING ERRCODE = 'P0001';
    END IF;
  END IF;

  INSERT INTO public.user_roles (user_id, role, assigned_by, reason)
  VALUES (p_target_user_id, p_new_role, v_actor, p_reason)
  ON CONFLICT (user_id) DO UPDATE
    SET role = EXCLUDED.role,
        assigned_by = EXCLUDED.assigned_by,
        reason = EXCLUDED.reason,
        updated_at = timezone('utc', now())
  RETURNING * INTO v_result;

  INSERT INTO public.audit_logs (
    actor_id, actor_role, action, entity_type, entity_id, old_values, new_values
  )
  VALUES (
    v_actor,
    'super_administrator',
    'update_user_role',
    'user_roles',
    p_target_user_id::text,
    jsonb_build_object('role', v_old_role),
    jsonb_build_object('role', p_new_role, 'reason', p_reason)
  );

  RETURN v_result;
END;
$$;

-- 7. Consolidated public Fare Matrix view (preserves strict status separation)
CREATE OR REPLACE VIEW public.fare_matrix_view AS
SELECT
  fr.origin_municipality_id,
  om.name AS origin_name,
  fr.destination_municipality_id,
  dm.name AS destination_name,
  fr.transport_type_id,
  tt.name AS transport_type_name,
  fr.status,
  MAX(CASE WHEN fr.passenger_category = 'regular' THEN fr.fare_amount END) AS regular_fare,
  MAX(CASE WHEN fr.passenger_category = 'student' THEN fr.fare_amount END) AS student_fare,
  MAX(CASE WHEN fr.passenger_category = 'senior_citizen' THEN fr.fare_amount END) AS senior_fare,
  MAX(CASE WHEN fr.passenger_category = 'pwd' THEN fr.fare_amount END) AS pwd_fare,
  MAX(fr.issuing_authority) AS issuing_authority,
  MAX(fr.official_document_reference) AS official_document_reference,
  MAX(fr.source_url) AS source_url,
  MAX(fr.last_verified_at) AS last_verified_at,
  MAX(fr.updated_at) AS updated_at
FROM public.fare_records fr
JOIN public.municipalities om ON om.id = fr.origin_municipality_id
JOIN public.municipalities dm ON dm.id = fr.destination_municipality_id
JOIN public.transport_types tt ON tt.id = fr.transport_type_id
WHERE fr.is_archived = false AND fr.is_test_fixture = false
GROUP BY
  fr.origin_municipality_id, om.name,
  fr.destination_municipality_id, dm.name,
  fr.transport_type_id, tt.name,
  fr.status;
