# JOEStore - Next.js + Supabase Serverless Top-up

This project is migrated to a **Vercel-compatible architecture** while preserving the existing UI design and pages.

## Stack

- Frontend: Next.js (Pages Router), existing React UI mounted via catch-all route
- API: Next.js API Routes (`pages/api/*`)
- Database: Supabase PostgreSQL
- Realtime: Supabase Realtime (`orders` table)
- Payments: Paymob + Fawry (sandbox-first adapters)
- Top-up Providers: Reloadly + GamesDrop (sandbox-first adapters)

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

PAYMOB_API_KEY=
PAYMOB_INTEGRATION_ID=
PAYMOB_HMAC_SECRET=

FAWRYPAY_API_KEY=
FAWRYPAY_SECRET=

JWT_SECRET=
APP_BASE_URL=http://localhost:3000
SANDBOX_MODE=true
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

Compatibility alias:

- `POST /api/orders`
- `GET /api/orders`

### Payment

- `POST /api/payment/paymob/initiate`
- `POST /api/payment/paymob/verify`
- `POST /api/payment/fawry/initiate`
- `POST /api/payment/fawry/verify`

Compatibility alias:

- `POST /api/payment/verify/[provider]`

### Top-up (internal)

- `POST /api/topup/reloadly`
- `POST /api/topup/gamesdrop`

## Realtime

Frontend subscribes to Supabase realtime changes on `public.orders` filtered by current `user_id`.
When status changes (`pending`, `paid`, `processing`, `completed`, `failed`) UI updates immediately.

## Deployment to Vercel

1. Push repository to Git provider.
2. Import project in Vercel.
3. Add all environment variables.
4. Deploy using default Next.js settings.
5. Configure payment callback URLs to point to your Vercel domain:
   - `https://<your-domain>/payment/callback/paymob`
   - `https://<your-domain>/payment/callback/fawry`

## Notes

- No custom Node server is required.
- No persistent WebSocket server is used.
- Existing visual UI is preserved.
