import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useStore } from '../context/StoreContext';
import { AlertCircle, CheckCircle, Loader } from 'lucide-react';

export default function EditProfile() {
  const navigate = useNavigate();
  const { user, session, updateProfile } = useAuth();
  const { t } = useStore();
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [usernameCheckLoading, setUsernameCheckLoading] = useState(false);
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [deleteUsername, setDeleteUsername] = useState('');
  
  const [formData, setFormData] = useState({
    firstName: user?.user_metadata?.first_name || '',
    lastName: user?.user_metadata?.last_name || '',
    username: user?.user_metadata?.username || '',
    avatar: user?.user_metadata?.avatar_url || '',
  });

  const [lastUsernameChange] = useState<Date | null>(
    user?.user_metadata?.last_username_change ? new Date(user.user_metadata.last_username_change) : null
  );
  
  const canChangeUsername = !lastUsernameChange || 
    new Date().getTime() - lastUsernameChange.getTime() > 6 * 30 * 24 * 60 * 60 * 1000;

  if (!user) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-creo-accent mx-auto mb-4" />
          <p className="text-creo-text-sec mb-6">{t('login_required')}</p>
          <button
            onClick={() => navigate('/login')}
            className="px-6 py-3 bg-creo-accent hover:bg-creo-accent/90 text-black font-bold rounded-xl transition-colors"
          >
            {t('login')}
          </button>
        </div>
      </div>
    );
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setError('');
  };

  const checkUsernameAvailability = async (username: string) => {
    if (!username || username.length < 3) {
      setUsernameAvailable(null);
      return;
    }
    
    setUsernameCheckLoading(true);
    try {
      const response = await fetch(`/api/check-username?username=${encodeURIComponent(username)}`, {
        headers: session?.access_token
          ? { Authorization: `Bearer ${session.access_token}` }
          : undefined,
      });
      if (!response.ok) throw new Error('Username check failed');

      const data = await response.json();
      setUsernameAvailable(Boolean(data.available));
    } catch (err) {
      setUsernameAvailable(false);
    } finally {
      setUsernameCheckLoading(false);
    }
  };

  const handleUsernameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setFormData(prev => ({ ...prev, username: value }));
    checkUsernameAvailability(value);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      if (!formData.firstName || !formData.lastName) {
        throw new Error('First name and last name are required');
      }

      const usernameChanged = formData.username !== user?.user_metadata?.username;
      if (canChangeUsername && usernameChanged && !usernameAvailable) {
        throw new Error('Username is not available or invalid');
      }

      // استدعاء API لتحديث الملف الشخصي
      await updateProfile({
        first_name: formData.firstName,
        last_name: formData.lastName,
        username: canChangeUsername ? formData.username : undefined,
        avatar_url: formData.avatar,
      });

      setSuccess('Profile updated successfully!');
      setTimeout(() => navigate('/'), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteUsername !== user.user_metadata?.username) {
      setError('Username does not match. Account not deleted.');
      return;
    }

    setLoading(true);
    try {
      // استدعاء API لحذف الحساب
      const response = await fetch('/api/user/delete', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
        },
        body: JSON.stringify({ username: deleteUsername })
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.error || 'Failed to delete account');
      }
      
      setSuccess('Account deleted successfully');
      setTimeout(() => navigate('/'), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete account');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 bg-creo-bg py-12 md:py-16">
      <div className="container mx-auto px-4 max-w-2xl">
        <h1 className="text-3xl md:text-5xl font-display font-bold text-white mb-8">
          Edit Profile
        </h1>

        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500 rounded-xl flex gap-3">
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}

        {success && (
          <div className="mb-6 p-4 bg-green-500/10 border border-green-500 rounded-xl flex gap-3">
            <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
            <p className="text-green-400 text-sm">{success}</p>
          </div>
        )}

        {/* Profile Edit Form */}
        <div className="bg-creo-card border border-creo-border rounded-2xl p-6 md:p-8 mb-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
            </div>

            <div>
              <label className="block text-sm font-bold text-white mb-2 flex items-center gap-2">
                Username
                {!canChangeUsername && (
                  <span className="text-[10px] bg-creo-accent/20 text-creo-accent px-2 py-1 rounded">
                    Available in {Math.ceil((6 * 30 * 24 * 60 * 1000 - (new Date().getTime() - lastUsernameChange!.getTime())) / (24 * 60 * 60 * 1000))} days
                  </span>
                )}
              </label>
              <div className="relative">
                <input
                  type="text"
                  name="username"
                  value={formData.username}
                  onChange={handleUsernameChange}
                  disabled={!canChangeUsername}
                  className="w-full bg-creo-bg-sec border border-creo-border rounded-lg px-4 py-3 text-creo-text focus:outline-none focus:ring-1 focus:ring-creo-accent focus:border-creo-accent transition-all disabled:opacity-50 disabled:cursor-not-allowed pr-10"
                  placeholder="username"
                />
                {canChangeUsername && usernameCheckLoading && (
                  <Loader className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-creo-accent animate-spin" />
                )}
                {canChangeUsername && usernameAvailable === true && (
                  <CheckCircle className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-green-500" />
                )}
                {canChangeUsername && usernameAvailable === false && (
                  <AlertCircle className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-red-500" />
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-white mb-2">Avatar URL</label>
              <input
                type="url"
                name="avatar"
                value={formData.avatar}
                onChange={handleInputChange}
                className="w-full bg-creo-bg-sec border border-creo-border rounded-lg px-4 py-3 text-creo-text focus:outline-none focus:ring-1 focus:ring-creo-accent focus:border-creo-accent transition-all"
                placeholder="https://example.com/avatar.jpg"
              />
              {formData.avatar && (
                <div className="mt-3">
                  <img src={formData.avatar} alt="Preview" className="w-16 h-16 rounded-full object-cover border border-creo-border" />
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-creo-accent hover:bg-creo-accent/90 text-black font-bold py-3 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading && <Loader className="w-4 h-4 animate-spin" />}
              Save Changes
            </button>
          </form>
        </div>

        {/* Delete Account Section */}
        {!deleteConfirm ? (
          <div className="bg-red-500/10 border border-red-500 rounded-2xl p-6 md:p-8">
            <h2 className="text-lg font-bold text-red-400 mb-3 flex items-center gap-2">
              <AlertCircle className="w-5 h-5" />
              Danger Zone
            </h2>
            <p className="text-creo-text-sec mb-4">
              Permanently delete your account and all associated data. This action cannot be undone.
            </p>
            <button
              onClick={() => setDeleteConfirm(true)}
              className="px-6 py-3 bg-red-500 hover:bg-red-600 text-white font-bold rounded-xl transition-colors"
            >
              Delete Account
            </button>
          </div>
        ) : (
          <div className="bg-red-500/10 border border-red-500 rounded-2xl p-6 md:p-8">
            <h2 className="text-lg font-bold text-red-400 mb-4">
              Confirm Account Deletion
            </h2>
            <p className="text-creo-text-sec mb-4">
              Type your username to confirm deletion: <span className="font-bold text-white">"{user.user_metadata?.username}"</span>
            </p>
            <input
              type="text"
              value={deleteUsername}
              onChange={(e) => setDeleteUsername(e.target.value)}
              placeholder="Enter your username"
              className="w-full bg-creo-bg-sec border border-creo-border rounded-lg px-4 py-3 text-creo-text focus:outline-none focus:ring-1 focus:ring-red-500 focus:border-red-500 transition-all mb-4"
            />
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setDeleteConfirm(false);
                  setDeleteUsername('');
                }}
                className="flex-1 px-6 py-3 bg-creo-bg-sec hover:bg-creo-bg-sec/80 text-white font-bold rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteAccount}
                disabled={deleteUsername !== user.user_metadata?.username || loading}
                className="flex-1 px-6 py-3 bg-red-500 hover:bg-red-600 text-white font-bold rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading && <Loader className="w-4 h-4 animate-spin" />}
                Delete Account Permanently
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
