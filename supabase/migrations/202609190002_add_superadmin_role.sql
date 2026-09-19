-- Super Admin is an application role stored in auth.users.raw_app_meta_data.
-- Existing admins keep their current access. No user data is changed here.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (auth.jwt() -> 'app_metadata' ->> 'role') in ('admin', 'superadmin'),
    false
  );
$$;

create or replace function public.is_superadmin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'superadmin',
    false
  );
$$;

revoke all on function public.is_admin() from public;
revoke all on function public.is_superadmin() from public;
grant execute on function public.is_admin() to authenticated;
grant execute on function public.is_superadmin() to authenticated;
