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
          <p className="text-xs font-bold uppercase tracking-widest text-[#176B4B]">Moderation</p>
          <h1 className="font-display text-2xl font-extrabold text-[#183329]">
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
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] text-left text-xs">
              <thead className="border-b border-[#176B4B]/15 bg-[#DFF7E8]/70 font-bold uppercase tracking-wider text-[#183329]">
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
              <tbody className="divide-y divide-[#176B4B]/10">
                {reports.map((rep) => (
                  <tr key={rep.id} className="hover:bg-white/60">
                    <td className="px-4 py-3 font-bold">
                      {rep.origin?.name} → {rep.destination?.name}
                    </td>
                    <td className="px-4 py-3">
                      {rep.transport_type?.name} •{' '}
                      {PASSENGER_CATEGORY_LABELS[rep.passenger_category]}
                    </td>
                    <td className="px-4 py-3 font-bold text-[#176B4B]">
                      {formatPhp(rep.fare_paid)}
                    </td>
                    <td className="px-4 py-3">
                      {rep.reporter?.full_name || rep.reporter?.email}
                    </td>
                    <td className="px-4 py-3">{formatDateSafe(rep.travel_date)}</td>
                    <td className="px-4 py-3">
                      <ReportStatusBadge status={rep.status} />
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        to="/admin/verification"
                        className="font-bold text-[#176B4B] hover:underline"
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
