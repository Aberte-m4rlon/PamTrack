import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  CheckCircle2,
  PhoneCall,
  Share2,
  ShieldAlert,
  Trash2,
  UserPlus,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useGps } from '@/contexts/GpsContext';
import { useNetwork } from '@/contexts/NetworkContext';
import { useToast } from '@/contexts/ToastContext';
import {
  getOfflineAlertSoundEnabled,
  saveOfflineAlert,
  triggerOfflineDeviceAlert,
} from '@/lib/offlineTripsAndAlerts';
import {
  useLocationSharingSessions,
  useMunicipalities,
  useMySafetyReports,
  useMyTrips,
  useTransportTypes,
  useTrustedContacts,
} from '@/hooks/useReferenceData';
import { supabase } from '@/lib/supabase';
import { formatDateTimeSafe } from '@/lib/utils';
import {
  addTrustedContact,
  createLocationSharingSession,
  removeTrustedContact,
  revokeLocationSharingSession,
  submitSafetyReport,
} from '@/services/pamasaheApi';
import type { SafetySeverity } from '@/types/database';
import {
  EmptyStateCard,
  GlassButton,
  GlassCard,
} from '@/components/glass/GlassPrimitives';

export function SafetyCenterPage() {
  const { user, isConfigured } = useAuth();
  const { currentPosition } = useGps();
  const { isOnline } = useNetwork();
  const { pushToast } = useToast();
  const queryClient = useQueryClient();

  const { data: contacts } = useTrustedContacts();
  const { data: sharingSessions } = useLocationSharingSessions();
  const { data: myTrips } = useMyTrips();
  const { data: safetyReports } = useMySafetyReports();
  const { data: muniRes } = useMunicipalities();
  const { data: transportRes } = useTransportTypes();

  const municipalities = muniRes?.data ?? [];
  const transportTypes = transportRes?.data ?? [];
  const activeTrip = (myTrips ?? []).find((t) => t.status === 'active');

  // Trusted contact form
  const [contactName, setContactName] = useState('');
  const [relationship, setRelationship] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');

  // Location share form
  const [selectedContactId, setSelectedContactId] = useState('');
  const [durationMinutes, setDurationMinutes] = useState(60);
  const [consentChecked, setConsentChecked] = useState(false);

  // Safety report form
  const [incidentType, setIncidentType] = useState('Overcharging / Kontrata');
  const [severity, setSeverity] = useState<SafetySeverity>('medium');
  const [muniId, setMuniId] = useState('');
  const [ttId, setTtId] = useState('');
  const [vehicleDetails, setVehicleDetails] = useState('');
  const [description, setDescription] = useState('');
  const [attachGps, setAttachGps] = useState(false);

  const addContactMut = useMutation({
    mutationFn: () =>
      addTrustedContact({
        userId: user!.id,
        contactName: contactName.trim(),
        relationship: relationship.trim(),
        phoneNumber: phone.trim(),
        email: email.trim(),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trustedContacts', user?.id] });
      setContactName('');
      setRelationship('');
      setPhone('');
      setEmail('');
      pushToast({ title: 'Trusted contact saved', variant: 'success' });
    },
    onError: (err: Error) => {
      pushToast({ title: 'Save failed', description: err.message, variant: 'error' });
    },
  });

  const removeContactMut = useMutation({
    mutationFn: (id: string) => removeTrustedContact(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trustedContacts', user?.id] });
      pushToast({ title: 'Trusted contact removed', variant: 'info' });
    },
  });

  const createShareMut = useMutation({
    mutationFn: () => {
      if (!activeTrip) throw new Error('Start an active trip in Live Trip Monitor first.');
      if (!consentChecked) throw new Error('Confirm explicit location sharing consent.');
      return createLocationSharingSession({
        userId: user!.id,
        tripId: activeTrip.id,
        trustedContactId: selectedContactId || null,
        durationMinutes,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['locationSharing', user?.id] });
      setConsentChecked(false);
      pushToast({ title: 'Time-limited trip sharing link created', variant: 'success' });
    },
    onError: (err: Error) => {
      pushToast({ title: 'Cannot create share link', description: err.message, variant: 'error' });
    },
  });

  const revokeShareMut = useMutation({
    mutationFn: (id: string) => revokeLocationSharingSession(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['locationSharing', user?.id] });
      pushToast({ title: 'Location sharing revoked immediately', variant: 'info' });
    },
  });

  const submitSafetyMut = useMutation({
    mutationFn: () =>
      submitSafetyReport({
        reporterId: user!.id,
        tripId: activeTrip?.id ?? null,
        municipalityId: muniId || null,
        transportTypeId: ttId || null,
        incidentType,
        severity,
        description: description.trim(),
        vehicleOrOperatorDetails: vehicleDetails.trim() || undefined,
        latitude: attachGps && currentPosition ? currentPosition.latitude : null,
        longitude: attachGps && currentPosition ? currentPosition.longitude : null,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mySafetyReports', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['notifications', user?.id] });
      setDescription('');
      setVehicleDetails('');
      pushToast({ title: 'Safety report submitted', variant: 'success' });
    },
    onError: (err: Error) => {
      pushToast({ title: 'Submission failed', description: err.message, variant: 'error' });
    },
  });

  const handleArrivalAlert = async () => {
    if (!user) return;
    const message = `Arrival check-in logged at ${new Date().toLocaleTimeString()}${!isOnline ? ' (saved offline)' : ''}.`;
    saveOfflineAlert({
      userId: user.id,
      type: 'arrival_alert',
      title: 'Safe arrival recorded',
      message,
      latitude: currentPosition?.latitude ?? null,
      longitude: currentPosition?.longitude ?? null,
      synced: isOnline && Boolean(supabase),
    });
    triggerOfflineDeviceAlert({
      title: 'Safe arrival recorded',
      body: message,
      soundEnabled: getOfflineAlertSoundEnabled(),
    });

    if (isOnline && supabase) {
      await supabase.from('notifications').insert({
        user_id: user.id,
        type: 'arrival_alert',
        title: 'Safe arrival recorded',
        message,
        dedupe_key: `arrival-${Date.now()}`,
      });
    }
    queryClient.invalidateQueries({ queryKey: ['notifications', user.id] });
    pushToast({ title: 'Safe arrival notification recorded', variant: 'success' });
  };

  return (
    <div className="space-y-6">
      <GlassCard variant="rose" className="p-4 sm:p-6 flex flex-col sm:flex-row sm:flex-wrap sm:items-center sm:justify-between gap-4">
        <div className="min-w-0 space-y-1">
          <p className="text-[11px] sm:text-xs font-bold uppercase tracking-widest text-[#C9182B]">
            Commuter Protection &amp; Consent Controls
          </p>
          <h1 className="font-display text-xl sm:text-3xl font-extrabold text-[#29262B]">
            Trusted Contacts &amp; Safety Center
          </h1>
          <p className="text-xs sm:text-sm text-[#343039] font-medium">
            Manage emergency contacts, share active trips via revocable expiring links, and submit
            transport safety reports.
          </p>
        </div>

        <div className="flex flex-wrap gap-2 w-full sm:w-auto">
          <a href="tel:911" className="flex-1 sm:flex-initial">
            <GlassButton variant="primary" size="sm" className="w-full">
              <PhoneCall className="h-3.5 w-3.5" />
              Emergency 911
            </GlassButton>
          </a>
          <a href="tel:1342" className="flex-1 sm:flex-initial">
            <GlassButton variant="secondary" size="sm" className="w-full">
              <PhoneCall className="h-3.5 w-3.5 text-[#C9182B]" />
              LTFRB 1342
            </GlassButton>
          </a>
          {user && (
            <GlassButton
              type="button"
              variant="glass"
              size="sm"
              className="w-full sm:w-auto"
              onClick={handleArrivalAlert}
            >
              <CheckCircle2 className="h-3.5 w-3.5 text-[#C9182B]" />
              Safe Arrival Check-In
            </GlassButton>
          )}
        </div>
      </GlassCard>

      {!user ? (
        <EmptyStateCard
          icon={ShieldAlert}
          title="Sign in to manage Trusted Contacts and Safety Reports"
          description="Personal contacts, time-limited sharing tokens, and incident submissions require a registered commuter account protected by Row Level Security."
        />
      ) : (
        <div className="grid gap-6 lg:grid-cols-12">
          {/* Trusted Contacts & Time-Limited Sharing */}
          <div className="lg:col-span-6 space-y-5">
            <GlassCard variant="strong" className="p-5 space-y-4">
              <h2 className="flex items-center gap-2 font-display text-lg font-bold text-[#29262B]">
                <UserPlus className="h-4 w-4 text-[#C9182B]" />
                Trusted Contacts ({contacts?.length ?? 0})
              </h2>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  addContactMut.mutate();
                }}
                className="grid gap-2.5 sm:grid-cols-2"
              >
                <input
                  type="text"
                  required
                  value={contactName}
                  onChange={(e) => setContactName(e.target.value)}
                  placeholder="Contact Full Name"
                  className="glass-input rounded-xl px-3 py-2 text-xs"
                />
                <input
                  type="text"
                  value={relationship}
                  onChange={(e) => setRelationship(e.target.value)}
                  placeholder="Relationship (e.g., Family)"
                  className="glass-input rounded-xl px-3 py-2 text-xs"
                />
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="Phone Number"
                  className="glass-input rounded-xl px-3 py-2 text-xs"
                />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Email (optional)"
                  className="glass-input rounded-xl px-3 py-2 text-xs"
                />
                <GlassButton
                  type="submit"
                  variant="primary"
                  size="sm"
                  className="sm:col-span-2"
                  disabled={!isConfigured || addContactMut.isPending}
                >
                  Add Trusted Contact
                </GlassButton>
              </form>

              <div className="space-y-2">
                {(contacts ?? []).map((c) => (
                  <div
                    key={c.id}
                    className="flex items-center justify-between rounded-2xl bg-white/85 border border-[#F8E7EA] p-3 text-xs"
                  >
                    <div>
                      <p className="font-bold text-[#29262B]">
                        {c.contact_name}{' '}
                        {c.relationship && (
                          <span className="text-[#B51224]">({c.relationship})</span>
                        )}
                      </p>
                      <p className="text-[#777078]">
                        {c.phone_number || 'No phone'} • {c.email || 'No email'}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeContactMut.mutate(c.id)}
                      className="rounded-lg p-1.5 text-[#C9182B] hover:bg-[#F8E7EA]"
                      aria-label="Remove contact"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </GlassCard>

            <GlassCard variant="strong" className="p-5 space-y-4">
              <h2 className="flex items-center gap-2 font-display text-lg font-bold text-[#29262B]">
                <Share2 className="h-4 w-4 text-[#C9182B]" />
                Time-Limited Trip Location Sharing
              </h2>
              <p className="text-xs text-[#777078]">
                Your exact location is never public. Only holders of an active, unexpired,
                unrevoked token can view your active trip status.
              </p>

              <div className="space-y-2.5 text-xs">
                <div className="grid gap-2 sm:grid-cols-2">
                  <select
                    value={selectedContactId}
                    onChange={(e) => setSelectedContactId(e.target.value)}
                    className="glass-input rounded-xl px-3 py-2"
                  >
                    <option value="">Optional trusted contact...</option>
                    {(contacts ?? []).map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.contact_name}
                      </option>
                    ))}
                  </select>
                  <select
                    value={durationMinutes}
                    onChange={(e) => setDurationMinutes(Number(e.target.value))}
                    className="glass-input rounded-xl px-3 py-2"
                  >
                    <option value={15}>Expires in 15 mins</option>
                    <option value={30}>Expires in 30 mins</option>
                    <option value={60}>Expires in 1 hour</option>
                    <option value={120}>Expires in 2 hours</option>
                  </select>
                </div>

                <label className="flex items-center gap-2 font-semibold text-[#29262B]">
                  <input
                    type="checkbox"
                    checked={consentChecked}
                    onChange={(e) => setConsentChecked(e.target.checked)}
                    className="accent-[#C9182B]"
                  />
                  I explicitly consent to share my active trip GPS position until expiry or
                  revocation.
                </label>

                <GlassButton
                  type="button"
                  variant="primary"
                  size="sm"
                  disabled={!activeTrip || !consentChecked || createShareMut.isPending}
                  onClick={() => createShareMut.mutate()}
                >
                  {activeTrip
                    ? 'Generate Active Trip Share Link'
                    : 'Start an Active Trip First'}
                </GlassButton>
              </div>

              <div className="space-y-2">
                {(sharingSessions ?? []).map((s) => {
                  const link = `${window.location.origin}/shared-trip/${s.share_token}`;
                  const active = s.is_active && !s.revoked_at && new Date(s.expires_at) > new Date();
                  return (
                    <div
                      key={s.id}
                      className="glass-pill-tile rounded-[20px] p-3 text-xs space-y-1.5"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span
                          className={`rounded-full border border-white/80 px-2.5 py-0.5 font-bold uppercase text-[10px] backdrop-blur-md ${
                            active
                              ? 'bg-[#C9182B] text-white'
                              : 'bg-white/75 text-[#343039]'
                          }`}
                        >
                          {active ? 'Active Share' : s.revoked_at ? 'Revoked' : 'Expired'}
                        </span>
                        {active && (
                          <GlassButton
                            type="button"
                            variant="danger"
                            size="sm"
                            onClick={() => revokeShareMut.mutate(s.id)}
                          >
                            Revoke Now
                          </GlassButton>
                        )}
                      </div>
                      <p className="text-[11px] text-[#777078]">
                        Expires: {formatDateTimeSafe(s.expires_at)}
                      </p>
                      {active && (
                        <a
                          href={link}
                          target="_blank"
                          rel="noreferrer"
                          className="block truncate font-mono text-[11px] text-[#C9182B] underline"
                        >
                          {link}
                        </a>
                      )}
                    </div>
                  );
                })}
              </div>
            </GlassCard>
          </div>

          {/* Safety Incident Reports */}
          <GlassCard variant="strong" className="p-5 lg:col-span-6 space-y-4 h-fit">
            <h2 className="flex items-center gap-2 font-display text-lg font-bold text-[#29262B]">
              <ShieldAlert className="h-4 w-4 text-[#C9182B]" />
              Report a Safety Incident
            </h2>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                submitSafetyMut.mutate();
              }}
              className="space-y-3 text-xs"
            >
              <div className="grid gap-2.5 sm:grid-cols-2">
                <select
                  value={incidentType}
                  onChange={(e) => setIncidentType(e.target.value)}
                  className="glass-input rounded-xl px-3 py-2"
                >
                  <option>Overcharging / Kontrata</option>
                  <option>Refusal of Student/Senior/PWD Discount</option>
                  <option>Reckless Driving</option>
                  <option>Unlicensed / Colorum Vehicle</option>
                  <option>Harassment or Safety Threat</option>
                  <option>Other Transport Safety Issue</option>
                </select>
                <select
                  value={severity}
                  onChange={(e) => setSeverity(e.target.value as SafetySeverity)}
                  className="glass-input rounded-xl px-3 py-2"
                >
                  <option value="low">Severity: Low</option>
                  <option value="medium">Severity: Medium</option>
                  <option value="high">Severity: High</option>
                  <option value="critical">Severity: Critical</option>
                </select>
              </div>

              <div className="grid gap-2.5 sm:grid-cols-2">
                <select
                  value={muniId}
                  onChange={(e) => setMuniId(e.target.value)}
                  className="glass-input rounded-xl px-3 py-2"
                >
                  <option value="">Municipality (optional)...</option>
                  {municipalities.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
                </select>
                <select
                  value={ttId}
                  onChange={(e) => setTtId(e.target.value)}
                  className="glass-input rounded-xl px-3 py-2"
                >
                  <option value="">Transport Mode (optional)...</option>
                  {transportTypes.map((tt) => (
                    <option key={tt.id} value={tt.id}>
                      {tt.name}
                    </option>
                  ))}
                </select>
              </div>

              <input
                type="text"
                value={vehicleDetails}
                onChange={(e) => setVehicleDetails(e.target.value)}
                placeholder="Plate / Body No. / TODA / Operator (optional)"
                className="glass-input w-full rounded-xl px-3 py-2"
              />

              <textarea
                rows={3}
                required
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe what happened cleanly and factually..."
                className="glass-input w-full rounded-xl px-3 py-2"
              />

              {currentPosition && (
                <label className="flex items-center gap-2 font-semibold text-[#29262B]">
                  <input
                    type="checkbox"
                    checked={attachGps}
                    onChange={(e) => setAttachGps(e.target.checked)}
                    className="accent-[#C9182B]"
                  />
                  Include my current GPS fix ({currentPosition.latitude.toFixed(4)}°N,{' '}
                  {currentPosition.longitude.toFixed(4)}°E) with this report
                </label>
              )}

              <GlassButton
                type="submit"
                variant="primary"
                disabled={submitSafetyMut.isPending}
              >
                Submit Safety Report
              </GlassButton>
            </form>

            <div className="space-y-2 border-t border-[#E9E5E8]/40 pt-4">
              <p className="text-xs font-bold text-[#29262B]">
                My Safety Reports ({safetyReports?.length ?? 0})
              </p>
              {(safetyReports ?? []).map((sr) => (
                <div key={sr.id} className="rounded-2xl bg-white/85 border border-[#F8E7EA] p-3 text-xs space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-[#29262B]">{sr.incident_type}</span>
                    <span className="rounded-full bg-[#F8E7EA] px-2 py-0.5 text-[10px] font-bold uppercase text-[#C9182B]">
                      {sr.status}
                    </span>
                  </div>
                  <p className="text-[#777078]">{sr.description}</p>
                  {sr.admin_notes && (
                    <p className="text-[11px] font-semibold text-[#B51224]">
                      Admin response: {sr.admin_notes}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </GlassCard>
        </div>
      )}
    </div>
  );
}
