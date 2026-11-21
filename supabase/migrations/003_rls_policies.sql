-- ============================================================================
-- 003_rls_policies.sql
-- Pamasahe Tracker – Oriental Mindoro
-- Strict Row Level Security across all 16 tables + helper role functions.
-- ============================================================================

-- Helper security-definer functions for role checks
CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS public.app_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT ur.role FROM public.user_roles ur WHERE ur.user_id = auth.uid()),
    CASE WHEN auth.uid() IS NULL THEN 'guest'::public.app_role ELSE 'commuter'::public.app_role END
  );
$$;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.current_user_role() IN ('administrator', 'super_administrator');
$$;

CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.current_user_role() = 'super_administrator';
$$;

CREATE OR REPLACE FUNCTION public.is_operator()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.current_user_role() IN ('transport_operator', 'administrator', 'super_administrator');
$$;

-- Enable RLS on every table
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.municipalities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transport_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transport_operators ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.routes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.route_stops ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fare_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fare_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fare_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fare_report_evidence ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fare_verification_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

-- 1. profiles
CREATE POLICY "profiles_select_self_or_admin"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id OR public.is_admin());

CREATE POLICY "profiles_update_self"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "profiles_admin_update_active"
  ON public.profiles FOR UPDATE
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- 2. user_roles (users may read own role; ONLY super_administrator can read all or modify via RPC/policy)
CREATE POLICY "user_roles_select_own_or_admin"
  ON public.user_roles FOR SELECT
  USING (auth.uid() = user_id OR public.is_admin());

CREATE POLICY "user_roles_super_admin_insert"
  ON public.user_roles FOR INSERT
  WITH CHECK (public.is_super_admin());

CREATE POLICY "user_roles_super_admin_update"
  ON public.user_roles FOR UPDATE
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

CREATE POLICY "user_roles_super_admin_delete"
  ON public.user_roles FOR DELETE
  USING (public.is_super_admin());

-- 3. municipalities (public read active; admin manage)
CREATE POLICY "municipalities_public_select"
  ON public.municipalities FOR SELECT
  USING (is_active = true OR public.is_admin());

CREATE POLICY "municipalities_admin_write"
  ON public.municipalities FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- 4. transport_types (public read active; admin manage)
CREATE POLICY "transport_types_public_select"
  ON public.transport_types FOR SELECT
  USING (is_active = true OR public.is_admin());

CREATE POLICY "transport_types_admin_write"
  ON public.transport_types FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- 5. transport_operators
CREATE POLICY "operators_public_read_verified"
  ON public.transport_operators FOR SELECT
  USING (
    (is_active = true AND verification_status = 'verified')
    OR owner_user_id = auth.uid()
    OR public.is_admin()
  );

CREATE POLICY "operators_owner_insert"
  ON public.transport_operators FOR INSERT
  WITH CHECK (
    (public.is_operator() AND owner_user_id = auth.uid() AND verification_status = 'pending')
    OR public.is_admin()
  );

CREATE POLICY "operators_owner_update"
  ON public.transport_operators FOR UPDATE
  USING (
    (owner_user_id = auth.uid() AND public.is_operator())
    OR public.is_admin()
  )
  WITH CHECK (
    (owner_user_id = auth.uid() AND public.is_operator() AND verification_status IN ('pending', 'verified'))
    OR public.is_admin()
  );

CREATE POLICY "operators_admin_delete"
  ON public.transport_operators FOR DELETE
  USING (public.is_admin());

-- 6. routes (public read active; admin manage)
CREATE POLICY "routes_public_select"
  ON public.routes FOR SELECT
  USING (is_active = true OR public.is_admin());

CREATE POLICY "routes_admin_write"
  ON public.routes FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- 7. route_stops
CREATE POLICY "route_stops_public_select"
  ON public.route_stops FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.routes r
      WHERE r.id = route_stops.route_id AND (r.is_active = true OR public.is_admin())
    )
  );

CREATE POLICY "route_stops_admin_write"
  ON public.route_stops FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- 8. fare_sources (public read; admin write, operator can propose/insert documentation when authorized)
CREATE POLICY "fare_sources_public_select"
  ON public.fare_sources FOR SELECT
  USING (true);

CREATE POLICY "fare_sources_admin_write"
  ON public.fare_sources FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- 9. fare_records (public read non-archived non-test; admin manage)
CREATE POLICY "fare_records_public_select"
  ON public.fare_records FOR SELECT
  USING ((is_archived = false AND is_test_fixture = false) OR public.is_admin());

CREATE POLICY "fare_records_admin_write"
  ON public.fare_records FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- 10. fare_reports (strict privacy: reporter sees own, operators see reports tied to their operator record, admins see all)
CREATE POLICY "fare_reports_select_authorized"
  ON public.fare_reports FOR SELECT
  USING (
    reporter_id = auth.uid()
    OR public.is_admin()
    OR (
      public.is_operator() AND EXISTS (
        SELECT 1 FROM public.transport_operators op
        WHERE op.id = fare_reports.operator_id AND op.owner_user_id = auth.uid()
      )
    )
  );

CREATE POLICY "fare_reports_insert_authenticated"
  ON public.fare_reports FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND reporter_id = auth.uid()
    AND status = 'pending'
    AND reviewed_by IS NULL
    AND linked_fare_record_id IS NULL
  );

CREATE POLICY "fare_reports_update_own_pending"
  ON public.fare_reports FOR UPDATE
  USING (
    reporter_id = auth.uid()
    AND status = 'pending'
  )
  WITH CHECK (
    reporter_id = auth.uid()
    AND status = 'pending'
    AND reviewed_by IS NULL
    AND linked_fare_record_id IS NULL
  );

CREATE POLICY "fare_reports_admin_update"
  ON public.fare_reports FOR UPDATE
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "fare_reports_admin_delete"
  ON public.fare_reports FOR DELETE
  USING (public.is_admin());

-- 11. fare_report_evidence
CREATE POLICY "fare_evidence_select_owner_or_admin"
  ON public.fare_report_evidence FOR SELECT
  USING (
    uploaded_by = auth.uid()
    OR public.is_admin()
    OR EXISTS (
      SELECT 1 FROM public.fare_reports fr
      WHERE fr.id = fare_report_evidence.report_id AND fr.reporter_id = auth.uid()
    )
  );

CREATE POLICY "fare_evidence_insert_owner"
  ON public.fare_report_evidence FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND uploaded_by = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.fare_reports fr
      WHERE fr.id = fare_report_evidence.report_id
        AND fr.reporter_id = auth.uid()
        AND fr.status IN ('pending', 'under_review')
    )
  );

CREATE POLICY "fare_evidence_delete_owner_pending_or_admin"
  ON public.fare_report_evidence FOR DELETE
  USING (
    public.is_admin()
    OR (
      uploaded_by = auth.uid()
      AND EXISTS (
        SELECT 1 FROM public.fare_reports fr
        WHERE fr.id = fare_report_evidence.report_id AND fr.status = 'pending'
      )
    )
  );

-- 12. fare_verification_logs (public read transparency for verified fares? Restricted to authenticated/admin or public read without PII - admins write via RPC)
CREATE POLICY "fare_verification_logs_read_authenticated_or_admin"
  ON public.fare_verification_logs FOR SELECT
  USING (
    public.is_admin()
    OR fare_record_id IS NOT NULL
    OR EXISTS (
      SELECT 1 FROM public.fare_reports fr
      WHERE fr.id = fare_verification_logs.report_id AND fr.reporter_id = auth.uid()
    )
  );

CREATE POLICY "fare_verification_logs_admin_insert"
  ON public.fare_verification_logs FOR INSERT
  WITH CHECK (public.is_admin() AND performed_by = auth.uid());

-- 13. favorites (strict owner CRUD)
CREATE POLICY "favorites_owner_all"
  ON public.favorites FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- 14. notifications (strict owner read/mark-read; admins can insert announcements)
CREATE POLICY "notifications_owner_select"
  ON public.notifications FOR SELECT
  USING (user_id = auth.uid() OR public.is_admin());

CREATE POLICY "notifications_owner_update_read"
  ON public.notifications FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "notifications_admin_insert"
  ON public.notifications FOR INSERT
  WITH CHECK (public.is_admin());

-- 15. audit_logs (admins read; super_admins read all; inserts via server RPC / triggers)
CREATE POLICY "audit_logs_admin_select"
  ON public.audit_logs FOR SELECT
  USING (public.is_admin());

CREATE POLICY "audit_logs_admin_insert"
  ON public.audit_logs FOR INSERT
  WITH CHECK (public.is_admin());

-- 16. system_settings (safe public non-sensitive read; ONLY super_administrator can write)
CREATE POLICY "system_settings_select"
  ON public.system_settings FOR SELECT
  USING (true);

CREATE POLICY "system_settings_super_admin_write"
  ON public.system_settings FOR ALL
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());
