import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  MapContainer,
  Marker,
  Polyline,
  Popup,
  TileLayer,
} from 'react-leaflet';
import L from 'leaflet';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  AlertTriangle,
  BellRing,
  CheckCircle2,
  Clock,
  Navigation,
  PhoneCall,
  Play,
  Radio,
  Share2,
  ShieldAlert,
  Square,
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
  useMunicipalities,
  useMyTrips,
  useTransportTypes,
  useTrustedContacts,
} from '@/hooks/useReferenceData';
import { ORIENTAL_MINDORO_MAP_CENTER } from '@/data/orientalMindoro';
import { partitionFareRecords } from '@/lib/fareIntegrity';
import {
  computeRouteDeviationKm,
  formatDurationSeconds,
} from '@/lib/gpsUtils';
import { isNetworkUnavailableError } from '@/lib/offlineCache';
import {
  buildLocalTripRecord,
  buildOfflineEmergencySmsHref,
  clearOfflineActiveTrip,
  getOfflineAlertSoundEnabled,
  type OfflineAlertRecord,
  queueCompletedOfflineTrip,
  readOfflineActiveTrip,
  readOfflineAlerts,
  requestAlertPermission,
  saveOfflineActiveTrip,
  saveOfflineAlert,
  setOfflineAlertSoundEnabled,
  triggerOfflineDeviceAlert,
} from '@/lib/offlineTripsAndAlerts';
import { fetchOsrmDrivingRoute, type OsrmRouteResult } from '@/lib/osrm';
import { formatDateSafe, formatPhp, haversineDistanceKm } from '@/lib/utils';
import {
  createLocationSharingSession,
  finishTripRecord,
  startTripRecord,
  updateActiveTripProgress,
} from '@/services/pamasaheApi';
import type { FareExpenseType, NotificationType, TripRecord } from '@/types/database';
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

  const [recordedFareInput, setRecordedFareInput] = useState('');
  const [shareContactId, setShareContactId] = useState('');
  const [createdShareToken, setCreatedShareToken] = useState<string | null>(null);

  const lastPointRef = useRef<[number, number] | null>(null);

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

  const fireTripAlert = useCallback(
    (input: {
      type: NotificationType;
      title: string;
      message: string;
      urgent?: boolean;
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
      triggerOfflineDeviceAlert({
        title: input.title,
        body: input.message,
        urgent: input.urgent,
        soundEnabled,
      });
      pushToast({
        title: input.title,
        description: input.message,
        variant: input.urgent ? 'error' : 'info',
      });
    },
    [user?.id, currentPosition?.latitude, currentPosition?.longitude, soundEnabled, pushToast]
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

  const remainingDestKm = useMemo(() => {
    if (!currentPosition || !destMuni) return null;
    return haversineDistanceKm(
      currentPosition.latitude,
      currentPosition.longitude,
      destMuni.latitude,
      destMuni.longitude
    );
  }, [currentPosition, destMuni]);

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
    const { latitude, longitude, accuracyMeters, speedMps, headingDeg } =
      currentPosition;

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
        title: 'Route Deviation Alert',
        message: `Live GPS moved ${curDev} km off the planned corridor.`,
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
        title: `Approaching ${destMuni.name}`,
        message: `Your moving location is within ${ARRIVAL_ALERT_KM} km of ${destMuni.name}.`,
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

    if (isOnline && isConfigured && !activeTrip.id.startsWith('offline-')) {
      updateActiveTripProgress({
        tripId: activeTrip.id,
        userId: user.id,
        lat: latitude,
        lng: longitude,
        accuracyMeters,
        speedMps,
        headingDeg,
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
      if (!user) throw new Error('Sign in to start and save a live trip.');
      if (!originId || !destinationId || !transportTypeId || !originMuni || !destMuni) {
        throw new Error('Select origin, destination, and transport type first.');
      }
      const selectedTransport = transportTypes.find((t) => t.id === transportTypeId);
      if (!selectedTransport) {
        throw new Error('Select a valid transport type.');
      }

      const ok = await startTracking();
      if (!ok) {
        throw new Error('GPS tracking permission is required to monitor an active trip.');
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
      setActiveTrip(created);
      setDistanceTraveledKm(0);
      setDeviationDetected(false);
      setArrivalNotified(false);
      setDeviationKm(0);
      setTrail(initTrail);
      lastPointRef.current = initTrail[0] ?? null;
      saveOfflineActiveTrip(created, initTrail);
      queryClient.invalidateQueries({ queryKey: ['myTrips', user?.id] });
      pushToast({
        title: created.id.startsWith('offline-')
          ? 'Offline live trip started'
          : 'Live trip started',
        description: 'Moving GPS location and alerts are active.',
        variant: 'success',
      });
    },
    onError: (err: Error) => {
      pushToast({ title: 'Could not start trip', description: err.message, variant: 'error' });
    },
  });

  const endMutation = useMutation({
    mutationFn: async (status: 'completed' | 'cancelled') => {
      if (!activeTrip || !user) throw new Error('No active trip.');
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
      clearOfflineActiveTrip();
      setActiveTrip(null);
      setRecordedFareInput('');
      setCreatedShareToken(null);
      setArrivalNotified(false);
      queryClient.invalidateQueries({ queryKey: ['myTrips', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['notifications', user?.id] });
      fireTripAlert({
        type: 'trip_completed',
        title:
          finished.status === 'completed'
            ? finished.id.startsWith('offline-')
              ? 'Trip saved offline'
              : 'Trip completed & saved'
            : 'Trip cancelled',
        message: `${distanceTraveledKm.toFixed(2)} km • ${formatDurationSeconds(elapsedSeconds)}`,
      });
    },
    onError: (err: Error) => {
      pushToast({ title: 'Could not finish trip', description: err.message, variant: 'error' });
    },
  });

  const shareMutation = useMutation({
    mutationFn: async () => {
      if (!isOnline) throw new Error('Internet connection required for web share links.');
      if (!user || !activeTrip) throw new Error('Start an active trip first.');
      if (activeTrip.id.startsWith('offline-')) {
        throw new Error('Reconnect to generate an online tracking link. Use Offline SMS Alert below anytime.');
      }
      return createLocationSharingSession({
        userId: user.id,
        tripId: activeTrip.id,
        trustedContactId: shareContactId || null,
        durationMinutes: 60,
      });
    },
    onSuccess: (sess) => {
      setCreatedShareToken(sess.share_token);
      queryClient.invalidateQueries({ queryKey: ['locationSharing', user?.id] });
      pushToast({
        title: 'Time-limited trip share link created (60 mins)',
        variant: 'success',
      });
    },
    onError: (err: Error) => {
      pushToast({ title: 'Share failed', description: err.message, variant: 'error' });
    },
  });

  const shareUrl = createdShareToken
    ? `${window.location.origin}/shared-trip/${createdShareToken}`
    : null;

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
  });

  return (
    <div className="space-y-4 sm:space-y-6">
      <GlassCard variant="strong" className="p-4 sm:p-6 flex flex-col sm:flex-row sm:flex-wrap sm:items-center sm:justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-[11px] sm:text-xs font-bold uppercase tracking-widest text-[#C9182B]">
              GPS Trip Monitoring
            </p>
            {isOffline && (
              <span className="inline-flex items-center gap-1 rounded-full bg-[#F8E7EA] px-2.5 py-0.5 text-[10px] font-bold uppercase text-[#B51224]">
                <WifiOff className="h-3 w-3" />
                Offline Tracking Active
              </span>
            )}
          </div>
          <h1 className="font-display text-xl leading-tight font-extrabold text-[#29262B] sm:text-3xl">
            Live Trip Monitor
          </h1>
          <p className="text-xs sm:text-sm text-[#343039]">
            Track moving GPS location, distance, and route/arrival alerts online or offline.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap w-full sm:w-auto">
          <Link to="/trips/analytics" className="w-full sm:w-auto">
            <GlassButton variant="glass" size="sm" className="w-full">
              Trip Analytics
            </GlassButton>
          </Link>
          <Link to="/safety" className="w-full sm:w-auto">
            <GlassButton variant="secondary" size="sm" className="w-full">
              <ShieldAlert className="h-3.5 w-3.5 shrink-0" />
              Safety Center
            </GlassButton>
          </Link>
        </div>
      </GlassCard>

      <GpsConsentCard compact />

      {!user && (
        <GlassCard variant="strong" className="p-4 sm:p-5 border-[#E9E5E8] flex flex-col sm:flex-row sm:flex-wrap sm:items-center sm:justify-between gap-3">
          <p className="text-xs sm:text-sm font-semibold text-[#29262B]">
            Sign in to record trips and trigger offline alerts.
          </p>
          <Link to="/login" className="w-full sm:w-auto">
            <GlassButton variant="primary" size="sm" className="w-full sm:w-auto">
              Sign In to Start Trip
            </GlassButton>
          </Link>
        </GlassCard>
      )}

      {/* Trip Setup or Active Trip Controls */}
      <div className="grid gap-4 sm:gap-6 lg:grid-cols-12">
        <GlassCard variant="strong" className="p-4 sm:p-5 lg:col-span-5 space-y-4 h-fit">
          {!activeTrip ? (
            <>
              <h2 className="flex items-center gap-2 font-display text-lg font-bold text-[#29262B]">
                <Navigation className="h-5 w-5 text-[#C9182B]" />
                Configure New Trip
              </h2>

              <div className="space-y-3">
                <div>
                  <label className="mb-1 block text-xs font-bold uppercase text-[#777078]">
                    1. Origin Municipality / City
                  </label>
                  <select
                    value={originId}
                    onChange={(e) => setOriginId(e.target.value)}
                    className="glass-input w-full rounded-2xl px-3.5 py-2 text-sm"
                  >
                    <option value="">Select origin...</option>
                    {municipalities.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-1 block text-xs font-bold uppercase text-[#777078]">
                    2. Destination Municipality / City
                  </label>
                  <select
                    value={destinationId}
                    onChange={(e) => setDestinationId(e.target.value)}
                    className="glass-input w-full rounded-2xl px-3.5 py-2 text-sm"
                  >
                    <option value="">Select destination...</option>
                    {municipalities.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-1 block text-xs font-bold uppercase text-[#777078]">
                    3. Transportation Type
                  </label>
                  <select
                    value={transportTypeId}
                    onChange={(e) => setTransportTypeId(e.target.value)}
                    className="glass-input w-full rounded-2xl px-3.5 py-2 text-sm"
                  >
                    <option value="">Select mode...</option>
                    {transportTypes.map((tt) => (
                      <option key={tt.id} value={tt.id}>
                        {tt.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Available Fare Preview */}
                {originId && destinationId && (
                  <div className="glass-pill-tile rounded-2xl p-3.5 space-y-2 text-xs">
                    <p className="font-bold uppercase text-[#C9182B]">
                      4. Available Fare Records
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
                      <p className="text-[#343039]">No fare guide recorded for this corridor yet.</p>
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
                    ? 'Starting Trip...'
                    : isOffline
                      ? 'Start Live Trip (Offline)'
                      : 'Start Live Trip'}
                </GlassButton>
              </div>
            </>
          ) : (
            <>
              <div className="flex items-center justify-between gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-[#C9182B] px-3 py-1 text-xs font-bold text-white">
                  <Radio className="h-3.5 w-3.5 animate-pulse" />
                  {activeTrip.id.startsWith('offline-') || isOffline
                    ? 'Offline Trip Running'
                    : 'Active Trip Running'}
                </span>
                <span className="text-xs font-semibold text-[#C9182B]">
                  Started {formatDateSafe(activeTrip.started_at, 'h:mm a')}
                </span>
              </div>

              <h2 className="font-display text-xl font-extrabold text-[#29262B]">
                {originMuni?.name ?? 'Origin'} → {destMuni?.name ?? 'Destination'}
              </h2>

              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-2xl bg-[#F8E7EA] p-3 text-center">
                  <p className="text-[10px] font-bold uppercase text-[#B51224]">Distance</p>
                  <p className="font-display text-2xl font-extrabold text-[#C9182B]">
                    {distanceTraveledKm.toFixed(2)} km
                  </p>
                </div>
                <div className="glass-pill-tile rounded-[20px] p-3 text-center">
                  <p className="text-[10px] font-bold uppercase text-[#B51224]">Elapsed</p>
                  <p className="font-display text-2xl font-extrabold text-[#C9182B] flex items-center justify-center gap-1 tabular-nums">
                    <Clock className="h-4 w-4" />
                    {formatDurationSeconds(elapsedSeconds)}
                  </p>
                </div>
              </div>

              {deviationDetected && (
                <div
                  role="alert"
                  className="glass-pill-tile flex items-start gap-2 rounded-[20px] border-[#E9E5E8] p-3 text-xs text-[#B51224]"
                >
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-[#C9182B]" />
                  <span>
                    <strong>Route Deviation Alert:</strong> Max recorded offset is{' '}
                    {deviationKm.toFixed(2)} km.
                  </span>
                </div>
              )}

              <div>
                <label className="mb-1 block text-xs font-bold uppercase text-[#777078]">
                  Actual Fare Paid (PHP, optional)
                </label>
                <input
                  type="number"
                  step="0.25"
                  value={recordedFareInput}
                  onChange={(e) => setRecordedFareInput(e.target.value)}
                  placeholder="Enter exact fare paid..."
                  className="glass-input w-full rounded-2xl px-3.5 py-2 text-sm"
                />
              </div>

              {/* Online Web Share OR Offline SMS Quick Alert */}
              <div className="glass-pill-tile rounded-2xl p-3.5 space-y-2.5">
                <p className="flex items-center gap-1.5 text-xs font-bold text-[#C9182B]">
                  <Share2 className="h-3.5 w-3.5" />
                  {isOffline ? 'Offline Emergency SMS Share' : 'Share Active Trip (60-Min Link)'}
                </p>
                <div className="flex flex-wrap gap-2">
                  <select
                    value={shareContactId}
                    onChange={(e) => setShareContactId(e.target.value)}
                    className="glass-input flex-1 min-w-[140px] rounded-xl px-2.5 py-1.5 text-xs"
                  >
                    <option value="">Trusted contact...</option>
                    {(trustedContacts ?? []).map((tc) => (
                      <option key={tc.id} value={tc.id}>
                        {tc.contact_name}
                      </option>
                    ))}
                  </select>
                  {isOffline ? (
                    <a href={smsHref}>
                      <GlassButton type="button" variant="secondary" size="sm">
                        Send SMS Alert
                      </GlassButton>
                    </a>
                  ) : (
                    <GlassButton
                      type="button"
                      variant="secondary"
                      size="sm"
                      disabled={shareMutation.isPending}
                      onClick={() => shareMutation.mutate()}
                    >
                      Create Link
                    </GlassButton>
                  )}
                </div>
                {shareUrl && (
                  <div className="rounded-xl bg-[#F8E7EA] p-2 text-[11px] break-all">
                    <p className="font-bold text-[#B51224]">Shareable URL:</p>
                    <a href={shareUrl} target="_blank" rel="noreferrer" className="underline text-[#29262B]">
                      {shareUrl}
                    </a>
                  </div>
                )}
              </div>

              <div className="flex gap-2.5">
                <GlassButton
                  type="button"
                  variant="primary"
                  className="flex-1"
                  disabled={endMutation.isPending}
                  onClick={() => endMutation.mutate('completed')}
                >
                  <CheckCircle2 className="h-4 w-4" />
                  End &amp; Save Trip
                </GlassButton>
                <GlassButton
                  type="button"
                  variant="danger"
                  disabled={endMutation.isPending}
                  onClick={() => endMutation.mutate('cancelled')}
                >
                  <Square className="h-4 w-4" />
                  Cancel
                </GlassButton>
              </div>

              {!trackingActive && (
                <p className="text-xs text-[#B51224]">
                  Browser watch paused. Tap <strong>Start Tracking</strong> to resume updates.
                </p>
              )}
            </>
          )}
        </GlassCard>

        {/* Live Map / Offline Corridor Radar + Offline Alerts */}
        <div className="lg:col-span-7 space-y-5">
          <GlassCard variant="surface" className="p-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="font-display text-lg font-bold text-[#29262B]">
                {isOffline ? 'Offline Moving GPS Monitor' : 'Live Trip & Corridor Map'}
              </h2>
              {nearestMunicipality && (
                <span className="glass-pill-tile rounded-full px-3 py-1 text-[11px] font-bold text-[#B51224]">
                  Near: {nearestMunicipality.municipality.name}
                </span>
              )}
            </div>

            {isOffline ? (
              <OfflineTripRadar
                originName={originMuni?.name ?? 'Origin'}
                destName={destMuni?.name ?? 'Destination'}
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
              />
            ) : (
              <div className="h-[340px] sm:h-[400px] overflow-hidden rounded-3xl border border-white/80 shadow-glass">
                <MapContainer
                  center={
                    currentPosition
                      ? [currentPosition.latitude, currentPosition.longitude]
                      : ORIENTAL_MINDORO_MAP_CENTER
                  }
                  zoom={currentPosition ? 12 : 9}
                  scrollWheelZoom
                  className="h-full w-full z-0"
                >
                  <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  />
                  {plannedPolyline.length >= 2 && (
                    <Polyline
                      positions={plannedPolyline}
                      pathOptions={{ color: '#C9182B', weight: 4, dashArray: '8 6' }}
                    />
                  )}
                  {trail.length >= 2 && (
                    <Polyline
                      positions={trail}
                      pathOptions={{ color: '#B51224', weight: 5 }}
                    />
                  )}
                  {currentPosition && (
                    <Marker
                      position={[currentPosition.latitude, currentPosition.longitude]}
                      icon={liveIcon}
                    >
                      <Popup>
                        Current GPS Fix (±{currentPosition.accuracyMeters} m)
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
                  Trip &amp; Safety Alerts {isOffline ? '(Offline Ready)' : ''}
                </h2>
              </div>

              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    const next = !soundEnabled;
                    setSoundEnabled(next);
                    setOfflineAlertSoundEnabled(next);
                  }}
                  aria-label={soundEnabled ? 'Mute alert sound' : 'Enable alert sound'}
                  className="liquid-btn-glass inline-flex items-center gap-1 rounded-full px-3 py-1 text-[11px] font-bold text-[#29262B]"
                >
                  {soundEnabled ? (
                    <Volume2 className="h-3.5 w-3.5 text-[#C9182B]" />
                  ) : (
                    <VolumeX className="h-3.5 w-3.5 text-[#343039]" />
                  )}
                  {soundEnabled ? 'Sound On' : 'Muted'}
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
                    Allow Device Alerts
                  </GlassButton>
                )}
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <GlassButton
                type="button"
                variant="secondary"
                size="sm"
                onClick={() =>
                  fireTripAlert({
                    type: 'arrival_alert',
                    title: 'Safe Arrival Alert Logged',
                    message: currentPosition
                      ? `Checked in at ${currentPosition.latitude.toFixed(4)}°N, ${currentPosition.longitude.toFixed(4)}°E${isOffline ? ' (Offline)' : ''}.`
                      : `Safe arrival recorded${isOffline ? ' offline' : ''}.`,
                  })
                }
              >
                <CheckCircle2 className="h-3.5 w-3.5" />
                Safe Arrival Alert
              </GlassButton>

              <GlassButton
                type="button"
                variant="primary"
                size="sm"
                onClick={() =>
                  fireTripAlert({
                    type: 'safety_alert',
                    title: 'SOS Emergency Alert Triggered',
                    message: currentPosition
                      ? `Emergency alert along ${routeSummaryLabel} at ${currentPosition.latitude.toFixed(4)}°N, ${currentPosition.longitude.toFixed(4)}°E.`
                      : `Emergency alert triggered along ${routeSummaryLabel}.`,
                    urgent: true,
                  })
                }
              >
                <AlertTriangle className="h-3.5 w-3.5" />
                Trigger SOS Alert
              </GlassButton>

              <GlassButton
                type="button"
                variant="glass"
                size="sm"
                onClick={() =>
                  fireTripAlert({
                    type: 'route_deviation_warning',
                    title: 'Offline Alert Test Active',
                    message: 'Local toast, tone, vibration, and alert log verified.',
                    urgent: true,
                  })
                }
              >
                Test Offline Alert
              </GlassButton>

              <a href={smsHref}>
                <GlassButton type="button" variant="glass" size="sm">
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
                    className="glass-pill-tile flex items-start justify-between gap-2 rounded-2xl px-3.5 py-2.5 text-xs"
                  >
                    <div className="min-w-0">
                      <p className="font-bold text-[#29262B]">{al.title}</p>
                      <p className="text-[#343039] truncate">{al.message}</p>
                    </div>
                    <span className="shrink-0 text-[10px] font-bold text-[#B51224]">
                      {al.synced ? 'Synced' : 'Saved Offline'} • {formatDateSafe(al.createdAt, 'h:mm a')}
                    </span>
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
