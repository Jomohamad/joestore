# Security RLS Map

This document maps the Row Level Security (RLS) status and policies for each table in the Supabase database.

## Tables and RLS Status

| Table Name          | RLS Enabled | Policies                                                                 |
|---------------------|-------------|--------------------------------------------------------------------------|
| profiles            | YES         | - SELECT: USING (auth.uid() = id) <br> - INSERT: WITH CHECK (auth.uid() = id) <br> - UPDATE: USING (auth.uid() = id) WITH CHECK (auth.uid() = id) <br> - DELETE: USING (auth.uid() = id) |
| admins              | YES         | - SELECT: USING (auth.uid() = user_id) <br> - INSERT: WITH CHECK (auth.uid() = user_id) <br> - UPDATE: USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id) <br> - DELETE: USING (auth.uid() = user_id) |
| users               | YES         | - SELECT: USING (auth.uid() = id) <br> - INSERT: WITH CHECK (auth.uid() = id) <br> - UPDATE: USING (auth.uid() = id) WITH CHECK (auth.uid() = id) <br> - DELETE: USING (auth.uid() = id) |
| orders              | YES         | - SELECT: USING (auth.uid() = user_id) <br> - INSERT: WITH CHECK (auth.uid() = user_id) <br> - UPDATE: USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id) <br> - DELETE: USING (auth.uid() = user_id) |
| payments            | YES         | - SELECT: USING (auth.uid() = user_id) <br> - INSERT: WITH CHECK (auth.uid() = user_id) <br> - UPDATE: USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id) <br> - DELETE: USING (auth.uid() = user_id) |
| games               | YES         | - SELECT: public (no restriction) <br> - INSERT: RESTRICTED TO service_role <br> - UPDATE: RESTRICTED TO service_role <br> - DELETE: RESTRICTED TO service_role |
| provider_prices     | YES         | - SELECT: public (no restriction) <br> - INSERT: RESTRICTED TO service_role <br> - UPDATE: RESTRICTED TO service_role <br> - DELETE: RESTRICTED TO service_role |
| pricing_rules       | YES         | - SELECT: public (no restriction) <br> - INSERT: RESTRICTED TO service_role <br> - UPDATE: RESTRICTED TO service_role <br> - DELETE: RESTRICTED TO service_role |
| fraud_logs          | YES         | - SELECT: RESTRICTED TO service_role <br> - INSERT: RESTRICTED TO service_role <br> - UPDATE: RESTRICTED TO service_role <br> - DELETE: RESTRICTED TO service_role |
| provider_failures   | YES         | - SELECT: RESTRICTED TO service_role <br> - INSERT: RESTRICTED TO service_role <br> - UPDATE: RESTRICTED TO service_role <br> - DELETE: RESTRICTED TO service_role |
| provider_health     | YES         | - SELECT: RESTRICTED TO service_role <br> - INSERT: RESTRICTED TO service_role <br> - UPDATE: RESTRICTED TO service_role <br> - DELETE: RESTRICTED TO service_role |
| logs                | YES         | - SELECT: RESTRICTED TO service_role <br> - INSERT: RESTRICTED TO service_role <br> - UPDATE: RESTRICTED TO service_role <br> - DELETE: RESTRICTED TO service_role |
| products            | YES         | - SELECT: public (no restriction) <br> - INSERT: RESTRICTED TO service_role <br> - UPDATE: RESTRICTED TO service_role <br> - DELETE: RESTRICTED TO service_role |
| settings            | YES         | - SELECT: public (no restriction) <br> - INSERT: RESTRICTED TO service_role <br> - UPDATE: RESTRICTED TO service_role <br> - DELETE: RESTRICTED TO service_role |

## Notes
- All user-specific tables (profiles, admins, users, orders, payments) have RLS policies that restrict access to the authenticated user only.
- Public tables (games, provider_prices, pricing_rules, products, settings) allow public SELECT but restrict all writes to the service_role only.
- Administrative and log tables (fraud_logs, provider_failures, provider_health, logs) restrict all access to the service_role only.