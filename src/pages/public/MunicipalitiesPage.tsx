import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Building2, Compass, MapPin, Search } from 'lucide-react';
import { useMunicipalities } from '@/hooks/useReferenceData';
import { GlassButton, GlassCard, GlassSkeleton } from '@/components/glass/GlassPrimitives';

export function MunicipalitiesPage() {
  const { data: muniRes, isLoading } = useMunicipalities();
  const municipalities = muniRes?.data ?? [];
  const [districtFilter, setDistrictFilter] = useState<'all' | '1st District' | '2nd District'>('all');
  const [searchTerm, setSearchTerm] = useState('');

  const filteredMunicipalities = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return municipalities.filter((m) => {
      if (districtFilter !== 'all' && m.district !== districtFilter) return false;
      if (q && !`${m.name} ${m.district} ${m.description}`.toLowerCase().includes(q)) {
        return false;
      }
      return true;
    });
  }, [municipalities, districtFilter, searchTerm]);

  return (
    <div className="space-y-4 sm:space-y-6">
      <GlassCard variant="strong" className="p-4 sm:p-6 space-y-3">
        <div className="space-y-1.5">
          <p className="text-[11px] sm:text-xs font-bold uppercase tracking-widest text-[#C9182B]">
            Complete Provincial Coverage
          </p>
          <h1 className="font-display text-xl leading-tight font-extrabold text-[#29262B] sm:text-3xl">
            Oriental Mindoro Municipality Directory
          </h1>
          <p className="text-xs sm:text-sm text-[#343039]">
            Quick links to fares and maps across Calapan City and all 14 municipalities.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5 pt-1">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 sm:pb-0">
            {(['all', '1st District', '2nd District'] as const).map((dist) => (
              <button
                key={dist}
                type="button"
                onClick={() => setDistrictFilter(dist)}
                className={`min-h-[40px] shrink-0 whitespace-nowrap rounded-full px-3.5 py-2 text-xs font-semibold transition ${
                  districtFilter === dist
                    ? 'liquid-nav-active text-white'
                    : 'liquid-btn-glass text-[#29262B] hover:text-[#C9182B]'
                }`}
              >
                {dist === 'all' ? `All LGUs (${municipalities.length})` : dist}
              </button>
            ))}
          </div>

          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Find city or town..."
            aria-label="Search municipalities"
            className="glass-input min-h-[42px] w-full sm:w-56 rounded-2xl px-3.5 py-2 text-sm"
          />
        </div>
      </GlassCard>

      {isLoading ? (
        <div className="grid gap-3 sm:gap-4 md:grid-cols-3">
          {Array.from({ length: 6 }).map((_, idx) => (
            <GlassSkeleton key={idx} className="h-44" />
          ))}
        </div>
      ) : (
        <div className="grid gap-3 sm:gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredMunicipalities.map((m) => (
            <GlassCard key={m.id} variant="strong" hoverable className="p-4 sm:p-5 flex flex-col justify-between gap-3 sm:gap-4">
              <div className="space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div className="glass-pill-tile rounded-xl p-2 text-[#C9182B]">
                      {m.is_capital ? (
                        <Building2 className="h-4 w-4" />
                      ) : (
                        <MapPin className="h-4 w-4" />
                      )}
                    </div>
                    <div>
                      <h2 className="font-display text-lg font-extrabold text-[#29262B]">
                        {m.name}
                      </h2>
                      <p className="text-xs font-semibold text-[#B51224]">
                        {m.classification === 'component_city' ? 'Component City' : 'Municipality'} •{' '}
                        {m.district}
                      </p>
                    </div>
                  </div>
                  {m.is_capital && (
                    <span className="liquid-nav-active rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase text-white">
                      Capital
                    </span>
                  )}
                </div>

                <p className="text-xs leading-relaxed text-[#343039] line-clamp-2">{m.description}</p>
                <p className="text-[11px] font-mono text-[#777078]">
                  Coords: {m.latitude.toFixed(4)}° N, {m.longitude.toFixed(4)}° E
                </p>
              </div>

              <div className="flex gap-2 pt-1">
                <Link to={`/fare-search?origin=${encodeURIComponent(m.id)}`} className="flex-1">
                  <GlassButton variant="primary" size="sm" className="w-full">
                    <Search className="h-3.5 w-3.5" />
                    Check Fares
                  </GlassButton>
                </Link>
                <Link to="/routes">
                  <GlassButton variant="secondary" size="sm">
                    <Compass className="h-3.5 w-3.5" />
                    Map
                  </GlassButton>
                </Link>
              </div>
            </GlassCard>
          ))}
        </div>
      )}
    </div>
  );
}
