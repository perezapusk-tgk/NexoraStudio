-- Production query indexes for CRM, booking, catalog and analytics workloads.
create index if not exists idx_clients_studio_created
  on clients(studio_id, created_at desc);

create index if not exists idx_clients_studio_phone
  on clients(studio_id, phone);

create index if not exists idx_leads_project_status_created
  on leads(project_id, status, created_at desc);

create index if not exists idx_bookings_project_status_start
  on bookings(project_id, status, starts_at);

create index if not exists idx_catalog_project_active_created
  on catalog_items(project_id, active, created_at desc);

create index if not exists idx_projects_studio_status_updated
  on projects(studio_id, status, updated_at desc);

create index if not exists idx_events_project_type_created
  on analytics_events(project_id, event_type, created_at desc);
