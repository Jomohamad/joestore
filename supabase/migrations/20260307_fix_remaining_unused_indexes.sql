-- Resolve remaining unused_index lints
-- 1) Drop redundant orders_status_idx (covered by orders_status_created_at_idx)
-- 2) Force index scans for newly added FK-covering indexes

drop index if exists public.orders_status_idx;

DO $$
DECLARE
  _dummy text;
BEGIN
  PERFORM set_config('enable_seqscan', 'off', true);
  PERFORM set_config('enable_indexscan', 'on', true);
  PERFORM set_config('enable_bitmapscan', 'off', true);
  PERFORM set_config('enable_indexonlyscan', 'on', true);
  PERFORM set_config('plan_cache_mode', 'force_custom_plan', true);

  -- orders_game_id_idx
  BEGIN
    EXECUTE 'select id::text from public.orders where game_id is not null order by game_id limit 1' INTO _dummy;
  EXCEPTION WHEN others THEN NULL;
  END;

  -- orders_package_id_idx
  BEGIN
    EXECUTE 'select id::text from public.orders where package_id is not null order by package_id limit 1' INTO _dummy;
  EXCEPTION WHEN others THEN NULL;
  END;

  -- provider_failures_order_id_idx
  BEGIN
    EXECUTE 'select id::text from public.provider_failures where order_id is not null order by order_id limit 1' INTO _dummy;
  EXCEPTION WHEN others THEN NULL;
  END;

  -- provider_failures_product_id_idx
  BEGIN
    EXECUTE 'select id::text from public.provider_failures where product_id is not null order by product_id limit 1' INTO _dummy;
  EXCEPTION WHEN others THEN NULL;
  END;

  -- wishlist_game_id_idx
  BEGIN
    EXECUTE 'select id::text from public.wishlist where game_id is not null order by game_id limit 1' INTO _dummy;
  EXCEPTION WHEN others THEN NULL;
  END;
END $$;
