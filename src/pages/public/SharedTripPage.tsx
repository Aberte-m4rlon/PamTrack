import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { MapContainer, Marker, Popup, TileLayer } from 'react-leaflet';
import { AlertTriangle, Clock, Radio, ShieldCheck } from 'lucide-react';
import { fetchSharedTripStatus } from '@/services/pamasaheApi';
import { formatDurationSeconds } from '@/lib/gpsUtils';
import { formatDateTimeSafe } from '@/lib/utils';
import {
  EmptyStateCard,
  GlassCard,
  GlassSkeleton,
} from '@/components/glass/GlassPrimitives';

export function SharedTripPage() {
  const { token } = useParams<{ token: string }>();

  const { data, isLoading } = useQuery({
    queryKey: ['sharedTrip', token],
    queryFn: () => fetchSharedTripStatus(token!),
    enabled: Boolean(token),
    refetchInterval: 10000,
  });

  if (isLoading) return <GlassSkeleton className="h-64" />;

  if (!data?.available) {
    return (
      <EmptyStateCard
        icon={ShieldCheck}
        title="Shared Trip Unavailable"
        description={
          data?.reason ||
          'This location sharing link is invalid, has expired, or was revoked by the commuter.'
        }
      />
    );
  }

  return (
    <div className="space-y-6">
      <GlassCard variant="rose" className="p-4 sm:p-6 space-y-2">
        <div className="glass-pill-tile inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold uppercase text-[#C9182B]">
          <Radio className="h-3.5 w-3.5 animate-pulse" />
          Temporary Trusted Trip Share
        </div>
        <h1 className="font-display text-xl sm:text-2xl font-extrabold text-[#29262B]">
          {data.commuter_name}&apos;s Trip: {data.origin_name} → {data.destination_name}
        </h1>
        <p className="text-xs text-[#343039] font-medium">
          Mode: {data.transport_mode ?? 'Public Transport'} • Status: {data.trip_status} • Link
          expires {formatDateTimeSafe(data.expires_at ?? null)}
        </p>
      </GlassCard>

      <div className="grid gap-4 sm:grid-cols-3">
        <GlassCard variant="strong" className="p-4">
          <p className="text-xs font-bold uppercase text-[#777078]">Distance Covered</p>
          <p className="font-display text-2xl font-extrabold text-[#C9182B]">
            {(data.distance_km ?? 0).toFixed(2)} km
          </p>
        </GlassCard>
        <GlassCard variant="strong" className="p-4">
          <p className="text-xs font-bold uppercase text-[#777078]">Elapsed Time</p>
          <p className="font-display text-2xl font-extrabold text-[#C9182B] flex items-center gap-1.5">
            <Clock className="h-5 w-5" />
            {formatDurationSeconds(data.duration_seconds ?? 0)}
          </p>
        </GlassCard>
        <GlassCard variant="strong" className="p-4">
          <p className="text-xs font-bold uppercase text-[#777078]">Route Check</p>
          <p className="font-bold text-sm text-[#29262B]">
            {data.deviation_detected ? (
              <span className="inline-flex items-center gap-1 text-[#C9182B]">
                <AlertTriangle className="h-4 w-4" /> Route Deviation Flagged
              </span>
            ) : (
              'On planned corridor'
            )}
          </p>
        </GlassCard>
      </div>

      {data.current_latitude && data.current_longitude && (
        <GlassCard variant="surface" className="p-4">
          <div className="h-[380px] overflow-hidden rounded-3xl">
            <MapContainer
              center={[data.current_latitude, data.current_longitude]}
              zoom={13}
              className="h-full w-full"
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              <Marker position={[data.current_latitude, data.current_longitude]}>
                <Popup>{data.commuter_name}&apos;s latest shared GPS update</Popup>
              </Marker>
            </MapContainer>
          </div>
        </GlassCard>
      )}
    </div>
  );
}
