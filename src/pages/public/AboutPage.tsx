import { ExternalLink, FileCheck2, Mail, PhoneCall, ShieldCheck } from 'lucide-react';
import { OFFICIAL_REGULATORY_REFERENCES } from '@/data/orientalMindoro';
import { GlassCard } from '@/components/glass/GlassPrimitives';

export function AboutPage() {
  return (
    <div className="space-y-6">
      <GlassCard variant="strong" className="p-6 sm:p-8 space-y-3">
        <p className="text-xs font-bold uppercase tracking-widest text-[#176B4B]">
          About Pamasahe Tracker
        </p>
        <h1 className="font-display text-3xl font-extrabold text-[#183329]">
          Transparent Transportation Fare Monitoring for Oriental Mindoro
        </h1>
        <p className="text-sm leading-relaxed text-[#183329]/85 max-w-3xl">
          <strong>Pamasahe Tracker – Oriental Mindoro</strong> (&ldquo;Tamang Pamasahe. Ligtas na
          Biyahe.&rdquo;) empowers commuters, transport operators, and local authorities across
          Calapan City and all 14 municipalities to view verified fare matrices, submit fare
          observations with supporting evidence, and audit official tariff updates.
        </p>
      </GlassCard>

      <div className="grid gap-4 md:grid-cols-2">
        <GlassCard variant="strong" className="p-6 space-y-3">
          <div className="flex items-center gap-2 text-[#176B4B]">
            <ShieldCheck className="h-5 w-5" />
            <h2 className="font-display text-lg font-bold">Strict Integrity Principles</h2>
          </div>
          <ul className="list-disc pl-5 space-y-2 text-sm text-[#183329]/85">
            <li>
              <strong>No Invented Official Fares:</strong> Official fares are published exclusively
              by verified administrators with an authoritative source document reference and
              effective date.
            </li>
            <li>
              <strong>Clear Community Estimate Separation:</strong> Approved commuter reports are
              labeled strictly as <em>Community Estimates</em> and never auto-promoted to Official.
            </li>
            <li>
              <strong>Real Geospatial Data:</strong> All 15 LGUs use verified coordinates and live
              OpenStreetMap / OSRM routing rather than fabricated distance formulas.
            </li>
          </ul>
        </GlassCard>

        <GlassCard variant="strong" className="p-6 space-y-3">
          <div className="flex items-center gap-2 text-[#176B4B]">
            <PhoneCall className="h-5 w-5" />
            <h2 className="font-display text-lg font-bold">Contact &amp; Official Hotlines</h2>
          </div>
          <div className="space-y-2.5 text-sm text-[#183329]/85">
            <p className="flex items-center gap-2">
              <PhoneCall className="h-4 w-4 text-[#24966A]" />
              <span>
                <strong>LTFRB 24/7 Commuter Hotline:</strong> 1342 (Overcharging &amp; Franchise
                Complaints)
              </span>
            </p>
            <p className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-[#24966A]" />
              <span>
                <strong>Platform Support:</strong> support@pamasahetracker.ormindoro.example
              </span>
            </p>
            <p className="text-xs text-[#183329]/75">
              For municipal tricycle ordinance inquiries, contact the Sangguniang Bayan or City
              Tricycle Regulatory Unit of the respective municipality.
            </p>
          </div>
        </GlassCard>
      </div>

      <GlassCard variant="strong" className="p-6 space-y-4">
        <div className="flex items-center gap-2 text-[#176B4B]">
          <FileCheck2 className="h-5 w-5" />
          <h2 className="font-display text-xl font-bold">Official Information Sources</h2>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          {OFFICIAL_REGULATORY_REFERENCES.map((ref) => (
            <div
              key={ref.authority}
              className="rounded-2xl border border-white/80 bg-white/75 p-4 space-y-1.5"
            >
              <p className="text-xs font-bold uppercase tracking-wider text-[#176B4B]">
                {ref.authority}
              </p>
              <h3 className="font-bold text-sm text-[#183329]">{ref.title}</h3>
              <p className="text-xs text-[#183329]/80">{ref.description}</p>
              <a
                href={ref.url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 pt-1 text-xs font-bold text-[#24966A] hover:underline"
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
