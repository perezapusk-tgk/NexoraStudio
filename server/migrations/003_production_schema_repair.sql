-- Production schema repair: backfill columns and make project slugs compatible with DNS/public routing.
ALTER TABLE billing_transactions ADD COLUMN IF NOT EXISTS external_id text;
ALTER TABLE billing_transactions ADD COLUMN IF NOT EXISTS provider_payment_id text;
ALTER TABLE billing_transactions ADD COLUMN IF NOT EXISTS checkout_url text;
ALTER TABLE billing_transactions ADD COLUMN IF NOT EXISTS paid_at timestamptz;
CREATE INDEX IF NOT EXISTS idx_billing_transactions_provider_payment
  ON billing_transactions(provider, provider_payment_id);

-- Older databases may contain slugs created before DNS-safe validation was introduced.
-- Normalize existing slugs before recreating the constraint.
DO $$
DECLARE
  r record;
  base_slug text;
  candidate text;
  n integer;
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'projects_slug_dns_chk'
      AND conrelid = 'projects'::regclass
  ) THEN
    ALTER TABLE projects DROP CONSTRAINT projects_slug_dns_chk;
  END IF;

  FOR r IN SELECT id, slug FROM projects LOOP
    base_slug := lower(regexp_replace(coalesce(r.slug, 'project'), '[^a-zA-Z0-9]+', '-', 'g'));
    base_slug := regexp_replace(base_slug, '^-+|-+$', '', 'g');
    IF base_slug = '' THEN base_slug := 'project'; END IF;
    candidate := base_slug;
    n := 1;
    WHILE EXISTS (
      SELECT 1 FROM projects p
      WHERE p.studio_id = (SELECT studio_id FROM projects WHERE id = r.id)
        AND p.slug = candidate
        AND p.id <> r.id
    ) LOOP
      n := n + 1;
      candidate := left(base_slug, 80) || '-' || n::text;
    END LOOP;
    IF candidate <> r.slug THEN
      UPDATE projects SET slug = candidate, updated_at = now() WHERE id = r.id;
    END IF;
  END LOOP;

  ALTER TABLE projects ADD CONSTRAINT projects_slug_dns_chk
    CHECK (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$');
END $$;
