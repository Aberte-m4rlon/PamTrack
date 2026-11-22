export type AppRole =
  | 'guest'
  | 'commuter'
  | 'transport_operator'
  | 'administrator'
  | 'super_administrator';

export type FareStatus =
  | 'verified_official'
  | 'community_estimate'
  | 'pending_verification'
  | 'rejected_or_disputed'
  | 'archived';

export type ReportStatus =
  | 'pending'
  | 'under_review'
  | 'approved_community_estimate'
  | 'verified_official'
  | 'rejected'
  | 'disputed';

export type PassengerCategory = 'regular' | 'student' | 'senior_citizen' | 'pwd';

export type NotificationType =
  | 'report_submitted'
  | 'report_approved'
  | 'report_rejected'
  | 'verification_completed'
  | 'official_fare_updated'
  | 'announcement'
  | 'trip_completed'
  | 'arrival_alert'
  | 'route_deviation_warning'
  | 'safety_alert';

export type StopCategory =
  | 'jeepney_stop'
  | 'tricycle_terminal'
  | 'bus_terminal'
  | 'uv_express_terminal'
  | 'port_hub';

export type TripStatus = 'active' | 'completed' | 'cancelled';
export type FareExpenseType = 'recorded' | 'estimated' | 'none';
export type SafetySeverity = 'low' | 'medium' | 'high' | 'critical';
export type SafetyReportStatus = 'open' | 'investigating' | 'resolved' | 'dismissed';

export interface Profile {
  id: string;
  email: string;
  full_name: string;
  phone_number: string | null;
  home_municipality_id: string | null;
  avatar_url: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface UserRoleRow {
  id: string;
  user_id: string;
  role: AppRole;
  assigned_by: string | null;
  reason: string | null;
  created_at: string;
  updated_at: string;
}

export interface Municipality {
  id: string;
  name: string;
  slug: string;
  classification: 'component_city' | 'municipality';
  district: '1st District' | '2nd District';
  is_capital: boolean;
  psgc_code: string | null;
  latitude: number;
  longitude: number;
  description: string | null;
  is_active: boolean;
  sort_order: number;
  created_at?: string;
  updated_at?: string;
}

export interface TransportType {
  id: string;
  code: string;
  name: string;
  description: string | null;
  regulatory_body: string | null;
  supports_statutory_discount: boolean;
  icon_name: string;
  is_active: boolean;
  sort_order: number;
}

export interface TransportOperator {
  id: string;
  owner_user_id: string | null;
  operator_name: string;
  franchise_or_permit_number: string | null;
  transport_type_id: string | null;
  primary_municipality_id: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  office_address: string | null;
  verification_status: 'pending' | 'verified' | 'suspended';
  verified_by: string | null;
  verified_at: string | null;
  notes: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface RouteRecord {
  id: string;
  route_code: string;
  route_name: string;
  origin_municipality_id: string;
  destination_municipality_id: string;
  transport_type_id: string;
  operator_id: string | null;
  distance_km: number | null;
  distance_source: 'osrm' | 'official_survey' | 'unverified' | null;
  estimated_duration_min: number | null;
  route_geometry: GeoJsonLineString | null;
  operating_notes: string | null;
  is_verified: boolean;
  is_active: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  origin?: Municipality;
  destination?: Municipality;
  transport_type?: TransportType;
  operator?: TransportOperator | null;
}

export interface RouteStop {
  id: string;
  route_id: string;
  municipality_id: string | null;
  stop_name: string;
  stop_order: number;
  latitude: number | null;
  longitude: number | null;
  km_from_origin: number | null;
}

export interface FareSource {
  id: string;
  issuing_authority: string;
  document_reference: string;
  title: string;
  source_url: string | null;
  effective_date: string;
  jurisdiction: string;
  notes: string | null;
  created_at: string;
}

export interface FareRecord {
  id: string;
  route_id: string | null;
  origin_municipality_id: string;
  destination_municipality_id: string;
  transport_type_id: string;
  passenger_category: PassengerCategory;
  fare_amount: number;
  currency: 'PHP';
  status: FareStatus;
  fare_source_id: string | null;
  issuing_authority: string | null;
  official_document_reference: string | null;
  source_url: string | null;
  effective_date: string | null;
  last_verified_at: string | null;
  verified_by: string | null;
  is_archived: boolean;
  is_test_fixture: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
  origin?: Municipality;
  destination?: Municipality;
  transport_type?: TransportType;
  fare_source?: FareSource | null;
}

export interface FareReport {
  id: string;
  reporter_id: string;
  route_id: string | null;
  origin_municipality_id: string;
  destination_municipality_id: string;
  transport_type_id: string;
  fare_paid: number;
  passenger_category: PassengerCategory;
  travel_date: string;
  operator_id: string | null;
  operator_or_vehicle_details: string | null;
  remarks: string | null;
  status: ReportStatus;
  is_flagged_suspicious: boolean;
  admin_feedback: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  linked_fare_record_id: string | null;
  created_at: string;
  updated_at: string;
  origin?: Municipality;
  destination?: Municipality;
  transport_type?: TransportType;
  reporter?: Pick<Profile, 'id' | 'full_name' | 'email'> | null;
  evidence?: FareReportEvidence[];
}

export interface FareReportEvidence {
  id: string;
  report_id: string;
  uploaded_by: string;
  storage_path: string;
  file_name: string;
  mime_type: string;
  file_size_bytes: number;
  created_at: string;
}

export interface FareVerificationLog {
  id: string;
  fare_record_id: string | null;
  report_id: string | null;
  action: string;
  previous_status: string | null;
  new_status: string;
  previous_amount: number | null;
  new_amount: number | null;
  source_reference: string | null;
  reason: string | null;
  performed_by: string;
  created_at: string;
}

export interface FavoriteRoute {
  id: string;
  user_id: string;
  route_id: string | null;
  origin_municipality_id: string;
  destination_municipality_id: string;
  transport_type_id: string | null;
  label: string | null;
  created_at: string;
  origin?: Municipality;
  destination?: Municipality;
  transport_type?: TransportType | null;
}

export interface NotificationItem {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  message: string;
  related_report_id: string | null;
  related_fare_id: string | null;
  is_read: boolean;
  read_at: string | null;
  dedupe_key: string | null;
  created_at: string;
}

export interface AuditLog {
  id: string;
  actor_id: string | null;
  actor_role: AppRole | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  old_values: Record<string, unknown> | null;
  new_values: Record<string, unknown> | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface SystemSetting {
  key: string;
  value: Record<string, unknown>;
  description: string | null;
  updated_by: string | null;
  updated_at: string;
}

export interface GeoJsonLineString {
  type: 'LineString';
  coordinates: [number, number][];
}

export interface FareMatrixRow {
  key: string;
  originId: string;
  originName: string;
  destinationId: string;
  destinationName: string;
  transportTypeId: string;
  transportTypeName: string;
  status: FareStatus;
  regularFare: number | null;
  studentFare: number | null;
  seniorFare: number | null;
  pwdFare: number | null;
  issuingAuthority: string | null;
  officialDocumentReference: string | null;
  sourceUrl: string | null;
  lastVerifiedAt: string | null;
  updatedAt: string;
  primaryRecordId: string;
}

export interface TransportStop {
  id: string;
  municipality_id: string;
  transport_type_id: string | null;
  stop_name: string;
  stop_category: StopCategory;
  latitude: number;
  longitude: number;
  address_or_landmark: string | null;
  operating_notes: string | null;
  source_reference: string | null;
  is_verified: boolean;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
  municipality?: Municipality;
  transport_type?: TransportType | null;
}

export interface UserLocationPreferences {
  user_id: string;
  gps_consent_granted: boolean;
  consent_updated_at: string | null;
  allow_live_trip_tracking: boolean;
  share_anonymized_municipality_stats: boolean;
  retention_days: number;
  updated_at: string;
}

export interface UserLocationSession {
  id: string;
  user_id: string;
  permission_state: 'granted' | 'denied' | 'prompt' | 'unsupported';
  is_active: boolean;
  last_latitude: number | null;
  last_longitude: number | null;
  last_accuracy_meters: number | null;
  detected_municipality_id: string | null;
  started_at: string;
  stopped_at: string | null;
}

export interface TripRecord {
  id: string;
  user_id: string;
  origin_municipality_id: string | null;
  destination_municipality_id: string | null;
  route_id: string | null;
  transport_type_id: string | null;
  associated_fare_record_id: string | null;
  recorded_fare_amount: number | null;
  fare_expense_type: FareExpenseType;
  start_latitude: number | null;
  start_longitude: number | null;
  destination_latitude: number | null;
  destination_longitude: number | null;
  current_latitude: number | null;
  current_longitude: number | null;
  distance_km: number;
  duration_seconds: number;
  deviation_detected: boolean;
  max_deviation_km: number;
  status: TripStatus;
  started_at: string;
  ended_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  origin?: Municipality | null;
  destination?: Municipality | null;
  transport_type?: TransportType | null;
}

export interface TripLocationPoint {
  id: string;
  trip_id: string;
  user_id: string;
  latitude: number;
  longitude: number;
  accuracy_meters: number | null;
  speed_mps: number | null;
  heading_deg: number | null;
  recorded_at: string;
}

export interface TrustedContact {
  id: string;
  user_id: string;
  contact_name: string;
  relationship: string | null;
  phone_number: string | null;
  email: string | null;
  notify_on_trip_start: boolean;
  notify_on_arrival: boolean;
  is_active: boolean;
  created_at: string;
}

export interface LocationSharingSession {
  id: string;
  user_id: string;
  trip_id: string | null;
  trusted_contact_id: string | null;
  share_token: string;
  consent_confirmed: boolean;
  expires_at: string;
  revoked_at: string | null;
  is_active: boolean;
  created_at: string;
  trusted_contact?: TrustedContact | null;
  trip?: TripRecord | null;
}

export interface SharedTripTrailPoint {
  latitude: number;
  longitude: number;
  speed_kmh: number | null;
  heading_deg: number | null;
  accuracy_meters: number | null;
  recorded_at: string;
}

export interface SharedTripStatus {
  available: boolean;
  reason?: string;
  commuter_name?: string;
  trip_status?: TripStatus;
  origin_name?: string;
  destination_name?: string;
  transport_mode?: string;
  current_latitude?: number | null;
  current_longitude?: number | null;
  start_latitude?: number | null;
  start_longitude?: number | null;
  destination_latitude?: number | null;
  destination_longitude?: number | null;
  distance_km?: number;
  duration_seconds?: number;
  deviation_detected?: boolean;
  max_deviation_km?: number | null;
  latest_speed_kmh?: number | null;
  avg_speed_kmh?: number | null;
  max_speed_kmh?: number | null;
  heading_deg?: number | null;
  accuracy_meters?: number | null;
  last_recorded_at?: string | null;
  trail_points?: SharedTripTrailPoint[];
  started_at?: string;
  ended_at?: string | null;
  expires_at?: string;
}

export interface SafetyReport {
  id: string;
  reporter_id: string;
  trip_id: string | null;
  municipality_id: string | null;
  transport_type_id: string | null;
  incident_type: string;
  severity: SafetySeverity;
  description: string;
  vehicle_or_operator_details: string | null;
  latitude: number | null;
  longitude: number | null;
  status: SafetyReportStatus;
  admin_notes: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
  municipality?: Municipality | null;
  transport_type?: TransportType | null;
}

export interface AdminAggregatedAnalytics {
  active_trips: number;
  completed_trips: number;
  total_distance_km: number;
  gps_consented_users: number;
  open_safety_reports: number;
  mode_usage: Array<{ mode_name: string; trip_count: number }>;
  municipality_destinations: Array<{ municipality_name: string; trip_count: number }>;
}

export type VehicleTypeOption =
  | 'Jeepney'
  | 'Modern Jeepney'
  | 'Tricycle'
  | 'Bus'
  | 'UV Express'
  | 'Multicab'
  | 'Taxi'
  | 'Other Public Utility Vehicle';

export type ViolationCategoryGroup =
  | 'FARE VIOLATIONS'
  | 'DRIVER BEHAVIOR'
  | 'VEHICLE SAFETY'
  | 'TRANSPORTATION REGULATIONS'
  | 'OTHER';

export type VehicleEvidenceType =
  | 'vehicle_photo'
  | 'license_plate_photo'
  | 'video_recording'
  | 'receipt'
  | 'other_document';

export type ComplaintStatus =
  | 'Draft'
  | 'Submitted to Pamasahe Tracker'
  | 'Pending Initial Review'
  | 'Under Review'
  | 'Additional Information Required'
  | 'Referred to Appropriate Agency'
  | 'Acknowledged by Agency'
  | 'Under Agency Investigation'
  | 'Resolved'
  | 'Closed'
  | 'Rejected'
  | 'Withdrawn';

export type ReferralStatus =
  | 'Recommended'
  | 'Prepared for Manual Submission'
  | 'Submitted Externally by Reporter'
  | 'Referred by Administrator'
  | 'Acknowledged by Agency'
  | 'Under Agency Investigation'
  | 'Closed';

export interface VehicleReportCategory {
  id: string;
  report_id: string;
  category_group: ViolationCategoryGroup;
  category: string;
  created_at: string;
}

export interface VehicleReportEvidence {
  id: string;
  report_id: string;
  storage_path: string;
  evidence_type: VehicleEvidenceType;
  file_type: string;
  file_size_bytes: number;
  original_filename: string;
  uploaded_by: string;
  created_at: string;
}

export interface GovernmentAgency {
  id: string;
  agency_code: string;
  agency_name: string;
  jurisdiction: string;
  categories_handled: string[];
  official_website: string;
  official_complaint_url: string | null;
  verified_contact_information: string;
  submission_instructions: string;
  last_verified_at: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface AgencyReferral {
  id: string;
  report_id: string;
  agency_id: string;
  referral_status: ReferralStatus;
  referral_date: string | null;
  external_reference_number: string | null;
  acknowledgment_date: string | null;
  referral_notes: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  agency?: GovernmentAgency | null;
}

export interface VehicleReportStatusLog {
  id: string;
  report_id: string;
  previous_status: string | null;
  new_status: string;
  remarks: string | null;
  changed_by: string;
  created_at: string;
}

export interface VehicleReport {
  id: string;
  reference_number: string;
  user_id: string;
  plate_number: string | null;
  plate_not_available: boolean;
  vehicle_type: VehicleTypeOption;
  body_number: string | null;
  vehicle_color: string | null;
  vehicle_model: string | null;
  operator_name: string | null;
  route_info: string | null;
  origin_municipality_id: string | null;
  destination_municipality_id: string | null;
  municipality_id: string;
  incident_location: string;
  incident_latitude: number | null;
  incident_longitude: number | null;
  incident_date: string;
  incident_time: string | null;
  description: string;
  actual_fare: number | null;
  expected_fare: number | null;
  additional_remarks: string | null;
  is_confidential_identity: boolean;
  external_share_consent: boolean;
  submission_idempotency_key: string | null;
  is_duplicate_flagged: boolean;
  complaint_status: ComplaintStatus;
  assigned_admin_id: string | null;
  admin_remarks: string | null;
  created_at: string;
  updated_at: string;
  municipality?: Municipality | null;
  origin?: Municipality | null;
  destination?: Municipality | null;
  categories?: VehicleReportCategory[];
  evidence?: VehicleReportEvidence[];
  referrals?: AgencyReferral[];
  status_logs?: VehicleReportStatusLog[];
}
