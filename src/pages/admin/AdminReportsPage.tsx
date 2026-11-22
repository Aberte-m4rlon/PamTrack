import { Link } from 'react-router-dom';
import { FileCheck2, MessageSquarePlus } from 'lucide-react';
import { useAdminFareReports } from '@/hooks/useReferenceData';
import { PASSENGER_CATEGORY_LABELS } from '@/lib/fareIntegrity';
import { formatDateSafe, formatPhp } from '@/lib/utils';
import {
  EmptyStateCard,
  GlassButton,
  GlassCard,
  GlassSkeleton,
  ReportStatusBadge,
} from '@/components/glass/GlassPrimitives';

export function AdminReportsPage() {
  const { data: reports, isLoading } = useAdminFareReports();

  return (
    <div className="space-y-6">
      <GlassCard variant="strong" className="p-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-[#DC2626]">Moderation</p>
          <h1 className="font-display text-2xl font-extrabold text-[#24191D]">
            Community Fare Reports
          </h1>
        </div>
        <Link to="/admin/verification">
          <GlassButton variant="primary" size="sm">
            <FileCheck2 className="h-4 w-4" />
            Open Verification Workbench
          </GlassButton>
        </Link>
      </GlassCard>

      {isLoading ? (
        <GlassSkeleton className="h-64" />
      ) : !reports || reports.length === 0 ? (
        <EmptyStateCard
          icon={MessageSquarePlus}
          title="No community fare reports submitted yet"
          description="Submitted commuter reports across Oriental Mindoro will populate this moderation log."
        />
      ) : (
        <GlassCard variant="strong" className="overflow-hidden">
          {/* Mobile Card Layout (< 768px) */}
          <div className="grid gap-3 p-3.5 md:hidden">
            {reports.map((rep) => (
              <div key={rep.id} className="glass-pill-tile rounded-[22px] p-4 space-y-2.5 text-xs">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-display text-sm font-extrabold text-[#24191D]">
                      {rep.origin?.name} → {rep.destination?.name}
                    </p>
                    <p className="text-[#78716C]">
                      {rep.transport_type?.name} •{' '}
                      {PASSENGER_CATEGORY_LABELS[rep.passenger_category]}
                    </p>
                  </div>
                  <ReportStatusBadge status={rep.status} />
                </div>
                <div className="flex items-center justify-between border-y border-white/75 py-2">
                  <span className="font-display text-lg font-extrabold text-[#DC2626] tabular-nums">
                    {formatPhp(rep.fare_paid)}
                  </span>
                  <span className="text-[#78716C]">{formatDateSafe(rep.travel_date)}</span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate text-[#78716C]">
                    {rep.reporter?.full_name || rep.reporter?.email}
                  </span>
                  <Link
                    to="/admin/verification"
                    className="liquid-btn-secondary inline-flex shrink-0 items-center rounded-full px-3 py-1 font-bold"
                  >
                    Review →
                  </Link>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop/Tablet Table (>= 768px) */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full min-w-[820px] text-left text-xs">
              <thead className="glass-table-head font-bold uppercase tracking-wider text-[#24191D]">
                <tr>
                  <th className="px-4 py-3">Corridor</th>
                  <th className="px-4 py-3">Mode &amp; Category</th>
                  <th className="px-4 py-3">Fare Paid</th>
                  <th className="px-4 py-3">Reporter</th>
                  <th className="px-4 py-3">Travel Date</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/60">
                {reports.map((rep) => (
                  <tr key={rep.id} className="hover:bg-white/55 transition">
                    <td className="px-4 py-3 font-bold text-[#24191D]">
                      {rep.origin?.name} → {rep.destination?.name}
                    </td>
                    <td className="px-4 py-3 text-[#78716C]">
                      {rep.transport_type?.name} •{' '}
                      {PASSENGER_CATEGORY_LABELS[rep.passenger_category]}
                    </td>
                    <td className="px-4 py-3 font-bold text-[#DC2626]">
                      {formatPhp(rep.fare_paid)}
                    </td>
                    <td className="px-4 py-3 text-[#24191D]">
                      {rep.reporter?.full_name || rep.reporter?.email}
                    </td>
                    <td className="px-4 py-3 text-[#78716C]">{formatDateSafe(rep.travel_date)}</td>
                    <td className="px-4 py-3">
                      <ReportStatusBadge status={rep.status} />
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        to="/admin/verification"
                        className="font-bold text-[#DC2626] hover:underline"
                      >
                        Review →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </GlassCard>
      )}
    </div>
  );
}
