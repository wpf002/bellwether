CREATE TABLE IF NOT EXISTS "feedback" (
	"id" text PRIMARY KEY NOT NULL,
	"industry_id" text NOT NULL,
	"digest_id" text,
	"signal_id" text,
	"source_id" text,
	"kind" text NOT NULL,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "quality_snapshots" (
	"id" text PRIMARY KEY NOT NULL,
	"industry_id" text NOT NULL,
	"captured_at" timestamp with time zone DEFAULT now() NOT NULL,
	"metrics" jsonb NOT NULL
);
--> statement-breakpoint
ALTER TABLE "digests" ADD COLUMN "status" text DEFAULT 'draft' NOT NULL;--> statement-breakpoint
ALTER TABLE "digests" ADD COLUMN "shipped_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "digests" ADD COLUMN "reviewed_by" text;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "feedback" ADD CONSTRAINT "feedback_industry_id_industries_id_fk" FOREIGN KEY ("industry_id") REFERENCES "public"."industries"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "quality_snapshots" ADD CONSTRAINT "quality_snapshots_industry_id_industries_id_fk" FOREIGN KEY ("industry_id") REFERENCES "public"."industries"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "feedback_industry_idx" ON "feedback" USING btree ("industry_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "quality_industry_idx" ON "quality_snapshots" USING btree ("industry_id");