-- Allow the platform owner role used by the Nexora owner dashboard.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'users_role_chk' AND conrelid = 'users'::regclass) THEN
    ALTER TABLE users DROP CONSTRAINT users_role_chk;
  END IF;
  ALTER TABLE users ADD CONSTRAINT users_role_chk CHECK (role IN ('owner','admin','member','superadmin'));
END $$;
