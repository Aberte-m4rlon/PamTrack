import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  BusFront,
  Compass,
  FileCheck2,
  Lock,
  MapPin,
  Search,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
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
    <div className="space-y-5 sm:space-y-7 pb-4">
      {/* 1. HERO SECTION */}
      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.32 }}
      >
        <GlassCard variant="surface" className="relative rounded-[24px] sm:rounded-[32px] p-4 sm:p-7 lg:p-10">
          <div className="grid items-center gap-6 lg:gap-8 lg:grid-cols-12">
            <div className="space-y-3.5 sm:space-y-5 lg:col-span-7">
              <div className="flex items-center justify-between gap-2 sm:gap-3">
                <div className="glass-pill-tile inline-flex min-w-0 items-center gap-1.5 sm:gap-2 rounded-full px-2.5 sm:px-4 py-1.5 text-[9.5px] min-[375px]:text-[10px] min-[400px]:text-[10.5px] sm:text-xs font-bold uppercase tracking-wide sm:tracking-wider text-[#C9182B] min-[375px]:whitespace-nowrap">
                  <Sparkles className="h-3 w-3 sm:h-3.5 sm:w-3.5 shrink-0 text-[#C9182B]" />
                  <span className="min-w-0">Tamang Pamasahe. Ligtas na Biyahe.</span>
                </div>
                <div className="glass-panel relative flex h-12 w-12 min-[380px]:h-14 min-[380px]:w-14 shrink-0 items-center justify-center rounded-full p-1 ring-1 ring-white/95 shadow-sm lg:hidden">
                  <img
                    src="/assets/pamasahe-tracker-icon.png"
                    alt="Pamasahe Tracker Oriental Mindoro Emblem"
                    className="h-full w-full rounded-full object-contain"
                  />
                </div>
              </div>

              <h1 className="font-display text-[26px] min-[375px]:text-[30px] font-extrabold leading-[1.12] tracking-tight text-[#29262B] sm:text-5xl">
                Know Your Route.{' '}
                <span className="text-[#C9182B]">Plan Your Pamasahe.</span>
              </h1>

              <p className="max-w-xl text-xs min-[375px]:text-sm leading-relaxed text-[#343039] sm:text-base">
                Check commuter fares, 20% discounts, and routes across all{' '}
                <strong className="text-[#29262B]">15 LGUs of Oriental Mindoro</strong>.
              </p>

              <div className="grid grid-cols-2 gap-2.5 sm:flex sm:flex-wrap sm:gap-3 pt-0.5">
                <Link to="/routes" className="w-full sm:w-auto">
                  <GlassButton variant="primary" size="md" className="w-full sm:w-auto px-3 sm:px-6 sm:py-3 sm:text-base sm:min-h-[48px] text-[13px] whitespace-nowrap">
                    <Compass className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0" />
                    Explore Routes
                  </GlassButton>
                </Link>
                <Link to="/fare-search" className="w-full sm:w-auto">
                  <GlassButton variant="secondary" size="md" className="w-full sm:w-auto px-3 sm:px-6 sm:py-3 sm:text-base sm:min-h-[48px] text-[13px] whitespace-nowrap">
                    <Search className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0 text-[#C9182B]" />
                    Check Fare
                  </GlassButton>
                </Link>
              </div>

              {!user && (
                <div className="glass-pill-tile flex items-center gap-2.5 rounded-2xl sm:rounded-full px-3.5 py-2 text-[11px] sm:text-xs text-[#343039]">
                  <Lock className="h-3.5 w-3.5 text-[#C9182B] shrink-0" />
                  <span className="leading-snug">
                    <strong className="text-[#29262B]">Guest Mode:</strong> Fare lookup unlocked.{' '}
                    <Link to="/login" className="inline-flex min-h-[28px] items-center font-bold text-[#C9182B] hover:underline">
                      Sign in
                    </Link>{' '}
                    for Live GPS, Trips &amp; Fare Reporting.
                  </span>
                </div>
              )}

              <div className="grid grid-cols-2 gap-2.5 sm:gap-3 pt-0.5 sm:grid-cols-4 sm:max-w-2xl">
                <div className="glass-pill-tile rounded-[18px] sm:rounded-[22px] p-2.5 sm:p-3.5 text-center space-y-0.5">
                  <p className="font-display text-xl sm:text-2xl font-extrabold tabular-nums text-[#C9182B]">15</p>
                  <p className="flex items-center justify-center gap-1 text-[11px] font-semibold text-[#343039]">
                    <MapPin className="h-3 w-3 shrink-0 text-[#C9182B]" />
                    <span>LGUs Covered</span>
                  </p>
                </div>
                <div className="glass-pill-tile rounded-[18px] sm:rounded-[22px] p-2.5 sm:p-3.5 text-center space-y-0.5">
                  <p className="font-display text-xl sm:text-2xl font-extrabold tabular-nums text-[#C9182B]">
                    {transportTypes.length || 4}
                  </p>
                  <p className="flex items-center justify-center gap-1 text-[11px] font-semibold text-[#343039]">
                    <BusFront className="h-3 w-3 shrink-0 text-[#C9182B]" />
                    <span>Transport Modes</span>
                  </p>
                </div>
                <div className="glass-pill-tile rounded-[18px] sm:rounded-[22px] p-2.5 sm:p-3.5 text-center space-y-0.5">
                  <p className="font-display text-xl sm:text-2xl font-extrabold tabular-nums text-[#B51224]">
                    {officialFares.length + communityEstimates.length}
                  </p>
                  <p className="flex items-center justify-center gap-1 text-[11px] font-semibold text-[#343039]">
                    <FileCheck2 className="h-3 w-3 shrink-0 text-[#C9182B]" />
                    <span>Published Fares</span>
                  </p>
                </div>
                <div className="glass-pill-tile rounded-[18px] sm:rounded-[22px] p-2.5 sm:p-3.5 text-center space-y-0.5">
                  <p className="font-display text-xl sm:text-2xl font-extrabold tabular-nums text-[#C9182B]">
                    {coveredPairsCount}
                  </p>
                  <p className="flex items-center justify-center gap-1 text-[11px] font-semibold text-[#343039]">
                    <Compass className="h-3 w-3 shrink-0 text-[#C9182B]" />
                    <span>Covered Pairs</span>
                  </p>
                </div>
              </div>
            </div>

            <div className="hidden lg:flex flex-col items-center justify-center lg:col-span-5">
              <div className="relative flex items-center justify-center">
                <div className="absolute -inset-6 rounded-full bg-gradient-to-tr from-[#F8E7EA]/70 via-white/75 to-[#E9E5E8]/60 blur-2xl" />
                <div className="glass-panel liquid-glass-sheen relative rounded-full p-2.5 ring-1 ring-white/90 shadow-[0_24px_60px_-14px_rgba(181,18,36,0.26)]">
                  <img
                    src="/assets/pamasahe-tracker-logo.png"
                    alt="Pamasahe Tracker Oriental Mindoro Emblem"
                    className="h-72 w-72 rounded-full object-contain drop-shadow-xl"
                  />
                </div>
              </div>
            </div>
          </div>
        </GlassCard>
      </motion.section>

      {/* 2. SUPPORTED TRANSPORTATION MODES */}
      <section className="space-y-3 sm:space-y-4">
        <div className="glass-surface liquid-glass-sheen rounded-[20px] sm:rounded-[26px] px-3.5 py-2.5 sm:px-5 sm:py-4 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <span aria-hidden="true" className="h-4 sm:h-5 w-1 shrink-0 rounded-full bg-[#C9182B]" />
            <h2 className="font-display text-sm sm:text-2xl font-extrabold text-[#29262B] truncate">
              Supported Transportation Services
            </h2>
          </div>
          <Link
            to="/fare-matrix"
            className="glass-pill-tile inline-flex min-h-[32px] sm:min-h-[38px] shrink-0 items-center rounded-full px-3 py-1 text-[11px] sm:text-xs font-bold text-[#C9182B] hover:underline whitespace-nowrap"
          >
            <span className="sm:hidden">Matrix →</span>
            <span className="hidden sm:inline">View Fare Matrix →</span>
          </Link>
        </div>

        <div className="grid grid-cols-2 gap-2.5 sm:gap-4 lg:grid-cols-4">
          {transportTypes.map((tt) => (
            <GlassCard key={tt.id} variant="strong" hoverable className="p-3.5 sm:p-5 flex items-center gap-3">
              <div className="liquid-icon-ring flex h-10 w-10 sm:h-11 sm:w-11 shrink-0 items-center justify-center rounded-full text-[#C9182B]">
                <TransportModeIcon code={tt.code} className="h-4 w-4 sm:h-5 sm:w-5" />
              </div>
              <h3 className="font-display text-sm sm:text-base font-bold text-[#29262B] leading-snug">
                {tt.name}
              </h3>
            </GlassCard>
          ))}
        </div>
      </section>

      {/* 3. FEATURED CITIZEN ROUTES */}
      <section className="space-y-3 sm:space-y-4">
        <div className="glass-surface liquid-glass-sheen rounded-[20px] sm:rounded-[26px] px-3.5 py-2.5 sm:px-5 sm:py-4 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <span aria-hidden="true" className="h-4 sm:h-5 w-1 shrink-0 rounded-full bg-[#C9182B]" />
            <h2 className="font-display text-sm sm:text-2xl font-extrabold text-[#29262B] truncate">
              Featured Oriental Mindoro Routes
            </h2>
          </div>
          <Link
            to="/fare-search"
            className="glass-pill-tile inline-flex min-h-[32px] sm:min-h-[38px] shrink-0 items-center rounded-full px-3 py-1 text-[11px] sm:text-xs font-bold text-[#C9182B] hover:underline whitespace-nowrap"
          >
            <span className="sm:hidden">Search →</span>
            <span className="hidden sm:inline">Search Any Route →</span>
          </Link>
        </div>

        {featuredGuides.length === 0 ? (
          <EmptyStateCard
            icon={FileCheck2}
            title="No commuter fare guides published yet"
            description="Browse the interactive 15-LGU route map or search commuter fare estimates across Oriental Mindoro."
            action={
              <div className="flex flex-wrap justify-center gap-2">
                <Link to="/fare-matrix">
                  <GlassButton variant="primary" size="sm">
                    View Fare Matrix
                  </GlassButton>
                </Link>
                <Link to="/routes">
                  <GlassButton variant="secondary" size="sm">
                    Explore Route Map
                  </GlassButton>
                </Link>
              </div>
            }
          />
        ) : (
          <div className="grid gap-3 sm:gap-4 md:grid-cols-2 lg:grid-cols-4">
            {featuredGuides.map((fare) => (
              <Link
                key={fare.id}
                to={`/fare-search?origin=${encodeURIComponent(fare.origin_municipality_id)}&destination=${encodeURIComponent(fare.destination_municipality_id)}`}
                className="block"
              >
                <GlassCard variant="strong" hoverable className="p-4 sm:p-5 space-y-2.5 sm:space-y-3 h-full">
                  <FareStatusBadge status={fare.status} compact />
                  <div>
                    <p className="text-xs font-semibold text-[#B51224]">
                      {fare.transport_type?.name} • {fare.passenger_category}
                    </p>
                    <h3 className="font-display text-sm sm:text-base font-bold text-[#29262B]">
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

      {/* 4. ORIENTAL MINDORO COVERAGE (ALL 15 LGUs) */}
      <section className="glass-surface liquid-glass-sheen rounded-[24px] sm:rounded-[30px] p-3.5 sm:p-6 space-y-3 sm:space-y-4">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <span aria-hidden="true" className="h-4 sm:h-5 w-1 shrink-0 rounded-full bg-[#C9182B]" />
            <h2 className="font-display text-sm sm:text-2xl font-extrabold text-[#29262B] truncate">
              15 Oriental Mindoro LGUs
            </h2>
          </div>
          <Link
            to="/municipalities"
            className="glass-pill-tile inline-flex min-h-[32px] sm:min-h-[38px] shrink-0 items-center rounded-full px-3 py-1 text-[11px] sm:text-xs font-bold text-[#C9182B] hover:underline whitespace-nowrap"
          >
            <span className="sm:hidden">All 15 →</span>
            <span className="hidden sm:inline">Full LGU Directory →</span>
          </Link>
        </div>

        <div className="grid grid-cols-2 gap-2 sm:gap-2.5 sm:grid-cols-3 md:grid-cols-5">
          {municipalities.map((m) => (
            <Link
              key={m.id}
              to={`/fare-search?origin=${encodeURIComponent(m.id)}`}
              className={`glass-pill-tile group flex min-h-[42px] items-center justify-between gap-1.5 rounded-full px-3 sm:px-4 py-2 text-xs font-bold text-[#29262B] transition hover:bg-gradient-to-b hover:from-[#C9182B] hover:to-[#B51224] hover:text-white ${
                m.is_capital ? 'col-span-2 sm:col-span-1' : ''
              }`}
            >
              <span className="flex items-center gap-1.5 sm:gap-2 truncate min-w-0">
                <MapPin className="h-3.5 w-3.5 shrink-0 text-[#C9182B] group-hover:text-white" />
                <span className="truncate">{m.name}</span>
              </span>
              <span className="text-[10px] text-[#5B555E] group-hover:text-white/90 shrink-0">
                {m.is_capital ? 'Provincial Capital' : m.district.split(' ')[0]}
              </span>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
