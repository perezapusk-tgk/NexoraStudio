-- Defense-in-depth constraints for enum-like API fields.
-- NOT VALID keeps startup safe if an old database already contains legacy values;
-- new writes must satisfy the constraints immediately.

do $$
begin
  if not exists (select 1 from pg_constraint where conname='users_role_allowed') then
    alter table users add constraint users_role_allowed
      check (role in ('superadmin','owner','admin','member','viewer')) not valid;
  end if;

  if not exists (select 1 from pg_constraint where conname='team_invitations_role_allowed') then
    alter table team_invitations add constraint team_invitations_role_allowed
      check (role in ('admin','member','viewer')) not valid;
  end if;

  if not exists (select 1 from pg_constraint where conname='projects_type_allowed') then
    alter table projects add constraint projects_type_allowed
      check (project_type in ('website','miniapp','site_miniapp')) not valid;
  end if;

  if not exists (select 1 from pg_constraint where conname='projects_status_allowed') then
    alter table projects add constraint projects_status_allowed
      check (status in ('draft','published','archived')) not valid;
  end if;

  if not exists (select 1 from pg_constraint where conname='leads_status_allowed') then
    alter table leads add constraint leads_status_allowed
      check (status in ('new','in_progress','won','lost')) not valid;
  end if;

  if not exists (select 1 from pg_constraint where conname='bookings_status_allowed') then
    alter table bookings add constraint bookings_status_allowed
      check (status in ('pending','confirmed','completed','cancelled')) not valid;
  end if;

  if not exists (select 1 from pg_constraint where conname='payments_status_allowed') then
    alter table payments add constraint payments_status_allowed
      check (status in ('pending','paid','refunded','failed')) not valid;
  end if;

  if not exists (select 1 from pg_constraint where conname='invoices_status_allowed') then
    alter table invoices add constraint invoices_status_allowed
      check (status in ('draft','sent','paid','overdue','cancelled')) not valid;
  end if;

  if not exists (select 1 from pg_constraint where conname='orders_status_allowed') then
    alter table orders add constraint orders_status_allowed
      check (status in ('pending','paid','cancelled','refunded')) not valid;
  end if;
end $$;
