import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabase';
import { fetchProfileStatus } from '../services/api';

interface AdminProfile {
  id: string;
  email?: string;
  username?: string;
  is_admin?: boolean;
}

export const useAdminSession = () => {
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [profile, setProfile] = useState<AdminProfile | null>(null);

  useEffect(() => {
    let mounted = true;

    const check = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session) {
          if (mounted) {
            setAuthorized(false);
            setLoading(false);
          }
          return;
        }

        const status = await fetchProfileStatus();
        const isAdmin = Boolean(status?.profile?.is_admin);

        if (mounted) {
          setAuthorized(isAdmin);
          setProfile((status?.profile || null) as AdminProfile | null);
          setLoading(false);
        }
      } catch {
        if (mounted) {
          setAuthorized(false);
          setLoading(false);
        }
      }
    };

    void check();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      void check();
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const userLabel = useMemo(() => {
    if (!profile) return 'Admin';
    return profile.username || profile.email || 'Admin';
  }, [profile]);

  const signOut = async () => {
    await supabase.auth.signOut({ scope: 'local' });
    window.location.assign('/login');
  };

  return {
    loading,
    authorized,
    profile,
    userLabel,
    signOut,
  };
};
