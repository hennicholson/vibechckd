-- Atomic withdrawal — replaces the racy 4-line balance-check + insert
-- pattern in /api/withdrawals/route.ts. Runs entirely server-side inside
-- one transaction so concurrent withdrawal requests can't both pass the
-- balance check.
--
-- Usage from API:
--   const [{ id }] = await db.execute(sql`SELECT request_withdrawal(${userId}, ${amountCents}) AS id`);
-- Returns the new transaction id, or RAISES the SQLSTATE 'P0001' with
-- message 'insufficient_balance' if the user can't cover the amount.

CREATE OR REPLACE FUNCTION request_withdrawal(p_user_id uuid, p_amount_cents integer)
RETURNS uuid AS $$
DECLARE
  v_available bigint;
  v_pending_out bigint;
  v_balance bigint;
  v_tx_id uuid;
BEGIN
  IF p_amount_cents <= 0 THEN
    RAISE EXCEPTION 'invalid_amount' USING ERRCODE = 'P0001';
  END IF;

  -- Lock all rows that contribute to this user's balance so two concurrent
  -- callers can't both observe the same available balance and both pass.
  -- The lock is dropped at COMMIT.
  PERFORM 1 FROM "transactions"
   WHERE "user_id" = p_user_id
   FOR UPDATE;

  -- Available = sum of completed positive transactions (mirrors
  -- /api/balance/route.ts).
  SELECT COALESCE(SUM("amount_cents"), 0) INTO v_available
  FROM "transactions"
  WHERE "user_id" = p_user_id
    AND "status" = 'completed'
    AND "amount_cents" > 0;

  -- Subtract any in-flight withdrawals (pending or completed negative txs).
  SELECT COALESCE(SUM(ABS("amount_cents")), 0) INTO v_pending_out
  FROM "transactions"
  WHERE "user_id" = p_user_id
    AND "type" = 'withdrawal'
    AND "status" IN ('pending', 'completed');

  v_balance := v_available - v_pending_out;

  IF v_balance < p_amount_cents THEN
    RAISE EXCEPTION 'insufficient_balance' USING ERRCODE = 'P0001',
      DETAIL = 'available=' || v_balance || ' requested=' || p_amount_cents;
  END IF;

  -- Insert the pending withdrawal transaction. The corresponding row in
  -- the `withdrawals` table is inserted by the caller after this returns
  -- (caller has the Whop API context to fill in payout_method etc.).
  INSERT INTO "transactions" ("user_id", "type", "status", "amount_cents", "description")
  VALUES (p_user_id, 'withdrawal', 'pending', -p_amount_cents, 'Withdrawal request')
  RETURNING "id" INTO v_tx_id;

  RETURN v_tx_id;
END;
$$ LANGUAGE plpgsql;
