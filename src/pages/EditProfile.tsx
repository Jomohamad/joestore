import React, { useEffect, useState } from 'react';
import { useNavigate } from '../lib/router';
import { AlertCircle, CheckCircle, Loader, Upload } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { checkUsernameAvailabilityApi, completeProfileApi } from '../services/api';
import { supabase } from '../lib/supabase';
import { useStore } from '../context/StoreContext';

const USERNAME_REGEX = /^[A-Za-z0-9._-]{3,30}$/;

export default function EditProfile() {
  const navigate = useNavigate();
  const { user, profile, session, updateProfile, loading: authLoading } = useAuth();
  const { language } = useStore();

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [usernameCheckLoading, setUsernameCheckLoading] = useState(false);
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);
  const [usernameSuggestions, setUsernameSuggestions] = useState<string[]>([]);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [isFormDirty, setIsFormDirty] = useState(false);

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    username: '',
    email: '',
    avatarPreview: '',
  });

  useEffect(() => {
    if (!user) return;
    if (isFormDirty) return;

    setFormData((prev) => ({
      ...prev,
      firstName: profile?.first_name || user.user_metadata?.first_name || '',
      lastName: profile?.last_name || user.user_metadata?.last_name || '',
      username: profile?.username || user.user_metadata?.username || '',
      email: profile?.email || user.email || '',
      avatarPreview: prev.avatarPreview || profile?.avatar_url || user.user_metadata?.avatar_url || '',
    }));
  }, [user, profile, isFormDirty]);

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
    setIsFormDirty(true);
    setFormData((prev) => ({ ...prev, [name]: value }));
    setError('');
  };

  const handleUsernameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/[^A-Za-z0-9._-]/g, '').slice(0, 30);
    setIsFormDirty(true);
    setFormData((prev) => ({ ...prev, username: value }));
    checkUsernameAvailability(value);
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
    setIsFormDirty(true);
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
    if (!user) return;

    setSubmitting(true);
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

      const submittedUsername = formData.username.trim();
      const existingUsername = String(profile?.username || user.user_metadata?.username || '').trim();
      const usernameChanged = submittedUsername.toLowerCase() !== existingUsername.toLowerCase();

      if (usernameChanged && usernameAvailable === false) {
        throw new Error(language === 'ar' ? 'اسم المستخدم غير متاح' : 'Username is not available');
      }

      const uploadedAvatarUrl = await uploadAvatarIfNeeded();
      const finalAvatar = uploadedAvatarUrl || formData.avatarPreview || user.user_metadata?.avatar_url || undefined;

      await completeProfileApi({
        firstName: formData.firstName,
        lastName: formData.lastName,
        username: submittedUsername,
        email: formData.email,
        avatarUrl: finalAvatar,
        providerAvatarUrl: profile?.provider_avatar_url || user.user_metadata?.avatar_url || undefined,
      });

      await updateProfile({
        first_name: formData.firstName,
        last_name: formData.lastName,
        username: submittedUsername,
        avatar_url: finalAvatar,
      });

      setSuccess(language === 'ar' ? 'تم تحديث الملف الشخصي بنجاح' : 'Profile updated successfully');
      setTimeout(() => navigate('/'), 900);
    } catch (err) {
      setError(err instanceof Error ? err.message : language === 'ar' ? 'فشل تحديث الملف الشخصي' : 'Failed to update profile');
    } finally {
      setSubmitting(false);
    }
  };

  if (authLoading) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-[60vh]">
        <div className="w-10 h-10 border-4 border-creo-accent/20 border-t-creo-accent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-creo-accent mx-auto mb-4" />
          <p className="text-creo-text-sec mb-6">{language === 'ar' ? 'سجّل الدخول لتعديل ملفك الشخصي' : 'Please login to edit your profile'}</p>
          <button
            onClick={() => navigate('/login')}
            className="px-6 py-3 bg-creo-accent hover:bg-creo-accent/90 text-black font-bold rounded-xl transition-colors"
          >
            {language === 'ar' ? 'تسجيل الدخول' : 'Log in'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 bg-creo-bg py-10 md:py-14">
      <div className="container mx-auto px-4 max-w-3xl">
        <h1 className="text-[clamp(1.4rem,4vw,2.4rem)] font-display font-bold text-white mb-6">{language === 'ar' ? 'تعديل الملف الشخصي' : 'Edit Profile'}</h1>

        {error && (
          <div className="mb-5 rounded-xl border border-red-500/50 bg-red-500/10 px-4 py-3 text-sm text-red-300 flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            {error}
          </div>
        )}

        {success && (
          <div className="mb-5 rounded-xl border border-green-500/50 bg-green-500/10 px-4 py-3 text-sm text-green-300 flex items-center gap-2">
            <CheckCircle className="w-4 h-4" />
            {success}
          </div>
        )}

        <div className="bg-creo-card border border-creo-border rounded-2xl p-5 md:p-7">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="flex items-center gap-4">
              <img
                src={formData.avatarPreview || '/logo.png'}
                alt="Avatar preview"
                className="w-16 h-16 md:w-20 md:h-20 rounded-full object-cover border border-creo-border"
              />
              <label className="cursor-pointer inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-creo-bg-sec border border-creo-border text-sm hover:border-creo-accent transition-colors">
                <Upload className="w-4 h-4" />
                {language === 'ar' ? 'رفع صورة' : 'Upload photo'}
                <input type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
              </label>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-white mb-2">{language === 'ar' ? 'الاسم الأول' : 'First Name'}</label>
                <input
                  type="text"
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleInputChange}
                  required
                  className="w-full bg-creo-bg-sec border border-creo-border rounded-lg px-4 py-3 text-creo-text focus:outline-none focus:ring-1 focus:ring-creo-accent focus:border-creo-accent transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-white mb-2">{language === 'ar' ? 'الاسم الأخير' : 'Last Name'}</label>
                <input
                  type="text"
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleInputChange}
                  required
                  className="w-full bg-creo-bg-sec border border-creo-border rounded-lg px-4 py-3 text-creo-text focus:outline-none focus:ring-1 focus:ring-creo-accent focus:border-creo-accent transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-white mb-2">{language === 'ar' ? 'اسم المستخدم' : 'Username'}</label>

              <div className="relative">
                <input
                  type="text"
                  name="username"
                  value={formData.username}
                  onChange={handleUsernameChange}
                  minLength={3}
                  maxLength={30}
                  className="w-full bg-creo-bg-sec border border-creo-border rounded-lg px-4 py-3 pr-10 text-creo-text focus:outline-none focus:ring-1 focus:ring-creo-accent focus:border-creo-accent transition-all"
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
              <label className="block text-sm font-semibold text-white mb-2">{language === 'ar' ? 'البريد الإلكتروني' : 'Email'}</label>
              <input
                type="email"
                value={formData.email}
                readOnly
                className="w-full bg-creo-bg-sec border border-creo-border rounded-lg px-4 py-3 text-creo-text/80"
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-creo-accent hover:bg-creo-accent/90 text-black font-bold py-3 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {submitting && <Loader className="w-4 h-4 animate-spin" />}
              {language === 'ar' ? 'حفظ التعديلات' : 'Save Changes'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
