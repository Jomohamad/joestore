-- Create Wishlist Table
create table if not exists wishlist (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  game_id text not null,
  created_at timestamptz default now(),
  unique(user_id, game_id)
);

-- Enable RLS
alter table wishlist enable row level security;

-- Policies
create policy "Users can view their own wishlist" 
  on wishlist for select 
  using (auth.uid() = user_id);

create policy "Users can insert into their own wishlist" 
  on wishlist for insert 
  with check (auth.uid() = user_id);

create policy "Users can delete from their own wishlist" 
  on wishlist for delete 
  using (auth.uid() = user_id);
