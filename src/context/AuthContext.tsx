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

  // Validate profile payload to prevent data integrity issues (A08 fix)
  // Strict validation with type checking and length limits
  const validateProfilePayload = (payload: unknown): Partial<Profile> | null => {
    // Must be a non-null object
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
      console.warn('[Security] Invalid payload type: expected object, got:', typeof payload);
      return null;
    }

    const data = payload as Record<string, unknown>;

    // Whitelist allowed fields - any additional fields will cause rejection
    const allowedFields = ['first_name', 'last_name', 'username', 'avatar_url', 'email', 'is_admin', 'onboarded', 'id', 'provider_avatar_url'];
    const payloadFields = Object.keys(data);

    // Strict check: reject if any unknown fields are present
    const unknownFields = payloadFields.filter(field => !allowedFields.includes(field));
    if (unknownFields.length > 0) {
      console.warn('[Security] Rejected payload with unknown fields:', unknownFields);
      return null;
    }

    const validatedPayload: Partial<Profile> = {};

    try {
      // Validate each field with strict type checking and length limits

      // first_name: string, max 100 chars
      if (data.first_name !== undefined && data.first_name !== null) {
        if (typeof data.first_name !== 'string') {
          console.warn('[Security] Invalid first_name type:', typeof data.first_name);
          return null;
        }
        validatedPayload.first_name = data.first_name.slice(0, 100).trim();
      }

      // last_name: string, max 100 chars
      if (data.last_name !== undefined && data.last_name !== null) {
        if (typeof data.last_name !== 'string') {
          console.warn('[Security] Invalid last_name type:', typeof data.last_name);
          return null;
        }
        validatedPayload.last_name = data.last_name.slice(0, 100).trim();
      }

      // username: string, max 50 chars
      if (data.username !== undefined && data.username !== null) {
        if (typeof data.username !== 'string') {
          console.warn('[Security] Invalid username type:', typeof data.username);
          return null;
        }
        validatedPayload.username = data.username.slice(0, 50).trim();
      }

      // avatar_url: string or null, max 500 chars, must be valid URL or null
      if (data.avatar_url !== undefined) {
        if (data.avatar_url === null) {
          validatedPayload.avatar_url = null;
        } else if (typeof data.avatar_url === 'string') {
          const url = data.avatar_url.slice(0, 500);
          // Basic URL validation - must start with http/https or be a relative path
          if (url && !url.startsWith('/') && !url.startsWith('http://') && !url.startsWith('https://')) {
            console.warn('[Security] Invalid avatar_url format');
            return null;
          }
          validatedPayload.avatar_url = url;
        } else {
          console.warn('[Security] Invalid avatar_url type:', typeof data.avatar_url);
          return null;
        }
      }

      // email: string, must be valid format, max 254 chars
      if (data.email !== undefined && data.email !== null) {
        if (typeof data.email !== 'string') {
          console.warn('[Security] Invalid email type:', typeof data.email);
          return null;
        }
        const email = data.email.slice(0, 254).trim().toLowerCase();
        // Basic email format validation
        if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
          console.warn('[Security] Invalid email format');
          return null;
        }
        validatedPayload.email = email;
      }

      // is_admin: boolean - strictly validate, default to false
      if (data.is_admin !== undefined && data.is_admin !== null) {
        if (typeof data.is_admin !== 'boolean') {
          console.warn('[Security] Invalid is_admin type:', typeof data.is_admin);
          return null;
        }
        validatedPayload.is_admin = data.is_admin;
      }

      // onboarded: boolean
      if (data.onboarded !== undefined && data.onboarded !== null) {
        if (typeof data.onboarded !== 'boolean') {
          console.warn('[Security] Invalid onboarded type:', typeof data.onboarded);
          return null;
        }
        validatedPayload.onboarded = data.onboarded;
      }

      // id: string (UUID format) - for completeness, but usually not updated
      if (data.id !== undefined && data.id !== null) {
        if (typeof data.id !== 'string') {
          console.warn('[Security] Invalid id type:', typeof data.id);
          return null;
        }
        // Validate UUID format
        if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(data.id)) {
          console.warn('[Security] Invalid id format (not UUID)');
          return null;
        }
      }

      return validatedPayload;
    } catch (error) {
      console.warn('[Security] Unexpected error during payload validation:', error);
      return null;
    }
  };

  // Real-time profile updates with data validation (A08 fix)
  useEffect(() => {
    if (!user?.id) return;

    // Obfuscate channel name to prevent user ID exposure (A01/A09 fix)
    // Use a random identifier that does not include the user id
    const channelId =
      (globalThis.crypto?.randomUUID ? globalThis.crypto.randomUUID() : `profile_${Math.random().toString(36).slice(2)}`)
        .replace(/[^a-zA-Z0-9]/g, '');
    const channel = supabase
      .channel(`profile_updates_${channelId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'users',
          filter: `id=eq.${user.id}`,
        },
        (payload) => {
          // Validate the incoming payload before processing (A08/CWE-502 fix)
          const validatedPayload = validateProfilePayload(payload.new);

          if (validatedPayload === null) {
            console.warn('[Security] Profile payload validation failed, ignoring update');
            return;
          }

          // Merge validated payload with existing profile, never trust raw data
          setProfile((prev) => {
            if (!prev) {
              // If no previous profile exists, create a minimal safe default
              return {
                id: user.id,
                email: user.email || '',
                first_name: validatedPayload.first_name ?? '',
                last_name: validatedPayload.last_name ?? '',
                username: validatedPayload.username ?? '',
                onboarded: validatedPayload.onboarded ?? true,
                is_admin: validatedPayload.is_admin ?? false,
              };
            }
            // Spread previous values first, then overlay validated new values
            return {
              ...prev,
              ...validatedPayload,
            };
          });
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
      try {
        const { data } = await supabase.auth.getSession();
        const accessToken = data.session?.access_token;
        if (accessToken) {
          await fetch('/api/auth/logout', {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ reason: 'user_initiated' }),
          });
        }
      } catch {
        // Ignore logging failures
      }
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
