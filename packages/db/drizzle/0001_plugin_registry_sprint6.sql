ALTER TABLE "plugin_registry" ADD COLUMN "registry_url" text;
--> statement-breakpoint
ALTER TABLE "plugin_registry" ADD COLUMN "tarball_url" text;
--> statement-breakpoint
ALTER TABLE "plugin_registry" ADD COLUMN "published_at" timestamp;
--> statement-breakpoint
ALTER TABLE "plugin_registry" ADD COLUMN "author" text;
