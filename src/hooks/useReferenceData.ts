import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
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

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) return;
    const channel = supabase
      .channel('public:fare_records')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'fare_records' },
        () => {
          queryClient.invalidateQueries({ queryKey: ['fareRecords'] });
        }
      )
      .subscribe();

    return () => {
      supabase?.removeChannel(channel);
    };
  }, [queryClient]);

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
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!user || !isSupabaseConfigured || !supabase) return;
    const channel = supabase
      .channel(`fare_reports:${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'fare_reports',
          filter: `reporter_id=eq.${user.id}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['myReports', user.id] });
        }
      )
      .subscribe();

    return () => {
      supabase?.removeChannel(channel);
    };
  }, [user, queryClient]);

  return useQuery({
    queryKey: ['myReports', user?.id],
    queryFn: () => fetchFareReports({ reporterId: user!.id }),
    enabled: Boolean(user && isSupabaseConfigured),
  });
}

export function useAdminFareReports() {
  const { isAdmin } = useAuth();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!isAdmin || !isSupabaseConfigured || !supabase) return;
    const channel = supabase
      .channel('admin:fare_reports')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'fare_reports' },
        () => {
          queryClient.invalidateQueries({ queryKey: ['adminReports'] });
        }
      )
      .subscribe();

    return () => {
      supabase?.removeChannel(channel);
    };
  }, [isAdmin, queryClient]);

  return useQuery({
    queryKey: ['adminReports'],
    queryFn: () => fetchFareReports(),
    enabled: Boolean(isAdmin && isSupabaseConfigured),
  });
}

export function useNotifications() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!user || !isSupabaseConfigured || !supabase) return;
    const channel = supabase
      .channel(`notifications:${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['notifications', user.id] });
        }
      )
      .subscribe();

    return () => {
      supabase?.removeChannel(channel);
    };
  }, [user, queryClient]);

  return useQuery({
    queryKey: ['notifications', user?.id],
    queryFn: () => fetchNotifications(user!.id),
    enabled: Boolean(user && isSupabaseConfigured),
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
