CREATE TABLE IF NOT EXISTS "digests" (
	"id" text PRIMARY KEY NOT NULL,
	"industry_id" text NOT NULL,
	"period_start" timestamp with time zone NOT NULL,
	"period_end" timestamp with time zone NOT NULL,
	"body" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "industries" (
	"id" text PRIMARY KEY NOT NULL,
	"label" text NOT NULL,
	"description" text NOT NULL,
	"pack_version" text DEFAULT '0.0.0' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "raw_records" (
	"id" text PRIMARY KEY NOT NULL,
	"source_id" text NOT NULL,
	"url" text,
	"fetched_at" timestamp with time zone NOT NULL,
	"content_hash" text NOT NULL,
	"raw" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "signals" (
	"id" text PRIMARY KEY NOT NULL,
	"industry_id" text NOT NULL,
	"entity_kind" text NOT NULL,
	"payload" jsonb NOT NULL,
	"source_record_ids" jsonb NOT NULL,
	"lineage" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "sources" (
	"id" text PRIMARY KEY NOT NULL,
	"industry_id" text NOT NULL,
	"label" text NOT NULL,
	"kind" text NOT NULL,
	"adapter" text NOT NULL,
	"url" text NOT NULL,
	"last_fetched_at" timestamp with time zone,
	"healthy" integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "digests" ADD CONSTRAINT "digests_industry_id_industries_id_fk" FOREIGN KEY ("industry_id") REFERENCES "public"."industries"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "raw_records" ADD CONSTRAINT "raw_records_source_id_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."sources"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "signals" ADD CONSTRAINT "signals_industry_id_industries_id_fk" FOREIGN KEY ("industry_id") REFERENCES "public"."industries"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "sources" ADD CONSTRAINT "sources_industry_id_industries_id_fk" FOREIGN KEY ("industry_id") REFERENCES "public"."industries"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "raw_source_idx" ON "raw_records" USING btree ("source_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "raw_hash_uq" ON "raw_records" USING btree ("source_id","content_hash");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "signals_industry_idx" ON "signals" USING btree ("industry_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "signals_kind_idx" ON "signals" USING btree ("entity_kind");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "sources_industry_idx" ON "sources" USING btree ("industry_id");