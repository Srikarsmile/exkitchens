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
    where n.id in (select candidates.id from candidates)
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
