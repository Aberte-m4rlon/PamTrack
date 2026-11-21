import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useMunicipalities } from '@/hooks/useReferenceData';
import { FareSearchWidget } from '@/components/fare/FareSearchWidget';
import { OrientalMindoroMap } from '@/components/map/OrientalMindoroMap';
import { GlassCard } from '@/components/glass/GlassPrimitives';

export function FareSearchPage() {
  const [searchParams] = useSearchParams();
  const { data: muniRes } = useMunicipalities();
  const municipalities = muniRes?.data ?? [];

  const [originId, setOriginId] = useState(searchParams.get('origin') ?? '');
  const [destinationId, setDestinationId] = useState(searchParams.get('destination') ?? '');

  return (
    <div className="space-y-6">
      <GlassCard variant="strong" className="p-6 space-y-2">
        <p className="text-xs font-bold uppercase tracking-widest text-[#176B4B]">
          Official &amp; Community Fare Lookup
        </p>
        <h1 className="font-display text-2xl font-extrabold text-[#183329] sm:text-3xl">
          Route &amp; Fare Finder
        </h1>
        <p className="text-sm text-[#183329]/80">
          Search verified official fares and reviewed community estimates across Oriental Mindoro.
          If no official fare has been verified for a corridor, the system explicitly states that
          none is available.
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

      <GlassCard variant="surface" className="p-4 sm:p-5 space-y-3">
        <h2 className="font-display text-lg font-bold text-[#183329]">
          Corridor Map Preview
        </h2>
        <OrientalMindoroMap
          municipalities={municipalities}
          originId={originId}
          destinationId={destinationId}
          onSelectOrigin={setOriginId}
          onSelectDestination={setDestinationId}
          heightClassName="h-[360px]"
        />
      </GlassCard>
    </div>
  );
}
