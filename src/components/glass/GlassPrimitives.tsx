import React from 'react';
import {
  AlertTriangle,
  Bike,
  Bus,
  BusFront,
  CarFront,
  CheckCircle2,
  Clock,
  Database,
  ShieldAlert,
  Truck,
  XCircle,
} from 'lucide-react';
import * as Dialog from '@radix-ui/react-dialog';
import { cn } from '@/lib/utils';
import { FARE_STATUS_META, REPORT_STATUS_META } from '@/lib/fareIntegrity';
import type { FareStatus, ReportStatus } from '@/types/database';

interface GlassCardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'panel' | 'surface' | 'strong' | 'green';
  hoverable?: boolean;
}

export function GlassCard({
  variant = 'surface',
  hoverable = false,
  className,
  children,
  ...props
}: GlassCardProps) {
  const variantClass =
    variant === 'panel'
      ? 'glass-panel'
      : variant === 'strong'
        ? 'glass-card-strong'
        : variant === 'green'
          ? 'glass-green-tint text-white'
          : 'glass-surface';

  return (
    <div
      className={cn(
        variantClass,
        'rounded-3xl transition-all duration-200',
        hoverable && 'hover:-translate-y-0.5 hover:shadow-glass-lg',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

interface GlassButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'emerald' | 'glass' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
}

export function GlassButton({
  variant = 'primary',
  size = 'md',
  className,
  children,
  ...props
}: GlassButtonProps) {
  const variantStyles: Record<NonNullable<GlassButtonProps['variant']>, string> = {
    primary:
      'bg-[#176B4B] hover:bg-[#13593e] text-white shadow-md shadow-[#176B4B]/25 border border-white/25',
    secondary:
      'bg-[#24966A] hover:bg-[#1e7f59] text-white shadow-md shadow-[#24966A]/20 border border-white/25',
    emerald:
      'bg-[#10B981] hover:bg-[#0ea271] text-white shadow-md shadow-emerald-600/20 border border-white/30',
    glass:
      'bg-white/60 hover:bg-white/85 text-[#183329] border border-white/75 backdrop-blur-md shadow-sm',
    danger:
      'bg-red-600 hover:bg-red-700 text-white border border-red-400/50 shadow-sm',
    ghost: 'bg-transparent hover:bg-white/40 text-[#183329]',
  };

  const sizeStyles: Record<NonNullable<GlassButtonProps['size']>, string> = {
    sm: 'px-3 py-1.5 text-xs rounded-xl',
    md: 'px-4 py-2.5 text-sm rounded-2xl',
    lg: 'px-6 py-3 text-base rounded-2xl',
  };

  return (
    <button
      className={cn(
        'inline-flex items-center justify-center gap-2 font-semibold transition-all duration-150 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50',
        variantStyles[variant],
        sizeStyles[size],
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}

export function FareStatusBadge({
  status,
  compact = false,
}: {
  status: FareStatus;
  compact?: boolean;
}) {
  const meta = FARE_STATUS_META[status];
  const Icon =
    status === 'verified_official'
      ? CheckCircle2
      : status === 'community_estimate'
        ? AlertTriangle
        : status === 'pending_verification'
          ? Clock
          : XCircle;

  return (
    <span
      title={meta.description}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-bold tracking-wide uppercase',
        meta.badgeClass
      )}
    >
      <Icon className="h-3.5 w-3.5 shrink-0" />
      <span>{compact ? meta.shortLabel : meta.label}</span>
    </span>
  );
}

export function ReportStatusBadge({ status }: { status: ReportStatus }) {
  const meta = REPORT_STATUS_META[status];
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide',
        meta.badgeClass
      )}
    >
      {meta.label}
    </span>
  );
}

export function TransportModeIcon({
  code,
  className = 'h-5 w-5',
}: {
  code?: string;
  className?: string;
}) {
  switch (code) {
    case 'jeepney':
      return <BusFront className={className} />;
    case 'tricycle':
      return <Bike className={className} />;
    case 'uv_express':
      return <CarFront className={className} />;
    case 'bus':
      return <Bus className={className} />;
    case 'multicab':
      return <Truck className={className} />;
    default:
      return <BusFront className={className} />;
  }
}

export function GlassSkeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'animate-pulse rounded-2xl bg-white/45 backdrop-blur-md border border-white/50',
        className
      )}
    />
  );
}

export function EmptyStateCard({
  icon: Icon = ShieldAlert,
  title,
  description,
  action,
}: {
  icon?: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <GlassCard variant="strong" className="p-8 text-center">
      <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#DFF7E8] text-[#176B4B] shadow-inner">
        <Icon className="h-6 w-6" />
      </div>
      <h3 className="text-base font-bold text-[#183329]">{title}</h3>
      <p className="mx-auto mt-1.5 max-w-md text-sm text-[#183329]/75">{description}</p>
      {action && <div className="mt-4 flex justify-center">{action}</div>}
    </GlassCard>
  );
}

export function SupabaseSetupBanner({ compact = false }: { compact?: boolean }) {
  return (
    <div
      className={cn(
        'glass-card-strong flex flex-col gap-3 rounded-2xl border border-amber-300/80 bg-amber-50/85 p-4 text-[#183329] sm:flex-row sm:items-center sm:justify-between',
        compact && 'p-3'
      )}
    >
      <div className="flex items-start gap-3">
        <div className="mt-0.5 rounded-xl bg-amber-400/30 p-2 text-[#176B4B]">
          <Database className="h-5 w-5" />
        </div>
        <div>
          <p className="text-sm font-bold">Supabase Backend Credentials Not Configured</p>
          <p className="text-xs text-[#183329]/80">
            Geospatial map coordinates for all 15 Oriental Mindoro municipalities and OSRM road
            routing are active. Add <code className="font-semibold">VITE_SUPABASE_URL</code> and{' '}
            <code className="font-semibold">VITE_SUPABASE_ANON_KEY</code> to{' '}
            <code className="font-semibold">.env</code> and run the SQL migrations in{' '}
            <code className="font-semibold">supabase/migrations/</code> to enable live authentication,
            official fare records, and reporting.
          </p>
        </div>
      </div>
    </div>
  );
}

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = 'Confirm',
  destructive = false,
  loading = false,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmLabel?: string;
  destructive?: boolean;
  loading?: boolean;
  onConfirm: () => void | Promise<void>;
}) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-[#183329]/45 backdrop-blur-sm" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[92vw] max-w-md -translate-x-1/2 -translate-y-1/2 glass-card-strong rounded-3xl p-6 shadow-2xl">
          <Dialog.Title className="text-lg font-bold text-[#183329]">{title}</Dialog.Title>
          <Dialog.Description className="mt-2 text-sm text-[#183329]/80">
            {description}
          </Dialog.Description>
          <div className="mt-6 flex justify-end gap-3">
            <GlassButton
              type="button"
              variant="glass"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </GlassButton>
            <GlassButton
              type="button"
              variant={destructive ? 'danger' : 'primary'}
              onClick={onConfirm}
              disabled={loading}
            >
              {loading ? 'Processing...' : confirmLabel}
            </GlassButton>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
