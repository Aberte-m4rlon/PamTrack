import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { LocateFixed, PlusCircle } from 'lucide-react';
import { useToast } from '@/contexts/ToastContext';
import {
  useAdminAggregatedAnalytics,
  useMunicipalities,
  useTransportStops,
  useTransportTypes,
} from '@/hooks/useReferenceData';
import { STOP_CATEGORY_LABELS } from '@/lib/gpsUtils';
import { upsertTransportStop } from '@/services/pamasaheApi';
import type { StopCategory } from '@/types/database';
import { GlassButton, GlassCard } from '@/components/glass/GlassPrimitives';

export function AdminLocationAnalyticsPage() {
  const { pushToast } = useToast();
  const queryClient = useQueryClient();

  const { data: analytics } = useAdminAggregatedAnalytics();
  const { data: muniRes } = useMunicipalities();
  const { data: transportRes } = useTransportTypes();
  const { data: stops } = useTransportStops(true);

  const municipalities = muniRes?.data ?? [];
  const transportTypes = transportRes?.data ?? [];

  const [stopName, setStopName] = useState('');
  const [muniId, setMuniId] = useState('');
  const [ttId, setTtId] = useState('');
  const [category, setCategory] = useState<StopCategory>('jeepney_stop');
  const [lat, setLat] = useState('');
  const [lng, setLng] = useState('');
  const [landmark, setLandmark] = useState('');
  const [sourceRef, setSourceRef] = useState('');

  const saveStopMut = useMutation({
    mutationFn: () =>
      upsertTransportStop({
        municipality_id: muniId,
        transport_type_id: ttId || null,
        stop_name: stopName.trim(),
        stop_category: category,
        latitude: Number(lat),
        longitude: Number(lng),
        address_or_landmark: landmark.trim() || null,
        source_reference: sourceRef.trim() || null,
        is_verified: true,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transportStops'] });
      setStopName('');
      setLat('');
      setLng('');
      setLandmark('');
      setSourceRef('');
      pushToast({ title: 'Verified transport stop saved', variant: 'success' });
    },
    onError: (err: Error) => {
      pushToast({ title: 'Save failed', description: err.message, variant: 'error' });
    },
  });

  return (
    <div className="space-y-6">
      <GlassCard variant="strong" className="p-6">
        <p className="text-xs font-bold uppercase tracking-widest text-[#176B4B]">
          Location Analytics &amp; Verified Terminal Registry
        </p>
        <h1 className="font-display text-2xl font-extrabold text-[#183329]">
          Location Analytics &amp; Verified Stops
        </h1>
        <p className="text-sm text-[#183329]/80">
          View non-personal municipality destination volume and publish verified real-world Oriental
          Mindoro terminals for Nearby Finder and Live Map.
        </p>
      </GlassCard>

      <div className="grid gap-6 lg:grid-cols-12">
        <GlassCard variant="strong" className="p-6 lg:col-span-5 space-y-3 h-fit">
          <h2 className="flex items-center gap-2 font-display text-lg font-bold text-[#183329]">
            <PlusCircle className="h-5 w-5 text-[#176B4B]" />
            Add Verified Terminal / Stop
          </h2>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              saveStopMut.mutate();
            }}
            className="space-y-2.5 text-xs"
          >
            <input
              type="text"
              required
              value={stopName}
              onChange={(e) => setStopName(e.target.value)}
              placeholder="Official Terminal / Stop Name"
              className="glass-input w-full rounded-xl px-3 py-2"
            />
            <div className="grid gap-2 sm:grid-cols-2">
              <select
                required
                value={muniId}
                onChange={(e) => setMuniId(e.target.value)}
                className="glass-input rounded-xl px-3 py-2"
              >
                <option value="">Municipality...</option>
                {municipalities.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as StopCategory)}
                className="glass-input rounded-xl px-3 py-2"
              >
                {Object.entries(STOP_CATEGORY_LABELS).map(([k, label]) => (
                  <option key={k} value={k}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
            <select
              value={ttId}
              onChange={(e) => setTtId(e.target.value)}
              className="glass-input w-full rounded-xl px-3 py-2"
            >
              <option value="">Primary Transport Type (optional)...</option>
              {transportTypes.map((tt) => (
                <option key={tt.id} value={tt.id}>
                  {tt.name}
                </option>
              ))}
            </select>
            <div className="grid gap-2 sm:grid-cols-2">
              <input
                type="number"
                step="0.000001"
                required
                value={lat}
                onChange={(e) => setLat(e.target.value)}
                placeholder="Latitude (12.0 - 14.0)"
                className="glass-input rounded-xl px-3 py-2"
              />
              <input
                type="number"
                step="0.000001"
                required
                value={lng}
                onChange={(e) => setLng(e.target.value)}
                placeholder="Longitude (120.5 - 122.0)"
                className="glass-input rounded-xl px-3 py-2"
              />
            </div>
            <input
              type="text"
              value={landmark}
              onChange={(e) => setLandmark(e.target.value)}
              placeholder="Address or Landmark"
              className="glass-input w-full rounded-xl px-3 py-2"
            />
            <input
              type="text"
              required
              value={sourceRef}
              onChange={(e) => setSourceRef(e.target.value)}
              placeholder="Verification Source (e.g., OSM / LGU Survey)"
              className="glass-input w-full rounded-xl px-3 py-2"
            />
            <GlassButton
              type="submit"
              variant="primary"
              className="w-full"
              disabled={saveStopMut.isPending}
            >
              Publish Verified Stop
            </GlassButton>
          </form>
        </GlassCard>

        <div className="lg:col-span-7 space-y-5">
          <GlassCard variant="strong" className="p-5 space-y-3">
            <h2 className="font-display text-lg font-bold text-[#183329]">
              Aggregated Destination Volume by Municipality
            </h2>
            {!analytics || analytics.municipality_destinations.length === 0 ? (
              <p className="text-xs text-[#183329]/75">
                No destination counts aggregated yet.
              </p>
            ) : (
              <div className="space-y-2">
                {analytics.municipality_destinations.map((m) => (
                  <div
                    key={m.municipality_name}
                    className="flex items-center justify-between rounded-2xl bg-white/75 px-3.5 py-2 text-xs font-bold"
                  >
                    <span>{m.municipality_name}</span>
                    <span className="text-[#176B4B]">{m.trip_count} trip(s)</span>
                  </div>
                ))}
              </div>
            )}
          </GlassCard>

          <GlassCard variant="strong" className="p-5 space-y-3">
            <h2 className="flex items-center gap-2 font-display text-lg font-bold text-[#183329]">
              <LocateFixed className="h-4 w-4 text-[#176B4B]" />
              Verified Transport Stops ({stops?.length ?? 0})
            </h2>
            <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
              {(stops ?? []).map((s) => (
                <div key={s.id} className="rounded-2xl bg-white/75 p-3 text-xs">
                  <p className="font-bold text-[#183329]">{s.stop_name}</p>
                  <p className="text-[#183329]/75">
                    {STOP_CATEGORY_LABELS[s.stop_category]} • {s.latitude.toFixed(4)}°N,{' '}
                    {s.longitude.toFixed(4)}°E
                  </p>
                </div>
              ))}
            </div>
          </GlassCard>
        </div>
      </div>
    </div>
  );
}
