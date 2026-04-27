ALTER TABLE "users" ADD COLUMN "whop_user_id" text;--> statement-breakpoint
CREATE UNIQUE INDEX "users_whop_user_id_uq" ON "users" USING btree ("whop_user_id");