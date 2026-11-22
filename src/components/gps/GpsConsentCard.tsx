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
              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase transition-colors duration-200 ${
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
                ? 'Naka-on ang Live GPS'
                : `Pahintulot: ${permissionState}`}
            </span>
            {consentGranted && (
              <span className="text-[11px] font-semibold text-[#B51224]">
                May pahintulot na
              </span>
            )}
          </div>
          <h2 className="font-display text-base font-bold text-[#29262B]">
            Kontrol sa GPS Location
          </h2>
          {!compact && (
            <p className="text-xs text-[#343039] max-w-2xl">
              Ginagamit lang ito kapag hiniling mo para makita ang malalapit na sakayan at biyahe.
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
                {requesting ? 'Hinahanap...' : 'Alamin ang Lokasyon'}
              </GlassButton>
              <GlassButton
                type="button"
                variant="primary"
                size="sm"
                disabled={requesting || permissionState === 'unsupported'}
                onClick={() => startTracking()}
              >
                <LocateFixed className="h-3.5 w-3.5" />
                Simulan ang Tracking
              </GlassButton>
            </>
          ) : (
            <GlassButton type="button" variant="danger" size="sm" onClick={stopTracking}>
              <Square className="h-3.5 w-3.5 fill-current" />
              Ihinto ang Tracking
            </GlassButton>
          )}

          {consentGranted && (
            <GlassButton type="button" variant="ghost" size="sm" onClick={revokeConsent}>
              Alisin ang Pahintulot
            </GlassButton>
          )}
        </div>
      </div>

      {gpsError && (
        <div className="glass-pill-tile liquid-reveal-enter flex items-start gap-2 rounded-[20px] border-[#E9E5E8]/70 p-3 text-xs text-[#B51224]">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-[#C9182B]" />
          <span>{gpsError}</span>
        </div>
      )}

      {lowAccuracyWarning && currentPosition && (
        <div className="glass-pill-tile liquid-reveal-enter flex items-start gap-2 rounded-[20px] border-[#E9E5E8] p-3 text-xs text-[#B51224]">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-[#C9182B]" />
          <span>
            Mahina ang GPS signal (±{currentPosition.accuracyMeters} m). Lumabas muna sa mas bukas na lugar para mas tumpak.
          </span>
        </div>
      )}

      {currentPosition ? (
        <div className="glass-pill-tile liquid-reveal-enter grid gap-3 sm:grid-cols-3 rounded-[20px] p-3 text-xs">
          <div>
            <p className="font-bold uppercase text-[10px] text-[#777078]">Koordinado</p>
            <p className="font-mono font-bold text-[#29262B]">
              {currentPosition.latitude.toFixed(5)}°N, {currentPosition.longitude.toFixed(5)}°E
            </p>
          </div>
          <div>
            <p className="font-bold uppercase text-[10px] text-[#777078]">Katumpakan ng GPS</p>
            <p className="font-bold text-[#C9182B]">±{currentPosition.accuracyMeters} metro</p>
          </div>
          <div>
            <p className="font-bold uppercase text-[10px] text-[#777078]">
              Pinakamalapit na Bayan
            </p>
            <p className="flex items-center gap-1 font-bold text-[#29262B]">
              <MapPin className="h-3.5 w-3.5 text-[#C9182B]" />
              {nearestMunicipality
                ? nearestMunicipality.withinOrientalMindoro
                  ? `${nearestMunicipality.municipality.name} (~${nearestMunicipality.distanceKm} km mula sentro)`
                  : `Nasa labas ng Oriental Mindoro (Pinakamalapit: ${nearestMunicipality.municipality.name})`
                : 'Kinakalkula...'}
            </p>
          </div>
        </div>
      ) : (
        <p className="flex items-center gap-1.5 text-[11px] text-[#777078]">
          <ShieldCheck className="h-3.5 w-3.5 text-[#C9182B]" />
          Tuloy-tuloy na nag-ra-run ang GPS tracking habang bukas ang app at aktibo ang tracking.
        </p>
      )}
    </GlassCard>
  );
}
