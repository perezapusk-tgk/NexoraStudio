-- Keep the production role constraint aligned with the API.
-- Older databases allowed owner/admin/member/viewer but the platform owner
-- account is intentionally represented as superadmin.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'users_role_chk'
      AND conrelid = 'users'::regclass
  ) THEN
    ALTER TABLE users DROP CONSTRAINT users_role_chk;
  END IF;

  ALTER TABLE users ADD CONSTRAINT users_role_chk
    CHECK (role IN ('superadmin','owner','admin','member','viewer'));
END $$;
