import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import type { AppRole, Profile } from '@/types/database';

interface AuthContextValue {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  role: AppRole;
  loading: boolean;
  isConfigured: boolean;
  isCommuter: boolean;
  isOperator: boolean;
  isAdmin: boolean;
  isSuperAdmin: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (input: {
    email: string;
    password: string;
    fullName: string;
    homeMunicipalityId?: string;
  }) => Promise<{ error: string | null; requiresEmailConfirmation: boolean }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [role, setRole] = useState<AppRole>('guest');
  const [loading, setLoading] = useState<boolean>(isSupabaseConfigured);

  const loadUserProfileAndRole = useCallback(async (uid: string) => {
    if (!supabase) return;
    try {
      const [{ data: profileData }, { data: roleData }] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', uid).maybeSingle(),
        supabase.from('user_roles').select('role').eq('user_id', uid).maybeSingle(),
      ]);

      setProfile((profileData as Profile) ?? null);
      setRole((roleData?.role as AppRole) ?? 'commuter');
    } catch {
      setRole('commuter');
    }
  }, []);

  const refreshProfile = useCallback(async () => {
    if (user) {
      await loadUserProfileAndRole(user.id);
    }
  }, [user, loadUserProfileAndRole]);

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) {
      setLoading(false);
      return;
    }

    let mounted = true;
    supabase.auth.getSession().then(async ({ data }) => {
      if (!mounted) return;
      setSession(data.session);
      setUser(data.session?.user ?? null);
      if (data.session?.user) {
        await loadUserProfileAndRole(data.session.user.id);
      } else {
        setProfile(null);
        setRole('guest');
      }
      setLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setUser(nextSession?.user ?? null);
      if (nextSession?.user) {
        loadUserProfileAndRole(nextSession.user.id);
      } else {
        setProfile(null);
        setRole('guest');
      }
      setLoading(false);
    });

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, [loadUserProfileAndRole]);

  const signIn = async (email: string, password: string) => {
    if (!supabase) {
      return {
        error:
          'Supabase backend is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to .env.',
      };
    }
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error ? error.message : null };
  };

  const signUp = async (input: {
    email: string;
    password: string;
    fullName: string;
    homeMunicipalityId?: string;
  }) => {
    if (!supabase) {
      return {
        error:
          'Supabase backend is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to .env.',
        requiresEmailConfirmation: false,
      };
    }

    const { data, error } = await supabase.auth.signUp({
      email: input.email,
      password: input.password,
      options: {
        emailRedirectTo: `${window.location.origin}/login`,
        data: {
          full_name: input.fullName,
        },
      },
    });

    if (error) {
      return { error: error.message, requiresEmailConfirmation: false };
    }

    if (data.user && input.homeMunicipalityId && data.session) {
      await supabase
        .from('profiles')
        .update({
          full_name: input.fullName,
          home_municipality_id: input.homeMunicipalityId,
        })
        .eq('id', data.user.id);
    }

    return {
      error: null,
      requiresEmailConfirmation: !data.session,
    };
  };

  const signOut = async () => {
    if (supabase) {
      await supabase.auth.signOut();
    }
    setSession(null);
    setUser(null);
    setProfile(null);
    setRole('guest');
  };

  const isSuperAdmin = role === 'super_administrator';
  const isAdmin = role === 'administrator' || isSuperAdmin;
  const isOperator = role === 'transport_operator' || isAdmin;
  const isCommuter = Boolean(user);

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        role,
        loading,
        isConfigured: isSupabaseConfigured,
        isCommuter,
        isOperator,
        isAdmin,
        isSuperAdmin,
        signIn,
        signUp,
        signOut,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
