# JOEStore Runbook

This runbook lists required migrations, workers, and environment variables for production.

## 1) Migrations (Run In Order)

Apply all migrations via Supabase CLI:

```bash
supabase db push
```

Required migrations added during platform phases:
- `supabase/migrations/20260310_add_order_discounts.sql`
- `supabase/migrations/20260310_wallet_system.sql`
- `supabase/migrations/20260310_wallet_topups_and_order_events.sql`
- `supabase/migrations/20260310_phase2_referrals_discounts_analytics.sql`
- `supabase/migrations/20260310_phase3_sla_alerts_metrics.sql`
- `supabase/migrations/20260310_phase4_enterprise_ops.sql`
- `supabase/migrations/20260310_phase5_ml_fraud_queue_jobs.sql`
- `supabase/migrations/20260310_phase6_worker_heartbeats.sql`

## 2) Required Environment Variables (Production)

These must be set in Vercel or hosting platform:

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

APP_BASE_URL=https://your-domain
SANDBOX_MODE=false
ALLOW_SYNC_TOPUP_FALLBACK=false

REDIS_URL=
REDIS_TLS=false
QUEUE_MODE=bullmq

ALERT_WEBHOOK_URL=
```

Optional:
```env
RABBITMQ_URL=
GEOLOCATION_API_BASE=https://ipapi.co
GEOLOCATION_API_KEY=
PROVIDER_TIMEOUT_MS=15000
```

## 3) Workers (Must Be Running)

Run these in separate processes:

```bash
npm run worker:topup
npm run worker:retry
npm run worker:queue
```

## 4) Health Checks

Verify:
- `GET /api/health` returns `status: ok`
- `GET /api/admin/metrics` returns totals
- `GET /api/admin/workers` shows recent heartbeats

## 5) Webhooks

Configure payment provider callbacks:
- Payment callback: `https://<domain>/payment/callback/fawaterk`
- Webhook: `https://<domain>/api/payment/fawaterk/webhook`

## 6) Operational Checks

Daily:
- Review `Admin → Metrics` for spikes in failures.
- Review `Admin → Alerts` for provider issues.
- Check `Admin → Workers` for stale heartbeat timestamps.

Weekly:
- Export orders CSV from `Admin → Metrics` (or call `/api/admin/exports/orders`).

## 7) Rollback / Safe Mode

If providers are unstable:
- Disable providers in `Admin → Providers`.
- Set `ALLOW_SYNC_TOPUP_FALLBACK=false` to avoid blocking API routes.

If fraud spikes:
- Increase `FRAUD_BLOCK_RISK_SCORE` and `FRAUD_MAX_ORDERS_PER_MINUTE`.

## 8) Data Backups

Use Supabase scheduled backups and store export CSVs in external storage.

---

## Deployment Checklist

Pre‑deploy:
1. Ensure all migrations have run successfully.
2. Verify required env vars are set in production.
3. Confirm Redis is reachable (queue + cache).
4. Confirm payment webhook URL is configured in Fawaterk.
5. Confirm `SANDBOX_MODE=false` and `ALLOW_SYNC_TOPUP_FALLBACK=false`.
6. Start all workers and verify heartbeats.

Deploy:
1. Deploy Next.js app.
2. Run a test order in sandbox or small amount in production.
3. Verify order status transitions to `paid` → `processing` → `completed`.
4. Verify wallet top‑up payment flow.

Post‑deploy:
1. Check `/api/health` is green.
2. Check Admin → Metrics and Admin → Workers.
3. Validate provider SLA thresholds in Admin → Metrics.
4. Run a CSV export from `/api/admin/exports/orders`.

---

## Incident Response (Quick Guide)

Provider outage:
1. Disable provider in Admin → Providers.
2. Watch Alerts log for failures.
3. Re‑enable provider after stability returns.

Queue stalled:
1. Check Redis connectivity.
2. Check worker heartbeats in Admin → Workers.
3. Restart `worker:topup` and `worker:queue`.

Payment webhook failures:
1. Check Fawaterk webhook delivery logs.
2. Manually verify payment in Admin → Payments.
3. Retry order from Admin → Orders.

Fraud spikes:
1. Increase `FRAUD_BLOCK_RISK_SCORE`.
2. Increase `FRAUD_MAX_ORDERS_PER_MINUTE`.
3. Monitor `fraud_signals` in Admin → Fraud.

Rollback:
1. Disable providers.
2. Set `ALLOW_SYNC_TOPUP_FALLBACK=false`.
3. Revert deployment if needed.
