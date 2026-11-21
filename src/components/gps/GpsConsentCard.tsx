import { AlertTriangle, LocateFixed, MapPin, ShieldCheck, Square } from 'lucide-react';
import { useGps } from '@/contexts/GpsContext';
import { GlassButton, GlassCard } from '@/components/glass/GlassPrimitives';

export function GpsConsentCard({ compact = false }: { compact?: boolean }) {
  const {
    permissionState,
    consentGranted,
    trackingActive,
    requesting,
    currentPosition,
    nearestMunicipality,
    gpsError,
    lowAccuracyWarning,
    requestSingleFix,
    startTracking,
    stopTracking,
    revokeConsent,
  } = useGps();

  return (
    <GlassCard variant="strong" className={compact ? 'p-4 space-y-3' : 'p-5 space-y-4'}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase ${
                trackingActive
                  ? 'bg-emerald-600 text-white'
                  : permissionState === 'denied' || permissionState === 'unsupported'
                    ? 'bg-red-100 text-red-800'
                    : 'bg-[#DFF7E8] text-[#176B4B]'
              }`}
            >
              <span
                className={`h-2 w-2 rounded-full ${
                  trackingActive ? 'bg-white animate-pulse' : 'bg-[#176B4B]'
                }`}
              />
              {trackingActive
                ? 'Live GPS Active'
                : `Permission: ${permissionState}`}
            </span>
            {consentGranted && (
              <span className="text-[11px] font-semibold text-[#24966A]">
                Consent granted
              </span>
            )}
          </div>
          <h2 className="font-display text-base font-bold text-[#183329]">
            Browser GPS Location Control
          </h2>
          {!compact && (
            <p className="text-xs text-[#183329]/80 max-w-2xl">
              Location access is used strictly when you request it to detect your Oriental Mindoro
              municipality, find nearby verified transport terminals, and monitor active trips. We
              never track silently.
            </p>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          {!trackingActive ? (
            <>
              <GlassButton
                type="button"
                variant="glass"
                size="sm"
                disabled={requesting || permissionState === 'unsupported'}
                onClick={() => requestSingleFix(true)}
              >
                <LocateFixed className="h-3.5 w-3.5 text-[#176B4B]" />
                {requesting ? 'Locating...' : 'Detect Location'}
              </GlassButton>
              <GlassButton
                type="button"
                variant="primary"
                size="sm"
                disabled={requesting || permissionState === 'unsupported'}
                onClick={() => startTracking()}
              >
                <LocateFixed className="h-3.5 w-3.5" />
                Start Tracking
              </GlassButton>
            </>
          ) : (
            <GlassButton type="button" variant="danger" size="sm" onClick={stopTracking}>
              <Square className="h-3.5 w-3.5 fill-current" />
              Stop Tracking
            </GlassButton>
          )}

          {consentGranted && (
            <GlassButton type="button" variant="ghost" size="sm" onClick={revokeConsent}>
              Revoke Consent
            </GlassButton>
          )}
        </div>
      </div>

      {gpsError && (
        <div className="flex items-start gap-2 rounded-2xl border border-red-300 bg-red-50/90 p-3 text-xs text-red-900">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-600" />
          <span>{gpsError}</span>
        </div>
      )}

      {lowAccuracyWarning && currentPosition && (
        <div className="flex items-start gap-2 rounded-2xl border border-amber-300 bg-amber-50/90 p-3 text-xs text-amber-950">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
          <span>
            Low GPS accuracy reported (±{currentPosition.accuracyMeters} m). Move outdoors or wait
            for a stronger satellite fix before relying on exact terminal distance.
          </span>
        </div>
      )}

      {currentPosition ? (
        <div className="grid gap-3 sm:grid-cols-3 rounded-2xl border border-white/80 bg-white/75 p-3 text-xs">
          <div>
            <p className="font-bold uppercase text-[10px] text-[#183329]/60">Coordinates</p>
            <p className="font-mono font-bold text-[#183329]">
              {currentPosition.latitude.toFixed(5)}°N, {currentPosition.longitude.toFixed(5)}°E
            </p>
          </div>
          <div>
            <p className="font-bold uppercase text-[10px] text-[#183329]/60">GPS Accuracy</p>
            <p className="font-bold text-[#176B4B]">±{currentPosition.accuracyMeters} meters</p>
          </div>
          <div>
            <p className="font-bold uppercase text-[10px] text-[#183329]/60">
              Detected Municipality
            </p>
            <p className="flex items-center gap-1 font-bold text-[#183329]">
              <MapPin className="h-3.5 w-3.5 text-[#10B981]" />
              {nearestMunicipality
                ? nearestMunicipality.withinOrientalMindoro
                  ? `${nearestMunicipality.municipality.name} (~${nearestMunicipality.distanceKm} km from center)`
                  : `Outside Oriental Mindoro (Nearest: ${nearestMunicipality.municipality.name})`
                : 'Calculating...'}
            </p>
          </div>
        </div>
      ) : (
        <p className="flex items-center gap-1.5 text-[11px] text-[#183329]/70">
          <ShieldCheck className="h-3.5 w-3.5 text-[#24966A]" />
          Continuous browser GPS tracking runs only while this app tab remains open and tracking is
          active.
        </p>
      )}
    </GlassCard>
  );
}
