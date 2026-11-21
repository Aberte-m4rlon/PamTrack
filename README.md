# Pamasahe Tracker – Oriental Mindoro

> **"Tamang Pamasahe. Ligtas na Biyahe."**
> Full-stack transportation fare monitoring platform for commuters, transport operators, and administrators across Calapan City and all 14 municipalities of Oriental Mindoro, Philippines.

---

## Architecture Overview

| Layer | Technologies |
| --- | --- |
| **Frontend** | React 18, TypeScript, Vite, Tailwind CSS, Radix UI primitives, Lucide React, Framer Motion |
| **State & Validation** | TanStack Query, React Hook Form, Zod, Recharts, date-fns |
| **Maps & Routing** | OpenStreetMap tiles, Leaflet + React Leaflet, OSRM (`router.project-osrm.org` or custom) |
| **Backend & Security** | Supabase (PostgreSQL, Auth, Storage private `fare-evidence` bucket, Realtime, RLS, Edge Functions) |
| **Visual System** | Green Glassmorphism (`#176B4B`, `#24966A`, `#10B981`, `#DFF7E8`, `#183329`, `backdrop-filter: blur(18px)`) with custom Oriental Mindoro background and emblem |

---

## Core Modules Implemented

1. **Public Website**:
   - Landing Page (`/`), About & Official Sources (`/about`), Route Explorer Map (`/routes`), Route & Fare Finder (`/fare-search`), Searchable/Exportable Fare Matrix (`/fare-matrix`), Fare Details (`/fares/:id`), 15-LGU Directory (`/municipalities`), Auth (`/login`, `/register`, `/forgot-password`, `/reset-password`), Legal (`/privacy`, `/terms`).
2. **Commuter Portal** (`/dashboard/*`):
   - Commuter Dashboard, Integrated Route Finder, Community Fare Reporting with private evidence upload + pending edit capability, Favorite Routes, Realtime Notifications, Profile Settings.
3. **Transport Operator Portal** (`/operator`):
   - Operator/Franchise registration, relevant report visibility, documentation upload linkage.
4. **Protected Administrator & Super Administrator Portal** (`/admin/*`):
   - Analytics Dashboard, Fare Verification Workbench (side-by-side comparison, signed evidence inspection, Community Estimate approval vs Official Fare verification), Fare Management & Archiving, Route Management with OSRM distance fetch, Municipality Management, Operator Verification, User Role Management, Broadcast Notifications, Audit & Verification Logs, System Settings.

---

## Strict Fare Data Integrity Rules

- **Zero Fabricated Official Fares**: No invented official prices or schedules are preloaded.
- **Official Source Enforcement**: Both the frontend UI (`officialFareSchema`, `hasValidOfficialSource`) and PostgreSQL (`chk_official_fare_requires_verification`, `publish_official_fare`, `review_fare_report`) reject publishing a `verified_official` fare without an `issuing_authority`, `official_document_reference`, and `effective_date`.
- **Community Estimate Separation**: Approving a commuter report as `approved_community_estimate` publishes a yellow `COMMUNITY ESTIMATE` row and never creates an official fare.
- **Unavailable State**: When no verified official fare exists for a corridor, the system explicitly renders: *"No verified official fare is currently available for this route."*

---

## Provincial Coverage (All 15 LGUs)

1. Calapan City (Provincial Capital) • 2. Baco • 3. Puerto Galera • 4. San Teodoro • 5. Naujan • 6. Victoria • 7. Socorro • 8. Pola • 9. Pinamalayan • 10. Gloria • 11. Bansud • 12. Bongabong • 13. Roxas • 14. Mansalay • 15. Bulalacao

---

## Quick Start

1. Install dependencies:
   ```bash
   npm install
   ```
2. Configure environment variables:
   ```bash
   cp .env.example .env
   ```
   Fill in `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.
3. Apply SQL migrations in `supabase/migrations/` (`001` through `011`) in order inside your Supabase project.
4. Run locally:
   ```bash
   npm run dev
   ```
5. Run typecheck, tests, and production build:
   ```bash
   npm run typecheck
   npm test
   npm run build
   ```

See [docs/SETUP.md](docs/SETUP.md), [docs/ADMIN_SETUP.md](docs/ADMIN_SETUP.md), [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md), and [docs/SECURITY_AND_BACKUP.md](docs/SECURITY_AND_BACKUP.md) for full details.
