#!/bin/bash
# Runs once on first container boot (when the data volume is empty).
# Creates the non-superuser `app` role used by the runtime client. RLS
# policies apply to this role; the superuser bypasses them.
set -euo pipefail

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
  CREATE ROLE app WITH LOGIN PASSWORD '${APP_DB_PASSWORD}' NOINHERIT;
  GRANT CONNECT ON DATABASE ${POSTGRES_DB} TO app;
  GRANT USAGE ON SCHEMA public TO app;
  -- Future tables created by the superuser (migrations) auto-grant CRUD to app.
  ALTER DEFAULT PRIVILEGES IN SCHEMA public
    GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO app;
  ALTER DEFAULT PRIVILEGES IN SCHEMA public
    GRANT USAGE, SELECT ON SEQUENCES TO app;
EOSQL
