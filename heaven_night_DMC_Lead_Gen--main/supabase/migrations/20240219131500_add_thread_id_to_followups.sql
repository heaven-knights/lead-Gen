
-- Add thread_id column to cold_email_followups table
ALTER TABLE cold_email_followups 
ADD COLUMN IF NOT EXISTS thread_id TEXT;
