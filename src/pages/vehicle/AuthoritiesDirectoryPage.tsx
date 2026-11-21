import { Building, ExternalLink, PhoneCall, ShieldCheck } from 'lucide-react';
import { useGovernmentAgencies } from '@/hooks/useReferenceData';
import { formatDateSafe } from '@/lib/utils';
import { GlassCard, GlassSkeleton } from '@/components/glass/GlassPrimitives';

export function AuthoritiesDirectoryPage() {
  const { data: agencies, isLoading } = useGovernmentAgencies();

  return (
    <div className="space-y-6">
      <GlassCard variant="strong" className="p-6 space-y-2">
        <p className="text-xs font-bold uppercase tracking-widest text-[#DC2626]">
          Verified Official Destinations
        </p>
        <h1 className="font-display text-2xl font-extrabold text-[#24191D] sm:text-3xl">
          Reporting Authority Directory
        </h1>
        <p className="text-sm text-[#78716C]">
          Authentic official portals and verified public complaint channels for public
          transportation violations in Oriental Mindoro. Pamasahe Tracker is an independent
          platform and is <strong className="text-[#24191D]">not</strong> an official LTFRB, LTO, PNP, or LGU system.
        </p>
      </GlassCard>

      {isLoading ? (
        <GlassSkeleton className="h-56" />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {(agencies ?? []).map((ag) => (
            <GlassCard key={ag.id} variant="strong" hoverable className="p-5 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <div className="rounded-2xl bg-[#FFE4E6] p-2.5 text-[#DC2626] border border-[#FCA5A5]/45">
                    <Building className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className="font-display text-lg font-extrabold text-[#24191D]">
                      {ag.agency_name}
                    </h2>
                    <p className="text-xs font-semibold text-[#B91C1C]">{ag.jurisdiction}</p>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl bg-[#FFF1F2]/90 border border-[#FFE4E6] p-3 text-xs space-y-1.5">
                <p className="flex items-start gap-1.5 font-semibold text-[#DC2626]">
                  <PhoneCall className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  <span>{ag.verified_contact_information}</span>
                </p>
                <p className="text-[#78716C]">{ag.submission_instructions}</p>
              </div>

              <div className="flex flex-wrap gap-1">
                {ag.categories_handled.slice(0, 6).map((cat) => (
                  <span
                    key={cat}
                    className="rounded-full bg-[#FFE4E6] px-2.5 py-0.5 text-[10px] font-bold text-[#B91C1C]"
                  >
                    {cat}
                  </span>
                ))}
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-xs">
                <span className="inline-flex items-center gap-1 text-[#78716C]">
                  <ShieldCheck className="h-3.5 w-3.5 text-[#16A34A]" />
                  Verified: {formatDateSafe(ag.last_verified_at)}
                </span>
                <a
                  href={ag.official_complaint_url || ag.official_website}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 font-bold text-[#DC2626] hover:underline"
                >
                  Open Official Website <ExternalLink className="h-3.5 w-3.5" />
                </a>
              </div>
            </GlassCard>
          ))}
        </div>
      )}
    </div>
  );
}
