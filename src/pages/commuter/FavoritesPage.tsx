import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Heart, Search, Trash2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { useMyFavorites } from '@/hooks/useReferenceData';
import { removeFavoriteRoute } from '@/services/pamasaheApi';
import {
  ConfirmDialog,
  EmptyStateCard,
  GlassButton,
  GlassCard,
  GlassSkeleton,
} from '@/components/glass/GlassPrimitives';

export function FavoritesPage() {
  const { user } = useAuth();
  const { pushToast } = useToast();
  const queryClient = useQueryClient();
  const { data: favorites, isLoading } = useMyFavorites();
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  const deleteMutation = useMutation({
    mutationFn: (id: string) => removeFavoriteRoute(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['favorites', user?.id] });
      setDeleteTarget(null);
      pushToast({ title: 'Favorite route removed', variant: 'info' });
    },
    onError: (err: Error) => {
      pushToast({ title: 'Removal failed', description: err.message, variant: 'error' });
    },
  });

  return (
    <div className="space-y-6">
      <GlassCard variant="strong" className="p-6">
        <p className="text-xs font-bold uppercase tracking-widest text-[#C9182B]">Commuter Portal</p>
        <h1 className="font-display text-2xl font-extrabold text-[#29262B]">Favorite Routes</h1>
        <p className="text-sm text-[#777078]">
          Saved corridors automatically trigger deduplicated notifications when administrators
          publish official fare updates.
        </p>
      </GlassCard>

      {isLoading ? (
        <GlassSkeleton className="h-44" />
      ) : !favorites || favorites.length === 0 ? (
        <EmptyStateCard
          icon={Heart}
          title="No favorite routes saved"
          description="Search any Oriental Mindoro route in Fare Finder and click Save Favorite."
          action={
            <Link to="/dashboard/route-finder">
              <GlassButton variant="primary">Open Route Finder</GlassButton>
            </Link>
          }
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {favorites.map((fav) => (
            <GlassCard key={fav.id} variant="strong" hoverable className="p-5 space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="font-display text-lg font-bold text-[#29262B]">
                    {fav.origin?.name} → {fav.destination?.name}
                  </h2>
                  <p className="text-xs text-[#B51224] font-semibold">
                    {fav.transport_type?.name || 'All Transportation Modes'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setDeleteTarget(fav.id)}
                  className="rounded-xl p-1.5 text-[#C9182B] hover:bg-[#F8E7EA]"
                  aria-label="Remove favorite"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
              <Link
                to={`/fare-search?origin=${fav.origin_municipality_id}&destination=${fav.destination_municipality_id}`}
                className="block"
              >
                <GlassButton variant="primary" size="sm" className="w-full">
                  <Search className="h-3.5 w-3.5" />
                  Check Latest Fares
                </GlassButton>
              </Link>
            </GlassCard>
          ))}
        </div>
      )}

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Remove Favorite Route?"
        description="You will no longer receive automatic official fare update alerts for this corridor."
        confirmLabel="Remove"
        destructive
        loading={deleteMutation.isPending}
        onConfirm={() => {
          if (deleteTarget) deleteMutation.mutate(deleteTarget);
        }}
      />
    </div>
  );
}
