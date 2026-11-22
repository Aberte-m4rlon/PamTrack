import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ExternalLink, MapPin, Navigation } from 'lucide-react';
import { useGps } from '@/contexts/GpsContext';
import { useMunicipalities, useTransportStops } from '@/hooks/useReferenceData';
import { sortStopsByDistance, STOP_CATEGORY_LABELS } from '@/lib/gpsUtils';
import type { StopCategory } from '@/types/database';
import { GpsConsentCard } from '@/components/gps/GpsConsentCard';
import {
  EmptyStateCard,
  GlassButton,
  GlassCard,
  GlassSkeleton,
} from '@/components/glass/GlassPrimitives';

export function NearbyTransportPage() {
  const { currentPosition } = useGps();
  const { data: muniRes } = useMunicipalities();
  const { data: stops, isLoading } = useTransportStops();

  const municipalities = muniRes?.data ?? [];
  const [fallbackMuniId, setFallbackMuniId] = useState(
    municipalities[0]?.id ?? 'lgu-calapan-city'
  );
  const [categoryFilter, setCategoryFilter] = useState<'all' | StopCategory>('all');

  const referencePoint = useMemo(() => {
    if (currentPosition) {
      return {
        label: 'Your Live GPS Position',
        lat: currentPosition.latitude,
        lng: currentPosition.longitude,
      };
    }
    const muni =
      municipalities.find((m) => m.id === fallbackMuniId) ?? municipalities[0];
    return muni
      ? {
          label: `${muni.name} Center (Fallback Reference)`,
          lat: muni.latitude,
          lng: muni.longitude,
        }
      : { label: 'Calapan City Center', lat: 13.407, lng: 121.1778 };
  }, [currentPosition, municipalities, fallbackMuniId]);

  const sortedStops = useMemo(() => {
    const filtered = (stops ?? []).filter((s) =>
      categoryFilter === 'all' ? true : s.stop_category === categoryFilter
    );
    return sortStopsByDistance(referencePoint.lat, referencePoint.lng, filtered);
  }, [stops, categoryFilter, referencePoint]);

  return (
    <div className="space-y-4 sm:space-y-6">
      <GlassCard variant="strong" className="p-4 sm:p-6 space-y-1.5 sm:space-y-2">
        <p className="text-[11px] sm:text-xs font-bold uppercase tracking-widest text-[#C9182B]">
          Verified Real-World Terminals
        </p>
        <h1 className="font-display text-xl leading-tight font-extrabold text-[#29262B] sm:text-3xl">
          Nearby Transportation Finder
        </h1>
        <p className="text-xs sm:text-sm text-[#777078]">
          Discover verified ports, multicab stops, bus terminals, UV Express hubs, and tricycle
          terminals sorted by distance from your GPS location.
        </p>
      </GlassCard>

      <GpsConsentCard compact />

      {/* Filter & Fallback Controls */}
      <GlassCard variant="surface" className="p-3.5 sm:p-4 flex flex-col sm:flex-row sm:flex-wrap sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 sm:pb-0 sm:flex-wrap">
          {(['all', 'port_hub', 'jeepney_stop', 'tricycle_terminal', 'uv_express_terminal', 'bus_terminal'] as const).map(
            (cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setCategoryFilter(cat)}
                className={`min-h-[40px] sm:min-h-[34px] shrink-0 whitespace-nowrap rounded-full px-3.5 py-2 sm:py-1.5 text-xs font-semibold transition ${
                  categoryFilter === cat
                    ? 'liquid-nav-active text-white'
                    : 'liquid-btn-glass text-[#29262B] hover:text-[#C9182B]'
                }`}
              >
                {cat === 'all' ? 'All Categories' : STOP_CATEGORY_LABELS[cat]}
              </button>
            )
          )}
        </div>

        {!currentPosition && (
          <div className="flex items-center gap-2 text-xs">
            <span className="font-semibold text-[#777078] shrink-0">Reference LGU:</span>
            <select
              value={fallbackMuniId}
              onChange={(e) => setFallbackMuniId(e.target.value)}
              className="glass-input min-h-[40px] flex-1 sm:flex-initial rounded-xl px-3 py-1.5 text-xs font-semibold"
            >
              {municipalities.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </div>
        )}
      </GlassCard>

      <p className="px-1 text-xs font-semibold text-[#777078]">
        Sorting distance relative to: <strong className="text-[#29262B]">{referencePoint.label}</strong>
      </p>

      {isLoading ? (
        <GlassSkeleton className="h-48" />
      ) : sortedStops.length === 0 ? (
        <EmptyStateCard
          icon={Navigation}
          title="No verified stops match this category"
          description="Only verified real-world Oriental Mindoro terminals and ports are listed here. Administrators can add newly verified terminals from the Admin Location & Stops console."
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {sortedStops.map((stop) => (
            <GlassCard key={stop.id} variant="strong" hoverable className="p-5 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <span className="glass-pill-tile inline-block rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase text-[#C9182B]">
                    {STOP_CATEGORY_LABELS[stop.stop_category]}
                  </span>
                  <h2 className="mt-1.5 font-display text-lg font-bold text-[#29262B]">
                    {stop.stop_name}
                  </h2>
                </div>
                <div className="liquid-nav-active rounded-2xl px-3 py-1.5 text-right text-white">
                  <p className="font-display text-base font-extrabold leading-none">
                    {stop.distanceKm} km
                  </p>
                  <p className="text-[10px] opacity-90">away</p>
                </div>
              </div>

              {stop.address_or_landmark && (
                <p className="flex items-center gap-1.5 text-xs font-semibold text-[#B51224]">
                  <MapPin className="h-3.5 w-3.5 shrink-0" />
                  {stop.address_or_landmark}
                </p>
              )}

              {stop.operating_notes && (
                <p className="text-xs leading-relaxed text-[#777078]">{stop.operating_notes}</p>
              )}

              <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-xs">
                <span className="text-[11px] text-[#777078]">
                  Source: {stop.source_reference || 'Verified Registry'}
                </span>
                <div className="flex gap-2">
                  <Link to="/live-map">
                    <GlassButton variant="secondary" size="sm">
                      View on Live Map
                    </GlassButton>
                  </Link>
                  <a
                    href={`https://www.openstreetmap.org/directions?engine=fossgis_osrm_car&route=${referencePoint.lat}%2C${referencePoint.lng}%3B${stop.latitude}%2C${stop.longitude}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <GlassButton variant="primary" size="sm">
                      Directions <ExternalLink className="h-3 w-3" />
                    </GlassButton>
                  </a>
                </div>
              </div>
            </GlassCard>
          ))}
        </div>
      )}
    </div>
  );
}
