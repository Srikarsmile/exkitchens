create or replace function public.cancel_buy_now_checkout(
  p_order_id uuid
)
returns table (
  released boolean,
  listing_slug text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor_id uuid := auth.uid();
  v_order public.orders%rowtype;
  v_listing public.listings%rowtype;
  v_now timestamptz := timezone('utc', now());
begin
  if v_actor_id is null then
    raise exception 'You must be signed in to continue.';
  end if;

  select *
  into v_order
  from public.orders
  where id = p_order_id
  for update;

  if not found then
    raise exception 'Order not found.';
  end if;

  if v_order.kind <> 'buy_now' then
    raise exception 'Only buy-now reservations can be cancelled here.';
  end if;

  if v_order.status <> 'awaiting_payment' then
    raise exception 'This order is no longer waiting for payment.';
  end if;

  if v_order.buyer_profile_id <> v_actor_id and not public.is_admin() then
    raise exception 'You cannot cancel this order.';
  end if;

  select *
  into v_listing
  from public.listings
  where id = v_order.listing_id
  for update;

  update public.orders
  set status = 'cancelled',
      payment_notes = 'Buyer cancelled checkout before payment completed.',
      cancelled_at = coalesce(cancelled_at, v_now)
  where id = v_order.id
    and status = 'awaiting_payment';

  update public.listings
  set status = 'published',
      winner_profile_id = null,
      sold_at = null,
      settlement_order_id = null,
      current_price_pence = v_listing.buy_now_price_pence
  where id = v_listing.id
    and settlement_order_id = v_order.id;

  perform public.enqueue_notification(
    v_order.buyer_profile_id,
    'checkout_cancelled',
    'Checkout cancelled',
    'Your buy-now checkout was cancelled and the listing is live again.',
    'order',
    v_order.id,
    jsonb_build_object(
      'order_id', v_order.id,
      'listing_id', v_listing.id,
      'listing_slug', v_listing.slug,
      'status', 'cancelled'
    )
  );

  if v_order.seller_profile_id is not null then
    perform public.enqueue_notification(
      v_order.seller_profile_id,
      'listing_relisted',
      'Listing relisted',
      'A buy-now checkout was cancelled and the kitchen is available again.',
      'order',
      v_order.id,
      jsonb_build_object(
        'order_id', v_order.id,
        'listing_id', v_listing.id,
        'listing_slug', v_listing.slug,
        'status', 'cancelled'
      )
    );
  end if;

  perform public.notify_admins(
    'order_cancelled',
    'Buy-now checkout cancelled',
    'A buyer cancelled a buy-now checkout before payment.',
    'order',
    v_order.id,
    jsonb_build_object(
      'order_id', v_order.id,
      'listing_id', v_listing.id,
      'listing_slug', v_listing.slug,
      'status', 'cancelled'
    )
  );

  return query
  select true, v_listing.slug;
end;
$$;

revoke all on function public.cancel_buy_now_checkout(uuid) from public;
revoke all on function public.cancel_buy_now_checkout(uuid) from anon;
grant execute on function public.cancel_buy_now_checkout(uuid) to authenticated;
grant execute on function public.cancel_buy_now_checkout(uuid) to service_role;
