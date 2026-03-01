# Troubleshooting Vercel Deployment

If you see the error **"Failed to load apps. Please try again later."**, follow these steps.

## The Fix: Enable Public Read Access

We have updated the application to fetch data directly from Supabase (instead of using the API server) to make it faster and more reliable. You must enable public read access in your database.

1.  Go to your **Supabase Dashboard**.
2.  Open the **SQL Editor**.
3.  Click **New Query**.
4.  Copy the content of the file `ALLOW_PUBLIC_READ.sql`.
5.  Paste it into the editor and click **Run**.

This will allow the website to read the list of games and packages.

## Check Environment Variables

Ensure these variables are set in Vercel:

*   `VITE_SUPABASE_URL`
*   `VITE_SUPABASE_ANON_KEY`
*   `SUPABASE_SERVICE_ROLE_KEY`

**Important:** After adding variables, you must **Redeploy** your application.

## Verify Database Content

If the site loads but shows "No games found", your database might be empty.
Run the content of `SUPABASE_SCHEMA.sql` in the SQL Editor to add initial data.

## Enable Filtering & Sorting

To use the new "Filter by Genre" and "Sort by Popularity" features, you must update your database schema.
1.  Open the **SQL Editor** in Supabase.
2.  Run the content of `ADD_FILTER_COLUMNS.sql`.
3.  This will add `genre`, `popularity`, and `min_price` columns to your games table.
