-- enable row-level security on tenant tables; no fallback on current_setting → fail-closed
ALTER TABLE "runs" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "runs_tenant_isolation" ON "runs"
  FOR ALL
  TO app
  USING ("user_id" = current_setting('app.user_id')::uuid)
  WITH CHECK ("user_id" = current_setting('app.user_id')::uuid);

-- users is the tenant root; app role reads only
REVOKE INSERT, UPDATE, DELETE ON "users" FROM app;

-- seed the v1 user; ON CONFLICT keeps the migration idempotent
INSERT INTO "users" ("id", "email", "display_name")
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'doubleoevan@gmail.com',
  'Evan'
)
ON CONFLICT ("id") DO NOTHING;
