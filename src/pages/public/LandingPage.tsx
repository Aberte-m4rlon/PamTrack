import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowRight,
  CheckCircle2,
  Compass,
  FileCheck2,
  MapPin,
  MessageSquarePlus,
  Search,
  ShieldCheck,
  Sparkles,
  Users,
} from 'lucide-react';
import { OFFICIAL_REGULATORY_REFERENCES } from '@/data/orientalMindoro';
import { useFareRecords, useMunicipalities, useTransportTypes } from '@/hooks/useReferenceData';
import { partitionFareRecords } from '@/lib/fareIntegrity';
import { formatDateSafe, formatPhp } from '@/lib/utils';
import {
  EmptyStateCard,
  FareStatusBadge,
  GlassButton,
  GlassCard,
  TransportModeIcon,
} from '@/components/glass/GlassPrimitives';

const HOW_IT_WORKS_STEPS = [
  {
    step: '01',
    title: 'Select Origin',
    description: 'Pick your starting city or municipality across all 15 LGUs of Oriental Mindoro.',
  },
  {
    step: '02',
    title: 'Select Destination',
    description: 'Choose where you are traveling from Puerto Galera down to Bulalacao.',
  },
  {
    step: '03',
    title: 'Choose Transport Mode',
    description: 'Filter by Jeepney, Tricycle, UV Express, Provincial Bus, or Multicab.',
  },
  {
    step: '04',
    title: 'View Fare & Road Info',
    description: 'Inspect published fares, discount coverage, and real OpenStreetMap routing.',
  },
  {
    step: '05',
    title: 'Verify Source Status',
    description: 'Check clearly whether a price is an Official Verified Fare or a Community Estimate.',
  },
];

export function LandingPage() {
  const { data: muniRes } = useMunicipalities();
  const { data: transportRes } = useTransportTypes();
  const { data: fareRecords } = useFareRecords();

  const municipalities = muniRes?.data ?? [];
  const transportTypes = transportRes?.data ?? [];
  const { officialFares, communityEstimates } = partitionFareRecords(fareRecords ?? []);
  const featuredOfficial = officialFares.slice(0, 4);

  return (
    <div className="space-y-8 pb-6">
      {/* 1. HERO SECTION (Light Red / Rose Glassmorphism) */}
      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <GlassCard variant="surface" className="relative overflow-hidden p-6 sm:p-10">
          <div className="grid items-center gap-8 lg:grid-cols-12">
            <div className="space-y-5 lg:col-span-7">
              <div className="inline-flex items-center gap-2 rounded-full border border-[#FCA5A5]/65 bg-white/85 px-3.5 py-1.5 text-xs font-bold uppercase tracking-wider text-[#DC2626] shadow-sm">
                <Sparkles className="h-3.5 w-3.5 text-[#EF4444]" />
                Tamang Pamasahe. Ligtas na Biyahe.
              </div>

              <h1 className="font-display text-3xl font-extrabold leading-tight tracking-tight text-[#24191D] sm:text-5xl">
                Know Your Route.{' '}
                <span className="text-[#DC2626]">Plan Your Pamasahe.</span>
              </h1>

              <p className="max-w-2xl text-sm leading-relaxed text-[#78716C] sm:text-base">
                The transparent public transportation fare monitoring platform for commuters,
                drivers, operators, and local transport administrators across all{' '}
                <strong className="text-[#24191D]">15 cities and municipalities of Oriental Mindoro</strong>. Check official
                LTFRB &amp; LGU fares, inspect community reports, and explore real OpenStreetMap
                corridors.
              </p>

              <div className="flex flex-wrap gap-3 pt-1">
                <Link to="/routes" className="w-full sm:w-auto">
                  <GlassButton variant="primary" size="lg" className="w-full sm:w-auto">
                    <Compass className="h-4 w-4" />
                    Explore Routes
                  </GlassButton>
                </Link>
                <Link to="/fare-search" className="w-full sm:w-auto">
                  <GlassButton variant="secondary" size="lg" className="w-full sm:w-auto">
                    <Search className="h-4 w-4" />
                    Check Fare
                  </GlassButton>
                </Link>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2 sm:grid-cols-4 sm:max-w-xl">
                <div className="rounded-2xl border border-white/90 bg-white/85 p-3 text-center shadow-sm">
                  <p className="font-display text-xl font-extrabold text-[#DC2626]">15</p>
                  <p className="text-[11px] font-semibold text-[#78716C]">LGUs Covered</p>
                </div>
                <div className="rounded-2xl border border-white/90 bg-white/85 p-3 text-center shadow-sm">
                  <p className="font-display text-xl font-extrabold text-[#DC2626]">5</p>
                  <p className="text-[11px] font-semibold text-[#78716C]">Transport Modes</p>
                </div>
                <div className="rounded-2xl border border-white/90 bg-white/85 p-3 text-center shadow-sm">
                  <p className="font-display text-xl font-extrabold text-[#16A34A]">
                    {officialFares.length}
                  </p>
                  <p className="text-[11px] font-semibold text-[#78716C]">Verified Fares</p>
                </div>
                <div className="rounded-2xl border border-white/90 bg-white/85 p-3 text-center shadow-sm">
                  <p className="font-display text-xl font-extrabold text-amber-600">
                    {communityEstimates.length}
                  </p>
                  <p className="text-[11px] font-semibold text-[#78716C]">Community Ref.</p>
                </div>
              </div>
            </div>

            <div className="flex flex-col items-center justify-center lg:col-span-5">
              <div className="relative flex items-center justify-center">
                <div className="absolute -inset-4 rounded-full bg-[#FCA5A5]/40 blur-2xl" />
                <img
                  src="/assets/pamasahe-tracker-logo.png"
                  alt="Pamasahe Tracker Oriental Mindoro Emblem"
                  className="relative h-56 w-56 rounded-full object-contain drop-shadow-2xl ring-4 ring-white/80 sm:h-72 sm:w-72"
                />
              </div>
            </div>
          </div>
        </GlassCard>
      </motion.section>

      {/* 2. ABOUT THE PLATFORM */}
      <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[
          {
            icon: ShieldCheck,
            title: 'What Is Pamasahe Tracker?',
            body: 'A province-wide fare reference and reporting system built specifically for Oriental Mindoro commuters and regulators.',
          },
          {
            icon: Users,
            title: 'Why It Was Created',
            body: 'To reduce fare confusion, deter overcharging, and give daily riders a single reliable place to verify rates and discounts.',
          },
          {
            icon: Compass,
            title: 'How It Helps Commuters',
            body: 'Plan inter-municipal trips with OSRM road distances, compare fare categories, and save favorite daily routes.',
          },
          {
            icon: FileCheck2,
            title: 'How Verification Works',
            body: 'Every official fare requires an LTFRB order, LGU ordinance, or authorized operator tariff verified by an administrator.',
          },
        ].map((item) => (
          <GlassCard key={item.title} variant="strong" hoverable className="p-5 space-y-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#FFE4E6] text-[#DC2626] border border-[#FCA5A5]/45">
              <item.icon className="h-5 w-5" />
            </div>
            <h2 className="font-display text-base font-bold text-[#24191D]">{item.title}</h2>
            <p className="text-xs leading-relaxed text-[#78716C]">{item.body}</p>
          </GlassCard>
        ))}
      </section>

      {/* 3. TRANSPORTATION SERVICES */}
      <section className="space-y-4">
        <div className="glass-surface rounded-3xl px-5 py-4 flex flex-wrap items-end justify-between gap-2">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-[#DC2626]">
              Public Transport Coverage
            </p>
            <h2 className="font-display text-2xl font-extrabold text-[#24191D]">
              Supported Transportation Services
            </h2>
          </div>
          <Link to="/fare-matrix" className="text-xs font-bold text-[#DC2626] hover:underline">
            View Full Fare Matrix →
          </Link>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {transportTypes.map((tt) => (
            <GlassCard key={tt.id} variant="strong" hoverable className="p-4 space-y-2.5">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-[#DC2626] to-[#B91C1C] text-white shadow-md shadow-[#DC2626]/20">
                <TransportModeIcon code={tt.code} className="h-5 w-5" />
              </div>
              <h3 className="font-display text-base font-bold text-[#24191D]">{tt.name}</h3>
              <p className="text-xs leading-relaxed text-[#78716C]">{tt.description}</p>
              <p className="pt-1 text-[11px] font-semibold text-[#B91C1C]">{tt.regulatory_body}</p>
            </GlassCard>
          ))}
        </div>
      </section>

      {/* 4. HOW IT WORKS */}
      <section className="glass-surface rounded-3xl p-6 space-y-5">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-[#DC2626]">
            5-Step Commuter Guide
          </p>
          <h2 className="font-display text-2xl font-extrabold text-[#24191D]">How It Works</h2>
        </div>

        <div className="grid gap-4 md:grid-cols-5">
          {HOW_IT_WORKS_STEPS.map((s) => (
            <div
              key={s.step}
              className="rounded-2xl border border-white/90 bg-white/80 p-4 space-y-2 shadow-sm"
            >
              <span className="inline-block rounded-full bg-[#FFE4E6] px-2.5 py-0.5 text-xs font-extrabold text-[#DC2626] border border-[#FCA5A5]/50">
                {s.step}
              </span>
              <h3 className="font-bold text-sm text-[#24191D]">{s.title}</h3>
              <p className="text-xs text-[#78716C]">{s.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* 5. FEATURED ROUTES (VERIFIED OFFICIAL FARES ONLY) */}
      <section className="space-y-4">
        <div className="glass-surface rounded-3xl px-5 py-4 flex flex-wrap items-end justify-between gap-2">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-[#DC2626]">
              Official Records Only
            </p>
            <h2 className="font-display text-2xl font-extrabold text-[#24191D]">
              Featured Verified Routes
            </h2>
          </div>
          <Link to="/fare-search" className="text-xs font-bold text-[#DC2626] hover:underline">
            Search All Routes →
          </Link>
        </div>

        {featuredOfficial.length === 0 ? (
          <EmptyStateCard
            icon={FileCheck2}
            title="No verified official fare records published yet"
            description="In compliance with strict fare data integrity rules, featured routes only display administrator-verified official fares backed by LTFRB orders or LGU ordinances—never fabricated placeholder prices."
            action={
              <div className="flex flex-wrap justify-center gap-2">
                <Link to="/fare-matrix">
                  <GlassButton variant="primary" size="sm">
                    View Fare Matrix ({communityEstimates.length} Community Reference)
                  </GlassButton>
                </Link>
                <Link to="/routes">
                  <GlassButton variant="secondary" size="sm">
                    Explore 15-LGU Route Map
                  </GlassButton>
                </Link>
              </div>
            }
          />
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {featuredOfficial.map((fare) => (
              <GlassCard key={fare.id} variant="strong" hoverable className="p-5 space-y-3">
                <FareStatusBadge status="verified_official" compact />
                <div>
                  <p className="text-xs font-semibold text-[#B91C1C]">
                    {fare.transport_type?.name} • {fare.passenger_category}
                  </p>
                  <h3 className="font-display text-base font-bold text-[#24191D]">
                    {fare.origin?.name} → {fare.destination?.name}
                  </h3>
                </div>
                <p className="font-display text-2xl font-extrabold text-[#DC2626]">
                  {formatPhp(fare.fare_amount)}
                </p>
                <p className="text-[11px] text-[#78716C]">
                  Ref: {fare.official_document_reference} • Verified{' '}
                  {formatDateSafe(fare.last_verified_at)}
                </p>
              </GlassCard>
            ))}
          </div>
        )}
      </section>

      {/* 6. ORIENTAL MINDORO COVERAGE (ALL 15 LGUs) */}
      <section className="glass-surface rounded-3xl p-6 space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-[#DC2626]">
              Province-Wide Network
            </p>
            <h2 className="font-display text-2xl font-extrabold text-[#24191D]">
              Oriental Mindoro Coverage (1 City &amp; 14 Municipalities)
            </h2>
          </div>
          <Link to="/municipalities" className="text-xs font-bold text-[#DC2626] hover:underline">
            Full LGU Directory →
          </Link>
        </div>

        <div className="grid gap-2.5 sm:grid-cols-3 md:grid-cols-5">
          {municipalities.map((m) => (
            <Link
              key={m.id}
              to={`/fare-search?origin=${encodeURIComponent(m.id)}`}
              className="group flex items-center justify-between rounded-2xl border border-white/90 bg-white/80 px-3.5 py-2.5 text-xs font-bold text-[#24191D] transition hover:bg-gradient-to-r hover:from-[#DC2626] hover:to-[#B91C1C] hover:text-white shadow-sm"
            >
              <span className="flex items-center gap-2 truncate">
                <MapPin className="h-3.5 w-3.5 shrink-0 text-[#DC2626] group-hover:text-white" />
                <span className="truncate">{m.name}</span>
              </span>
              <span className="text-[10px] opacity-70">
                {m.is_capital ? 'Capital' : m.district.split(' ')[0]}
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* 7. FARE TRANSPARENCY */}
      <section className="grid gap-5 lg:grid-cols-12">
        <GlassCard variant="strong" className="p-6 space-y-4 lg:col-span-7">
          <p className="text-xs font-bold uppercase tracking-widest text-[#DC2626]">
            Data Integrity Guarantee
          </p>
          <h2 className="font-display text-2xl font-extrabold text-[#24191D]">
            Official Fares vs. Community Estimates
          </h2>
          <p className="text-sm text-[#78716C]">
            Community reports never overwrite or masquerade as government-issued rates. Every row
            in our Fare Matrix displays an explicit verification badge, regulatory document
            reference, and last verified timestamp.
          </p>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-green-300 bg-green-50/90 p-3.5 space-y-1.5">
              <FareStatusBadge status="verified_official" />
              <p className="text-xs text-[#78716C]">
                Backed by LTFRB Region IV-B orders, Sanggunian tricycle ordinances, or authorized
                operator tariff sheets.
              </p>
            </div>
            <div className="rounded-2xl border border-amber-300 bg-amber-50/90 p-3.5 space-y-1.5">
              <FareStatusBadge status="community_estimate" />
              <p className="text-xs text-[#78716C]">
                Reviewed commuter observations provided for budgeting reference only when official
                tables are pending.
              </p>
            </div>
            <div className="rounded-2xl border border-stone-300 bg-stone-50/90 p-3.5 space-y-1.5">
              <FareStatusBadge status="pending_verification" />
              <p className="text-xs text-[#78716C]">
                Queued for administrator comparison against official documents and evidence.
              </p>
            </div>
            <div className="rounded-2xl border border-red-300 bg-red-50/90 p-3.5 space-y-1.5">
              <FareStatusBadge status="rejected_or_disputed" />
              <p className="text-xs text-[#78716C]">
                Flagged or rejected due to conflicting reports or missing proof.
              </p>
            </div>
          </div>
        </GlassCard>

        <GlassCard variant="rose" className="p-6 space-y-4 lg:col-span-5">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-bold uppercase tracking-wider">
            <CheckCircle2 className="h-3.5 w-3.5 text-[#FFE4E6]" />
            Statutory Discounts
          </div>
          <h3 className="font-display text-xl font-extrabold">
            20% Student, Senior Citizen &amp; PWD Privileges
          </h3>
          <p className="text-xs leading-relaxed text-[#FFE4E6]/95">
            Discounted fares are displayed strictly according to verified statutory regulations (RA
            11314, RA 9994, RA 10754) and published LGU/LTFRB orders.
          </p>
          <ul className="space-y-2 text-xs">
            {OFFICIAL_REGULATORY_REFERENCES.slice(0, 4).map((ref) => (
              <li key={ref.authority} className="rounded-xl bg-white/15 p-2.5 border border-white/15">
                <p className="font-bold">{ref.authority}</p>
                <p className="text-[#FFE4E6]/90">{ref.title}</p>
              </li>
            ))}
          </ul>
        </GlassCard>
      </section>

      {/* 8. CALL TO ACTION */}
      <GlassCard variant="rose" className="p-6 sm:p-8">
        <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
          <div className="space-y-2 max-w-2xl">
            <h2 className="font-display text-2xl font-extrabold sm:text-3xl">
              Help Keep Oriental Mindoro Fares Accurate
            </h2>
            <p className="text-sm text-[#FFE4E6]/95">
              Create a commuter account to report actual fares you paid, upload receipt or matrix
              photos, save favorite routes, and receive instant verification updates.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link to="/register">
              <GlassButton variant="emerald" size="lg">
                Register as Commuter
                <ArrowRight className="h-4 w-4" />
              </GlassButton>
            </Link>
            <Link to="/dashboard/reports">
              <GlassButton variant="glass" size="lg">
                <MessageSquarePlus className="h-4 w-4 text-[#DC2626]" />
                Submit Fare Report
              </GlassButton>
            </Link>
          </div>
        </div>
      </GlassCard>
    </div>
  );
}
