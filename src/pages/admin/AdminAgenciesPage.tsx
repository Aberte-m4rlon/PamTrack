import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Building, PlusCircle } from 'lucide-react';
import { useToast } from '@/contexts/ToastContext';
import { useGovernmentAgencies } from '@/hooks/useReferenceData';
import { upsertGovernmentAgency } from '@/services/pamasaheApi';
import { GlassButton, GlassCard } from '@/components/glass/GlassPrimitives';

export function AdminAgenciesPage() {
  const { pushToast } = useToast();
  const queryClient = useQueryClient();
  const { data: agencies } = useGovernmentAgencies(true);

  const [agencyCode, setAgencyCode] = useState('');
  const [agencyName, setAgencyName] = useState('');
  const [jurisdiction, setJurisdiction] = useState('');
  const [officialWebsite, setOfficialWebsite] = useState('');
  const [complaintUrl, setComplaintUrl] = useState('');
  const [contactInfo, setContactInfo] = useState('');
  const [instructions, setInstructions] = useState('');
  const [lastVerified, setLastVerified] = useState(
    new Date().toISOString().slice(0, 10)
  );

  const saveMut = useMutation({
    mutationFn: () =>
      upsertGovernmentAgency({
        agency_code: agencyCode.trim().toLowerCase().replace(/\s+/g, '_'),
        agency_name: agencyName.trim(),
        jurisdiction: jurisdiction.trim(),
        official_website: officialWebsite.trim(),
        official_complaint_url: complaintUrl.trim() || null,
        verified_contact_information: contactInfo.trim(),
        submission_instructions: instructions.trim(),
        last_verified_at: lastVerified,
        is_active: true,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['governmentAgencies'] });
      setAgencyCode('');
      setAgencyName('');
      setJurisdiction('');
      setOfficialWebsite('');
      setComplaintUrl('');
      setContactInfo('');
      setInstructions('');
      pushToast({ title: 'Government agency record saved', variant: 'success' });
    },
    onError: (err: Error) => {
      pushToast({ title: 'Save failed', description: err.message, variant: 'error' });
    },
  });

  const toggleActive = useMutation({
    mutationFn: ({ id, isActive, ag }: { id: string; isActive: boolean; ag: any }) =>
      upsertGovernmentAgency({
        ...ag,
        id,
        is_active: !isActive,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['governmentAgencies'] });
      pushToast({ title: 'Agency active state updated', variant: 'info' });
    },
  });

  return (
    <div className="space-y-6">
      <GlassCard variant="strong" className="p-6">
        <p className="text-xs font-bold uppercase tracking-widest text-[#C9182B]">
          Configurable Official Destinations
        </p>
        <h1 className="font-display text-2xl font-extrabold text-[#29262B]">
          Agency Directory Management
        </h1>
      </GlassCard>

      <div className="grid gap-6 lg:grid-cols-12">
        <GlassCard variant="strong" className="p-6 lg:col-span-5 space-y-3 h-fit">
          <h2 className="flex items-center gap-2 font-display text-lg font-bold text-[#29262B]">
            <PlusCircle className="h-5 w-5 text-[#C9182B]" />
            Add / Update Authorized Agency
          </h2>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              saveMut.mutate();
            }}
            className="space-y-2.5 text-xs"
          >
            <input
              type="text"
              required
              value={agencyCode}
              onChange={(e) => setAgencyCode(e.target.value)}
              placeholder="Unique Code (e.g., dotr, calapan_cpsd)"
              className="glass-input w-full rounded-xl px-3 py-2"
            />
            <input
              type="text"
              required
              value={agencyName}
              onChange={(e) => setAgencyName(e.target.value)}
              placeholder="Official Agency Name"
              className="glass-input w-full rounded-xl px-3 py-2"
            />
            <input
              type="text"
              required
              value={jurisdiction}
              onChange={(e) => setJurisdiction(e.target.value)}
              placeholder="Jurisdiction"
              className="glass-input w-full rounded-xl px-3 py-2"
            />
            <input
              type="url"
              required
              value={officialWebsite}
              onChange={(e) => setOfficialWebsite(e.target.value)}
              placeholder="Official Website (https://...)"
              className="glass-input w-full rounded-xl px-3 py-2"
            />
            <input
              type="url"
              value={complaintUrl}
              onChange={(e) => setComplaintUrl(e.target.value)}
              placeholder="Official Complaint Portal URL (optional)"
              className="glass-input w-full rounded-xl px-3 py-2"
            />
            <input
              type="text"
              required
              value={contactInfo}
              onChange={(e) => setContactInfo(e.target.value)}
              placeholder="Verified Official Contact Info"
              className="glass-input w-full rounded-xl px-3 py-2"
            />
            <textarea
              rows={3}
              required
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              placeholder="Manual submission instructions..."
              className="glass-input w-full rounded-xl px-3 py-2"
            />
            <input
              type="date"
              required
              value={lastVerified}
              onChange={(e) => setLastVerified(e.target.value)}
              className="glass-input w-full rounded-xl px-3 py-2"
            />
            <GlassButton
              type="submit"
              variant="primary"
              className="w-full"
              disabled={saveMut.isPending}
            >
              Save Authority Channel
            </GlassButton>
          </form>
        </GlassCard>

        <div className="lg:col-span-7 space-y-3">
          {(agencies ?? []).map((ag) => (
            <GlassCard key={ag.id} variant="strong" className="p-4 space-y-2 text-xs">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Building className="h-4 w-4 text-[#C9182B]" />
                  <div>
                    <h3 className="font-bold text-sm text-[#29262B]">{ag.agency_name}</h3>
                    <p className="text-[#B51224] font-semibold">{ag.jurisdiction}</p>
                  </div>
                </div>
                <GlassButton
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() =>
                    toggleActive.mutate({ id: ag.id, isActive: ag.is_active, ag })
                  }
                >
                  {ag.is_active ? 'Active' : 'Inactive'}
                </GlassButton>
              </div>
              <p className="text-[#29262B]">{ag.verified_contact_information}</p>
              <p className="text-[#777078]">{ag.submission_instructions}</p>
            </GlassCard>
          ))}
        </div>
      </div>
    </div>
  );
}
