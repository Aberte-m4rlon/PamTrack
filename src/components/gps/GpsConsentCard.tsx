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
                  ? 'bg-[#C9182B] text-white'
                  : 'bg-[#F8E7EA] text-[#B51224]'
              }`}
            >
              <span
                className={`h-2 w-2 rounded-full ${
                  trackingActive ? 'bg-white animate-pulse' : 'bg-[#C9182B]'
                }`}
              />
              {trackingActive
                ? 'Live GPS Active'
                : `Permission: ${permissionState}`}
            </span>
            {consentGranted && (
              <span className="text-[11px] font-semibold text-[#B51224]">
                Consent granted
              </span>
            )}
          </div>
          <h2 className="font-display text-base font-bold text-[#29262B]">
            Browser GPS Location Control
          </h2>
          {!compact && (
            <p className="text-xs text-[#343039] max-w-2xl">
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
        <div className="glass-pill-tile flex items-start gap-2 rounded-[20px] border-[#E9E5E8]/70 p-3 text-xs text-[#B51224]">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-[#C9182B]" />
          <span>{gpsError}</span>
        </div>
      )}

      {lowAccuracyWarning && currentPosition && (
        <div className="glass-pill-tile flex items-start gap-2 rounded-[20px] border-[#E9E5E8] p-3 text-xs text-[#B51224]">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-[#C9182B]" />
          <span>
            Low GPS accuracy (±{currentPosition.accuracyMeters} m). Move outdoors for a clearer fix.
          </span>
        </div>
      )}

      {currentPosition ? (
        <div className="glass-pill-tile grid gap-3 sm:grid-cols-3 rounded-[20px] p-3 text-xs">
          <div>
            <p className="font-bold uppercase text-[10px] text-[#777078]">Coordinates</p>
            <p className="font-mono font-bold text-[#29262B]">
              {currentPosition.latitude.toFixed(5)}°N, {currentPosition.longitude.toFixed(5)}°E
            </p>
          </div>
          <div>
            <p className="font-bold uppercase text-[10px] text-[#777078]">GPS Accuracy</p>
            <p className="font-bold text-[#C9182B]">±{currentPosition.accuracyMeters} meters</p>
          </div>
          <div>
            <p className="font-bold uppercase text-[10px] text-[#777078]">
              Detected Municipality
            </p>
            <p className="flex items-center gap-1 font-bold text-[#29262B]">
              <MapPin className="h-3.5 w-3.5 text-[#C9182B]" />
              {nearestMunicipality
                ? nearestMunicipality.withinOrientalMindoro
                  ? `${nearestMunicipality.municipality.name} (~${nearestMunicipality.distanceKm} km from center)`
                  : `Outside Oriental Mindoro (Nearest: ${nearestMunicipality.municipality.name})`
                : 'Calculating...'}
            </p>
          </div>
        </div>
      ) : (
        <p className="flex items-center gap-1.5 text-[11px] text-[#777078]">
          <ShieldCheck className="h-3.5 w-3.5 text-[#C9182B]" />
          Continuous browser GPS tracking runs only while this app tab remains open and tracking is
          active.
        </p>
      )}
    </GlassCard>
  );
}
