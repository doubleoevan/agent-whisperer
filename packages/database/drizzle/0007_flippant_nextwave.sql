-- forward-safe column rename: works on tables with existing rows.
-- pattern: add nullable -> backfill -> set NOT NULL -> swap index -> drop old column.

-- add as nullable so the migration runs against tables with existing rows
ALTER TABLE "manuscripts" ADD COLUMN "source_kind" text;--> statement-breakpoint
ALTER TABLE "manuscripts" ADD COLUMN "source_identifier" text;--> statement-breakpoint

-- backfill: every pre-rename row was a drive import keyed by source_drive_file_id
UPDATE "manuscripts"
SET "source_kind" = 'drive',
    "source_identifier" = "source_drive_file_id"
WHERE "source_kind" IS NULL;--> statement-breakpoint

-- now safe to enforce NOT NULL
ALTER TABLE "manuscripts" ALTER COLUMN "source_kind" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "manuscripts" ALTER COLUMN "source_identifier" SET NOT NULL;--> statement-breakpoint

-- swap the unique index, then drop the legacy column last (so backfill could reference it)
DROP INDEX "manuscripts_user_drive_uniq";--> statement-breakpoint
CREATE UNIQUE INDEX "manuscripts_user_source_uniq" ON "manuscripts" USING btree ("user_id","source_kind","source_identifier");--> statement-breakpoint
ALTER TABLE "manuscripts" DROP COLUMN "source_drive_file_id";
