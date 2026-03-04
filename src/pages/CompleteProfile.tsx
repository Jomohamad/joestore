import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useStore } from '../context/StoreContext';
import { AlertCircle, CheckCircle, Loader, Upload } from 'lucide-react';
import { checkUsernameAvailabilityApi, completeProfileApi, fetchProfileStatus } from '../services/api';
import { supabase } from '../lib/supabase';

const USERNAME_REGEX = /^[A-Za-z0-9._-]{3,30}$/;

export default function CompleteProfile() {
  const navigate = useNavigate();
  const { user, profile, session, updateProfile, loading: authLoading } = useAuth();
  const { language } = useStore();

  const [loading, setLoading] = useState(false);
  const [checkingStatus, setCheckingStatus] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [usernameCheckLoading, setUsernameCheckLoading] = useState(false);
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);
  const [usernameSuggestions, setUsernameSuggestions] = useState<string[]>([]);
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

    void checkStatus();
  }, [user, navigate, authLoading]);

  useEffect(() => {
    if (!checkingStatus) return;
    const timeoutId = setTimeout(() => setCheckingStatus(false), 8000);
    return () => clearTimeout(timeoutId);
  }, [checkingStatus]);

  useEffect(() => {
    if (formData.username && formData.username.length >= 3) {
      void checkUsernameAvailability(formData.username);
    }
    // initial prefilled username check only
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const checkUsernameAvailability = async (username: string) => {
    const normalized = username.trim().toLowerCase();
    if (normalized.length < 3) {
      setUsernameAvailable(null);
      setUsernameSuggestions([]);
      return;
    }

    if (!USERNAME_REGEX.test(normalized)) {
      setUsernameAvailable(false);
      setUsernameSuggestions([]);
      return;
    }

    const currentUsername = String(profile?.username || user?.user_metadata?.username || '').trim().toLowerCase();
    if (currentUsername && normalized === currentUsername) {
      setUsernameAvailable(true);
      setUsernameSuggestions([]);
      return;
    }

    setUsernameCheckLoading(true);
    try {
      const data = await checkUsernameAvailabilityApi(username, session?.access_token);
      setUsernameAvailable(Boolean(data.available));
      setUsernameSuggestions(data.available ? [] : data.suggestions || []);
    } catch {
      setUsernameAvailable(null);
      setUsernameSuggestions([]);
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
    const value = e.target.value.replace(/[^A-Za-z0-9._-]/g, '').slice(0, 30);
    setFormData((prev) => ({ ...prev, username: value }));
    void checkUsernameAvailability(value);
    setError('');
  };

  const selectSuggestedUsername = (username: string) => {
    setFormData((prev) => ({ ...prev, username }));
    setUsernameSuggestions([]);
    setUsernameAvailable(true);
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError(language === 'ar' ? 'من فضلك اختر صورة صحيحة' : 'Please upload a valid image file');
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
        throw new Error(language === 'ar' ? 'كل الحقول مطلوبة' : 'All fields are required');
      }

      if (!USERNAME_REGEX.test(formData.username.trim())) {
        throw new Error(
          language === 'ar'
            ? 'اسم المستخدم يجب أن يكون من 3 إلى 30 حرفًا ويحتوي على حروف إنجليزية أو أرقام أو . أو _ أو -'
            : 'Username must be 3-30 chars and only use letters, numbers, dot, underscore, or hyphen',
        );
      }

      if (usernameAvailable === false) {
        throw new Error(language === 'ar' ? 'اسم المستخدم غير متاح' : 'Username is not available');
      }

      const uploadedAvatarUrl = await uploadAvatarIfNeeded();
      const finalAvatar = uploadedAvatarUrl || providerAvatar || undefined;

      await completeProfileApi({
        firstName: formData.firstName,
        lastName: formData.lastName,
        username: formData.username.trim(),
        email: formData.email,
        avatarUrl: finalAvatar,
        providerAvatarUrl: providerAvatar || undefined,
      });

      await updateProfile({
        first_name: formData.firstName,
        last_name: formData.lastName,
        username: formData.username.trim(),
        avatar_url: finalAvatar,
      });

      setSuccess(language === 'ar' ? 'تم حفظ بياناتك بنجاح، جاري التحويل...' : 'Profile completed successfully! Redirecting...');
      setTimeout(() => navigate('/'), 1000);
    } catch (err) {
      setError(err instanceof Error ? err.message : language === 'ar' ? 'فشل إكمال البيانات' : 'Failed to complete profile');
    } finally {
      setLoading(false);
    }
  };

  if (authLoading || checkingStatus) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-[60vh] bg-creo-bg">
        <div className="w-10 h-10 border-4 border-creo-accent/20 border-t-creo-accent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="flex-1 bg-creo-bg flex items-center justify-center py-10 px-4 sm:px-6">
      <div className="w-full max-w-md rounded-2xl border border-creo-border bg-creo-card shadow-2xl">
        <div className="p-7 border-b border-creo-border">
          <h2 className="text-3xl font-display font-bold text-white">{language === 'ar' ? 'إكمال البيانات' : 'Complete Your Profile'}</h2>
          <p className="mt-2 text-sm text-creo-text-sec">{language === 'ar' ? 'خطوة أخيرة للبدء' : 'Just a few more details to get started'}</p>
        </div>

        <div className="p-7">
          {error && (
            <div className="bg-red-500/10 border border-red-500/50 text-red-500 px-4 py-3 rounded-lg text-sm gap-2 flex items-center mb-4">
              <AlertCircle className="w-4 h-4" />
              {error}
            </div>
          )}

          {success && (
            <div className="bg-green-500/10 border border-green-500/50 text-green-500 px-4 py-3 rounded-lg text-sm gap-2 flex items-center mb-4">
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
                {language === 'ar' ? 'رفع' : 'Upload'}
                <input type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
              </label>
            </div>

            <div>
              <label className="block text-sm font-bold text-white mb-2">{language === 'ar' ? 'الاسم الأول' : 'First Name'}</label>
              <input
                type="text"
                name="firstName"
                value={formData.firstName}
                onChange={handleInputChange}
                required
                className="w-full bg-creo-bg-sec border border-creo-border rounded-lg px-4 py-3 text-creo-text focus:outline-none focus:ring-1 focus:ring-creo-accent focus:border-creo-accent transition-all"
                placeholder={language === 'ar' ? 'أحمد' : 'John'}
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-white mb-2">{language === 'ar' ? 'الاسم الأخير' : 'Last Name'}</label>
              <input
                type="text"
                name="lastName"
                value={formData.lastName}
                onChange={handleInputChange}
                required
                className="w-full bg-creo-bg-sec border border-creo-border rounded-lg px-4 py-3 text-creo-text focus:outline-none focus:ring-1 focus:ring-creo-accent focus:border-creo-accent transition-all"
                placeholder={language === 'ar' ? 'محمد' : 'Doe'}
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-white mb-2">{language === 'ar' ? 'اسم المستخدم' : 'Username'}</label>
              <div className="relative">
                <input
                  type="text"
                  name="username"
                  value={formData.username}
                  onChange={handleUsernameChange}
                  required
                  minLength={3}
                  maxLength={30}
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

              {formData.username.length > 0 && formData.username.length < 3 && (
                <p className="text-red-400 text-xs mt-1">{language === 'ar' ? 'الحد الأدنى 3 أحرف' : 'Minimum 3 characters'}</p>
              )}

              {formData.username.length >= 3 && !USERNAME_REGEX.test(formData.username) && (
                <p className="text-red-400 text-xs mt-1">
                  {language === 'ar'
                    ? 'المسموح: حروف إنجليزية، أرقام، . _ - فقط'
                    : 'Allowed: letters, numbers, dot, underscore, hyphen only'}
                </p>
              )}

              {!usernameCheckLoading && usernameAvailable === true && (
                <p className="text-green-400 text-xs mt-1">{language === 'ar' ? 'اسم المستخدم متاح' : 'Username is available'}</p>
              )}

              {!usernameCheckLoading && usernameAvailable === false && usernameSuggestions.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {usernameSuggestions.map((suggestion) => (
                    <button
                      key={suggestion}
                      type="button"
                      onClick={() => selectSuggestedUsername(suggestion)}
                      className="px-2.5 py-1 rounded-full text-xs bg-creo-bg-sec border border-creo-border hover:border-creo-accent text-creo-text"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-bold text-white mb-2">{language === 'ar' ? 'البريد الإلكتروني' : 'Email'}</label>
              <input
                type="email"
                name="email"
                value={formData.email}
                readOnly
                className="w-full bg-creo-bg-sec border border-creo-border rounded-lg px-4 py-3 text-creo-text/80"
              />
            </div>

            <button
              type="submit"
              disabled={loading || usernameAvailable === false || formData.username.length < 3}
              className="w-full bg-creo-accent hover:bg-creo-accent/90 text-black font-bold py-3 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-6"
            >
              {loading && <Loader className="w-4 h-4 animate-spin" />}
              {language === 'ar' ? 'متابعة' : 'Continue'}
            </button>
          </form>

          <p className="text-xs text-creo-text-sec text-center mt-5">
            {language === 'ar' ? 'بياناتك آمنة ومشفرة' : 'Your information is secure and encrypted'}
          </p>
        </div>
      </div>
    </div>
  );
}
