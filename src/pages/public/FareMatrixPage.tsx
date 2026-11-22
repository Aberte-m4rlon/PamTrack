import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Download, ExternalLink, Filter, Table2 } from 'lucide-react';
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
  const [currentPage, setCurrentPage] = useState(1);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const MATRIX_PAGE_SIZE = 25;

  const activeFilterCount =
    (municipalityFilter !== 'all' ? 1 : 0) +
    (originFilter !== 'all' ? 1 : 0) +
    (destinationFilter !== 'all' ? 1 : 0) +
    (transportFilter !== 'all' ? 1 : 0) +
    (statusFilter !== 'all' ? 1 : 0) +
    (updatedAfter ? 1 : 0);

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

  useEffect(() => {
    setCurrentPage(1);
  }, [
    municipalityFilter,
    originFilter,
    destinationFilter,
    transportFilter,
    statusFilter,
    updatedAfter,
    searchText,
  ]);

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / MATRIX_PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);
  const startIdx = (safePage - 1) * MATRIX_PAGE_SIZE;
  const paginatedRows = useMemo(
    () => filteredRows.slice(startIdx, startIdx + MATRIX_PAGE_SIZE),
    [filteredRows, startIdx]
  );

  const handleExportCsv = () => {
    const header = [
      'Pinanggalingan',
      'Pupuntahan',
      'Sasakyan',
      'Regular',
      'Estudyante',
      'Senior Citizen',
      'PWD',
      'Katayuan',
      'Pinagmulan',
      'Document Reference',
      'Huling Na-check',
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
    <div className="space-y-4 sm:space-y-6">
      <GlassCard variant="strong" className="p-4 sm:p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
        <div className="min-w-0 space-y-1">
          <p className="text-[11px] sm:text-xs font-bold uppercase tracking-widest text-[#C9182B]">
            Talaan ng Pamasahe sa Buong Probinsya
          </p>
          <h1 className="font-display text-xl leading-tight font-extrabold text-[#29262B] sm:text-3xl">
            Fare Matrix ng Oriental Mindoro
          </h1>
          <p className="text-xs sm:text-sm text-[#343039]">
            Gabay sa mga pamasahe at 20% discount sa bawat bayan.
          </p>
        </div>

        <GlassButton
          type="button"
          variant="secondary"
          size="sm"
          className="w-full sm:w-auto sm:min-h-[42px] sm:px-5 sm:text-sm shrink-0"
          onClick={handleExportCsv}
          disabled={filteredRows.length === 0}
        >
          <Download className="h-4 w-4 text-[#C9182B]" />
          I-export sa CSV
        </GlassButton>
      </GlassCard>

      {/* Filter Bar (Compact Single-Row Search + Collapsible Mobile Filters) */}
      <GlassCard variant="surface" className="p-3.5 sm:p-5 space-y-3">
        <div className="hidden md:flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#C9182B]">
          <Filter className="h-3.5 w-3.5 shrink-0" />
          <span>I-filter ang Fare Matrix</span>
        </div>

        <div className="flex items-center gap-2 md:hidden">
          <input
            type="text"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            placeholder="Maghanap ng ruta o bayan..."
            className="glass-input min-h-[42px] flex-1 min-w-0 rounded-2xl px-3.5 py-2 text-sm"
          />
          <button
            type="button"
            onClick={() => setFiltersOpen((v) => !v)}
            className="liquid-btn-glass inline-flex min-h-[42px] shrink-0 items-center gap-1.5 rounded-2xl px-3 py-2 text-xs font-bold text-[#29262B]"
            aria-expanded={filtersOpen}
          >
            <Filter className="h-3.5 w-3.5 text-[#C9182B]" />
            <span>{filtersOpen ? 'Itago' : 'Filter'}</span>
            {activeFilterCount > 0 && (
              <span className="liquid-nav-active rounded-full px-1.5 py-0.5 text-[10px] font-extrabold text-white tabular-nums">
                {activeFilterCount}
              </span>
            )}
          </button>
        </div>

        <div
          className={`${
            filtersOpen ? 'grid liquid-reveal-enter' : 'hidden md:grid'
          } gap-2.5 sm:gap-3 grid-cols-1 min-[360px]:grid-cols-2 md:grid-cols-3 xl:grid-cols-6`}
        >
          <input
            type="text"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            placeholder="Maghanap ng ruta..."
            className="glass-input hidden md:block min-h-[42px] rounded-2xl px-3.5 py-2 text-sm"
          />

          <select
            value={municipalityFilter}
            onChange={(e) => setMunicipalityFilter(e.target.value)}
            aria-label="Filter by any municipality"
            className="glass-input min-h-[42px] rounded-2xl px-3 py-2 text-sm"
          >
            <option value="all">Kahit Anong Bayan</option>
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
            className="glass-input min-h-[42px] rounded-2xl px-3 py-2 text-sm"
          >
            <option value="all">Lahat ng Pinanggalingan</option>
            {municipalities.map((m) => (
              <option key={m.id} value={m.id}>
                Galing: {m.name}
              </option>
            ))}
          </select>

          <select
            value={destinationFilter}
            onChange={(e) => setDestinationFilter(e.target.value)}
            aria-label="Filter by destination"
            className="glass-input min-h-[42px] rounded-2xl px-3 py-2 text-sm"
          >
            <option value="all">Lahat ng Pupuntahan</option>
            {municipalities.map((m) => (
              <option key={m.id} value={m.id}>
                Papunta: {m.name}
              </option>
            ))}
          </select>

          <select
            value={transportFilter}
            onChange={(e) => setTransportFilter(e.target.value)}
            aria-label="Filter by transport type"
            className="glass-input min-h-[42px] rounded-2xl px-3 py-2 text-sm"
          >
            <option value="all">Lahat ng Sasakyan</option>
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
            className="glass-input min-h-[42px] rounded-2xl px-3 py-2 text-sm"
          >
            <option value="all">Lahat ng Katayuan</option>
            <option value="verified_official">Opisyal na Taripa</option>
            <option value="community_estimate">Gabay ng Komunidad</option>
            <option value="pending_verification">Nire-review Pa</option>
            <option value="rejected_or_disputed">Tinanggihan / May Dispute</option>
          </select>
        </div>

        <div
          className={`${
            filtersOpen ? 'flex liquid-reveal-enter' : 'hidden md:flex'
          } flex-wrap items-center justify-between gap-2 text-xs`}
        >
          <div className="flex items-center gap-2">
            <label className="font-semibold text-[#777078]">Na-update simula:</label>
            <input
              type="date"
              value={updatedAfter}
              onChange={(e) => setUpdatedAfter(e.target.value)}
              className="glass-input min-h-[40px] rounded-xl px-2.5 py-1.5 text-xs"
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
            className="inline-flex min-h-[38px] items-center px-2 font-bold text-[#C9182B] hover:underline"
          >
            I-reset Lahat ng Filter
          </button>
        </div>
      </GlassCard>

      {/* Matrix Table + Mobile Cards */}
      {isLoading ? (
        <GlassSkeleton className="h-64" />
      ) : filteredRows.length === 0 ? (
        <EmptyStateCard
          icon={Table2}
          title="Walang nakitang pamasahe sa piniling filter"
          description="Subukang alisin o baguhin ang iyong mga filter o keyword."
          action={
            <Link to="/fare-search">
              <GlassButton variant="primary" size="sm">
                Buksan ang Fare Finder
              </GlassButton>
            </Link>
          }
        />
      ) : (
        <GlassCard variant="strong">
          {/* Mobile Card Layout (<= 767px) */}
          <div key={`m-page-${safePage}`} className="liquid-reveal-enter grid gap-2.5 p-2.5 md:hidden">
            {paginatedRows.map((row) => (
              <div
                key={row.key}
                className="glass-pill-tile rounded-[20px] p-3.5 space-y-2.5"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-display text-sm font-extrabold text-[#29262B] leading-snug">
                      {row.originName} → {row.destinationName}
                    </p>
                    <p className="text-xs font-semibold text-[#343039]">{row.transportTypeName}</p>
                  </div>
                  <div className="shrink-0">
                    <FareStatusBadge status={row.status} compact />
                  </div>
                </div>

                <div className="glass-panel grid grid-cols-4 gap-1.5 rounded-2xl px-2.5 py-2 text-center tabular-nums">
                  <div>
                    <span className="block text-[10px] font-semibold text-[#5B555E]">Regular</span>
                    <strong className="text-xs font-extrabold text-[#C9182B]">
                      {formatPhp(row.regularFare)}
                    </strong>
                  </div>
                  <div>
                    <span className="block text-[10px] font-semibold text-[#5B555E]">Estudyante</span>
                    <strong className="text-xs font-bold text-[#29262B]">
                      {formatPhp(row.studentFare)}
                    </strong>
                  </div>
                  <div>
                    <span className="block text-[10px] font-semibold text-[#5B555E]">Senior</span>
                    <strong className="text-xs font-bold text-[#29262B]">
                      {formatPhp(row.seniorFare)}
                    </strong>
                  </div>
                  <div>
                    <span className="block text-[10px] font-semibold text-[#5B555E]">PWD</span>
                    <strong className="text-xs font-bold text-[#29262B]">
                      {formatPhp(row.pwdFare)}
                    </strong>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-2 text-[11px] text-[#5B555E]">
                  <span className="min-w-0 truncate font-medium">
                    {row.issuingAuthority || 'Hindi pa verified'}
                  </span>
                  <Link
                    to={`/fares/${row.primaryRecordId}`}
                    className="inline-flex min-h-[30px] items-center font-bold text-[#C9182B] hover:underline shrink-0 whitespace-nowrap"
                  >
                    Detalye →
                  </Link>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop/Tablet Table */}
          <div key={`d-page-${safePage}`} className="liquid-reveal-enter hidden md:block overflow-x-auto rounded-t-[28px]">
            <table className="w-full min-w-[980px] text-left text-sm">
              <thead className="glass-table-head text-[11px] font-bold uppercase tracking-wider text-[#29262B]">
                <tr>
                  <th className="px-4 py-3.5">Pinanggalingan</th>
                  <th className="px-4 py-3.5">Pupuntahan</th>
                  <th className="px-4 py-3.5">Sasakyan</th>
                  <th className="px-4 py-3.5">Regular</th>
                  <th className="px-4 py-3.5">Estudyante</th>
                  <th className="px-4 py-3.5">Senior</th>
                  <th className="px-4 py-3.5">PWD</th>
                  <th className="px-4 py-3.5">Katayuan</th>
                  <th className="px-4 py-3.5">Pinagmulan</th>
                  <th className="px-4 py-3.5">Huling Na-check</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/50">
                {paginatedRows.map((row) => (
                  <tr key={row.key} className="hover:bg-white/35 transition-colors duration-150">
                    <td className="px-4 py-3 font-bold text-[#29262B]">{row.originName}</td>
                    <td className="px-4 py-3 font-bold text-[#29262B]">{row.destinationName}</td>
                    <td className="px-4 py-3 font-medium text-[#343039]">{row.transportTypeName}</td>
                    <td className="px-4 py-3 font-bold text-[#C9182B]">
                      {formatPhp(row.regularFare)}
                    </td>
                    <td className="px-4 py-3 text-[#29262B]">{formatPhp(row.studentFare)}</td>
                    <td className="px-4 py-3 text-[#29262B]">{formatPhp(row.seniorFare)}</td>
                    <td className="px-4 py-3 text-[#29262B]">{formatPhp(row.pwdFare)}</td>
                    <td className="px-4 py-3">
                      <FareStatusBadge status={row.status} compact />
                    </td>
                    <td className="px-4 py-3 text-xs">
                      <p className="font-semibold text-[#29262B]">
                        {row.issuingAuthority || 'Hindi pa verified'}
                      </p>
                      {row.officialDocumentReference && (
                        <p className="text-[#777078]">{row.officialDocumentReference}</p>
                      )}
                      {row.sourceUrl && (
                        <a
                          href={row.sourceUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-[#C9182B] hover:underline"
                        >
                          Source <ExternalLink className="h-3 w-3" />
                        </a>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-[#777078]">
                      <Link
                        to={`/fares/${row.primaryRecordId}`}
                        className="font-semibold text-[#C9182B] hover:underline"
                      >
                        {formatDateSafe(row.lastVerifiedAt)}
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="glass-table-head flex flex-wrap items-center justify-between gap-2 rounded-b-[28px] border-t border-white/65 px-4 py-3 text-xs">
            <span className="font-semibold text-[#777078]">
              Ipinapakita <strong className="text-[#29262B]">{startIdx + 1}</strong>–
              <strong className="text-[#29262B]">
                {Math.min(startIdx + MATRIX_PAGE_SIZE, filteredRows.length)}
              </strong>{' '}
              sa <strong className="text-[#C9182B]">{filteredRows.length}</strong> na ruta
            </span>

            {totalPages > 1 && (
              <div className="flex items-center gap-1.5">
                <GlassButton
                  type="button"
                  variant="glass"
                  size="sm"
                  aria-label="Previous matrix page"
                  disabled={safePage <= 1}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                  Nakaraan
                </GlassButton>
                <span className="glass-pill-tile rounded-full px-3 py-1 text-[11px] font-bold text-[#29262B] tabular-nums">
                  Pahina {safePage} ng {totalPages}
                </span>
                <GlassButton
                  type="button"
                  variant="glass"
                  size="sm"
                  aria-label="Next matrix page"
                  disabled={safePage >= totalPages}
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                >
                  Susunod
                  <ChevronRight className="h-3.5 w-3.5" />
                </GlassButton>
              </div>
            )}
          </div>
        </GlassCard>
      )}
    </div>
  );
}
