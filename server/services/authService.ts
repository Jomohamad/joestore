import { supabaseAnon } from '../supabase.js';
import { HttpError } from '../utils/http.js';
import { buildAppUser, syncPublicUserFromAuth } from './usersService.js';
import { env } from '../config/env.js';

const USERNAME_REGEX = /^[A-Za-z0-9._-]{3,30}$/;

export const authService = {
  async register(input: {
    email: string;
    password: string;
    username?: string;
    firstName?: string;
    lastName?: string;
  }) {
    const email = String(input.email || '').trim().toLowerCase();
    const password = String(input.password || '');
    const username = String(input.username || '').trim();
    const firstName = String(input.firstName || '').trim();
    const lastName = String(input.lastName || '').trim();

    if (!email || !password) {
      throw new HttpError(400, 'Email and password are required', 'VALIDATION_ERROR');
    }

    if (username && !USERNAME_REGEX.test(username)) {
      throw new HttpError(
        400,
        'Username must be 3-30 chars and only letters, numbers, dot, underscore, or hyphen',
        'VALIDATION_ERROR',
      );
    }

    const redirectTo = `${env.appBaseUrl || `http://localhost:${env.port}`}/login`;

    const { data, error } = await supabaseAnon.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectTo,
        data: {
          username,
          first_name: firstName,
          last_name: lastName,
          email,
        },
      },
    });

    if (error) {
      throw new HttpError(400, error.message, 'REGISTER_FAILED');
    }

    if (data.user) {
      await syncPublicUserFromAuth(data.user);
    }

    return {
      user: data.user ? buildAppUser(data.user) : null,
      requiresEmailConfirmation: !Boolean(data.session),
      accessToken: data.session?.access_token || null,
      refreshToken: data.session?.refresh_token || null,
    };
  },

  async login(input: { email: string; password: string }) {
    const email = String(input.email || '').trim().toLowerCase();
    const password = String(input.password || '');

    if (!email || !password) {
      throw new HttpError(400, 'Email and password are required', 'VALIDATION_ERROR');
    }

    const { data, error } = await supabaseAnon.auth.signInWithPassword({
      email,
      password,
    });

    if (error || !data.user || !data.session) {
      throw new HttpError(401, error?.message || 'Invalid credentials', 'LOGIN_FAILED');
    }

    await syncPublicUserFromAuth(data.user);

    return {
      accessToken: data.session.access_token,
      refreshToken: data.session.refresh_token,
      user: buildAppUser(data.user),
    };
  },
};
