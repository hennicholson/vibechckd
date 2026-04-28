CREATE TYPE "public"."job_application_status" AS ENUM('applied', 'shortlisted', 'rejected', 'hired');--> statement-breakpoint
CREATE TYPE "public"."job_status" AS ENUM('open', 'closed', 'filled');--> statement-breakpoint
CREATE TABLE "job_applications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"job_id" uuid NOT NULL,
	"creator_id" uuid NOT NULL,
	"pitch" text,
	"status" "job_application_status" DEFAULT 'applied' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "jobs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"client_id" uuid NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"project_type" text,
	"budget_range" text,
	"timeline" text,
	"status" "job_status" DEFAULT 'open' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_favorites" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"coder_profile_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "job_applications" ADD CONSTRAINT "job_applications_job_id_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."jobs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "job_applications" ADD CONSTRAINT "job_applications_creator_id_users_id_fk" FOREIGN KEY ("creator_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_client_id_users_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_favorites" ADD CONSTRAINT "user_favorites_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_favorites" ADD CONSTRAINT "user_favorites_coder_profile_id_coder_profiles_id_fk" FOREIGN KEY ("coder_profile_id") REFERENCES "public"."coder_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "job_applications_job_creator_uq" ON "job_applications" USING btree ("job_id","creator_id");--> statement-breakpoint
CREATE INDEX "job_applications_creator_id_idx" ON "job_applications" USING btree ("creator_id");--> statement-breakpoint
CREATE INDEX "jobs_client_id_idx" ON "jobs" USING btree ("client_id");--> statement-breakpoint
CREATE INDEX "jobs_status_idx" ON "jobs" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "user_favorites_user_coder_uq" ON "user_favorites" USING btree ("user_id","coder_profile_id");--> statement-breakpoint
CREATE INDEX "user_favorites_coder_idx" ON "user_favorites" USING btree ("coder_profile_id");