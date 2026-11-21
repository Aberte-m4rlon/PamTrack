# Deployment Guide – Pamasahe Tracker (Oriental Mindoro)

## 1. Backend Deployment (Supabase)

1. Create a production Supabase project in the closest Asia-Pacific region (e.g., `ap-southeast-1` Singapore).
2. Under **Authentication → URL Configuration**:
   - Set **Site URL** to your production domain (e.g., `https://pamasahetracker.vercel.app`).
   - Add Redirect URLs: `https://pamasahetracker.vercel.app/login` and `https://pamasahetracker.vercel.app/reset-password`.
3. Enable **Email Confirmations** under **Authentication → Providers → Email**.
4. Run migrations `001` through `007` in order.
5. Verify in **Database → Replication** that `notifications`, `fare_records`, and `fare_reports` are active in `supabase_realtime`.
6. Verify in **Storage** that `fare-evidence` is **Private** (`public = false`) with 5 MB limit.

---

## 2. Frontend Deployment (Vercel or Netlify)

### Option A: Vercel (Recommended)
1. Push repository to GitHub/GitLab.
2. Import project in Vercel (uses included `vercel.json` SPA rewrite + security headers).
3. Set Build Command: `npm run build`, Output Directory: `dist`.
4. Add Environment Variables:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `VITE_OSRM_BASE_URL` (optional; defaults to `https://router.project-osrm.org`; consider hosting a dedicated Philippines OSRM container for high-traffic production SLAs).
5. Deploy.

### Option B: Netlify
1. Connect repository to Netlify (uses included `netlify.toml` SPA redirects & headers).
2. Add the same `VITE_*` environment variables in Site Settings → Environment Variables.
3. Trigger build & deploy.

---

## 3. Required External Data & API Keys Before Full Go-Live

| Item | Purpose | Status |
| --- | --- | --- |
| `VITE_SUPABASE_URL` & `VITE_SUPABASE_ANON_KEY` | Live PostgreSQL, Auth, Storage, Realtime | Configured per deployment in `.env` / host env |
| Official LTFRB Region IV-B / LGU Ordinances | Authoritative point-to-point tariffs | Entered via Admin Fare Management with document references |
| Dedicated OSRM Endpoint (`VITE_OSRM_BASE_URL`) | High-availability Philippines driving route calculation | Defaults to public OSRM; replace with dedicated instance for production |
