import { Building, ExternalLink, PhoneCall, ShieldCheck } from 'lucide-react';
import { useGovernmentAgencies } from '@/hooks/useReferenceData';
import { formatDateSafe } from '@/lib/utils';
import { GlassCard, GlassSkeleton } from '@/components/glass/GlassPrimitives';

export function AuthoritiesDirectoryPage() {
  const { data: agencies, isLoading } = useGovernmentAgencies();

  return (
    <div className="space-y-6">
      <GlassCard variant="strong" className="p-6 space-y-2">
        <p className="text-xs font-bold uppercase tracking-widest text-[#C9182B]">
          Verified Official Destinations
        </p>
        <h1 className="font-display text-2xl font-extrabold text-[#29262B] sm:text-3xl">
          Reporting Authority Directory
        </h1>
        <p className="text-sm text-[#343039]">
          Official portals for transport complaints in Oriental Mindoro. Pamasahe Tracker is
          independent of LTFRB, LTO, PNP, and LGUs.
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
                  <div className="glass-pill-tile rounded-2xl p-2.5 text-[#C9182B]">
                    <Building className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className="font-display text-lg font-extrabold text-[#29262B]">
                      {ag.agency_name}
                    </h2>
                    <p className="text-xs font-semibold text-[#B51224]">{ag.jurisdiction}</p>
                  </div>
                </div>
              </div>

              <div className="glass-pill-tile rounded-[20px] p-3 text-xs space-y-1.5">
                <p className="flex items-start gap-1.5 font-semibold text-[#C9182B]">
                  <PhoneCall className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  <span>{ag.verified_contact_information}</span>
                </p>
                <p className="text-[#343039]">{ag.submission_instructions}</p>
              </div>

              <div className="flex flex-wrap gap-1.5">
                {ag.categories_handled.slice(0, 6).map((cat) => (
                  <span
                    key={cat}
                    className="glass-pill-tile rounded-full px-2.5 py-0.5 text-[10px] font-bold text-[#B51224]"
                  >
                    {cat}
                  </span>
                ))}
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-xs">
                <span className="inline-flex items-center gap-1 text-[#777078]">
                  <ShieldCheck className="h-3.5 w-3.5 text-[#C9182B]" />
                  Verified: {formatDateSafe(ag.last_verified_at)}
                </span>
                <a
                  href={ag.official_complaint_url || ag.official_website}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 font-bold text-[#C9182B] hover:underline"
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
