import { ExternalLink, FileCheck2, Mail, PhoneCall, ShieldCheck } from 'lucide-react';
import { OFFICIAL_REGULATORY_REFERENCES } from '@/data/orientalMindoro';
import { GlassCard } from '@/components/glass/GlassPrimitives';

export function AboutPage() {
  return (
    <div className="space-y-4 sm:space-y-6">
      <GlassCard variant="strong" className="p-4 sm:p-8 space-y-2 sm:space-y-3">
        <p className="text-[11px] sm:text-xs font-bold uppercase tracking-widest text-[#C9182B]">
          Pangmamamayan • About Pamasahe Tracker
        </p>
        <h1 className="font-display text-xl leading-tight font-extrabold text-[#29262B] sm:text-3xl">
          Citizen-Driven Fare Monitoring for Oriental Mindoro
        </h1>
        <p className="text-xs sm:text-sm leading-relaxed text-[#343039] max-w-2xl">
          <strong className="text-[#29262B]">Pamasahe Tracker</strong> provides commuter fare guides
          and OpenStreetMap routes across all 15 Oriental Mindoro LGUs.
        </p>
      </GlassCard>

      <div className="grid gap-3.5 sm:gap-4 md:grid-cols-2">
        <GlassCard variant="strong" className="p-4 sm:p-6 space-y-3">
          <div className="flex items-center gap-2 text-[#C9182B]">
            <ShieldCheck className="h-5 w-5 shrink-0" />
            <h2 className="font-display text-base sm:text-lg font-bold text-[#29262B]">Core Principles</h2>
          </div>
          <ul className="list-disc pl-5 space-y-2 text-xs sm:text-sm text-[#343039]">
            <li>
              <strong className="text-[#29262B]">Verified Official Sources:</strong> Published
              with document reference and date.
            </li>
            <li>
              <strong className="text-[#29262B]">Clear Community Estimates:</strong> Crowd-sourced
              budget guides labeled separately.
            </li>
            <li>
              <strong className="text-[#29262B]">Real Geospatial Data:</strong> Live coordinates and
              OSRM routing across all 15 LGUs.
            </li>
          </ul>
        </GlassCard>

        <GlassCard variant="strong" className="p-4 sm:p-6 space-y-3">
          <div className="flex items-center gap-2 text-[#C9182B]">
            <PhoneCall className="h-5 w-5 shrink-0" />
            <h2 className="font-display text-base sm:text-lg font-bold text-[#29262B]">Contact &amp; Official Hotlines</h2>
          </div>
          <div className="space-y-2.5 text-xs sm:text-sm text-[#777078]">
            <p className="flex items-start gap-2">
              <PhoneCall className="mt-0.5 h-4 w-4 shrink-0 text-[#C9182B]" />
              <span className="min-w-0">
                <strong className="text-[#29262B]">LTFRB 24/7 Commuter Hotline:</strong> 1342 (Overcharging &amp; Franchise
                Complaints)
              </span>
            </p>
            <p className="flex items-start gap-2">
              <Mail className="mt-0.5 h-4 w-4 shrink-0 text-[#C9182B]" />
              <span className="min-w-0 break-all">
                <strong className="text-[#29262B]">Platform Support:</strong> support@pamasahetracker.ormindoro.example
              </span>
            </p>
            <p className="text-xs text-[#777078]">
              For municipal tricycle ordinance inquiries, contact the Sangguniang Bayan or City
              Tricycle Regulatory Unit of the respective municipality.
            </p>
          </div>
        </GlassCard>
      </div>

      <GlassCard variant="strong" className="p-4 sm:p-6 space-y-3.5 sm:space-y-4">
        <div className="flex items-center gap-2 text-[#C9182B]">
          <FileCheck2 className="h-5 w-5 shrink-0" />
          <h2 className="font-display text-lg sm:text-xl font-bold text-[#29262B]">Official Information Sources</h2>
        </div>
        <div className="grid gap-2.5 sm:gap-3 md:grid-cols-2">
          {OFFICIAL_REGULATORY_REFERENCES.map((ref) => (
            <div
              key={ref.authority}
              className="glass-pill-tile rounded-[18px] sm:rounded-[22px] p-3.5 sm:p-4 space-y-1.5"
            >
              <p className="text-xs font-bold uppercase tracking-wider text-[#C9182B]">
                {ref.authority}
              </p>
              <h3 className="font-bold text-sm text-[#29262B]">{ref.title}</h3>
              <p className="text-xs text-[#777078]">{ref.description}</p>
              <a
                href={ref.url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex min-h-[36px] items-center gap-1 pt-0.5 text-xs font-bold text-[#B51224] hover:underline"
              >
                Visit Official Portal <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          ))}
        </div>
      </GlassCard>
    </div>
  );
}
