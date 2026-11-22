import { useEffect, useMemo, useRef, useState } from 'react';
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
  CheckCircle2,
  Clock,
  Navigation,
  Play,
  Radio,
  Share2,
  ShieldAlert,
  Square,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useGps } from '@/contexts/GpsContext';
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
import { fetchOsrmDrivingRoute, type OsrmRouteResult } from '@/lib/osrm';
import { formatDateSafe, formatPhp, haversineDistanceKm } from '@/lib/utils';
import {
  createLocationSharingSession,
  finishTripRecord,
  startTripRecord,
  updateActiveTripProgress,
} from '@/services/pamasaheApi';
import type { FareExpenseType, TripRecord } from '@/types/database';
import { GpsConsentCard } from '@/components/gps/GpsConsentCard';
import {
  FareStatusBadge,
  GlassButton,
  GlassCard,
} from '@/components/glass/GlassPrimitives';

const DEVIATION_THRESHOLD_KM = 2.0;

const liveIcon = L.divIcon({
  className: 'trip-live-pin',
  html: `<div style="width:18px;height:18px;border-radius:9999px;background:#DC2626;border:3px solid #fff;box-shadow:0 0 0 6px rgba(220,38,38,0.28);"></div>`,
  iconSize: [18, 18],
  iconAnchor: [9, 9],
});

export function LiveTripPage() {
  const { user, isConfigured } = useAuth();
  const {
    currentPosition,
    trackingActive,
    startTracking,
    stopTracking,
  } = useGps();
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

  const [recordedFareInput, setRecordedFareInput] = useState('');
  const [shareContactId, setShareContactId] = useState('');
  const [createdShareToken, setCreatedShareToken] = useState<string | null>(null);

  const lastPointRef = useRef<[number, number] | null>(null);

  useEffect(() => {
    if (existingActiveTrip && !activeTrip) {
      setActiveTrip(existingActiveTrip);
      setOriginId(existingActiveTrip.origin_municipality_id ?? '');
      setDestinationId(existingActiveTrip.destination_municipality_id ?? '');
      setTransportTypeId(existingActiveTrip.transport_type_id ?? '');
      setDistanceTraveledKm(existingActiveTrip.distance_km ?? 0);
      setDeviationDetected(existingActiveTrip.deviation_detected ?? false);
      setDeviationKm(existingActiveTrip.max_deviation_km ?? 0);
    }
  }, [existingActiveTrip, activeTrip]);

  const originMuni = municipalities.find((m) => m.id === originId);
  const destMuni = municipalities.find((m) => m.id === destinationId);

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

  // Fetch OSRM planned corridor when origin & destination differ
  useEffect(() => {
    if (!originMuni || !destMuni || originMuni.id === destMuni.id) {
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
  }, [originMuni, destMuni]);

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

  // Process GPS updates during an active trip
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
    setTrail((prev) => [...prev, nextCoord].slice(-120));

    let curDev = 0;
    if (plannedPolyline.length >= 2) {
      curDev = computeRouteDeviationKm(latitude, longitude, plannedPolyline);
    }
    const maxDev = Math.max(deviationKm, curDev);
    const hasDeviated = deviationDetected || curDev > DEVIATION_THRESHOLD_KM;
    setDeviationKm(maxDev);
    if (hasDeviated && !deviationDetected) {
      setDeviationDetected(true);
      pushToast({
        title: 'Route deviation detected',
        description: `Live GPS moved ${curDev} km off the planned corridor.`,
        variant: 'error',
      });
    }

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
      // Non-fatal background sync error
    });
  }, [currentPosition?.timestamp]); // eslint-disable-line react-hooks/exhaustive-deps

  const startMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('Sign in to start and save a live trip.');
      if (!originId || !destinationId || !transportTypeId) {
        throw new Error('Select origin, destination, and transport type first.');
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

      return startTripRecord({
        userId: user.id,
        originMunicipalityId: originId,
        destinationMunicipalityId: destinationId,
        transportTypeId,
        startLat: originMuni?.latitude ?? null,
        startLng: originMuni?.longitude ?? null,
        destLat: destMuni?.latitude ?? null,
        destLng: destMuni?.longitude ?? null,
        associatedFareRecordId: bestFare?.id ?? null,
        recordedFareAmount: bestFare?.fare_amount ?? null,
        fareExpenseType: expenseType,
      });
    },
    onSuccess: (created) => {
      setActiveTrip(created);
      setDistanceTraveledKm(0);
      setDeviationDetected(false);
      setDeviationKm(0);
      setTrail([]);
      lastPointRef.current = currentPosition
        ? [currentPosition.latitude, currentPosition.longitude]
        : null;
      queryClient.invalidateQueries({ queryKey: ['myTrips', user?.id] });
      pushToast({
        title: 'Live trip started',
        description: 'GPS progress and elapsed time are now being monitored.',
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

      return finishTripRecord({
        tripId: activeTrip.id,
        userId: user.id,
        status,
        distanceKm: distanceTraveledKm,
        durationSeconds: elapsedSeconds,
        recordedFareAmount: hasCustom
          ? customFare
          : activeTrip.recorded_fare_amount,
        fareExpenseType: hasCustom
          ? 'recorded'
          : activeTrip.fare_expense_type,
      });
    },
    onSuccess: (finished) => {
      setActiveTrip(null);
      setRecordedFareInput('');
      setCreatedShareToken(null);
      queryClient.invalidateQueries({ queryKey: ['myTrips', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['notifications', user?.id] });
      pushToast({
        title:
          finished.status === 'completed'
            ? 'Trip completed & saved'
            : 'Trip cancelled',
        variant: finished.status === 'completed' ? 'success' : 'info',
      });
    },
    onError: (err: Error) => {
      pushToast({ title: 'Could not finish trip', description: err.message, variant: 'error' });
    },
  });

  const shareMutation = useMutation({
    mutationFn: async () => {
      if (!user || !activeTrip) throw new Error('Start an active trip first.');
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

  return (
    <div className="space-y-6">
      <GlassCard variant="strong" className="p-5 sm:p-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-[#DC2626]">
            GPS Trip Monitoring
          </p>
          <h1 className="font-display text-2xl font-extrabold text-[#24191D] sm:text-3xl">
            Live Trip Monitor
          </h1>
          <p className="text-xs sm:text-sm text-[#78716C]">
            Select your route and transport mode, view verified fares, monitor elapsed time and
            GPS distance, detect route deviations, and save trips to your history.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link to="/trips/analytics">
            <GlassButton variant="glass" size="sm">
              Trip History &amp; Analytics
            </GlassButton>
          </Link>
          <Link to="/safety">
            <GlassButton variant="secondary" size="sm">
              <ShieldAlert className="h-3.5 w-3.5" />
              Safety Center
            </GlassButton>
          </Link>
        </div>
      </GlassCard>

      <GpsConsentCard compact />

      {!user && (
        <GlassCard variant="strong" className="p-5 border-[#FECDD3] flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs sm:text-sm font-semibold text-[#24191D]">
            Sign in to save live trips, record breadcrumbs, and share active trips with trusted
            contacts.
          </p>
          <Link to="/login">
            <GlassButton variant="primary" size="sm">
              Sign In to Start Trip
            </GlassButton>
          </Link>
        </GlassCard>
      )}

      {/* Trip Setup or Active Trip Controls */}
      <div className="grid gap-6 lg:grid-cols-12">
        <GlassCard variant="strong" className="p-5 lg:col-span-5 space-y-4 h-fit">
          {!activeTrip ? (
            <>
              <h2 className="flex items-center gap-2 font-display text-lg font-bold text-[#24191D]">
                <Navigation className="h-5 w-5 text-[#DC2626]" />
                Configure New Trip
              </h2>

              <div className="space-y-3">
                <div>
                  <label className="mb-1 block text-xs font-bold uppercase text-[#78716C]">
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
                  <label className="mb-1 block text-xs font-bold uppercase text-[#78716C]">
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
                  <label className="mb-1 block text-xs font-bold uppercase text-[#78716C]">
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
                  <div className="rounded-2xl border border-[#FFE4E6] bg-white/85 p-3.5 space-y-2 text-xs">
                    <p className="font-bold uppercase text-[#DC2626]">
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
                      <p className="text-[#78716C]">
                        No verified official fare is currently available for this route.
                      </p>
                    )}
                  </div>
                )}

                <GlassButton
                  type="button"
                  variant="primary"
                  className="w-full"
                  disabled={!user || !isConfigured || startMutation.isPending}
                  onClick={() => startMutation.mutate()}
                >
                  <Play className="h-4 w-4" />
                  {startMutation.isPending ? 'Starting Trip...' : 'Start Live Trip'}
                </GlassButton>

                <p className="text-[11px] leading-snug text-[#78716C]">
                  <strong className="text-[#24191D]">Important:</strong> GPS cannot automatically identify which specific
                  vehicle you are riding, and browser location tracking requires this tab to stay
                  open.
                </p>
              </div>
            </>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-[#DC2626] px-3 py-1 text-xs font-bold text-white">
                  <Radio className="h-3.5 w-3.5 animate-pulse" />
                  Active Trip Running
                </span>
                <span className="text-xs font-semibold text-[#DC2626]">
                  Started {formatDateSafe(activeTrip.started_at, 'h:mm a')}
                </span>
              </div>

              <h2 className="font-display text-xl font-extrabold text-[#24191D]">
                {originMuni?.name ?? 'Origin'} → {destMuni?.name ?? 'Destination'}
              </h2>

              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-2xl bg-[#FFE4E6] p-3 text-center">
                  <p className="text-[10px] font-bold uppercase text-[#B91C1C]">Distance</p>
                  <p className="font-display text-2xl font-extrabold text-[#DC2626]">
                    {distanceTraveledKm.toFixed(2)} km
                  </p>
                </div>
                <div className="glass-pill-tile rounded-[20px] p-3 text-center">
                  <p className="text-[10px] font-bold uppercase text-[#B91C1C]">Elapsed</p>
                  <p className="font-display text-2xl font-extrabold text-[#DC2626] flex items-center justify-center gap-1 tabular-nums">
                    <Clock className="h-4 w-4" />
                    {formatDurationSeconds(elapsedSeconds)}
                  </p>
                </div>
              </div>

              {deviationDetected && (
                <div className="glass-pill-tile flex items-start gap-2 rounded-[20px] border-[#FCA5A5]/70 p-3 text-xs text-[#B91C1C]">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-[#DC2626]" />
                  <span>
                    <strong>Route Deviation Alert:</strong> Max recorded offset from planned
                    corridor is {deviationKm.toFixed(2)} km.
                  </span>
                </div>
              )}

              <div>
                <label className="mb-1 block text-xs font-bold uppercase text-[#78716C]">
                  Actual Fare Paid (PHP, optional override)
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

              {/* Quick Trusted Contact Share */}
              <div className="rounded-2xl border border-[#FFE4E6] bg-white/85 p-3.5 space-y-2.5">
                <p className="flex items-center gap-1.5 text-xs font-bold text-[#DC2626]">
                  <Share2 className="h-3.5 w-3.5" />
                  Share Active Trip (60-Min Consent Link)
                </p>
                <div className="flex gap-2">
                  <select
                    value={shareContactId}
                    onChange={(e) => setShareContactId(e.target.value)}
                    className="glass-input flex-1 rounded-xl px-2.5 py-1.5 text-xs"
                  >
                    <option value="">Any trusted link holder...</option>
                    {(trustedContacts ?? []).map((tc) => (
                      <option key={tc.id} value={tc.id}>
                        {tc.contact_name}
                      </option>
                    ))}
                  </select>
                  <GlassButton
                    type="button"
                    variant="secondary"
                    size="sm"
                    disabled={shareMutation.isPending}
                    onClick={() => shareMutation.mutate()}
                  >
                    Create Link
                  </GlassButton>
                </div>
                {shareUrl && (
                  <div className="rounded-xl bg-[#FFE4E6] p-2 text-[11px] break-all">
                    <p className="font-bold text-[#B91C1C]">Shareable URL:</p>
                    <a href={shareUrl} target="_blank" rel="noreferrer" className="underline text-[#24191D]">
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
                <p className="text-xs text-[#B91C1C]">
                  Browser watch paused. Tap <strong>Start Tracking</strong> to resume updates.
                </p>
              )}
            </>
          )}
        </GlassCard>

        {/* Live Map View */}
        <GlassCard variant="surface" className="p-4 lg:col-span-7 space-y-3">
          <h2 className="font-display text-lg font-bold text-[#24191D]">
            Live Trip &amp; Corridor Map
          </h2>
          <div className="h-[340px] sm:h-[440px] overflow-hidden rounded-3xl border border-white/80 shadow-glass">
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
                  pathOptions={{ color: '#DC2626', weight: 4, dashArray: '8 6' }}
                />
              )}
              {trail.length >= 2 && (
                <Polyline
                  positions={trail}
                  pathOptions={{ color: '#B91C1C', weight: 5 }}
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
        </GlassCard>
      </div>
    </div>
  );
}
