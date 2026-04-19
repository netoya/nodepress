CREATE TABLE "plugin_ratings" (
	"id" serial PRIMARY KEY NOT NULL,
	"plugin_slug" text NOT NULL,
	"user_id" text NOT NULL,
	"rating" integer NOT NULL,
	"review" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
