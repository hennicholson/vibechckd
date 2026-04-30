CREATE TYPE "public"."conversation_kind" AS ENUM('dm', 'project', 'job_application');--> statement-breakpoint
ALTER TYPE "public"."message_type" ADD VALUE 'invoice';--> statement-breakpoint
CREATE TABLE "conversation_participants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"conversation_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"joined_at" timestamp DEFAULT now() NOT NULL,
	"left_at" timestamp,
	"last_read_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "conversations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"kind" "conversation_kind" NOT NULL,
	"project_id" uuid,
	"job_application_id" uuid,
	"title" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "messages" ALTER COLUMN "project_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "messages" ADD COLUMN "conversation_id" uuid;--> statement-breakpoint
ALTER TABLE "messages" ADD COLUMN "invoice_id" uuid;--> statement-breakpoint
ALTER TABLE "conversation_participants" ADD CONSTRAINT "conversation_participants_conversation_id_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversation_participants" ADD CONSTRAINT "conversation_participants_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "conv_participants_conv_user_uq" ON "conversation_participants" USING btree ("conversation_id","user_id");--> statement-breakpoint
CREATE INDEX "conv_participants_user_conv_idx" ON "conversation_participants" USING btree ("user_id","conversation_id");--> statement-breakpoint
CREATE INDEX "conversations_project_id_idx" ON "conversations" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "conversations_job_app_id_idx" ON "conversations" USING btree ("job_application_id");--> statement-breakpoint
CREATE INDEX "conversations_updated_at_idx" ON "conversations" USING btree ("updated_at");--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_conversation_id_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "messages_conversation_id_created_at_idx" ON "messages" USING btree ("conversation_id","created_at");--> statement-breakpoint
CREATE INDEX "messages_project_id_idx" ON "messages" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "messages_sender_id_idx" ON "messages" USING btree ("sender_id");--> statement-breakpoint
-- ── Add cross-table FK for messages.invoice_id (circular with invoices.message_id) ──
ALTER TABLE "messages" ADD CONSTRAINT "messages_invoice_id_invoices_id_fk" FOREIGN KEY ("invoice_id") REFERENCES "public"."invoices"("id") ON DELETE SET NULL ON UPDATE no action;--> statement-breakpoint

-- ── Earnings index for invoices ──
CREATE INDEX IF NOT EXISTS "invoices_recipient_status_idx" ON "invoices" USING btree ("recipient_id", "status");--> statement-breakpoint

-- ── Backfill: project conversations ──
-- One conversation per project. Membership comes from project_members.
INSERT INTO "conversations" ("project_id", "kind", "created_at", "updated_at")
SELECT p."id", 'project', p."created_at", p."updated_at"
FROM "projects" p
WHERE NOT EXISTS (
  SELECT 1 FROM "conversations" c WHERE c."project_id" = p."id" AND c."kind" = 'project'
);--> statement-breakpoint

INSERT INTO "conversation_participants" ("conversation_id", "user_id", "joined_at")
SELECT c."id", pm."user_id", pm."added_at"
FROM "conversations" c
JOIN "project_members" pm ON pm."project_id" = c."project_id"
WHERE c."kind" = 'project'
ON CONFLICT ("conversation_id", "user_id") DO NOTHING;--> statement-breakpoint

-- Stamp conversation_id on existing project messages.
UPDATE "messages" m
SET "conversation_id" = c."id"
FROM "conversations" c
WHERE c."project_id" = m."project_id"
  AND c."kind" = 'project'
  AND m."conversation_id" IS NULL;--> statement-breakpoint

-- ── Backfill: DM conversations ──
-- Each direct_message_thread → one conversation(kind='dm'). We create
-- conversations with the SAME id as the legacy thread so subsequent
-- joins are trivial. (uuid PK accepts any uuid; there's no collision
-- risk because conversations.id is a fresh row.)
INSERT INTO "conversations" ("id", "kind", "created_at", "updated_at")
SELECT t."id", 'dm', t."created_at", t."updated_at"
FROM "direct_message_threads" t
WHERE NOT EXISTS (
  SELECT 1 FROM "conversations" c WHERE c."id" = t."id"
)
ON CONFLICT ("id") DO NOTHING;--> statement-breakpoint

INSERT INTO "conversation_participants" ("conversation_id", "user_id", "joined_at")
SELECT dmp."thread_id", dmp."user_id", dmp."joined_at"
FROM "direct_message_participants" dmp
WHERE EXISTS (SELECT 1 FROM "conversations" c WHERE c."id" = dmp."thread_id")
ON CONFLICT ("conversation_id", "user_id") DO NOTHING;--> statement-breakpoint

-- Copy direct_messages into messages.
INSERT INTO "messages" ("conversation_id", "sender_id", "content", "message_type", "file_url", "created_at")
SELECT dm."thread_id", dm."sender_id", dm."content", dm."message_type", dm."file_url", dm."created_at"
FROM "direct_messages" dm
WHERE EXISTS (SELECT 1 FROM "conversations" c WHERE c."id" = dm."thread_id")
  AND NOT EXISTS (
    SELECT 1 FROM "messages" m2
    WHERE m2."conversation_id" = dm."thread_id"
      AND m2."sender_id" = dm."sender_id"
      AND m2."created_at" = dm."created_at"
      AND m2."content" = dm."content"
  );--> statement-breakpoint

-- ── Mark job application threads ──
-- The /api/jobs/[id]/apply route creates a 1:1 thread between client + creator.
-- Match conversations whose two participants exactly match a (job.client_id,
-- application.creator_id) pair.
UPDATE "conversations" c
SET "kind" = 'job_application',
    "job_application_id" = ja."id"
FROM "job_applications" ja
JOIN "jobs" j ON j."id" = ja."job_id"
WHERE c."kind" = 'dm'
  AND EXISTS (
    SELECT 1 FROM "conversation_participants" cp1
    WHERE cp1."conversation_id" = c."id" AND cp1."user_id" = j."client_id"
  )
  AND EXISTS (
    SELECT 1 FROM "conversation_participants" cp2
    WHERE cp2."conversation_id" = c."id" AND cp2."user_id" = ja."creator_id"
  )
  AND (
    SELECT COUNT(*) FROM "conversation_participants" cp3 WHERE cp3."conversation_id" = c."id"
  ) = 2;--> statement-breakpoint

-- ── Backfill invoices.message_id for orphans ──
-- Synthesize a kind='invoice' message in the project conversation for each
-- orphaned invoice so the FK can become NOT NULL in 0013.
INSERT INTO "messages" ("conversation_id", "project_id", "sender_id", "content", "message_type", "invoice_id", "created_at")
SELECT
  c."id",
  i."project_id",
  i."sender_id",
  CONCAT('Invoice: ', i."description"),
  'invoice',
  i."id",
  i."created_at"
FROM "invoices" i
JOIN "conversations" c ON c."project_id" = i."project_id" AND c."kind" = 'project'
WHERE i."message_id" IS NULL;--> statement-breakpoint

UPDATE "invoices" i
SET "message_id" = m."id"
FROM "messages" m
WHERE m."invoice_id" = i."id" AND i."message_id" IS NULL;--> statement-breakpoint

-- ── Refresh conversation updated_at to last message timestamp ──
UPDATE "conversations" c
SET "updated_at" = COALESCE(
  (SELECT MAX(m."created_at") FROM "messages" m WHERE m."conversation_id" = c."id"),
  c."created_at"
);
