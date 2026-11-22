import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Compass, PlusCircle, Route as RouteIcon } from 'lucide-react';
import { z } from 'zod';
import { useToast } from '@/contexts/ToastContext';
import {
  useMunicipalities,
  useOperators,
  useRoutes,
  useTransportTypes,
} from '@/hooks/useReferenceData';
import { fetchOsrmDrivingRoute } from '@/lib/osrm';
import { routeFormSchema } from '@/lib/validation';
import { upsertRoute } from '@/services/pamasaheApi';
import { GlassButton, GlassCard } from '@/components/glass/GlassPrimitives';

type RouteFormValues = z.infer<typeof routeFormSchema>;

export function RouteManagementPage() {
  const { pushToast } = useToast();
  const queryClient = useQueryClient();

  const { data: muniRes } = useMunicipalities();
  const { data: transportRes } = useTransportTypes();
  const { data: operators } = useOperators();
  const { data: routes } = useRoutes(true);

  const municipalities = muniRes?.data ?? [];
  const transportTypes = transportRes?.data ?? [];

  const {
    register,
    watch,
    setValue,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<RouteFormValues>({
    resolver: zodResolver(routeFormSchema),
  });

  const selectedOriginId = watch('originMunicipalityId');
  const selectedDestId = watch('destinationMunicipalityId');

  const handleFetchOsrm = async () => {
    const o = municipalities.find((m) => m.id === selectedOriginId);
    const d = municipalities.find((m) => m.id === selectedDestId);
    if (!o || !d || o.id === d.id) {
      pushToast({ title: 'Select distinct origin and destination first.', variant: 'error' });
      return;
    }
    const res = await fetchOsrmDrivingRoute(o.latitude, o.longitude, d.latitude, d.longitude);
    if (!res.available || !res.distanceKm) {
      pushToast({
        title: 'OSRM routing unavailable',
        description: res.error,
        variant: 'error',
      });
      return;
    }
    setValue('distanceKm', res.distanceKm);
    if (res.durationMin) setValue('estimatedDurationMin', res.durationMin);
    pushToast({
      title: 'OSRM route computed',
      description: `${res.distanceKm} km • approx. ${res.durationMin} mins`,
      variant: 'success',
    });
  };

  const saveMutation = useMutation({
    mutationFn: (vals: RouteFormValues) =>
      upsertRoute({
        route_code: vals.routeCode,
        route_name: vals.routeName,
        origin_municipality_id: vals.originMunicipalityId,
        destination_municipality_id: vals.destinationMunicipalityId,
        transport_type_id: vals.transportTypeId,
        operator_id: vals.operatorId || null,
        distance_km: vals.distanceKm ? Number(vals.distanceKm) : null,
        distance_source: vals.distanceKm ? 'osrm' : null,
        estimated_duration_min: vals.estimatedDurationMin
          ? Number(vals.estimatedDurationMin)
          : null,
        operating_notes: vals.operatingNotes || null,
        is_verified: true,
        is_active: true,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['routes'] });
      reset();
      pushToast({ title: 'Route saved cleanly', variant: 'success' });
    },
    onError: (err: Error) => {
      pushToast({ title: 'Failed to save route', description: err.message, variant: 'error' });
    },
  });

  return (
    <div className="space-y-6">
      <GlassCard variant="strong" className="p-6">
        <p className="text-xs font-bold uppercase tracking-widest text-[#C9182B]">
          Corridor Administration
        </p>
        <h1 className="font-display text-2xl font-extrabold text-[#29262B]">
          Route Management
        </h1>
      </GlassCard>

      <div className="grid gap-6 lg:grid-cols-12">
        <GlassCard variant="strong" className="p-6 lg:col-span-5 space-y-4 h-fit">
          <h2 className="flex items-center gap-2 font-display text-lg font-bold text-[#29262B]">
            <PlusCircle className="h-5 w-5 text-[#C9182B]" />
            Register Verified Corridor
          </h2>

          <form onSubmit={handleSubmit((vals) => saveMutation.mutate(vals))} className="space-y-3">
            <input
              type="text"
              {...register('routeCode')}
              placeholder="Route Code (e.g., ORM-CAL-PIN-PUJ)"
              className="glass-input w-full rounded-2xl px-3.5 py-2 text-sm"
            />
            {errors.routeCode && (
              <p className="text-xs text-red-600">{errors.routeCode.message}</p>
            )}

            <input
              type="text"
              {...register('routeName')}
              placeholder="Route Name (e.g., Calapan City – Pinamalayan)"
              className="glass-input w-full rounded-2xl px-3.5 py-2 text-sm"
            />

            <div className="grid gap-3 sm:grid-cols-2">
              <select
                {...register('originMunicipalityId')}
                className="glass-input rounded-2xl px-3 py-2 text-sm"
              >
                <option value="">Origin LGU...</option>
                {municipalities.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
              <select
                {...register('destinationMunicipalityId')}
                className="glass-input rounded-2xl px-3 py-2 text-sm"
              >
                <option value="">Destination LGU...</option>
                {municipalities.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <select
                {...register('transportTypeId')}
                className="glass-input rounded-2xl px-3 py-2 text-sm"
              >
                <option value="">Transport Mode...</option>
                {transportTypes.map((tt) => (
                  <option key={tt.id} value={tt.id}>
                    {tt.name}
                  </option>
                ))}
              </select>
              <select
                {...register('operatorId')}
                className="glass-input rounded-2xl px-3 py-2 text-sm"
              >
                <option value="">Optional Operator...</option>
                {(operators ?? []).map((op) => (
                  <option key={op.id} value={op.id}>
                    {op.operator_name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex gap-2 items-center">
              <input
                type="number"
                step="0.01"
                {...register('distanceKm')}
                placeholder="Distance (km)"
                className="glass-input flex-1 rounded-2xl px-3 py-2 text-sm"
              />
              <GlassButton type="button" variant="glass" size="sm" onClick={handleFetchOsrm}>
                <Compass className="h-3.5 w-3.5" />
                Query OSRM
              </GlassButton>
            </div>

            <input
              type="number"
              {...register('estimatedDurationMin')}
              placeholder="Estimated Duration (mins)"
              className="glass-input w-full rounded-2xl px-3 py-2 text-sm"
            />

            <textarea
              rows={2}
              {...register('operatingNotes')}
              placeholder="Terminal locations or franchise coverage notes..."
              className="glass-input w-full rounded-2xl px-3 py-2 text-xs"
            />

            <GlassButton
              type="submit"
              variant="primary"
              className="w-full"
              disabled={saveMutation.isPending}
            >
              Save Route Record
            </GlassButton>
          </form>
        </GlassCard>

        <GlassCard variant="strong" className="p-6 lg:col-span-7 space-y-3">
          <h2 className="flex items-center gap-2 font-display text-lg font-bold text-[#29262B]">
            <RouteIcon className="h-5 w-5 text-[#C9182B]" />
            Registered Routes ({routes?.length ?? 0})
          </h2>
          <div className="space-y-2.5 max-h-[540px] overflow-y-auto pr-1">
            {(routes ?? []).map((r) => (
              <div
                key={r.id}
                className="glass-pill-tile flex flex-wrap items-center justify-between gap-2 rounded-[20px] p-3.5 text-xs"
              >
                <div>
                  <p className="font-bold text-sm text-[#29262B]">{r.route_name}</p>
                  <p className="text-[#777078]">
                    {r.route_code} • {r.origin?.name} → {r.destination?.name} (
                    {r.transport_type?.name})
                  </p>
                </div>
                <span className="font-bold text-[#C9182B]">
                  {r.distance_km ? `${r.distance_km} km` : 'Distance unmeasured'}
                </span>
              </div>
            ))}
          </div>
        </GlassCard>
      </div>
    </div>
  );
}
