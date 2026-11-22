import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Shield, Users } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { fetchUsersWithRoles, updateUserRoleAdmin } from '@/services/pamasaheApi';
import type { AppRole } from '@/types/database';
import {
  EmptyStateCard,
  GlassButton,
  GlassCard,
  GlassSkeleton,
} from '@/components/glass/GlassPrimitives';

const ASSIGNABLE_ROLES: AppRole[] = [
  'commuter',
  'transport_operator',
  'administrator',
  'super_administrator',
];

export function UserManagementPage() {
  const { isSuperAdmin, isConfigured } = useAuth();
  const { pushToast } = useToast();
  const queryClient = useQueryClient();

  const { data: users, isLoading } = useQuery({
    queryKey: ['adminUsers'],
    queryFn: fetchUsersWithRoles,
    enabled: isConfigured,
  });

  const [selectedRoleMap, setSelectedRoleMap] = useState<Record<string, AppRole>>({});

  const roleMutation = useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: AppRole }) =>
      updateUserRoleAdmin(userId, role, 'Updated via Admin User Management Console'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminUsers'] });
      queryClient.invalidateQueries({ queryKey: ['auditLogs'] });
      pushToast({ title: 'User role updated and audited', variant: 'success' });
    },
    onError: (err: Error) => {
      pushToast({ title: 'Role update denied', description: err.message, variant: 'error' });
    },
  });

  return (
    <div className="space-y-6">
      <GlassCard variant="strong" className="p-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-[#DC2626]">
            Identity &amp; Role-Based Access Control
          </p>
          <h1 className="font-display text-2xl font-extrabold text-[#24191D]">User Management</h1>
          <p className="text-sm text-[#78716C]">
            Role modifications are exclusively permitted for Super Administrators and enforced by
            PostgreSQL security functions.
          </p>
        </div>
        {!isSuperAdmin && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-900">
            <Shield className="h-3.5 w-3.5" /> Read-Only (Super Admin required to change roles)
          </span>
        )}
      </GlassCard>

      {isLoading ? (
        <GlassSkeleton className="h-64" />
      ) : !users || users.length === 0 ? (
        <EmptyStateCard
          icon={Users}
          title="No registered user profiles loaded"
          description="Registered Supabase Auth accounts appear here automatically."
        />
      ) : (
        <GlassCard variant="strong" className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-xs">
              <thead className="glass-table-head font-bold uppercase tracking-wider text-[#24191D]">
                <tr>
                  <th className="px-4 py-3">User</th>
                  <th className="px-4 py-3">Email</th>
                  <th className="px-4 py-3">Current Role</th>
                  <th className="px-4 py-3">Assign Role</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/60">
                {users.map((u) => {
                  const nextRole = selectedRoleMap[u.id] ?? u.role;
                  return (
                    <tr key={u.id} className="hover:bg-white/55 transition">
                      <td className="px-4 py-3 font-bold text-sm text-[#24191D]">
                        {u.full_name || 'Unnamed'}
                      </td>
                      <td className="px-4 py-3 text-[#78716C]">{u.email}</td>
                      <td className="px-4 py-3">
                        <span className="glass-pill-tile rounded-full px-3 py-0.5 font-bold uppercase text-[#DC2626]">
                          {u.role.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <select
                            disabled={!isSuperAdmin}
                            value={nextRole}
                            onChange={(e) =>
                              setSelectedRoleMap((prev) => ({
                                ...prev,
                                [u.id]: e.target.value as AppRole,
                              }))
                            }
                            className="glass-input rounded-xl px-2.5 py-1 text-xs"
                          >
                            {ASSIGNABLE_ROLES.map((r) => (
                              <option key={r} value={r}>
                                {r.replace('_', ' ')}
                              </option>
                            ))}
                          </select>
                          <GlassButton
                            type="button"
                            variant="primary"
                            size="sm"
                            disabled={!isSuperAdmin || nextRole === u.role || roleMutation.isPending}
                            onClick={() => roleMutation.mutate({ userId: u.id, role: nextRole })}
                          >
                            Save
                          </GlassButton>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </GlassCard>
      )}
    </div>
  );
}
