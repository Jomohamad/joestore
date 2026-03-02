import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useStore } from '../context/StoreContext';
import { AlertCircle, CheckCircle, Loader } from 'lucide-react';

export default function CompleteProfile() {
  const navigate = useNavigate();
  const { user, updateProfile } = useAuth();
  const { t } = useStore();
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [usernameCheckLoading, setUsernameCheckLoading] = useState(false);
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);
  
  const [formData, setFormData] = useState({
    firstName: user?.user_metadata?.first_name || '',
    lastName: user?.user_metadata?.last_name || '',
    username: user?.user_metadata?.username || '',
  });

  useEffect(() => {
    // If user is not logged in or already has complete profile, redirect to home
    if (!user) {
      navigate('/login');
      return;
    }
    
    if (user.user_metadata?.first_name && user.user_metadata?.last_name && user.user_metadata?.username) {
      navigate('/');
    }
  }, [user, navigate]);

  const checkUsernameAvailability = async (username: string) => {
    if (!username || username.length < 3) {
      setUsernameAvailable(null);
      return;
    }
    
    setUsernameCheckLoading(true);
    try {
      // محاكاة التحقق - في الواقع استدعي API حقيقي
      const response = await fetch(`/api/check-username?username=${encodeURIComponent(username)}`);
      const data = await response.json();
      setUsernameAvailable(data.available);
    } catch (err) {
      // Default to true إذا فشل الـ check
      setUsernameAvailable(true);
    } finally {
      setUsernameCheckLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setError('');
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
      if (!formData.firstName || !formData.lastName || !formData.username) {
        throw new Error('All fields are required');
      }

      if (formData.username.length < 3) {
        throw new Error('Username must be at least 3 characters');
      }

      if (!usernameAvailable) {
        throw new Error('Username is not available');
      }

      // Update profile with new information
      await updateProfile({
        first_name: formData.firstName,
        last_name: formData.lastName,
        username: formData.username,
      });

      setSuccess('Profile completed successfully! Redirecting...');
      setTimeout(() => navigate('/'), 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to complete profile');
    } finally {
      setLoading(false);
    }
  };

  if (!user) return null;

  return (
    <div className="flex-1 bg-creo-bg flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 bg-creo-card p-8 rounded-2xl border border-creo-border shadow-2xl">
        <div className="text-center">
          <h2 className="text-3xl font-display font-bold text-white">
            Complete Your Profile
          </h2>
          <p className="mt-2 text-sm text-creo-text-sec">
            Just a few more details to get started
          </p>
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
          <div>
            <label className="block text-sm font-bold text-white mb-2">
              First Name
            </label>
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
            <label className="block text-sm font-bold text-white mb-2">
              Last Name
            </label>
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
            <label className="block text-sm font-bold text-white mb-2">
              Username
            </label>
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

        <p className="text-xs text-creo-text-sec text-center">
          Your information is secure and encrypted
        </p>
      </div>
    </div>
  );
}
