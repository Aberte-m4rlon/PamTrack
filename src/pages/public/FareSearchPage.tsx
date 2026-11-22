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
    <div className="space-y-4 sm:space-y-6">
      <GlassCard variant="strong" className="p-4 sm:p-6 space-y-1.5 sm:space-y-2">
        <p className="text-[11px] sm:text-xs font-bold uppercase tracking-widest text-[#C9182B]">
          Official &amp; Community Fare Lookup
        </p>
        <h1 className="font-display text-xl leading-tight font-extrabold text-[#29262B] sm:text-3xl">
          Route &amp; Fare Finder
        </h1>
        <p className="text-xs sm:text-sm text-[#343039]">
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

      <GlassCard variant="surface" className="p-3.5 sm:p-5 space-y-3">
        <h2 className="font-display text-base sm:text-lg font-bold text-[#29262B]">
          Corridor Map Preview
        </h2>
        <OrientalMindoroMap
          municipalities={municipalities}
          originId={originId}
          destinationId={destinationId}
          onSelectOrigin={setOriginId}
          onSelectDestination={setDestinationId}
          heightClassName="h-[270px] sm:h-[360px]"
        />
      </GlassCard>
    </div>
  );
}
