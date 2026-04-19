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
as E'
begin
  new.updated_at = timezone(''utc'', now())\073
  return new\073
end\073
';

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as E'
begin
  insert into public.profiles (id, full_name)
  values (new.id, new.raw_user_meta_data ->> ''full_name'')
  on conflict (id) do nothing\073

  return new\073
end\073
';

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
as E'
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role = ''admin''
  )\073
';

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
as E'
declare
  v_actor_id uuid := auth.uid()\073
  v_profile public.profiles%rowtype\073
  v_auction public.auctions%rowtype\073
  v_listing public.listings%rowtype\073
  v_minimum_bid bigint\073
  v_bid_id uuid\073
  v_now timestamptz := timezone(''utc'', now())\073
  v_new_end_at timestamptz\073
begin
  if v_actor_id is null then
    raise exception ''You must be signed in to place a bid.''\073
  end if\073

  select *
  into v_profile
  from public.profiles
  where id = v_actor_id\073

  if not found then
    raise exception ''Your profile could not be loaded.''\073
  end if\073

  if v_profile.role not in (''buyer'', ''admin'') then
    raise exception ''This account is not allowed to place bids.''\073
  end if\073

  select *
  into v_auction
  from public.auctions
  where id = p_auction_id
  for update\073

  if not found then
    raise exception ''Auction not found.''\073
  end if\073

  select *
  into v_listing
  from public.listings
  where id = v_auction.listing_id
  for update\073

  if v_auction.status <> ''live'' then
    raise exception ''This auction is not currently live.''\073
  end if\073

  if v_auction.start_at > v_now or v_auction.end_at <= v_now then
    raise exception ''This auction is no longer accepting bids.''\073
  end if\073

  if v_listing.status <> ''published'' then
    raise exception ''This listing is not accepting bids.''\073
  end if\073

  if v_listing.seller_profile_id = v_actor_id then
    raise exception ''You cannot bid on your own listing.''\073
  end if\073

  v_minimum_bid := greatest(
    coalesce(v_listing.starting_bid_pence, 0),
    coalesce(v_auction.current_bid_pence, 0) + coalesce(v_listing.bid_increment_pence, 5000)
  )\073

  if p_amount_pence < v_minimum_bid then
    raise exception ''Bid must be at least % pence.'', v_minimum_bid\073
  end if\073

  insert into public.bids (auction_id, listing_id, bidder_id, amount_pence)
  values (v_auction.id, v_listing.id, v_actor_id, p_amount_pence)
  returning id into v_bid_id\073

  if v_auction.end_at - v_now <= make_interval(secs => v_auction.anti_sniping_window_seconds) then
    v_new_end_at := v_auction.end_at + make_interval(secs => v_auction.extension_seconds)\073
  else
    v_new_end_at := v_auction.end_at\073
  end if\073

  update public.auctions
  set current_bid_pence = p_amount_pence,
      current_bid_id = v_bid_id,
      bid_count = bid_count + 1,
      end_at = v_new_end_at
  where id = v_auction.id\073

  update public.listings
  set current_price_pence = p_amount_pence
  where id = v_listing.id\073

  insert into public.audit_logs (actor_id, entity_type, entity_id, action, payload)
  values (
    v_actor_id,
    ''auction'',
    v_auction.id,
    ''bid_placed'',
    jsonb_build_object(
      ''listing_id'', v_listing.id,
      ''bid_id'', v_bid_id,
      ''amount_pence'', p_amount_pence,
      ''end_at'', v_new_end_at
    )
  )\073

  return query
  select
    v_bid_id,
    p_amount_pence,
    p_amount_pence + coalesce(v_listing.bid_increment_pence, 5000),
    v_new_end_at\073
end\073
';

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

alter table public.profiles
  add column if not exists email text,
  add column if not exists bidder_status text not null default 'pending',
  add column if not exists bidder_status_reason text,
  add column if not exists bidder_approved_at timestamptz,
  add column if not exists bidder_approved_by uuid references public.profiles (id) on delete set null,
  add column if not exists phone_verified_at timestamptz;

alter table public.profiles
  drop constraint if exists profiles_bidder_status_check;

alter table public.profiles
  add constraint profiles_bidder_status_check
  check (bidder_status in ('pending', 'approved', 'rejected'));

update public.profiles as p
set email = u.email
from auth.users as u
where u.id = p.id
  and p.email is distinct from u.email;

alter table public.listings
  add column if not exists reserve_price_pence bigint,
  add column if not exists winner_profile_id uuid references public.profiles (id) on delete set null,
  add column if not exists sold_at timestamptz,
  add column if not exists settlement_order_id uuid;

alter table public.auctions
  add column if not exists winner_bid_id uuid,
  add column if not exists ended_at timestamptz,
  add column if not exists settled_at timestamptz,
  add column if not exists settled_by uuid references public.profiles (id) on delete set null,
  add column if not exists cancelled_reason text;

create table if not exists public.watchlist_entries (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings (id) on delete cascade,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now()),
  unique (listing_id, profile_id)
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  kind text not null,
  title text not null,
  body text not null,
  entity_type text,
  entity_id uuid,
  data jsonb not null default '{}'::jsonb,
  read_at timestamptz,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings (id) on delete restrict,
  auction_id uuid references public.auctions (id) on delete set null,
  bid_id uuid references public.bids (id) on delete set null,
  buyer_profile_id uuid not null references public.profiles (id) on delete restrict,
  seller_profile_id uuid references public.profiles (id) on delete set null,
  kind text not null check (kind in ('auction_win', 'buy_now')),
  status text not null default 'awaiting_payment' check (
    status in ('awaiting_payment', 'paid', 'fulfilled', 'cancelled', 'refunded')
  ),
  amount_pence bigint not null check (amount_pence > 0),
  due_at timestamptz,
  payment_reference text,
  payment_notes text,
  paid_at timestamptz,
  fulfilled_at timestamptz,
  cancelled_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create unique index if not exists orders_one_auction_order_idx
  on public.orders (auction_id)
  where auction_id is not null;

create unique index if not exists orders_one_open_listing_order_idx
  on public.orders (listing_id)
  where status in ('awaiting_payment', 'paid', 'fulfilled');

drop trigger if exists orders_set_updated_at on public.orders;
create trigger orders_set_updated_at
before update on public.orders
for each row execute function public.set_updated_at();

alter table public.listings
  drop constraint if exists listings_settlement_order_fk;

alter table public.listings
  add constraint listings_settlement_order_fk
  foreign key (settlement_order_id) references public.orders (id) on delete set null;

alter table public.auctions
  drop constraint if exists auctions_winner_bid_fk;

alter table public.auctions
  add constraint auctions_winner_bid_fk
  foreign key (winner_bid_id) references public.bids (id) on delete set null;

update public.auctions
set current_bid_pence = null
where current_bid_id is null
  and bid_count = 0;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as E'
begin
  insert into public.profiles (id, full_name, phone, email)
  values (
    new.id,
    new.raw_user_meta_data ->> ''full_name'',
    new.raw_user_meta_data ->> ''phone'',
    new.email
  )
  on conflict (id) do update
  set full_name = coalesce(public.profiles.full_name, excluded.full_name),
      phone = coalesce(public.profiles.phone, excluded.phone),
      email = coalesce(public.profiles.email, excluded.email)\073

  return new\073
end\073
';

create or replace function public.enqueue_notification(
  p_profile_id uuid,
  p_kind text,
  p_title text,
  p_body text,
  p_entity_type text default null,
  p_entity_id uuid default null,
  p_data jsonb default '{}'::jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as E'
begin
  if p_profile_id is null then
    return\073
  end if\073

  insert into public.notifications (
    profile_id,
    kind,
    title,
    body,
    entity_type,
    entity_id,
    data
  )
  values (
    p_profile_id,
    p_kind,
    p_title,
    p_body,
    p_entity_type,
    p_entity_id,
    coalesce(p_data, ''{}''::jsonb)
  )\073
end\073
';

create or replace function public.notify_admins(
  p_kind text,
  p_title text,
  p_body text,
  p_entity_type text default null,
  p_entity_id uuid default null,
  p_data jsonb default '{}'::jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as E'
begin
  insert into public.notifications (
    profile_id,
    kind,
    title,
    body,
    entity_type,
    entity_id,
    data
  )
  select
    id,
    p_kind,
    p_title,
    p_body,
    p_entity_type,
    p_entity_id,
    coalesce(p_data, ''{}''::jsonb)
  from public.profiles
  where role = ''admin''\073
end\073
';

create or replace function public.create_listing_with_auction(
  p_title text,
  p_slug text,
  p_brand text default null,
  p_summary text default null,
  p_description text default null,
  p_location text default null,
  p_hero_image_url text default null,
  p_gallery_urls jsonb default '[]'::jsonb,
  p_tags text[] default '{}'::text[],
  p_sale_type public.sale_type default 'auction',
  p_featured boolean default false,
  p_original_price_pence bigint default null,
  p_buy_now_price_pence bigint default null,
  p_starting_bid_pence bigint default null,
  p_bid_increment_pence bigint default 5000,
  p_reserve_price_pence bigint default null,
  p_auction_starts_at timestamptz default null,
  p_auction_ends_at timestamptz default null,
  p_seller_profile_id uuid default null
)
returns table (
  listing_id uuid,
  listing_slug text
)
language plpgsql
security definer
set search_path = public
as E'
declare
  v_actor_id uuid := auth.uid()\073
  v_listing_id uuid\073
  v_now timestamptz := timezone(''utc'', now())\073
  v_seller_id uuid := coalesce(p_seller_profile_id, v_actor_id)\073
begin
  if not public.is_admin() then
    raise exception ''Only admins can create listings.''\073
  end if\073

  if p_sale_type = ''buy_now'' and p_buy_now_price_pence is null then
    raise exception ''Buy-now listings require a price.''\073
  end if\073

  if p_sale_type = ''auction'' and (
    p_starting_bid_pence is null
    or p_auction_starts_at is null
    or p_auction_ends_at is null
  ) then
    raise exception ''Auction listings require a starting bid, start time, and end time.''\073
  end if\073

  if p_sale_type = ''auction'' and p_auction_ends_at <= p_auction_starts_at then
    raise exception ''Auction end time must be after the start time.''\073
  end if\073

  if v_seller_id is not null and not exists (
    select 1
    from public.profiles
    where id = v_seller_id
  ) then
    raise exception ''Selected seller profile was not found.''\073
  end if\073

  insert into public.listings (
    slug,
    title,
    brand,
    summary,
    description,
    location,
    hero_image_url,
    gallery_urls,
    tags,
    sale_type,
    status,
    featured,
    original_price_pence,
    buy_now_price_pence,
    starting_bid_pence,
    bid_increment_pence,
    reserve_price_pence,
    current_price_pence,
    seller_profile_id,
    created_by
  )
  values (
    p_slug,
    p_title,
    nullif(p_brand, ''''),
    nullif(p_summary, ''''),
    nullif(p_description, ''''),
    nullif(p_location, ''''),
    nullif(p_hero_image_url, ''''),
    coalesce(p_gallery_urls, ''[]''::jsonb),
    coalesce(p_tags, ''{}''::text[]),
    p_sale_type,
    ''published'',
    coalesce(p_featured, false),
    p_original_price_pence,
    p_buy_now_price_pence,
    p_starting_bid_pence,
    coalesce(p_bid_increment_pence, 5000),
    p_reserve_price_pence,
    case
      when p_sale_type = ''auction'' then p_starting_bid_pence
      else p_buy_now_price_pence
    end,
    v_seller_id,
    v_actor_id
  )
  returning id into v_listing_id\073

  if p_sale_type = ''auction'' then
    insert into public.auctions (
      listing_id,
      status,
      start_at,
      end_at,
      current_bid_pence
    )
    values (
      v_listing_id,
      case
        when p_auction_starts_at <= v_now and p_auction_ends_at > v_now then ''live''
        when p_auction_ends_at <= v_now then ''ended''
        else ''scheduled''
      end,
      p_auction_starts_at,
      p_auction_ends_at,
      null
    )\073
  end if\073

  insert into public.audit_logs (
    actor_id,
    entity_type,
    entity_id,
    action,
    payload
  )
  values (
    v_actor_id,
    ''listing'',
    v_listing_id,
    ''listing_created'',
    jsonb_build_object(
      ''sale_type'', p_sale_type,
      ''seller_profile_id'', v_seller_id
    )
  )\073

  perform public.notify_admins(
    ''listing_created'',
    ''Listing created'',
    ''A new listing was created and published.'',
    ''listing'',
    v_listing_id,
    jsonb_build_object(''listing_id'', v_listing_id, ''sale_type'', p_sale_type)
  )\073

  return query
  select v_listing_id, p_slug\073
end\073
';

create or replace function public.get_bid_feed(
  p_auction_id uuid,
  p_limit integer default 8
)
returns table (
  id uuid,
  amount_pence bigint,
  created_at timestamptz,
  is_current boolean
)
language sql
security definer
set search_path = public
as E'
  select
    b.id,
    b.amount_pence,
    b.created_at,
    b.id = a.current_bid_id as is_current
  from public.bids as b
  join public.auctions as a
    on a.id = b.auction_id
  join public.listings as l
    on l.id = a.listing_id
  where b.auction_id = p_auction_id
    and (
      l.status = ''published''
      or auth.uid() = l.seller_profile_id
      or auth.uid() = l.winner_profile_id
      or public.is_admin()
    )
  order by b.created_at desc
  limit greatest(coalesce(p_limit, 8), 1)\073
';

create or replace function public.sync_auction_states()
returns table (
  started_count integer,
  ended_count integer,
  settled_count integer
)
language plpgsql
security definer
set search_path = public
as E'
declare
  v_now timestamptz := timezone(''utc'', now())\073
  v_started integer := 0\073
  v_ended integer := 0\073
  v_settled integer := 0\073
begin
  update public.auctions
  set status = ''live''
  where status = ''scheduled''
    and start_at <= v_now
    and end_at > v_now\073

  get diagnostics v_started = row_count\073

  update public.auctions
  set status = ''ended'',
      ended_at = coalesce(ended_at, v_now)
  where status in (''scheduled'', ''live'')
    and end_at <= v_now\073

  get diagnostics v_ended = row_count\073

  with settlement_candidates as (
    select
      a.id as auction_id,
      a.listing_id,
      a.current_bid_id,
      a.current_bid_pence,
      b.bidder_id as buyer_profile_id,
      l.seller_profile_id
    from public.auctions as a
    join public.listings as l
      on l.id = a.listing_id
    join public.bids as b
      on b.id = a.current_bid_id
    left join public.orders as o
      on o.auction_id = a.id
     and o.status in (''awaiting_payment'', ''paid'', ''fulfilled'')
    where a.status = ''ended''
      and a.current_bid_id is not null
      and o.id is null
  ),
  inserted_orders as (
    insert into public.orders (
      listing_id,
      auction_id,
      bid_id,
      buyer_profile_id,
      seller_profile_id,
      kind,
      status,
      amount_pence,
      due_at
    )
    select
      listing_id,
      auction_id,
      current_bid_id,
      buyer_profile_id,
      seller_profile_id,
      ''auction_win'',
      ''awaiting_payment'',
      current_bid_pence,
      v_now + interval ''7 days''
    from settlement_candidates
    returning id, listing_id, auction_id, buyer_profile_id, seller_profile_id, amount_pence
  ),
  updated_listings as (
    update public.listings as l
    set status = ''sold'',
        winner_profile_id = i.buyer_profile_id,
        sold_at = coalesce(l.sold_at, v_now),
        settlement_order_id = i.id,
        current_price_pence = i.amount_pence
    from inserted_orders as i
    where l.id = i.listing_id
    returning l.id
  ),
  updated_auctions as (
    update public.auctions as a
    set winner_bid_id = a.current_bid_id,
        settled_at = coalesce(a.settled_at, v_now)
    from inserted_orders as i
    where a.id = i.auction_id
    returning a.id
  ),
  buyer_notifications as (
    insert into public.notifications (
      profile_id,
      kind,
      title,
      body,
      entity_type,
      entity_id,
      data
    )
    select
      i.buyer_profile_id,
      ''auction_won'',
      ''Auction won'',
      ''You placed the winning bid. Payment is now due.'',
      ''order'',
      i.id,
      jsonb_build_object(
        ''order_id'', i.id,
        ''listing_id'', i.listing_id,
        ''amount_pence'', i.amount_pence
      )
    from inserted_orders as i
    returning id
  ),
  seller_notifications as (
    insert into public.notifications (
      profile_id,
      kind,
      title,
      body,
      entity_type,
      entity_id,
      data
    )
    select
      i.seller_profile_id,
      ''auction_sold'',
      ''Auction ended with a winner'',
      ''A winning bidder is waiting for payment.'',
      ''order'',
      i.id,
      jsonb_build_object(
        ''order_id'', i.id,
        ''listing_id'', i.listing_id,
        ''amount_pence'', i.amount_pence
      )
    from inserted_orders as i
    where i.seller_profile_id is not null
    returning id
  ),
  admin_notifications as (
    insert into public.notifications (
      profile_id,
      kind,
      title,
      body,
      entity_type,
      entity_id,
      data
    )
    select
      p.id,
      ''order_created'',
      ''Auction settlement created'',
      ''A winning bidder is ready for settlement.'',
      ''order'',
      i.id,
      jsonb_build_object(
        ''order_id'', i.id,
        ''listing_id'', i.listing_id,
        ''amount_pence'', i.amount_pence
      )
    from inserted_orders as i
    cross join public.profiles as p
    where p.role = ''admin''
    returning id
  )
  select count(*) into v_settled
  from inserted_orders\073

  return query
  select v_started, v_ended, v_settled\073
end\073
';

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
as E'
declare
  v_actor_id uuid := auth.uid()\073
  v_profile public.profiles%rowtype\073
  v_auction public.auctions%rowtype\073
  v_listing public.listings%rowtype\073
  v_minimum_bid bigint\073
  v_bid_id uuid\073
  v_now timestamptz := timezone(''utc'', now())\073
  v_new_end_at timestamptz\073
  v_previous_high_bidder uuid\073
begin
  if v_actor_id is null then
    raise exception ''You must be signed in to place a bid.''\073
  end if\073

  perform public.sync_auction_states()\073

  select *
  into v_profile
  from public.profiles
  where id = v_actor_id\073

  if not found then
    raise exception ''Your profile could not be loaded.''\073
  end if\073

  if v_profile.role <> ''admin'' and v_profile.bidder_status <> ''approved'' then
    raise exception ''Your account is still waiting for bidder approval.''\073
  end if\073

  select *
  into v_auction
  from public.auctions
  where id = p_auction_id
  for update\073

  if not found then
    raise exception ''Auction not found.''\073
  end if\073

  select *
  into v_listing
  from public.listings
  where id = v_auction.listing_id
  for update\073

  if v_auction.status <> ''live'' then
    raise exception ''This auction is not currently live.''\073
  end if\073

  if v_auction.start_at > v_now or v_auction.end_at <= v_now then
    raise exception ''This auction is no longer accepting bids.''\073
  end if\073

  if v_listing.status <> ''published'' then
    raise exception ''This listing is not accepting bids.''\073
  end if\073

  if v_listing.seller_profile_id = v_actor_id then
    raise exception ''You cannot bid on your own listing.''\073
  end if\073

  if v_auction.current_bid_id is null then
    v_minimum_bid := coalesce(v_listing.starting_bid_pence, 0)\073
  else
    select bidder_id
    into v_previous_high_bidder
    from public.bids
    where id = v_auction.current_bid_id\073

    v_minimum_bid := coalesce(v_auction.current_bid_pence, 0) + coalesce(v_listing.bid_increment_pence, 5000)\073
  end if\073

  if p_amount_pence < v_minimum_bid then
    raise exception ''Bid must be at least % pence.'', v_minimum_bid\073
  end if\073

  insert into public.bids (auction_id, listing_id, bidder_id, amount_pence)
  values (v_auction.id, v_listing.id, v_actor_id, p_amount_pence)
  returning id into v_bid_id\073

  if v_auction.end_at - v_now <= make_interval(secs => v_auction.anti_sniping_window_seconds) then
    v_new_end_at := v_auction.end_at + make_interval(secs => v_auction.extension_seconds)\073
  else
    v_new_end_at := v_auction.end_at\073
  end if\073

  update public.auctions
  set current_bid_pence = p_amount_pence,
      current_bid_id = v_bid_id,
      bid_count = bid_count + 1,
      end_at = v_new_end_at
  where id = v_auction.id\073

  update public.listings
  set current_price_pence = p_amount_pence
  where id = v_listing.id\073

  insert into public.audit_logs (actor_id, entity_type, entity_id, action, payload)
  values (
    v_actor_id,
    ''auction'',
    v_auction.id,
    ''bid_placed'',
    jsonb_build_object(
      ''listing_id'', v_listing.id,
      ''bid_id'', v_bid_id,
      ''amount_pence'', p_amount_pence,
      ''end_at'', v_new_end_at
    )
  )\073

  perform public.enqueue_notification(
    v_actor_id,
    ''bid_confirmed'',
    ''Bid received'',
    ''Your bid is now live.'',
    ''auction'',
    v_auction.id,
    jsonb_build_object(
      ''listing_id'', v_listing.id,
      ''bid_id'', v_bid_id,
      ''amount_pence'', p_amount_pence
    )
  )\073

  if v_previous_high_bidder is not null and v_previous_high_bidder <> v_actor_id then
    perform public.enqueue_notification(
      v_previous_high_bidder,
      ''outbid'',
      ''You were outbid'',
      ''A higher bid has been placed on a watched auction.'',
      ''auction'',
      v_auction.id,
      jsonb_build_object(
        ''listing_id'', v_listing.id,
        ''bid_id'', v_bid_id,
        ''amount_pence'', p_amount_pence
      )
    )\073
  end if\073

  return query
  select
    v_bid_id,
    p_amount_pence,
    p_amount_pence + coalesce(v_listing.bid_increment_pence, 5000),
    v_new_end_at\073
end\073
';

create or replace function public.start_buy_now_checkout(
  p_listing_id uuid
)
returns table (
  order_id uuid,
  amount_pence bigint,
  due_at timestamptz
)
language plpgsql
security definer
set search_path = public
as E'
declare
  v_actor_id uuid := auth.uid()\073
  v_profile public.profiles%rowtype\073
  v_listing public.listings%rowtype\073
  v_order_id uuid\073
  v_due_at timestamptz := timezone(''utc'', now()) + interval ''7 days''\073
begin
  if v_actor_id is null then
    raise exception ''You must be signed in to continue.''\073
  end if\073

  select *
  into v_profile
  from public.profiles
  where id = v_actor_id\073

  if not found then
    raise exception ''Your profile could not be loaded.''\073
  end if\073

  if v_profile.role <> ''admin'' and v_profile.bidder_status <> ''approved'' then
    raise exception ''Your account is still waiting for bidder approval.''\073
  end if\073

  select *
  into v_listing
  from public.listings
  where id = p_listing_id
  for update\073

  if not found then
    raise exception ''Listing not found.''\073
  end if\073

  if v_listing.sale_type <> ''buy_now'' then
    raise exception ''This listing is not available for direct checkout.''\073
  end if\073

  if v_listing.status <> ''published'' then
    raise exception ''This listing is no longer available.''\073
  end if\073

  if v_listing.buy_now_price_pence is null then
    raise exception ''This listing is missing a buy-now price.''\073
  end if\073

  if v_listing.seller_profile_id = v_actor_id then
    raise exception ''You cannot purchase your own listing.''\073
  end if\073

  if exists (
    select 1
    from public.orders
    where listing_id = v_listing.id
      and status in (''awaiting_payment'', ''paid'', ''fulfilled'')
  ) then
    raise exception ''This listing is already reserved.''\073
  end if\073

  insert into public.orders (
    listing_id,
    buyer_profile_id,
    seller_profile_id,
    kind,
    status,
    amount_pence,
    due_at
  )
  values (
    v_listing.id,
    v_actor_id,
    v_listing.seller_profile_id,
    ''buy_now'',
    ''awaiting_payment'',
    v_listing.buy_now_price_pence,
    v_due_at
  )
  returning id into v_order_id\073

  update public.listings
  set status = ''sold'',
      winner_profile_id = v_actor_id,
      sold_at = timezone(''utc'', now()),
      settlement_order_id = v_order_id,
      current_price_pence = v_listing.buy_now_price_pence
  where id = v_listing.id\073

  perform public.enqueue_notification(
    v_actor_id,
    ''buy_now_reserved'',
    ''Purchase started'',
    ''Your order is waiting for payment.'',
    ''order'',
    v_order_id,
    jsonb_build_object(
      ''order_id'', v_order_id,
      ''listing_id'', v_listing.id,
      ''amount_pence'', v_listing.buy_now_price_pence
    )
  )\073

  perform public.enqueue_notification(
    v_listing.seller_profile_id,
    ''listing_reserved'',
    ''Listing reserved'',
    ''A buyer started checkout for one of your listings.'',
    ''order'',
    v_order_id,
    jsonb_build_object(
      ''order_id'', v_order_id,
      ''listing_id'', v_listing.id,
      ''amount_pence'', v_listing.buy_now_price_pence
    )
  )\073

  perform public.notify_admins(
    ''order_created'',
    ''Buy-now order created'',
    ''A buyer started checkout on a buy-now listing.'',
    ''order'',
    v_order_id,
    jsonb_build_object(
      ''order_id'', v_order_id,
      ''listing_id'', v_listing.id,
      ''amount_pence'', v_listing.buy_now_price_pence
    )
  )\073

  return query
  select v_order_id, v_listing.buy_now_price_pence, v_due_at\073
end\073
';

alter table public.watchlist_entries enable row level security;
alter table public.notifications enable row level security;
alter table public.orders enable row level security;

drop policy if exists "profiles_select_self_or_admin" on public.profiles;
create policy "profiles_select_self_or_admin"
on public.profiles
for select
using (auth.uid() = id or public.is_admin());

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
using (
  status = 'published'
  or public.is_admin()
  or auth.uid() = seller_profile_id
  or auth.uid() = winner_profile_id
);

drop policy if exists "public_can_read_active_auctions" on public.auctions;
create policy "public_can_read_active_auctions"
on public.auctions
for select
using (
  public.is_admin()
  or status in ('scheduled', 'live', 'ended')
  or exists (
    select 1
    from public.listings
    where listings.id = auctions.listing_id
      and (auth.uid() = listings.seller_profile_id or auth.uid() = listings.winner_profile_id)
  )
);

drop policy if exists "bidders_can_read_own_bids" on public.bids;
create policy "bidders_can_read_own_bids"
on public.bids
for select
using (
  auth.uid() = bidder_id
  or public.is_admin()
  or exists (
    select 1
    from public.listings
    where listings.id = bids.listing_id
      and auth.uid() = listings.seller_profile_id
  )
);

drop policy if exists "public_can_read_bids" on public.bids;

drop policy if exists "watchlist_manage_own_entries" on public.watchlist_entries;
create policy "watchlist_manage_own_entries"
on public.watchlist_entries
for all
using (auth.uid() = profile_id or public.is_admin())
with check (auth.uid() = profile_id or public.is_admin());

drop policy if exists "notifications_select_self_or_admin" on public.notifications;
create policy "notifications_select_self_or_admin"
on public.notifications
for select
using (auth.uid() = profile_id or public.is_admin());

drop policy if exists "notifications_update_self_or_admin" on public.notifications;
create policy "notifications_update_self_or_admin"
on public.notifications
for update
using (auth.uid() = profile_id or public.is_admin())
with check (auth.uid() = profile_id or public.is_admin());

drop policy if exists "notifications_insert_admins" on public.notifications;
create policy "notifications_insert_admins"
on public.notifications
for insert
with check (public.is_admin());

drop policy if exists "orders_select_related_users_or_admin" on public.orders;
create policy "orders_select_related_users_or_admin"
on public.orders
for select
using (
  public.is_admin()
  or auth.uid() = buyer_profile_id
  or auth.uid() = seller_profile_id
);

drop policy if exists "orders_insert_self_or_admin" on public.orders;
create policy "orders_insert_self_or_admin"
on public.orders
for insert
with check (public.is_admin());

drop policy if exists "orders_update_related_users_or_admin" on public.orders;
create policy "orders_update_related_users_or_admin"
on public.orders
for update
using (public.is_admin())
with check (public.is_admin());
