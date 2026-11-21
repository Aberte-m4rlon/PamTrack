import React from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  Bike,
  Bus,
  BusFront,
  CarFront,
  CheckCircle2,
  ChevronRight,
  Clock,
  Database,
  ShieldAlert,
  Truck,
  X,
  XCircle,
} from 'lucide-react';
import * as Dialog from '@radix-ui/react-dialog';
import { cn } from '@/lib/utils';
import { FARE_STATUS_META, REPORT_STATUS_META } from '@/lib/fareIntegrity';
import type { FareStatus, ReportStatus } from '@/types/database';

interface GlassCardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'panel' | 'surface' | 'strong' | 'rose' | 'green';
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
        : variant === 'rose' || variant === 'green'
          ? 'glass-rose-tint text-white'
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
      'bg-gradient-to-r from-[#DC2626] to-[#B91C1C] hover:from-[#B91C1C] hover:to-[#991B1B] text-white shadow-md shadow-[#DC2626]/25 border border-white/30 backdrop-blur-md',
    secondary:
      'bg-white/65 hover:bg-white/85 text-[#DC2626] border border-white/85 backdrop-blur-xl shadow-sm',
    emerald:
      'bg-white/85 hover:bg-white text-[#B91C1C] border border-white/95 backdrop-blur-xl shadow-md',
    glass:
      'bg-white/55 hover:bg-white/80 text-[#24191D] border border-white/85 backdrop-blur-xl shadow-sm',
    danger:
      'bg-[#FEE2E2]/80 hover:bg-[#FECACA]/90 text-[#B91C1C] border border-[#FCA5A5]/80 backdrop-blur-md shadow-sm',
    ghost: 'bg-transparent hover:bg-white/45 text-[#24191D]',
  };

  const sizeStyles: Record<NonNullable<GlassButtonProps['size']>, string> = {
    sm: 'px-3.5 py-2 text-xs rounded-xl min-h-[36px]',
    md: 'px-4 py-2.5 text-sm rounded-2xl min-h-[42px]',
    lg: 'px-6 py-3 text-base rounded-2xl min-h-[48px]',
  };

  return (
    <button
      className={cn(
        'inline-flex items-center justify-center gap-2 font-semibold transition-all duration-150 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#DC2626] focus-visible:ring-offset-1 disabled:pointer-events-none disabled:opacity-55',
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

export function PrimaryButton(props: Omit<GlassButtonProps, 'variant'>) {
  return <GlassButton variant="primary" {...props} />;
}

export function SecondaryButton(props: Omit<GlassButtonProps, 'variant'>) {
  return <GlassButton variant="secondary" {...props} />;
}

export const GlassInput = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(({ className, ...props }, ref) => (
  <input
    ref={ref}
    className={cn('glass-input w-full rounded-2xl px-3.5 py-2.5 text-sm', className)}
    {...props}
  />
));
GlassInput.displayName = 'GlassInput';

export const GlassSelect = React.forwardRef<
  HTMLSelectElement,
  React.SelectHTMLAttributes<HTMLSelectElement>
>(({ className, children, ...props }, ref) => (
  <select
    ref={ref}
    className={cn('glass-input w-full rounded-2xl px-3.5 py-2.5 text-sm font-medium', className)}
    {...props}
  >
    {children}
  </select>
));
GlassSelect.displayName = 'GlassSelect';

export function PageHeader({
  eyebrow,
  title,
  description,
  breadcrumbs,
  actions,
  variant = 'strong',
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  breadcrumbs?: Array<{ label: string; to?: string }>;
  actions?: React.ReactNode;
  variant?: 'strong' | 'surface' | 'rose';
}) {
  const isRose = variant === 'rose';
  return (
    <GlassCard
      variant={variant}
      className="p-5 sm:p-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
    >
      <div className="space-y-1.5">
        {breadcrumbs && breadcrumbs.length > 0 && (
          <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-1 text-xs font-semibold">
            {breadcrumbs.map((b, i) => (
              <React.Fragment key={b.label}>
                {i > 0 && (
                  <ChevronRight
                    className={cn('h-3.5 w-3.5', isRose ? 'text-white/70' : 'text-[#A8A29E]')}
                  />
                )}
                {b.to ? (
                  <Link
                    to={b.to}
                    className={cn(
                      'hover:underline',
                      isRose ? 'text-[#FFE4E6]' : 'text-[#DC2626]'
                    )}
                  >
                    {b.label}
                  </Link>
                ) : (
                  <span className={isRose ? 'text-white/90' : 'text-[#78716C]'}>{b.label}</span>
                )}
              </React.Fragment>
            ))}
          </nav>
        )}
        {eyebrow && (
          <p
            className={cn(
              'text-xs font-bold uppercase tracking-widest',
              isRose ? 'text-[#FFE4E6]' : 'text-[#DC2626]'
            )}
          >
            {eyebrow}
          </p>
        )}
        <h1
          className={cn(
            'font-display text-2xl font-extrabold sm:text-3xl',
            isRose ? 'text-white' : 'text-[#24191D]'
          )}
        >
          {title}
        </h1>
        {description && (
          <p className={cn('text-xs sm:text-sm max-w-3xl', isRose ? 'text-[#FFE4E6]/90' : 'text-[#78716C]')}>
            {description}
          </p>
        )}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2 shrink-0">{actions}</div>}
    </GlassCard>
  );
}

export function StatCard({
  label,
  value,
  sublabel,
  icon: Icon,
  to,
  tone = 'red',
}: {
  label: string;
  value: string | number;
  sublabel?: string;
  icon?: React.ComponentType<{ className?: string }>;
  to?: string;
  tone?: 'red' | 'success' | 'warning' | 'info' | 'neutral';
}) {
  const valueTone =
    tone === 'success'
      ? 'text-[#16A34A]'
      : tone === 'warning'
        ? 'text-amber-600'
        : tone === 'info'
          ? 'text-[#2563EB]'
          : tone === 'neutral'
            ? 'text-[#24191D]'
            : 'text-[#DC2626]';

  const content = (
    <GlassCard variant="strong" hoverable={Boolean(to)} className="p-4 flex items-center justify-between gap-3 h-full">
      <div className="min-w-0">
        <p className="text-[11px] font-bold uppercase tracking-wider text-[#78716C] truncate">
          {label}
        </p>
        <p className={cn('mt-1 font-display text-2xl font-extrabold', valueTone)}>{value}</p>
        {sublabel && <p className="mt-0.5 text-xs font-semibold text-[#78716C]">{sublabel}</p>}
      </div>
      {Icon && (
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#FFE4E6] text-[#DC2626] border border-[#FCA5A5]/45">
          <Icon className="h-5 w-5" />
        </div>
      )}
    </GlassCard>
  );

  return to ? <Link to={to} className="block h-full">{content}</Link> : content;
}

export function StatusBadge({
  tone = 'red',
  children,
  className,
}: {
  tone?: 'red' | 'success' | 'warning' | 'info' | 'neutral';
  children: React.ReactNode;
  className?: string;
}) {
  const styles =
    tone === 'success'
      ? 'bg-[#16A34A] text-white border border-green-400/60'
      : tone === 'warning'
        ? 'bg-amber-400 text-[#24191D] border border-amber-300'
        : tone === 'info'
          ? 'bg-[#2563EB] text-white border border-blue-400/60'
          : tone === 'neutral'
            ? 'bg-stone-500 text-white border border-stone-300/60'
            : 'bg-[#FFE4E6] text-[#B91C1C] border border-[#FCA5A5]/75';

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide',
        styles,
        className
      )}
    >
      {children}
    </span>
  );
}

export function ResponsiveTable({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'glass-card-strong overflow-x-auto rounded-3xl border border-white/85',
        className
      )}
    >
      {children}
    </div>
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
        'animate-pulse rounded-2xl bg-white/45 backdrop-blur-xl border border-white/75',
        className
      )}
    />
  );
}

export const LoadingState = GlassSkeleton;

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
      <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#FFE4E6] text-[#DC2626] border border-[#FCA5A5]/50 shadow-inner">
        <Icon className="h-6 w-6" />
      </div>
      <h3 className="text-base font-bold text-[#24191D]">{title}</h3>
      <p className="mx-auto mt-1.5 max-w-md text-sm text-[#78716C]">{description}</p>
      {action && <div className="mt-4 flex justify-center">{action}</div>}
    </GlassCard>
  );
}

export const EmptyState = EmptyStateCard;

export function SupabaseSetupBanner({ compact = false }: { compact?: boolean }) {
  return (
    <div
      className={cn(
        'glass-card-strong flex flex-col gap-3 rounded-2xl border border-amber-300/80 bg-amber-50/90 p-4 text-[#24191D] sm:flex-row sm:items-center sm:justify-between',
        compact && 'p-3'
      )}
    >
      <div className="flex items-start gap-3">
        <div className="mt-0.5 rounded-xl bg-amber-400/30 p-2 text-[#B91C1C]">
          <Database className="h-5 w-5" />
        </div>
        <div>
          <p className="text-sm font-bold">Supabase Backend Credentials Not Configured</p>
          <p className="text-xs text-[#78716C]">
            Geospatial map coordinates for all 15 Oriental Mindoro municipalities and OSRM road
            routing are active. Add <code className="font-semibold text-[#24191D]">VITE_SUPABASE_URL</code> and{' '}
            <code className="font-semibold text-[#24191D]">VITE_SUPABASE_ANON_KEY</code> to{' '}
            <code className="font-semibold text-[#24191D]">.env</code> and run the SQL migrations in{' '}
            <code className="font-semibold text-[#24191D]">supabase/migrations/</code> to enable live authentication,
            official fare records, and reporting.
          </p>
        </div>
      </div>
    </div>
  );
}

export function GlassModal({
  open,
  onOpenChange,
  title,
  description,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-[#24191D]/35 backdrop-blur-sm" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[92vw] max-w-lg -translate-x-1/2 -translate-y-1/2 glass-card-strong rounded-3xl p-6 shadow-2xl border border-white/90">
          <div className="flex items-start justify-between gap-3">
            <div>
              <Dialog.Title className="font-display text-lg font-bold text-[#24191D]">
                {title}
              </Dialog.Title>
              {description && (
                <Dialog.Description className="mt-1 text-sm text-[#78716C]">
                  {description}
                </Dialog.Description>
              )}
            </div>
            <Dialog.Close asChild>
              <button
                type="button"
                aria-label="Close modal"
                className="rounded-xl p-1.5 text-[#78716C] hover:bg-[#FFE4E6] hover:text-[#DC2626] transition"
              >
                <X className="h-4 w-4" />
              </button>
            </Dialog.Close>
          </div>
          <div className="mt-4">{children}</div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
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
    <GlassModal open={open} onOpenChange={onOpenChange} title={title} description={description}>
      <div className="mt-2 flex flex-wrap justify-end gap-3">
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
    </GlassModal>
  );
}
