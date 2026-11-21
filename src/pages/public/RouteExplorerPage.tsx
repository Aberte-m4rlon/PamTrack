import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Compass, MapPin, Route as RouteIcon, Search } from 'lucide-react';
import { useMunicipalities, useRoutes } from '@/hooks/useReferenceData';
import { OrientalMindoroMap } from '@/components/map/OrientalMindoroMap';
import {
  EmptyStateCard,
  GlassButton,
  GlassCard,
  GlassSkeleton,
  TransportModeIcon,
} from '@/components/glass/GlassPrimitives';

export function RouteExplorerPage() {
  const { data: muniRes, isLoading: muniLoading } = useMunicipalities();
  const { data: routes, isLoading: routesLoading } = useRoutes();

  const municipalities = muniRes?.data ?? [];
  const [originId, setOriginId] = useState('');
  const [destinationId, setDestinationId] = useState('');

  return (
    <div className="space-y-6">
      <GlassCard variant="strong" className="p-6 space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-[#176B4B]">
              Interactive OpenStreetMap Explorer
            </p>
            <h1 className="font-display text-2xl font-extrabold text-[#183329] sm:text-3xl">
              Oriental Mindoro Route Map
            </h1>
            <p className="text-sm text-[#183329]/80">
              Select any two of the 15 municipalities/city to visualize real OSRM road geometry and
              search available fares.
            </p>
          </div>
          {originId && destinationId && originId !== destinationId && (
            <Link
              to={`/fare-search?origin=${encodeURIComponent(originId)}&destination=${encodeURIComponent(destinationId)}`}
            >
              <GlassButton variant="primary">
                <Search className="h-4 w-4" />
                Check Fares for Selected Route
              </GlassButton>
            </Link>
          )}
        </div>
      </GlassCard>

      <GlassCard variant="surface" className="p-4 sm:p-5 space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-[#183329]/75">
              Map Origin
            </label>
            <select
              value={originId}
              onChange={(e) => setOriginId(e.target.value)}
              className="glass-input w-full rounded-2xl px-3.5 py-2 text-sm font-medium"
            >
              <option value="">Choose origin on map or dropdown...</option>
              {municipalities.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name} ({m.district})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-[#183329]/75">
              Map Destination
            </label>
            <select
              value={destinationId}
              onChange={(e) => setDestinationId(e.target.value)}
              className="glass-input w-full rounded-2xl px-3.5 py-2 text-sm font-medium"
            >
              <option value="">Choose destination on map or dropdown...</option>
              {municipalities.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name} ({m.district})
                </option>
              ))}
            </select>
          </div>
        </div>

        {muniLoading ? (
          <GlassSkeleton className="h-[430px]" />
        ) : (
          <OrientalMindoroMap
            municipalities={municipalities}
            originId={originId}
            destinationId={destinationId}
            onSelectOrigin={setOriginId}
            onSelectDestination={setDestinationId}
            heightClassName="h-[460px]"
          />
        )}
      </GlassCard>

      {/* Registered Route Catalog */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 px-1">
          <RouteIcon className="h-4 w-4 text-[#176B4B]" />
          <h2 className="font-display text-xl font-extrabold text-[#183329]">
            Registered Transport Corridors
          </h2>
        </div>

        {routesLoading ? (
          <div className="grid gap-4 md:grid-cols-2">
            <GlassSkeleton className="h-32" />
            <GlassSkeleton className="h-32" />
          </div>
        ) : !routes || routes.length === 0 ? (
          <EmptyStateCard
            icon={Compass}
            title="No transport corridors registered in the database yet"
            description="Select any two municipalities above to compute live OpenStreetMap road routing, or sign in as an Administrator to publish verified routes."
          />
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {routes.map((route) => (
              <GlassCard key={route.id} variant="strong" hoverable className="p-4 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-[#DFF7E8] px-2.5 py-1 text-[11px] font-bold text-[#176B4B]">
                    <TransportModeIcon code={route.transport_type?.code} className="h-3.5 w-3.5" />
                    {route.transport_type?.name}
                  </span>
                  <span className="text-[11px] font-mono text-[#183329]/70">
                    {route.route_code}
                  </span>
                </div>
                <h3 className="font-bold text-sm text-[#183329]">{route.route_name}</h3>
                <p className="flex items-center gap-1.5 text-xs text-[#183329]/80">
                  <MapPin className="h-3.5 w-3.5 text-[#24966A]" />
                  {route.origin?.name} → {route.destination?.name}
                </p>
                {route.distance_km && (
                  <p className="text-xs font-semibold text-[#176B4B]">
                    Distance: {route.distance_km} km ({route.distance_source ?? 'survey'})
                  </p>
                )}
                <div className="pt-1 flex justify-between items-center">
                  <button
                    type="button"
                    onClick={() => {
                      setOriginId(route.origin_municipality_id);
                      setDestinationId(route.destination_municipality_id);
                    }}
                    className="text-xs font-bold text-[#24966A] hover:underline"
                  >
                    Show on Map
                  </button>
                  <Link
                    to={`/fare-search?origin=${route.origin_municipality_id}&destination=${route.destination_municipality_id}`}
                    className="text-xs font-bold text-[#176B4B] hover:underline"
                  >
                    Check Fares →
                  </Link>
                </div>
              </GlassCard>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
