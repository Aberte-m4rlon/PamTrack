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
                  ? 'bg-[#DC2626] text-white'
                  : 'bg-[#FFE4E6] text-[#B91C1C]'
              }`}
            >
              <span
                className={`h-2 w-2 rounded-full ${
                  trackingActive ? 'bg-white animate-pulse' : 'bg-[#DC2626]'
                }`}
              />
              {trackingActive
                ? 'Live GPS Active'
                : `Permission: ${permissionState}`}
            </span>
            {consentGranted && (
              <span className="text-[11px] font-semibold text-[#B91C1C]">
                Consent granted
              </span>
            )}
          </div>
          <h2 className="font-display text-base font-bold text-[#24191D]">
            Browser GPS Location Control
          </h2>
          {!compact && (
            <p className="text-xs text-[#4B3B40] max-w-2xl">
              Used only when requested for nearby stops and trip checks.
            </p>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          {!trackingActive ? (
            <>
              <GlassButton
                type="button"
                variant="secondary"
                size="sm"
                disabled={requesting || permissionState === 'unsupported'}
                onClick={() => requestSingleFix(true)}
              >
                <LocateFixed className="h-3.5 w-3.5" />
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
        <div className="glass-pill-tile flex items-start gap-2 rounded-[20px] border-[#FCA5A5]/70 p-3 text-xs text-[#B91C1C]">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-[#DC2626]" />
          <span>{gpsError}</span>
        </div>
      )}

      {lowAccuracyWarning && currentPosition && (
        <div className="glass-pill-tile flex items-start gap-2 rounded-[20px] border-[#FECDD3] p-3 text-xs text-[#B91C1C]">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-[#DC2626]" />
          <span>
            Low GPS accuracy (±{currentPosition.accuracyMeters} m). Move outdoors for a clearer fix.
          </span>
        </div>
      )}

      {currentPosition ? (
        <div className="glass-pill-tile grid gap-3 sm:grid-cols-3 rounded-[20px] p-3 text-xs">
          <div>
            <p className="font-bold uppercase text-[10px] text-[#78716C]">Coordinates</p>
            <p className="font-mono font-bold text-[#24191D]">
              {currentPosition.latitude.toFixed(5)}°N, {currentPosition.longitude.toFixed(5)}°E
            </p>
          </div>
          <div>
            <p className="font-bold uppercase text-[10px] text-[#78716C]">GPS Accuracy</p>
            <p className="font-bold text-[#DC2626]">±{currentPosition.accuracyMeters} meters</p>
          </div>
          <div>
            <p className="font-bold uppercase text-[10px] text-[#78716C]">
              Detected Municipality
            </p>
            <p className="flex items-center gap-1 font-bold text-[#24191D]">
              <MapPin className="h-3.5 w-3.5 text-[#DC2626]" />
              {nearestMunicipality
                ? nearestMunicipality.withinOrientalMindoro
                  ? `${nearestMunicipality.municipality.name} (~${nearestMunicipality.distanceKm} km from center)`
                  : `Outside Oriental Mindoro (Nearest: ${nearestMunicipality.municipality.name})`
                : 'Calculating...'}
            </p>
          </div>
        </div>
      ) : (
        <p className="flex items-center gap-1.5 text-[11px] text-[#78716C]">
          <ShieldCheck className="h-3.5 w-3.5 text-[#DC2626]" />
          Continuous browser GPS tracking runs only while this app tab remains open and tracking is
          active.
        </p>
      )}
    </GlassCard>
  );
}
