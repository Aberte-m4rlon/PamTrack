import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Save, SlidersHorizontal } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { fetchSystemSettings, updateSystemSetting } from '@/services/pamasaheApi';
import { GlassButton, GlassCard } from '@/components/glass/GlassPrimitives';

export function SystemSettingsPage() {
  const { user, isSuperAdmin, isConfigured } = useAuth();
  const { pushToast } = useToast();
  const queryClient = useQueryClient();

  const { data: settings } = useQuery({
    queryKey: ['systemSettings'],
    queryFn: fetchSystemSettings,
    enabled: isConfigured,
  });

  const [drafts, setDrafts] = useState<Record<string, string>>({});

  const saveMutation = useMutation({
    mutationFn: ({ key, rawJson }: { key: string; rawJson: string }) => {
      const parsed = JSON.parse(rawJson) as Record<string, unknown>;
      return updateSystemSetting(key, parsed, user!.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['systemSettings'] });
      pushToast({ title: 'System setting updated', variant: 'success' });
    },
    onError: (err: Error) => {
      pushToast({ title: 'Update rejected', description: err.message, variant: 'error' });
    },
  });

  return (
    <div className="space-y-6">
      <GlassCard variant="strong" className="p-6">
        <p className="text-xs font-bold uppercase tracking-widest text-[#C9182B]">
          Super Administrator Configuration
        </p>
        <h1 className="font-display text-2xl font-extrabold text-[#29262B]">
          System Settings
        </h1>
        {!isSuperAdmin && (
          <p className="mt-1 text-xs font-semibold text-[#B51224]">
            Read-only preview: Only Super Administrators can modify system_settings via RLS.
          </p>
        )}
      </GlassCard>

      <div className="space-y-4">
        {(settings ?? []).map((s) => {
          const textVal = drafts[s.key] ?? JSON.stringify(s.value, null, 2);
          return (
            <GlassCard key={s.key} variant="strong" className="p-5 space-y-3">
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="h-4 w-4 text-[#C9182B]" />
                <h2 className="font-display text-base font-bold text-[#29262B]">{s.key}</h2>
              </div>
              {s.description && <p className="text-xs text-[#777078]">{s.description}</p>}
              <textarea
                rows={4}
                disabled={!isSuperAdmin}
                value={textVal}
                onChange={(e) => setDrafts((prev) => ({ ...prev, [s.key]: e.target.value }))}
                className="glass-input w-full rounded-2xl p-3 font-mono text-xs"
              />
              {isSuperAdmin && (
                <GlassButton
                  type="button"
                  variant="primary"
                  size="sm"
                  disabled={saveMutation.isPending}
                  onClick={() => saveMutation.mutate({ key: s.key, rawJson: textVal })}
                >
                  <Save className="h-3.5 w-3.5" />
                  Save Setting
                </GlassButton>
              )}
            </GlassCard>
          );
        })}
      </div>
    </div>
  );
}
