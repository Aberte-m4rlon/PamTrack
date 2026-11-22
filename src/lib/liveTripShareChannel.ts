import type { RealtimeChannel } from '@supabase/supabase-js';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import type { TripStatus } from '@/types/database';

export interface LiveTripBreadcrumbPoint {
  latitude: number;
  longitude: number;
  speedKmh: number;
  headingDeg: number | null;
  accuracyMeters: number | null;
  recordedAt: string;
}

export interface SharedAlertBannerPayload {
  title: string;
  message: string;
  urgent: boolean;
  triggeredAt: string;
}

export interface LiveTripTelemetryPacket {
  shareToken: string;
  tripId: string;
  commuterName: string;
  originName: string;
  destinationName: string;
  transportMode: string;
  tripStatus: TripStatus;
  latitude: number;
  longitude: number;
  accuracyMeters: number | null;
  speedKmh: number;
  avgSpeedKmh: number;
  maxSpeedKmh: number;
  headingDeg: number | null;
  movementLabel: string;
  distanceKm: number;
  elapsedSeconds: number;
  remainingKm: number | null;
  etaMinutes: number | null;
  deviationKm: number;
  deviationDetected: boolean;
  nearestLguName: string | null;
  originCoords: [number, number] | null;
  destinationCoords: [number, number] | null;
  trail: LiveTripBreadcrumbPoint[];
  alertBanner: SharedAlertBannerPayload | null;
  updatedAt: string;
}

export const SHARED_TRIP_CHANNEL_PREFIX = 'live_trip_share:';

const SHARED_TRAIL_STORAGE_PREFIX = 'pamtrack_shared_trail_v1_';

export function readStoredSharedTrail(token: string): LiveTripBreadcrumbPoint[] {
  try {
    const raw = sessionStorage.getItem(`${SHARED_TRAIL_STORAGE_PREFIX}${token}`);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as LiveTripBreadcrumbPoint[];
    return Array.isArray(parsed) ? parsed.slice(-150) : [];
  } catch {
    return [];
  }
}

export function writeStoredSharedTrail(
  token: string,
  points: LiveTripBreadcrumbPoint[]
): void {
  try {
    sessionStorage.setItem(
      `${SHARED_TRAIL_STORAGE_PREFIX}${token}`,
      JSON.stringify(points.slice(-150))
    );
  } catch {
    // Ignore storage quota / restricted browsing errors
  }
}

/**
 * Maintains Supabase Realtime Broadcast channels for active trip share tokens
 * so recipients viewing `/shared-trip/:token` receive sub-second movement, speed,
 * heading, trail, and emergency alerts without waiting for DB polling.
 */
export class LiveTripShareBroadcaster {
  private channels = new Map<string, RealtimeChannel>();
  private subscribedTokens = new Set<string>();
  private latestPacket: Omit<LiveTripTelemetryPacket, 'shareToken'> | null = null;

  syncTokens(tokens: string[]): void {
    if (!isSupabaseConfigured || !supabase) return;
    const cleanTokens = Array.from(new Set(tokens.filter(Boolean)));
    const wanted = new Set(cleanTokens);

    for (const [token, channel] of this.channels.entries()) {
      if (!wanted.has(token)) {
        this.channels.delete(token);
        this.subscribedTokens.delete(token);
        try {
          void supabase.removeChannel(channel);
        } catch {
          // Non-fatal teardown
        }
      }
    }

    for (const token of cleanTokens) {
      if (this.channels.has(token)) continue;
      try {
        const channel = supabase
          .channel(`${SHARED_TRIP_CHANNEL_PREFIX}${token}`, {
            config: { broadcast: { self: false, ack: false } },
          })
          .on('broadcast', { event: 'viewer_hello' }, () => {
            if (this.latestPacket && this.subscribedTokens.has(token)) {
              void this.sendToChannel(token, channel, this.latestPacket);
            }
          });

        channel.subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            this.subscribedTokens.add(token);
            if (this.latestPacket) {
              void this.sendToChannel(token, channel, this.latestPacket);
            }
          } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
            this.subscribedTokens.delete(token);
          }
        });

        this.channels.set(token, channel);
      } catch {
        // Ignore broadcast setup failures cleanly (DB polling still serves viewer)
      }
    }
  }

  broadcast(packet: Omit<LiveTripTelemetryPacket, 'shareToken'>): void {
    this.latestPacket = packet;
    for (const [token, channel] of this.channels.entries()) {
      if (this.subscribedTokens.has(token)) {
        void this.sendToChannel(token, channel, packet);
      }
    }
  }

  private async sendToChannel(
    token: string,
    channel: RealtimeChannel,
    packet: Omit<LiveTripTelemetryPacket, 'shareToken'>
  ): Promise<void> {
    try {
      await channel.send({
        type: 'broadcast',
        event: 'telemetry',
        payload: {
          ...packet,
          shareToken: token,
        } satisfies LiveTripTelemetryPacket,
      });
    } catch {
      // Ignore transient WebSocket drops cleanly
    }
  }

  destroy(): void {
    if (!supabase) return;
    for (const channel of this.channels.values()) {
      try {
        void supabase.removeChannel(channel);
      } catch {
        // Ignore teardown
      }
    }
    this.channels.clear();
    this.subscribedTokens.clear();
    this.latestPacket = null;
  }
}

/**
 * Subscribes a verified shared-trip viewer to real-time commuter movement & speed packets.
 */
export function subscribeSharedTripStream(
  token: string,
  enabled: boolean,
  onTelemetry: (packet: LiveTripTelemetryPacket) => void,
  onConnectionChange?: (connected: boolean) => void
): () => void {
  if (!enabled || !token || !isSupabaseConfigured || !supabase) {
    onConnectionChange?.(false);
    return () => {};
  }

  const client = supabase;
  let disposed = false;

  try {
    const channel = client
      .channel(`${SHARED_TRIP_CHANNEL_PREFIX}${token}`, {
        config: { broadcast: { self: false, ack: false } },
      })
      .on('broadcast', { event: 'telemetry' }, ({ payload }) => {
        if (!disposed && payload) {
          onTelemetry(payload as LiveTripTelemetryPacket);
        }
      })
      .subscribe((status) => {
        if (disposed) return;
        if (status === 'SUBSCRIBED') {
          onConnectionChange?.(true);
          void channel.send({
            type: 'broadcast',
            event: 'viewer_hello',
            payload: { token, joinedAt: new Date().toISOString() },
          });
        } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
          onConnectionChange?.(false);
        }
      });

    return () => {
      disposed = true;
      onConnectionChange?.(false);
      try {
        void client.removeChannel(channel);
      } catch {
        // Ignore cleanup errors
      }
    };
  } catch {
    onConnectionChange?.(false);
    return () => {};
  }
}
