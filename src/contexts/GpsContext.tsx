import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useMunicipalities } from '@/hooks/useReferenceData';
import { findNearestMunicipality, type NearestMunicipalityMatch } from '@/lib/gpsUtils';
import { isBrowserOnline } from '@/lib/offlineCache';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';

export type GpsPermissionState = 'prompt' | 'granted' | 'denied' | 'unsupported';

export interface GpsPositionSnapshot {
  latitude: number;
  longitude: number;
  accuracyMeters: number;
  speedMps: number | null;
  headingDeg: number | null;
  timestamp: number;
}

interface GpsContextValue {
  permissionState: GpsPermissionState;
  consentGranted: boolean;
  trackingActive: boolean;
  requesting: boolean;
  currentPosition: GpsPositionSnapshot | null;
  nearestMunicipality: NearestMunicipalityMatch | null;
  gpsError: string | null;
  lowAccuracyWarning: boolean;
  requestSingleFix: (explicitConsent?: boolean) => Promise<GpsPositionSnapshot | null>;
  startTracking: () => Promise<boolean>;
  stopTracking: () => Promise<void>;
  grantConsent: () => Promise<void>;
  revokeConsent: () => Promise<void>;
}

const GpsContext = createContext<GpsContextValue | undefined>(undefined);

const GPS_CONSENT_STORAGE_KEY = 'pamasahe_gps_consent_v1';

export function GpsProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const { data: muniRes } = useMunicipalities();
  const municipalities = muniRes?.data ?? [];

  const isSupported =
    typeof navigator !== 'undefined' && 'geolocation' in navigator;

  const [permissionState, setPermissionState] = useState<GpsPermissionState>(
    isSupported ? 'prompt' : 'unsupported'
  );
  const [consentGranted, setConsentGranted] = useState<boolean>(() => {
    try {
      return localStorage.getItem(GPS_CONSENT_STORAGE_KEY) === 'true';
    } catch {
      return false;
    }
  });
  const [trackingActive, setTrackingActive] = useState(false);
  const [requesting, setRequesting] = useState(false);
  const [currentPosition, setCurrentPosition] = useState<GpsPositionSnapshot | null>(
    null
  );
  const [gpsError, setGpsError] = useState<string | null>(null);

  const watchIdRef = useRef<number | null>(null);
  const sessionIdRef = useRef<string | null>(null);

  // Inspect Permissions API status without silently querying location
  useEffect(() => {
    if (!isSupported) {
      setPermissionState('unsupported');
      return;
    }
    if (typeof navigator.permissions?.query === 'function') {
      navigator.permissions
        .query({ name: 'geolocation' })
        .then((res) => {
          setPermissionState(res.state as GpsPermissionState);
          res.onchange = () => {
            setPermissionState(res.state as GpsPermissionState);
          };
        })
        .catch(() => {
          // Permissions API unsupported in this browser; rely on direct calls
        });
    }
  }, [isSupported]);

  const nearestMunicipality = useMemo(() => {
    if (!currentPosition) return null;
    return findNearestMunicipality(
      currentPosition.latitude,
      currentPosition.longitude,
      municipalities
    );
  }, [currentPosition, municipalities]);

  const lowAccuracyWarning = Boolean(
    currentPosition && currentPosition.accuracyMeters > 500
  );

  const syncConsentToDb = useCallback(
    async (granted: boolean) => {
      if (!user || !isSupabaseConfigured || !supabase || !isBrowserOnline()) return;
      try {
        await supabase.from('user_location_preferences').upsert({
          user_id: user.id,
          gps_consent_granted: granted,
          allow_live_trip_tracking: granted,
          consent_updated_at: new Date().toISOString(),
        });
      } catch {
        // Offline / transient network errors stay non-blocking
      }
    },
    [user]
  );

  const grantConsent = useCallback(async () => {
    setConsentGranted(true);
    try {
      localStorage.setItem(GPS_CONSENT_STORAGE_KEY, 'true');
    } catch {}
    await syncConsentToDb(true);
  }, [syncConsentToDb]);

  const stopTracking = useCallback(async () => {
    if (isSupported && watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    setTrackingActive(false);

    if (sessionIdRef.current && user && isSupabaseConfigured && supabase && isBrowserOnline()) {
      const sid = sessionIdRef.current;
      sessionIdRef.current = null;
      try {
        await supabase
          .from('user_location_sessions')
          .update({
            is_active: false,
            stopped_at: new Date().toISOString(),
          })
          .eq('id', sid)
          .eq('user_id', user.id);
      } catch {
        // Non-blocking when offline
      }
    } else {
      sessionIdRef.current = null;
    }
  }, [isSupported, user]);

  const revokeConsent = useCallback(async () => {
    await stopTracking();
    setConsentGranted(false);
    setCurrentPosition(null);
    try {
      localStorage.removeItem(GPS_CONSENT_STORAGE_KEY);
    } catch {}
    await syncConsentToDb(false);
  }, [stopTracking, syncConsentToDb]);

  const mapGeoError = (err: GeolocationPositionError): string => {
    if (err.code === err.PERMISSION_DENIED) {
      setPermissionState('denied');
      return 'Location permission denied. Enable browser GPS access to detect your Oriental Mindoro location.';
    }
    if (err.code === err.POSITION_UNAVAILABLE) {
      return 'GPS position is currently unavailable on this device or network.';
    }
    if (err.code === err.TIMEOUT) {
      return 'GPS request timed out. Move to an open signal area and retry.';
    }
    return err.message || 'Unable to acquire GPS fix.';
  };

  const applySnapshot = useCallback(
    async (pos: GeolocationPosition) => {
      const snap: GpsPositionSnapshot = {
        latitude: Number(pos.coords.latitude.toFixed(6)),
        longitude: Number(pos.coords.longitude.toFixed(6)),
        accuracyMeters: Math.round(pos.coords.accuracy),
        speedMps: pos.coords.speed ?? null,
        headingDeg: pos.coords.heading ?? null,
        timestamp: pos.timestamp,
      };
      setPermissionState('granted');
      setGpsError(null);
      setCurrentPosition(snap);

      if (sessionIdRef.current && user && isSupabaseConfigured && supabase && isBrowserOnline()) {
        const match = findNearestMunicipality(
          snap.latitude,
          snap.longitude,
          municipalities
        );
        try {
          await supabase
            .from('user_location_sessions')
            .update({
              last_latitude: snap.latitude,
              last_longitude: snap.longitude,
              last_accuracy_meters: snap.accuracyMeters,
              detected_municipality_id: match?.withinOrientalMindoro
                ? match.municipality.id
                : null,
            })
            .eq('id', sessionIdRef.current)
            .eq('user_id', user.id);
        } catch {
          // Keep live GPS monitoring active even if background telemetry update fails offline
        }
      }

      return snap;
    },
    [municipalities, user]
  );

  const requestSingleFix = useCallback(
    async (explicitConsent = false): Promise<GpsPositionSnapshot | null> => {
      if (!isSupported) {
        setPermissionState('unsupported');
        setGpsError('Geolocation is not supported by this browser.');
        return null;
      }

      if (explicitConsent) {
        await grantConsent();
      } else if (!consentGranted) {
        setGpsError('Explicit location consent is required before reading your GPS.');
        return null;
      }

      setRequesting(true);
      setGpsError(null);

      return new Promise((resolve) => {
        navigator.geolocation.getCurrentPosition(
          async (pos) => {
            const snap = await applySnapshot(pos);
            setRequesting(false);
            resolve(snap);
          },
          (err) => {
            setGpsError(mapGeoError(err));
            setRequesting(false);
            resolve(null);
          },
          {
            enableHighAccuracy: true,
            timeout: 12000,
            maximumAge: 15000,
          }
        );
      });
    },
    [isSupported, consentGranted, grantConsent, applySnapshot]
  );

  const startTracking = useCallback(async (): Promise<boolean> => {
    if (!isSupported) {
      setPermissionState('unsupported');
      setGpsError('Geolocation is not supported by this browser.');
      return false;
    }

    await grantConsent();
    const initial = await requestSingleFix(true);
    if (!initial) {
      return false;
    }

    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
    }

    if (user && isSupabaseConfigured && supabase && isBrowserOnline() && !sessionIdRef.current) {
      const match = findNearestMunicipality(
        initial.latitude,
        initial.longitude,
        municipalities
      );
      try {
        const { data: created } = await supabase
          .from('user_location_sessions')
          .insert({
            user_id: user.id,
            permission_state: 'granted',
            is_active: true,
            last_latitude: initial.latitude,
            last_longitude: initial.longitude,
            last_accuracy_meters: initial.accuracyMeters,
            detected_municipality_id: match?.withinOrientalMindoro
              ? match.municipality.id
              : null,
          })
          .select('id')
          .single();
        if (created?.id) {
          sessionIdRef.current = created.id;
        }
      } catch {
        // Proceed with local browser GPS watch even when session logging is offline
      }
    }

    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        applySnapshot(pos);
      },
      (err) => {
        setGpsError(mapGeoError(err));
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 5000,
      }
    );

    setTrackingActive(true);
    return true;
  }, [isSupported, grantConsent, requestSingleFix, user, municipalities, applySnapshot]);

  // Clear watch cleanly on unmount
  useEffect(() => {
    return () => {
      if (isSupported && watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, [isSupported]);

  return (
    <GpsContext.Provider
      value={{
        permissionState,
        consentGranted,
        trackingActive,
        requesting,
        currentPosition,
        nearestMunicipality,
        gpsError,
        lowAccuracyWarning,
        requestSingleFix,
        startTracking,
        stopTracking,
        grantConsent,
        revokeConsent,
      }}
    >
      {children}
    </GpsContext.Provider>
  );
}

export function useGps() {
  const ctx = useContext(GpsContext);
  if (!ctx) throw new Error('useGps must be used inside GpsProvider');
  return ctx;
}
