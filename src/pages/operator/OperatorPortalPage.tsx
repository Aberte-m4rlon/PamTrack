import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Save, Truck } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import {
  useMunicipalities,
  useOperators,
  useTransportTypes,
} from '@/hooks/useReferenceData';
import { fetchFareReports, upsertTransportOperator } from '@/services/pamasaheApi';
import { formatDateSafe, formatPhp } from '@/lib/utils';
import {
  EmptyStateCard,
  GlassButton,
  GlassCard,
  ReportStatusBadge,
} from '@/components/glass/GlassPrimitives';
import { Link } from 'react-router-dom';

export function OperatorPortalPage() {
  const { user } = useAuth();
  const { pushToast } = useToast();
  const queryClient = useQueryClient();

  const { data: operators } = useOperators();
  const { data: muniRes } = useMunicipalities();
  const { data: transportRes } = useTransportTypes();

  const municipalities = muniRes?.data ?? [];
  const transportTypes = transportRes?.data ?? [];

  const myOperators = (operators ?? []).filter((o) => o.owner_user_id === user?.id);
  const myOpIds = new Set(myOperators.map((o) => o.id));

  const { data: allRelevantReports } = useQuery({
    queryKey: ['operatorReports', user?.id],
    queryFn: () => fetchFareReports(),
    enabled: Boolean(user),
  });

  const relevantReports = (allRelevantReports ?? []).filter(
    (r) => r.operator_id && myOpIds.has(r.operator_id)
  );

  const [operatorName, setOperatorName] = useState('');
  const [franchiseNo, setFranchiseNo] = useState('');
  const [transportTypeId, setTransportTypeId] = useState('');
  const [primaryMuniId, setPrimaryMuniId] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [officeAddress, setOfficeAddress] = useState('');

  const saveMutation = useMutation({
    mutationFn: () =>
      upsertTransportOperator({
        owner_user_id: user!.id,
        operator_name: operatorName.trim(),
        franchise_or_permit_number: franchiseNo.trim() || null,
        transport_type_id: transportTypeId || null,
        primary_municipality_id: primaryMuniId || null,
        contact_phone: contactPhone.trim() || null,
        office_address: officeAddress.trim() || null,
        verification_status: 'pending',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['operators'] });
      setOperatorName('');
      setFranchiseNo('');
      pushToast({
        title: 'Operator profile submitted',
        description: 'Administrators can now review your franchise / permit details.',
        variant: 'success',
      });
    },
    onError: (err: Error) => {
      pushToast({ title: 'Save failed', description: err.message, variant: 'error' });
    },
  });

  return (
    <div className="space-y-6">
      <GlassCard variant="strong" className="p-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-[#DC2626]">
            Transport Operator Portal
          </p>
          <h1 className="font-display text-2xl font-extrabold text-[#24191D]">
            Authorized Operator &amp; Tariff Documentation
          </h1>
          <p className="text-sm text-[#78716C]">
            Manage authorized fleet registration, submit supporting fare order documentation, and
            monitor commuter reports tied to your organization.
          </p>
        </div>
        <Link to="/dashboard/reports">
          <GlassButton variant="secondary" size="sm">
            Submit Supporting Fare Documentation
          </GlassButton>
        </Link>
      </GlassCard>

      <div className="grid gap-6 lg:grid-cols-12">
        <GlassCard variant="strong" className="p-6 lg:col-span-5 space-y-4 h-fit">
          <h2 className="flex items-center gap-2 font-display text-lg font-bold text-[#24191D]">
            <Truck className="h-5 w-5 text-[#DC2626]" />
            Register / Update Operator Record
          </h2>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              saveMutation.mutate();
            }}
            className="space-y-3"
          >
            <input
              type="text"
              required
              value={operatorName}
              onChange={(e) => setOperatorName(e.target.value)}
              placeholder="Transport Cooperative / Operator Name"
              className="glass-input w-full rounded-2xl px-3.5 py-2 text-sm"
            />
            <input
              type="text"
              value={franchiseNo}
              onChange={(e) => setFranchiseNo(e.target.value)}
              placeholder="LTFRB CPC / Municipal Franchise No."
              className="glass-input w-full rounded-2xl px-3.5 py-2 text-sm"
            />
            <div className="grid gap-3 sm:grid-cols-2">
              <select
                value={transportTypeId}
                onChange={(e) => setTransportTypeId(e.target.value)}
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
                value={primaryMuniId}
                onChange={(e) => setPrimaryMuniId(e.target.value)}
                className="glass-input rounded-2xl px-3 py-2 text-sm"
              >
                <option value="">Base Municipality...</option>
                {municipalities.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
            </div>
            <input
              type="text"
              value={contactPhone}
              onChange={(e) => setContactPhone(e.target.value)}
              placeholder="Official Hotline / Phone"
              className="glass-input w-full rounded-2xl px-3.5 py-2 text-sm"
            />
            <input
              type="text"
              value={officeAddress}
              onChange={(e) => setOfficeAddress(e.target.value)}
              placeholder="Terminal / Office Address"
              className="glass-input w-full rounded-2xl px-3.5 py-2 text-sm"
            />

            <GlassButton
              type="submit"
              variant="primary"
              className="w-full"
              disabled={saveMutation.isPending}
            >
              <Save className="h-4 w-4" />
              {saveMutation.isPending ? 'Saving...' : 'Save Operator Profile'}
            </GlassButton>
          </form>
        </GlassCard>

        <div className="lg:col-span-7 space-y-5">
          <GlassCard variant="strong" className="p-5 space-y-3">
            <h2 className="font-display text-lg font-bold text-[#24191D]">
              My Authorized Operator Records ({myOperators.length})
            </h2>
            {myOperators.length === 0 ? (
              <p className="text-xs text-[#78716C]">
                No operator profiles registered under your account yet.
              </p>
            ) : (
              <div className="space-y-2.5">
                {myOperators.map((op) => (
                  <div
                    key={op.id}
                    className="glass-pill-tile flex flex-wrap items-center justify-between gap-2 rounded-[20px] p-3.5 text-xs"
                  >
                    <div>
                      <p className="font-bold text-sm text-[#24191D]">{op.operator_name}</p>
                      <p className="text-[#4B3B40]">
                        Franchise: {op.franchise_or_permit_number || 'Pending'} •{' '}
                        {op.office_address || 'No terminal address'}
                      </p>
                    </div>
                    <span className="glass-panel rounded-full px-3 py-1 font-bold uppercase text-[#DC2626]">
                      {op.verification_status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </GlassCard>

          <GlassCard variant="strong" className="p-5 space-y-3">
            <h2 className="font-display text-lg font-bold text-[#24191D]">
              Relevant Commuter Reports ({relevantReports.length})
            </h2>
            {relevantReports.length === 0 ? (
              <EmptyStateCard
                icon={Truck}
                title="No reports tied to your fleet"
                description="Commuter reports referencing your verified operator profile will appear here."
              />
            ) : (
              <div className="space-y-2">
                {relevantReports.map((rep) => (
                  <div
                    key={rep.id}
                    className="glass-pill-tile flex items-center justify-between rounded-[20px] p-3 text-xs"
                  >
                    <div>
                      <p className="font-bold text-[#24191D]">
                        {rep.origin?.name} → {rep.destination?.name} • {formatPhp(rep.fare_paid)}
                      </p>
                      <p className="text-[#78716C]">{formatDateSafe(rep.travel_date)}</p>
                    </div>
                    <ReportStatusBadge status={rep.status} />
                  </div>
                ))}
              </div>
            )}
          </GlassCard>
        </div>
      </div>
    </div>
  );
}
