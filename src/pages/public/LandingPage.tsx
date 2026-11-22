import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowRight,
  BusFront,
  CheckCircle2,
  Compass,
  FileCheck2,
  Lock,
  MapPin,
  MessageSquarePlus,
  Search,
  ShieldCheck,
  Sparkles,
  Users,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
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
    description: 'Pick your starting LGU.',
  },
  {
    step: '02',
    title: 'Select Destination',
    description: 'Choose your drop-off town.',
  },
  {
    step: '03',
    title: 'Pick Transport',
    description: 'Multicab, UV, Bus, or Tricycle.',
  },
  {
    step: '04',
    title: 'Check Route & Fare',
    description: 'View prices and road distance.',
  },
  {
    step: '05',
    title: 'Compare Discounts',
    description: 'Verify 20% student & senior rates.',
  },
];

const SHOWCASE_PAIRS = [
  'bulalacao->bongabong',
  'bulalacao->roxas',
  'roxas->bongabong',
  'bongabong->gloria',
  'calapan-city->puerto-galera',
  'calapan-city->pinamalayan',
  'calapan-city->bulalacao',
  'calapan-city->calapan-city',
];

export function LandingPage() {
  const { user } = useAuth();
  const { data: muniRes } = useMunicipalities();
  const { data: transportRes } = useTransportTypes();
  const { data: fareRecords } = useFareRecords();

  const municipalities = muniRes?.data ?? [];
  const transportTypes = transportRes?.data ?? [];
  const activeRecords = (fareRecords ?? []).filter(
    (f) => !f.is_archived && !f.is_test_fixture && f.transport_type?.is_active !== false
  );
  const { officialFares, communityEstimates } = partitionFareRecords(activeRecords);

  const regularGuides = [...officialFares, ...communityEstimates].filter(
    (f) => f.passenger_category === 'regular'
  );
  const coveredPairsCount = new Set(
    activeRecords.map((f) => `${f.origin_municipality_id}::${f.destination_municipality_id}`)
  ).size;

  const featuredGuides = (() => {
    const picked: typeof regularGuides = [];
    const seenPairs = new Set<string>();
    for (const slugKey of SHOWCASE_PAIRS) {
      const match = regularGuides.find(
        (f) =>
          `${f.origin?.slug ?? ''}->${f.destination?.slug ?? ''}` === slugKey &&
          !seenPairs.has(`${f.origin_municipality_id}->${f.destination_municipality_id}`)
      );
      if (match) {
        seenPairs.add(`${match.origin_municipality_id}->${match.destination_municipality_id}`);
        picked.push(match);
      }
      if (picked.length >= 4) break;
    }
    if (picked.length < 4) {
      for (const item of regularGuides) {
        const pairKey = `${item.origin_municipality_id}->${item.destination_municipality_id}`;
        if (!seenPairs.has(pairKey)) {
          seenPairs.add(pairKey);
          picked.push(item);
        }
        if (picked.length >= 4) break;
      }
    }
    return picked;
  })();

  return (
    <div className="space-y-8 pb-6">
      {/* 1. HERO SECTION (Light Red Liquid Glass) */}
      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <GlassCard variant="surface" className="relative rounded-[26px] sm:rounded-[32px] p-4 sm:p-7 lg:p-10">
          <div className="grid items-center gap-8 lg:grid-cols-12">
            <div className="space-y-5 lg:col-span-7">
              <div className="glass-pill-tile inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-[#C9182B]">
                <Sparkles className="h-3.5 w-3.5 text-[#C9182B]" />
                Tamang Pamasahe. Ligtas na Biyahe.
              </div>

              <h1 className="font-display text-3xl font-extrabold leading-tight tracking-tight text-[#29262B] sm:text-5xl">
                Know Your Route.{' '}
                <span className="text-[#C9182B]">Plan Your Pamasahe.</span>
              </h1>

              <p className="max-w-xl text-sm leading-relaxed text-[#343039] sm:text-base">
                Compare commuter fares, 20% discounts, and OSRM routes across all{' '}
                <strong className="text-[#29262B]">15 cities and municipalities of Oriental Mindoro</strong>.
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
                    <Search className="h-4 w-4 text-[#C9182B]" />
                    Check Fare
                  </GlassButton>
                </Link>
              </div>

              {!user && (
                <div className="glass-pill-tile flex items-center gap-2.5 rounded-2xl sm:rounded-full px-4 py-2 text-xs text-[#343039]">
                  <Lock className="h-3.5 w-3.5 text-[#C9182B] shrink-0" />
                  <span className="leading-snug">
                    <strong className="text-[#29262B]">Guest Mode:</strong> Fare lookup unlocked.{' '}
                    <Link to="/login" className="font-bold text-[#C9182B] hover:underline">
                      Sign in
                    </Link>{' '}
                    for Live GPS &amp; Reporting.
                  </span>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3 pt-1 sm:grid-cols-4 sm:max-w-2xl">
                <div className="glass-pill-tile rounded-[22px] p-3.5 text-center space-y-1">
                  <p className="font-display text-2xl font-extrabold tabular-nums text-[#C9182B]">15</p>
                  <p className="flex items-center justify-center gap-1 text-[11px] font-semibold text-[#777078]">
                    <MapPin className="h-3 w-3 shrink-0 text-[#C9182B]" />
                    <span>LGUs Covered</span>
                  </p>
                </div>
                <div className="glass-pill-tile rounded-[22px] p-3.5 text-center space-y-1">
                  <p className="font-display text-2xl font-extrabold tabular-nums text-[#C9182B]">
                    {transportTypes.length || 4}
                  </p>
                  <p className="flex items-center justify-center gap-1 text-[11px] font-semibold text-[#777078]">
                    <BusFront className="h-3 w-3 shrink-0 text-[#C9182B]" />
                    <span>Transport Modes</span>
                  </p>
                </div>
                <div className="glass-pill-tile rounded-[22px] p-3.5 text-center space-y-1">
                  <p className="font-display text-2xl font-extrabold tabular-nums text-[#B51224]">
                    {officialFares.length + communityEstimates.length}
                  </p>
                  <p className="flex items-center justify-center gap-1 text-[11px] font-semibold text-[#777078]">
                    <FileCheck2 className="h-3 w-3 shrink-0 text-[#C9182B]" />
                    <span>Published Fares</span>
                  </p>
                </div>
                <div className="glass-pill-tile rounded-[22px] p-3.5 text-center space-y-1">
                  <p className="font-display text-2xl font-extrabold tabular-nums text-[#C9182B]">
                    {coveredPairsCount}
                  </p>
                  <p className="flex items-center justify-center gap-1 text-[11px] font-semibold text-[#777078]">
                    <Compass className="h-3 w-3 shrink-0 text-[#C9182B]" />
                    <span>Covered Pairs</span>
                  </p>
                </div>
              </div>
            </div>

            <div className="flex flex-col items-center justify-center lg:col-span-5">
              <div className="relative flex items-center justify-center">
                <div className="absolute -inset-6 rounded-full bg-gradient-to-tr from-[#F8E7EA]/70 via-white/75 to-[#E9E5E8]/60 blur-2xl" />
                <div className="glass-panel liquid-glass-sheen relative rounded-full p-2.5 ring-1 ring-white/90 shadow-[0_24px_60px_-14px_rgba(181,18,36,0.26)]">
                  <img
                    src="/assets/pamasahe-tracker-logo.png"
                    alt="Pamasahe Tracker Oriental Mindoro Emblem"
                    className="h-52 w-52 rounded-full object-contain drop-shadow-xl sm:h-72 sm:w-72"
                  />
                </div>
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
            body: 'Province-wide fare reference built for Oriental Mindoro riders.',
          },
          {
            icon: Users,
            title: 'Why It Was Created',
            body: 'Spot overcharging and compare commuter rates at a glance.',
          },
          {
            icon: Compass,
            title: 'How It Helps Commuters',
            body: 'View OSRM road routes and 20% discount tables anytime.',
          },
          {
            icon: FileCheck2,
            title: 'Citizen Fare Estimates',
            body: 'Real corridor fares shared across all 15 municipalities.',
          },
        ].map((item) => (
          <GlassCard key={item.title} variant="strong" hoverable className="p-5 space-y-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/95 bg-gradient-to-br from-white/95 to-[#F8E7EA]/90 text-[#C9182B] shadow-sm">
              <item.icon className="h-5 w-5" />
            </div>
            <h2 className="font-display text-base font-bold text-[#29262B]">{item.title}</h2>
            <p className="text-xs leading-relaxed text-[#343039]">{item.body}</p>
          </GlassCard>
        ))}
      </section>

      {/* 3. TRANSPORTATION SERVICES */}
      <section className="space-y-4">
        <div className="glass-surface liquid-glass-sheen rounded-[26px] px-5 py-4 flex flex-wrap items-end justify-between gap-2">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-[#C9182B]">
              Public Transport Coverage
            </p>
            <h2 className="font-display text-2xl font-extrabold text-[#29262B]">
              Supported Transportation Services
            </h2>
          </div>
          <Link to="/fare-matrix" className="text-xs font-bold text-[#C9182B] hover:underline">
            View Full Fare Matrix →
          </Link>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {transportTypes.map((tt) => (
            <GlassCard key={tt.id} variant="strong" hoverable className="p-5 space-y-2">
              <div className="liquid-nav-active flex h-11 w-11 items-center justify-center rounded-2xl text-white">
                <TransportModeIcon code={tt.code} className="h-5 w-5" />
              </div>
              <h3 className="font-display text-base font-bold text-[#29262B]">{tt.name}</h3>
              <p className="text-[11px] font-semibold text-[#B51224]">{tt.regulatory_body}</p>
            </GlassCard>
          ))}
        </div>
      </section>

      {/* 4. HOW IT WORKS */}
      <section className="glass-surface liquid-glass-sheen rounded-[30px] p-6 space-y-5">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-[#C9182B]">
            5-Step Commuter Guide
          </p>
          <h2 className="font-display text-2xl font-extrabold text-[#29262B]">How It Works</h2>
        </div>

        <div className="grid gap-4 md:grid-cols-5">
          {HOW_IT_WORKS_STEPS.map((s) => (
            <div
              key={s.step}
              className="glass-pill-tile rounded-[22px] p-4 space-y-2"
            >
              <span className="inline-block rounded-full border border-white/95 bg-[#F8E7EA]/90 px-2.5 py-0.5 text-xs font-extrabold text-[#C9182B] shadow-sm">
                {s.step}
              </span>
              <h3 className="font-bold text-sm text-[#29262B]">{s.title}</h3>
              <p className="text-xs text-[#777078]">{s.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* 5. FEATURED CITIZEN ROUTES */}
      <section className="space-y-4">
        <div className="glass-surface liquid-glass-sheen rounded-[26px] px-5 py-4 flex flex-wrap items-end justify-between gap-2">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-[#C9182B]">
              Citizen Commuter Fare Guide
            </p>
            <h2 className="font-display text-2xl font-extrabold text-[#29262B]">
              Featured Oriental Mindoro Routes
            </h2>
          </div>
          <Link to="/fare-search" className="text-xs font-bold text-[#C9182B] hover:underline">
            Search Any Route →
          </Link>
        </div>

        {featuredGuides.length === 0 ? (
          <EmptyStateCard
            icon={FileCheck2}
            title="No commuter fare guides published yet"
            description="Browse the interactive 15-LGU route map or search community-submitted commuter fare estimates across Oriental Mindoro."
            action={
              <div className="flex flex-wrap justify-center gap-2">
                <Link to="/fare-matrix">
                  <GlassButton variant="primary" size="sm">
                    View Full Fare Matrix
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
            {featuredGuides.map((fare) => (
              <Link
                key={fare.id}
                to={`/fare-search?origin=${encodeURIComponent(fare.origin_municipality_id)}&destination=${encodeURIComponent(fare.destination_municipality_id)}`}
                className="block"
              >
                <GlassCard variant="strong" hoverable className="p-5 space-y-3 h-full">
                  <FareStatusBadge status={fare.status} compact />
                  <div>
                    <p className="text-xs font-semibold text-[#B51224]">
                      {fare.transport_type?.name} • {fare.passenger_category}
                    </p>
                    <h3 className="font-display text-base font-bold text-[#29262B]">
                      {fare.origin_municipality_id === fare.destination_municipality_id
                        ? `${fare.origin?.name} (Local Base)`
                        : `${fare.origin?.name} → ${fare.destination?.name}`}
                    </h3>
                  </div>
                  <p className="font-display text-2xl font-extrabold text-[#C9182B]">
                    {formatPhp(fare.fare_amount)}
                  </p>
                  <p className="text-[11px] text-[#777078]">
                    {fare.issuing_authority || 'Citizen Commuter Guide'} •{' '}
                    {formatDateSafe(fare.last_verified_at || fare.updated_at)}
                  </p>
                </GlassCard>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* 6. ORIENTAL MINDORO COVERAGE (ALL 15 LGUs) */}
      <section className="glass-surface liquid-glass-sheen rounded-[30px] p-6 space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-[#C9182B]">
              Province-Wide Network
            </p>
            <h2 className="font-display text-2xl font-extrabold text-[#29262B]">
              Oriental Mindoro Coverage (1 City &amp; 14 Municipalities)
            </h2>
          </div>
          <Link to="/municipalities" className="text-xs font-bold text-[#C9182B] hover:underline">
            Full LGU Directory →
          </Link>
        </div>

        <div className="grid gap-2.5 sm:grid-cols-3 md:grid-cols-5">
          {municipalities.map((m) => (
            <Link
              key={m.id}
              to={`/fare-search?origin=${encodeURIComponent(m.id)}`}
              className="glass-pill-tile group flex items-center justify-between rounded-full px-4 py-2.5 text-xs font-bold text-[#29262B] transition hover:bg-gradient-to-b hover:from-[#C9182B] hover:to-[#B51224] hover:text-white"
            >
              <span className="flex items-center gap-2 truncate">
                <MapPin className="h-3.5 w-3.5 shrink-0 text-[#C9182B] group-hover:text-white" />
                <span className="truncate">{m.name}</span>
              </span>
              <span className="text-[10px] opacity-70">
                {m.is_capital ? 'Capital' : m.district.split(' ')[0]}
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* 7. CITIZEN FARE TRANSPARENCY */}
      <section className="grid gap-5 lg:grid-cols-12">
        <GlassCard variant="strong" className="p-6 space-y-4 lg:col-span-7">
          <p className="text-xs font-bold uppercase tracking-widest text-[#C9182B]">
            Pangmamamayan • Fare Status Guide
          </p>
          <h2 className="font-display text-2xl font-extrabold text-[#29262B]">
            Transparent Citizen Commuter Estimates
          </h2>
          <p className="text-sm text-[#343039]">
            Independent commuter guide across all 15 municipalities with clear status labels.
          </p>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="glass-pill-tile rounded-[22px] p-3.5 space-y-1.5">
              <FareStatusBadge status="verified_official" />
              <p className="text-xs text-[#343039]">
                Backed by LTFRB or LGU fare orders.
              </p>
            </div>
            <div className="glass-pill-tile rounded-[22px] p-3.5 space-y-1.5">
              <FareStatusBadge status="community_estimate" />
              <p className="text-xs text-[#343039]">
                Commuter budget reference along active corridors.
              </p>
            </div>
            <div className="glass-pill-tile rounded-[22px] p-3.5 space-y-1.5">
              <FareStatusBadge status="pending_verification" />
              <p className="text-xs text-[#343039]">
                Queued for verification against transport documents.
              </p>
            </div>
            <div className="glass-pill-tile rounded-[22px] p-3.5 space-y-1.5">
              <FareStatusBadge status="rejected_or_disputed" />
              <p className="text-xs text-[#343039]">
                Flagged due to conflicting reports.
              </p>
            </div>
          </div>
        </GlassCard>

        <GlassCard variant="rose" className="p-6 space-y-4 lg:col-span-5">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/20 px-3 py-1 text-xs font-bold uppercase tracking-wider">
            <CheckCircle2 className="h-3.5 w-3.5 text-white" />
            Statutory Discounts
          </div>
          <h3 className="font-display text-xl font-extrabold">
            20% Student, Senior Citizen &amp; PWD Privileges
          </h3>
          <p className="text-xs leading-relaxed text-white/90">
            Discounted fares follow RA 11314, RA 9994, and RA 10754 orders.
          </p>
          <ul className="space-y-2 text-xs">
            {OFFICIAL_REGULATORY_REFERENCES.slice(0, 4).map((ref) => (
              <li key={ref.authority} className="rounded-xl bg-white/15 p-2.5 border border-white/20">
                <p className="font-bold">{ref.authority}</p>
                <p className="text-white/90">{ref.title}</p>
              </li>
            ))}
          </ul>
        </GlassCard>
      </section>

      {/* 8. CALL TO ACTION */}
      <GlassCard variant="rose" className="p-6 sm:p-8">
        <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
          <div className="space-y-1.5 max-w-2xl">
            <h2 className="font-display text-2xl font-extrabold sm:text-3xl">
              Help Keep Oriental Mindoro Fares Accurate
            </h2>
            <p className="text-sm text-white/90">
              Sign in to report fares paid and save daily routes.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link to="/register">
              <GlassButton variant="secondary" size="lg">
                Register as Commuter
                <ArrowRight className="h-4 w-4 text-[#C9182B]" />
              </GlassButton>
            </Link>
            <Link to={user ? '/dashboard/reports' : '/login'}>
              <GlassButton variant="glass" size="lg" className="text-white">
                <MessageSquarePlus className="h-4 w-4 text-white" />
                {user ? 'Submit Fare Report' : 'Sign In to Report Fare'}
              </GlassButton>
            </Link>
          </div>
        </div>
      </GlassCard>
    </div>
  );
}
