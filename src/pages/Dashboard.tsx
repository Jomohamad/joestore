import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';

export default function Dashboard() {
  const { user, profile, loading } = useAuth();
  const [isAdminByTable, setIsAdminByTable] = useState(false);
  const [checkingAdmin, setCheckingAdmin] = useState(true);

  useEffect(() => {
    let active = true;
    const checkAdminMembership = async () => {
      if (!user?.id) {
        if (active) {
          setIsAdminByTable(false);
          setCheckingAdmin(false);
        }
        return;
      }

      const { data, error } = await supabase
        .from('admins')
        .select('user_id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!active) return;
      setIsAdminByTable(!error && Boolean(data?.user_id));
      setCheckingAdmin(false);
    };

    void checkAdminMembership();
    return () => {
      active = false;
    };
  }, [user?.id, profile?.is_admin]);

  if (loading || checkingAdmin) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-[60vh]">
        <div className="w-10 h-10 border-4 border-creo-accent/20 border-t-creo-accent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;

  const isAdmin = Boolean(profile?.is_admin || isAdminByTable);
  if (!isAdmin) return <Navigate to="/" replace />;

  return (
    <div className="flex-1 bg-creo-bg py-12 md:py-16">
      <div className="container mx-auto px-4">
        <div className="max-w-3xl bg-creo-card border border-creo-border rounded-2xl p-6 md:p-8">
          <h1 className="text-2xl md:text-4xl font-display font-bold text-white mb-3">Dashboard</h1>
          <p className="text-creo-text-sec">
            Admin access is enabled for this account. You can now add your own dashboard widgets and management tools.
          </p>
        </div>
      </div>
    </div>
  );
}
