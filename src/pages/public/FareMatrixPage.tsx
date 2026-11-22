import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Download, ExternalLink, Filter, Table2 } from 'lucide-react';
import {
  useFareRecords,
  useMunicipalities,
  useTransportTypes,
} from '@/hooks/useReferenceData';
import { buildFareMatrixRows, FARE_STATUS_META } from '@/lib/fareIntegrity';
import { formatDateSafe, formatPhp } from '@/lib/utils';
import type { FareStatus } from '@/types/database';
import {
  EmptyStateCard,
  FareStatusBadge,
  GlassButton,
  GlassCard,
  GlassSkeleton,
} from '@/components/glass/GlassPrimitives';

export function FareMatrixPage() {
  const { data: muniRes } = useMunicipalities();
  const { data: transportRes } = useTransportTypes();
  const { data: records, isLoading } = useFareRecords();

  const municipalities = muniRes?.data ?? [];
  const transportTypes = transportRes?.data ?? [];

  const [municipalityFilter, setMunicipalityFilter] = useState('all');
  const [originFilter, setOriginFilter] = useState('all');
  const [destinationFilter, setDestinationFilter] = useState('all');
  const [transportFilter, setTransportFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState<'all' | FareStatus>('all');
  const [updatedAfter, setUpdatedAfter] = useState('');
  const [searchText, setSearchText] = useState('');

  const allRows = useMemo(
    () =>
      buildFareMatrixRows(
        (records ?? []).filter((r) => !r.transport_type || r.transport_type.is_active !== false)
      ),
    [records]
  );

  const filteredRows = useMemo(() => {
    return allRows.filter((row) => {
      if (
        municipalityFilter !== 'all' &&
        row.originId !== municipalityFilter &&
        row.destinationId !== municipalityFilter
      ) {
        return false;
      }
      if (originFilter !== 'all' && row.originId !== originFilter) return false;
      if (destinationFilter !== 'all' && row.destinationId !== destinationFilter) return false;
      if (transportFilter !== 'all' && row.transportTypeId !== transportFilter) return false;
      if (statusFilter !== 'all' && row.status !== statusFilter) return false;
      if (updatedAfter && row.updatedAt.slice(0, 10) < updatedAfter) return false;
      if (searchText.trim()) {
        const q = searchText.trim().toLowerCase();
        const hay = `${row.originName} ${row.destinationName} ${row.transportTypeName} ${row.issuingAuthority ?? ''} ${row.officialDocumentReference ?? ''}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [
    allRows,
    municipalityFilter,
    originFilter,
    destinationFilter,
    transportFilter,
    statusFilter,
    updatedAfter,
    searchText,
  ]);

  const handleExportCsv = () => {
    const header = [
      'Origin',
      'Destination',
      'Transportation Type',
      'Regular Fare',
      'Student Fare',
      'Senior Citizen Fare',
      'PWD Fare',
      'Status',
      'Source',
      'Document Reference',
      'Last Verified Date',
    ];
    const lines = [header.join(',')];
    for (const r of filteredRows) {
      lines.push(
        [
          `"${r.originName}"`,
          `"${r.destinationName}"`,
          `"${r.transportTypeName}"`,
          r.regularFare ?? '',
          r.studentFare ?? '',
          r.seniorFare ?? '',
          r.pwdFare ?? '',
          `"${FARE_STATUS_META[r.status].label}"`,
          `"${r.issuingAuthority ?? ''}"`,
          `"${r.officialDocumentReference ?? ''}"`,
          `"${formatDateSafe(r.lastVerifiedAt)}"`,
        ].join(',')
      );
    }
    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `oriental-mindoro-fare-matrix-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <GlassCard variant="strong" className="p-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-[#DC2626]">
            Province-Wide Citizen Commuter Fare Table
          </p>
          <h1 className="font-display text-2xl font-extrabold text-[#24191D] sm:text-3xl">
            Oriental Mindoro Fare Matrix
          </h1>
          <p className="text-sm text-[#78716C]">
            Browse and compare commuter fare estimates and 20% student, senior citizen, and PWD
            discounted guides across Tricycle, Multicab, UV Express, and Bus corridors.
          </p>
        </div>

        <GlassButton
          type="button"
          variant="secondary"
          onClick={handleExportCsv}
          disabled={filteredRows.length === 0}
        >
          <Download className="h-4 w-4" />
          Export CSV
        </GlassButton>
      </GlassCard>

      {/* Filter Bar */}
      <GlassCard variant="surface" className="p-4 sm:p-5 space-y-3">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#DC2626]">
          <Filter className="h-3.5 w-3.5" />
          Filter Fare Matrix
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
          <input
            type="text"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            placeholder="Search route or doc ref..."
            className="glass-input rounded-2xl px-3.5 py-2 text-sm"
          />

          <select
            value={municipalityFilter}
            onChange={(e) => setMunicipalityFilter(e.target.value)}
            aria-label="Filter by any municipality"
            className="glass-input rounded-2xl px-3 py-2 text-sm"
          >
            <option value="all">Any Municipality</option>
            {municipalities.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>

          <select
            value={originFilter}
            onChange={(e) => setOriginFilter(e.target.value)}
            aria-label="Filter by origin"
            className="glass-input rounded-2xl px-3 py-2 text-sm"
          >
            <option value="all">All Origins</option>
            {municipalities.map((m) => (
              <option key={m.id} value={m.id}>
                From: {m.name}
              </option>
            ))}
          </select>

          <select
            value={destinationFilter}
            onChange={(e) => setDestinationFilter(e.target.value)}
            aria-label="Filter by destination"
            className="glass-input rounded-2xl px-3 py-2 text-sm"
          >
            <option value="all">All Destinations</option>
            {municipalities.map((m) => (
              <option key={m.id} value={m.id}>
                To: {m.name}
              </option>
            ))}
          </select>

          <select
            value={transportFilter}
            onChange={(e) => setTransportFilter(e.target.value)}
            aria-label="Filter by transport type"
            className="glass-input rounded-2xl px-3 py-2 text-sm"
          >
            <option value="all">All Modes</option>
            {transportTypes.map((tt) => (
              <option key={tt.id} value={tt.id}>
                {tt.name}
              </option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as 'all' | FareStatus)}
            aria-label="Filter by fare status"
            className="glass-input rounded-2xl px-3 py-2 text-sm"
          >
            <option value="all">All Statuses</option>
            <option value="verified_official">Verified Official Fare</option>
            <option value="community_estimate">Community Estimate</option>
            <option value="pending_verification">Pending Verification</option>
            <option value="rejected_or_disputed">Rejected or Disputed</option>
          </select>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2">
            <label className="font-semibold text-[#78716C]">Updated since:</label>
            <input
              type="date"
              value={updatedAfter}
              onChange={(e) => setUpdatedAfter(e.target.value)}
              className="glass-input rounded-xl px-2.5 py-1 text-xs"
            />
          </div>

          <button
            type="button"
            onClick={() => {
              setMunicipalityFilter('all');
              setOriginFilter('all');
              setDestinationFilter('all');
              setTransportFilter('all');
              setStatusFilter('all');
              setUpdatedAfter('');
              setSearchText('');
            }}
            className="font-bold text-[#DC2626] hover:underline"
          >
            Reset All Filters
          </button>
        </div>
      </GlassCard>

      {/* Matrix Table + Mobile Cards */}
      {isLoading ? (
        <GlassSkeleton className="h-64" />
      ) : filteredRows.length === 0 ? (
        <EmptyStateCard
          icon={Table2}
          title="No fare matrix records match your filters"
          description="Official and community fare entries appear here once published or reviewed in Supabase. We never preload fabricated fares."
          action={
            <Link to="/fare-search">
              <GlassButton variant="primary" size="sm">
                Open Route &amp; Fare Finder
              </GlassButton>
            </Link>
          }
        />
      ) : (
        <GlassCard variant="strong" className="overflow-hidden">
          {/* Mobile Card Layout (<= 767px) */}
          <div className="grid gap-3 p-3.5 md:hidden">
            {filteredRows.map((row) => (
              <div
                key={row.key}
                className="rounded-2xl border border-[#FCA5A5]/45 bg-white/90 p-4 space-y-2.5 shadow-sm"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-display text-sm font-extrabold text-[#24191D]">
                      {row.originName} → {row.destinationName}
                    </p>
                    <p className="text-xs font-semibold text-[#78716C]">{row.transportTypeName}</p>
                  </div>
                  <FareStatusBadge status={row.status} compact />
                </div>

                <div className="grid grid-cols-2 gap-2 rounded-xl bg-[#FFF1F2] p-2.5 text-xs">
                  <div>
                    <span className="text-[#78716C]">Regular:</span>{' '}
                    <strong className="text-[#DC2626]">{formatPhp(row.regularFare)}</strong>
                  </div>
                  <div>
                    <span className="text-[#78716C]">Student:</span>{' '}
                    <strong className="text-[#24191D]">{formatPhp(row.studentFare)}</strong>
                  </div>
                  <div>
                    <span className="text-[#78716C]">Senior:</span>{' '}
                    <strong className="text-[#24191D]">{formatPhp(row.seniorFare)}</strong>
                  </div>
                  <div>
                    <span className="text-[#78716C]">PWD:</span>{' '}
                    <strong className="text-[#24191D]">{formatPhp(row.pwdFare)}</strong>
                  </div>
                </div>

                <div className="flex items-center justify-between text-[11px] text-[#78716C]">
                  <span className="truncate">{row.issuingAuthority || 'Unverified'}</span>
                  <Link
                    to={`/fares/${row.primaryRecordId}`}
                    className="font-bold text-[#DC2626] hover:underline shrink-0"
                  >
                    Details ({formatDateSafe(row.lastVerifiedAt)}) →
                  </Link>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop/Tablet Table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full min-w-[980px] text-left text-sm">
              <thead className="border-b border-[#FCA5A5]/45 bg-[#FFE4E6]/85 text-[11px] font-bold uppercase tracking-wider text-[#24191D]">
                <tr>
                  <th className="px-4 py-3.5">Origin</th>
                  <th className="px-4 py-3.5">Destination</th>
                  <th className="px-4 py-3.5">Transport</th>
                  <th className="px-4 py-3.5">Regular</th>
                  <th className="px-4 py-3.5">Student</th>
                  <th className="px-4 py-3.5">Senior</th>
                  <th className="px-4 py-3.5">PWD</th>
                  <th className="px-4 py-3.5">Fare Status</th>
                  <th className="px-4 py-3.5">Source</th>
                  <th className="px-4 py-3.5">Last Verified</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#FCA5A5]/25">
                {filteredRows.map((row) => (
                  <tr key={row.key} className="hover:bg-[#FFF1F2]/75 transition">
                    <td className="px-4 py-3 font-bold text-[#24191D]">{row.originName}</td>
                    <td className="px-4 py-3 font-bold text-[#24191D]">{row.destinationName}</td>
                    <td className="px-4 py-3 font-medium text-[#78716C]">{row.transportTypeName}</td>
                    <td className="px-4 py-3 font-bold text-[#DC2626]">
                      {formatPhp(row.regularFare)}
                    </td>
                    <td className="px-4 py-3 text-[#24191D]">{formatPhp(row.studentFare)}</td>
                    <td className="px-4 py-3 text-[#24191D]">{formatPhp(row.seniorFare)}</td>
                    <td className="px-4 py-3 text-[#24191D]">{formatPhp(row.pwdFare)}</td>
                    <td className="px-4 py-3">
                      <FareStatusBadge status={row.status} compact />
                    </td>
                    <td className="px-4 py-3 text-xs">
                      <p className="font-semibold text-[#24191D]">
                        {row.issuingAuthority || 'Unverified'}
                      </p>
                      {row.officialDocumentReference && (
                        <p className="text-[#78716C]">{row.officialDocumentReference}</p>
                      )}
                      {row.sourceUrl && (
                        <a
                          href={row.sourceUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-[#DC2626] hover:underline"
                        >
                          Source <ExternalLink className="h-3 w-3" />
                        </a>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-[#78716C]">
                      <Link
                        to={`/fares/${row.primaryRecordId}`}
                        className="font-semibold text-[#DC2626] hover:underline"
                      >
                        {formatDateSafe(row.lastVerifiedAt)}
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
