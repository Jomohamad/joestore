import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useStore } from '../context/StoreContext';
import { AlertCircle, CheckCircle, Loader, Upload } from 'lucide-react';
import { completeProfileApi, fetchProfileStatus } from '../services/api';
import { supabase } from '../lib/supabase';

export default function CompleteProfile() {
  const navigate = useNavigate();
  const { user, profile, session, updateProfile, loading: authLoading } = useAuth();
  const { t } = useStore();

  const [loading, setLoading] = useState(false);
  const [checkingStatus, setCheckingStatus] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [usernameCheckLoading, setUsernameCheckLoading] = useState(false);
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);

  const providerAvatar = profile?.provider_avatar_url || user?.user_metadata?.avatar_url || '';

  const [formData, setFormData] = useState({
    firstName: profile?.first_name || user?.user_metadata?.first_name || '',
    lastName: profile?.last_name || user?.user_metadata?.last_name || '',
    username: profile?.username || user?.user_metadata?.username || '',
    email: profile?.email || user?.email || '',
    avatarPreview: providerAvatar,
  });

  useEffect(() => {
    if (!user) return;
    setFormData((prev) => ({
      ...prev,
      firstName: profile?.first_name || user.user_metadata?.first_name || prev.firstName,
      lastName: profile?.last_name || user.user_metadata?.last_name || prev.lastName,
      username: profile?.username || user.user_metadata?.username || prev.username,
      email: profile?.email || user.email || prev.email,
      avatarPreview: prev.avatarPreview || profile?.avatar_url || user.user_metadata?.avatar_url || '',
    }));
  }, [user, profile]);

  useEffect(() => {
    const checkStatus = async () => {
      if (authLoading) return;

      if (!user) {
        setCheckingStatus(false);
        navigate('/login');
        return;
      }

      try {
        const status = await fetchProfileStatus();
        if (status.exists && status.onboarded) {
          navigate('/');
          return;
        }
      } catch (e) {
        console.error('Failed to verify profile status', e);
      } finally {
        setCheckingStatus(false);
      }
    };

    checkStatus();
  }, [user, navigate, authLoading]);

  useEffect(() => {
    if (!checkingStatus) return;
    const timeoutId = setTimeout(() => setCheckingStatus(false), 8000);
    return () => clearTimeout(timeoutId);
  }, [checkingStatus]);

  useEffect(() => {
    if (formData.username && formData.username.length >= 3) {
      checkUsernameAvailability(formData.username);
    }
    // Only run once for initial prefilled username.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const checkUsernameAvailability = async (username: string) => {
    if (!username || username.length < 3) {
      setUsernameAvailable(null);
      return;
    }

    setUsernameCheckLoading(true);
    try {
      const response = await fetch(`/api/check-username?username=${encodeURIComponent(username)}`, {
        headers: session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : undefined,
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.error || 'Username check failed');
      }

      const data = await response.json();
      setUsernameAvailable(Boolean(data.available));
    } catch {
      setUsernameAvailable(false);
    } finally {
      setUsernameCheckLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setError('');
  };

  const handleUsernameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setFormData((prev) => ({ ...prev, username: value }));
    checkUsernameAvailability(value);
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Please upload a valid image file');
      return;
    }

    setAvatarFile(file);
    setFormData((prev) => ({ ...prev, avatarPreview: URL.createObjectURL(file) }));
  };

  const uploadAvatarIfNeeded = async (): Promise<string | undefined> => {
    if (!user || !avatarFile) return undefined;

    const extension = avatarFile.name.split('.').pop() || 'jpg';
    const path = `${user.id}/avatar-${Date.now()}.${extension}`;

    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(path, avatarFile, { upsert: true, contentType: avatarFile.type });

    if (uploadError) throw uploadError;

    const { data } = supabase.storage.from('avatars').getPublicUrl(path);
    return data.publicUrl;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      if (!formData.firstName || !formData.lastName || !formData.username || !formData.email) {
        throw new Error('All fields are required');
      }

      if (formData.username.length < 3) {
        throw new Error('Username must be at least 3 characters');
      }

      if (!usernameAvailable) {
        throw new Error('Username is not available');
      }

      const uploadedAvatarUrl = await uploadAvatarIfNeeded();
      const finalAvatar = uploadedAvatarUrl || providerAvatar || undefined;

      await completeProfileApi({
        firstName: formData.firstName,
        lastName: formData.lastName,
        username: formData.username,
        email: formData.email,
        avatarUrl: finalAvatar,
        providerAvatarUrl: providerAvatar || undefined,
      });

      await updateProfile({
        first_name: formData.firstName,
        last_name: formData.lastName,
        username: formData.username,
        avatar_url: finalAvatar,
      });

      setSuccess('Profile completed successfully! Redirecting...');
      setTimeout(() => navigate('/'), 1000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to complete profile');
    } finally {
      setLoading(false);
    }
  };

  if (authLoading || checkingStatus) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-[60vh]">
        <div className="w-10 h-10 border-4 border-creo-accent/20 border-t-creo-accent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="flex-1 bg-creo-bg flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 bg-creo-card p-8 rounded-2xl border border-creo-border shadow-2xl">
        <div className="text-center">
          <h2 className="text-3xl font-display font-bold text-white">Complete Your Profile</h2>
          <p className="mt-2 text-sm text-creo-text-sec">Just a few more details to get started</p>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/50 text-red-500 px-4 py-3 rounded-lg text-sm gap-2 flex items-center">
            <AlertCircle className="w-4 h-4" />
            {error}
          </div>
        )}

        {success && (
          <div className="bg-green-500/10 border border-green-500/50 text-green-500 px-4 py-3 rounded-lg text-sm gap-2 flex items-center">
            <CheckCircle className="w-4 h-4" />
            {success}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex items-center gap-4">
            <img
              src={formData.avatarPreview || '/logo.png'}
              alt="Avatar preview"
              className="w-16 h-16 rounded-full object-cover border border-creo-border"
            />
            <label className="cursor-pointer inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-creo-bg-sec border border-creo-border text-sm hover:border-creo-accent transition-colors">
              <Upload className="w-4 h-4" />
              Upload
              <input type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
            </label>
          </div>

          <div>
            <label className="block text-sm font-bold text-white mb-2">First Name</label>
            <input
              type="text"
              name="firstName"
              value={formData.firstName}
              onChange={handleInputChange}
              required
              className="w-full bg-creo-bg-sec border border-creo-border rounded-lg px-4 py-3 text-creo-text focus:outline-none focus:ring-1 focus:ring-creo-accent focus:border-creo-accent transition-all"
              placeholder="John"
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-white mb-2">Last Name</label>
            <input
              type="text"
              name="lastName"
              value={formData.lastName}
              onChange={handleInputChange}
              required
              className="w-full bg-creo-bg-sec border border-creo-border rounded-lg px-4 py-3 text-creo-text focus:outline-none focus:ring-1 focus:ring-creo-accent focus:border-creo-accent transition-all"
              placeholder="Doe"
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-white mb-2">Email</label>
            <input
              type="email"
              name="email"
              value={formData.email}
              readOnly
              className="w-full bg-creo-bg-sec border border-creo-border rounded-lg px-4 py-3 text-creo-text/80"
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-white mb-2">Username</label>
            <div className="relative">
              <input
                type="text"
                name="username"
                value={formData.username}
                onChange={handleUsernameChange}
                required
                minLength={3}
                className="w-full bg-creo-bg-sec border border-creo-border rounded-lg px-4 py-3 text-creo-text focus:outline-none focus:ring-1 focus:ring-creo-accent focus:border-creo-accent transition-all pr-10"
                placeholder="johndoe"
              />
              {usernameCheckLoading && (
                <Loader className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-creo-accent animate-spin" />
              )}
              {!usernameCheckLoading && usernameAvailable === true && (
                <CheckCircle className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-green-500" />
              )}
              {!usernameCheckLoading && usernameAvailable === false && (
                <AlertCircle className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-red-500" />
              )}
            </div>
            {formData.username.length < 3 && formData.username.length > 0 && (
              <p className="text-red-400 text-xs mt-1">Username must be at least 3 characters</p>
            )}
          </div>

          <button
            type="submit"
            disabled={loading || !usernameAvailable || formData.username.length < 3}
            className="w-full bg-creo-accent hover:bg-creo-accent/90 text-black font-bold py-3 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-6"
          >
            {loading && <Loader className="w-4 h-4 animate-spin" />}
            Continue
          </button>
        </form>

        <p className="text-xs text-creo-text-sec text-center">Your information is secure and encrypted</p>
      </div>
    </div>
  );
}
