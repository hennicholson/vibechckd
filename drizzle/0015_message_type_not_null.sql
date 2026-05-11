-- Make messages.message_type NOT NULL.
--
-- Why: the API has always set a value, but the schema allowed NULL.
-- A direct SQL insert that omitted the column (or a future migration
-- that backfilled rows) could leave NULLs that break the inbox UI's
-- messageType comparisons (`messageType === "file"` is false for NULL,
-- silently rendering the file as plain text).
--
-- Safe to ship: any row currently NULL is backfilled to 'text' first.

UPDATE messages SET message_type = 'text' WHERE message_type IS NULL;

ALTER TABLE messages ALTER COLUMN message_type SET NOT NULL;
