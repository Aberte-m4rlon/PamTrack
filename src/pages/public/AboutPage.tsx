import { ExternalLink, FileCheck2, Mail, PhoneCall, ShieldCheck } from 'lucide-react';
import { OFFICIAL_REGULATORY_REFERENCES } from '@/data/orientalMindoro';
import { GlassCard } from '@/components/glass/GlassPrimitives';

export function AboutPage() {
  return (
    <div className="space-y-6">
      <GlassCard variant="strong" className="p-6 sm:p-8 space-y-3">
        <p className="text-xs font-bold uppercase tracking-widest text-[#DC2626]">
          Pangmamamayan • About Pamasahe Tracker
        </p>
        <h1 className="font-display text-3xl font-extrabold text-[#24191D]">
          Citizen-Driven Fare Monitoring for Oriental Mindoro
        </h1>
        <p className="text-sm leading-relaxed text-[#4B3B40] max-w-2xl">
          <strong className="text-[#24191D]">Pamasahe Tracker</strong> provides commuter fare guides
          and OpenStreetMap routes across all 15 Oriental Mindoro LGUs.
        </p>
      </GlassCard>

      <div className="grid gap-4 md:grid-cols-2">
        <GlassCard variant="strong" className="p-6 space-y-3">
          <div className="flex items-center gap-2 text-[#DC2626]">
            <ShieldCheck className="h-5 w-5" />
            <h2 className="font-display text-lg font-bold text-[#24191D]">Core Principles</h2>
          </div>
          <ul className="list-disc pl-5 space-y-2 text-sm text-[#4B3B40]">
            <li>
              <strong className="text-[#24191D]">Verified Official Sources:</strong> Published
              with document reference and date.
            </li>
            <li>
              <strong className="text-[#24191D]">Clear Community Estimates:</strong> Crowd-sourced
              budget guides labeled separately.
            </li>
            <li>
              <strong className="text-[#24191D]">Real Geospatial Data:</strong> Live coordinates and
              OSRM routing across all 15 LGUs.
            </li>
          </ul>
        </GlassCard>

        <GlassCard variant="strong" className="p-6 space-y-3">
          <div className="flex items-center gap-2 text-[#DC2626]">
            <PhoneCall className="h-5 w-5" />
            <h2 className="font-display text-lg font-bold text-[#24191D]">Contact &amp; Official Hotlines</h2>
          </div>
          <div className="space-y-2.5 text-sm text-[#78716C]">
            <p className="flex items-center gap-2">
              <PhoneCall className="h-4 w-4 text-[#DC2626]" />
              <span>
                <strong className="text-[#24191D]">LTFRB 24/7 Commuter Hotline:</strong> 1342 (Overcharging &amp; Franchise
                Complaints)
              </span>
            </p>
            <p className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-[#DC2626]" />
              <span>
                <strong className="text-[#24191D]">Platform Support:</strong> support@pamasahetracker.ormindoro.example
              </span>
            </p>
            <p className="text-xs text-[#78716C]">
              For municipal tricycle ordinance inquiries, contact the Sangguniang Bayan or City
              Tricycle Regulatory Unit of the respective municipality.
            </p>
          </div>
        </GlassCard>
      </div>

      <GlassCard variant="strong" className="p-6 space-y-4">
        <div className="flex items-center gap-2 text-[#DC2626]">
          <FileCheck2 className="h-5 w-5" />
          <h2 className="font-display text-xl font-bold text-[#24191D]">Official Information Sources</h2>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          {OFFICIAL_REGULATORY_REFERENCES.map((ref) => (
            <div
              key={ref.authority}
              className="glass-pill-tile rounded-[22px] p-4 space-y-1.5"
            >
              <p className="text-xs font-bold uppercase tracking-wider text-[#DC2626]">
                {ref.authority}
              </p>
              <h3 className="font-bold text-sm text-[#24191D]">{ref.title}</h3>
              <p className="text-xs text-[#78716C]">{ref.description}</p>
              <a
                href={ref.url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 pt-1 text-xs font-bold text-[#B91C1C] hover:underline"
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
