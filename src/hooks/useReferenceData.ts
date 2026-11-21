import { useEffect, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import {
  fetchAdminAggregatedAnalytics,
  fetchAllAgencyReferrals,
  fetchFareRecords,
  fetchFareReports,
  fetchFareSources,
  fetchGovernmentAgencies,
  fetchLocationSharingSessions,
  fetchMunicipalities,
  fetchMyFavorites,
  fetchMyTrips,
  fetchNotifications,
  fetchOperators,
  fetchRoutes,
  fetchSafetyReports,
  fetchTransportStops,
  fetchTransportTypes,
  fetchTrustedContacts,
  fetchVehicleReports,
} from '@/services/pamasaheApi';
import { useAuth } from '@/contexts/AuthContext';
import { useNetwork } from '@/contexts/NetworkContext';

interface ActiveChannelEntry {
  channel: RealtimeChannel;
  listeners: Set<() => void>;
}

const activeRealtimeChannels = new Map<string, ActiveChannelEntry>();
let realtimeChannelSeq = 0;

/**
 * Shares a single Supabase Realtime subscription per logical resource key across
 * all concurrently mounted hooks/components and React StrictMode cycles.
 * Unique monotonic topic names prevent "cannot add postgres_changes callbacks
 * after subscribe()" crashes caused by async channel teardown or duplicate calls.
 */
function useRealtimeInvalidation(
  channelKey: string,
  enabled: boolean,
  config: { table: string; filter?: string },
  onEvent: () => void
) {
  const onEventRef = useRef(onEvent);
  onEventRef.current = onEvent;

  useEffect(() => {
    if (!enabled || !isSupabaseConfigured || !supabase) return;

    const listener = () => onEventRef.current();
    let entry = activeRealtimeChannels.get(channelKey);

    if (!entry) {
      realtimeChannelSeq += 1;
      const topic = `${channelKey}::${realtimeChannelSeq}`;
      const listeners = new Set<() => void>([listener]);
      try {
        const channel = supabase
          .channel(topic)
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: config.table,
              ...(config.filter ? { filter: config.filter } : {}),
            },
            () => {
              const current = activeRealtimeChannels.get(channelKey);
              current?.listeners.forEach((fn) => fn());
            }
          )
          .subscribe();
        entry = { channel, listeners };
        activeRealtimeChannels.set(channelKey, entry);
      } catch {
        return;
      }
    } else {
      entry.listeners.add(listener);
    }

    return () => {
      const current = activeRealtimeChannels.get(channelKey);
      if (!current) return;
      current.listeners.delete(listener);
      if (current.listeners.size === 0) {
        activeRealtimeChannels.delete(channelKey);
        try {
          void supabase?.removeChannel(current.channel);
        } catch {
          // Ignore teardown errors
        }
      }
    };
  }, [channelKey, enabled, config.table, config.filter]);
}

export function useMunicipalities(includeInactive = false) {
  return useQuery({
    queryKey: ['municipalities', includeInactive],
    queryFn: () => fetchMunicipalities(includeInactive),
    staleTime: 1000 * 60 * 10,
  });
}

export function useTransportTypes(includeInactive = false) {
  return useQuery({
    queryKey: ['transportTypes', includeInactive],
    queryFn: () => fetchTransportTypes(includeInactive),
    staleTime: 1000 * 60 * 10,
  });
}

export function useFareRecords(includeArchived = false) {
  const queryClient = useQueryClient();
  const { isOnline } = useNetwork();
  const wasOfflineRef = useRef(!isOnline);

  useRealtimeInvalidation('public:fare_records', isOnline, { table: 'fare_records' }, () => {
    queryClient.invalidateQueries({ queryKey: ['fareRecords'] });
  });

  useEffect(() => {
    if (wasOfflineRef.current && isOnline) {
      queryClient.invalidateQueries({ queryKey: ['fareRecords'] });
      queryClient.invalidateQueries({ queryKey: ['municipalities'] });
      queryClient.invalidateQueries({ queryKey: ['routes'] });
    }
    wasOfflineRef.current = !isOnline;
  }, [isOnline, queryClient]);

  return useQuery({
    queryKey: ['fareRecords', includeArchived],
    queryFn: () => fetchFareRecords({ includeArchived }),
  });
}

export function useRoutes(includeInactive = false) {
  return useQuery({
    queryKey: ['routes', includeInactive],
    queryFn: () => fetchRoutes(includeInactive),
  });
}

export function useFareSources() {
  return useQuery({
    queryKey: ['fareSources'],
    queryFn: fetchFareSources,
  });
}

export function useMyFavorites() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['favorites', user?.id],
    queryFn: () => fetchMyFavorites(user!.id),
    enabled: Boolean(user && isSupabaseConfigured),
  });
}

export function useMyFareReports() {
  const { user } = useAuth();
  const { isOnline } = useNetwork();
  const queryClient = useQueryClient();

  useRealtimeInvalidation(
    user ? `fare_reports:${user.id}` : 'fare_reports:none',
    Boolean(user && isOnline),
    { table: 'fare_reports', filter: user ? `reporter_id=eq.${user.id}` : undefined },
    () => {
      if (user) {
        queryClient.invalidateQueries({ queryKey: ['myReports', user.id] });
      }
    }
  );

  return useQuery({
    queryKey: ['myReports', user?.id],
    queryFn: () => fetchFareReports({ reporterId: user!.id }),
    enabled: Boolean(user && isOnline && isSupabaseConfigured),
  });
}

export function useAdminFareReports() {
  const { isAdmin } = useAuth();
  const { isOnline } = useNetwork();
  const queryClient = useQueryClient();

  useRealtimeInvalidation(
    'admin:fare_reports',
    Boolean(isAdmin && isOnline),
    { table: 'fare_reports' },
    () => {
      queryClient.invalidateQueries({ queryKey: ['adminReports'] });
    }
  );

  return useQuery({
    queryKey: ['adminReports'],
    queryFn: () => fetchFareReports(),
    enabled: Boolean(isAdmin && isOnline && isSupabaseConfigured),
  });
}

export function useNotifications() {
  const { user } = useAuth();
  const { isOnline } = useNetwork();
  const queryClient = useQueryClient();

  useRealtimeInvalidation(
    user ? `notifications:${user.id}` : 'notifications:none',
    Boolean(user && isOnline),
    { table: 'notifications', filter: user ? `user_id=eq.${user.id}` : undefined },
    () => {
      if (user) {
        queryClient.invalidateQueries({ queryKey: ['notifications', user.id] });
      }
    }
  );

  return useQuery({
    queryKey: ['notifications', user?.id],
    queryFn: () => fetchNotifications(user!.id),
    enabled: Boolean(user && isOnline && isSupabaseConfigured),
  });
}

export function useOperators() {
  return useQuery({
    queryKey: ['operators'],
    queryFn: fetchOperators,
  });
}

export function useTransportStops(includeUnverified = false) {
  return useQuery({
    queryKey: ['transportStops', includeUnverified],
    queryFn: () => fetchTransportStops(includeUnverified),
    staleTime: 1000 * 60 * 5,
  });
}

export function useMyTrips() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['myTrips', user?.id],
    queryFn: () => fetchMyTrips(user!.id),
    enabled: Boolean(user && isSupabaseConfigured),
  });
}

export function useTrustedContacts() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['trustedContacts', user?.id],
    queryFn: () => fetchTrustedContacts(user!.id),
    enabled: Boolean(user && isSupabaseConfigured),
  });
}

export function useLocationSharingSessions() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['locationSharing', user?.id],
    queryFn: () => fetchLocationSharingSessions(user!.id),
    enabled: Boolean(user && isSupabaseConfigured),
  });
}

export function useMySafetyReports() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['mySafetyReports', user?.id],
    queryFn: () => fetchSafetyReports(user!.id),
    enabled: Boolean(user && isSupabaseConfigured),
  });
}

export function useAdminSafetyReports() {
  const { isAdmin } = useAuth();
  return useQuery({
    queryKey: ['adminSafetyReports'],
    queryFn: () => fetchSafetyReports(),
    enabled: Boolean(isAdmin && isSupabaseConfigured),
  });
}

export function useAdminAggregatedAnalytics() {
  const { isAdmin } = useAuth();
  return useQuery({
    queryKey: ['adminAggregatedAnalytics'],
    queryFn: fetchAdminAggregatedAnalytics,
    enabled: Boolean(isAdmin && isSupabaseConfigured),
  });
}

export function useGovernmentAgencies(includeInactive = false) {
  return useQuery({
    queryKey: ['governmentAgencies', includeInactive],
    queryFn: () => fetchGovernmentAgencies(includeInactive),
    staleTime: 1000 * 60 * 10,
  });
}

export function useMyVehicleReports() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['myVehicleReports', user?.id],
    queryFn: () => fetchVehicleReports({ userId: user!.id }),
    enabled: Boolean(user && isSupabaseConfigured),
  });
}

export function useAdminVehicleReports() {
  const { isAdmin } = useAuth();
  return useQuery({
    queryKey: ['adminVehicleReports'],
    queryFn: () => fetchVehicleReports(),
    enabled: Boolean(isAdmin && isSupabaseConfigured),
  });
}

export function useAdminAgencyReferrals() {
  const { isAdmin } = useAuth();
  return useQuery({
    queryKey: ['adminAgencyReferrals'],
    queryFn: fetchAllAgencyReferrals,
    enabled: Boolean(isAdmin && isSupabaseConfigured),
  });
}
