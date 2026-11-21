import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { ShieldAlert } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { EmptyStateCard, GlassButton, GlassSkeleton } from '@/components/glass/GlassPrimitives';
import { Link } from 'react-router-dom';

export function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="space-y-4">
        <GlassSkeleton className="h-24 w-full" />
        <GlassSkeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  return <>{children}</>;
}

export function RequireOperator({ children }: { children: React.ReactNode }) {
  const { user, loading, isOperator } = useAuth();
  const location = useLocation();

  if (loading) {
    return <GlassSkeleton className="h-48 w-full" />;
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  if (!isOperator) {
    return (
      <EmptyStateCard
        icon={ShieldAlert}
        title="Transport Operator Access Required"
        description="This area is reserved for authorized Transport Operators and Administrators. Database Row Level Security enforces these permissions on the backend."
        action={
          <Link to="/dashboard">
            <GlassButton variant="primary">Return to Commuter Dashboard</GlassButton>
          </Link>
        }
      />
    );
  }

  return <>{children}</>;
}

export function RequireAdmin({ children }: { children: React.ReactNode }) {
  const { user, loading, isAdmin } = useAuth();
  const location = useLocation();

  if (loading) {
    return <GlassSkeleton className="h-48 w-full" />;
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  if (!isAdmin) {
    return (
      <EmptyStateCard
        icon={ShieldAlert}
        title="Administrator Privileges Required"
        description="Your account does not hold an Administrator or Super Administrator role. All administrative mutations are also strictly guarded by PostgreSQL Row Level Security."
        action={
          <Link to="/dashboard">
            <GlassButton variant="primary">Go to Commuter Dashboard</GlassButton>
          </Link>
        }
      />
    );
  }

  return <>{children}</>;
}
