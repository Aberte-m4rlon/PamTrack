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
        <p className="text-xs font-bold uppercase tracking-widest text-[#DC2626]">
          Official &amp; Community Fare Lookup
        </p>
        <h1 className="font-display text-2xl font-extrabold text-[#24191D] sm:text-3xl">
          Route &amp; Fare Finder
        </h1>
        <p className="text-sm text-[#4B3B40]">
          Search commuter fare guides and 20% discounts across all 15 LGUs.
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
        <h2 className="font-display text-lg font-bold text-[#24191D]">
          Corridor Map Preview
        </h2>
        <OrientalMindoroMap
          municipalities={municipalities}
          originId={originId}
          destinationId={destinationId}
          onSelectOrigin={setOriginId}
          onSelectDestination={setDestinationId}
          heightClassName="h-[340px] sm:h-[360px]"
        />
      </GlassCard>
    </div>
  );
}
