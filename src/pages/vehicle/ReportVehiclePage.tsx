import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  AlertTriangle,
  Building,
  Camera,
  CheckCircle2,
  Download,
  FileCheck2,
  LocateFixed,
  Send,
  ShieldAlert,
  Trash2,
} from 'lucide-react';
import { z } from 'zod';
import { useAuth } from '@/contexts/AuthContext';
import { useGps } from '@/contexts/GpsContext';
import { useToast } from '@/contexts/ToastContext';
import {
  useFareRecords,
  useGovernmentAgencies,
  useMunicipalities,
} from '@/hooks/useReferenceData';
import {
  downloadComplaintSummary,
  recommendAgenciesForReport,
  VEHICLE_EVIDENCE_TYPE_LABELS,
  VEHICLE_TYPE_OPTIONS,
  VIOLATION_CATEGORIES,
} from '@/lib/vehicleReporting';
import { validateVehicleEvidenceFile, vehicleReportSchema } from '@/lib/validation';
import { formatPhp } from '@/lib/utils';
import { submitVehicleReport } from '@/services/pamasaheApi';
import type {
  VehicleEvidenceType,
  VehicleReport,
  ViolationCategoryGroup,
} from '@/types/database';
import { GlassButton, GlassCard } from '@/components/glass/GlassPrimitives';

type VehicleReportFormValues = z.infer<typeof vehicleReportSchema>;

interface StagedEvidenceItem {
  id: string;
  file: File;
  evidenceType: VehicleEvidenceType;
  previewUrl: string;
  isVideo: boolean;
}

export function ReportVehiclePage({
  focusMode = 'vehicle',
}: {
  focusMode?: 'vehicle' | 'driver' | 'violation';
}) {
  const { user, isConfigured } = useAuth();
  const { currentPosition, requestSingleFix } = useGps();
  const { pushToast } = useToast();
  const queryClient = useQueryClient();

  const { data: muniRes } = useMunicipalities();
  const { data: fares } = useFareRecords();
  const { data: agencies } = useGovernmentAgencies();

  const municipalities = muniRes?.data ?? [];

  const [selectedCategories, setSelectedCategories] = useState<
    Array<{ group: ViolationCategoryGroup; category: string }>
  >(() =>
    focusMode === 'driver'
      ? [{ group: 'DRIVER BEHAVIOR', category: 'Reckless driving' }]
      : focusMode === 'violation'
        ? [{ group: 'FARE VIOLATIONS', category: 'Overcharging' }]
        : []
  );

  const [stagedEvidence, setStagedEvidence] = useState<StagedEvidenceItem[]>([]);
  const [selectedEvidenceType, setSelectedEvidenceType] =
    useState<VehicleEvidenceType>('vehicle_photo');
  const [attachGps, setAttachGps] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{
    done: number;
    total: number;
  } | null>(null);
  const [idempotencyKey, setIdempotencyKey] = useState(
    () => `veh-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  );
  const [submittedReport, setSubmittedReport] = useState<VehicleReport | null>(null);

  const {
    register,
    watch,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<VehicleReportFormValues>({
    resolver: zodResolver(vehicleReportSchema),
    defaultValues: {
      plateNotAvailable: false,
      vehicleType: 'Multicab',
      incidentDate: new Date().toISOString().slice(0, 10),
      isConfidentialIdentity: false,
      externalShareConsent: false,
    },
  });

  const plateNotAvailable = watch('plateNotAvailable');
  const vehicleType = watch('vehicleType');
  const originMuniId = watch('originMunicipalityId');
  const destMuniId = watch('destinationMunicipalityId');

  // Lookup verified official fare only when origin, destination & matching mode exist
  const matchingOfficialFare = useMemo(() => {
    if (!originMuniId || !destMuniId) return null;
    const modeMatch = vehicleType.toLowerCase();
    const candidate = (fares ?? []).find(
      (f) =>
        f.status === 'verified_official' &&
        !f.is_archived &&
        !f.is_test_fixture &&
        f.origin_municipality_id === originMuniId &&
        f.destination_municipality_id === destMuniId &&
        f.passenger_category === 'regular' &&
        (modeMatch.includes('jeepney')
          ? f.transport_type?.code === 'jeepney'
          : modeMatch === 'tricycle'
            ? f.transport_type?.code === 'tricycle'
            : modeMatch === 'bus'
              ? f.transport_type?.code === 'bus'
              : modeMatch === 'uv express'
                ? f.transport_type?.code === 'uv_express'
                : modeMatch === 'multicab'
                  ? f.transport_type?.code === 'multicab'
                  : false)
    );
    return candidate ?? null;
  }, [fares, originMuniId, destMuniId, vehicleType]);

  const recommendedAgencies = useMemo(
    () =>
      recommendAgenciesForReport({
        vehicleType,
        selectedCategories: selectedCategories.map((c) => c.category),
        agencies: agencies ?? [],
      }),
    [vehicleType, selectedCategories, agencies]
  );

  // Clean up object URLs on unmount
  useEffect(() => {
    return () => {
      for (const item of stagedEvidence) {
        URL.revokeObjectURL(item.previewUrl);
      }
    };
  }, [stagedEvidence]);

  const toggleCategory = (group: ViolationCategoryGroup, category: string) => {
    setSelectedCategories((prev) => {
      const exists = prev.some((c) => c.category === category);
      if (exists) return prev.filter((c) => c.category !== category);
      return [...prev, { group, category }];
    });
  };

  const handleEvidenceSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    for (const file of files) {
      const err = validateVehicleEvidenceFile(file);
      if (err) {
        pushToast({ title: 'Evidence file rejected', description: err, variant: 'error' });
        return;
      }
    }
    const nextItems: StagedEvidenceItem[] = files.map((file) => ({
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      file,
      evidenceType: file.type === 'video/mp4' ? 'video_recording' : selectedEvidenceType,
      previewUrl: URL.createObjectURL(file),
      isVideo: file.type === 'video/mp4',
    }));
    setStagedEvidence((prev) => [...prev, ...nextItems].slice(0, 6));
    e.target.value = '';
  };

  const removeEvidence = (id: string) => {
    setStagedEvidence((prev) => {
      const target = prev.find((x) => x.id === id);
      if (target) URL.revokeObjectURL(target.previewUrl);
      return prev.filter((x) => x.id !== id);
    });
  };

  const submitMutation = useMutation({
    mutationFn: async ({
      values,
      asDraft,
    }: {
      values: VehicleReportFormValues;
      asDraft: boolean;
    }) => {
      if (!user) throw new Error('Sign in to submit a vehicle incident report.');
      if (selectedCategories.length === 0) {
        throw new Error('Select at least one alleged violation category.');
      }

      setUploadProgress(
        stagedEvidence.length > 0 ? { done: 0, total: stagedEvidence.length } : null
      );

      return submitVehicleReport({
        userId: user.id,
        plateNumber: values.plateNumber,
        plateNotAvailable: values.plateNotAvailable,
        vehicleType: values.vehicleType,
        bodyNumber: values.bodyNumber,
        vehicleColor: values.vehicleColor,
        vehicleModel: values.vehicleModel,
        operatorName: values.operatorName,
        routeInfo: values.routeInfo,
        originMunicipalityId: values.originMunicipalityId,
        destinationMunicipalityId: values.destinationMunicipalityId,
        municipalityId: values.municipalityId,
        incidentLocation: values.incidentLocation,
        incidentLatitude: attachGps && currentPosition ? currentPosition.latitude : null,
        incidentLongitude: attachGps && currentPosition ? currentPosition.longitude : null,
        incidentDate: values.incidentDate,
        incidentTime: values.incidentTime,
        description: values.description,
        actualFare:
          values.actualFare !== '' && values.actualFare !== undefined
            ? Number(values.actualFare)
            : null,
        expectedFare: matchingOfficialFare?.fare_amount ?? null,
        additionalRemarks: values.additionalRemarks,
        isConfidentialIdentity: values.isConfidentialIdentity,
        externalShareConsent: values.externalShareConsent,
        submissionIdempotencyKey: idempotencyKey,
        asDraft,
        selectedCategories,
        evidenceItems: stagedEvidence.map((s) => ({
          file: s.file,
          evidenceType: s.evidenceType,
        })),
        recommendedAgencyIds: values.externalShareConsent
          ? recommendedAgencies.map((r) => r.agency.id)
          : [],
        onUploadProgress: (done, total) => setUploadProgress({ done, total }),
      });
    },
    onSuccess: (created) => {
      queryClient.invalidateQueries({ queryKey: ['myVehicleReports', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['notifications', user?.id] });
      setSubmittedReport(created);
      setUploadProgress(null);
      pushToast({
        title: `Complaint Reference: ${created.reference_number}`,
        description: `Saved as ${created.complaint_status}.`,
        variant: 'success',
      });
    },
    onError: (err: Error) => {
      setUploadProgress(null);
      pushToast({ title: 'Report submission failed', description: err.message, variant: 'error' });
    },
  });

  if (submittedReport) {
    return (
      <GlassCard variant="strong" className="mx-auto max-w-2xl p-6 sm:p-8 space-y-5 text-center">
        <div className="glass-pill-tile mx-auto flex h-14 w-14 items-center justify-center rounded-full text-[#C9182B]">
          <CheckCircle2 className="h-8 w-8" />
        </div>
        <p className="text-xs font-bold uppercase tracking-widest text-[#C9182B]">
          Reported Incident Logged
        </p>
        <h1 className="font-display text-2xl font-extrabold text-[#29262B]">
          Reference: {submittedReport.reference_number}
        </h1>
        <p className="text-sm text-[#777078]">
          Internal Pamasahe Tracker Status:{' '}
          <strong className="text-[#29262B]">{submittedReport.complaint_status}</strong>. Submitting this report records an
          alleged violation for review and does <strong>not</strong> automatically file an official
          case with LTFRB, LTO, PNP, or an LGU.
        </p>

        <div className="flex flex-wrap justify-center gap-3 pt-2">
          <GlassButton
            type="button"
            variant="primary"
            onClick={() => downloadComplaintSummary(submittedReport, recommendedAgencies)}
          >
            <Download className="h-4 w-4" />
            Download Complaint Summary
          </GlassButton>
          <Link to={`/dashboard/vehicle-reports/${submittedReport.id}`}>
            <GlassButton variant="secondary">View Complaint Details</GlassButton>
          </Link>
          <GlassButton
            type="button"
            variant="glass"
            onClick={() => {
              setSubmittedReport(null);
              reset({
                plateNotAvailable: false,
                vehicleType: 'Multicab',
                incidentDate: new Date().toISOString().slice(0, 10),
                isConfidentialIdentity: false,
                externalShareConsent: false,
              });
              setSelectedCategories([]);
              setStagedEvidence([]);
              setIdempotencyKey(
                `veh-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
              );
            }}
          >
            Submit Another Report
          </GlassButton>
        </div>
      </GlassCard>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <GlassCard variant="strong" className="p-5 sm:p-6 space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-[#C9182B]">
              {focusMode === 'driver'
                ? 'Report a Driver'
                : focusMode === 'violation'
                  ? 'Report Transportation Violation'
                  : 'Vehicle & Violation Reporting'}
            </p>
            <h1 className="font-display text-2xl font-extrabold text-[#29262B] sm:text-3xl">
              {focusMode === 'driver'
                ? 'Report a Driver Incident'
                : focusMode === 'violation'
                  ? 'Report a Transportation Violation'
                  : 'Report a Vehicle'}
            </h1>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link to="/authorities">
              <GlassButton variant="secondary" size="sm">
                <Building className="h-3.5 w-3.5" />
                Agency Directory
              </GlassButton>
            </Link>
            <Link to="/dashboard/vehicle-reports">
              <GlassButton variant="glass" size="sm">
                My Vehicle Reports
              </GlassButton>
            </Link>
          </div>
        </div>
        <p className="text-xs sm:text-sm text-[#343039]">
          Submit a Reported Incident / Alleged Violation for review. Reports are never published as
          a public blacklist.
        </p>
      </GlassCard>

      {!user && (
        <GlassCard variant="strong" className="p-5 border-[#E9E5E8] flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs sm:text-sm font-semibold text-[#29262B]">
            Sign in with your commuter account to submit protected vehicle reports and track status
            updates.
          </p>
          <Link to="/login">
            <GlassButton variant="primary" size="sm">
              Sign In to Report
            </GlassButton>
          </Link>
        </GlassCard>
      )}

      <form
        onSubmit={handleSubmit((values) =>
          submitMutation.mutate({ values, asDraft: false })
        )}
        className="space-y-6"
      >
        {/* 1. VEHICLE INFORMATION */}
        <GlassCard variant="strong" className="p-5 sm:p-6 space-y-4">
          <h2 className="font-display text-lg font-bold text-[#29262B]">
            1. Vehicle Identification
          </h2>

          <div className="space-y-3">
            <label className="flex items-center gap-2.5 text-sm font-semibold text-[#29262B]">
              <input
                type="checkbox"
                {...register('plateNotAvailable')}
                className="h-4 w-4 rounded accent-[#C9182B]"
              />
              Plate Number Not Available (missing, obscured, or unreadable)
            </label>

            {!plateNotAvailable && (
              <div>
                <label className="mb-1 block text-xs font-bold uppercase text-[#777078]">
                  Vehicle Plate Number
                </label>
                <input
                  type="text"
                  {...register('plateNumber')}
                  placeholder="e.g., ABC 1234 or ORM-402"
                  className="glass-input w-full rounded-2xl px-4 py-3 text-base font-bold uppercase tracking-wider"
                />
                {errors.plateNumber && (
                  <p className="mt-1 text-xs font-semibold text-[#C9182B]">
                    {errors.plateNumber.message}
                  </p>
                )}
              </div>
            )}

            <div>
              <label className="mb-1 block text-xs font-bold uppercase text-[#777078]">
                Vehicle Type
              </label>
              <select
                {...register('vehicleType')}
                className="glass-input w-full rounded-2xl px-4 py-3 text-sm font-semibold"
              >
                {VEHICLE_TYPE_OPTIONS.map((vt) => (
                  <option key={vt} value={vt}>
                    {vt}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-xs font-bold uppercase text-[#777078]">
                Municipality / City Where Spotted
              </label>
              <select
                {...register('municipalityId')}
                className="glass-input w-full rounded-2xl px-4 py-3 text-sm font-semibold"
              >
                <option value="">Select municipality...</option>
                {municipalities.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
              {errors.municipalityId && (
                <p className="mt-1 text-xs font-semibold text-[#C9182B]">
                  {errors.municipalityId.message}
                </p>
              )}
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <input
                type="text"
                {...register('bodyNumber')}
                placeholder="Body / TODA / Sidecar No. (optional)"
                className="glass-input w-full rounded-2xl px-3.5 py-2.5 text-sm"
              />
              <input
                type="text"
                {...register('vehicleColor')}
                placeholder="Vehicle Color (optional)"
                className="glass-input w-full rounded-2xl px-3.5 py-2.5 text-sm"
              />
              <input
                type="text"
                {...register('vehicleModel')}
                placeholder="Make / Model (optional)"
                className="glass-input w-full rounded-2xl px-3.5 py-2.5 text-sm"
              />
              <input
                type="text"
                {...register('operatorName')}
                placeholder="Transport Operator / Co-op (optional)"
                className="glass-input w-full rounded-2xl px-3.5 py-2.5 text-sm"
              />
            </div>

            <input
              type="text"
              {...register('routeInfo')}
              placeholder="Route, signboard, or franchise notes (optional)"
              className="glass-input w-full rounded-2xl px-3.5 py-2.5 text-sm"
            />
          </div>
        </GlassCard>

        {/* 2. ALLEGED VIOLATIONS */}
        <GlassCard variant="strong" className="p-5 sm:p-6 space-y-4">
          <div>
            <h2 className="font-display text-lg font-bold text-[#29262B]">
              2. Alleged Violation Categories (Select All That Apply)
            </h2>
            <p className="text-xs text-[#777078]">
              Selecting categories logs an alleged violation for investigation; it does not declare
              guilt automatically.
            </p>
          </div>

          <div className="space-y-4">
            {VIOLATION_CATEGORIES.map((grp) => (
              <div
                key={grp.group}
                className="glass-panel rounded-[22px] p-3.5 space-y-2"
              >
                <p className="text-xs font-extrabold uppercase tracking-wider text-[#C9182B]">
                  {grp.group}
                </p>
                <div className="grid gap-2 sm:grid-cols-2">
                  {grp.items.map((cat) => {
                    const checked = selectedCategories.some((c) => c.category === cat);
                    return (
                      <label
                        key={cat}
                        className={`flex cursor-pointer items-center gap-2.5 rounded-full px-3.5 py-2 text-xs font-semibold transition ${
                          checked
                            ? 'liquid-nav-active text-white'
                            : 'glass-pill-tile text-[#29262B] hover:border-white'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleCategory(grp.group, cat)}
                          className="h-4 w-4 shrink-0 accent-[#C9182B]"
                        />
                        <span>{cat}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </GlassCard>

        {/* 3. INCIDENT DETAILS */}
        <GlassCard variant="strong" className="p-5 sm:p-6 space-y-4">
          <h2 className="font-display text-lg font-bold text-[#29262B]">
            3. Reported Incident Details
          </h2>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-bold uppercase text-[#777078]">
                Incident Date
              </label>
              <input
                type="date"
                {...register('incidentDate')}
                className="glass-input w-full rounded-2xl px-3.5 py-2.5 text-sm"
              />
              {errors.incidentDate && (
                <p className="mt-1 text-xs text-[#C9182B]">{errors.incidentDate.message}</p>
              )}
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold uppercase text-[#777078]">
                Incident Time (Optional)
              </label>
              <input
                type="time"
                {...register('incidentTime')}
                className="glass-input w-full rounded-2xl px-3.5 py-2.5 text-sm"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-bold uppercase text-[#777078]">
              Specific Location / Street / Terminal
            </label>
            <input
              type="text"
              {...register('incidentLocation')}
              placeholder="e.g., Near Calapan Public Market or Strong Republic Highway km marker"
              className="glass-input w-full rounded-2xl px-3.5 py-2.5 text-sm"
            />
            {errors.incidentLocation && (
              <p className="mt-1 text-xs text-[#C9182B]">{errors.incidentLocation.message}</p>
            )}
          </div>

          {/* Optional GPS Attachment with Explicit Consent */}
          <div className="rounded-2xl border border-[#F8E7EA] bg-white/80 p-3.5 space-y-2 text-xs">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <label className="flex items-center gap-2 font-semibold text-[#29262B]">
                <input
                  type="checkbox"
                  checked={attachGps}
                  onChange={async (e) => {
                    const next = e.target.checked;
                    setAttachGps(next);
                    if (next && !currentPosition) {
                      await requestSingleFix(true);
                    }
                  }}
                  className="accent-[#C9182B]"
                />
                Attach current GPS coordinates (with explicit location permission)
              </label>
              <GlassButton
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => requestSingleFix(true)}
              >
                <LocateFixed className="h-3.5 w-3.5" />
                Refresh GPS
              </GlassButton>
            </div>
            {attachGps && currentPosition && (
              <p className="font-mono text-[#C9182B]">
                Attached: {currentPosition.latitude.toFixed(5)}°N,{' '}
                {currentPosition.longitude.toFixed(5)}°E (±{currentPosition.accuracyMeters} m)
              </p>
            )}
          </div>

          {/* Route Origin/Destination + Fare Comparison */}
          <div className="grid gap-3 sm:grid-cols-2">
            <select
              {...register('originMunicipalityId')}
              className="glass-input rounded-2xl px-3.5 py-2.5 text-sm"
            >
              <option value="">Trip Origin LGU (optional)...</option>
              {municipalities.map((m) => (
                <option key={m.id} value={m.id}>
                  Origin: {m.name}
                </option>
              ))}
            </select>
            <select
              {...register('destinationMunicipalityId')}
              className="glass-input rounded-2xl px-3.5 py-2.5 text-sm"
            >
              <option value="">Trip Destination LGU (optional)...</option>
              {municipalities.map((m) => (
                <option key={m.id} value={m.id}>
                  Dest: {m.name}
                </option>
              ))}
            </select>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 items-center">
            <div>
              <label className="mb-1 block text-xs font-bold uppercase text-[#777078]">
                Actual Fare Paid (PHP, optional)
              </label>
              <input
                type="number"
                step="0.25"
                {...register('actualFare')}
                placeholder="e.g., 50.00"
                className="glass-input w-full rounded-2xl px-3.5 py-2.5 text-sm"
              />
            </div>

            <div className="rounded-2xl bg-[#F8E7EA]/80 border border-[#E9E5E8]/45 p-3 text-xs">
              <p className="font-bold text-[#B51224]">Verified Expected Fare Reference:</p>
              <p className="font-semibold text-[#29262B]">
                {matchingOfficialFare
                  ? `${formatPhp(matchingOfficialFare.fare_amount)} (${matchingOfficialFare.official_document_reference})`
                  : 'No verified official fare record linked for this selection.'}
              </p>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-bold uppercase text-[#777078]">
              Detailed Incident Description
            </label>
            <textarea
              rows={4}
              {...register('description')}
              placeholder="Describe clearly what happened, including sequence of events and passenger interactions..."
              className="glass-input w-full rounded-2xl px-3.5 py-2.5 text-sm"
            />
            {errors.description && (
              <p className="mt-1 text-xs text-[#C9182B]">{errors.description.message}</p>
            )}
          </div>

          <input
            type="text"
            {...register('additionalRemarks')}
            placeholder="Additional remarks or witnesses (optional)"
            className="glass-input w-full rounded-2xl px-3.5 py-2.5 text-sm"
          />
        </GlassCard>

        {/* 4. PHOTO & VIDEO EVIDENCE */}
        <GlassCard variant="strong" className="p-5 sm:p-6 space-y-4">
          <h2 className="font-display text-lg font-bold text-[#29262B]">
            4. Photo &amp; Video Evidence (Private Storage)
          </h2>
          <p className="text-xs text-[#777078]">
            Supported: JPG, JPEG, PNG, WEBP (max 5 MB) and MP4 videos (max 25 MB). Uploaded media
            is stored privately and never published automatically.
          </p>

          <div className="grid gap-3 sm:grid-cols-2">
            <select
              value={selectedEvidenceType}
              onChange={(e) => setSelectedEvidenceType(e.target.value as VehicleEvidenceType)}
              className="glass-input rounded-2xl px-3.5 py-2.5 text-sm"
            >
              {Object.entries(VEHICLE_EVIDENCE_TYPE_LABELS).map(([k, label]) => (
                <option key={k} value={k}>
                  {label}
                </option>
              ))}
            </select>

            <label className="flex cursor-pointer items-center justify-center gap-2 rounded-2xl border border-dashed border-[#C9182B]/45 bg-[#F7F3EF]/75 px-4 py-3 text-xs font-bold text-[#C9182B] hover:bg-[#F8E7EA]/80 transition">
              <Camera className="h-4 w-4" />
              <span>Choose Photo or MP4 Video</span>
              <input
                type="file"
                multiple
                accept="image/jpeg,image/png,image/webp,video/mp4"
                onChange={handleEvidenceSelect}
                className="hidden"
              />
            </label>
          </div>

          {stagedEvidence.length > 0 && (
            <div className="grid gap-3 sm:grid-cols-2">
              {stagedEvidence.map((item) => (
                <div
                  key={item.id}
                  className="rounded-2xl border border-white bg-white/80 p-3 space-y-2"
                >
                  {item.isVideo ? (
                    <video
                      src={item.previewUrl}
                      controls
                      className="h-36 w-full rounded-xl bg-black object-contain"
                    />
                  ) : (
                    <img
                      src={item.previewUrl}
                      alt={item.file.name}
                      className="h-36 w-full rounded-xl object-cover"
                    />
                  )}
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <div className="truncate">
                      <p className="font-bold truncate">{item.file.name}</p>
                      <p className="text-[#777078]">
                        {VEHICLE_EVIDENCE_TYPE_LABELS[item.evidenceType]}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeEvidence(item.id)}
                      className="liquid-btn-danger rounded-full p-1.5"
                      aria-label="Remove evidence"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {uploadProgress && (
            <div className="glass-pill-tile rounded-2xl p-3 text-xs font-bold text-[#C9182B]">
              Uploading evidence {uploadProgress.done} / {uploadProgress.total}...
            </div>
          )}
        </GlassCard>

        {/* 5. SMART AGENCY ROUTING & PRIVACY CONSENT */}
        <GlassCard variant="strong" className="p-5 sm:p-6 space-y-4">
          <h2 className="flex items-center gap-2 font-display text-lg font-bold text-[#29262B]">
            <ShieldAlert className="h-5 w-5 text-[#C9182B]" />
            5. Recommended Reporting Authorities &amp; Consent
          </h2>

          <div className="glass-pill-tile rounded-[20px] border-[#E9E5E8] p-3.5 text-xs text-[#29262B]">
            <strong>Notice:</strong> Pamasahe Tracker is an independent monitoring system and is{' '}
            <strong>not</strong> an official LTFRB, LTO, PNP, or LGU filing portal.
          </div>

          <div className="space-y-2.5">
            {recommendedAgencies.map((rec) => (
              <div
                key={rec.agency.id}
                className="glass-pill-tile rounded-[20px] p-3.5 text-xs space-y-1"
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="font-bold text-sm text-[#29262B]">{rec.agency.agency_name}</p>
                  <span className="rounded-full bg-[#F8E7EA] px-2.5 py-0.5 text-[10px] font-bold uppercase text-[#B51224]">
                    {rec.priority} match
                  </span>
                </div>
                <p className="text-[#777078]">{rec.reasons.join(' ')}</p>
                <p className="text-[#C9182B] font-semibold">
                  {rec.agency.verified_contact_information}
                </p>
              </div>
            ))}
          </div>

          <div className="space-y-2.5 pt-2 text-xs font-semibold text-[#29262B]">
            <label className="flex items-start gap-2.5">
              <input type="checkbox" {...register('isConfidentialIdentity')} className="mt-0.5 accent-[#C9182B]" />
              <span>
                Keep my reporter identity confidential during administrative correspondence where
                legally and operationally permitted.
              </span>
            </label>
            <label className="flex items-start gap-2.5">
              <input type="checkbox" {...register('externalShareConsent')} className="mt-0.5 accent-[#C9182B]" />
              <span>
                I explicitly consent for administrators to prepare referral documentation toward the
                recommended government authority listed above if confirmed upon review.
              </span>
            </label>
          </div>
        </GlassCard>

        {/* SUBMIT / DRAFT BUTTONS */}
        <div className="flex flex-col gap-3 sm:flex-row">
          <GlassButton
            type="submit"
            variant="primary"
            size="lg"
            className="flex-1"
            disabled={!user || !isConfigured || submitMutation.isPending}
          >
            <Send className="h-4 w-4" />
            {submitMutation.isPending ? 'Submitting Report...' : 'Submit Reported Incident'}
          </GlassButton>
          <GlassButton
            type="button"
            variant="glass"
            size="lg"
            disabled={!user || !isConfigured || submitMutation.isPending}
            onClick={handleSubmit((values) =>
              submitMutation.mutate({ values, asDraft: true })
            )}
          >
            <FileCheck2 className="h-4 w-4" />
            Save Draft
          </GlassButton>
        </div>

        {selectedCategories.length === 0 && (
          <p className="flex items-center gap-1.5 text-xs font-semibold text-[#B51224]">
            <AlertTriangle className="h-4 w-4" />
            Select at least one alleged violation category in Section 2 before submitting.
          </p>
        )}
      </form>
    </div>
  );
}
