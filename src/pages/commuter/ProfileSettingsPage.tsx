import { useEffect, useState } from 'react';
import { Save, Shield } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { useMunicipalities } from '@/hooks/useReferenceData';
import { supabase } from '@/lib/supabase';
import { GlassButton, GlassCard } from '@/components/glass/GlassPrimitives';

export function ProfileSettingsPage() {
  const { user, profile, refreshProfile } = useAuth();
  const { pushToast } = useToast();
  const { data: muniRes } = useMunicipalities();
  const municipalities = muniRes?.data ?? [];

  const [fullName, setFullName] = useState(profile?.full_name ?? '');
  const [phoneNumber, setPhoneNumber] = useState(profile?.phone_number ?? '');
  const [homeMuniId, setHomeMuniId] = useState(profile?.home_municipality_id ?? '');
  const [saving, setSaving] = useState(false);

  const [newPassword, setNewPassword] = useState('');
  const [updatingPw, setUpdatingPw] = useState(false);

  useEffect(() => {
    setFullName(profile?.full_name ?? '');
    setPhoneNumber(profile?.phone_number ?? '');
    setHomeMuniId(profile?.home_municipality_id ?? '');
  }, [profile]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase || !user) return;
    setSaving(true);
    const { error } = await supabase
      .from('profiles')
      .update({
        full_name: fullName.trim(),
        phone_number: phoneNumber.trim() || null,
        home_municipality_id: homeMuniId || null,
      })
      .eq('id', user.id);

    setSaving(false);
    if (error) {
      pushToast({ title: 'Hindi na-save', description: error.message, variant: 'error' });
      return;
    }
    await refreshProfile();
    pushToast({ title: 'Na-save na ang profile', variant: 'success' });
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase) return;
    if (newPassword.length < 8) {
      pushToast({ title: 'Dapat ay 8 characters o higit pa ang password.', variant: 'error' });
      return;
    }
    setUpdatingPw(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setUpdatingPw(false);
    if (error) {
      pushToast({ title: 'Hindi napalitan ang password', description: error.message, variant: 'error' });
      return;
    }
    setNewPassword('');
    pushToast({ title: 'Napalitan na ang password', variant: 'success' });
  };

  return (
    <div className="space-y-6">
      <GlassCard variant="strong" className="p-6">
        <p className="text-xs font-bold uppercase tracking-widest text-[#C9182B]">Account</p>
        <h1 className="font-display text-2xl font-extrabold text-[#29262B]">Settings ng Profile</h1>
      </GlassCard>

      <div className="grid gap-6 lg:grid-cols-2">
        <GlassCard variant="strong" className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-lg font-bold text-[#29262B]">Personal na Impormasyon</h2>
            <span className="inline-flex items-center gap-1 rounded-full bg-[#F8E7EA] px-3 py-1 text-xs font-bold uppercase text-[#C9182B]">
              <Shield className="h-3.5 w-3.5" />
              Account ng Pasahero
            </span>
          </div>

          <form onSubmit={handleSaveProfile} className="space-y-3.5">
            <div>
              <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-[#777078]">
                Email (Hindi napapalitan)
              </label>
              <input
                type="email"
                value={profile?.email ?? user?.email ?? ''}
                disabled
                className="glass-input w-full rounded-2xl px-3.5 py-2 text-sm opacity-75"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-[#777078]">
                Buong Pangalan
              </label>
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="glass-input w-full rounded-2xl px-3.5 py-2 text-sm"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-[#777078]">
                Numero ng Telepono (Opsyonal)
              </label>
              <input
                type="text"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder="09XX-XXX-XXXX"
                className="glass-input w-full rounded-2xl px-3.5 py-2 text-sm"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-[#777078]">
                Taga-saang Bayan
              </label>
              <select
                value={homeMuniId}
                onChange={(e) => setHomeMuniId(e.target.value)}
                className="glass-input w-full rounded-2xl px-3.5 py-2 text-sm"
              >
                <option value="">Pumili ng LGU...</option>
                {municipalities.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
            </div>

            <GlassButton type="submit" variant="primary" disabled={saving}>
              <Save className="h-4 w-4" />
              {saving ? 'Sine-save...' : 'I-save ang Pagbabago'}
            </GlassButton>
          </form>
        </GlassCard>

        <GlassCard variant="strong" className="p-6 space-y-4 h-fit">
          <h2 className="font-display text-lg font-bold text-[#29262B]">Seguridad at Password</h2>
          <form onSubmit={handleChangePassword} className="space-y-3.5">
            <div>
              <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-[#777078]">
                Bagong Password
              </label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Min 8 characters"
                className="glass-input w-full rounded-2xl px-3.5 py-2 text-sm"
              />
            </div>
            <GlassButton type="submit" variant="secondary" disabled={updatingPw}>
              {updatingPw ? 'Pinapalitan...' : 'Palitan ang Password'}
            </GlassButton>
          </form>
        </GlassCard>
      </div>
    </div>
  );
}
