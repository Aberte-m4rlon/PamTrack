import type {
  FareRecord,
  FareSource,
  Municipality,
  RouteRecord,
  TransportType,
} from '@/types/database';

export type OfflineCacheKey =
  | 'municipalities'
  | 'transport_types'
  | 'fare_records'
  | 'fare_sources'
  | 'routes';

const CACHE_KEY_PREFIX = 'pamtrack_offline_v3_';
const LAST_SYNCED_KEY = 'pamtrack_offline_last_synced_v3';

interface CachedEnvelope<T> {
  cachedAt: string;
  data: T;
}

export function isBrowserOnline(): boolean {
  if (typeof navigator === 'undefined') return true;
  return navigator.onLine !== false;
}

export function getLastSyncedAt(): string | null {
  try {
    return localStorage.getItem(LAST_SYNCED_KEY);
  } catch {
    return null;
  }
}

export function recordOfflineSyncTimestamp(iso?: string): string {
  const timestamp = iso || new Date().toISOString();
  try {
    localStorage.setItem(LAST_SYNCED_KEY, timestamp);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('pamtrack:sync-updated', { detail: timestamp }));
    }
  } catch {
    // Ignore storage quota / privacy mode restrictions
  }
  return timestamp;
}

export function saveOfflineSnapshot<T>(key: OfflineCacheKey, data: T): void {
  try {
    const cachedAt = new Date().toISOString();
    const payload: CachedEnvelope<T> = { cachedAt, data };
    localStorage.setItem(`${CACHE_KEY_PREFIX}${key}`, JSON.stringify(payload));
    recordOfflineSyncTimestamp(cachedAt);
  } catch {
    // Ignore storage quota errors cleanly
  }
}

export function readOfflineSnapshot<T>(key: OfflineCacheKey): CachedEnvelope<T> | null {
  try {
    const raw = localStorage.getItem(`${CACHE_KEY_PREFIX}${key}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CachedEnvelope<T>;
    if (!parsed || typeof parsed !== 'object' || !('data' in parsed)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function saveOfflineFareRecords(records: FareRecord[]): void {
  saveOfflineSnapshot('fare_records', records);
}

export function readOfflineFareRecords(): FareRecord[] {
  return readOfflineSnapshot<FareRecord[]>('fare_records')?.data ?? [];
}

export function saveOfflineRoutes(routes: RouteRecord[]): void {
  saveOfflineSnapshot('routes', routes);
}

export function readOfflineRoutes(): RouteRecord[] {
  return readOfflineSnapshot<RouteRecord[]>('routes')?.data ?? [];
}

export function saveOfflineFareSources(sources: FareSource[]): void {
  saveOfflineSnapshot('fare_sources', sources);
}

export function readOfflineFareSources(): FareSource[] {
  return readOfflineSnapshot<FareSource[]>('fare_sources')?.data ?? [];
}

export function saveOfflineMunicipalities(municipalities: Municipality[]): void {
  saveOfflineSnapshot('municipalities', municipalities);
}

export function readOfflineMunicipalities(): Municipality[] {
  return readOfflineSnapshot<Municipality[]>('municipalities')?.data ?? [];
}

export function saveOfflineTransportTypes(types: TransportType[]): void {
  saveOfflineSnapshot('transport_types', types);
}

export function readOfflineTransportTypes(): TransportType[] {
  return readOfflineSnapshot<TransportType[]>('transport_types')?.data ?? [];
}

export function isNetworkUnavailableError(err: unknown): boolean {
  if (!isBrowserOnline()) return true;
  if (!err || (typeof err !== 'object' && typeof err !== 'string')) return false;

  const errName =
    typeof err === 'object' && 'name' in err && typeof err.name === 'string'
      ? err.name.toLowerCase()
      : '';
  if (errName === 'aborterror' || errName === 'timeouterror') {
    return true;
  }

  const status =
    typeof err === 'object' && 'status' in err && typeof err.status === 'number'
      ? err.status
      : null;
  if (status !== null && (status === 0 || status >= 500)) {
    return true;
  }

  const rawMsg =
    typeof err === 'string'
      ? err
      : typeof err === 'object' && 'message' in err && typeof err.message === 'string'
        ? err.message
        : err instanceof Error
          ? err.message
          : '';
  const msg = rawMsg.toLowerCase();

  return (
    msg.includes('failed to fetch') ||
    msg.includes('networkerror') ||
    msg.includes('network request failed') ||
    msg.includes('load failed') ||
    msg.includes('err_internet_disconnected') ||
    msg.includes('offline') ||
    msg.includes('timeout') ||
    msg.includes('timed out') ||
    msg.includes('aborterror') ||
    msg.includes('aborted') ||
    msg.includes('bad gateway') ||
    msg.includes('service unavailable') ||
    msg.includes('gateway time-out') ||
    msg.includes('<!doctype') ||
    msg.includes('unexpected token \'<\'') ||
    msg.includes('fetcherror') ||
    msg.includes('econnreset') ||
    msg.includes('econnrefused')
  );
}
