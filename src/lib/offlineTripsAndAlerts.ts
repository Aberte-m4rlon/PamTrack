import type {
  Municipality,
  NotificationItem,
  NotificationType,
  TransportType,
  TripRecord,
} from '@/types/database';
import { isBrowserOnline, isNetworkUnavailableError } from '@/lib/offlineCache';
import {
  armBackgroundTripAudio,
  isAlertAlarmRinging,
  releaseBackgroundTripAudio,
  startLoudConsecutiveAlertSound,
  stopOfflineAlertAlarm,
  subscribeAlertAlarmState,
} from '@/lib/offlineAlertAudio';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import { finishTripRecord, startTripRecord } from '@/services/pamasaheApi';

export {
  armBackgroundTripAudio,
  isAlertAlarmRinging,
  releaseBackgroundTripAudio,
  stopOfflineAlertAlarm,
  subscribeAlertAlarmState,
};

const OFFLINE_ACTIVE_TRIP_KEY = 'pamtrack_offline_active_trip_v1';
const OFFLINE_TRIPS_QUEUE_KEY = 'pamtrack_offline_trips_queue_v1';
const OFFLINE_ALERTS_KEY = 'pamtrack_offline_alerts_v1';
const OFFLINE_SOUND_PREF_KEY = 'pamtrack_offline_alert_sound_v1';

export interface OfflineActiveTripState {
  trip: TripRecord;
  trail: [number, number][];
}

export interface OfflineAlertRecord {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  latitude: number | null;
  longitude: number | null;
  isRead: boolean;
  synced: boolean;
  createdAt: string;
}

function safeReadJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function safeWriteJson(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Ignore storage quota or private browsing errors
  }
}

export function getOfflineAlertSoundEnabled(): boolean {
  try {
    return localStorage.getItem(OFFLINE_SOUND_PREF_KEY) !== 'false';
  } catch {
    return true;
  }
}

export function setOfflineAlertSoundEnabled(enabled: boolean): void {
  try {
    localStorage.setItem(OFFLINE_SOUND_PREF_KEY, enabled ? 'true' : 'false');
  } catch {
    // Ignore storage errors
  }
}

export function saveOfflineActiveTrip(
  trip: TripRecord,
  trail: [number, number][]
): void {
  safeWriteJson(OFFLINE_ACTIVE_TRIP_KEY, {
    trip,
    trail: trail.slice(-160),
  } satisfies OfflineActiveTripState);
}

export function readOfflineActiveTrip(userId?: string): OfflineActiveTripState | null {
  const parsed = safeReadJson<OfflineActiveTripState | null>(OFFLINE_ACTIVE_TRIP_KEY, null);
  if (!parsed?.trip || parsed.trip.status !== 'active') return null;
  if (userId && parsed.trip.user_id !== userId) return null;
  return {
    trip: parsed.trip,
    trail: Array.isArray(parsed.trail) ? parsed.trail : [],
  };
}

export function clearOfflineActiveTrip(): void {
  try {
    localStorage.removeItem(OFFLINE_ACTIVE_TRIP_KEY);
  } catch {
    // Ignore storage errors
  }
}

export function buildLocalTripRecord(input: {
  userId: string;
  origin: Municipality;
  destination: Municipality;
  transportType: TransportType;
  associatedFareRecordId?: string | null;
  recordedFareAmount?: number | null;
  fareExpenseType?: 'recorded' | 'estimated' | 'none';
}): TripRecord {
  const now = new Date().toISOString();
  return {
    id: `offline-trip-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    user_id: input.userId,
    origin_municipality_id: input.origin.id,
    destination_municipality_id: input.destination.id,
    route_id: null,
    transport_type_id: input.transportType.id,
    associated_fare_record_id: input.associatedFareRecordId ?? null,
    recorded_fare_amount: input.recordedFareAmount ?? null,
    fare_expense_type: input.fareExpenseType ?? 'none',
    start_latitude: input.origin.latitude,
    start_longitude: input.origin.longitude,
    destination_latitude: input.destination.latitude,
    destination_longitude: input.destination.longitude,
    current_latitude: input.origin.latitude,
    current_longitude: input.origin.longitude,
    distance_km: 0,
    duration_seconds: 0,
    deviation_detected: false,
    max_deviation_km: 0,
    status: 'active',
    started_at: now,
    ended_at: null,
    notes: 'Recorded locally in Offline Trip Monitor',
    created_at: now,
    updated_at: now,
    origin: input.origin,
    destination: input.destination,
    transport_type: input.transportType,
  };
}

export function readOfflineCompletedTrips(userId?: string): TripRecord[] {
  const rows = safeReadJson<TripRecord[]>(OFFLINE_TRIPS_QUEUE_KEY, []);
  if (!Array.isArray(rows)) return [];
  return userId ? rows.filter((r) => r.user_id === userId) : rows;
}

export function queueCompletedOfflineTrip(trip: TripRecord): void {
  const existing = readOfflineCompletedTrips();
  const next = [trip, ...existing.filter((t) => t.id !== trip.id)].slice(0, 50);
  safeWriteJson(OFFLINE_TRIPS_QUEUE_KEY, next);
}

export function readOfflineAlerts(userId?: string): OfflineAlertRecord[] {
  const rows = safeReadJson<OfflineAlertRecord[]>(OFFLINE_ALERTS_KEY, []);
  if (!Array.isArray(rows)) return [];
  return userId ? rows.filter((a) => a.userId === userId) : rows;
}

export function saveOfflineAlert(input: {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  latitude?: number | null;
  longitude?: number | null;
  synced?: boolean;
}): OfflineAlertRecord {
  const record: OfflineAlertRecord = {
    id: `offline-alert-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    userId: input.userId,
    type: input.type,
    title: input.title,
    message: input.message,
    latitude: input.latitude ?? null,
    longitude: input.longitude ?? null,
    isRead: false,
    synced: Boolean(input.synced),
    createdAt: new Date().toISOString(),
  };
  const existing = readOfflineAlerts();
  safeWriteJson(OFFLINE_ALERTS_KEY, [record, ...existing].slice(0, 60));
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('pamtrack:offline-alerts-updated'));
  }
  return record;
}

export function markOfflineAlertRead(alertId?: string): void {
  const existing = readOfflineAlerts();
  const next = existing.map((a) =>
    !alertId || a.id === alertId ? { ...a, isRead: true } : a
  );
  safeWriteJson(OFFLINE_ALERTS_KEY, next);
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('pamtrack:offline-alerts-updated'));
  }
}

export function mapOfflineAlertsToNotifications(userId: string): NotificationItem[] {
  return readOfflineAlerts(userId).map((a) => ({
    id: a.id,
    user_id: a.userId,
    type: a.type,
    title: a.title,
    message: a.message,
    related_report_id: null,
    related_fare_id: null,
    is_read: a.isRead,
    read_at: a.isRead ? a.createdAt : null,
    dedupe_key: a.id,
    created_at: a.createdAt,
  }));
}

/**
 * Plays a loud consecutive repeating alarm, vibrates intensely on mobile,
 * and fires a high-priority lock-screen notification without network calls.
 */
export async function triggerOfflineDeviceAlert(input: {
  title: string;
  body: string;
  urgent?: boolean;
  soundEnabled?: boolean;
  repeatMs?: number;
}): Promise<void> {
  const mode = input.urgent ? 'urgent' : /approaching/i.test(input.title) ? 'arrival' : 'info';

  if (input.soundEnabled !== false) {
    startLoudConsecutiveAlertSound({
      title: input.title,
      mode,
      repeatMs: input.repeatMs,
    });
  } else if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
    try {
      navigator.vibrate(
        input.urgent ? [450, 110, 450, 110, 450, 160, 650] : [260, 90, 260, 90, 420]
      );
    } catch {
      // Ignore browser vibrate errors
    }
  }

  if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
    try {
      const reg = await navigator.serviceWorker?.getRegistration?.();
      const options: NotificationOptions & {
        renotify?: boolean;
        vibrate?: number[];
      } = {
        body: input.body,
        icon: '/assets/pamasahe-tracker-icon.png',
        badge: '/assets/pamasahe-tracker-icon.png',
        tag: `pamtrack-alert-${input.urgent ? 'urgent' : 'info'}`,
        requireInteraction: Boolean(input.urgent),
        renotify: true,
        silent: false,
        vibrate: input.urgent ? [450, 110, 450, 110, 450, 160, 650] : [260, 90, 260],
      };

      if (reg && typeof reg.showNotification === 'function') {
        await reg.showNotification(input.title, options);
        return;
      }
      new Notification(input.title, options);
    } catch {
      // Ignore notification construction errors inside constrained contexts
    }
  }
}

export async function requestAlertPermission(): Promise<
  'granted' | 'denied' | 'default' | 'unsupported'
> {
  if (typeof Notification === 'undefined') return 'unsupported';
  try {
    return await Notification.requestPermission();
  } catch {
    return Notification.permission;
  }
}

export function buildOfflineEmergencySmsHref(input: {
  phone?: string | null;
  userName?: string | null;
  routeLabel: string;
  latitude?: number | null;
  longitude?: number | null;
  speedKmh?: number | null;
  shareUrl?: string | null;
}): string {
  const coords =
    typeof input.latitude === 'number' && typeof input.longitude === 'number'
      ? `${input.latitude.toFixed(5)}, ${input.longitude.toFixed(5)}`
      : 'GPS pending';
  const speedPart =
    typeof input.speedKmh === 'number' && Number.isFinite(input.speedKmh)
      ? ` Speed: ${input.speedKmh.toFixed(1)} km/h.`
      : '';
  const linkPart = input.shareUrl ? ` Track live: ${input.shareUrl}` : '';
  const body = `PAMASAHE TRACKER LIVE TRIP (${input.userName || 'Commuter'}): Route ${input.routeLabel}. GPS: ${coords}.${speedPart}${linkPart}`;
  const cleanPhone = (input.phone || '').replace(/[^\d+]/g, '');
  return cleanPhone
    ? `sms:${cleanPhone}?body=${encodeURIComponent(body)}`
    : `sms:?body=${encodeURIComponent(body)}`;
}

/**
 * Uploads queued offline trips and offline alert logs once connectivity returns.
 */
export async function syncPendingOfflineTripData(userId: string): Promise<number> {
  if (!userId || !isBrowserOnline() || !isSupabaseConfigured || !supabase) return 0;

  let syncedCount = 0;

  // Sync queued completed/cancelled offline trips
  const queuedTrips = readOfflineCompletedTrips();
  const remainingTrips: TripRecord[] = [];
  for (const t of queuedTrips) {
    if (
      t.user_id !== userId ||
      !t.origin_municipality_id ||
      !t.destination_municipality_id ||
      !t.transport_type_id
    ) {
      remainingTrips.push(t);
      continue;
    }
    try {
      const remote = await startTripRecord({
        userId,
        originMunicipalityId: t.origin_municipality_id,
        destinationMunicipalityId: t.destination_municipality_id,
        transportTypeId: t.transport_type_id,
        startLat: t.start_latitude,
        startLng: t.start_longitude,
        destLat: t.destination_latitude,
        destLng: t.destination_longitude,
        associatedFareRecordId: t.associated_fare_record_id,
        recordedFareAmount: t.recorded_fare_amount,
        fareExpenseType: t.fare_expense_type,
        notes: t.notes ?? undefined,
      });
      await finishTripRecord({
        tripId: remote.id,
        userId,
        status: t.status === 'cancelled' ? 'cancelled' : 'completed',
        distanceKm: t.distance_km,
        durationSeconds: t.duration_seconds,
        recordedFareAmount: t.recorded_fare_amount,
        fareExpenseType: t.fare_expense_type,
        notes: t.notes ?? undefined,
      });
      syncedCount += 1;
    } catch (err) {
      if (isNetworkUnavailableError(err)) {
        remainingTrips.push(t);
      }
    }
  }
  safeWriteJson(OFFLINE_TRIPS_QUEUE_KEY, remainingTrips);

  // Sync unsynced offline alerts into notifications table
  const alerts = readOfflineAlerts();
  const updatedAlerts: OfflineAlertRecord[] = [];
  for (const a of alerts) {
    if (a.userId !== userId || a.synced) {
      updatedAlerts.push(a);
      continue;
    }
    try {
      const { error } = await supabase.from('notifications').insert({
        user_id: userId,
        type: a.type,
        title: a.title,
        message: a.message,
        dedupe_key: a.id,
      });
      if (!error) {
        syncedCount += 1;
        updatedAlerts.push({ ...a, synced: true });
      } else {
        updatedAlerts.push(a);
      }
    } catch {
      updatedAlerts.push(a);
    }
  }
  safeWriteJson(OFFLINE_ALERTS_KEY, updatedAlerts);

  return syncedCount;
}
