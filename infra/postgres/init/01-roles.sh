#!/bin/bash
# creates the non-superuser `app` role on first container boot
set -euo pipefail

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
  CREATE ROLE app WITH LOGIN PASSWORD '${APP_DB_PASSWORD}' NOINHERIT;
  GRANT CONNECT ON DATABASE ${POSTGRES_DB} TO app;
  GRANT USAGE ON SCHEMA public TO app;
  -- future tables created by migrations auto-grant CRUD to app
  ALTER DEFAULT PRIVILEGES IN SCHEMA public
    GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO app;
  ALTER DEFAULT PRIVILEGES IN SCHEMA public
    GRANT USAGE, SELECT ON SEQUENCES TO app;
EOSQL
