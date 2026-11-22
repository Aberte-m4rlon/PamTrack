import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { CheckCircle2, KeyRound, LogIn, MailCheck, UserPlus } from 'lucide-react';
import { z } from 'zod';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { useMunicipalities } from '@/hooks/useReferenceData';
import { supabase } from '@/lib/supabase';
import { loginSchema, registerSchema } from '@/lib/validation';
import { GlassButton, GlassCard } from '@/components/glass/GlassPrimitives';

type LoginFormValues = z.infer<typeof loginSchema>;
type RegisterFormValues = z.infer<typeof registerSchema>;

export function LoginPage() {
  const { signIn, isConfigured } = useAuth();
  const { pushToast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from || '/profile';

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (values: LoginFormValues) => {
    const { error } = await signIn(values.email, values.password);
    if (error) {
      pushToast({ title: 'Sign in failed', description: error, variant: 'error' });
      return;
    }
    pushToast({ title: 'Welcome back!', description: 'Signed in cleanly.', variant: 'success' });
    navigate(from, { replace: true });
  };

  return (
    <div className="mx-auto max-w-md min-h-[calc(100vh-14rem)] flex flex-col justify-center py-2 sm:py-6">
      <GlassCard variant="strong" className="p-5 sm:p-8 space-y-5 sm:space-y-6">
        <div className="text-center space-y-1.5 sm:space-y-2">
          <div className="mx-auto flex h-14 w-14 sm:h-16 sm:w-16 items-center justify-center rounded-full border-2 border-white/95 bg-white/75 p-1 shadow-md backdrop-blur-md">
            <img
              src="/assets/pamasahe-tracker-icon.png"
              alt="Pamasahe Tracker Logo"
              className="h-full w-full rounded-full object-contain"
            />
          </div>
          <h1 className="font-display text-xl sm:text-2xl font-extrabold text-[#29262B]">
            Sign In to Pamasahe Tracker
          </h1>
          <p className="text-xs text-[#343039] font-medium">
            Track live trips, use the GPS map, manage trusted contacts, and report fares.
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-[#343039]">
              Email Address
            </label>
            <input
              type="email"
              {...register('email')}
              placeholder="commuter@example.com"
              className="glass-input min-h-[42px] w-full rounded-2xl px-3.5 py-2.5 text-sm"
            />
            {errors.email && (
              <p className="mt-1 text-xs font-semibold text-[#C9182B]">{errors.email.message}</p>
            )}
          </div>

          <div>
            <div className="mb-1.5 flex items-center justify-between gap-2">
              <label className="text-xs font-bold uppercase tracking-wider text-[#343039]">
                Password
              </label>
              <Link
                to="/forgot-password"
                className="text-xs font-bold text-[#C9182B] hover:underline py-0.5"
              >
                Forgot password?
              </Link>
            </div>
            <input
              type="password"
              {...register('password')}
              placeholder="••••••••"
              className="glass-input min-h-[42px] w-full rounded-2xl px-3.5 py-2.5 text-sm"
            />
            {errors.password && (
              <p className="mt-1 text-xs font-semibold text-[#C9182B]">{errors.password.message}</p>
            )}
          </div>

          <GlassButton
            type="submit"
            variant="primary"
            className="w-full"
            disabled={isSubmitting || !isConfigured}
          >
            <LogIn className="h-4 w-4" />
            {isSubmitting ? 'Signing in...' : 'Sign In'}
          </GlassButton>
        </form>

        <p className="text-center text-xs text-[#343039]">
          Don&apos;t have an account yet?{' '}
          <Link
            to="/register"
            className="inline-flex min-h-[30px] items-center font-bold text-[#C9182B] hover:underline"
          >
            Register as Commuter
          </Link>
        </p>
      </GlassCard>
    </div>
  );
}

export function RegisterPage() {
  const { signUp, isConfigured } = useAuth();
  const { pushToast } = useToast();
  const { data: muniRes } = useMunicipalities();
  const municipalities = muniRes?.data ?? [];
  const navigate = useNavigate();
  const [confirmationSent, setConfirmationSent] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
  });

  const onSubmit = async (values: RegisterFormValues) => {
    const res = await signUp({
      email: values.email,
      password: values.password,
      fullName: values.fullName,
      homeMunicipalityId: values.homeMunicipalityId || undefined,
    });

    if (res.error) {
      pushToast({ title: 'Registration failed', description: res.error, variant: 'error' });
      return;
    }

    if (res.requiresEmailConfirmation) {
      setConfirmationSent(true);
      return;
    }

    pushToast({
      title: 'Account created',
      description: 'Welcome to Pamasahe Tracker – Oriental Mindoro!',
      variant: 'success',
    });
    navigate('/profile');
  };

  if (confirmationSent) {
    return (
      <div className="mx-auto max-w-md py-6">
        <GlassCard variant="strong" className="p-8 text-center space-y-4">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#F8E7EA] text-[#C9182B]">
            <MailCheck className="h-7 w-7" />
          </div>
          <h1 className="font-display text-2xl font-extrabold text-[#29262B]">
            Verify Your Email Address
          </h1>
          <p className="text-sm text-[#777078]">
            We sent a verification link to your inbox. Please confirm your email to activate your
            commuter account and submit fare reports.
          </p>
          <Link to="/login" className="inline-block">
            <GlassButton variant="primary">Proceed to Sign In</GlassButton>
          </Link>
        </GlassCard>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg py-2 sm:py-4">
      <GlassCard variant="strong" className="p-5 sm:p-8 space-y-5 sm:space-y-6">
        <div className="text-center space-y-1.5 sm:space-y-2">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border-2 border-white/95 bg-white/50 p-1 shadow-md backdrop-blur-md">
            <img
              src="/assets/pamasahe-tracker-icon.png"
              alt="Pamasahe Tracker Logo"
              className="h-full w-full rounded-full object-contain"
            />
          </div>
          <h1 className="font-display text-xl sm:text-2xl font-extrabold text-[#29262B]">
            Create Commuter Account
          </h1>
          <p className="text-xs text-[#777078]">
            Report observed fares, save Oriental Mindoro routes, and track official updates.
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-3.5 sm:space-y-4">
          <div>
            <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-[#777078]">
              Full Name
            </label>
            <input
              type="text"
              {...register('fullName')}
              placeholder="Juan Dela Cruz"
              className="glass-input min-h-[42px] w-full rounded-2xl px-3.5 py-2.5 text-sm"
            />
            {errors.fullName && (
              <p className="mt-1 text-xs font-semibold text-[#C9182B]">{errors.fullName.message}</p>
            )}
          </div>

          <div className="grid gap-3.5 sm:gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-[#777078]">
                Email Address
              </label>
              <input
                type="email"
                {...register('email')}
                placeholder="juan@example.com"
                className="glass-input min-h-[42px] w-full rounded-2xl px-3.5 py-2.5 text-sm"
              />
              {errors.email && (
                <p className="mt-1 text-xs font-semibold text-[#C9182B]">{errors.email.message}</p>
              )}
            </div>

            <div>
              <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-[#777078]">
                Home Municipality (Optional)
              </label>
              <select
                {...register('homeMunicipalityId')}
                className="glass-input min-h-[42px] w-full rounded-2xl px-3 py-2.5 text-sm"
              >
                <option value="">Select LGU...</option>
                {municipalities.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid gap-3.5 sm:gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-[#777078]">
                Password
              </label>
              <input
                type="password"
                {...register('password')}
                placeholder="Min 8 chars, 1 upper, 1 number"
                className="glass-input min-h-[42px] w-full rounded-2xl px-3.5 py-2.5 text-sm"
              />
              {errors.password && (
                <p className="mt-1 text-xs font-semibold text-[#C9182B]">{errors.password.message}</p>
              )}
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-[#777078]">
                Confirm Password
              </label>
              <input
                type="password"
                {...register('confirmPassword')}
                placeholder="Repeat password"
                className="glass-input min-h-[42px] w-full rounded-2xl px-3.5 py-2.5 text-sm"
              />
              {errors.confirmPassword && (
                <p className="mt-1 text-xs font-semibold text-[#C9182B]">
                  {errors.confirmPassword.message}
                </p>
              )}
            </div>
          </div>

          <label className="flex items-start gap-3 py-1 text-xs text-[#777078] cursor-pointer">
            <input
              type="checkbox"
              {...register('acceptTerms')}
              className="mt-0.5 h-5 w-5 shrink-0 rounded border-[#E9E5E8] accent-[#C9182B]"
            />
            <span className="leading-relaxed">
              I confirm my registration details are accurate and truthful for commuter fare tracking.
            </span>
          </label>
          {errors.acceptTerms && (
            <p className="text-xs font-semibold text-[#C9182B]">{errors.acceptTerms.message}</p>
          )}

          <GlassButton
            type="submit"
            variant="primary"
            className="w-full"
            disabled={isSubmitting || !isConfigured}
          >
            <UserPlus className="h-4 w-4" />
            {isSubmitting ? 'Creating account...' : 'Register Account'}
          </GlassButton>
        </form>

        <p className="text-center text-xs text-[#777078]">
          Already registered?{' '}
          <Link to="/login" className="inline-flex min-h-[34px] items-center font-bold text-[#C9182B] hover:underline">
            Sign In
          </Link>
        </p>
      </GlassCard>
    </div>
  );
}

export function ForgotPasswordPage() {
  const { pushToast } = useToast();
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase) {
      pushToast({ title: 'Supabase unconfigured', variant: 'error' });
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setSubmitting(false);
    if (error) {
      pushToast({ title: 'Reset error', description: error.message, variant: 'error' });
      return;
    }
    setSent(true);
  };

  return (
    <div className="mx-auto max-w-md py-6">
      <GlassCard variant="strong" className="p-6 sm:p-8 space-y-5">
        <div className="flex items-center gap-2 text-[#C9182B]">
          <KeyRound className="h-5 w-5" />
          <h1 className="font-display text-xl font-extrabold text-[#29262B]">
            Reset Your Password
          </h1>
        </div>
        {sent ? (
          <div className="space-y-3 text-sm text-[#343039]">
            <p className="flex items-center gap-2 font-bold text-[#C9182B]">
              <CheckCircle2 className="h-5 w-5" /> Reset email sent!
            </p>
            <p>Check your inbox for a password recovery link.</p>
          </div>
        ) : (
          <form onSubmit={handleReset} className="space-y-4">
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your registered email..."
              className="glass-input w-full rounded-2xl px-3.5 py-2.5 text-sm"
            />
            <GlassButton type="submit" variant="primary" className="w-full" disabled={submitting}>
              {submitting ? 'Sending link...' : 'Send Reset Link'}
            </GlassButton>
          </form>
        )}
      </GlassCard>
    </div>
  );
}

export function ResetPasswordPage() {
  const { pushToast } = useToast();
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase) return;
    if (password.length < 8) {
      pushToast({ title: 'Password must be at least 8 characters.', variant: 'error' });
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.auth.updateUser({ password });
    setSubmitting(false);
    if (error) {
      pushToast({ title: 'Update failed', description: error.message, variant: 'error' });
      return;
    }
    pushToast({ title: 'Password updated', description: 'You may now sign in.', variant: 'success' });
    navigate('/profile');
  };

  return (
    <div className="mx-auto max-w-md py-6">
      <GlassCard variant="strong" className="p-6 sm:p-8 space-y-5">
        <h1 className="font-display text-xl font-extrabold text-[#29262B]">
          Choose New Password
        </h1>
        <form onSubmit={handleUpdate} className="space-y-4">
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="New password (min 8 chars)"
            className="glass-input w-full rounded-2xl px-3.5 py-2.5 text-sm"
          />
          <GlassButton type="submit" variant="primary" className="w-full" disabled={submitting}>
            {submitting ? 'Updating...' : 'Save New Password'}
          </GlassButton>
        </form>
      </GlassCard>
    </div>
  );
}
