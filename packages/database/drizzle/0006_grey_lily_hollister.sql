CREATE TABLE "manuscripts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"source_drive_file_id" text NOT NULL,
	"title" text NOT NULL,
	"text" text NOT NULL,
	"ingested_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "manuscripts" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "agents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"name" text NOT NULL,
	"agency" text NOT NULL,
	"materials" text NOT NULL,
	"query_method" text NOT NULL,
	"query_url" text,
	"email" text,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "agents" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "submissions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"manuscript_id" uuid NOT NULL,
	"agent_id" uuid NOT NULL,
	"workflow_id" text NOT NULL,
	"status" text DEFAULT 'drafting' NOT NULL,
	"payload" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"finalized_at" timestamp with time zone,
	CONSTRAINT "submissions_workflow_id_unique" UNIQUE("workflow_id")
);
--> statement-breakpoint
ALTER TABLE "submissions" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "submission_field_library" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"key" text NOT NULL,
	"value" text NOT NULL,
	"last_used_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "submission_field_library" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "submission_field_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"submission_id" uuid NOT NULL,
	"field_path" text NOT NULL,
	"before_value" text,
	"after_value" text NOT NULL,
	"source" text NOT NULL,
	"edited_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "submission_field_history" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "manuscripts" ADD CONSTRAINT "manuscripts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agents" ADD CONSTRAINT "agents_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "submissions" ADD CONSTRAINT "submissions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "submissions" ADD CONSTRAINT "submissions_manuscript_id_manuscripts_id_fk" FOREIGN KEY ("manuscript_id") REFERENCES "public"."manuscripts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "submissions" ADD CONSTRAINT "submissions_agent_id_agents_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."agents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "submission_field_library" ADD CONSTRAINT "submission_field_library_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "submission_field_history" ADD CONSTRAINT "submission_field_history_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "submission_field_history" ADD CONSTRAINT "submission_field_history_submission_id_submissions_id_fk" FOREIGN KEY ("submission_id") REFERENCES "public"."submissions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "manuscripts_user_drive_uniq" ON "manuscripts" USING btree ("user_id","source_drive_file_id");--> statement-breakpoint
CREATE INDEX "manuscripts_user_idx" ON "manuscripts" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "agents_user_idx" ON "agents" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "submissions_user_idx" ON "submissions" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "submissions_user_manuscript_agent_uniq" ON "submissions" USING btree ("user_id","manuscript_id","agent_id");--> statement-breakpoint
CREATE UNIQUE INDEX "submission_field_library_user_key_uniq" ON "submission_field_library" USING btree ("user_id","key");--> statement-breakpoint
CREATE INDEX "submission_field_library_user_idx" ON "submission_field_library" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "submission_field_history_submission_idx" ON "submission_field_history" USING btree ("submission_id","edited_at");--> statement-breakpoint
CREATE INDEX "submission_field_history_user_idx" ON "submission_field_history" USING btree ("user_id");--> statement-breakpoint
CREATE POLICY "manuscripts_tenant_isolation" ON "manuscripts" AS PERMISSIVE FOR ALL TO "app" USING ("manuscripts"."user_id" = current_setting('app.user_id')::uuid) WITH CHECK ("manuscripts"."user_id" = current_setting('app.user_id')::uuid);--> statement-breakpoint
CREATE POLICY "agents_tenant_isolation" ON "agents" AS PERMISSIVE FOR ALL TO "app" USING ("agents"."user_id" = current_setting('app.user_id')::uuid) WITH CHECK ("agents"."user_id" = current_setting('app.user_id')::uuid);--> statement-breakpoint
CREATE POLICY "submissions_tenant_isolation" ON "submissions" AS PERMISSIVE FOR ALL TO "app" USING ("submissions"."user_id" = current_setting('app.user_id')::uuid) WITH CHECK ("submissions"."user_id" = current_setting('app.user_id')::uuid);--> statement-breakpoint
CREATE POLICY "submission_field_library_tenant_isolation" ON "submission_field_library" AS PERMISSIVE FOR ALL TO "app" USING ("submission_field_library"."user_id" = current_setting('app.user_id')::uuid) WITH CHECK ("submission_field_library"."user_id" = current_setting('app.user_id')::uuid);--> statement-breakpoint
CREATE POLICY "submission_field_history_tenant_isolation" ON "submission_field_history" AS PERMISSIVE FOR ALL TO "app" USING ("submission_field_history"."user_id" = current_setting('app.user_id')::uuid) WITH CHECK ("submission_field_history"."user_id" = current_setting('app.user_id')::uuid);