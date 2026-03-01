# Supabase Authentication Setup Guide

To make the Login and Signup functionality work, you need to configure Authentication in your Supabase project.

## 1. Enable Email/Password Auth

1.  Go to your **Supabase Dashboard**.
2.  Navigate to **Authentication** > **Providers**.
3.  Click on **Email**.
4.  Ensure **Enable Email provider** is toggled **ON**.
5.  Uncheck "Confirm email" if you want users to be able to login immediately without verifying their email (useful for testing).
6.  Click **Save**.

## 2. Enable Google OAuth

1.  Go to the [Google Cloud Console](https://console.cloud.google.com/).
2.  Create a new project or select an existing one.
3.  Search for **"OAuth consent screen"** and configure it (External).
4.  Go to **Credentials** > **Create Credentials** > **OAuth client ID**.
5.  Select **Web application**.
6.  Add your **Authorized redirect URIs**:
    *   You can find this URL in your Supabase Dashboard under **Authentication** > **URL Configuration** > **Site URL**.
    *   It usually looks like: `https://<your-project-ref>.supabase.co/auth/v1/callback`
7.  Copy the **Client ID** and **Client Secret**.
8.  Go back to **Supabase Dashboard** > **Authentication** > **Providers**.
9.  Click on **Google**.
10. Toggle **Enable Google provider** to **ON**.
11. Paste your **Client ID** and **Client Secret**.
12. Click **Save**.

## 3. URL Configuration

1.  In Supabase, go to **Authentication** > **URL Configuration**.
2.  Set the **Site URL** to your deployed application URL (e.g., `https://your-app.vercel.app`).
3.  In **Redirect URLs**, add:
    *   `http://localhost:3000/` (for local development)
    *   `https://your-app.vercel.app/` (for production)

## 4. Testing

*   **Sign Up**: Try creating a new account with email/password.
*   **Login**: Try logging in with the account you just created.
*   **Google Login**: Click the "Login with Google" button. It should redirect you to Google, and then back to your app as a logged-in user.
