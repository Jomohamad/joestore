begin;

-- admins: remove surrogate id/created_by, use user_id as PK
alter table public.admins drop constraint if exists admins_pkey;
alter table public.admins drop column if exists id;
alter table public.admins drop column if exists created_by;
drop index if exists public.admins_user_id_idx;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.admins'::regclass
      and contype = 'p'
  ) then
    alter table public.admins add primary key (user_id);
  end if;
end $$;

-- games: drop unused presentation/stat fields
alter table public.games drop column if exists currency_icon;
alter table public.games drop column if exists color_theme;
alter table public.games drop column if exists genre;
alter table public.games drop column if exists popularity;
alter table public.games drop column if exists min_price;
alter table public.games drop column if exists rating;
alter table public.games drop column if exists reviews_count;

-- orders: drop player_id
alter table public.orders drop column if exists player_id;

-- promotions: drop subtitles
alter table public.promotions drop column if exists subtitle_en;
alter table public.promotions drop column if exists subtitle_ar;

-- wishlist: drop package-level wishlist, keep one row per (user_id, game_id)
drop index if exists public.wishlist_unique_item_idx;
alter table public.wishlist drop column if exists package_id;

delete from public.wishlist w
using (
  select ctid
  from (
    select
      ctid,
      row_number() over (
        partition by user_id, game_id
        order by created_at asc, ctid asc
      ) as rn
    from public.wishlist
  ) ranked
  where ranked.rn > 1
) dupes
where w.ctid = dupes.ctid;

create unique index if not exists wishlist_unique_item_idx
  on public.wishlist (user_id, game_id);

commit;
