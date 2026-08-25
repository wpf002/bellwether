CREATE TABLE IF NOT EXISTS "monitor_competitors" (
	"id" text PRIMARY KEY NOT NULL,
	"monitor_id" text NOT NULL,
	"name" text NOT NULL,
	"domain" text
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "monitor_sources" (
	"id" text PRIMARY KEY NOT NULL,
	"monitor_id" text NOT NULL,
	"label" text NOT NULL,
	"kind" text NOT NULL,
	"adapter" text NOT NULL,
	"url" text NOT NULL,
	"extract_as" jsonb DEFAULT '["market_event","company"]'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "monitors" (
	"id" text PRIMARY KEY NOT NULL,
	"org_id" text,
	"name" text NOT NULL,
	"domain" text,
	"description" text,
	"industry_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "monitor_competitors" ADD CONSTRAINT "monitor_competitors_monitor_id_monitors_id_fk" FOREIGN KEY ("monitor_id") REFERENCES "public"."monitors"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "monitor_sources" ADD CONSTRAINT "monitor_sources_monitor_id_monitors_id_fk" FOREIGN KEY ("monitor_id") REFERENCES "public"."monitors"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "monitors" ADD CONSTRAINT "monitors_org_id_orgs_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."orgs"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "monitors" ADD CONSTRAINT "monitors_industry_id_industries_id_fk" FOREIGN KEY ("industry_id") REFERENCES "public"."industries"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "monitor_competitors_monitor_idx" ON "monitor_competitors" USING btree ("monitor_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "monitor_sources_monitor_idx" ON "monitor_sources" USING btree ("monitor_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "monitors_org_idx" ON "monitors" USING btree ("org_id");