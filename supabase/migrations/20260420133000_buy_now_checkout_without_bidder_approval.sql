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
as $$
declare
  v_actor_id uuid := auth.uid();
  v_profile public.profiles%rowtype;
  v_listing public.listings%rowtype;
  v_order_id uuid;
  v_due_at timestamptz := timezone('utc', now()) + interval '7 days';
begin
  if v_actor_id is null then
    raise exception 'You must be signed in to continue.';
  end if;

  select *
  into v_profile
  from public.profiles
  where id = v_actor_id;

  if not found then
    raise exception 'Your profile could not be loaded.';
  end if;

  select *
  into v_listing
  from public.listings
  where id = p_listing_id
  for update;

  if not found then
    raise exception 'Listing not found.';
  end if;

  if v_listing.sale_type <> 'buy_now' then
    raise exception 'This listing is not available for direct checkout.';
  end if;

  if v_listing.status <> 'published' then
    raise exception 'This listing is no longer available.';
  end if;

  if v_listing.buy_now_price_pence is null then
    raise exception 'This listing is missing a buy-now price.';
  end if;

  if v_listing.seller_profile_id = v_actor_id then
    raise exception 'You cannot purchase your own listing.';
  end if;

  if exists (
    select 1
    from public.orders
    where listing_id = v_listing.id
      and status in ('awaiting_payment', 'paid', 'fulfilled')
  ) then
    raise exception 'This listing is already reserved.';
  end if;

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
    'buy_now',
    'awaiting_payment',
    v_listing.buy_now_price_pence,
    v_due_at
  )
  returning id into v_order_id;

  update public.listings
  set status = 'sold',
      winner_profile_id = v_actor_id,
      sold_at = timezone('utc', now()),
      settlement_order_id = v_order_id,
      current_price_pence = v_listing.buy_now_price_pence
  where id = v_listing.id;

  perform public.enqueue_notification(
    v_actor_id,
    'buy_now_reserved',
    'Purchase started',
    'Your order is waiting for payment.',
    'order',
    v_order_id,
    jsonb_build_object(
      'order_id', v_order_id,
      'listing_id', v_listing.id,
      'amount_pence', v_listing.buy_now_price_pence
    )
  );

  perform public.enqueue_notification(
    v_listing.seller_profile_id,
    'listing_reserved',
    'Listing reserved',
    'A buyer started checkout for one of your listings.',
    'order',
    v_order_id,
    jsonb_build_object(
      'order_id', v_order_id,
      'listing_id', v_listing.id,
      'amount_pence', v_listing.buy_now_price_pence
    )
  );

  perform public.notify_admins(
    'order_created',
    'Buy-now order created',
    'A buyer started checkout on a buy-now listing.',
    'order',
    v_order_id,
    jsonb_build_object(
      'order_id', v_order_id,
      'listing_id', v_listing.id,
      'amount_pence', v_listing.buy_now_price_pence
    )
  );

  return query
  select v_order_id, v_listing.buy_now_price_pence, v_due_at;
end;
$$;
