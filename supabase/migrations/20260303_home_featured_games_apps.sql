-- Allow selecting which games/apps appear on Home sections
alter table public.games
  add column if not exists show_on_home boolean not null default true;

create index if not exists games_show_on_home_category_idx
  on public.games (show_on_home, category);
