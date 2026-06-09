-- reconciliation: brings row-level security into drizzle's snapshot.
-- migrations 0001 and 0003 already applied the same DDL via raw SQL; this
-- migration is idempotent so a fresh DB and the current DB both end up correct.

ALTER TABLE "runs" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "outbox" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "outbox_pending_idx" ON "outbox" USING btree ("created_at") WHERE "outbox"."status" = 'pending';--> statement-breakpoint
DROP POLICY IF EXISTS "runs_tenant_isolation" ON "runs";--> statement-breakpoint
CREATE POLICY "runs_tenant_isolation" ON "runs" AS PERMISSIVE FOR ALL TO "app" USING ("runs"."user_id" = current_setting('app.user_id')::uuid) WITH CHECK ("runs"."user_id" = current_setting('app.user_id')::uuid);--> statement-breakpoint
DROP POLICY IF EXISTS "outbox_tenant_isolation" ON "outbox";--> statement-breakpoint
CREATE POLICY "outbox_tenant_isolation" ON "outbox" AS PERMISSIVE FOR ALL TO "app" USING ("outbox"."user_id" = current_setting('app.user_id')::uuid) WITH CHECK ("outbox"."user_id" = current_setting('app.user_id')::uuid);
