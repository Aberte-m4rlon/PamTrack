import { Link } from 'react-router-dom';
import { Building2, Compass, MapPin, Search } from 'lucide-react';
import { useMunicipalities } from '@/hooks/useReferenceData';
import { GlassButton, GlassCard, GlassSkeleton } from '@/components/glass/GlassPrimitives';

export function MunicipalitiesPage() {
  const { data: muniRes, isLoading } = useMunicipalities();
  const municipalities = muniRes?.data ?? [];

  return (
    <div className="space-y-6">
      <GlassCard variant="strong" className="p-6 space-y-2">
        <p className="text-xs font-bold uppercase tracking-widest text-[#C9182B]">
          Complete Provincial Coverage
        </p>
        <h1 className="font-display text-2xl font-extrabold text-[#29262B] sm:text-3xl">
          Oriental Mindoro Municipality Directory
        </h1>
        <p className="text-sm text-[#343039]">
          Quick links to fares and maps across Calapan City and all 14 municipalities.
        </p>
      </GlassCard>

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-3">
          {Array.from({ length: 6 }).map((_, idx) => (
            <GlassSkeleton key={idx} className="h-44" />
          ))}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {municipalities.map((m) => (
            <GlassCard key={m.id} variant="strong" hoverable className="p-5 flex flex-col justify-between gap-4">
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
