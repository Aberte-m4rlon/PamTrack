import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
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
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  AlertTriangle,
  BellRing,
  Check,
  CheckCircle2,
  Clock,
  Compass,
  Copy,
  ExternalLink,
  Gauge,
  History,
  Navigation,
  PhoneCall,
  Play,
  Radio,
  Share2,
  ShieldAlert,
  Square,
  Trash2,
  Volume2,
  VolumeX,
  WifiOff,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useGps } from '@/contexts/GpsContext';
import { useNetwork } from '@/contexts/NetworkContext';
import { useToast } from '@/contexts/ToastContext';
import {
  useFareRecords,
  useLocationSharingSessions,
  useMunicipalities,
  useMyTrips,
  useTransportTypes,
  useTrustedContacts,
} from '@/hooks/useReferenceData';
import { ORIENTAL_MINDORO_MAP_CENTER } from '@/data/orientalMindoro';
import { partitionFareRecords } from '@/lib/fareIntegrity';
import {
  classifyMovementState,
  computeRouteDeviationKm,
  estimateEtaMinutes,
  formatCompassDirection,
  formatDurationSeconds,
  resolveMovementTelemetry,
} from '@/lib/gpsUtils';
import {
  LiveTripShareBroadcaster,
  type LiveTripBreadcrumbPoint,
  type SharedAlertBannerPayload,
} from '@/lib/liveTripShareChannel';
import { isNetworkUnavailableError } from '@/lib/offlineCache';
import {
  armBackgroundTripAudio,
  buildLocalTripRecord,
  buildOfflineEmergencySmsHref,
  clearOfflineActiveTrip,
  getOfflineAlertSoundEnabled,
  type OfflineAlertRecord,
  queueCompletedOfflineTrip,
  readOfflineActiveTrip,
  readOfflineAlerts,
  releaseBackgroundTripAudio,
  requestAlertPermission,
  saveOfflineActiveTrip,
  saveOfflineAlert,
  setOfflineAlertSoundEnabled,
  stopOfflineAlertAlarm,
  subscribeAlertAlarmState,
  triggerOfflineDeviceAlert,
} from '@/lib/offlineTripsAndAlerts';
import { fetchOsrmDrivingRoute, type OsrmRouteResult } from '@/lib/osrm';
import { formatDateSafe, formatDateTimeSafe, formatPhp, haversineDistanceKm } from '@/lib/utils';
import {
  createLocationSharingSession,
  finishTripRecord,
  revokeLocationSharingSession,
  startTripRecord,
  updateActiveTripProgress,
} from '@/services/pamasaheApi';
import type {
  FareExpenseType,
  NotificationType,
  SharedTripHistoryItem,
  TripRecord,
} from '@/types/database';
import { GpsConsentCard } from '@/components/gps/GpsConsentCard';
import { OfflineTripRadar } from '@/components/gps/OfflineTripRadar';
import {
  FareStatusBadge,
  GlassButton,
  GlassCard,
} from '@/components/glass/GlassPrimitives';

const DEVIATION_THRESHOLD_KM = 2.0;
const ARRIVAL_ALERT_KM = 1.0;

const liveIcon = L.divIcon({
  className: 'trip-live-pin',
  html: `<div style="width:18px;height:18px;border-radius:9999px;background:#C9182B;border:3px solid #fff;box-shadow:0 0 0 6px rgba(220,38,38,0.28);"></div>`,
  iconSize: [18, 18],
  iconAnchor: [9, 9],
});

function LiveMapAutoFollower({
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

export function LiveTripPage() {
  const { user, profile, isConfigured } = useAuth();
  const {
    currentPosition,
    nearestMunicipality,
    trackingActive,
    startTracking,
    stopTracking,
  } = useGps();
  const { isOnline, isOffline } = useNetwork();
  const { pushToast } = useToast();
  const queryClient = useQueryClient();

  const { data: muniRes } = useMunicipalities();
  const { data: transportRes } = useTransportTypes();
  const { data: fares } = useFareRecords();
  const { data: myTrips } = useMyTrips();
  const { data: trustedContacts } = useTrustedContacts();
  const { data: sharingSessions } = useLocationSharingSessions();

  const municipalities = muniRes?.data ?? [];
  const transportTypes = transportRes?.data ?? [];

  const existingActiveTrip = useMemo(
    () => (myTrips ?? []).find((t) => t.status === 'active') ?? null,
    [myTrips]
  );

  const [originId, setOriginId] = useState('');
  const [destinationId, setDestinationId] = useState('');
  const [transportTypeId, setTransportTypeId] = useState('');
  const [activeTrip, setActiveTrip] = useState<TripRecord | null>(null);
  const [plannedRoute, setPlannedRoute] = useState<OsrmRouteResult | null>(null);
  const [trail, setTrail] = useState<[number, number][]>([]);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [distanceTraveledKm, setDistanceTraveledKm] = useState(0);
  const [deviationKm, setDeviationKm] = useState(0);
  const [deviationDetected, setDeviationDetected] = useState(false);
  const [arrivalNotified, setArrivalNotified] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(() =>
    getOfflineAlertSoundEnabled()
  );
  const [notifPerm, setNotifPerm] = useState<string>(() =>
    typeof Notification !== 'undefined' ? Notification.permission : 'unsupported'
  );
  const [alertLog, setAlertLog] = useState<OfflineAlertRecord[]>(() =>
    readOfflineAlerts(user?.id)
  );
  const [alarmRinging, setAlarmRinging] = useState(false);

  useEffect(() => {
    const unsubAlarm = subscribeAlertAlarmState(setAlarmRinging);
    const onSwMessage = (event: MessageEvent) => {
      if (event.data?.type === 'PAMTRACK_NOTIFICATION_CLICKED') {
        stopOfflineAlertAlarm();
      }
    };
    navigator.serviceWorker?.addEventListener?.('message', onSwMessage);
    return () => {
      unsubAlarm();
      navigator.serviceWorker?.removeEventListener?.('message', onSwMessage);
      releaseBackgroundTripAudio().catch(() => null);
      stopOfflineAlertAlarm();
    };
  }, []);

  // Re-arm lock-screen/background audio keepalive when returning from background while trip runs
  useEffect(() => {
    if (!activeTrip) return;
    const onVisibility = () => {
      if (!document.hidden) {
        armBackgroundTripAudio().catch(() => null);
      }
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, [activeTrip]);

  const [recordedFareInput, setRecordedFareInput] = useState('');
  const [shareContactId, setShareContactId] = useState('');
  const [shareDurationMinutes, setShareDurationMinutes] = useState(60);
  const [shareIncludeHistory, setShareIncludeHistory] = useState<boolean>(() => {
    try {
      return localStorage.getItem('pamtrack_share_history_v1') !== 'false';
    } catch {
      return true;
    }
  });
  const [createdShareToken, setCreatedShareToken] = useState<string | null>(null);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);
  const [currentSpeedKmh, setCurrentSpeedKmh] = useState(0);
  const [maxSpeedKmh, setMaxSpeedKmh] = useState(0);
  const [currentHeadingDeg, setCurrentHeadingDeg] = useState<number | null>(null);
  const [telemetryTrail, setTelemetryTrail] = useState<LiveTripBreadcrumbPoint[]>([]);
  const [lastAlertBanner, setLastAlertBanner] = useState<SharedAlertBannerPayload | null>(null);
  const [followGps, setFollowGps] = useState(true);

  const lastPointRef = useRef<[number, number] | null>(null);
  const prevTelemetrySampleRef = useRef<{
    latitude: number;
    longitude: number;
    timestampMs: number;
  } | null>(null);
  const broadcasterRef = useRef<LiveTripShareBroadcaster | null>(null);

  // Restore active offline or remote trip on mount/user change
  useEffect(() => {
    setAlertLog(readOfflineAlerts(user?.id));
    if (activeTrip) return;

    const offlineSaved = readOfflineActiveTrip(user?.id);
    if (offlineSaved) {
      setActiveTrip(offlineSaved.trip);
      setOriginId(offlineSaved.trip.origin_municipality_id ?? '');
      setDestinationId(offlineSaved.trip.destination_municipality_id ?? '');
      setTransportTypeId(offlineSaved.trip.transport_type_id ?? '');
      setDistanceTraveledKm(offlineSaved.trip.distance_km ?? 0);
      setDeviationDetected(offlineSaved.trip.deviation_detected ?? false);
      setDeviationKm(offlineSaved.trip.max_deviation_km ?? 0);
      setTrail(offlineSaved.trail);
      if (offlineSaved.trail.length > 0) {
        lastPointRef.current = offlineSaved.trail[offlineSaved.trail.length - 1];
        setTelemetryTrail(
          offlineSaved.trail.map(([lat, lng]) => ({
            latitude: lat,
            longitude: lng,
            speedKmh: 0,
            headingDeg: null,
            accuracyMeters: null,
            recordedAt: offlineSaved.trip.updated_at || offlineSaved.trip.started_at,
          }))
        );
      }
      return;
    }

    if (existingActiveTrip) {
      setActiveTrip(existingActiveTrip);
      setOriginId(existingActiveTrip.origin_municipality_id ?? '');
      setDestinationId(existingActiveTrip.destination_municipality_id ?? '');
      setTransportTypeId(existingActiveTrip.transport_type_id ?? '');
      setDistanceTraveledKm(existingActiveTrip.distance_km ?? 0);
      setDeviationDetected(existingActiveTrip.deviation_detected ?? false);
      setDeviationKm(existingActiveTrip.max_deviation_km ?? 0);
    }
  }, [existingActiveTrip, activeTrip, user?.id]);

  const originMuni = municipalities.find((m) => m.id === originId);
  const destMuni = municipalities.find((m) => m.id === destinationId);

  const sharedHistoryItems = useMemo<SharedTripHistoryItem[]>(() => {
    return (myTrips ?? [])
      .filter((t) => t.id !== activeTrip?.id)
      .slice(0, 12)
      .map((t) => {
        const oName =
          t.origin?.name ||
          municipalities.find((m) => m.id === t.origin_municipality_id)?.name ||
          'Pinanggalingan';
        const dName =
          t.destination?.name ||
          municipalities.find((m) => m.id === t.destination_municipality_id)?.name ||
          'Pupuntahan';
        const mName =
          t.transport_type?.name ||
          transportTypes.find((tt) => tt.id === t.transport_type_id)?.name ||
          'Pampublikong Sasakyan';
        const avg =
          t.duration_seconds > 5 && t.distance_km > 0
            ? Number(Math.min(160, t.distance_km / (t.duration_seconds / 3600)).toFixed(1))
            : null;
        return {
          id: t.id,
          origin_name: oName,
          destination_name: dName,
          transport_mode: mName,
          distance_km: Number(t.distance_km ?? 0),
          duration_seconds: Number(t.duration_seconds ?? 0),
          avg_speed_kmh: avg,
          recorded_fare_amount:
            t.recorded_fare_amount !== null && t.recorded_fare_amount !== undefined
              ? Number(t.recorded_fare_amount)
              : null,
          deviation_detected: Boolean(t.deviation_detected),
          status: t.status,
          started_at: t.started_at,
          ended_at: t.ended_at,
        };
      });
  }, [myTrips, activeTrip?.id, municipalities, transportTypes]);

  const avgSpeedKmh = useMemo(() => {
    if (elapsedSeconds < 8 || distanceTraveledKm <= 0) return 0;
    return Number(
      Math.min(160, distanceTraveledKm / (elapsedSeconds / 3600)).toFixed(1)
    );
  }, [elapsedSeconds, distanceTraveledKm]);

  const remainingDestKm = useMemo(() => {
    if (!currentPosition || !destMuni) return null;
    return haversineDistanceKm(
      currentPosition.latitude,
      currentPosition.longitude,
      destMuni.latitude,
      destMuni.longitude
    );
  }, [currentPosition, destMuni]);

  const etaMinutes = useMemo(
    () => estimateEtaMinutes(remainingDestKm, currentSpeedKmh, avgSpeedKmh),
    [remainingDestKm, currentSpeedKmh, avgSpeedKmh]
  );

  const movementState = useMemo(
    () =>
      classifyMovementState(
        currentSpeedKmh,
        0,
        activeTrip?.status ?? 'active'
      ),
    [currentSpeedKmh, activeTrip?.status]
  );

  const compassDirection = useMemo(
    () => formatCompassDirection(currentHeadingDeg),
    [currentHeadingDeg]
  );

  const activeShareSessions = useMemo(() => {
    if (!activeTrip) return [];
    const nowMs = Date.now();
    const list = (sharingSessions ?? []).filter(
      (s) =>
        s.trip_id === activeTrip.id &&
        s.is_active &&
        !s.revoked_at &&
        new Date(s.expires_at).getTime() > nowMs
    );
    if (
      createdShareToken &&
      !list.some((s) => s.share_token === createdShareToken)
    ) {
      return [
        {
          id: `pending-${createdShareToken}`,
          user_id: user?.id ?? '',
          trip_id: activeTrip.id,
          trusted_contact_id: shareContactId || null,
          share_token: createdShareToken,
          consent_confirmed: true,
          expires_at: new Date(
            Date.now() + shareDurationMinutes * 60_000
          ).toISOString(),
          revoked_at: null,
          is_active: true,
          created_at: new Date().toISOString(),
        },
        ...list,
      ];
    }
    return list;
  }, [
    activeTrip,
    sharingSessions,
    createdShareToken,
    user?.id,
    shareContactId,
    shareDurationMinutes,
  ]);

  const primaryShareToken = activeShareSessions[0]?.share_token ?? createdShareToken;

  const buildTelemetryPacket = useCallback(
    (overrides?: {
      lat?: number;
      lng?: number;
      accuracyMeters?: number | null;
      speedKmh?: number;
      avgSpeedKmh?: number;
      maxSpeedKmh?: number;
      headingDeg?: number | null;
      distanceKm?: number;
      elapsedSeconds?: number;
      deviationKm?: number;
      deviationDetected?: boolean;
      trail?: LiveTripBreadcrumbPoint[];
      alertBanner?: SharedAlertBannerPayload | null;
      tripStatus?: TripRecord['status'];
    }) => {
      if (!activeTrip) return null;
      const lat =
        overrides?.lat ??
        currentPosition?.latitude ??
        activeTrip.current_latitude ??
        originMuni?.latitude ??
        null;
      const lng =
        overrides?.lng ??
        currentPosition?.longitude ??
        activeTrip.current_longitude ??
        originMuni?.longitude ??
        null;
      if (lat === null || lng === null) return null;
      const nextSpeed = overrides?.speedKmh ?? currentSpeedKmh;
      const nextAvg = overrides?.avgSpeedKmh ?? avgSpeedKmh;
      const nextStatus = overrides?.tripStatus ?? activeTrip.status;
      const remKm =
        destMuni !== undefined
          ? haversineDistanceKm(lat, lng, destMuni.latitude, destMuni.longitude)
          : remainingDestKm;
      const nextMode =
        activeTrip.transport_type?.name ||
        transportTypes.find((t) => t.id === activeTrip.transport_type_id)?.name ||
        'Pampublikong Sasakyan';

      return {
        tripId: activeTrip.id,
        commuterName:
          profile?.full_name?.split(' ')[0] ||
          user?.email?.split('@')[0] ||
          'Pasahero',
        originName: originMuni?.name ?? 'Pinanggalingan',
        destinationName: destMuni?.name ?? 'Pupuntahan',
        transportMode: nextMode,
        tripStatus: nextStatus,
        latitude: lat,
        longitude: lng,
        accuracyMeters:
          overrides?.accuracyMeters ?? currentPosition?.accuracyMeters ?? null,
        speedKmh: nextSpeed,
        avgSpeedKmh: nextAvg,
        maxSpeedKmh: overrides?.maxSpeedKmh ?? maxSpeedKmh,
        headingDeg: overrides?.headingDeg ?? currentHeadingDeg,
        movementLabel: classifyMovementState(nextSpeed, 0, nextStatus).label,
        distanceKm: overrides?.distanceKm ?? distanceTraveledKm,
        elapsedSeconds: overrides?.elapsedSeconds ?? elapsedSeconds,
        remainingKm: remKm !== null ? Number(remKm.toFixed(2)) : null,
        etaMinutes: estimateEtaMinutes(remKm, nextSpeed, nextAvg),
        deviationKm: overrides?.deviationKm ?? deviationKm,
        deviationDetected: overrides?.deviationDetected ?? deviationDetected,
        nearestLguName: nearestMunicipality?.municipality.name ?? null,
        originCoords: originMuni
          ? ([originMuni.latitude, originMuni.longitude] as [number, number])
          : null,
        destinationCoords: destMuni
          ? ([destMuni.latitude, destMuni.longitude] as [number, number])
          : null,
        trail: (overrides?.trail ?? telemetryTrail).slice(-120),
        alertBanner:
          overrides?.alertBanner !== undefined
            ? overrides.alertBanner
            : lastAlertBanner,
        includeHistory: shareIncludeHistory,
        tripHistory: shareIncludeHistory ? sharedHistoryItems.slice(0, 10) : [],
        updatedAt: new Date().toISOString(),
      };
    },
    [
      activeTrip,
      currentPosition,
      originMuni,
      destMuni,
      currentSpeedKmh,
      avgSpeedKmh,
      remainingDestKm,
      transportTypes,
      profile?.full_name,
      user?.email,
      maxSpeedKmh,
      currentHeadingDeg,
      distanceTraveledKm,
      elapsedSeconds,
      deviationKm,
      deviationDetected,
      nearestMunicipality?.municipality.name,
      telemetryTrail,
      lastAlertBanner,
      shareIncludeHistory,
      sharedHistoryItems,
    ]
  );

  // Sync Supabase Realtime Broadcast channels whenever active share tokens change
  useEffect(() => {
    if (!broadcasterRef.current) {
      broadcasterRef.current = new LiveTripShareBroadcaster();
    }
    return () => {
      broadcasterRef.current?.destroy();
      broadcasterRef.current = null;
    };
  }, []);

  const activeShareTokenKey = useMemo(
    () => activeShareSessions.map((s) => s.share_token).join(','),
    [activeShareSessions]
  );

  useEffect(() => {
    const tokens = activeShareTokenKey ? activeShareTokenKey.split(',') : [];
    broadcasterRef.current?.syncTokens(isOnline && activeTrip ? tokens : []);
  }, [activeShareTokenKey, isOnline, activeTrip]);

  const buildTelemetryPacketRef = useRef(buildTelemetryPacket);
  buildTelemetryPacketRef.current = buildTelemetryPacket;

  // Send heartbeat every 4s while actively sharing so newly joined viewers immediately see live stats
  useEffect(() => {
    if (!isOnline || !activeTrip || !activeShareTokenKey) return;
    const pkt = buildTelemetryPacketRef.current();
    if (pkt) broadcasterRef.current?.broadcast(pkt);
    const id = setInterval(() => {
      const latest = buildTelemetryPacketRef.current();
      if (latest) broadcasterRef.current?.broadcast(latest);
    }, 4000);
    return () => clearInterval(id);
  }, [isOnline, activeTrip, activeShareTokenKey]);

  const fireTripAlert = useCallback(
    (input: {
      type: NotificationType;
      title: string;
      message: string;
      urgent?: boolean;
      repeatMs?: number;
    }) => {
      if (user?.id) {
        const saved = saveOfflineAlert({
          userId: user.id,
          type: input.type,
          title: input.title,
          message: input.message,
          latitude: currentPosition?.latitude ?? null,
          longitude: currentPosition?.longitude ?? null,
          synced: false,
        });
        setAlertLog((prev) => [saved, ...prev].slice(0, 20));
      }
      if (input.urgent) {
        const banner: SharedAlertBannerPayload = {
          title: input.title,
          message: input.message,
          urgent: true,
          triggeredAt: new Date().toISOString(),
        };
        setLastAlertBanner(banner);
        const pkt = buildTelemetryPacket({ alertBanner: banner });
        if (pkt) {
          broadcasterRef.current?.broadcast(pkt);
        }
      }
      triggerOfflineDeviceAlert({
        title: input.title,
        body: input.message,
        urgent: input.urgent,
        soundEnabled,
        repeatMs: input.repeatMs,
      });
      pushToast({
        title: input.title,
        description: input.message,
        variant: input.urgent ? 'error' : 'info',
      });
    },
    [
      user?.id,
      currentPosition?.latitude,
      currentPosition?.longitude,
      soundEnabled,
      pushToast,
      buildTelemetryPacket,
    ]
  );

  // Lookup matching fares for chosen corridor + mode
  const matchingFares = useMemo(() => {
    if (!originId || !destinationId) return [];
    return (fares ?? []).filter(
      (f) =>
        f.origin_municipality_id === originId &&
        f.destination_municipality_id === destinationId &&
        (!transportTypeId || f.transport_type_id === transportTypeId)
    );
  }, [fares, originId, destinationId, transportTypeId]);

  const { officialFares, communityEstimates } = useMemo(
    () => partitionFareRecords(matchingFares),
    [matchingFares]
  );

  // Fetch OSRM planned corridor when online and origin & destination differ
  useEffect(() => {
    if (!isOnline || !originMuni || !destMuni || originMuni.id === destMuni.id) {
      setPlannedRoute(null);
      return;
    }
    const ctrl = new AbortController();
    fetchOsrmDrivingRoute(
      originMuni.latitude,
      originMuni.longitude,
      destMuni.latitude,
      destMuni.longitude,
      ctrl.signal
    ).then((res) => {
      if (!ctrl.signal.aborted) setPlannedRoute(res);
    });
    return () => ctrl.abort();
  }, [isOnline, originMuni, destMuni]);

  const plannedPolyline = useMemo<[number, number][]>(() => {
    if (plannedRoute?.available && plannedRoute.geometry?.coordinates?.length) {
      return plannedRoute.geometry.coordinates.map(([lng, lat]) => [lat, lng]);
    }
    if (originMuni && destMuni) {
      return [
        [originMuni.latitude, originMuni.longitude],
        [destMuni.latitude, destMuni.longitude],
      ];
    }
    return [];
  }, [plannedRoute, originMuni, destMuni]);

  // Live timer while trip is active
  useEffect(() => {
    if (!activeTrip) return;
    const startMs = new Date(activeTrip.started_at).getTime();
    const tick = () => {
      setElapsedSeconds(Math.max(0, Math.floor((Date.now() - startMs) / 1000)));
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [activeTrip]);

  // Process continuous GPS updates while moving (works both online & offline)
  useEffect(() => {
    if (!activeTrip || !currentPosition || !user) return;
    const {
      latitude,
      longitude,
      accuracyMeters,
      speedMps,
      headingDeg,
      timestamp,
    } = currentPosition;

    const sampleTimeMs =
      typeof timestamp === 'number' && Number.isFinite(timestamp)
        ? timestamp
        : Date.now();

    const telemetry = resolveMovementTelemetry({
      currentLat: latitude,
      currentLng: longitude,
      currentTimestampMs: sampleTimeMs,
      hardwareSpeedMps: speedMps,
      hardwareHeadingDeg: headingDeg,
      previousPoint: prevTelemetrySampleRef.current,
    });
    prevTelemetrySampleRef.current = {
      latitude,
      longitude,
      timestampMs: sampleTimeMs,
    };

    const nextSpeedKmh = telemetry.speedKmh;
    const nextMaxSpeed = Number(Math.max(maxSpeedKmh, nextSpeedKmh).toFixed(1));
    setCurrentSpeedKmh(nextSpeedKmh);
    setMaxSpeedKmh(nextMaxSpeed);
    if (telemetry.headingDeg !== null) {
      setCurrentHeadingDeg(telemetry.headingDeg);
    }

    let nextDistance = distanceTraveledKm;
    if (lastPointRef.current) {
      const stepKm = haversineDistanceKm(
        lastPointRef.current[0],
        lastPointRef.current[1],
        latitude,
        longitude
      );
      if (stepKm >= 0.01 && stepKm < 20) {
        nextDistance = Number((distanceTraveledKm + stepKm).toFixed(2));
        setDistanceTraveledKm(nextDistance);
      }
    }
    lastPointRef.current = [latitude, longitude];
    const nextCoord: [number, number] = [latitude, longitude];
    const updatedTrail = [...trail, nextCoord].slice(-160);
    setTrail(updatedTrail);

    const updatedTelemetryTrail: LiveTripBreadcrumbPoint[] = [
      ...telemetryTrail,
      {
        latitude,
        longitude,
        speedKmh: nextSpeedKmh,
        headingDeg: telemetry.headingDeg,
        accuracyMeters,
        recordedAt: new Date(sampleTimeMs).toISOString(),
      },
    ].slice(-120);
    setTelemetryTrail(updatedTelemetryTrail);

    let curDev = 0;
    if (plannedPolyline.length >= 2) {
      curDev = computeRouteDeviationKm(latitude, longitude, plannedPolyline);
    }
    const maxDev = Math.max(deviationKm, curDev);
    const hasDeviated = deviationDetected || curDev > DEVIATION_THRESHOLD_KM;
    setDeviationKm(maxDev);
    if (hasDeviated && !deviationDetected) {
      setDeviationDetected(true);
      fireTripAlert({
        type: 'route_deviation_warning',
        title: 'Babala: Lumihis sa Ruta',
        message: `Lumihis ang live GPS ng ${curDev} km mula sa nakaplanong daan.`,
        urgent: true,
      });
    }

    if (
      destMuni &&
      !arrivalNotified &&
      haversineDistanceKm(latitude, longitude, destMuni.latitude, destMuni.longitude) <=
        ARRIVAL_ALERT_KM
    ) {
      setArrivalNotified(true);
      fireTripAlert({
        type: 'arrival_alert',
        title: `Malapit na sa ${destMuni.name}`,
        message: `Nasa loob ka na ng ${ARRIVAL_ALERT_KM} km mula sa ${destMuni.name}.`,
        urgent: false,
      });
    }

    const updatedTripState: TripRecord = {
      ...activeTrip,
      current_latitude: latitude,
      current_longitude: longitude,
      distance_km: nextDistance,
      duration_seconds: elapsedSeconds,
      deviation_detected: hasDeviated,
      max_deviation_km: maxDev,
      updated_at: new Date().toISOString(),
    };
    setActiveTrip(updatedTripState);
    saveOfflineActiveTrip(updatedTripState, updatedTrail);

    const nextAvgSpeed =
      elapsedSeconds >= 8 && nextDistance > 0
        ? Number(Math.min(160, nextDistance / (elapsedSeconds / 3600)).toFixed(1))
        : 0;

    if (isOnline && activeShareSessions.length > 0) {
      const pkt = buildTelemetryPacket({
        lat: latitude,
        lng: longitude,
        accuracyMeters,
        speedKmh: nextSpeedKmh,
        avgSpeedKmh: nextAvgSpeed,
        maxSpeedKmh: nextMaxSpeed,
        headingDeg: telemetry.headingDeg ?? currentHeadingDeg,
        distanceKm: nextDistance,
        elapsedSeconds,
        deviationKm: maxDev,
        deviationDetected: hasDeviated,
        trail: updatedTelemetryTrail,
      });
      if (pkt) {
        broadcasterRef.current?.broadcast(pkt);
      }
    }

    if (isOnline && isConfigured && !activeTrip.id.startsWith('offline-')) {
      updateActiveTripProgress({
        tripId: activeTrip.id,
        userId: user.id,
        lat: latitude,
        lng: longitude,
        accuracyMeters,
        speedMps: telemetry.speedMps,
        headingDeg: telemetry.headingDeg,
        distanceKm: nextDistance,
        durationSeconds: elapsedSeconds,
        deviationDetected: hasDeviated,
        maxDeviationKm: maxDev,
      }).catch(() => {
        // Offline / intermittent drop remains safely stored locally
      });
    }
  }, [currentPosition?.timestamp]); // eslint-disable-line react-hooks/exhaustive-deps

  const startMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('Mag-sign in muna para simulan at i-save ang live trip.');
      if (!originId || !destinationId || !transportTypeId || !originMuni || !destMuni) {
        throw new Error('Piliin muna kung saan galing, saan pupunta, at uri ng sasakyan.');
      }
      const selectedTransport = transportTypes.find((t) => t.id === transportTypeId);
      if (!selectedTransport) {
        throw new Error('Pumili ng tamang uri ng sasakyan.');
      }

      const ok = await startTracking();
      if (!ok) {
        throw new Error('Kailangan ng GPS permission para mabantayan ang live na biyahe.');
      }

      const bestFare = officialFares[0] ?? communityEstimates[0] ?? null;
      const expenseType: FareExpenseType = officialFares[0]
        ? 'recorded'
        : communityEstimates[0]
          ? 'estimated'
          : 'none';

      if (!isOnline || !isConfigured) {
        return buildLocalTripRecord({
          userId: user.id,
          origin: originMuni,
          destination: destMuni,
          transportType: selectedTransport,
          associatedFareRecordId: bestFare?.id ?? null,
          recordedFareAmount: bestFare?.fare_amount ?? null,
          fareExpenseType: expenseType,
        });
      }

      try {
        return await startTripRecord({
          userId: user.id,
          originMunicipalityId: originId,
          destinationMunicipalityId: destinationId,
          transportTypeId,
          startLat: originMuni.latitude,
          startLng: originMuni.longitude,
          destLat: destMuni.latitude,
          destLng: destMuni.longitude,
          associatedFareRecordId: bestFare?.id ?? null,
          recordedFareAmount: bestFare?.fare_amount ?? null,
          fareExpenseType: expenseType,
        });
      } catch (err) {
        if (isNetworkUnavailableError(err)) {
          return buildLocalTripRecord({
            userId: user.id,
            origin: originMuni,
            destination: destMuni,
            transportType: selectedTransport,
            associatedFareRecordId: bestFare?.id ?? null,
            recordedFareAmount: bestFare?.fare_amount ?? null,
            fareExpenseType: expenseType,
          });
        }
        throw err;
      }
    },
    onSuccess: (created) => {
      const initTrail: [number, number][] = currentPosition
        ? [[currentPosition.latitude, currentPosition.longitude]]
        : [];
      const initSpeed =
        currentPosition?.speedMps !== null &&
        currentPosition?.speedMps !== undefined &&
        currentPosition.speedMps >= 0
          ? Number((currentPosition.speedMps * 3.6).toFixed(1))
          : 0;
      const initTelemetryTrail: LiveTripBreadcrumbPoint[] = currentPosition
        ? [
            {
              latitude: currentPosition.latitude,
              longitude: currentPosition.longitude,
              speedKmh: initSpeed,
              headingDeg: currentPosition.headingDeg,
              accuracyMeters: currentPosition.accuracyMeters,
              recordedAt: new Date(
                currentPosition.timestamp || Date.now()
              ).toISOString(),
            },
          ]
        : [];
      setActiveTrip(created);
      setDistanceTraveledKm(0);
      setCurrentSpeedKmh(initSpeed);
      setMaxSpeedKmh(initSpeed);
      setCurrentHeadingDeg(currentPosition?.headingDeg ?? null);
      setLastAlertBanner(null);
      setDeviationDetected(false);
      setArrivalNotified(false);
      setDeviationKm(0);
      setTrail(initTrail);
      setTelemetryTrail(initTelemetryTrail);
      lastPointRef.current = initTrail[0] ?? null;
      prevTelemetrySampleRef.current = currentPosition
        ? {
            latitude: currentPosition.latitude,
            longitude: currentPosition.longitude,
            timestampMs: currentPosition.timestamp || Date.now(),
          }
        : null;
      saveOfflineActiveTrip(created, initTrail);
      if (soundEnabled) {
        armBackgroundTripAudio().catch(() => null);
      }
      queryClient.invalidateQueries({ queryKey: ['myTrips', user?.id] });
      pushToast({
        title: created.id.startsWith('offline-')
          ? 'Nagsimula na ang offline biyahe'
          : 'Nagsimula na ang live biyahe',
        description: 'Aktibo na ang pagsubaybay sa galaw at mga alerto.',
        variant: 'success',
      });
    },
    onError: (err: Error) => {
      pushToast({ title: 'Hindi masimulan ang biyahe', description: err.message, variant: 'error' });
    },
  });

  const endMutation = useMutation({
    mutationFn: async (status: 'completed' | 'cancelled') => {
      if (!activeTrip || !user) throw new Error('Walang aktibong biyahe.');
      await stopTracking();

      const customFare = Number(recordedFareInput);
      const hasCustom = Number.isFinite(customFare) && customFare > 0;
      const finalFare = hasCustom ? customFare : activeTrip.recorded_fare_amount;
      const finalExpense: FareExpenseType = hasCustom
        ? 'recorded'
        : activeTrip.fare_expense_type;

      const buildCompletedLocal = (): TripRecord => ({
        ...activeTrip,
        status,
        ended_at: new Date().toISOString(),
        distance_km: distanceTraveledKm,
        duration_seconds: elapsedSeconds,
        recorded_fare_amount: finalFare,
        fare_expense_type: finalExpense,
      });

      if (!isOnline || !isConfigured || activeTrip.id.startsWith('offline-')) {
        const savedLocal = buildCompletedLocal();
        queueCompletedOfflineTrip(savedLocal);
        return savedLocal;
      }

      try {
        return await finishTripRecord({
          tripId: activeTrip.id,
          userId: user.id,
          status,
          distanceKm: distanceTraveledKm,
          durationSeconds: elapsedSeconds,
          recordedFareAmount: finalFare,
          fareExpenseType: finalExpense,
        });
      } catch (err) {
        if (isNetworkUnavailableError(err)) {
          const savedLocal = buildCompletedLocal();
          queueCompletedOfflineTrip(savedLocal);
          return savedLocal;
        }
        throw err;
      }
    },
    onSuccess: (finished) => {
      if (isOnline && activeShareSessions.length > 0) {
        const finalPacket = buildTelemetryPacket({
          tripStatus: finished.status,
          distanceKm: finished.distance_km ?? distanceTraveledKm,
          elapsedSeconds: finished.duration_seconds ?? elapsedSeconds,
        });
        if (finalPacket) {
          broadcasterRef.current?.broadcast(finalPacket);
        }
      }
      clearOfflineActiveTrip();
      releaseBackgroundTripAudio().catch(() => null);
      stopOfflineAlertAlarm();
      setActiveTrip(null);
      setRecordedFareInput('');
      setCreatedShareToken(null);
      setCurrentSpeedKmh(0);
      setMaxSpeedKmh(0);
      setCurrentHeadingDeg(null);
      setTelemetryTrail([]);
      setLastAlertBanner(null);
      prevTelemetrySampleRef.current = null;
      setArrivalNotified(false);
      queryClient.invalidateQueries({ queryKey: ['myTrips', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['notifications', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['locationSharing', user?.id] });
      fireTripAlert({
        type: 'trip_completed',
        title:
          finished.status === 'completed'
            ? finished.id.startsWith('offline-')
              ? 'Na-save offline ang biyahe'
              : 'Tapos at na-save na ang biyahe'
            : 'Nakansela ang biyahe',
        message: `${distanceTraveledKm.toFixed(2)} km • ${formatDurationSeconds(elapsedSeconds)}`,
        repeatMs: 3600,
      });
    },
    onError: (err: Error) => {
      pushToast({ title: 'Hindi matapos ang biyahe', description: err.message, variant: 'error' });
    },
  });

  const shareMutation = useMutation({
    mutationFn: async () => {
      if (!isOnline) throw new Error('Kailangan ng internet connection para makagawa ng web share link.');
      if (!user || !activeTrip) throw new Error('Mag-start muna ng aktibong biyahe.');

      let targetTrip = activeTrip;
      // Automatically promote an offline-started trip to Supabase once connectivity returns
      if (activeTrip.id.startsWith('offline-')) {
        if (
          !isConfigured ||
          !activeTrip.origin_municipality_id ||
          !activeTrip.destination_municipality_id ||
          !activeTrip.transport_type_id
        ) {
          throw new Error(
            'Mag-connect muna sa Supabase para makagawa ng live share link. Gumagana pa rin ang offline SMS.'
          );
        }
        const promoted = await startTripRecord({
          userId: user.id,
          originMunicipalityId: activeTrip.origin_municipality_id,
          destinationMunicipalityId: activeTrip.destination_municipality_id,
          transportTypeId: activeTrip.transport_type_id,
          startLat: originMuni?.latitude ?? activeTrip.start_latitude,
          startLng: originMuni?.longitude ?? activeTrip.start_longitude,
          destLat: destMuni?.latitude ?? activeTrip.destination_latitude,
          destLng: destMuni?.longitude ?? activeTrip.destination_longitude,
          associatedFareRecordId: activeTrip.associated_fare_record_id,
          recordedFareAmount: activeTrip.recorded_fare_amount,
          fareExpenseType: activeTrip.fare_expense_type,
          notes: activeTrip.notes ?? undefined,
        });
        if (currentPosition) {
          await updateActiveTripProgress({
            tripId: promoted.id,
            userId: user.id,
            lat: currentPosition.latitude,
            lng: currentPosition.longitude,
            accuracyMeters: currentPosition.accuracyMeters,
            speedMps: Number((currentSpeedKmh / 3.6).toFixed(2)),
            headingDeg: currentHeadingDeg,
            distanceKm: distanceTraveledKm,
            durationSeconds: elapsedSeconds,
            deviationDetected,
            maxDeviationKm: deviationKm,
          }).catch(() => null);
        }
        targetTrip = {
          ...promoted,
          current_latitude:
            currentPosition?.latitude ?? activeTrip.current_latitude,
          current_longitude:
            currentPosition?.longitude ?? activeTrip.current_longitude,
          distance_km: distanceTraveledKm,
          duration_seconds: elapsedSeconds,
          deviation_detected: deviationDetected,
          max_deviation_km: deviationKm,
          origin: originMuni ?? activeTrip.origin,
          destination: destMuni ?? activeTrip.destination,
        };
        setActiveTrip(targetTrip);
        saveOfflineActiveTrip(targetTrip, trail);
      }

      return createLocationSharingSession({
        userId: user.id,
        tripId: targetTrip.id,
        trustedContactId: shareContactId || null,
        durationMinutes: shareDurationMinutes,
      });
    },
    onSuccess: (sess) => {
      setCreatedShareToken(sess.share_token);
      queryClient.invalidateQueries({ queryKey: ['locationSharing', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['myTrips', user?.id] });
      pushToast({
        title: `Naka-on na ang live sharing (${shareDurationMinutes} min)`,
        variant: 'success',
      });
    },
    onError: (err: Error) => {
      pushToast({ title: 'Hindi nakagawa ng share link', description: err.message, variant: 'error' });
    },
  });

  const revokeShareMutation = useMutation({
    mutationFn: (sessionId: string) => revokeLocationSharingSession(sessionId),
    onSuccess: (_res, sessionId) => {
      const revokedSess = activeShareSessions.find((s) => s.id === sessionId);
      if (revokedSess?.share_token === createdShareToken) {
        setCreatedShareToken(null);
      }
      queryClient.invalidateQueries({ queryKey: ['locationSharing', user?.id] });
      pushToast({ title: 'Tinigil na ang pag-share ng biyahe', variant: 'info' });
    },
    onError: (err: Error) => {
      pushToast({ title: 'Hindi natigil ang sharing', description: err.message, variant: 'error' });
    },
  });

  const shareUrl = primaryShareToken
    ? `${window.location.origin}/shared-trip/${primaryShareToken}`
    : null;

  const handleCopyShareLink = async (token: string) => {
    const url = `${window.location.origin}/shared-trip/${token}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopiedToken(token);
      setTimeout(() => setCopiedToken((prev) => (prev === token ? null : prev)), 2500);
      pushToast({ title: 'Nakopya na ang live share link', variant: 'success' });
    } catch {
      pushToast({ title: 'Kopyahin na lang sa link box sa ibaba', variant: 'info' });
    }
  };

  const handleNativeShare = async (token: string) => {
    const url = `${window.location.origin}/shared-trip/${token}`;
    const summaryText = `Tingnan ang live na biyahe ko (${routeSummaryLabel}) — Bilis: ${currentSpeedKmh.toFixed(1)} km/h, ${distanceTraveledKm.toFixed(2)} km ang layo.`;
    if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
      try {
        await navigator.share({
          title: 'Pamasahe Tracker — Live Trip Monitor',
          text: summaryText,
          url,
        });
        return;
      } catch {
        // User cancelled or Web Share blocked -> fallback to clipboard copy
      }
    }
    await handleCopyShareLink(token);
  };

  const selectedTrustedPhone = trustedContacts?.find(
    (c) => c.id === shareContactId
  )?.phone_number || trustedContacts?.[0]?.phone_number;

  const routeSummaryLabel =
    originMuni && destMuni
      ? `${originMuni.name} -> ${destMuni.name}`
      : 'Oriental Mindoro Corridor';

  const smsHref = buildOfflineEmergencySmsHref({
    phone: selectedTrustedPhone,
    userName: profile?.full_name || user?.email?.split('@')[0],
    routeLabel: routeSummaryLabel,
    latitude: currentPosition?.latitude,
    longitude: currentPosition?.longitude,
    speedKmh: currentSpeedKmh,
    shareUrl,
  });

  return (
    <div className="space-y-4 sm:space-y-6">
      <GlassCard variant="strong" className="p-4 sm:p-6 flex flex-col sm:flex-row sm:flex-wrap sm:items-center sm:justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-[11px] sm:text-xs font-bold uppercase tracking-widest text-[#C9182B]">
              Pagbabantay ng Biyahe Gamit ang GPS
            </p>
            {isOffline && (
              <span className="inline-flex items-center gap-1 rounded-full bg-[#F8E7EA] px-2.5 py-0.5 text-[10px] font-bold uppercase text-[#B51224]">
                <WifiOff className="h-3 w-3" />
                Gumagana ang Offline Tracking
              </span>
            )}
          </div>
          <h1 className="font-display text-xl leading-tight font-extrabold text-[#29262B] sm:text-3xl">
            Live Trip Monitor
          </h1>
          <p className="text-xs sm:text-sm text-[#343039]">
            Subaybayan ang iyong lokasyon, layo, bilis, at mga alerto kahit online o offline.
          </p>
        </div>
        <div className="w-full sm:w-auto">
          <Link to="/safety" className="w-full sm:w-auto">
            <GlassButton variant="secondary" size="sm" className="w-full sm:w-auto">
              <ShieldAlert className="h-3.5 w-3.5 shrink-0" />
              Safety at Contacts
            </GlassButton>
          </Link>
        </div>
      </GlassCard>

      <GpsConsentCard compact />

      {!user && (
        <GlassCard variant="strong" className="p-4 sm:p-5 border-[#E9E5E8] flex flex-col sm:flex-row sm:flex-wrap sm:items-center sm:justify-between gap-3">
          <p className="text-xs sm:text-sm font-semibold text-[#29262B]">
            Mag-sign in para mai-record ang biyahe at makapagpadala ng mga alerto.
          </p>
          <Link to="/login" className="w-full sm:w-auto">
            <GlassButton variant="primary" size="sm" className="w-full sm:w-auto">
              Mag-sign In Para Magsimula
            </GlassButton>
          </Link>
        </GlassCard>
      )}

      {/* Trip Setup or Active Trip Controls */}
      <div className="grid gap-4 sm:gap-6 lg:grid-cols-12 min-w-0">
        <GlassCard
          key={activeTrip ? `trip-run-${activeTrip.id}` : 'trip-setup'}
          variant="strong"
          className="liquid-reveal-enter min-w-0 max-w-full overflow-hidden p-3.5 sm:p-5 lg:col-span-5 space-y-4 h-fit"
        >
          {!activeTrip ? (
            <>
              <h2 className="flex items-center gap-2 font-display text-lg font-bold text-[#29262B]">
                <Navigation className="h-5 w-5 text-[#C9182B]" />
                Ihanda ang Bagong Biyahe
              </h2>

              <div className="space-y-3">
                <div>
                  <label className="mb-1 block text-xs font-bold uppercase text-[#777078]">
                    1. Saan Galing
                  </label>
                  <select
                    value={originId}
                    onChange={(e) => setOriginId(e.target.value)}
                    className="glass-input w-full rounded-2xl px-3.5 py-2 text-sm"
                  >
                    <option value="">Piliin kung saan galing...</option>
                    {municipalities.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-1 block text-xs font-bold uppercase text-[#777078]">
                    2. Saan Pupunta
                  </label>
                  <select
                    value={destinationId}
                    onChange={(e) => setDestinationId(e.target.value)}
                    className="glass-input w-full rounded-2xl px-3.5 py-2 text-sm"
                  >
                    <option value="">Piliin kung saan pupunta...</option>
                    {municipalities.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-1 block text-xs font-bold uppercase text-[#777078]">
                    3. Uri ng Sasakyan
                  </label>
                  <select
                    value={transportTypeId}
                    onChange={(e) => setTransportTypeId(e.target.value)}
                    className="glass-input w-full rounded-2xl px-3.5 py-2 text-sm"
                  >
                    <option value="">Piliin ang sasakyan...</option>
                    {transportTypes.map((tt) => (
                      <option key={tt.id} value={tt.id}>
                        {tt.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Available Fare Preview */}
                {originId && destinationId && (
                  <div className="glass-pill-tile liquid-reveal-enter rounded-2xl p-3.5 space-y-2 text-xs">
                    <p className="font-bold uppercase text-[#C9182B]">
                      4. Mga Nakalistang Pamasahe
                    </p>
                    {officialFares.length > 0 ? (
                      officialFares.map((f) => (
                        <div key={f.id} className="flex items-center justify-between">
                          <span>
                            {f.transport_type?.name} ({f.passenger_category}):{' '}
                            <strong>{formatPhp(f.fare_amount)}</strong>
                          </span>
                          <FareStatusBadge status="verified_official" compact />
                        </div>
                      ))
                    ) : communityEstimates.length > 0 ? (
                      communityEstimates.map((f) => (
                        <div key={f.id} className="flex items-center justify-between">
                          <span>
                            {f.transport_type?.name} ({f.passenger_category}):{' '}
                            <strong>{formatPhp(f.fare_amount)}</strong>
                          </span>
                          <FareStatusBadge status="community_estimate" compact />
                        </div>
                      ))
                    ) : (
                      <p className="text-[#343039]">Wala pang nakalistang gabay para sa rutang ito.</p>
                    )}
                  </div>
                )}

                <GlassButton
                  type="button"
                  variant="primary"
                  className="w-full"
                  disabled={!user || startMutation.isPending}
                  onClick={() => startMutation.mutate()}
                >
                  <Play className="h-4 w-4" />
                  {startMutation.isPending
                    ? 'Sinisimulan...'
                    : isOffline
                      ? 'Simulan ang Live Trip (Offline)'
                      : 'Simulan ang Live Trip'}
                </GlassButton>
              </div>
            </>
          ) : (
            <>
              <div className="flex items-center justify-between gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-[#C9182B] px-3 py-1 text-xs font-bold text-white">
                  <Radio className="h-3.5 w-3.5 animate-pulse" />
                  {activeTrip.id.startsWith('offline-') || isOffline
                    ? 'Tumatakbo ang Offline Biyahe'
                    : 'Tumatakbo ang Live Biyahe'}
                </span>
                <span className="text-xs font-semibold text-[#C9182B]">
                  Nagsimula {formatDateSafe(activeTrip.started_at, 'h:mm a')}
                </span>
              </div>

              <h2 className="font-display text-xl font-extrabold text-[#29262B]">
                {originMuni?.name ?? 'Pinanggalingan'} → {destMuni?.name ?? 'Pupuntahan'}
              </h2>

              <div className="grid grid-cols-2 gap-2.5">
                <div className="rounded-2xl bg-[#F8E7EA] p-3 text-center">
                  <p className="text-[10px] font-bold uppercase text-[#B51224] flex items-center justify-center gap-1">
                    <Gauge className="h-3 w-3" />
                    Bilis Ngayon
                  </p>
                  <p className="font-display text-2xl font-extrabold text-[#C9182B] tabular-nums">
                    {currentSpeedKmh.toFixed(1)} <span className="text-xs font-bold">km/h</span>
                  </p>
                  <p className="text-[10px] font-semibold text-[#343039] truncate">
                    {movementState.label}
                    {compassDirection !== '—' ? ` • ${compassDirection}` : ''}
                  </p>
                </div>
                <div className="glass-pill-tile rounded-[20px] p-3 text-center">
                  <p className="text-[10px] font-bold uppercase text-[#B51224]">Nalayong Layo</p>
                  <p className="font-display text-2xl font-extrabold text-[#C9182B] tabular-nums">
                    {distanceTraveledKm.toFixed(2)} <span className="text-xs font-bold">km</span>
                  </p>
                  <p className="text-[10px] font-semibold text-[#777078] truncate">
                    {etaMinutes !== null
                      ? `~${etaMinutes} min ETA`
                      : remainingDestKm !== null
                        ? `${remainingDestKm.toFixed(1)} km pa`
                        : 'Aktibong ruta'}
                  </p>
                </div>
                <div className="glass-pill-tile rounded-[20px] p-3 text-center">
                  <p className="text-[10px] font-bold uppercase text-[#B51224]">Oras ng Biyahe</p>
                  <p className="font-display text-xl font-extrabold text-[#29262B] flex items-center justify-center gap-1 tabular-nums">
                    <Clock className="h-4 w-4 text-[#C9182B]" />
                    {formatDurationSeconds(elapsedSeconds)}
                  </p>
                </div>
                <div className="glass-pill-tile rounded-[20px] p-3 text-center">
                  <p className="text-[10px] font-bold uppercase text-[#B51224] flex items-center justify-center gap-1">
                    <Compass className="h-3 w-3" />
                    Avg / Peak
                  </p>
                  <p className="font-display text-lg font-extrabold text-[#29262B] tabular-nums">
                    {avgSpeedKmh.toFixed(1)} / {maxSpeedKmh.toFixed(1)}
                  </p>
                  <p className="text-[10px] font-semibold text-[#777078]">km/h</p>
                </div>
              </div>

              {deviationDetected && (
                <div
                  role="alert"
                  className="glass-pill-tile liquid-reveal-enter flex items-start gap-2 rounded-[20px] border-[#E9E5E8] p-3 text-xs text-[#B51224]"
                >
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-[#C9182B]" />
                  <span>
                    <strong>Babala: Lumihis sa Ruta:</strong> Pinakamalayong paglihis ay{' '}
                    {deviationKm.toFixed(2)} km.
                  </span>
                </div>
              )}

              <div>
                <label className="mb-1 block text-xs font-bold uppercase text-[#777078]">
                  Aktwal na Pamasaheng Binayaran (PHP, opsyonal)
                </label>
                <input
                  type="number"
                  step="0.25"
                  value={recordedFareInput}
                  onChange={(e) => setRecordedFareInput(e.target.value)}
                  placeholder="Ilagay ang eksaktong pamasaheng binayaran..."
                  className="glass-input w-full rounded-2xl px-3.5 py-2 text-sm"
                />
              </div>

              {/* Live Location & Speed Sharing */}
              <div className="glass-pill-tile min-w-0 max-w-full overflow-hidden rounded-2xl p-3 sm:p-3.5 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="flex items-center gap-1.5 text-xs font-bold text-[#C9182B] min-w-0">
                    <Share2 className="h-3.5 w-3.5 shrink-0" />
                    <span className="truncate">
                      {isOffline
                        ? 'Offline Emergency SMS Share'
                        : 'I-share ang Live Location at Bilis'}
                    </span>
                  </p>
                  {activeShareSessions.length > 0 && isOnline && (
                    <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-[#C9182B] px-2.5 py-0.5 text-[10px] font-bold uppercase text-white">
                      <Radio className="h-3 w-3 animate-pulse" />
                      Naka-Live Stream ({activeShareSessions.length})
                    </span>
                  )}
                </div>

                <div className="grid gap-2 sm:grid-cols-2 min-w-0">
                  <select
                    value={shareContactId}
                    onChange={(e) => setShareContactId(e.target.value)}
                    aria-label="Select trusted contact"
                    className="glass-input min-w-0 w-full rounded-xl px-2.5 py-2 text-xs"
                  >
                    <option value="">Kahit sinong pinagkakatiwalaan...</option>
                    {(trustedContacts ?? []).map((tc) => (
                      <option key={tc.id} value={tc.id}>
                        {tc.contact_name}
                      </option>
                    ))}
                  </select>

                  {!isOffline && (
                    <select
                      value={shareDurationMinutes}
                      onChange={(e) => setShareDurationMinutes(Number(e.target.value))}
                      aria-label="Share link duration"
                      className="glass-input min-w-0 w-full rounded-xl px-2.5 py-2 text-xs"
                    >
                      <option value={15}>May bisa ng 15 minuto</option>
                      <option value={30}>May bisa ng 30 minuto</option>
                      <option value={60}>May bisa ng 1 oras</option>
                      <option value={120}>May bisa ng 2 oras</option>
                      <option value={240}>May bisa ng 4 na oras</option>
                    </select>
                  )}
                </div>

                {!isOffline && (
                  <label className="flex items-start gap-2 text-[11px] font-semibold text-[#343039] cursor-pointer">
                    <input
                      type="checkbox"
                      checked={shareIncludeHistory}
                      onChange={(e) => {
                        const next = e.target.checked;
                        setShareIncludeHistory(next);
                        try {
                          localStorage.setItem(
                            'pamtrack_share_history_v1',
                            next ? 'true' : 'false'
                          );
                        } catch {}
                      }}
                      className="mt-0.5 h-4 w-4 shrink-0 accent-[#C9182B]"
                    />
                    <span className="leading-snug">
                      Isama ang kamakailang Trip History para sa pinagsendan ng link
                    </span>
                  </label>
                )}

                <div className="grid grid-cols-1 min-[340px]:grid-cols-2 gap-2 w-full">
                  {isOffline ? (
                    <a href={smsHref} className="min-[340px]:col-span-2 w-full">
                      <GlassButton type="button" variant="secondary" size="sm" className="w-full">
                        I-send sa SMS ang Lokasyon at Bilis
                      </GlassButton>
                    </a>
                  ) : (
                    <>
                      <GlassButton
                        type="button"
                        variant="secondary"
                        size="sm"
                        className="w-full min-w-0 px-2.5"
                        disabled={shareMutation.isPending}
                        onClick={() => shareMutation.mutate()}
                      >
                        <Share2 className="h-3.5 w-3.5 shrink-0" />
                        <span className="truncate">
                          {shareMutation.isPending
                            ? 'Ginagawa...'
                            : activeShareSessions.length > 0
                              ? 'Bagong Share Link'
                              : 'Gumawa ng Share Link'}
                        </span>
                      </GlassButton>
                      <a href={smsHref} className="w-full min-w-0">
                        <GlassButton type="button" variant="glass" size="sm" className="w-full min-w-0 px-2.5">
                          <PhoneCall className="h-3.5 w-3.5 shrink-0 text-[#C9182B]" />
                          <span className="truncate">I-send sa SMS</span>
                        </GlassButton>
                      </a>
                    </>
                  )}
                </div>

                {activeShareSessions.length > 0 && (
                  <div className="space-y-2 pt-1 min-w-0 max-w-full">
                    {activeShareSessions.map((sess) => {
                      const link = `${window.location.origin}/shared-trip/${sess.share_token}`;
                      const isCopied = copiedToken === sess.share_token;
                      return (
                        <div
                          key={sess.id}
                          className="liquid-reveal-enter min-w-0 max-w-full overflow-hidden rounded-xl bg-[#F8E7EA] border border-white/80 p-2.5 text-[11px] space-y-2"
                        >
                          <div className="flex flex-wrap items-center justify-between gap-1.5">
                            <span className="font-bold text-[#B51224]">
                              Naka-stream {currentSpeedKmh.toFixed(1)} km/h •{' '}
                              {distanceTraveledKm.toFixed(2)} km
                            </span>
                            <span className="text-[10px] font-semibold text-[#5B555E]">
                              Hanggang {formatDateTimeSafe(sess.expires_at)}
                            </span>
                          </div>
                          <a
                            href={link}
                            target="_blank"
                            rel="noreferrer"
                            className="block w-full min-w-0 break-all font-mono text-[10.5px] leading-snug underline text-[#29262B]"
                          >
                            {link}
                          </a>
                          <div className="grid grid-cols-2 gap-1.5">
                            <GlassButton
                              type="button"
                              variant="primary"
                              size="sm"
                              className="w-full min-w-0 px-2"
                              onClick={() => handleCopyShareLink(sess.share_token)}
                            >
                              {isCopied ? (
                                <>
                                  <Check className="h-3 w-3 shrink-0" /> Nakopya na
                                </>
                              ) : (
                                <>
                                  <Copy className="h-3 w-3 shrink-0" /> Kopyahin
                                </>
                              )}
                            </GlassButton>
                            <GlassButton
                              type="button"
                              variant="secondary"
                              size="sm"
                              className="w-full min-w-0 px-2"
                              onClick={() => handleNativeShare(sess.share_token)}
                            >
                              <Share2 className="h-3 w-3 shrink-0" /> I-share
                            </GlassButton>
                            <a href={link} target="_blank" rel="noreferrer" className="w-full min-w-0">
                              <GlassButton type="button" variant="glass" size="sm" className="w-full min-w-0 px-2">
                                <ExternalLink className="h-3 w-3 shrink-0 text-[#C9182B]" /> Monitor
                              </GlassButton>
                            </a>
                            {!sess.id.startsWith('pending-') && (
                              <GlassButton
                                type="button"
                                variant="danger"
                                size="sm"
                                className="w-full min-w-0 px-2"
                                disabled={revokeShareMutation.isPending}
                                onClick={() => revokeShareMutation.mutate(sess.id)}
                              >
                                <Trash2 className="h-3 w-3 shrink-0" /> I-revoke
                              </GlassButton>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 min-[340px]:grid-cols-3 gap-2 w-full">
                <GlassButton
                  type="button"
                  variant="primary"
                  size="sm"
                  className="min-[340px]:col-span-2 w-full min-w-0"
                  disabled={endMutation.isPending}
                  onClick={() => endMutation.mutate('completed')}
                >
                  <CheckCircle2 className="h-4 w-4 shrink-0" />
                  <span className="truncate">Tapusin at I-save</span>
                </GlassButton>
                <GlassButton
                  type="button"
                  variant="danger"
                  size="sm"
                  className="w-full min-w-0"
                  disabled={endMutation.isPending}
                  onClick={() => endMutation.mutate('cancelled')}
                >
                  <Square className="h-4 w-4 shrink-0" />
                  <span>Kanselahin</span>
                </GlassButton>
              </div>

              {!trackingActive && (
                <div className="glass-pill-tile rounded-2xl p-3 flex flex-wrap items-center justify-between gap-2 text-xs text-[#B51224]">
                  <span>Naka-pause ang GPS. I-resume muna para tuloy ang pag-track ng bilis at galaw.</span>
                  <GlassButton
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => startTracking()}
                  >
                    I-resume ang GPS
                  </GlassButton>
                </div>
              )}
            </>
          )}
        </GlassCard>

        {/* Live Map / Offline Corridor Radar + Offline Alerts */}
        <div className="min-w-0 lg:col-span-7 space-y-5">
          <GlassCard variant="surface" className="p-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="font-display text-lg font-bold text-[#29262B]">
                {isOffline ? 'Offline Moving GPS Monitor' : 'Live na Mapa ng Biyahe'}
              </h2>
              <div className="flex flex-wrap items-center gap-2">
                {nearestMunicipality && (
                  <span className="glass-pill-tile rounded-full px-3 py-1 text-[11px] font-bold text-[#B51224]">
                    Malapit sa: {nearestMunicipality.municipality.name}
                  </span>
                )}
                {!isOffline && (
                  <button
                    type="button"
                    onClick={() => setFollowGps((v) => !v)}
                    className={`rounded-full px-3 py-1 text-[11px] font-bold transition-all duration-200 active:scale-95 ${
                      followGps
                        ? 'bg-[#C9182B] text-white'
                        : 'glass-pill-tile text-[#343039]'
                    }`}
                  >
                    {followGps ? 'Sinusundan GPS' : 'Sundan GPS'}
                  </button>
                )}
              </div>
            </div>

            {isOffline ? (
              <OfflineTripRadar
                originName={originMuni?.name ?? 'Pinanggalingan'}
                destName={destMuni?.name ?? 'Pupuntahan'}
                originCoords={
                  originMuni ? [originMuni.latitude, originMuni.longitude] : null
                }
                destCoords={destMuni ? [destMuni.latitude, destMuni.longitude] : null}
                plannedPolyline={plannedPolyline}
                trail={trail}
                currentPosition={currentPosition}
                distanceTraveledKm={distanceTraveledKm}
                remainingDestKm={remainingDestKm}
                deviationKm={deviationKm}
                nearestLguName={nearestMunicipality?.municipality.name}
                speedKmh={currentSpeedKmh}
                avgSpeedKmh={avgSpeedKmh}
                headingDeg={currentHeadingDeg}
                movementLabel={movementState.label}
              />
            ) : (
              <div className="h-[340px] sm:h-[400px] overflow-hidden rounded-3xl border border-white/80 shadow-glass">
                <MapContainer
                  center={
                    currentPosition
                      ? [currentPosition.latitude, currentPosition.longitude]
                      : ORIENTAL_MINDORO_MAP_CENTER
                  }
                  zoom={currentPosition ? 13 : 9}
                  scrollWheelZoom
                  className="h-full w-full z-0"
                >
                  <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  />
                  <LiveMapAutoFollower
                    lat={currentPosition?.latitude ?? null}
                    lng={currentPosition?.longitude ?? null}
                    follow={followGps}
                  />
                  {plannedPolyline.length >= 2 && (
                    <Polyline
                      positions={plannedPolyline}
                      pathOptions={{ color: '#C9182B', weight: 4, dashArray: '8 6' }}
                    />
                  )}
                  {originMuni && (
                    <CircleMarker
                      center={[originMuni.latitude, originMuni.longitude]}
                      radius={7}
                      pathOptions={{ color: '#C9182B', fillColor: '#FFFFFF', fillOpacity: 1, weight: 3 }}
                    >
                      <Popup>Galing: {originMuni.name}</Popup>
                    </CircleMarker>
                  )}
                  {destMuni && (
                    <CircleMarker
                      center={[destMuni.latitude, destMuni.longitude]}
                      radius={7}
                      pathOptions={{ color: '#FFFFFF', fillColor: '#B51224', fillOpacity: 1, weight: 2.5 }}
                    >
                      <Popup>Pupuntahan: {destMuni.name}</Popup>
                    </CircleMarker>
                  )}
                  {trail.length >= 2 && (
                    <Polyline
                      positions={trail}
                      pathOptions={{ color: '#B51224', weight: 5 }}
                    />
                  )}
                  {currentPosition && (
                    <Circle
                      center={[currentPosition.latitude, currentPosition.longitude]}
                      radius={Math.max(15, Math.min(350, currentPosition.accuracyMeters))}
                      pathOptions={{ color: '#C9182B', fillColor: '#C9182B', fillOpacity: 0.1, weight: 1 }}
                    />
                  )}
                  {currentPosition && (
                    <Marker
                      position={[currentPosition.latitude, currentPosition.longitude]}
                      icon={liveIcon}
                    >
                      <Popup>
                        <strong>{currentSpeedKmh.toFixed(1)} km/h</strong> • {movementState.label}
                        {compassDirection !== '—' ? ` • ${compassDirection}` : ''} (±{currentPosition.accuracyMeters} m)
                      </Popup>
                    </Marker>
                  )}
                </MapContainer>
              </div>
            )}
          </GlassCard>

          {/* Offline-Ready Alerts & Quick Safety Controls */}
          <GlassCard variant="strong" className="p-4 sm:p-5 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <BellRing className="h-4 w-4 text-[#C9182B]" />
                <h2 className="font-display text-base font-bold text-[#29262B]">
                  Mga Alerto sa Biyahe at Kaligtasan {isOffline ? '(Handa Offline)' : ''}
                </h2>
              </div>

              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    const next = !soundEnabled;
                    setSoundEnabled(next);
                    setOfflineAlertSoundEnabled(next);
                    if (!next) {
                      stopOfflineAlertAlarm();
                      releaseBackgroundTripAudio().catch(() => null);
                    } else {
                      armBackgroundTripAudio().catch(() => null);
                    }
                  }}
                  aria-label={soundEnabled ? 'I-mute ang tunog ng alerto' : 'Buksan ang tunog ng alerto'}
                  className="liquid-btn-glass inline-flex items-center gap-1 rounded-full px-3 py-1 text-[11px] font-bold text-[#29262B]"
                >
                  {soundEnabled ? (
                    <Volume2 className="h-3.5 w-3.5 text-[#C9182B]" />
                  ) : (
                    <VolumeX className="h-3.5 w-3.5 text-[#343039]" />
                  )}
                  {soundEnabled ? 'Malakas na Sirena: ON' : 'Naka-mute'}
                </button>

                {notifPerm === 'default' && (
                  <GlassButton
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={async () => {
                      const perm = await requestAlertPermission();
                      setNotifPerm(perm);
                    }}
                  >
                    Payagan ang Lock-Screen Alerts
                  </GlassButton>
                )}
              </div>
            </div>

            {alarmRinging && (
              <div
                role="status"
                aria-live="assertive"
                className="liquid-reveal-enter flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-white/80 bg-[#C9182B] px-4 py-3 text-white shadow-lg animate-pulse"
              >
                <div className="flex items-center gap-2 text-xs font-extrabold">
                  <Volume2 className="h-4 w-4 shrink-0" />
                  <span>Tumutunog ang Sunod-sunod na Sirena — I-tap ang Stop para patahimikin</span>
                </div>
                <GlassButton
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => stopOfflineAlertAlarm()}
                >
                  <VolumeX className="h-3.5 w-3.5 text-[#C9182B]" />
                  Itigil ang Alarm
                </GlassButton>
              </div>
            )}

            <p className="text-[11px] leading-snug text-[#343039]">
              Panatilihing bukas o naka-background ang app habang bumabyahe at payagan ang tunog at
              notifications para tumunog pa rin ang sunod-sunod na sirena kahit nakapatay ang screen
              (hindi makapag-play ng tunog kung naka-power off nang tuluyan ang phone).
            </p>

            <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
              <GlassButton
                type="button"
                variant="secondary"
                size="sm"
                onClick={() =>
                  fireTripAlert({
                    type: 'arrival_alert',
                    title: 'Naitala ang Ligtas na Pagdating',
                    message: currentPosition
                      ? `Nag-check-in sa ${currentPosition.latitude.toFixed(4)}°N, ${currentPosition.longitude.toFixed(4)}°E${isOffline ? ' (Offline)' : ''}.`
                      : `Na-save ang safe arrival${isOffline ? ' offline' : ''}.`,
                    repeatMs: 6000,
                  })
                }
              >
                <CheckCircle2 className="h-3.5 w-3.5" />
                Alerto sa Pagdating
              </GlassButton>

              <GlassButton
                type="button"
                variant="primary"
                size="sm"
                onClick={() =>
                  fireTripAlert({
                    type: 'safety_alert',
                    title: 'Nagpadala ng SOS Emergency Alert',
                    message: currentPosition
                      ? `Emergency alert sa rutang ${routeSummaryLabel} bandang ${currentPosition.latitude.toFixed(4)}°N, ${currentPosition.longitude.toFixed(4)}°E.`
                      : `Nagpadala ng emergency alert sa rutang ${routeSummaryLabel}.`,
                    urgent: true,
                    repeatMs: 30000,
                  })
                }
              >
                <AlertTriangle className="h-3.5 w-3.5" />
                Mag-send ng SOS
              </GlassButton>

              <GlassButton
                type="button"
                variant="glass"
                size="sm"
                onClick={() =>
                  fireTripAlert({
                    type: 'route_deviation_warning',
                    title: 'Naka-on ang Test ng Sirena',
                    message: 'Tuloy-tuloy ang tunog ng malakas na sirena, vibration, at notification.',
                    urgent: true,
                    repeatMs: 8000,
                  })
                }
              >
                <Volume2 className="h-3.5 w-3.5 text-[#C9182B]" />
                Subukan ang Sirena
              </GlassButton>

              <a href={smsHref} className="w-full sm:w-auto">
                <GlassButton type="button" variant="glass" size="sm" className="w-full sm:w-auto">
                  <PhoneCall className="h-3.5 w-3.5 text-[#C9182B]" />
                  Offline SMS SOS
                </GlassButton>
              </a>
            </div>

            {alertLog.length > 0 && (
              <div className="space-y-2 pt-1 max-h-48 overflow-y-auto">
                {alertLog.slice(0, 5).map((al) => (
                  <div
                    key={al.id}
                    className="glass-pill-tile liquid-reveal-enter flex items-start justify-between gap-2 rounded-2xl px-3.5 py-2.5 text-xs"
                  >
                    <div className="min-w-0">
                      <p className="font-bold text-[#29262B]">{al.title}</p>
                      <p className="text-[#343039] truncate">{al.message}</p>
                    </div>
                    <span className="shrink-0 text-[10px] font-bold text-[#B51224]">
                      {al.synced ? 'Na-sync' : 'Naka-save Offline'} • {formatDateSafe(al.createdAt, 'h:mm a')}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </GlassCard>

          {/* Commuter's Personal Trip History */}
          <GlassCard variant="strong" className="p-4 sm:p-5 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <History className="h-4 w-4 text-[#C9182B] shrink-0" />
                <h2 className="font-display text-base font-bold text-[#29262B]">
                  Mga Nagawa Kong Biyahe ({sharedHistoryItems.length})
                </h2>
              </div>
              {sharedHistoryItems.length > 0 && (
                <span className="glass-pill-tile rounded-full px-2.5 py-0.5 text-[10px] font-bold text-[#B51224]">
                  {shareIncludeHistory ? 'Naka-share sa Live Link' : 'Pribado Lang'}
                </span>
              )}
            </div>

            {sharedHistoryItems.length === 0 ? (
              <p className="text-xs text-[#5B555E]">
                Lalabas dito ang mga natapos o na-save mong biyahe at awtomatikong makikita ng pinagsendan mo ng Live Trip link.
              </p>
            ) : (
              <div className="space-y-2 max-h-72 overflow-y-auto pr-0.5">
                {sharedHistoryItems.map((hist, idx) => (
                  <div
                    key={hist.id}
                    style={{ '--stagger': idx } as React.CSSProperties}
                    className="glass-pill-tile liquid-reveal-enter min-w-0 rounded-2xl px-3.5 py-2.5 text-xs space-y-1"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-1.5">
                      <p className="font-bold text-[#29262B] truncate">
                        {hist.origin_name} → {hist.destination_name}
                      </p>
                      <span
                        className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                          hist.status === 'completed'
                            ? 'bg-[#C9182B] text-white'
                            : 'bg-white/80 text-[#343039]'
                        }`}
                      >
                        {hist.status === 'completed' ? 'Tapos' : hist.status === 'cancelled' ? 'Kanselado' : hist.status}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-[#343039]">
                      <span className="truncate">
                        {hist.transport_mode} • {hist.distance_km.toFixed(2)} km •{' '}
                        {formatDurationSeconds(hist.duration_seconds)}
                        {hist.avg_speed_kmh !== null ? ` • ${hist.avg_speed_kmh} km/h avg` : ''}
                      </span>
                      <span className="shrink-0 font-semibold text-[#5B555E]">
                        {formatDateSafe(hist.started_at, 'MMM d, h:mm a')}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </GlassCard>
        </div>
      </div>
    </div>
  );
}
