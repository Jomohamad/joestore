-- Batch fix for Supabase lints:
-- 1) auth_rls_initplan (wrap auth.* calls with SELECT)
-- 2) multiple_permissive_policies (deduplicate overlapping permissive policies)
-- 3) duplicate_index on admins

-- admins table + duplicate unique constraint/index
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'admins'
  ) THEN
    EXECUTE 'alter table public.admins enable row level security';
    EXECUTE 'drop policy if exists "Users can view own admin membership" on public.admins';
    EXECUTE 'create policy "Users can view own admin membership" on public.admins for select to authenticated using ((select auth.uid()) = user_id)';

    IF EXISTS (
      SELECT 1
      FROM pg_constraint c
      JOIN pg_class t ON t.oid = c.conrelid
      JOIN pg_namespace n ON n.oid = t.relnamespace
      WHERE n.nspname = 'public'
        AND t.relname = 'admins'
        AND c.conname = 'admins_user_id_key'
    ) THEN
      EXECUTE 'alter table public.admins drop constraint admins_user_id_key';
    END IF;
  END IF;
END $$;

-- logs table
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'logs'
  ) THEN
    EXECUTE 'alter table public.logs enable row level security';
    EXECUTE 'drop policy if exists "Service role inserts logs" on public.logs';
    EXECUTE 'drop policy if exists "Service role manages logs" on public.logs';
    EXECUTE 'drop policy if exists "Admins can view logs" on public.logs';

    EXECUTE 'create policy "Admins can view logs" on public.logs for select to authenticated using (public.is_admin_user((select auth.uid())))';
    EXECUTE '' ||
      'create policy "Service role manages logs" on public.logs ' ||
      'for all to service_role using ((select auth.role()) = ''service_role'') with check ((select auth.role()) = ''service_role'')';
  END IF;
END $$;

-- games table (remove duplicate public read policies)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'games'
  ) THEN
    EXECUTE 'alter table public.games enable row level security';
    EXECUTE 'drop policy if exists "Games are publicly readable" on public.games';
    EXECUTE 'drop policy if exists "Public games are viewable by everyone" on public.games';
    EXECUTE 'create policy "Games are publicly readable" on public.games for select to public using (true)';
  END IF;
END $$;

-- users table
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'users'
  ) THEN
    EXECUTE 'alter table public.users enable row level security';
    EXECUTE 'drop policy if exists "Users can view own mirror user" on public.users';
    EXECUTE 'drop policy if exists "Users can update own mirror user" on public.users';
    EXECUTE 'create policy "Users can view own mirror user" on public.users for select to authenticated using ((select auth.uid()) = id)';
    EXECUTE 'create policy "Users can update own mirror user" on public.users for update to authenticated using ((select auth.uid()) = id) with check ((select auth.uid()) = id)';
  END IF;
END $$;

-- products table
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'products'
  ) THEN
    EXECUTE 'alter table public.products enable row level security';
    EXECUTE 'drop policy if exists "Public products read" on public.products';
    EXECUTE 'drop policy if exists "Public active products are viewable by everyone" on public.products';
    EXECUTE 'drop policy if exists "Admins can manage products" on public.products';
    EXECUTE 'drop policy if exists "Admins insert products" on public.products';
    EXECUTE 'drop policy if exists "Admins update products" on public.products';
    EXECUTE 'drop policy if exists "Admins delete products" on public.products';

    EXECUTE 'create policy "Public products read" on public.products for select to public using (active = true)';
    EXECUTE 'create policy "Admins insert products" on public.products for insert to authenticated with check (public.is_admin_user((select auth.uid())))';
    EXECUTE 'create policy "Admins update products" on public.products for update to authenticated using (public.is_admin_user((select auth.uid()))) with check (public.is_admin_user((select auth.uid())))';
    EXECUTE 'create policy "Admins delete products" on public.products for delete to authenticated using (public.is_admin_user((select auth.uid())))';
  END IF;
END $$;

-- orders table
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'orders'
  ) THEN
    EXECUTE 'alter table public.orders enable row level security';
    EXECUTE 'drop policy if exists "Users can view own orders" on public.orders';
    EXECUTE 'drop policy if exists "Users can view their own orders" on public.orders';
    EXECUTE 'drop policy if exists "Users can create own orders" on public.orders';
    EXECUTE 'drop policy if exists "Users can create orders" on public.orders';
    EXECUTE 'drop policy if exists "Admins can view all orders" on public.orders';
    EXECUTE 'drop policy if exists "Admins can manage orders" on public.orders';
    EXECUTE 'drop policy if exists "Orders read access" on public.orders';
    EXECUTE 'drop policy if exists "Orders insert own" on public.orders';
    EXECUTE 'drop policy if exists "Orders admin update" on public.orders';
    EXECUTE 'drop policy if exists "Orders admin delete" on public.orders';

    EXECUTE 'create policy "Orders read access" on public.orders for select to authenticated using (user_id = (select auth.uid()) or public.is_admin_user((select auth.uid())))';
    EXECUTE 'create policy "Orders insert own" on public.orders for insert to authenticated with check (user_id = (select auth.uid()))';
    EXECUTE 'create policy "Orders admin update" on public.orders for update to authenticated using (public.is_admin_user((select auth.uid()))) with check (public.is_admin_user((select auth.uid())))';
    EXECUTE 'create policy "Orders admin delete" on public.orders for delete to authenticated using (public.is_admin_user((select auth.uid())))';
  END IF;
END $$;

-- payments table
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'payments'
  ) THEN
    EXECUTE 'alter table public.payments enable row level security';
    EXECUTE 'drop policy if exists "Users can view own payments" on public.payments';
    EXECUTE 'drop policy if exists "Admins can view all payments" on public.payments';
    EXECUTE 'drop policy if exists "Payments read access" on public.payments';

    EXECUTE 'create policy "Payments read access" on public.payments for select to authenticated using (public.is_admin_user((select auth.uid())) or exists (select 1 from public.orders o where o.id = payments.order_id and o.user_id = (select auth.uid())))';
  END IF;
END $$;

-- transactions table
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'transactions'
  ) THEN
    EXECUTE 'alter table public.transactions enable row level security';
    EXECUTE 'drop policy if exists "Users can view own transactions" on public.transactions';
    EXECUTE 'drop policy if exists "Admins can view all transactions" on public.transactions';
    EXECUTE 'drop policy if exists "Admins can manage transactions" on public.transactions';
    EXECUTE 'drop policy if exists "Transactions read access" on public.transactions';
    EXECUTE 'drop policy if exists "Transactions admin insert" on public.transactions';
    EXECUTE 'drop policy if exists "Transactions admin update" on public.transactions';
    EXECUTE 'drop policy if exists "Transactions admin delete" on public.transactions';

    EXECUTE 'create policy "Transactions read access" on public.transactions for select to authenticated using (public.is_admin_user((select auth.uid())) or exists (select 1 from public.orders o where o.id = transactions.order_id and o.user_id = (select auth.uid())))';
    EXECUTE 'create policy "Transactions admin insert" on public.transactions for insert to authenticated with check (public.is_admin_user((select auth.uid())))';
    EXECUTE 'create policy "Transactions admin update" on public.transactions for update to authenticated using (public.is_admin_user((select auth.uid()))) with check (public.is_admin_user((select auth.uid())))';
    EXECUTE 'create policy "Transactions admin delete" on public.transactions for delete to authenticated using (public.is_admin_user((select auth.uid())))';
  END IF;
END $$;

-- provider_prices table
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'provider_prices'
  ) THEN
    EXECUTE 'alter table public.provider_prices enable row level security';
    EXECUTE 'drop policy if exists "Authenticated users can read provider prices" on public.provider_prices';
    EXECUTE 'drop policy if exists "Admins manage provider prices" on public.provider_prices';
    EXECUTE 'drop policy if exists "Provider prices read" on public.provider_prices';
    EXECUTE 'drop policy if exists "Provider prices admin insert" on public.provider_prices';
    EXECUTE 'drop policy if exists "Provider prices admin update" on public.provider_prices';
    EXECUTE 'drop policy if exists "Provider prices admin delete" on public.provider_prices';

    EXECUTE 'create policy "Provider prices read" on public.provider_prices for select to public using (true)';
    EXECUTE 'create policy "Provider prices admin insert" on public.provider_prices for insert to authenticated with check (public.is_admin_user((select auth.uid())))';
    EXECUTE 'create policy "Provider prices admin update" on public.provider_prices for update to authenticated using (public.is_admin_user((select auth.uid()))) with check (public.is_admin_user((select auth.uid())))';
    EXECUTE 'create policy "Provider prices admin delete" on public.provider_prices for delete to authenticated using (public.is_admin_user((select auth.uid())))';
  END IF;
END $$;

-- pricing_rules table
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'pricing_rules'
  ) THEN
    EXECUTE 'alter table public.pricing_rules enable row level security';
    EXECUTE 'drop policy if exists "Admins manage pricing rules" on public.pricing_rules';
    EXECUTE 'drop policy if exists "Pricing rules admin read" on public.pricing_rules';
    EXECUTE 'drop policy if exists "Pricing rules admin insert" on public.pricing_rules';
    EXECUTE 'drop policy if exists "Pricing rules admin update" on public.pricing_rules';
    EXECUTE 'drop policy if exists "Pricing rules admin delete" on public.pricing_rules';

    EXECUTE 'create policy "Pricing rules admin read" on public.pricing_rules for select to authenticated using (public.is_admin_user((select auth.uid())))';
    EXECUTE 'create policy "Pricing rules admin insert" on public.pricing_rules for insert to authenticated with check (public.is_admin_user((select auth.uid())))';
    EXECUTE 'create policy "Pricing rules admin update" on public.pricing_rules for update to authenticated using (public.is_admin_user((select auth.uid()))) with check (public.is_admin_user((select auth.uid())))';
    EXECUTE 'create policy "Pricing rules admin delete" on public.pricing_rules for delete to authenticated using (public.is_admin_user((select auth.uid())))';
  END IF;
END $$;

-- fraud_logs table
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'fraud_logs'
  ) THEN
    EXECUTE 'alter table public.fraud_logs enable row level security';
    EXECUTE 'drop policy if exists "Users can read own fraud logs" on public.fraud_logs';
    EXECUTE 'drop policy if exists "Admins can read all fraud logs" on public.fraud_logs';
    EXECUTE 'drop policy if exists "Service role manages fraud logs" on public.fraud_logs';
    EXECUTE 'drop policy if exists "Fraud logs read access" on public.fraud_logs';
    EXECUTE 'drop policy if exists "Fraud logs service role manage" on public.fraud_logs';

    EXECUTE 'create policy "Fraud logs read access" on public.fraud_logs for select to authenticated using (user_id = (select auth.uid()) or public.is_admin_user((select auth.uid())))';
    EXECUTE '' ||
      'create policy "Fraud logs service role manage" on public.fraud_logs for all to service_role ' ||
      'using ((select auth.role()) = ''service_role'') with check ((select auth.role()) = ''service_role'')';
  END IF;
END $$;

-- provider_failures table
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'provider_failures'
  ) THEN
    EXECUTE 'alter table public.provider_failures enable row level security';
    EXECUTE 'drop policy if exists "Admins can read provider failures" on public.provider_failures';
    EXECUTE 'drop policy if exists "Service role manages provider failures" on public.provider_failures';
    EXECUTE 'drop policy if exists "Provider failures admin read" on public.provider_failures';
    EXECUTE 'drop policy if exists "Provider failures service role manage" on public.provider_failures';

    EXECUTE 'create policy "Provider failures admin read" on public.provider_failures for select to authenticated using (public.is_admin_user((select auth.uid())))';
    EXECUTE '' ||
      'create policy "Provider failures service role manage" on public.provider_failures for all to service_role ' ||
      'using ((select auth.role()) = ''service_role'') with check ((select auth.role()) = ''service_role'')';
  END IF;
END $$;

-- provider_health table
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'provider_health'
  ) THEN
    EXECUTE 'alter table public.provider_health enable row level security';
    EXECUTE 'drop policy if exists "Admins manage provider health" on public.provider_health';
    EXECUTE 'drop policy if exists "Authenticated users can read provider health" on public.provider_health';
    EXECUTE 'drop policy if exists "Provider health read" on public.provider_health';
    EXECUTE 'drop policy if exists "Provider health admin insert" on public.provider_health';
    EXECUTE 'drop policy if exists "Provider health admin update" on public.provider_health';
    EXECUTE 'drop policy if exists "Provider health admin delete" on public.provider_health';

    EXECUTE 'create policy "Provider health read" on public.provider_health for select to public using (true)';
    EXECUTE 'create policy "Provider health admin insert" on public.provider_health for insert to authenticated with check (public.is_admin_user((select auth.uid())))';
    EXECUTE 'create policy "Provider health admin update" on public.provider_health for update to authenticated using (public.is_admin_user((select auth.uid()))) with check (public.is_admin_user((select auth.uid())))';
    EXECUTE 'create policy "Provider health admin delete" on public.provider_health for delete to authenticated using (public.is_admin_user((select auth.uid())))';
  END IF;
END $$;
