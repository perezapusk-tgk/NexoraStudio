-- Public project identity is addressable by slug and custom domain.
-- Keep both globally unique to prevent ambiguous public routing.

with ranked_domains as (
  select id, domain,
         row_number() over (partition by lower(domain) order by created_at, id) as rn
  from projects
  where domain is not null and trim(domain) <> ''
)
update projects p
set domain = null,
    updated_at = now()
from ranked_domains r
where p.id = r.id
  and r.rn > 1;

create unique index if not exists projects_domain_global_unique
  on projects (lower(domain))
  where domain is not null;

create or replace function nexora_unique_project_slug()
returns trigger
language plpgsql
as $$
declare
  base text;
  candidate text;
  suffix integer := 2;
begin
  base := lower(trim(new.slug));
  candidate := base;

  while exists (
    select 1 from projects
    where lower(slug)=lower(candidate)
      and id <> coalesce(new.id, '00000000-0000-0000-0000-000000000000'::uuid)
  ) loop
    candidate := base || '-' || suffix::text;
    suffix := suffix + 1;
  end loop;

  new.slug := candidate;
  return new;
end;
$$;

drop trigger if exists projects_unique_public_slug on projects;

create trigger projects_unique_public_slug
before insert on projects
for each row
execute function nexora_unique_project_slug();
