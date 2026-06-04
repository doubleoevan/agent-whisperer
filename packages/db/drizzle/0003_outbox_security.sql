-- index for the coordinator's claim query
CREATE INDEX "outbox_pending_idx" ON "outbox" ("created_at") WHERE "status" = 'pending';

-- row-level security on outbox; app role can only enqueue for itself
ALTER TABLE "outbox" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "outbox_tenant_isolation" ON "outbox"
  FOR ALL
  TO app
  USING ("user_id" = current_setting('app.user_id')::uuid)
  WITH CHECK ("user_id" = current_setting('app.user_id')::uuid);
