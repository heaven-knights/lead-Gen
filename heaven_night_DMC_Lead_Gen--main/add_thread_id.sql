-- Add thread_id to email_messages table to track conversation threads
ALTER TABLE email_messages ADD COLUMN IF NOT EXISTS thread_id TEXT;
