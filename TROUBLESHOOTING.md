# Troubleshooting Vercel Deployment

If you see the error **"Failed to load apps. Please try again later."** after deploying to Vercel, it means the frontend cannot fetch data from the backend. This is almost always caused by one of two things:

1.  **Missing Environment Variables** on Vercel.
2.  **Empty Database** (Missing SQL Schema).

Follow these steps to fix it.

---

## Step 1: Check Vercel Environment Variables

The application needs to know how to connect to Supabase.

1.  Go to your **Vercel Dashboard**.
2.  Select your project.
3.  Go to **Settings** > **Environment Variables**.
4.  Ensure you have added the following variables (copy them from your Supabase Dashboard):

    *   `VITE_SUPABASE_URL`: Your Supabase Project URL.
    *   `VITE_SUPABASE_ANON_KEY`: Your Supabase Anon Public Key.
    *   `SUPABASE_SERVICE_ROLE_KEY`: Your Supabase Service Role Secret.

    > **Important:** After adding these variables, you must **Redeploy** your application for them to take effect. Go to the **Deployments** tab, click the three dots on the latest deployment, and select **Redeploy**.

## Step 2: Verify Database Tables (Supabase)

If the variables are correct, the database might be empty.

1.  Go to your **Supabase Dashboard**.
2.  Open the **SQL Editor** (icon on the left).
3.  Click **New Query**.
4.  Copy the entire content of the `SUPABASE_SCHEMA.sql` file from your project.
5.  Paste it into the SQL Editor and click **Run**.

This will create the `games`, `packages`, and `orders` tables and populate them with initial data.

## Step 3: Check Vercel Logs

If it still fails:

1.  Go to your **Vercel Dashboard**.
2.  Click on the **Deployments** tab.
3.  Click on the latest deployment (the one that is "Ready").
4.  Click on the **Functions** tab (or "Logs").
5.  Look for any error messages in the console output.
    *   If you see "Missing Supabase URL or Key", go back to Step 1.
    *   If you see "relation 'games' does not exist", go back to Step 2.

## Step 4: Verify API Endpoint

You can verify if the backend is running by visiting:
`https://your-project-name.vercel.app/api/health`

*   If it returns `{"status":"ok","database":"connected"}`, the backend is working.
*   If it returns an error, the database connection is failing.
*   If it returns a 404, the API routes are not configured correctly (check `vercel.json`).

---

## Quick Checklist

- [ ] Added `VITE_SUPABASE_URL` to Vercel?
- [ ] Added `VITE_SUPABASE_ANON_KEY` to Vercel?
- [ ] Added `SUPABASE_SERVICE_ROLE_KEY` to Vercel?
- [ ] Ran `SUPABASE_SCHEMA.sql` in Supabase?
- [ ] Redeployed after adding variables?
