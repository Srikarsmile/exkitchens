create extension if not exists "pgcrypto";

create type public.app_role as enum ('buyer', 'seller', 'admin');
create type public.sale_type as enum ('auction', 'buy_now');
create type public.listing_status as enum ('draft', 'published', 'sold', 'archived');
create type public.auction_status as enum ('scheduled', 'live', 'ended', 'cancelled');

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  phone text,
  role public.app_role not null default 'buyer',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.listings (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  brand text,
  summary text,
  description text,
  location text,
  hero_image_url text,
  gallery_urls jsonb not null default '[]'::jsonb,
  tags text[] not null default '{}'::text[],
  sale_type public.sale_type not null,
  status public.listing_status not null default 'draft',
  featured boolean not null default false,
  original_price_pence bigint,
  buy_now_price_pence bigint,
  starting_bid_pence bigint,
  bid_increment_pence bigint not null default 5000,
  current_price_pence bigint,
  seller_profile_id uuid references public.profiles (id) on delete set null,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.auctions (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null unique references public.listings (id) on delete cascade,
  status public.auction_status not null default 'scheduled',
  start_at timestamptz not null,
  end_at timestamptz not null,
  current_bid_pence bigint,
  current_bid_id uuid,
  bid_count integer not null default 0,
  anti_sniping_window_seconds integer not null default 300,
  extension_seconds integer not null default 300,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint auctions_end_after_start check (end_at > start_at)
);

create table if not exists public.bids (
  id uuid primary key default gen_random_uuid(),
  auction_id uuid not null references public.auctions (id) on delete cascade,
  listing_id uuid not null references public.listings (id) on delete cascade,
  bidder_id uuid not null references public.profiles (id) on delete cascade,
  amount_pence bigint not null,
  created_at timestamptz not null default timezone('utc', now()),
  constraint bids_amount_positive check (amount_pence > 0)
);

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.profiles (id) on delete set null,
  entity_type text not null,
  entity_id uuid not null,
  action text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

alter table public.auctions
  add constraint auctions_current_bid_fk
  foreign key (current_bid_id) references public.bids (id) on delete set null;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, new.raw_user_meta_data ->> 'full_name')
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

drop trigger if exists listings_set_updated_at on public.listings;
create trigger listings_set_updated_at
before update on public.listings
for each row execute function public.set_updated_at();

drop trigger if exists auctions_set_updated_at on public.auctions;
create trigger auctions_set_updated_at
before update on public.auctions
for each row execute function public.set_updated_at();

create or replace function public.is_admin()
returns boolean
language sql
stable
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role = 'admin'
  );
$$;

create or replace function public.place_bid(
  p_auction_id uuid,
  p_amount_pence bigint
)
returns table (
  bid_id uuid,
  current_bid_pence bigint,
  next_minimum_bid_pence bigint,
  end_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor_id uuid := auth.uid();
  v_profile public.profiles%rowtype;
  v_auction public.auctions%rowtype;
  v_listing public.listings%rowtype;
  v_minimum_bid bigint;
  v_bid_id uuid;
  v_now timestamptz := timezone('utc', now());
  v_new_end_at timestamptz;
begin
  if v_actor_id is null then
    raise exception 'You must be signed in to place a bid.';
  end if;

  select *
  into v_profile
  from public.profiles
  where id = v_actor_id;

  if not found then
    raise exception 'Your profile could not be loaded.';
  end if;

  if v_profile.role not in ('buyer', 'admin') then
    raise exception 'This account is not allowed to place bids.';
  end if;

  select *
  into v_auction
  from public.auctions
  where id = p_auction_id
  for update;

  if not found then
    raise exception 'Auction not found.';
  end if;

  select *
  into v_listing
  from public.listings
  where id = v_auction.listing_id
  for update;

  if v_auction.status <> 'live' then
    raise exception 'This auction is not currently live.';
  end if;

  if v_auction.start_at > v_now or v_auction.end_at <= v_now then
    raise exception 'This auction is no longer accepting bids.';
  end if;

  if v_listing.status <> 'published' then
    raise exception 'This listing is not accepting bids.';
  end if;

  if v_listing.seller_profile_id = v_actor_id then
    raise exception 'You cannot bid on your own listing.';
  end if;

  v_minimum_bid := greatest(
    coalesce(v_listing.starting_bid_pence, 0),
    coalesce(v_auction.current_bid_pence, 0) + coalesce(v_listing.bid_increment_pence, 5000)
  );

  if p_amount_pence < v_minimum_bid then
    raise exception 'Bid must be at least % pence.', v_minimum_bid;
  end if;

  insert into public.bids (auction_id, listing_id, bidder_id, amount_pence)
  values (v_auction.id, v_listing.id, v_actor_id, p_amount_pence)
  returning id into v_bid_id;

  if v_auction.end_at - v_now <= make_interval(secs => v_auction.anti_sniping_window_seconds) then
    v_new_end_at := v_auction.end_at + make_interval(secs => v_auction.extension_seconds);
  else
    v_new_end_at := v_auction.end_at;
  end if;

  update public.auctions
  set current_bid_pence = p_amount_pence,
      current_bid_id = v_bid_id,
      bid_count = bid_count + 1,
      end_at = v_new_end_at
  where id = v_auction.id;

  update public.listings
  set current_price_pence = p_amount_pence
  where id = v_listing.id;

  insert into public.audit_logs (actor_id, entity_type, entity_id, action, payload)
  values (
    v_actor_id,
    'auction',
    v_auction.id,
    'bid_placed',
    jsonb_build_object(
      'listing_id', v_listing.id,
      'bid_id', v_bid_id,
      'amount_pence', p_amount_pence,
      'end_at', v_new_end_at
    )
  );

  return query
  select
    v_bid_id,
    p_amount_pence,
    p_amount_pence + coalesce(v_listing.bid_increment_pence, 5000),
    v_new_end_at;
end;
$$;

alter table public.profiles enable row level security;
alter table public.listings enable row level security;
alter table public.auctions enable row level security;
alter table public.bids enable row level security;
alter table public.audit_logs enable row level security;

drop policy if exists "profiles_select_self_or_admin" on public.profiles;
create policy "profiles_select_self_or_admin"
on public.profiles
for select
using (auth.uid() = id or public.is_admin());

drop policy if exists "profiles_insert_self" on public.profiles;
create policy "profiles_insert_self"
on public.profiles
for insert
with check (auth.uid() = id or public.is_admin());

drop policy if exists "profiles_update_self_or_admin" on public.profiles;
create policy "profiles_update_self_or_admin"
on public.profiles
for update
using (auth.uid() = id or public.is_admin())
with check (auth.uid() = id or public.is_admin());

drop policy if exists "public_can_read_published_listings" on public.listings;
create policy "public_can_read_published_listings"
on public.listings
for select
using (status = 'published' or public.is_admin());

drop policy if exists "admins_manage_listings" on public.listings;
create policy "admins_manage_listings"
on public.listings
for all
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "public_can_read_active_auctions" on public.auctions;
create policy "public_can_read_active_auctions"
on public.auctions
for select
using (public.is_admin() or status in ('scheduled', 'live', 'ended'));

drop policy if exists "admins_manage_auctions" on public.auctions;
create policy "admins_manage_auctions"
on public.auctions
for all
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "bidders_can_read_own_bids" on public.bids;
create policy "bidders_can_read_own_bids"
on public.bids
for select
using (auth.uid() = bidder_id or public.is_admin());

drop policy if exists "public_can_read_bids" on public.bids;
create policy "public_can_read_bids"
on public.bids
for select
using (true);

drop policy if exists "admins_manage_bids" on public.bids;
create policy "admins_manage_bids"
on public.bids
for all
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "admins_read_audit_logs" on public.audit_logs;
create policy "admins_read_audit_logs"
on public.audit_logs
for select
using (public.is_admin());

drop policy if exists "admins_write_audit_logs" on public.audit_logs;
create policy "admins_write_audit_logs"
on public.audit_logs
for insert
with check (public.is_admin());
