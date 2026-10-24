-- Nexora subdomains use <slug>.nexora.site, so project slugs must be globally unique.
-- Existing duplicate slugs are deterministically suffixed before the unique index is created.

with ranked as (
  select id, slug,
         row_number() over (partition by lower(slug) order by created_at, id) as rn
  from projects
),
renamed as (
  select id, slug || '-' || rn::text as new_slug
  from ranked
  where rn > 1
)
update projects p
set slug = r.new_slug,
    updated_at = now()
from renamed r
where p.id = r.id;

create unique index if not exists projects_slug_global_unique
  on projects (lower(slug));
