-- Public role requests are created by the auth trigger and approved by an admin.

create table if not exists public.role_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  full_name text not null,
  email text not null,
  requested_role public.ricozdesk_role not null,
  requested_team text not null,
  requested_skills text[] not null default '{}',
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  reviewed_by uuid references public.profiles(id),
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint role_requests_public_roles check (requested_role <> 'admin')
);

create index if not exists role_requests_status_created_idx
  on public.role_requests(status, created_at desc);

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public, pg_temp
as $$
declare
  is_public_request boolean := coalesce(new.raw_user_meta_data->>'public_signup', '') = 'true';
  requested_role_text text := new.raw_user_meta_data->>'requested_role';
  requested_role public.ricozdesk_role := case requested_role_text
    when 'support_manager' then 'support_manager'::public.ricozdesk_role
    when 'support_agent' then 'support_agent'::public.ricozdesk_role
    when 'tech_lead' then 'tech_lead'::public.ricozdesk_role
    when 'developer' then 'developer'::public.ricozdesk_role
    else 'support_agent'::public.ricozdesk_role
  end;
  requested_team text := case
    when requested_role_text in ('tech_lead', 'developer') then 'Engineering'
    when requested_role_text = 'support_manager' then 'Management'
    else 'Customer Support'
  end;
  requested_skills text[] := case
    when jsonb_typeof(new.raw_user_meta_data->'skills') = 'array'
      then array(select jsonb_array_elements_text(new.raw_user_meta_data->'skills'))
    else '{}'
  end;
begin
  insert into public.profiles(id, full_name, email, role, team, skills, is_active)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    new.email,
    case when is_public_request then 'support_agent'::public.ricozdesk_role else requested_role end,
    case when is_public_request then 'Customer Support' else requested_team end,
    case when is_public_request then '{}'::text[] else requested_skills end,
    not is_public_request
  )
  on conflict (id) do update set email = excluded.email;

  if is_public_request then
    insert into public.role_requests(
      user_id, full_name, email, requested_role, requested_team, requested_skills
    )
    values (
      new.id,
      coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
      new.email,
      requested_role,
      requested_team,
      requested_skills
    );
  end if;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created_ricozdesk on auth.users;
create trigger on_auth_user_created_ricozdesk
after insert on auth.users
for each row execute procedure public.handle_new_auth_user();

create or replace function public.review_role_request(
  p_request_id uuid,
  p_status text,
  p_role text default null,
  p_team text default null,
  p_skills text[] default '{}'
)
returns public.role_requests
language plpgsql
security definer
set search_path = pg_catalog, public, pg_temp
as $$
declare
  request_row public.role_requests;
  next_role public.ricozdesk_role;
  next_team text;
begin
  if not public.is_ricozdesk_admin() then
    raise exception 'Only an active RicozDesk admin can review role requests.';
  end if;

  if p_status not in ('approved', 'rejected') then
    raise exception 'Role request status must be approved or rejected.';
  end if;

  select * into request_row
  from public.role_requests
  where id = p_request_id
  for update;

  if not found then
    raise exception 'Role request not found.';
  end if;

  if p_status = 'approved' then
    if coalesce(p_role, '') = 'admin' or p_role not in ('support_manager', 'support_agent', 'tech_lead', 'developer') then
      raise exception 'A public request cannot be approved as admin.';
    end if;
    next_role := p_role::public.ricozdesk_role;
    next_team := coalesce(nullif(p_team, ''), case when p_role in ('tech_lead', 'developer') then 'Engineering' else 'Customer Support' end);

    update public.profiles
    set role = next_role,
        team = next_team,
        skills = coalesce(p_skills, '{}'),
        is_active = true
    where id = request_row.user_id;
  else
    update public.profiles
    set is_active = false
    where id = request_row.user_id;
  end if;

  update public.role_requests
  set status = p_status,
      reviewed_by = auth.uid(),
      reviewed_at = now(),
      updated_at = now()
  where id = p_request_id
  returning * into request_row;

  return request_row;
end;
$$;

alter table public.role_requests enable row level security;

drop policy if exists "role_requests_insert_own" on public.role_requests;
create policy "role_requests_insert_own"
on public.role_requests for insert to authenticated
with check (user_id = (select auth.uid()));

drop policy if exists "role_requests_read_own_or_admin" on public.role_requests;
create policy "role_requests_read_own_or_admin"
on public.role_requests for select to authenticated
using (user_id = (select auth.uid()) or public.is_ricozdesk_admin());

drop policy if exists "role_requests_admin_update" on public.role_requests;
create policy "role_requests_admin_update"
on public.role_requests for update to authenticated
using (public.is_ricozdesk_admin())
with check (public.is_ricozdesk_admin());

grant usage on schema public to authenticated;
grant select, insert, update on public.role_requests to authenticated;
grant execute on function public.review_role_request(uuid, text, text, text, text[]) to authenticated;

drop trigger if exists role_requests_updated_at on public.role_requests;
create trigger role_requests_updated_at
before update on public.role_requests
for each row execute procedure public.set_updated_at();
