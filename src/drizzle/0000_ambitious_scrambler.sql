-- Current sql file was generated after introspecting the database
-- If you want to run this migration please uncomment this code before executing migrations
/*
CREATE TABLE "article_cluster" (
	"id" serial PRIMARY KEY NOT NULL,
	"article_id" integer NOT NULL,
	"cluster_id" integer NOT NULL,
	"run_id" integer NOT NULL,
	CONSTRAINT "uq_article_cluster_run" UNIQUE("article_id","cluster_id","run_id")
);
--> statement-breakpoint
CREATE TABLE "article" (
	"id" serial PRIMARY KEY NOT NULL,
	"url" varchar NOT NULL,
	"title" varchar NOT NULL,
	"published_at" timestamp with time zone NOT NULL,
	"deck" varchar,
	"author" varchar,
	"content" varchar,
	"embedding" double precision[] NOT NULL,
	"news_provider_key" varchar NOT NULL,
	"summary" varchar,
	"cluster_id" integer,
	"image_urls" varchar[],
	"categories" varchar[],
	"llm_rank" integer,
	CONSTRAINT "article_url_key" UNIQUE("url")
);
--> statement-breakpoint
CREATE TABLE "news_provider" (
	"key" varchar PRIMARY KEY NOT NULL,
	"name" varchar NOT NULL,
	"url" varchar NOT NULL,
	"rank" integer NOT NULL,
	"bias_rating" varchar,
	CONSTRAINT "news_provider_name_key" UNIQUE("name"),
	CONSTRAINT "news_provider_url_key" UNIQUE("url")
);
--> statement-breakpoint
CREATE TABLE "cluster_run" (
	"id" serial PRIMARY KEY NOT NULL,
	"algo_version" varchar NOT NULL,
	"params" jsonb,
	"is_production" boolean NOT NULL,
	"created_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cluster_v2" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" varchar NOT NULL,
	"slug" varchar,
	"created_at" timestamp with time zone NOT NULL,
	"run_id" integer NOT NULL,
	CONSTRAINT "cluster_v2_slug_key" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "alembic_version" (
	"version_num" varchar(32) PRIMARY KEY NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cluster" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" varchar NOT NULL,
	"slug" varchar,
	CONSTRAINT "cluster_slug_key" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "vote" (
	"user_id" uuid NOT NULL,
	"provider_id" varchar NOT NULL,
	"value" varchar NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	CONSTRAINT "vote_pkey" PRIMARY KEY("user_id","provider_id")
);
--> statement-breakpoint
ALTER TABLE "article_cluster" ADD CONSTRAINT "article_cluster_article_id_fkey" FOREIGN KEY ("article_id") REFERENCES "public"."article"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "article_cluster" ADD CONSTRAINT "article_cluster_cluster_id_fkey" FOREIGN KEY ("cluster_id") REFERENCES "public"."cluster_v2"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "article_cluster" ADD CONSTRAINT "article_cluster_run_id_fkey" FOREIGN KEY ("run_id") REFERENCES "public"."cluster_run"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "article" ADD CONSTRAINT "article_cluster_id_fkey" FOREIGN KEY ("cluster_id") REFERENCES "public"."cluster"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "article" ADD CONSTRAINT "article_news_provider_key_fkey" FOREIGN KEY ("news_provider_key") REFERENCES "public"."news_provider"("key") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cluster_v2" ADD CONSTRAINT "cluster_v2_run_id_fkey" FOREIGN KEY ("run_id") REFERENCES "public"."cluster_run"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vote" ADD CONSTRAINT "vote_provider_id_fkey" FOREIGN KEY ("provider_id") REFERENCES "public"."news_provider"("key") ON DELETE no action ON UPDATE no action;
*/