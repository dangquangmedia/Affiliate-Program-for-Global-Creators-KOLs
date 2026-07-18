-- Separate runtime privileges from migration/table ownership.
-- NOLOGIN intentionally has no password; deployment grants it to a secret-managed login role.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'affiliate_runtime') THEN
    CREATE ROLE affiliate_runtime NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT;
  END IF;
END
$$;

GRANT USAGE ON SCHEMA public TO affiliate_runtime;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO affiliate_runtime;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO affiliate_runtime;

ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO affiliate_runtime;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO affiliate_runtime;

