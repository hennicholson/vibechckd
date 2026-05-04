-- Migration 0014: refund linkage + dispute tracking + checkout config id
--
-- Added to support:
--   1. payment.refunded webhook → reversing transaction row pointing at the
--      original payment via `original_transaction_id`, plus a record of the
--      Whop refund event id for reconciliation.
--   2. dispute.* webhooks → a `disputes` table that stores chargeback state
--      per transaction. We never freeze balances on open; we attempt a
--      clawback transfer on `lost` and stamp `clawback_status` so ops can
--      reconcile.
--   3. iframe-native checkout via `iframeSdk.openCheckout` — needs the
--      Whop checkout-configuration id stored on the invoice so the chat
--      pay button can render the modal in-place.

-- 1. Invoice column for in-iframe checkout
ALTER TABLE "invoices"
  ADD COLUMN IF NOT EXISTS "whop_checkout_config_id" text;

-- 2. Transaction columns for refund tracking
ALTER TABLE "transactions"
  ADD COLUMN IF NOT EXISTS "whop_refund_id" text,
  ADD COLUMN IF NOT EXISTS "original_transaction_id" uuid;

-- Self-FK to original transaction. Set NULL on delete because if the
-- original somehow vanishes we still want the refund row preserved for audit.
ALTER TABLE "transactions"
  ADD CONSTRAINT "transactions_original_transaction_id_fk"
  FOREIGN KEY ("original_transaction_id")
  REFERENCES "transactions"("id")
  ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS "transactions_original_transaction_id_idx"
  ON "transactions"("original_transaction_id");

-- 3. Disputes
DO $$ BEGIN
  CREATE TYPE "dispute_status" AS ENUM ('open', 'under_review', 'won', 'lost', 'closed');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS "disputes" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "transaction_id" uuid NOT NULL REFERENCES "transactions"("id"),
  "whop_dispute_id" text NOT NULL,
  "status" "dispute_status" NOT NULL DEFAULT 'open',
  "amount_cents" integer NOT NULL,
  "reason" text,
  "clawback_status" text,
  "opened_at" timestamp DEFAULT now() NOT NULL,
  "resolved_at" timestamp
);

CREATE UNIQUE INDEX IF NOT EXISTS "disputes_whop_dispute_id_uq"
  ON "disputes"("whop_dispute_id");

CREATE INDEX IF NOT EXISTS "disputes_transaction_id_idx"
  ON "disputes"("transaction_id");
