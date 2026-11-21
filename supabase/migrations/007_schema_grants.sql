-- ============================================================================
-- 007_schema_grants.sql
-- Pamasahe Tracker – Oriental Mindoro
-- Explicit PostgreSQL role privileges (defense-in-depth alongside RLS).
-- ============================================================================

GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;

-- Public read-only catalog & verified fare tables for anonymous visitors
GRANT SELECT ON
  public.municipalities,
  public.transport_types,
  public.transport_operators,
  public.routes,
  public.route_stops,
  public.fare_sources,
  public.fare_records,
  public.fare_verification_logs,
  public.system_settings,
  public.fare_matrix_view
TO anon;

-- Authenticated users receive table access strictly gated by 003_rls_policies.sql
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;

GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;

GRANT EXECUTE ON FUNCTION
  public.current_user_role(),
  public.is_admin(),
  public.is_super_admin(),
  public.is_operator(),
  public.review_fare_report(uuid, public.report_status, text, boolean, text, text, text, date),
  public.publish_official_fare(uuid, uuid, uuid, public.passenger_category, numeric, text, text, date, text, uuid, text, uuid),
  public.update_user_role(uuid, public.app_role, text)
TO authenticated;

GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO service_role;
