import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Session, User } from '@supabase/supabase-js';
import { fetchProfileStatus } from '../services/api';

interface Profile {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  username: string;
  avatar_url?: string | null;
  provider_avatar_url?: string | null;
  onboarded?: boolean;
  is_admin?: boolean;
}

interface AuthContextType {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  updateProfile: (data: {
    first_name?: string;
    last_name?: string;
    username?: string;
    avatar_url?: string;
  }) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const isAuthPage = (pathname: string) => pathname === '/login' || pathname === '/signup';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const routeRunRef = useRef(0);

  const redirectTo = (path: string) => {
    const target = `${window.location.origin}${path}`;
    const current = `${window.location.origin}${window.location.pathname}${window.location.search}`;
    if (target !== current) {
      window.location.assign(path);
    }
  };

  const resolveAuthRouting = async (currentSession: Session | null) => {
    const runId = ++routeRunRef.current;

    if (!currentSession) return;

    const pathname = window.location.pathname;
    const intent = localStorage.getItem('auth_intent');

    try {
      const profileStatus = await fetchProfileStatus();
      setProfile((profileStatus.profile as Profile | undefined) ?? null);
      if (runId !== routeRunRef.current) return;

      if (intent === 'signup' && profileStatus.onboarded) {
        localStorage.removeItem('auth_intent');
        await supabase.auth.signOut({ scope: 'local' });
        redirectTo('/login?error=account_exists');
        return;
      }

      if ((intent === 'signup' || intent === 'login') && !profileStatus.onboarded) {
        localStorage.removeItem('auth_intent');
        if (pathname !== '/complete-profile') {
          redirectTo('/complete-profile');
        }
        return;
      }

      localStorage.removeItem('auth_intent');

      if (!profileStatus.onboarded) {
        if (pathname !== '/complete-profile') {
          redirectTo('/complete-profile?error=complete_profile_required');
        }
        return;
      }

      if (profileStatus.onboarded && (isAuthPage(pathname) || pathname === '/complete-profile')) {
        redirectTo('/');
      }
    } catch (error) {
      console.error('Auth routing resolution failed:', error);

      // Fallback routing when API is temporarily unavailable.
      const onboardedFallback = Boolean(currentSession?.user?.user_metadata?.onboarded);
      const pathname = window.location.pathname;
      const intent = localStorage.getItem('auth_intent');

      if (intent === 'signup' && onboardedFallback) {
        localStorage.removeItem('auth_intent');
        await supabase.auth.signOut({ scope: 'local' });
        redirectTo('/login?error=account_exists');
        return;
      }

      if ((intent === 'signup' || intent === 'login') && !onboardedFallback) {
        localStorage.removeItem('auth_intent');
        if (pathname !== '/complete-profile') {
          redirectTo('/complete-profile');
        }
        return;
      }

      if (!onboardedFallback && pathname !== '/complete-profile') {
        redirectTo('/complete-profile?error=complete_profile_required');
        return;
      }

      if (onboardedFallback && (isAuthPage(pathname) || pathname === '/complete-profile')) {
        redirectTo('/');
      }
    }
  };

  const refreshProfile = useCallback(async () => {
    if (!session) {
      setProfile(null);
      return;
    }

    try {
      const status = await fetchProfileStatus();
      setProfile((status.profile as Profile | undefined) ?? null);
    } catch {
      // Keep current profile to avoid UI flicker on temporary network issues.
    }
  }, [session]);

  useEffect(() => {
    let mounted = true;
    const loadingSafetyTimeout = window.setTimeout(() => {
      if (mounted) setLoading(false);
    }, 7000);

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!mounted) return;
      setSession(session);
      setUser(session?.user ?? null);
      if (!session) setProfile(null);
      if (mounted) setLoading(false);
      void resolveAuthRouting(session);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setUser(nextSession?.user ?? null);
      if (!nextSession) setProfile(null);
      setLoading(false);
      void resolveAuthRouting(nextSession);
    });

    return () => {
      mounted = false;
      window.clearTimeout(loadingSafetyTimeout);
      subscription.unsubscribe();
    };
  }, []);

  // Real-time profile updates
  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel(`profile:${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'users',
          filter: `id=eq.${user.id}`,
        },
        (payload) => {
          const updatedUser = payload.new as Record<string, unknown>;
          setProfile((prev) => ({
            ...(prev || {
              id: user.id,
              email: user.email || '',
              first_name: '',
              last_name: '',
              username: '',
              onboarded: true,
              is_admin: false,
            }),
            first_name: String(updatedUser.first_name || ''),
            last_name: String(updatedUser.last_name || ''),
            username: String(updatedUser.username || ''),
            avatar_url: updatedUser.avatar_url ? String(updatedUser.avatar_url) : null,
            email: String(updatedUser.email || user.email || ''),
            is_admin: Boolean(updatedUser.is_admin || false),
          }));
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [user?.id, user?.email]);

  useEffect(() => {
    if (!user?.id) return;
    void refreshProfile();

    const intervalId = window.setInterval(() => {
      if (document.visibilityState !== 'visible') return;
      void refreshProfile();
    }, 60000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [user?.id, refreshProfile]);

  const signOut = async () => {
    localStorage.removeItem('auth_intent');
    try {
      await supabase.auth.signOut({ scope: 'local' });
    } finally {
      setSession(null);
      setUser(null);
      setProfile(null);
    }
  };

  const updateProfile = async (data: {
    first_name?: string;
    last_name?: string;
    username?: string;
    avatar_url?: string;
  }) => {
    if (!user) throw new Error('No user logged in');

    const { error } = await supabase.auth.updateUser({
      data: {
        first_name: data.first_name,
        last_name: data.last_name,
        username: data.username,
        avatar_url: data.avatar_url,
        last_username_change: data.username ? new Date().toISOString() : undefined,
      },
    });

    if (error) throw error;

    const { data: { user: updatedUser } } = await supabase.auth.getUser();
    if (updatedUser) setUser(updatedUser);
    setProfile((prev) => ({
      ...(prev || {
        id: user.id,
        email: user.email || '',
        first_name: '',
        last_name: '',
        username: '',
        onboarded: true,
        is_admin: false,
      }),
      first_name: data.first_name ?? prev?.first_name ?? '',
      last_name: data.last_name ?? prev?.last_name ?? '',
      username: data.username ?? prev?.username ?? '',
      avatar_url: data.avatar_url ?? prev?.avatar_url ?? null,
      email: user.email || prev?.email || '',
      onboarded: true,
      is_admin: Boolean(prev?.is_admin),
    }));
  };

  const value = {
    session,
    user,
    profile,
    loading,
    signOut,
    refreshProfile,
    updateProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
