-- Enable Row-Level Security on every tenant-scoped table.
-- Policies key off the `app.user_id` GUC, which the runtime client sets
-- inside `withUser()`. No fallback on current_setting() — if the app forgets
-- to set the GUC, the query errors (fail-closed). The `postgres` superuser
-- has BYPASSRLS so migrations and admin tasks ignore policies.

ALTER TABLE "runs" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "runs_tenant_isolation" ON "runs"
  FOR ALL
  TO app
  USING ("user_id" = current_setting('app.user_id')::uuid)
  WITH CHECK ("user_id" = current_setting('app.user_id')::uuid);

-- The `users` table is the tenant root and is not RLS-protected. The app role
-- gets SELECT only (no writes); userId on every other table FKs into this.
REVOKE INSERT, UPDATE, DELETE ON "users" FROM app;

-- Seed the single hardcoded v1 user. ON CONFLICT makes the migration
-- idempotent if it ever re-runs against an existing DB.
INSERT INTO "users" ("id", "email", "display_name")
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'doubleoevan@gmail.com',
  'Evan'
)
ON CONFLICT ("id") DO NOTHING;
