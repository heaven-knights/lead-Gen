
-- Add reply_mail column to cold_email_followups table
ALTER TABLE cold_email_followups 
ADD COLUMN IF NOT EXISTS reply_mail TEXT;
