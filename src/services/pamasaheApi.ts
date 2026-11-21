import { getSupabaseClientOrThrow, isSupabaseConfigured, supabase } from '@/lib/supabase';
import {
  DEFAULT_TRANSPORT_TYPES,
  ORIENTAL_MINDORO_MUNICIPALITIES,
  VERIFIED_GOVERNMENT_AGENCIES_FALLBACK,
  VERIFIED_TRANSPORT_STOPS_FALLBACK,
} from '@/data/orientalMindoro';
import { normalizePlateNumber } from '@/lib/vehicleReporting';
import { validateEvidenceFile, validateVehicleEvidenceFile } from '@/lib/validation';
import type {
  AdminAggregatedAnalytics,
  AgencyReferral,
  AppRole,
  AuditLog,
  ComplaintStatus,
  FareExpenseType,
  FareRecord,
  FareReport,
  FareSource,
  FareVerificationLog,
  FavoriteRoute,
  GovernmentAgency,
  LocationSharingSession,
  Municipality,
  NotificationItem,
  PassengerCategory,
  Profile,
  ReferralStatus,
  ReportStatus,
  RouteRecord,
  SafetyReport,
  SafetyReportStatus,
  SafetySeverity,
  SharedTripStatus,
  StopCategory,
  SystemSetting,
  TransportOperator,
  TransportStop,
  TransportType,
  TripLocationPoint,
  TripRecord,
  TrustedContact,
  VehicleEvidenceType,
  VehicleReport,
  VehicleTypeOption,
  ViolationCategoryGroup,
} from '@/types/database';

export async function fetchMunicipalities(includeInactive = false): Promise<{
  data: Municipality[];
  fromDatabase: boolean;
}> {
  if (!isSupabaseConfigured || !supabase) {
    return { data: ORIENTAL_MINDORO_MUNICIPALITIES, fromDatabase: false };
  }

  let query = supabase
    .from('municipalities')
    .select('*')
    .order('sort_order', { ascending: true });

  if (!includeInactive) {
    query = query.eq('is_active', true);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  if (!data || data.length === 0) {
    return { data: ORIENTAL_MINDORO_MUNICIPALITIES, fromDatabase: false };
  }
  return {
    data: data.map((row) => ({
      ...row,
      latitude: Number(row.latitude),
      longitude: Number(row.longitude),
    })) as Municipality[],
    fromDatabase: true,
  };
}

export async function fetchTransportTypes(includeInactive = false): Promise<{
  data: TransportType[];
  fromDatabase: boolean;
}> {
  if (!isSupabaseConfigured || !supabase) {
    return { data: DEFAULT_TRANSPORT_TYPES, fromDatabase: false };
  }

  let query = supabase
    .from('transport_types')
    .select('*')
    .order('sort_order', { ascending: true });

  if (!includeInactive) {
    query = query.eq('is_active', true);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  if (!data || data.length === 0) {
    return { data: DEFAULT_TRANSPORT_TYPES, fromDatabase: false };
  }
  return { data: data as TransportType[], fromDatabase: true };
}

export async function fetchFareRecords(options?: {
  includeArchived?: boolean;
  originId?: string;
  destinationId?: string;
  transportTypeId?: string;
  passengerCategory?: PassengerCategory;
}): Promise<FareRecord[]> {
  if (!isSupabaseConfigured || !supabase) return [];

  let query = supabase
    .from('fare_records')
    .select(
      `
      *,
      origin:municipalities!fare_records_origin_municipality_id_fkey(*),
      destination:municipalities!fare_records_destination_municipality_id_fkey(*),
      transport_type:transport_types!fare_records_transport_type_id_fkey(*),
      fare_source:fare_sources(*)
    `
    )
    .eq('is_test_fixture', false)
    .order('updated_at', { ascending: false });

  if (!options?.includeArchived) {
    query = query.eq('is_archived', false);
  }
  if (options?.originId) {
    query = query.eq('origin_municipality_id', options.originId);
  }
  if (options?.destinationId) {
    query = query.eq('destination_municipality_id', options.destinationId);
  }
  if (options?.transportTypeId) {
    query = query.eq('transport_type_id', options.transportTypeId);
  }
  if (options?.passengerCategory) {
    query = query.eq('passenger_category', options.passengerCategory);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);

  return (data ?? []).map((row) => ({
    ...row,
    fare_amount: Number(row.fare_amount),
  })) as FareRecord[];
}

export async function fetchFareRecordById(id: string): Promise<FareRecord | null> {
  if (!isSupabaseConfigured || !supabase) return null;

  const { data, error } = await supabase
    .from('fare_records')
    .select(
      `
      *,
      origin:municipalities!fare_records_origin_municipality_id_fkey(*),
      destination:municipalities!fare_records_destination_municipality_id_fkey(*),
      transport_type:transport_types!fare_records_transport_type_id_fkey(*),
      fare_source:fare_sources(*)
    `
    )
    .eq('id', id)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) return null;
  return { ...data, fare_amount: Number(data.fare_amount) } as FareRecord;
}

export async function fetchRoutes(includeInactive = false): Promise<RouteRecord[]> {
  if (!isSupabaseConfigured || !supabase) return [];

  let query = supabase
    .from('routes')
    .select(
      `
      *,
      origin:municipalities!routes_origin_municipality_id_fkey(*),
      destination:municipalities!routes_destination_municipality_id_fkey(*),
      transport_type:transport_types(*),
      operator:transport_operators(*)
    `
    )
    .order('route_name', { ascending: true });

  if (!includeInactive) {
    query = query.eq('is_active', true);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => ({
    ...row,
    distance_km: row.distance_km !== null ? Number(row.distance_km) : null,
  })) as RouteRecord[];
}

export async function fetchFareSources(): Promise<FareSource[]> {
  if (!isSupabaseConfigured || !supabase) return [];

  const { data, error } = await supabase
    .from('fare_sources')
    .select('*')
    .order('effective_date', { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []) as FareSource[];
}

export async function fetchMyFavorites(userId: string): Promise<FavoriteRoute[]> {
  if (!isSupabaseConfigured || !supabase) return [];

  const { data, error } = await supabase
    .from('favorites')
    .select(
      `
      *,
      origin:municipalities!favorites_origin_municipality_id_fkey(*),
      destination:municipalities!favorites_destination_municipality_id_fkey(*),
      transport_type:transport_types(*)
    `
    )
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []) as FavoriteRoute[];
}

export async function addFavoriteRoute(payload: {
  userId: string;
  originMunicipalityId: string;
  destinationMunicipalityId: string;
  transportTypeId?: string | null;
  routeId?: string | null;
  label?: string;
}): Promise<FavoriteRoute> {
  const client = getSupabaseClientOrThrow();
  const { data, error } = await client
    .from('favorites')
    .insert({
      user_id: payload.userId,
      origin_municipality_id: payload.originMunicipalityId,
      destination_municipality_id: payload.destinationMunicipalityId,
      transport_type_id: payload.transportTypeId || null,
      route_id: payload.routeId || null,
      label: payload.label || null,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data as FavoriteRoute;
}

export async function removeFavoriteRoute(favoriteId: string): Promise<void> {
  const client = getSupabaseClientOrThrow();
  const { error } = await client.from('favorites').delete().eq('id', favoriteId);
  if (error) throw new Error(error.message);
}

export async function fetchFareReports(options?: {
  reporterId?: string;
  statusFilter?: ReportStatus;
}): Promise<FareReport[]> {
  if (!isSupabaseConfigured || !supabase) return [];

  let query = supabase
    .from('fare_reports')
    .select(
      `
      *,
      origin:municipalities!fare_reports_origin_municipality_id_fkey(*),
      destination:municipalities!fare_reports_destination_municipality_id_fkey(*),
      transport_type:transport_types(*),
      reporter:profiles!fare_reports_reporter_id_fkey(id, full_name, email),
      evidence:fare_report_evidence(*)
    `
    )
    .order('created_at', { ascending: false });

  if (options?.reporterId) {
    query = query.eq('reporter_id', options.reporterId);
  }
  if (options?.statusFilter) {
    query = query.eq('status', options.statusFilter);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);

  return (data ?? []).map((row) => ({
    ...row,
    fare_paid: Number(row.fare_paid),
  })) as FareReport[];
}

export async function submitFareReport(payload: {
  reporterId: string;
  originMunicipalityId: string;
  destinationMunicipalityId: string;
  transportTypeId: string;
  farePaid: number;
  passengerCategory: PassengerCategory;
  travelDate: string;
  operatorOrVehicleDetails?: string;
  remarks?: string;
  evidenceFiles?: File[];
}): Promise<FareReport> {
  const client = getSupabaseClientOrThrow();

  for (const file of payload.evidenceFiles ?? []) {
    const fileError = validateEvidenceFile(file);
    if (fileError) throw new Error(fileError);
  }

  const { data: created, error } = await client
    .from('fare_reports')
    .insert({
      reporter_id: payload.reporterId,
      origin_municipality_id: payload.originMunicipalityId,
      destination_municipality_id: payload.destinationMunicipalityId,
      transport_type_id: payload.transportTypeId,
      fare_paid: payload.farePaid,
      passenger_category: payload.passengerCategory,
      travel_date: payload.travelDate,
      operator_or_vehicle_details: payload.operatorOrVehicleDetails || null,
      remarks: payload.remarks || null,
      status: 'pending',
    })
    .select()
    .single();

  if (error) throw new Error(error.message);

  // Upload evidence files cleanly to private 'fare-evidence' bucket
  for (const file of payload.evidenceFiles ?? []) {
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const storagePath = `${payload.reporterId}/${created.id}/${Date.now()}-${safeName}`;

    const { error: uploadErr } = await client.storage
      .from('fare-evidence')
      .upload(storagePath, file, {
        cacheControl: '3600',
        upsert: false,
        contentType: file.type,
      });

    if (uploadErr) {
      throw new Error(`Report saved, but evidence upload failed: ${uploadErr.message}`);
    }

    const { error: metaErr } = await client.from('fare_report_evidence').insert({
      report_id: created.id,
      uploaded_by: payload.reporterId,
      storage_path: storagePath,
      file_name: file.name,
      mime_type: file.type,
      file_size_bytes: file.size,
    });

    if (metaErr) {
      throw new Error(`Evidence uploaded, but metadata registration failed: ${metaErr.message}`);
    }
  }

  return created as FareReport;
}

export async function updatePendingFareReport(
  reportId: string,
  updates: {
    farePaid: number;
    passengerCategory: PassengerCategory;
    travelDate: string;
    operatorOrVehicleDetails?: string;
    remarks?: string;
  }
): Promise<FareReport> {
  const client = getSupabaseClientOrThrow();
  const { data, error } = await client
    .from('fare_reports')
    .update({
      fare_paid: updates.farePaid,
      passenger_category: updates.passengerCategory,
      travel_date: updates.travelDate,
      operator_or_vehicle_details: updates.operatorOrVehicleDetails || null,
      remarks: updates.remarks || null,
    })
    .eq('id', reportId)
    .eq('status', 'pending')
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data as FareReport;
}

export async function getEvidenceSignedUrl(storagePath: string): Promise<string> {
  const client = getSupabaseClientOrThrow();
  const { data, error } = await client.storage
    .from('fare-evidence')
    .createSignedUrl(storagePath, 180);

  if (error || !data?.signedUrl) {
    throw new Error(error?.message || 'Unable to generate secure evidence URL.');
  }
  return data.signedUrl;
}

export async function reviewFareReport(payload: {
  reportId: string;
  newStatus: ReportStatus;
  adminFeedback?: string;
  flagSuspicious?: boolean;
  issuingAuthority?: string;
  officialDocumentReference?: string;
  sourceUrl?: string;
  effectiveDate?: string;
}): Promise<FareReport> {
  const client = getSupabaseClientOrThrow();
  const { data, error } = await client.rpc('review_fare_report', {
    p_report_id: payload.reportId,
    p_new_status: payload.newStatus,
    p_admin_feedback: payload.adminFeedback ?? null,
    p_flag_suspicious: Boolean(payload.flagSuspicious),
    p_issuing_authority: payload.issuingAuthority ?? null,
    p_official_document_reference: payload.officialDocumentReference ?? null,
    p_source_url: payload.sourceUrl ?? null,
    p_effective_date: payload.effectiveDate ?? null,
  });

  if (error) throw new Error(error.message);
  return data as FareReport;
}

export async function publishOfficialFare(payload: {
  originMunicipalityId: string;
  destinationMunicipalityId: string;
  transportTypeId: string;
  passengerCategory: PassengerCategory;
  fareAmount: number;
  issuingAuthority: string;
  officialDocumentReference: string;
  effectiveDate: string;
  sourceUrl?: string;
  routeId?: string;
  notes?: string;
  existingFareId?: string;
}): Promise<FareRecord> {
  const client = getSupabaseClientOrThrow();
  const { data, error } = await client.rpc('publish_official_fare', {
    p_origin_municipality_id: payload.originMunicipalityId,
    p_destination_municipality_id: payload.destinationMunicipalityId,
    p_transport_type_id: payload.transportTypeId,
    p_passenger_category: payload.passengerCategory,
    p_fare_amount: payload.fareAmount,
    p_issuing_authority: payload.issuingAuthority,
    p_official_document_reference: payload.officialDocumentReference,
    p_effective_date: payload.effectiveDate,
    p_source_url: payload.sourceUrl || null,
    p_route_id: payload.routeId || null,
    p_notes: payload.notes || null,
    p_existing_fare_id: payload.existingFareId || null,
  });

  if (error) throw new Error(error.message);
  return data as FareRecord;
}

export async function archiveFareRecord(fareId: string): Promise<void> {
  const client = getSupabaseClientOrThrow();
  const { error } = await client
    .from('fare_records')
    .update({ is_archived: true, status: 'archived' })
    .eq('id', fareId);
  if (error) throw new Error(error.message);
}

export async function fetchNotifications(userId: string): Promise<NotificationItem[]> {
  if (!isSupabaseConfigured || !supabase) return [];

  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) throw new Error(error.message);
  return (data ?? []) as NotificationItem[];
}

export async function markNotificationRead(id: string): Promise<void> {
  const client = getSupabaseClientOrThrow();
  const { error } = await client
    .from('notifications')
    .update({ is_read: true, read_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw new Error(error.message);
}

export async function markAllNotificationsRead(userId: string): Promise<void> {
  const client = getSupabaseClientOrThrow();
  const { error } = await client
    .from('notifications')
    .update({ is_read: true, read_at: new Date().toISOString() })
    .eq('user_id', userId)
    .eq('is_read', false);
  if (error) throw new Error(error.message);
}

export async function fetchVerificationLogs(fareRecordId?: string): Promise<FareVerificationLog[]> {
  if (!isSupabaseConfigured || !supabase) return [];

  let query = supabase
    .from('fare_verification_logs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(100);

  if (fareRecordId) {
    query = query.eq('fare_record_id', fareRecordId);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data ?? []) as FareVerificationLog[];
}

export async function fetchUsersWithRoles(): Promise<
  Array<Profile & { role: AppRole }>
> {
  const client = getSupabaseClientOrThrow();
  const { data: profiles, error: pErr } = await client
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: false });

  if (pErr) throw new Error(pErr.message);

  const { data: roles, error: rErr } = await client.from('user_roles').select('*');
  if (rErr) throw new Error(rErr.message);

  const roleMap = new Map<string, AppRole>();
  for (const r of roles ?? []) {
    roleMap.set(r.user_id, r.role as AppRole);
  }

  return (profiles ?? []).map((p) => ({
    ...(p as Profile),
    role: roleMap.get(p.id) ?? 'commuter',
  }));
}

export async function updateUserRoleAdmin(
  targetUserId: string,
  newRole: AppRole,
  reason: string
): Promise<void> {
  const client = getSupabaseClientOrThrow();
  const { error } = await client.rpc('update_user_role', {
    p_target_user_id: targetUserId,
    p_new_role: newRole,
    p_reason: reason,
  });
  if (error) throw new Error(error.message);
}

export async function fetchOperators(): Promise<TransportOperator[]> {
  if (!isSupabaseConfigured || !supabase) return [];

  const { data, error } = await supabase
    .from('transport_operators')
    .select('*')
    .order('operator_name', { ascending: true });

  if (error) throw new Error(error.message);
  return (data ?? []) as TransportOperator[];
}

export async function upsertTransportOperator(
  payload: Partial<TransportOperator> & { operator_name: string }
): Promise<TransportOperator> {
  const client = getSupabaseClientOrThrow();
  const { data, error } = await client
    .from('transport_operators')
    .upsert(payload)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data as TransportOperator;
}

export async function upsertRoute(payload: {
  id?: string;
  route_code: string;
  route_name: string;
  origin_municipality_id: string;
  destination_municipality_id: string;
  transport_type_id: string;
  operator_id?: string | null;
  distance_km?: number | null;
  distance_source?: 'osrm' | 'official_survey' | 'unverified' | null;
  estimated_duration_min?: number | null;
  operating_notes?: string | null;
  is_verified?: boolean;
  is_active?: boolean;
}): Promise<RouteRecord> {
  const client = getSupabaseClientOrThrow();
  const { data, error } = await client
    .from('routes')
    .upsert(payload)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data as RouteRecord;
}

export async function fetchAuditLogs(): Promise<AuditLog[]> {
  const client = getSupabaseClientOrThrow();
  const { data, error } = await client
    .from('audit_logs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(200);
  if (error) throw new Error(error.message);
  return (data ?? []) as AuditLog[];
}

export async function fetchSystemSettings(): Promise<SystemSetting[]> {
  if (!isSupabaseConfigured || !supabase) return [];
  const { data, error } = await supabase.from('system_settings').select('*');
  if (error) throw new Error(error.message);
  return (data ?? []) as SystemSetting[];
}

export async function updateSystemSetting(
  key: string,
  value: Record<string, unknown>,
  updatedBy: string
): Promise<void> {
  const client = getSupabaseClientOrThrow();
  const { error } = await client
    .from('system_settings')
    .upsert({ key, value, updated_by: updatedBy });
  if (error) throw new Error(error.message);
}

export async function broadcastAnnouncementNotification(payload: {
  title: string;
  message: string;
  targetUserIds: string[];
}): Promise<number> {
  const client = getSupabaseClientOrThrow();
  const batchKey = `announce-${Date.now()}`;
  const rows = payload.targetUserIds.map((uid) => ({
    user_id: uid,
    type: 'announcement' as const,
    title: payload.title,
    message: payload.message,
    dedupe_key: `${batchKey}-${uid}`,
  }));
  const { error } = await client.from('notifications').insert(rows);
  if (error) throw new Error(error.message);
  return rows.length;
}

// ============================================================================
// Phase 2: Transport Stops, GPS Sessions, Live Trips, Safety & Sharing APIs
// ============================================================================

export async function fetchTransportStops(includeUnverified = false): Promise<TransportStop[]> {
  if (!isSupabaseConfigured || !supabase) {
    return VERIFIED_TRANSPORT_STOPS_FALLBACK;
  }

  let query = supabase
    .from('transport_stops')
    .select(
      `
      *,
      municipality:municipalities(*),
      transport_type:transport_types(*)
    `
    )
    .eq('is_active', true)
    .order('stop_name', { ascending: true });

  if (!includeUnverified) {
    query = query.eq('is_verified', true);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  if (!data || data.length === 0) return [];
  return data.map((row) => ({
    ...row,
    latitude: Number(row.latitude),
    longitude: Number(row.longitude),
  })) as TransportStop[];
}

export async function upsertTransportStop(payload: {
  id?: string;
  municipality_id: string;
  transport_type_id?: string | null;
  stop_name: string;
  stop_category: StopCategory;
  latitude: number;
  longitude: number;
  address_or_landmark?: string | null;
  operating_notes?: string | null;
  source_reference?: string | null;
  is_verified?: boolean;
}): Promise<TransportStop> {
  const client = getSupabaseClientOrThrow();
  const { data, error } = await client
    .from('transport_stops')
    .upsert({
      ...payload,
      is_verified: payload.is_verified ?? true,
      is_active: true,
    })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data as TransportStop;
}

export async function fetchMyTrips(userId: string): Promise<TripRecord[]> {
  if (!isSupabaseConfigured || !supabase) return [];

  const { data, error } = await supabase
    .from('trip_records')
    .select(
      `
      *,
      origin:municipalities!trip_records_origin_municipality_id_fkey(*),
      destination:municipalities!trip_records_destination_municipality_id_fkey(*),
      transport_type:transport_types(*)
    `
    )
    .eq('user_id', userId)
    .order('started_at', { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => ({
    ...row,
    distance_km: Number(row.distance_km ?? 0),
    max_deviation_km: Number(row.max_deviation_km ?? 0),
    recorded_fare_amount:
      row.recorded_fare_amount !== null ? Number(row.recorded_fare_amount) : null,
  })) as TripRecord[];
}

export async function startTripRecord(payload: {
  userId: string;
  originMunicipalityId: string;
  destinationMunicipalityId: string;
  transportTypeId: string;
  startLat: number | null;
  startLng: number | null;
  destLat: number | null;
  destLng: number | null;
  associatedFareRecordId?: string | null;
  recordedFareAmount?: number | null;
  fareExpenseType?: FareExpenseType;
  notes?: string;
}): Promise<TripRecord> {
  const client = getSupabaseClientOrThrow();
  const { data, error } = await client
    .from('trip_records')
    .insert({
      user_id: payload.userId,
      origin_municipality_id: payload.originMunicipalityId,
      destination_municipality_id: payload.destinationMunicipalityId,
      transport_type_id: payload.transportTypeId,
      start_latitude: payload.startLat,
      start_longitude: payload.startLng,
      current_latitude: payload.startLat,
      current_longitude: payload.startLng,
      destination_latitude: payload.destLat,
      destination_longitude: payload.destLng,
      associated_fare_record_id: payload.associatedFareRecordId || null,
      recorded_fare_amount: payload.recordedFareAmount ?? null,
      fare_expense_type: payload.fareExpenseType ?? 'none',
      status: 'active',
      notes: payload.notes || null,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data as TripRecord;
}

export async function updateActiveTripProgress(payload: {
  tripId: string;
  userId: string;
  lat: number;
  lng: number;
  accuracyMeters?: number | null;
  speedMps?: number | null;
  headingDeg?: number | null;
  distanceKm: number;
  durationSeconds: number;
  deviationDetected: boolean;
  maxDeviationKm: number;
}): Promise<void> {
  const client = getSupabaseClientOrThrow();
  const { error: updErr } = await client
    .from('trip_records')
    .update({
      current_latitude: payload.lat,
      current_longitude: payload.lng,
      distance_km: payload.distanceKm,
      duration_seconds: payload.durationSeconds,
      deviation_detected: payload.deviationDetected,
      max_deviation_km: payload.maxDeviationKm,
    })
    .eq('id', payload.tripId)
    .eq('user_id', payload.userId);

  if (updErr) throw new Error(updErr.message);

  const { error: ptErr } = await client.from('trip_location_points').insert({
    trip_id: payload.tripId,
    user_id: payload.userId,
    latitude: payload.lat,
    longitude: payload.lng,
    accuracy_meters: payload.accuracyMeters ?? null,
    speed_mps: payload.speedMps ?? null,
    heading_deg: payload.headingDeg ?? null,
  });

  if (ptErr) throw new Error(ptErr.message);
}

export async function finishTripRecord(payload: {
  tripId: string;
  userId: string;
  status: 'completed' | 'cancelled';
  distanceKm: number;
  durationSeconds: number;
  recordedFareAmount?: number | null;
  fareExpenseType?: FareExpenseType;
  notes?: string;
}): Promise<TripRecord> {
  const client = getSupabaseClientOrThrow();
  const { data, error } = await client
    .from('trip_records')
    .update({
      status: payload.status,
      ended_at: new Date().toISOString(),
      distance_km: payload.distanceKm,
      duration_seconds: payload.durationSeconds,
      recorded_fare_amount: payload.recordedFareAmount ?? null,
      fare_expense_type: payload.fareExpenseType ?? 'none',
      notes: payload.notes ?? null,
    })
    .eq('id', payload.tripId)
    .eq('user_id', payload.userId)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data as TripRecord;
}

export async function fetchTripPoints(tripId: string): Promise<TripLocationPoint[]> {
  if (!isSupabaseConfigured || !supabase) return [];
  const { data, error } = await supabase
    .from('trip_location_points')
    .select('*')
    .eq('trip_id', tripId)
    .order('recorded_at', { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []) as TripLocationPoint[];
}

export async function deleteMyLocationHistory(includeTrips = true): Promise<{
  points_deleted: number;
  sessions_deleted: number;
  shares_deleted: number;
  trips_affected: number;
}> {
  const client = getSupabaseClientOrThrow();
  const { data, error } = await client.rpc('delete_my_location_history', {
    p_include_trips: includeTrips,
  });
  if (error) throw new Error(error.message);
  return data;
}

export async function fetchTrustedContacts(userId: string): Promise<TrustedContact[]> {
  if (!isSupabaseConfigured || !supabase) return [];
  const { data, error } = await supabase
    .from('trusted_contacts')
    .select('*')
    .eq('user_id', userId)
    .eq('is_active', true)
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as TrustedContact[];
}

export async function addTrustedContact(payload: {
  userId: string;
  contactName: string;
  relationship?: string;
  phoneNumber?: string;
  email?: string;
  notifyOnArrival?: boolean;
}): Promise<TrustedContact> {
  const client = getSupabaseClientOrThrow();
  const { data, error } = await client
    .from('trusted_contacts')
    .insert({
      user_id: payload.userId,
      contact_name: payload.contactName,
      relationship: payload.relationship || null,
      phone_number: payload.phoneNumber || null,
      email: payload.email || null,
      notify_on_arrival: payload.notifyOnArrival ?? true,
    })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data as TrustedContact;
}

export async function removeTrustedContact(id: string): Promise<void> {
  const client = getSupabaseClientOrThrow();
  const { error } = await client.from('trusted_contacts').delete().eq('id', id);
  if (error) throw new Error(error.message);
}

export async function fetchLocationSharingSessions(
  userId: string
): Promise<LocationSharingSession[]> {
  if (!isSupabaseConfigured || !supabase) return [];
  const { data, error } = await supabase
    .from('location_sharing_sessions')
    .select(
      `
      *,
      trusted_contact:trusted_contacts(*),
      trip:trip_records(*)
    `
    )
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as LocationSharingSession[];
}

export async function createLocationSharingSession(payload: {
  userId: string;
  tripId: string;
  trustedContactId?: string | null;
  durationMinutes: number;
}): Promise<LocationSharingSession> {
  const client = getSupabaseClientOrThrow();
  const expiresAt = new Date(Date.now() + payload.durationMinutes * 60 * 1000).toISOString();
  const { data, error } = await client
    .from('location_sharing_sessions')
    .insert({
      user_id: payload.userId,
      trip_id: payload.tripId,
      trusted_contact_id: payload.trustedContactId || null,
      consent_confirmed: true,
      expires_at: expiresAt,
      is_active: true,
    })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data as LocationSharingSession;
}

export async function revokeLocationSharingSession(sessionId: string): Promise<void> {
  const client = getSupabaseClientOrThrow();
  const { error } = await client
    .from('location_sharing_sessions')
    .update({
      is_active: false,
      revoked_at: new Date().toISOString(),
    })
    .eq('id', sessionId);
  if (error) throw new Error(error.message);
}

export async function fetchSharedTripStatus(token: string): Promise<SharedTripStatus> {
  const client = getSupabaseClientOrThrow();
  const { data, error } = await client.rpc('get_shared_trip_status', {
    p_share_token: token,
  });
  if (error) throw new Error(error.message);
  return data as SharedTripStatus;
}

export async function fetchSafetyReports(reporterId?: string): Promise<SafetyReport[]> {
  if (!isSupabaseConfigured || !supabase) return [];
  let query = supabase
    .from('safety_reports')
    .select(
      `
      *,
      municipality:municipalities(*),
      transport_type:transport_types(*)
    `
    )
    .order('created_at', { ascending: false });
  if (reporterId) {
    query = query.eq('reporter_id', reporterId);
  }
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data ?? []) as SafetyReport[];
}

export async function submitSafetyReport(payload: {
  reporterId: string;
  tripId?: string | null;
  municipalityId?: string | null;
  transportTypeId?: string | null;
  incidentType: string;
  severity: SafetySeverity;
  description: string;
  vehicleOrOperatorDetails?: string;
  latitude?: number | null;
  longitude?: number | null;
}): Promise<SafetyReport> {
  const client = getSupabaseClientOrThrow();
  const { data, error } = await client
    .from('safety_reports')
    .insert({
      reporter_id: payload.reporterId,
      trip_id: payload.tripId || null,
      municipality_id: payload.municipalityId || null,
      transport_type_id: payload.transportTypeId || null,
      incident_type: payload.incidentType,
      severity: payload.severity,
      description: payload.description,
      vehicle_or_operator_details: payload.vehicleOrOperatorDetails || null,
      latitude: payload.latitude ?? null,
      longitude: payload.longitude ?? null,
      status: 'open',
    })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data as SafetyReport;
}

export async function updateSafetyReportAdmin(payload: {
  reportId: string;
  status: SafetyReportStatus;
  adminNotes: string;
  reviewerId: string;
}): Promise<void> {
  const client = getSupabaseClientOrThrow();
  const { error } = await client
    .from('safety_reports')
    .update({
      status: payload.status,
      admin_notes: payload.adminNotes,
      reviewed_by: payload.reviewerId,
      reviewed_at: new Date().toISOString(),
    })
    .eq('id', payload.reportId);
  if (error) throw new Error(error.message);
}

export async function fetchAdminAggregatedAnalytics(): Promise<AdminAggregatedAnalytics> {
  const client = getSupabaseClientOrThrow();
  const { data, error } = await client.rpc('get_admin_aggregated_analytics');
  if (error) throw new Error(error.message);
  return data as AdminAggregatedAnalytics;
}

// ============================================================================
// Phase 3: Vehicle, Driver & Violation Reporting + Agency Routing APIs
// ============================================================================

export async function fetchGovernmentAgencies(
  includeInactive = false
): Promise<GovernmentAgency[]> {
  if (!isSupabaseConfigured || !supabase) {
    return VERIFIED_GOVERNMENT_AGENCIES_FALLBACK;
  }

  let query = supabase
    .from('government_agencies')
    .select('*')
    .order('agency_name', { ascending: true });

  if (!includeInactive) {
    query = query.eq('is_active', true);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  if (!data || data.length === 0) return VERIFIED_GOVERNMENT_AGENCIES_FALLBACK;
  return data as GovernmentAgency[];
}

export async function upsertGovernmentAgency(
  payload: Partial<GovernmentAgency> & {
    agency_code: string;
    agency_name: string;
    jurisdiction: string;
    official_website: string;
    verified_contact_information: string;
    submission_instructions: string;
    last_verified_at: string;
  }
): Promise<GovernmentAgency> {
  const client = getSupabaseClientOrThrow();
  const { data, error } = await client
    .from('government_agencies')
    .upsert(payload)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data as GovernmentAgency;
}

export async function fetchVehicleReports(options?: {
  userId?: string;
}): Promise<VehicleReport[]> {
  if (!isSupabaseConfigured || !supabase) return [];

  let query = supabase
    .from('vehicle_reports')
    .select(
      `
      *,
      municipality:municipalities!vehicle_reports_municipality_id_fkey(*),
      origin:municipalities!vehicle_reports_origin_municipality_id_fkey(*),
      destination:municipalities!vehicle_reports_destination_municipality_id_fkey(*),
      categories:vehicle_report_categories(*),
      evidence:vehicle_report_evidence(*),
      referrals:agency_referrals(*, agency:government_agencies(*)),
      status_logs:vehicle_report_status_logs(*)
    `
    )
    .order('created_at', { ascending: false });

  if (options?.userId) {
    query = query.eq('user_id', options.userId);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => ({
    ...row,
    actual_fare: row.actual_fare !== null ? Number(row.actual_fare) : null,
    expected_fare: row.expected_fare !== null ? Number(row.expected_fare) : null,
  })) as VehicleReport[];
}

export async function fetchVehicleReportById(id: string): Promise<VehicleReport | null> {
  if (!isSupabaseConfigured || !supabase) return null;

  const { data, error } = await supabase
    .from('vehicle_reports')
    .select(
      `
      *,
      municipality:municipalities!vehicle_reports_municipality_id_fkey(*),
      origin:municipalities!vehicle_reports_origin_municipality_id_fkey(*),
      destination:municipalities!vehicle_reports_destination_municipality_id_fkey(*),
      categories:vehicle_report_categories(*),
      evidence:vehicle_report_evidence(*),
      referrals:agency_referrals(*, agency:government_agencies(*)),
      status_logs:vehicle_report_status_logs(*)
    `
    )
    .eq('id', id)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) return null;
  return {
    ...data,
    actual_fare: data.actual_fare !== null ? Number(data.actual_fare) : null,
    expected_fare: data.expected_fare !== null ? Number(data.expected_fare) : null,
  } as VehicleReport;
}

export async function submitVehicleReport(payload: {
  userId: string;
  plateNumber?: string;
  plateNotAvailable: boolean;
  vehicleType: VehicleTypeOption;
  bodyNumber?: string;
  vehicleColor?: string;
  vehicleModel?: string;
  operatorName?: string;
  routeInfo?: string;
  originMunicipalityId?: string;
  destinationMunicipalityId?: string;
  municipalityId: string;
  incidentLocation: string;
  incidentLatitude?: number | null;
  incidentLongitude?: number | null;
  incidentDate: string;
  incidentTime?: string;
  description: string;
  actualFare?: number | null;
  expectedFare?: number | null;
  additionalRemarks?: string;
  isConfidentialIdentity: boolean;
  externalShareConsent: boolean;
  submissionIdempotencyKey: string;
  asDraft?: boolean;
  selectedCategories: Array<{ group: ViolationCategoryGroup; category: string }>;
  evidenceItems?: Array<{ file: File; evidenceType: VehicleEvidenceType }>;
  recommendedAgencyIds?: string[];
  onUploadProgress?: (completed: number, total: number) => void;
}): Promise<VehicleReport> {
  const client = getSupabaseClientOrThrow();

  if (payload.selectedCategories.length === 0) {
    throw new Error('Select at least one alleged violation category.');
  }

  for (const item of payload.evidenceItems ?? []) {
    const err = validateVehicleEvidenceFile(item.file);
    if (err) throw new Error(err);
  }

  const normalizedPlate =
    !payload.plateNotAvailable && payload.plateNumber
      ? normalizePlateNumber(payload.plateNumber)
      : null;

  const { data: created, error } = await client
    .from('vehicle_reports')
    .insert({
      user_id: payload.userId,
      reference_number: '', // Auto-generated via prepare_vehicle_report_before_insert trigger
      plate_number: normalizedPlate,
      plate_not_available: payload.plateNotAvailable,
      vehicle_type: payload.vehicleType,
      body_number: payload.bodyNumber?.trim() || null,
      vehicle_color: payload.vehicleColor?.trim() || null,
      vehicle_model: payload.vehicleModel?.trim() || null,
      operator_name: payload.operatorName?.trim() || null,
      route_info: payload.routeInfo?.trim() || null,
      origin_municipality_id: payload.originMunicipalityId || null,
      destination_municipality_id: payload.destinationMunicipalityId || null,
      municipality_id: payload.municipalityId,
      incident_location: payload.incidentLocation.trim(),
      incident_latitude: payload.incidentLatitude ?? null,
      incident_longitude: payload.incidentLongitude ?? null,
      incident_date: payload.incidentDate,
      incident_time: payload.incidentTime || null,
      description: payload.description.trim(),
      actual_fare: payload.actualFare ?? null,
      expected_fare: payload.expectedFare ?? null,
      additional_remarks: payload.additionalRemarks?.trim() || null,
      is_confidential_identity: payload.isConfidentialIdentity,
      external_share_consent: payload.externalShareConsent,
      submission_idempotency_key: payload.submissionIdempotencyKey,
      complaint_status: payload.asDraft ? 'Draft' : 'Submitted to Pamasahe Tracker',
    })
    .select()
    .single();

  if (error) throw new Error(error.message);

  // Insert categories
  const catRows = payload.selectedCategories.map((c) => ({
    report_id: created.id,
    category_group: c.group,
    category: c.category,
  }));
  const { error: catErr } = await client.from('vehicle_report_categories').insert(catRows);
  if (catErr) throw new Error(catErr.message);

  // Upload evidence files privately to 'vehicle-evidence' bucket
  const items = payload.evidenceItems ?? [];
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const safeName = item.file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const storagePath = `${payload.userId}/${created.id}/${Date.now()}-${safeName}`;

    const { error: upErr } = await client.storage
      .from('vehicle-evidence')
      .upload(storagePath, item.file, {
        cacheControl: '3600',
        upsert: false,
        contentType: item.file.type,
      });

    if (upErr) {
      throw new Error(`Report ${created.reference_number} created, but evidence upload failed: ${upErr.message}`);
    }

    const { error: metaErr } = await client.from('vehicle_report_evidence').insert({
      report_id: created.id,
      storage_path: storagePath,
      evidence_type: item.evidenceType,
      file_type: item.file.type,
      file_size_bytes: item.file.size,
      original_filename: item.file.name,
      uploaded_by: payload.userId,
    });
    if (metaErr) throw new Error(metaErr.message);
    payload.onUploadProgress?.(i + 1, items.length);
  }

  // Record manual referral preparations ONLY if user explicitly consented
  if (payload.externalShareConsent && (payload.recommendedAgencyIds ?? []).length > 0) {
    const refRows = (payload.recommendedAgencyIds ?? []).map((agencyId) => ({
      report_id: created.id,
      agency_id: agencyId,
      referral_status: 'Prepared for Manual Submission',
      referral_notes: 'User consented and selected authority recommendation during submission.',
      created_by: payload.userId,
    }));
    await client.from('agency_referrals').insert(refRows);
  }

  return created as VehicleReport;
}

export async function addEvidenceToVehicleReport(payload: {
  reportId: string;
  userId: string;
  file: File;
  evidenceType: VehicleEvidenceType;
}): Promise<void> {
  const client = getSupabaseClientOrThrow();
  const err = validateVehicleEvidenceFile(payload.file);
  if (err) throw new Error(err);

  const safeName = payload.file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
  const storagePath = `${payload.userId}/${payload.reportId}/${Date.now()}-${safeName}`;

  const { error: upErr } = await client.storage
    .from('vehicle-evidence')
    .upload(storagePath, payload.file, { contentType: payload.file.type });
  if (upErr) throw new Error(upErr.message);

  const { error: metaErr } = await client.from('vehicle_report_evidence').insert({
    report_id: payload.reportId,
    storage_path: storagePath,
    evidence_type: payload.evidenceType,
    file_type: payload.file.type,
    file_size_bytes: payload.file.size,
    original_filename: payload.file.name,
    uploaded_by: payload.userId,
  });
  if (metaErr) throw new Error(metaErr.message);
}

export async function updateMyVehicleReport(
  reportId: string,
  updates: {
    additionalRemarks?: string;
    complaintStatus?: 'Submitted to Pamasahe Tracker' | 'Withdrawn';
  }
): Promise<VehicleReport> {
  const client = getSupabaseClientOrThrow();
  const { data, error } = await client
    .from('vehicle_reports')
    .update({
      ...(updates.additionalRemarks !== undefined
        ? { additional_remarks: updates.additionalRemarks }
        : {}),
      ...(updates.complaintStatus !== undefined
        ? { complaint_status: updates.complaintStatus }
        : {}),
    })
    .eq('id', reportId)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data as VehicleReport;
}

export async function getVehicleEvidenceSignedUrl(storagePath: string): Promise<string> {
  const client = getSupabaseClientOrThrow();
  const { data, error } = await client.storage
    .from('vehicle-evidence')
    .createSignedUrl(storagePath, 240);
  if (error || !data?.signedUrl) {
    throw new Error(error?.message || 'Unable to generate secure vehicle evidence URL.');
  }
  return data.signedUrl;
}

export async function adminUpdateVehicleReport(payload: {
  reportId: string;
  newStatus: ComplaintStatus;
  adminRemarks?: string;
  assignToMe?: boolean;
  agencyId?: string | null;
  referralStatus?: ReferralStatus;
  externalReference?: string;
  referralNotes?: string;
}): Promise<VehicleReport> {
  const client = getSupabaseClientOrThrow();
  const { data, error } = await client.rpc('admin_update_vehicle_report', {
    p_report_id: payload.reportId,
    p_new_status: payload.newStatus,
    p_admin_remarks: payload.adminRemarks ?? null,
    p_assign_to_me: payload.assignToMe ?? true,
    p_agency_id: payload.agencyId ?? null,
    p_referral_status: payload.referralStatus ?? null,
    p_external_reference: payload.externalReference ?? null,
    p_referral_notes: payload.referralNotes ?? null,
  });
  if (error) throw new Error(error.message);
  return data as VehicleReport;
}

export async function fetchAllAgencyReferrals(): Promise<AgencyReferral[]> {
  const client = getSupabaseClientOrThrow();
  const { data, error } = await client
    .from('agency_referrals')
    .select(
      `
      *,
      agency:government_agencies(*),
      report:vehicle_reports(id, reference_number, vehicle_type, plate_number, complaint_status)
    `
    )
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as AgencyReferral[];
}

export async function updateAgencyReferralRecord(payload: {
  referralId: string;
  referralStatus: ReferralStatus;
  externalReferenceNumber?: string;
  referralNotes?: string;
}): Promise<void> {
  const client = getSupabaseClientOrThrow();
  const { error } = await client
    .from('agency_referrals')
    .update({
      referral_status: payload.referralStatus,
      external_reference_number: payload.externalReferenceNumber?.trim() || null,
      acknowledgment_date:
        payload.referralStatus === 'Acknowledged by Agency' ||
        payload.referralStatus === 'Under Agency Investigation'
          ? new Date().toISOString()
          : null,
      referral_notes: payload.referralNotes?.trim() || null,
    })
    .eq('id', payload.referralId);
  if (error) throw new Error(error.message);
}
