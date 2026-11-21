# Setup Documentation – Pamasahe Tracker (Oriental Mindoro)

## 1. Prerequisites

- **Node.js** >= 20 LTS (`v22.18.0` verified)
- **npm** >= 10
- **Supabase Project** (free or paid tier at https://supabase.com) or local Supabase CLI + Docker

---

## 2. Frontend Setup

```bash
npm install
cp .env.example .env
```

Update `.env`:

```env
VITE_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_PUBLIC_KEY
VITE_OSRM_BASE_URL=https://router.project-osrm.org
```

> **Note:** Never place `SUPABASE_SERVICE_ROLE_KEY` in any `VITE_*` variable or frontend file.

---

## 3. Supabase Database Migration Setup

Execute the SQL migration files in strict numerical order in the Supabase **SQL Editor** (or via `supabase db push` if using the Supabase CLI):

1. `supabase/migrations/001_extensions_and_enums.sql`
2. `supabase/migrations/002_core_tables.sql` (creates all 16 core tables + indexes + triggers)
3. `supabase/migrations/003_rls_policies.sql` (enables RLS + strict role policies on all 16 tables)
4. `supabase/migrations/004_functions_and_triggers.sql` (signup provisioning, rate limits, `review_fare_report`, `publish_official_fare`, `update_user_role`, `fare_matrix_view`)
5. `supabase/migrations/005_storage_and_realtime.sql` (private `fare-evidence` bucket, 5MB & MIME restrictions, Storage RLS, Realtime publication)
6. `supabase/migrations/006_seed_reference_data.sql` (15 Oriental Mindoro municipalities/city with verified coordinates, 5 transport modes, statutory RA 11314/9994/10754 source references, default `system_settings`)
7. `supabase/migrations/007_schema_grants.sql` (explicit PostgreSQL role grants for `anon`, `authenticated`, and `service_role`)
8. `supabase/migrations/008_seed_verified_community_baselines.sql` (optional grounded `community_estimate` reference baselines for Calapan City, Puerto Galera, and Pinamalayan corridors — never falsely marked `verified_official`)
9. `supabase/migrations/009_gps_trips_safety_tables.sql` (adds `transport_stops`, `user_location_preferences`, `user_location_sessions`, `trip_records`, `trip_location_points`, `trusted_contacts`, `location_sharing_sessions`, `safety_reports`, and trip/safety notification types)
10. `supabase/migrations/010_gps_rls_and_functions.sql` (enforces strict owner-only GPS/location RLS, `delete_my_location_history()`, `get_shared_trip_status()`, and privacy-preserving `get_admin_aggregated_analytics()`)
11. `supabase/migrations/011_seed_verified_transport_stops.sql` (seeds 5 verified real-world Oriental Mindoro port and terminal coordinates)
12. `supabase/migrations/012_vehicle_reporting_tables.sql` (creates `vehicle_reports`, `vehicle_report_categories`, `vehicle_report_evidence`, `government_agencies`, `agency_referrals`, `vehicle_report_status_logs`, rate limits, idempotency protection, and reference generation `PT-OM-YYYY-NNNNNN`)
13. `supabase/migrations/013_vehicle_rls_and_storage.sql` (enables strict owner/admin RLS across all Phase 3 tables, creates private 25MB `vehicle-evidence` Storage bucket, status audit trigger, and verified agency status RPC `admin_update_vehicle_report`)
14. `supabase/migrations/014_seed_government_agencies.sql` (seeds verified Oriental Mindoro reporting destinations: LTFRB, LTO, Oriental Mindoro LGU / Tricycle Regulatory Boards, and PNP HPG)

### Optional Staging / QA Test Fixtures
- Do **NOT** execute `supabase/seed_test_fixtures.sql` in production. It contains synthetic `[TEST FIXTURE]` data flagged with `is_test_fixture = true` for isolated staging checks only.

### Optional Edge Functions
Deploy Edge Functions via Supabase CLI:
```bash
supabase functions deploy verify-fare-report
supabase functions deploy compute-route-osrm
```

---

## 4. Verification & Testing

```bash
npm run typecheck
npm test
npm run build
```

You can also run `supabase/tests/rls_verification.sql` in a staging Postgres/Supabase SQL Editor to verify RLS enablement, 15-municipality seeding, and the official-fare source constraint.
