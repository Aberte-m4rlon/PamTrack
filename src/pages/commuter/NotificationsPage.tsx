import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Bell, CheckCheck } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { useNotifications } from '@/hooks/useReferenceData';
import { formatDateTimeSafe } from '@/lib/utils';
import { markAllNotificationsRead, markNotificationRead } from '@/services/pamasaheApi';
import {
  EmptyStateCard,
  GlassButton,
  GlassCard,
  GlassSkeleton,
} from '@/components/glass/GlassPrimitives';

export function NotificationsPage() {
  const { user } = useAuth();
  const { pushToast } = useToast();
  const queryClient = useQueryClient();
  const { data: notifications, isLoading } = useNotifications();
  const [filterUnread, setFilterUnread] = useState(false);

  const markOneMutation = useMutation({
    mutationFn: (id: string) => markNotificationRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications', user?.id] });
    },
    onError: (err: Error) => {
      pushToast({ title: 'Could not update notification', description: err.message, variant: 'error' });
    },
  });

  const markAllMutation = useMutation({
    mutationFn: () => markAllNotificationsRead(user!.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications', user?.id] });
      pushToast({ title: 'All notifications marked as read', variant: 'success' });
    },
    onError: (err: Error) => {
      pushToast({ title: 'Update failed', description: err.message, variant: 'error' });
    },
  });

  const list = (notifications ?? []).filter((n) => (filterUnread ? !n.is_read : true));

  return (
    <div className="space-y-6">
      <GlassCard variant="strong" className="p-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-[#DC2626]">
            Realtime Updates
          </p>
          <h1 className="font-display text-2xl font-extrabold text-[#24191D]">Notifications</h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <GlassButton
            type="button"
            variant={filterUnread ? 'primary' : 'glass'}
            size="sm"
            onClick={() => setFilterUnread((v) => !v)}
          >
            {filterUnread ? 'Showing Unread Only' : 'Show Unread Only'}
          </GlassButton>
          <GlassButton
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => markAllMutation.mutate()}
            disabled={markAllMutation.isPending || !notifications?.some((n) => !n.is_read)}
          >
            <CheckCheck className="h-4 w-4" />
            Mark All Read
          </GlassButton>
        </div>
      </GlassCard>

      {isLoading ? (
        <GlassSkeleton className="h-48" />
      ) : list.length === 0 ? (
        <EmptyStateCard
          icon={Bell}
          title="No notifications to display"
          description="You will receive real-time alerts here when your fare reports are reviewed or official fares update on your favorite routes."
        />
      ) : (
        <div className="space-y-3">
          {list.map((n) => (
            <GlassCard
              key={n.id}
              variant="strong"
              className={`p-4 flex flex-wrap items-center justify-between gap-3 ${
                !n.is_read ? 'border-[#FCA5A5] bg-[#FFF1F2]/90' : ''
              }`}
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  {!n.is_read && <span className="h-2.5 w-2.5 rounded-full bg-[#DC2626]" />}
                  <h2 className="font-bold text-sm text-[#24191D]">{n.title}</h2>
                  <span className="text-[11px] font-semibold uppercase text-[#B91C1C]">
                    {n.type.replace(/_/g, ' ')}
                  </span>
                </div>
                <p className="text-xs text-[#78716C]">{n.message}</p>
                <p className="text-[11px] text-[#A8A29E]">
                  {formatDateTimeSafe(n.created_at)}
                </p>
              </div>
              {!n.is_read && (
                <GlassButton
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => markOneMutation.mutate(n.id)}
                >
                  Mark Read
                </GlassButton>
              )}
            </GlassCard>
          ))}
        </div>
      )}
    </div>
  );
}
