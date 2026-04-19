alter table public.notifications
  add column if not exists email_state text not null default 'pending',
  add column if not exists email_attempts integer not null default 0,
  add column if not exists email_last_error text,
  add column if not exists email_claimed_at timestamptz,
  add column if not exists emailed_at timestamptz;

alter table public.notifications
  drop constraint if exists notifications_email_state_check;

alter table public.notifications
  add constraint notifications_email_state_check
  check (email_state in ('pending', 'processing', 'sent', 'skipped', 'failed'));

create index if not exists notifications_email_delivery_idx
  on public.notifications (email_state, emailed_at, created_at);

create or replace function public.claim_pending_notification_emails(
  p_limit integer default 20
)
returns table (
  id uuid,
  profile_id uuid,
  recipient_email text,
  recipient_name text,
  kind text,
  title text,
  body text,
  entity_type text,
  entity_id uuid,
  data jsonb,
  created_at timestamptz,
  email_attempts integer
)
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
  with candidates as (
    select n.id
    from public.notifications as n
    join public.profiles as p
      on p.id = n.profile_id
    where p.email is not null
      and n.emailed_at is null
      and n.email_state in ('pending', 'failed')
      and (
        n.email_claimed_at is null
        or n.email_claimed_at < timezone('utc', now()) - interval '10 minutes'
      )
    order by n.created_at asc
    limit greatest(coalesce(p_limit, 20), 1)
    for update skip locked
  ),
  claimed as (
    update public.notifications as n
    set email_state = 'processing',
        email_claimed_at = timezone('utc', now()),
        email_attempts = coalesce(n.email_attempts, 0) + 1
    where n.id in (select id from candidates)
    returning n.*
  )
  select
    c.id,
    c.profile_id,
    p.email,
    p.full_name,
    c.kind,
    c.title,
    c.body,
    c.entity_type,
    c.entity_id,
    c.data,
    c.created_at,
    c.email_attempts
  from claimed as c
  join public.profiles as p
    on p.id = c.profile_id;
end;
$$;

revoke all on function public.claim_pending_notification_emails(integer) from public;
revoke all on function public.claim_pending_notification_emails(integer) from anon;
revoke all on function public.claim_pending_notification_emails(integer) from authenticated;
grant execute on function public.claim_pending_notification_emails(integer) to service_role;
