import { useState } from 'react';
import { useMunicipalities } from '@/hooks/useReferenceData';
import { FareSearchWidget } from '@/components/fare/FareSearchWidget';
import { OrientalMindoroMap } from '@/components/map/OrientalMindoroMap';
import { GlassCard } from '@/components/glass/GlassPrimitives';

export function CommuterRouteFinderPage() {
  const { data: muniRes } = useMunicipalities();
  const municipalities = muniRes?.data ?? [];
  const [originId, setOriginId] = useState('');
  const [destinationId, setDestinationId] = useState('');

  return (
    <div className="space-y-6">
      <GlassCard variant="strong" className="p-6 space-y-1.5">
        <p className="text-xs font-bold uppercase tracking-widest text-[#176B4B]">
          Commuter Portal
        </p>
        <h1 className="font-display text-2xl font-extrabold text-[#183329]">
          Interactive Route Finder
        </h1>
        <p className="text-sm text-[#183329]/80">
          Pick origin and destination via form or map pins, inspect OSRM driving route distance,
          and save favorite trips.
        </p>
      </GlassCard>

      <FareSearchWidget
        initialOriginId={originId}
        initialDestinationId={destinationId}
        onSelectionChange={(o, d) => {
          setOriginId(o);
          setDestinationId(d);
        }}
      />

      <GlassCard variant="surface" className="p-5 space-y-3">
        <h2 className="font-display text-lg font-bold text-[#183329]">
          Oriental Mindoro Map Selector
        </h2>
        <OrientalMindoroMap
          municipalities={municipalities}
          originId={originId}
          destinationId={destinationId}
          onSelectOrigin={setOriginId}
          onSelectDestination={setDestinationId}
        />
      </GlassCard>
    </div>
  );
}
