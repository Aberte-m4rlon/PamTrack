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
  const [incidentType, setIncidentType] = useState('Sobra ang Singil / Kontrata');
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
      pushToast({ title: 'Na-save na ang trusted contact', variant: 'success' });
    },
    onError: (err: Error) => {
      pushToast({ title: 'Hindi na-save', description: err.message, variant: 'error' });
    },
  });

  const removeContactMut = useMutation({
    mutationFn: (id: string) => removeTrustedContact(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trustedContacts', user?.id] });
      pushToast({ title: 'Natanggal na ang trusted contact', variant: 'info' });
    },
  });

  const createShareMut = useMutation({
    mutationFn: () => {
      if (!activeTrip) throw new Error('Magsimula muna ng active trip sa Live Trip Monitor.');
      if (!consentChecked) throw new Error('I-check muna ang pahintulot sa pag-share ng lokasyon.');
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
      pushToast({ title: 'Nagawa na ang may-limit na share link', variant: 'success' });
    },
    onError: (err: Error) => {
      pushToast({ title: 'Hindi nagawa ang share link', description: err.message, variant: 'error' });
    },
  });

  const revokeShareMut = useMutation({
    mutationFn: (id: string) => revokeLocationSharingSession(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['locationSharing', user?.id] });
      pushToast({ title: 'Agad na na-revoke ang location sharing', variant: 'info' });
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
      pushToast({ title: 'Naipadala na ang safety report', variant: 'success' });
    },
    onError: (err: Error) => {
      pushToast({ title: 'Hindi naipadala ang report', description: err.message, variant: 'error' });
    },
  });

  const handleArrivalAlert = async () => {
    if (!user) return;
    const message = `Naitala ang ligtas na pagdating noong ${new Date().toLocaleTimeString()}${!isOnline ? ' (naka-save offline)' : ''}.`;
    saveOfflineAlert({
      userId: user.id,
      type: 'arrival_alert',
      title: 'Naitala ang ligtas na pagdating',
      message,
      latitude: currentPosition?.latitude ?? null,
      longitude: currentPosition?.longitude ?? null,
      synced: isOnline && Boolean(supabase),
    });
    triggerOfflineDeviceAlert({
      title: 'Naitala ang ligtas na pagdating',
      body: message,
      soundEnabled: getOfflineAlertSoundEnabled(),
    });

    if (isOnline && supabase) {
      await supabase.from('notifications').insert({
        user_id: user.id,
        type: 'arrival_alert',
        title: 'Naitala ang ligtas na pagdating',
        message,
        dedupe_key: `arrival-${Date.now()}`,
      });
    }
    queryClient.invalidateQueries({ queryKey: ['notifications', user.id] });
    pushToast({ title: 'Naitala ang abiso ng ligtas na pagdating', variant: 'success' });
  };

  return (
    <div className="space-y-6">
      <GlassCard variant="rose" staggerIndex={0} className="p-4 sm:p-6 flex flex-col sm:flex-row sm:flex-wrap sm:items-center sm:justify-between gap-4">
        <div className="min-w-0 space-y-1">
          <p className="text-[11px] sm:text-xs font-bold uppercase tracking-widest text-[#C9182B]">
            Proteksyon ng Pasahero at Pahintulot
          </p>
          <h1 className="font-display text-xl sm:text-3xl font-extrabold text-[#29262B]">
            Trusted Contacts at Safety Center
          </h1>
          <p className="text-xs sm:text-sm text-[#343039] font-medium">
            Ayusin ang emergency contacts, mag-share ng live biyahe gamit ang nag-e-expire na link, at magpadala ng safety report.
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
              Ligtas na Pagdating
            </GlassButton>
          )}
        </div>
      </GlassCard>

      {!user ? (
        <EmptyStateCard
          icon={ShieldAlert}
          title="Mag-sign in para sa Trusted Contacts at Safety Reports"
          description="Kailangan ang account ng pasahero para sa personal contacts, may-limit na sharing link, at safety reports."
        />
      ) : (
        <div className="grid gap-6 lg:grid-cols-12 min-w-0">
          {/* Trusted Contacts at May-Limit na Pag-share */}
          <div className="min-w-0 lg:col-span-6 space-y-5">
            <GlassCard variant="strong" staggerIndex={1} className="p-5 space-y-4">
              <h2 className="flex items-center gap-2 font-display text-lg font-bold text-[#29262B]">
                <UserPlus className="h-4 w-4 text-[#C9182B]" />
                Mga Trusted Contact ({contacts?.length ?? 0})
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
                  placeholder="Buong Pangalan ng Contact"
                  className="glass-input rounded-xl px-3 py-2 text-xs"
                />
                <input
                  type="text"
                  value={relationship}
                  onChange={(e) => setRelationship(e.target.value)}
                  placeholder="Relasyon (hal. Pamilya, Kaibigan)"
                  className="glass-input rounded-xl px-3 py-2 text-xs"
                />
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="Numero ng Telepono"
                  className="glass-input rounded-xl px-3 py-2 text-xs"
                />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Email (opsyonal)"
                  className="glass-input rounded-xl px-3 py-2 text-xs"
                />
                <GlassButton
                  type="submit"
                  variant="primary"
                  size="sm"
                  className="sm:col-span-2"
                  disabled={!isConfigured || addContactMut.isPending}
                >
                  Idagdag sa Trusted Contacts
                </GlassButton>
              </form>

              <div className="space-y-2">
                {(contacts ?? []).map((c) => (
                  <div
                    key={c.id}
                    className="liquid-reveal-enter flex items-center justify-between rounded-2xl bg-white/85 border border-[#F8E7EA] p-3 text-xs"
                  >
                    <div>
                      <p className="font-bold text-[#29262B]">
                        {c.contact_name}{' '}
                        {c.relationship && (
                          <span className="text-[#B51224]">({c.relationship})</span>
                        )}
                      </p>
                      <p className="text-[#777078]">
                        {c.phone_number || 'Walang numero'} • {c.email || 'Walang email'}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeContactMut.mutate(c.id)}
                      className="rounded-lg p-1.5 text-[#C9182B] hover:bg-[#F8E7EA] transition-transform duration-150 active:scale-95"
                      aria-label="Alisin ang contact"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </GlassCard>

            <GlassCard variant="strong" staggerIndex={2} className="p-5 space-y-4">
              <h2 className="flex items-center gap-2 font-display text-lg font-bold text-[#29262B]">
                <Share2 className="h-4 w-4 text-[#C9182B]" />
                May-Limit na Pag-share ng Lokasyon
              </h2>
              <p className="text-xs text-[#777078]">
                Hindi kailanman pampubliko ang eksaktong lokasyon mo. Tanging may hawak lang ng active at hindi pa na-revoke na link ang makakakita ng biyahe mo.
              </p>

              <div className="space-y-2.5 text-xs">
                <div className="grid gap-2 sm:grid-cols-2">
                  <select
                    value={selectedContactId}
                    onChange={(e) => setSelectedContactId(e.target.value)}
                    className="glass-input rounded-xl px-3 py-2"
                  >
                    <option value="">Pumili ng contact (opsyonal)...</option>
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
                    <option value={15}>Mag-e-expire sa 15 minuto</option>
                    <option value={30}>Mag-e-expire sa 30 minuto</option>
                    <option value={60}>Mag-e-expire sa 1 oras</option>
                    <option value={120}>Mag-e-expire sa 2 oras</option>
                  </select>
                </div>

                <label className="flex items-center gap-2 font-semibold text-[#29262B]">
                  <input
                    type="checkbox"
                    checked={consentChecked}
                    onChange={(e) => setConsentChecked(e.target.checked)}
                    className="accent-[#C9182B]"
                  />
                  Pumapayag akong i-share ang live GPS ng active kong biyahe hanggang mag-expire o i-revoke ko ito.
                </label>

                <GlassButton
                  type="button"
                  variant="primary"
                  size="sm"
                  disabled={!activeTrip || !consentChecked || createShareMut.isPending}
                  onClick={() => createShareMut.mutate()}
                >
                  {activeTrip
                    ? 'Gumawa ng Active Trip Share Link'
                    : 'Magsimula Muna ng Live Biyahe'}
                </GlassButton>
              </div>

              <div className="space-y-2">
                {(sharingSessions ?? []).map((s) => {
                  const link = `${window.location.origin}/shared-trip/${s.share_token}`;
                  const active = s.is_active && !s.revoked_at && new Date(s.expires_at) > new Date();
                  return (
                    <div
                      key={s.id}
                      className="liquid-reveal-enter glass-pill-tile min-w-0 max-w-full overflow-hidden rounded-[20px] p-3 text-xs space-y-1.5"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span
                          className={`rounded-full border border-white/80 px-2.5 py-0.5 font-bold uppercase text-[10px] backdrop-blur-md ${
                            active
                              ? 'bg-[#C9182B] text-white'
                              : 'bg-white/75 text-[#343039]'
                          }`}
                        >
                          {active ? 'Naka-share Ngayon' : s.revoked_at ? 'Na-revoke' : 'Nag-expire na'}
                        </span>
                        {active && (
                          <GlassButton
                            type="button"
                            variant="danger"
                            size="sm"
                            onClick={() => revokeShareMut.mutate(s.id)}
                          >
                            I-revoke Ngayon
                          </GlassButton>
                        )}
                      </div>
                      <p className="text-[11px] text-[#5B555E]">
                        Mag-e-expire: {formatDateTimeSafe(s.expires_at)}
                      </p>
                      {active && (
                        <div className="space-y-1.5 min-w-0 max-w-full">
                          <a
                            href={link}
                            target="_blank"
                            rel="noreferrer"
                            className="block w-full min-w-0 break-all font-mono text-[11px] text-[#C9182B] underline"
                          >
                            {link}
                          </a>
                          <div className="flex flex-wrap gap-1.5">
                            <GlassButton
                              type="button"
                              variant="secondary"
                              size="sm"
                              onClick={() => {
                                navigator.clipboard?.writeText(link).then(() => {
                                  pushToast({
                                    title: 'Nakopya na ang live share link',
                                    variant: 'success',
                                  });
                                });
                              }}
                            >
                              Kopyahin ang Live Monitor Link
                            </GlassButton>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </GlassCard>
          </div>

          {/* Mga Safety Incident Report */}
          <GlassCard variant="strong" staggerIndex={3} className="p-5 lg:col-span-6 space-y-4 h-fit">
            <h2 className="flex items-center gap-2 font-display text-lg font-bold text-[#29262B]">
              <ShieldAlert className="h-4 w-4 text-[#C9182B]" />
              Mag-report ng Safety Incident
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
                  <option>Sobra ang Singil / Kontrata</option>
                  <option>Ayaw Magbigay ng Student/Senior/PWD Discount</option>
                  <option>Mapanganib o Kaskaserong Pagmamaneho</option>
                  <option>Walang Prangkisa / Colorum na Sasakyan</option>
                  <option>Panliligalig o Banta sa Kaligtasan</option>
                  <option>Ibang Isyu sa Kaligtasan sa Biyahe</option>
                </select>
                <select
                  value={severity}
                  onChange={(e) => setSeverity(e.target.value as SafetySeverity)}
                  className="glass-input rounded-xl px-3 py-2"
                >
                  <option value="low">Antas: Mababa</option>
                  <option value="medium">Antas: Katamtaman</option>
                  <option value="high">Antas: Mataas</option>
                  <option value="critical">Antas: Kritikal</option>
                </select>
              </div>

              <div className="grid gap-2.5 sm:grid-cols-2">
                <select
                  value={muniId}
                  onChange={(e) => setMuniId(e.target.value)}
                  className="glass-input rounded-xl px-3 py-2"
                >
                  <option value="">Bayan (opsyonal)...</option>
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
                  <option value="">Uri ng Sasakyan (opsyonal)...</option>
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
                placeholder="Plaka / Body No. / TODA / Operator (opsyonal)"
                className="glass-input w-full rounded-xl px-3 py-2"
              />

              <textarea
                rows={3}
                required
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Ikwento nang malinaw at totoo ang nangyari..."
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
                  Isama ang kasalukuyan kong GPS ({currentPosition.latitude.toFixed(4)}°N,{' '}
                  {currentPosition.longitude.toFixed(4)}°E) sa report
                </label>
              )}

              <GlassButton
                type="submit"
                variant="primary"
                disabled={submitSafetyMut.isPending}
              >
                Ipadala ang Safety Report
              </GlassButton>
            </form>

            <div className="space-y-2 border-t border-[#E9E5E8]/40 pt-4">
              <p className="text-xs font-bold text-[#29262B]">
                Mga Safety Report Ko ({safetyReports?.length ?? 0})
              </p>
              {(safetyReports ?? []).map((sr) => (
                <div key={sr.id} className="liquid-reveal-enter rounded-2xl bg-white/85 border border-[#F8E7EA] p-3 text-xs space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-[#29262B]">{sr.incident_type}</span>
                    <span className="rounded-full bg-[#F8E7EA] px-2 py-0.5 text-[10px] font-bold uppercase text-[#C9182B]">
                      {sr.status}
                    </span>
                  </div>
                  <p className="text-[#777078]">{sr.description}</p>
                  {sr.admin_notes && (
                    <p className="text-[11px] font-semibold text-[#B51224]">
                      Tugon ng admin: {sr.admin_notes}
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
