import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Circle,
  CircleMarker,
  MapContainer,
  Marker,
  Polyline,
  Popup,
  TileLayer,
  useMap,
} from 'react-leaflet';
import L from 'leaflet';
import {
  AlertTriangle,
  Clock,
  Compass,
  ExternalLink,
  Gauge,
  History,
  LocateFixed,
  Navigation,
  Radio,
  ShieldCheck,
} from 'lucide-react';
import { ORIENTAL_MINDORO_MAP_CENTER } from '@/data/orientalMindoro';
import { useMunicipalities } from '@/hooks/useReferenceData';
import {
  classifyMovementState,
  estimateEtaMinutes,
  findNearestMunicipality,
  formatCompassDirection,
  formatDurationSeconds,
  resolveMovementTelemetry,
} from '@/lib/gpsUtils';
import {
  type LiveTripBreadcrumbPoint,
  type LiveTripTelemetryPacket,
  type SharedAlertBannerPayload,
  readStoredSharedHistory,
  readStoredSharedTrail,
  subscribeSharedTripStream,
  writeStoredSharedHistory,
  writeStoredSharedTrail,
} from '@/lib/liveTripShareChannel';
import { fetchSharedTripStatus } from '@/services/pamasaheApi';
import { formatDateSafe, formatDateTimeSafe, formatPhp, haversineDistanceKm } from '@/lib/utils';
import type { SharedTripHistoryItem } from '@/types/database';
import {
  EmptyStateCard,
  GlassButton,
  GlassCard,
  GlassSkeleton,
} from '@/components/glass/GlassPrimitives';

function createDirectionalLivePin(speedKmh: number, headingDeg: number | null) {
  const rotation = typeof headingDeg === 'number' && Number.isFinite(headingDeg) ? headingDeg : 0;
  const arrowHtml =
    typeof headingDeg === 'number' && Number.isFinite(headingDeg)
      ? `<div style="position:absolute;top:-7px;left:50%;transform:translateX(-50%) rotate(${rotation}deg);transform-origin:50% 17px;width:0;height:0;border-left:5px solid transparent;border-right:5px solid transparent;border-bottom:9px solid #29262B;"></div>`
      : '';

  return L.divIcon({
    className: 'shared-trip-live-pin',
    html: `<div style="position:relative;display:flex;flex-direction:column;align-items:center;">
      ${arrowHtml}
      <div style="width:20px;height:20px;border-radius:9999px;background:#C9182B;border:3px solid #FFFFFF;box-shadow:0 0 0 6px rgba(201,24,43,0.26),0 4px 12px rgba(41,38,43,0.28);"></div>
      <div style="margin-top:3px;padding:1px 6px;border-radius:9999px;background:#29262B;color:#FFFFFF;font-size:10px;font-weight:800;white-space:nowrap;box-shadow:0 2px 6px rgba(0,0,0,0.25);">${speedKmh.toFixed(0)} km/h</div>
    </div>`,
    iconSize: [54, 42],
    iconAnchor: [27, 10],
    popupAnchor: [0, -10],
  });
}

function SharedMapViewportController({
  lat,
  lng,
  follow,
}: {
  lat: number | null;
  lng: number | null;
  follow: boolean;
}) {
  const map = useMap();
  useEffect(() => {
    if (follow && lat !== null && lng !== null) {
      map.panTo([lat, lng], { animate: true });
    }
  }, [map, lat, lng, follow]);
  return null;
}

export function SharedTripPage() {
  const { token } = useParams<{ token: string }>();
  const { data: muniRes } = useMunicipalities();
  const municipalities = muniRes?.data ?? [];

  const [streamPacket, setStreamPacket] = useState<LiveTripTelemetryPacket | null>(null);
  const [streamConnected, setStreamConnected] = useState(false);
  const [trailPoints, setTrailPoints] = useState<LiveTripBreadcrumbPoint[]>(() =>
    token ? readStoredSharedTrail(token) : []
  );
  const [sharedHistory, setSharedHistory] = useState<SharedTripHistoryItem[]>(() =>
    token ? readStoredSharedHistory(token) : []
  );
  const [derivedSpeedKmh, setDerivedSpeedKmh] = useState(0);
  const [derivedMaxSpeedKmh, setDerivedMaxSpeedKmh] = useState(0);
  const [derivedHeadingDeg, setDerivedHeadingDeg] = useState<number | null>(null);
  const [lastUpdateMs, setLastUpdateMs] = useState<number | null>(null);
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [followLive, setFollowLive] = useState(true);
  const [alertBanner, setAlertBanner] = useState<SharedAlertBannerPayload | null>(null);

  const prevPollPointRef = useRef<{
    latitude: number;
    longitude: number;
    timestampMs: number;
  } | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['sharedTrip', token],
    queryFn: () => fetchSharedTripStatus(token!),
    enabled: Boolean(token),
    refetchInterval: (query) => {
      const result = query.state.data;
      if (!result || !result.available) return false;
      return result.trip_status === 'active' ? 3000 : false;
    },
  });

  // Subscribe to instant Realtime Broadcast packets once share token is validated as active
  useEffect(() => {
    if (!token || !data?.available) return;
    return subscribeSharedTripStream(
      token,
      true,
      (pkt) => {
        setStreamPacket(pkt);
        const pktMs = new Date(pkt.updatedAt).getTime();
        if (Number.isFinite(pktMs)) {
          setLastUpdateMs(pktMs);
        } else {
          setLastUpdateMs(Date.now());
        }
        setDerivedMaxSpeedKmh((prev) =>
          Math.max(prev, pkt.maxSpeedKmh ?? 0, pkt.speedKmh ?? 0)
        );
        if (pkt.alertBanner) {
          setAlertBanner(pkt.alertBanner);
        }
        if (Array.isArray(pkt.trail) && pkt.trail.length > 0) {
          setTrailPoints(pkt.trail.slice(-150));
          writeStoredSharedTrail(token, pkt.trail);
        }
        if (pkt.includeHistory === false) {
          setSharedHistory([]);
          writeStoredSharedHistory(token, []);
        } else if (Array.isArray(pkt.tripHistory) && pkt.tripHistory.length > 0) {
          setSharedHistory(pkt.tripHistory.slice(0, 10));
          writeStoredSharedHistory(token, pkt.tripHistory);
        }
      },
      setStreamConnected
    );
  }, [token, data?.available]);

  // Accumulate coordinates, history & compute derived speed/heading from DB polling fallback
  useEffect(() => {
    if (!token || !data?.available) return;

    if (
      streamPacket?.includeHistory !== false &&
      Array.isArray(data.trip_history) &&
      data.trip_history.length > 0
    ) {
      setSharedHistory(data.trip_history);
      writeStoredSharedHistory(token, data.trip_history);
    }

    if (Array.isArray(data.trail_points) && data.trail_points.length > 0) {
      const normalizedDbTrail: LiveTripBreadcrumbPoint[] = data.trail_points.map(
        (pt) => ({
          latitude: Number(pt.latitude),
          longitude: Number(pt.longitude),
          speedKmh: pt.speed_kmh !== null && pt.speed_kmh !== undefined ? Number(pt.speed_kmh) : 0,
          headingDeg:
            pt.heading_deg !== null && pt.heading_deg !== undefined
              ? Number(pt.heading_deg)
              : null,
          accuracyMeters:
            pt.accuracy_meters !== null && pt.accuracy_meters !== undefined
              ? Number(pt.accuracy_meters)
              : null,
          recordedAt: pt.recorded_at,
        })
      );
      setTrailPoints((prev) => {
        const merged =
          normalizedDbTrail.length >= prev.length ? normalizedDbTrail : prev;
        writeStoredSharedTrail(token, merged);
        return merged;
      });
    }

    const lat = data.current_latitude ?? null;
    const lng = data.current_longitude ?? null;
    if (lat === null || lng === null) return;

    const sampleMs = data.last_recorded_at
      ? new Date(data.last_recorded_at).getTime()
      : Date.now();
    const resolvedSampleMs = Number.isFinite(sampleMs) ? sampleMs : Date.now();

    const prevSample = prevPollPointRef.current;
    const moved =
      !prevSample ||
      haversineDistanceKm(prevSample.latitude, prevSample.longitude, lat, lng) >= 0.003;

    let computedSpeed =
      typeof data.latest_speed_kmh === 'number' && Number.isFinite(data.latest_speed_kmh)
        ? data.latest_speed_kmh
        : null;
    let computedHeading =
      typeof data.heading_deg === 'number' && Number.isFinite(data.heading_deg)
        ? data.heading_deg
        : null;

    if (prevSample && moved) {
      const derived = resolveMovementTelemetry({
        currentLat: lat,
        currentLng: lng,
        currentTimestampMs: resolvedSampleMs > prevSample.timestampMs ? resolvedSampleMs : Date.now(),
        hardwareSpeedMps: computedSpeed !== null ? computedSpeed / 3.6 : null,
        hardwareHeadingDeg: computedHeading,
        previousPoint: prevSample,
      });
      if (computedSpeed === null) computedSpeed = derived.speedKmh;
      if (computedHeading === null) computedHeading = derived.headingDeg;
    }

    const finalSpeed = computedSpeed ?? 0;
    setDerivedSpeedKmh(finalSpeed);
    setDerivedMaxSpeedKmh((prev) =>
      Math.max(prev, finalSpeed, data.max_speed_kmh ?? 0)
    );
    if (computedHeading !== null) {
      setDerivedHeadingDeg(computedHeading);
    }
    setLastUpdateMs((prev) => Math.max(prev ?? 0, resolvedSampleMs));

    if (!prevSample || moved) {
      prevPollPointRef.current = {
        latitude: lat,
        longitude: lng,
        timestampMs: Date.now(),
      };
      const point: LiveTripBreadcrumbPoint = {
        latitude: lat,
        longitude: lng,
        speedKmh: finalSpeed,
        headingDeg: computedHeading,
        accuracyMeters: data.accuracy_meters ?? null,
        recordedAt: new Date(resolvedSampleMs).toISOString(),
      };
      setTrailPoints((prev) => {
        const last = prev[prev.length - 1];
        if (
          last &&
          haversineDistanceKm(last.latitude, last.longitude, point.latitude, point.longitude) <
            0.003
        ) {
          return prev;
        }
        const next = [...prev, point].slice(-150);
        writeStoredSharedTrail(token, next);
        return next;
      });
    }
  }, [token, data]);

  // Local 1-second clock tick for elapsed time and signal freshness counter
  useEffect(() => {
    if (!data?.available) return;
    const id = setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(id);
  }, [data?.available]);

  const effectiveTripStatus =
    streamPacket?.tripStatus ?? data?.trip_status ?? 'active';

  // Choose freshest telemetry between Realtime Broadcast packet and DB RPC response
  const streamFresh =
    Boolean(streamPacket) &&
    (!data?.last_recorded_at ||
      new Date(streamPacket!.updatedAt).getTime() >=
        new Date(data.last_recorded_at).getTime());

  const currentLat = streamFresh
    ? streamPacket!.latitude
    : (data?.current_latitude ?? streamPacket?.latitude ?? null);
  const currentLng = streamFresh
    ? streamPacket!.longitude
    : (data?.current_longitude ?? streamPacket?.longitude ?? null);

  const currentSpeedKmh = streamFresh
    ? streamPacket!.speedKmh
    : (data?.latest_speed_kmh ?? derivedSpeedKmh);

  const currentHeadingDeg = streamFresh
    ? streamPacket!.headingDeg
    : (data?.heading_deg ?? derivedHeadingDeg);

  const distanceKm = Math.max(
    streamPacket?.distanceKm ?? 0,
    data?.distance_km ?? 0
  );

  const elapsedSeconds = useMemo(() => {
    if (effectiveTripStatus !== 'active') {
      return Math.max(streamPacket?.elapsedSeconds ?? 0, data?.duration_seconds ?? 0);
    }
    if (data?.started_at) {
      const startMs = new Date(data.started_at).getTime();
      if (Number.isFinite(startMs)) {
        return Math.max(0, Math.floor((nowMs - startMs) / 1000));
      }
    }
    return Math.max(streamPacket?.elapsedSeconds ?? 0, data?.duration_seconds ?? 0);
  }, [
    effectiveTripStatus,
    data?.started_at,
    data?.duration_seconds,
    streamPacket?.elapsedSeconds,
    nowMs,
  ]);

  const avgSpeedKmh = useMemo(() => {
    if (streamFresh && (streamPacket?.avgSpeedKmh ?? 0) > 0) {
      return streamPacket!.avgSpeedKmh;
    }
    if (typeof data?.avg_speed_kmh === 'number' && data.avg_speed_kmh > 0) {
      return data.avg_speed_kmh;
    }
    if (elapsedSeconds >= 8 && distanceKm > 0) {
      return Number(Math.min(160, distanceKm / (elapsedSeconds / 3600)).toFixed(1));
    }
    return 0;
  }, [streamFresh, streamPacket, data?.avg_speed_kmh, elapsedSeconds, distanceKm]);

  const maxSpeedKmh = Math.max(
    derivedMaxSpeedKmh,
    currentSpeedKmh,
    streamPacket?.maxSpeedKmh ?? 0,
    data?.max_speed_kmh ?? 0
  );

  const originMuni = useMemo(
    () =>
      municipalities.find(
        (m) => m.name.toLowerCase() === (data?.origin_name ?? '').toLowerCase()
      ) ?? null,
    [municipalities, data?.origin_name]
  );

  const destMuni = useMemo(
    () =>
      municipalities.find(
        (m) => m.name.toLowerCase() === (data?.destination_name ?? '').toLowerCase()
      ) ?? null,
    [municipalities, data?.destination_name]
  );

  const originCoords: [number, number] | null = useMemo(() => {
    if (streamPacket?.originCoords) return streamPacket.originCoords;
    if (
      typeof data?.start_latitude === 'number' &&
      typeof data?.start_longitude === 'number'
    ) {
      return [data.start_latitude, data.start_longitude];
    }
    if (originMuni) return [originMuni.latitude, originMuni.longitude];
    return null;
  }, [streamPacket?.originCoords, data?.start_latitude, data?.start_longitude, originMuni]);

  const destCoords: [number, number] | null = useMemo(() => {
    if (streamPacket?.destinationCoords) return streamPacket.destinationCoords;
    if (
      typeof data?.destination_latitude === 'number' &&
      typeof data?.destination_longitude === 'number'
    ) {
      return [data.destination_latitude, data.destination_longitude];
    }
    if (destMuni) return [destMuni.latitude, destMuni.longitude];
    return null;
  }, [
    streamPacket?.destinationCoords,
    data?.destination_latitude,
    data?.destination_longitude,
    destMuni,
  ]);

  const remainingKm = useMemo(() => {
    if (streamFresh && streamPacket?.remainingKm !== null && streamPacket?.remainingKm !== undefined) {
      return streamPacket.remainingKm;
    }
    if (currentLat === null || currentLng === null || !destCoords) return null;
    return Number(
      haversineDistanceKm(currentLat, currentLng, destCoords[0], destCoords[1]).toFixed(2)
    );
  }, [streamFresh, streamPacket?.remainingKm, currentLat, currentLng, destCoords]);

  const etaMinutes = useMemo(
    () => estimateEtaMinutes(remainingKm, currentSpeedKmh, avgSpeedKmh),
    [remainingKm, currentSpeedKmh, avgSpeedKmh]
  );

  const nearestLgu = useMemo(() => {
    if (streamFresh && streamPacket?.nearestLguName) {
      return streamPacket.nearestLguName;
    }
    if (currentLat === null || currentLng === null) return null;
    return (
      findNearestMunicipality(currentLat, currentLng, municipalities)?.municipality.name ??
      null
    );
  }, [streamFresh, streamPacket?.nearestLguName, currentLat, currentLng, municipalities]);

  const staleSeconds =
    lastUpdateMs !== null ? Math.max(0, Math.floor((nowMs - lastUpdateMs) / 1000)) : 0;

  const movementState = useMemo(
    () => classifyMovementState(currentSpeedKmh, staleSeconds, effectiveTripStatus),
    [currentSpeedKmh, staleSeconds, effectiveTripStatus]
  );

  const deviationDetected = Boolean(
    streamPacket?.deviationDetected || data?.deviation_detected
  );
  const deviationKm = Math.max(
    streamPacket?.deviationKm ?? 0,
    data?.max_deviation_km ?? 0
  );
  const accuracyMeters = streamFresh
    ? (streamPacket?.accuracyMeters ?? data?.accuracy_meters ?? null)
    : (data?.accuracy_meters ?? streamPacket?.accuracyMeters ?? null);

  const compass = formatCompassDirection(currentHeadingDeg);

  const livePin = useMemo(
    () => createDirectionalLivePin(currentSpeedKmh, currentHeadingDeg),
    [currentSpeedKmh, currentHeadingDeg]
  );

  const mapPolylinePositions = useMemo<[number, number][]>(
    () => trailPoints.map((pt) => [pt.latitude, pt.longitude]),
    [trailPoints]
  );

  const plannedPolyline = useMemo<[number, number][]>(() => {
    if (originCoords && destCoords) return [originCoords, destCoords];
    return [];
  }, [originCoords, destCoords]);

  if (isLoading) return <GlassSkeleton className="h-64" />;

  if (!data?.available) {
    return (
      <EmptyStateCard
        icon={ShieldCheck}
        title="Hindi Mabuksan ang Shared Trip"
        description={
          data?.reason ||
          'Hindi valid, nag-expire na, o tinigil na ng pasahero ang link na ito.'
        }
      />
    );
  }

  const googleMapsHref =
    currentLat !== null && currentLng !== null
      ? `https://www.google.com/maps?q=${currentLat.toFixed(6)},${currentLng.toFixed(6)}`
      : null;

  const speedGaugePercent = Math.min(100, Math.round((currentSpeedKmh / 90) * 100));

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Commuter Header & Connection Status */}
      <GlassCard variant="rose" className="p-4 sm:p-6 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="inline-flex items-center gap-2 rounded-full bg-[#C9182B] px-3 py-1 text-[11px] font-bold uppercase text-white">
            <Radio
              className={`h-3.5 w-3.5 ${effectiveTripStatus === 'active' ? 'animate-pulse' : ''}`}
            />
            {effectiveTripStatus !== 'active'
              ? `Biyahe: ${effectiveTripStatus === 'completed' ? 'Tapos na' : 'Nakansela'}`
              : streamConnected
                ? 'Naka-Live Realtime Monitor'
                : 'Live Polling Monitor (3s)'}
          </div>

          <span className="glass-pill-tile rounded-full px-3 py-1 text-[11px] font-bold text-[#343039]">
            {lastUpdateMs !== null
              ? `Huling galaw: ${staleSeconds <= 2 ? 'Kani-kanina lang' : `${staleSeconds}s ang nakalipas`}`
              : 'Naghihintay ng GPS signal'}
          </span>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="space-y-1 min-w-0">
            <h1 className="font-display text-xl sm:text-2xl font-extrabold text-[#29262B]">
              Live na Biyahe ni {data.commuter_name}: {data.origin_name ?? 'Pinanggalingan'} →{' '}
              {data.destination_name ?? 'Pupuntahan'}
            </h1>
            <p className="text-xs text-[#343039] font-medium">
              Sasakyan: {data.transport_mode ?? 'Pampublikong Sasakyan'} • Katayuan:{' '}
              <span className="font-bold uppercase text-[#C9182B]">{effectiveTripStatus}</span> •
              May bisa hanggang {formatDateTimeSafe(data.expires_at ?? null)}
            </p>
          </div>

          {googleMapsHref && (
            <a href={googleMapsHref} target="_blank" rel="noreferrer" className="shrink-0">
              <GlassButton type="button" variant="secondary" size="sm">
                <ExternalLink className="h-3.5 w-3.5 text-[#C9182B]" />
                Buksan sa Maps
              </GlassButton>
            </a>
          )}
        </div>
      </GlassCard>

      {/* SOS / Emergency or Route Deviation Warning */}
      {(alertBanner || deviationDetected) && (
        <div
          role="alert"
          className="liquid-reveal-enter rounded-3xl border border-white/80 bg-[#C9182B] px-4 py-3.5 text-white shadow-glass flex flex-wrap items-start justify-between gap-3"
        >
          <div className="flex items-start gap-2.5 text-xs sm:text-sm">
            <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5" />
            <div>
              <p className="font-extrabold uppercase tracking-wide">
                {alertBanner?.title || 'Babala: Lumihis sa Ruta'}
              </p>
              <p className="text-white/95 text-xs">
                {alertBanner?.message ||
                  `Lumayo ang live GPS ng pasahero nang ${deviationKm > 0 ? `${deviationKm.toFixed(2)} km ` : ''}mula sa dapat na ruta.`}
              </p>
            </div>
          </div>
          {googleMapsHref && (
            <a href={googleMapsHref} target="_blank" rel="noreferrer">
              <GlassButton type="button" variant="secondary" size="sm">
                Hanapin ang Pin
              </GlassButton>
            </a>
          )}
        </div>
      )}

      {/* Real-Time Speedometer & Movement Dashboard */}
      <div className="grid gap-3 sm:gap-4 grid-cols-2 lg:grid-cols-4">
        <GlassCard variant="strong" staggerIndex={0} className="p-4 space-y-2 col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between gap-2">
            <p className="text-[11px] font-bold uppercase text-[#777078] flex items-center gap-1">
              <Gauge className="h-3.5 w-3.5 text-[#C9182B]" />
              Bilis Ngayon
            </p>
            <span className="rounded-full bg-[#F8E7EA] px-2.5 py-0.5 text-[10px] font-bold text-[#B51224]">
              {movementState.label}
            </span>
          </div>
          <p
            data-testid="shared-current-speed"
            className="font-display text-3xl font-extrabold text-[#C9182B] tabular-nums"
          >
            {currentSpeedKmh.toFixed(1)} <span className="text-sm font-bold">km/h</span>
          </p>
          <div className="h-2 w-full overflow-hidden rounded-full bg-[#F8E7EA]">
            <div
              className="h-full rounded-full bg-gradient-to-r from-[#C9182B] to-[#B51224] transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]"
              style={{ width: `${speedGaugePercent}%` }}
            />
          </div>
          <p className="text-[11px] font-semibold text-[#343039] flex items-center gap-1">
            <Compass className="h-3.5 w-3.5 text-[#C9182B]" />
            Direksyon:{' '}
            {currentHeadingDeg !== null
              ? `${compass} (${Math.round(currentHeadingDeg)}°)`
              : 'Naghihintay ng galaw'}
          </p>
        </GlassCard>

        <GlassCard variant="strong" staggerIndex={1} className="p-4 space-y-1.5">
          <p className="text-[11px] font-bold uppercase text-[#777078]">Average / Pinakamabilis</p>
          <p className="font-display text-2xl font-extrabold text-[#29262B] tabular-nums">
            {avgSpeedKmh.toFixed(1)}{' '}
            <span className="text-xs font-bold text-[#777078]">km/h avg</span>
          </p>
          <p className="text-xs font-bold text-[#C9182B] tabular-nums">
            Pinakamabilis: {maxSpeedKmh.toFixed(1)} km/h
          </p>
          <p className="text-[11px] text-[#777078]">
            Batay sa live GPS movement
          </p>
        </GlassCard>

        <GlassCard variant="strong" staggerIndex={2} className="p-4 space-y-1.5">
          <p className="text-[11px] font-bold uppercase text-[#777078]">Distansya at ETA</p>
          <p className="font-display text-2xl font-extrabold text-[#C9182B] tabular-nums">
            {distanceKm.toFixed(2)} km
          </p>
          <p className="text-xs font-semibold text-[#29262B]">
            {remainingKm !== null ? `${remainingKm.toFixed(1)} km pa ang natitira` : 'Aktibong ruta'}
          </p>
          <p className="text-[11px] font-bold text-[#B51224]">
            {etaMinutes !== null ? `Tinatayang dating: ~${etaMinutes} min` : 'Lalabas ang ETA habang umaandar'}
          </p>
        </GlassCard>

        <GlassCard variant="strong" staggerIndex={3} className="p-4 space-y-1.5 col-span-2 sm:col-span-1">
          <p className="text-[11px] font-bold uppercase text-[#777078]">Oras at Ruta</p>
          <p className="font-display text-2xl font-extrabold text-[#29262B] flex items-center gap-1.5 tabular-nums">
            <Clock className="h-5 w-5 text-[#C9182B]" />
            {formatDurationSeconds(elapsedSeconds)}
          </p>
          <p className="text-xs font-semibold text-[#343039] truncate">
            {nearestLgu ? `Malapit sa ${nearestLgu}` : 'Sinusubaybayan sa Oriental Mindoro'}
          </p>
          <p className="text-[11px] font-bold text-[#C9182B]">
            {deviationDetected
              ? `Lumihis sa ruta (${deviationKm.toFixed(1)} km)`
              : `Nasa tamang ruta pa${accuracyMeters ? ` • ±${Math.round(accuracyMeters)}m` : ''}`}
          </p>
        </GlassCard>
      </div>

      {/* Live Map + Movement Breadcrumb History */}
      <div className="grid gap-4 sm:gap-6 lg:grid-cols-12 min-w-0">
        <GlassCard variant="surface" className="min-w-0 p-4 lg:col-span-8 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-display text-base sm:text-lg font-bold text-[#29262B] flex items-center gap-2">
              <Navigation className="h-4 w-4 text-[#C9182B]" />
              Live na Lokasyon at Dinadaanan
            </h2>
            <div className="flex items-center gap-2">
              <span className="glass-pill-tile rounded-full px-2.5 py-1 text-[11px] font-bold text-[#343039]">
                {trailPoints.length} point{trailPoints.length === 1 ? '' : 's'}
              </span>
              <button
                type="button"
                onClick={() => setFollowLive((v) => !v)}
                className={`rounded-full px-3 py-1 text-[11px] font-bold transition-all duration-200 active:scale-95 ${
                  followLive
                    ? 'bg-[#C9182B] text-white'
                    : 'glass-pill-tile text-[#343039]'
                }`}
              >
                {followLive ? 'Sinusundan' : 'Sundan sa Mapa'}
              </button>
            </div>
          </div>

          <div className="h-[340px] sm:h-[420px] overflow-hidden rounded-3xl border border-white/80 shadow-glass">
            <MapContainer
              center={
                currentLat !== null && currentLng !== null
                  ? [currentLat, currentLng]
                  : originCoords ?? ORIENTAL_MINDORO_MAP_CENTER
              }
              zoom={currentLat !== null && currentLng !== null ? 14 : 10}
              scrollWheelZoom
              className="h-full w-full z-0"
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              <SharedMapViewportController
                lat={currentLat}
                lng={currentLng}
                follow={followLive}
              />

              {plannedPolyline.length >= 2 && (
                <Polyline
                  positions={plannedPolyline}
                  pathOptions={{ color: '#777078', weight: 3, dashArray: '8 6' }}
                />
              )}

              {mapPolylinePositions.length >= 2 && (
                <Polyline
                  positions={mapPolylinePositions}
                  pathOptions={{ color: '#C9182B', weight: 5 }}
                />
              )}

              {originCoords && (
                <CircleMarker
                  center={originCoords}
                  radius={7}
                  pathOptions={{
                    color: '#C9182B',
                    fillColor: '#FFFFFF',
                    fillOpacity: 1,
                    weight: 3,
                  }}
                >
                  <Popup>Galing: {data.origin_name ?? 'Simula'}</Popup>
                </CircleMarker>
              )}

              {destCoords && (
                <CircleMarker
                  center={destCoords}
                  radius={7}
                  pathOptions={{
                    color: '#FFFFFF',
                    fillColor: '#B51224',
                    fillOpacity: 1,
                    weight: 2.5,
                  }}
                >
                  <Popup>Pupuntahan: {data.destination_name ?? 'Babaan'}</Popup>
                </CircleMarker>
              )}

              {currentLat !== null && currentLng !== null && (
                <>
                  <Circle
                    center={[currentLat, currentLng]}
                    radius={Math.max(15, Math.min(350, accuracyMeters ?? 25))}
                    pathOptions={{
                      color: '#C9182B',
                      fillColor: '#C9182B',
                      fillOpacity: 0.12,
                      weight: 1,
                    }}
                  />
                  <Marker position={[currentLat, currentLng]} icon={livePin}>
                    <Popup>
                      <strong>{data.commuter_name}</strong> •{' '}
                      <strong>{currentSpeedKmh.toFixed(1)} km/h</strong> ({movementState.label})
                      {compass !== '—' ? ` • Papuntang ${compass}` : ''}
                    </Popup>
                  </Marker>
                </>
              )}
            </MapContainer>
          </div>
        </GlassCard>

        {/* Recent Movement & Speed Log */}
        <GlassCard variant="strong" className="min-w-0 p-4 lg:col-span-4 space-y-3 h-fit">
          <div className="flex items-center justify-between gap-2">
            <h2 className="font-display text-base font-bold text-[#29262B] flex items-center gap-1.5">
              <LocateFixed className="h-4 w-4 text-[#C9182B]" />
              Talaan ng Galaw
            </h2>
            {currentLat !== null && currentLng !== null && (
              <span className="text-[10px] font-mono font-semibold text-[#777078]">
                {currentLat.toFixed(4)}°N, {currentLng.toFixed(4)}°E
              </span>
            )}
          </div>

          {trailPoints.length === 0 ? (
            <p className="text-xs text-[#777078]">
              Naghihintay ng paggalaw ng pasahero. Kusa itong mapupuno ng bilis at lokasyon habang bumabyahe.
            </p>
          ) : (
            <div className="space-y-2 max-h-[360px] overflow-y-auto pr-0.5">
              {[...trailPoints]
                .reverse()
                .slice(0, 8)
                .map((pt, idx) => (
                  <div
                    key={`${pt.recordedAt}-${idx}`}
                    className="glass-pill-tile liquid-reveal-enter rounded-2xl px-3 py-2 text-xs flex items-center justify-between gap-2"
                  >
                    <div className="min-w-0">
                      <p className="font-bold text-[#29262B]">
                        {pt.speedKmh.toFixed(1)} km/h{' '}
                        {pt.headingDeg !== null
                          ? `• ${formatCompassDirection(pt.headingDeg)}`
                          : ''}
                      </p>
                      <p className="text-[10px] font-mono text-[#777078] truncate">
                        {pt.latitude.toFixed(5)}, {pt.longitude.toFixed(5)}
                      </p>
                    </div>
                    <span className="shrink-0 text-[10px] font-bold text-[#B51224] tabular-nums">
                      {formatDateSafe(pt.recordedAt, 'h:mm:ss a')}
                    </span>
                  </div>
                ))}
            </div>
          )}
        </GlassCard>
      </div>

      {/* Shared Commuter Trip History (Visible to Authorized Live Share Recipients) */}
      <GlassCard variant="strong" className="min-w-0 p-4 sm:p-5 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-display text-base sm:text-lg font-bold text-[#29262B] flex items-center gap-2">
            <History className="h-4 w-4 text-[#C9182B] shrink-0" />
            <span>Mga Kamakailang Biyahe ni {data.commuter_name} ({sharedHistory.length})</span>
          </h2>
          <span className="glass-pill-tile rounded-full px-3 py-1 text-[10px] sm:text-[11px] font-bold text-[#5B555E]">
            Naka-share sa link na ito
          </span>
        </div>

        {sharedHistory.length === 0 ? (
          <p className="text-xs text-[#5B555E]">
            {streamPacket?.includeHistory === false
              ? 'Naka-pause muna ng pasahero ang pag-share ng trip history.'
              : 'Lalabas dito ang mga nagawang biyahe ng pasahero habang naka-on ang sharing.'}
          </p>
        ) : (
          <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
            {sharedHistory.map((item, idx) => (
              <div
                key={item.id}
                style={{ '--stagger': idx } as React.CSSProperties}
                className="glass-pill-tile liquid-reveal-enter min-w-0 rounded-2xl p-3.5 text-xs space-y-1.5"
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="font-display font-extrabold text-[#29262B] leading-snug min-w-0 truncate">
                    {item.origin_name} → {item.destination_name}
                  </p>
                  <span
                    className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                      item.status === 'completed'
                        ? 'bg-[#C9182B] text-white'
                        : 'bg-white/80 text-[#343039]'
                    }`}
                  >
                    {item.status === 'completed' ? 'Tapos' : item.status === 'cancelled' ? 'Kanselado' : item.status}
                  </span>
                </div>
                <p className="text-[11px] font-semibold text-[#343039]">
                  {item.transport_mode} • {item.distance_km.toFixed(2)} km •{' '}
                  {formatDurationSeconds(item.duration_seconds)}
                </p>
                <div className="flex flex-wrap items-center justify-between gap-1 text-[11px]">
                  <span className="font-bold text-[#B51224]">
                    {item.avg_speed_kmh !== null ? `${item.avg_speed_kmh} km/h avg` : 'Na-save na biyahe'}
                    {item.recorded_fare_amount !== null
                      ? ` • ${formatPhp(item.recorded_fare_amount)}`
                      : ''}
                  </span>
                  <span className="text-[10px] font-medium text-[#5B555E]">
                    {formatDateSafe(item.started_at, 'MMM d, h:mm a')}
                  </span>
                </div>
                {item.deviation_detected && (
                  <p className="text-[10px] font-bold text-[#C9182B]">
                    May alerto ng paglihis sa ruta sa biyaheng ito
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </GlassCard>
    </div>
  );
}
