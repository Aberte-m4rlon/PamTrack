import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Bell, Send } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { broadcastAnnouncementNotification, fetchUsersWithRoles } from '@/services/pamasaheApi';
import { GlassButton, GlassCard } from '@/components/glass/GlassPrimitives';

export function AdminNotificationsPage() {
  const { isConfigured } = useAuth();
  const { pushToast } = useToast();
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');

  const { data: users } = useQuery({
    queryKey: ['adminUsers'],
    queryFn: fetchUsersWithRoles,
    enabled: isConfigured,
  });

  const broadcastMutation = useMutation({
    mutationFn: () => {
      const targetUserIds = (users ?? []).map((u) => u.id);
      if (targetUserIds.length === 0) throw new Error('No recipient users found.');
      return broadcastAnnouncementNotification({
        title: title.trim(),
        message: message.trim(),
        targetUserIds,
      });
    },
    onSuccess: (count) => {
      setTitle('');
      setMessage('');
      pushToast({
        title: `Announcement sent to ${count} user(s)`,
        variant: 'success',
      });
    },
    onError: (err: Error) => {
      pushToast({ title: 'Broadcast failed', description: err.message, variant: 'error' });
    },
  });

  return (
    <div className="space-y-6">
      <GlassCard variant="strong" className="p-6">
        <p className="text-xs font-bold uppercase tracking-widest text-[#DC2626]">Communications</p>
        <h1 className="font-display text-2xl font-extrabold text-[#24191D]">
          Broadcast Official Fare Announcements
        </h1>
      </GlassCard>

      <GlassCard variant="strong" className="max-w-2xl p-6 space-y-4">
        <div className="flex items-center gap-2 text-[#DC2626]">
          <Bell className="h-5 w-5" />
          <h2 className="font-display text-lg font-bold text-[#24191D]">
            Province-Wide Commuter Alert
          </h2>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            broadcastMutation.mutate();
          }}
          className="space-y-3"
        >
          <input
            type="text"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Announcement Headline (e.g., LTFRB MIMAROPA Fare Matrix Reminder)"
            className="glass-input w-full rounded-2xl px-3.5 py-2.5 text-sm"
          />
          <textarea
            rows={4}
            required
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Clear factual announcement details and official source reference..."
            className="glass-input w-full rounded-2xl px-3.5 py-2.5 text-sm"
          />
          <GlassButton
            type="submit"
            variant="primary"
            disabled={broadcastMutation.isPending || !isConfigured}
          >
            <Send className="h-4 w-4" />
            {broadcastMutation.isPending
              ? 'Sending...'
              : `Send to ${users?.length ?? 0} Registered Users`}
          </GlassButton>
        </form>
      </GlassCard>
    </div>
  );
}
