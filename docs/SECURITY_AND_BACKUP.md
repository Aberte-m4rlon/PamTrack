# Security Checklist & Database Backup Recommendations

## Production Security Checklist

- [x] **No Service Role in Frontend**: Only `VITE_SUPABASE_ANON_KEY` is referenced by Vite browser code.
- [x] **RLS Enabled on All 16 Tables**: Every table enforces row-level policies via `003_rls_policies.sql`.
- [x] **Role Escalation Prevention**: `handle_new_user()` always provisions `'commuter'` regardless of signup metadata; `user_roles` updates require `super_administrator` + `update_user_role()` RPC (with last-super-admin lockout protection).
- [x] **Official Fare Integrity**: Database constraint `chk_official_fare_requires_verification` and RPCs `review_fare_report` / `publish_official_fare` reject official fares missing authority, document reference, and effective date.
- [x] **Community Estimate Isolation**: Approving community estimates creates `community_estimate` rows only.
- [x] **Private Evidence Storage**: `fare-evidence` bucket is private (`public = false`), capped at 5 MB, restricted to `image/jpeg`, `image/png`, `image/webp`, `application/pdf`, and served only via short-lived signed URLs to the owner or administrators.
- [x] **Submission Rate Limiting**: Database trigger `trg_fare_report_before_insert` enforces `rate_limits.max_reports_per_hour` from `system_settings`.
- [x] **Security Headers**: `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, and `Referrer-Policy` configured in `vercel.json` and `netlify.toml`.
- [ ] **Enable Supabase MFA** for all `administrator` and `super_administrator` accounts in production.
- [ ] **Configure Custom SMTP** in Supabase Auth for reliable email verification & password resets.

---

## Database Backup & Recovery Recommendations

1. **Automated Daily Backups (Supabase Pro+)**: Enable daily automated snapshots and Point-in-Time Recovery (PITR) for production databases.
2. **Scheduled Logical Exports (`pg_dump`)**: Run weekly encrypted schema + data backups (excluding temp caches) into secure off-site storage:
   ```bash
   pg_dump "$SUPABASE_DB_URL" --format=custom --no-owner --file="pamtrack-$(date +%F).dump"
   ```
3. **Storage Bucket Replication**: Periodically sync critical verified official tariff documents and `fare-evidence` records to encrypted archival object storage.
4. **Quarterly Restore Drills**: Test restoring a backup into a staging database and run `supabase/tests/rls_verification.sql` to verify constraints and RLS integrity.
