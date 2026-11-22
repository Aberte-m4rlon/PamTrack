import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Download, Eye, PlusCircle, Search, ShieldAlert } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import {
  useGovernmentAgencies,
  useMyVehicleReports,
} from '@/hooks/useReferenceData';
import {
  ALL_COMPLAINT_STATUSES,
  COMPLAINT_STATUS_META,
  downloadComplaintSummary,
  recommendAgenciesForReport,
  VIOLATION_CATEGORIES,
} from '@/lib/vehicleReporting';
import { formatDateSafe } from '@/lib/utils';
import { updateMyVehicleReport } from '@/services/pamasaheApi';
import {
  ConfirmDialog,
  EmptyStateCard,
  GlassButton,
  GlassCard,
  GlassSkeleton,
} from '@/components/glass/GlassPrimitives';

export function MyVehicleReportsPage() {
  const { user } = useAuth();
  const { pushToast } = useToast();
  const queryClient = useQueryClient();
  const { data: reports, isLoading } = useMyVehicleReports();
  const { data: agencies } = useGovernmentAgencies();

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [withdrawTargetId, setWithdrawTargetId] = useState<string | null>(null);

  const withdrawMut = useMutation({
    mutationFn: (id: string) =>
      updateMyVehicleReport(id, { complaintStatus: 'Withdrawn' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['myVehicleReports', user?.id] });
      setWithdrawTargetId(null);
      pushToast({ title: 'Complaint withdrawn cleanly', variant: 'info' });
    },
    onError: (err: Error) => {
      pushToast({ title: 'Withdrawal failed', description: err.message, variant: 'error' });
    },
  });

  const allCategoryNames = useMemo(
    () => VIOLATION_CATEGORIES.flatMap((g) => g.items),
    []
  );

  const filtered = useMemo(() => {
    return (reports ?? []).filter((r) => {
      if (statusFilter !== 'all' && r.complaint_status !== statusFilter) return false;
      if (
        categoryFilter !== 'all' &&
        !(r.categories ?? []).some((c) => c.category === categoryFilter)
      ) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase();
        const hay = `${r.reference_number} ${r.plate_number ?? ''} ${r.vehicle_type} ${r.municipality?.name ?? ''}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [reports, statusFilter, categoryFilter, searchQuery]);

  return (
    <div className="space-y-6">
      <GlassCard variant="strong" className="p-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-[#DC2626]">
            Private Complaint Tracker
          </p>
          <h1 className="font-display text-2xl font-extrabold text-[#24191D]">
            My Vehicle &amp; Violation Reports
          </h1>
          <p className="text-xs sm:text-sm text-[#78716C]">
            Track your reference numbers, view administrator remarks, add requested evidence, or
            download your complaint summary packet.
          </p>
        </div>
        <Link to="/report-vehicle">
          <GlassButton variant="primary" size="sm">
            <PlusCircle className="h-4 w-4" />
            New Vehicle Report
          </GlassButton>
        </Link>
      </GlassCard>

      {/* Filters */}
      <GlassCard variant="surface" className="p-4 grid gap-3 sm:grid-cols-3">
        <div className="relative">
          <Search className="absolute left-3 top-3 h-4 w-4 text-[#A8A29E]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search PT-OM-... or plate..."
            className="glass-input w-full rounded-2xl pl-9 pr-3 py-2 text-sm"
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="glass-input rounded-2xl px-3 py-2 text-sm"
        >
          <option value="all">All Statuses</option>
          {ALL_COMPLAINT_STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>

        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="glass-input rounded-2xl px-3 py-2 text-sm"
        >
          <option value="all">All Violation Categories</option>
          {allCategoryNames.map((cat) => (
            <option key={cat} value={cat}>
              {cat}
            </option>
          ))}
        </select>
      </GlassCard>

      {isLoading ? (
        <GlassSkeleton className="h-48" />
      ) : filtered.length === 0 ? (
        <EmptyStateCard
          icon={ShieldAlert}
          title="No matching vehicle reports found"
          description="Submitted vehicle, driver, and transport violation complaints appear privately here."
          action={
            <Link to="/report-vehicle">
              <GlassButton variant="primary">Report a Vehicle</GlassButton>
            </Link>
          }
        />
      ) : (
        <div className="space-y-3">
          {filtered.map((rep) => {
            const meta = COMPLAINT_STATUS_META[rep.complaint_status];
            const eligibleWithdraw = [
              'Draft',
              'Submitted to Pamasahe Tracker',
              'Pending Initial Review',
              'Additional Information Required',
            ].includes(rep.complaint_status);

            const recs = recommendAgenciesForReport({
              vehicleType: rep.vehicle_type,
              selectedCategories: (rep.categories ?? []).map((c) => c.category),
              agencies: agencies ?? [],
            });

            return (
              <GlassCard key={rep.id} variant="strong" className="p-5 space-y-3">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-mono text-xs font-extrabold text-[#DC2626]">
                      {rep.reference_number}
                    </p>
                    <h2 className="font-display text-lg font-extrabold text-[#24191D]">
                      {rep.vehicle_type} •{' '}
                      {rep.plate_not_available
                        ? 'Plate Not Available'
                        : rep.plate_number || 'Unlisted'}
                    </h2>
                    <p className="text-xs text-[#78716C]">
                      {rep.municipality?.name} • Incident Date: {formatDateSafe(rep.incident_date)}
                    </p>
                  </div>
                  <div className="text-right space-y-1">
                    <span
                      className={`inline-block rounded-full px-3 py-1 text-[11px] font-bold ${meta.badgeClass}`}
                    >
                      {rep.complaint_status}
                    </span>
                    <p className="text-[10px] font-semibold text-[#A8A29E]">
                      {meta.isExternalAgencyStage
                        ? 'External Agency Stage'
                        : 'Internal Pamasahe Tracker Status'}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {(rep.categories ?? []).map((c) => (
                    <span
                      key={c.id}
                      className="rounded-full bg-[#FFE4E6] px-2.5 py-0.5 text-[11px] font-semibold text-[#B91C1C]"
                    >
                      Alleged: {c.category}
                    </span>
                  ))}
                </div>

                {rep.admin_remarks && (
                  <div className="glass-pill-tile rounded-[20px] p-3 text-xs text-[#24191D]">
                    <strong>Administrator Remarks:</strong> {rep.admin_remarks}
                  </div>
                )}

                <div className="flex flex-wrap gap-2 pt-1">
                  <Link to={`/dashboard/vehicle-reports/${rep.id}`}>
                    <GlassButton variant="primary" size="sm">
                      <Eye className="h-3.5 w-3.5" />
                      Complaint Details
                    </GlassButton>
                  </Link>
                  <GlassButton
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => downloadComplaintSummary(rep, recs)}
                  >
                    <Download className="h-3.5 w-3.5" />
                    Download Packet
                  </GlassButton>
                  {eligibleWithdraw && (
                    <GlassButton
                      type="button"
                      variant="danger"
                      size="sm"
                      onClick={() => setWithdrawTargetId(rep.id)}
                    >
                      Withdraw
                    </GlassButton>
                  )}
                </div>
              </GlassCard>
            );
          })}
        </div>
      )}

      <ConfirmDialog
        open={Boolean(withdrawTargetId)}
        onOpenChange={(open) => !open && setWithdrawTargetId(null)}
        title="Withdraw Vehicle Complaint?"
        description="Withdrawing marks this report as Withdrawn and halts further internal review."
        confirmLabel="Withdraw Complaint"
        destructive
        loading={withdrawMut.isPending}
        onConfirm={() => {
          if (withdrawTargetId) withdrawMut.mutate(withdrawTargetId);
        }}
      />
    </div>
  );
}
