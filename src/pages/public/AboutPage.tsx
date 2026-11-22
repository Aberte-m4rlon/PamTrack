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
        <p className="text-sm leading-relaxed text-[#78716C] max-w-3xl">
          <strong className="text-[#24191D]">Pamasahe Tracker – Oriental Mindoro</strong> (&ldquo;Tamang Pamasahe. Ligtas na
          Biyahe.&rdquo;) is built directly for everyday Mindoreño commuters across Calapan City
          and all 14 municipalities—providing crowd-sourced fare references across Multicab, UV
          Express, Bus, and Tricycle corridors with real OpenStreetMap routing and safety tools.
        </p>
      </GlassCard>

      <div className="grid gap-4 md:grid-cols-2">
        <GlassCard variant="strong" className="p-6 space-y-3">
          <div className="flex items-center gap-2 text-[#DC2626]">
            <ShieldCheck className="h-5 w-5" />
            <h2 className="font-display text-lg font-bold text-[#24191D]">Strict Integrity Principles</h2>
          </div>
          <ul className="list-disc pl-5 space-y-2 text-sm text-[#78716C]">
            <li>
              <strong className="text-[#24191D]">No Invented Official Fares:</strong> Official fares are published exclusively
              by verified administrators with an authoritative source document reference and
              effective date.
            </li>
            <li>
              <strong className="text-[#24191D]">Clear Community Estimate Separation:</strong> Approved commuter reports are
              labeled strictly as <em>Community Estimates</em> and never auto-promoted to Official.
            </li>
            <li>
              <strong className="text-[#24191D]">Real Geospatial Data:</strong> All 15 LGUs use verified coordinates and live
              OpenStreetMap / OSRM routing rather than fabricated distance formulas.
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
