# JOEStore - Next.js + Supabase Serverless Top-up

This project is migrated to a **Vercel-compatible architecture** while preserving the existing UI design and pages.

## Stack

- Frontend: Next.js (Pages Router), existing React UI mounted via catch-all route
- API: Next.js API Routes (`pages/api/*`)
- Database: Supabase PostgreSQL
- Realtime: Supabase Realtime (`orders` table)
- Payments: Fawaterk (sandbox-first adapter)
- Top-up Providers: Reloadly + GamesDrop (live API calls with sandbox fallback)

## Folder Highlights

- `pages/[[...slug]].tsx`: catch-all page that renders existing UI
- `pages/_app.tsx`: global styles import
- `pages/api/*`: serverless API routes
- `src/lib/server/*`: shared server logic for API routes
- `supabase/migrations/*`: SQL migrations

## Environment Variables

Set these in `.env.local` for local dev and in Vercel Project Settings for production:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=

SUPABASE_SERVICE_ROLE=

RELOADLY_CLIENT_ID=
RELOADLY_CLIENT_SECRET=
GAMESDROP_API_KEY=

FAWATERK_API_KEY=
FAWATERK_SECRET_KEY=
FAWATERK_WEBHOOK_SECRET=

JWT_SECRET=
INTERNAL_API_TOKEN=
APP_BASE_URL=http://localhost:3000
SANDBOX_MODE=true
ALLOW_SYNC_TOPUP_FALLBACK=true
```

Compatibility fallback envs are also supported:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

## Local Development

```bash
npm install
npm run dev
```

App URL: `http://localhost:3000`

## Supabase Migration

Run migrations using Supabase CLI:

```bash
supabase db push
```

Important migration for this architecture:

- `supabase/migrations/20260305_next_vercel_serverless_topup_schema.sql`
- `supabase/migrations/20260307_fawaterk_admin_panel_schema.sql`

Canonical operational tables:

- `users`
- `games`
- `orders` (`pending | paid | processing | completed | failed`)
- `payments`

## API Overview

### Auth

- `POST /api/auth/register`
- `POST /api/auth/login`

### Games

- `GET /api/games`
- `GET /api/games/[id]`
- `GET /api/games/[id]/packages`

### Orders

- `POST /api/orders/create`
- `GET /api/orders/user`
- `GET /api/orders/[id]`
- `GET /api/orders/list`
- `GET|PATCH /api/orders/status`

Compatibility alias:

- `POST /api/orders`
- `GET /api/orders`

### Payment

- `POST /api/payment/create`
- `POST /api/payment/webhook`
- `POST /api/payment/fawaterk/create`
- `POST /api/payment/fawaterk/verify`
- `POST /api/payment/fawaterk/webhook`

### Top-up (internal)

- `POST /api/topup/reloadly`
- `POST /api/topup/gamesdrop`
- `POST /api/topup/process`

### Products

- `GET /api/products/list`
- `POST /api/products/create`
- `POST|PUT|PATCH /api/products/update`
- `DELETE|POST /api/products/delete`

### Admin

- `GET /api/admin/orders`
- `POST /api/admin/orders/retry`
- `PATCH /api/admin/orders/status`
- `GET|POST /api/admin/games`
- `GET|POST|DELETE /api/admin/products`
- `GET /api/admin/payments`
- `GET /api/admin/logs`
- `GET /api/admin/transactions`
- `GET|PATCH /api/admin/users`

## Realtime

Frontend subscribes to Supabase realtime changes on `public.orders` filtered by current `user_id`.
When status changes (`pending`, `paid`, `processing`, `completed`, `failed`) UI updates immediately.

## Deployment to Vercel

1. Push repository to Git provider.
2. Import project in Vercel.
3. Add all environment variables.
4. Deploy using default Next.js settings.
5. Configure payment callback URLs to point to your Vercel domain:
   - `https://<your-domain>/payment/callback/fawaterk`

## Notes

- No custom Node server is required.
- No persistent WebSocket server is used.
- Existing visual UI is preserved.
