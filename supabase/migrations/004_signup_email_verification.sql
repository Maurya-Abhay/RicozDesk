-- Public signup requests are created only after the applicant verifies their email.

alter table public.password_reset_otps
  add column if not exists purpose text not null default 'password_reset';

alter table public.password_reset_otps
  drop constraint if exists password_reset_otps_purpose_check;

alter table public.password_reset_otps
  add constraint password_reset_otps_purpose_check
  check (purpose in ('password_reset', 'signup_verification'));

create index if not exists password_reset_otps_user_purpose_created_idx
  on public.password_reset_otps(user_id, purpose, created_at desc);

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public, pg_temp
as $$
declare
  is_public_signup boolean := coalesce(new.raw_user_meta_data->>'public_signup', '') = 'true';
  is_email_verified_signup boolean := coalesce(new.raw_user_meta_data->>'public_signup_verified', '') = 'true';
  is_public_request boolean := is_public_signup and is_email_verified_signup;
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
    case when is_public_signup then 'support_agent'::public.ricozdesk_role else requested_role end,
    case when is_public_signup then 'Customer Support' else requested_team end,
    case when is_public_signup then '{}'::text[] else requested_skills end,
    case when is_public_signup then is_public_request else true end
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
    )
    on conflict (user_id) do nothing;
  end if;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created_ricozdesk on auth.users;
create trigger on_auth_user_created_ricozdesk
after insert on auth.users
for each row execute procedure public.handle_new_auth_user();

-- Clean up requests created by the previous trigger before email verification existed.
delete from public.role_requests request_row
using auth.users auth_user
where request_row.user_id = auth_user.id
  and request_row.status = 'pending'
  and coalesce(auth_user.raw_user_meta_data->>'public_signup', '') = 'true'
  and coalesce(auth_user.raw_user_meta_data->>'public_signup_verified', '') <> 'true';
