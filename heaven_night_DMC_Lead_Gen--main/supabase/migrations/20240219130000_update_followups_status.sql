
-- Update status check constraint to include 'replied'
ALTER TABLE cold_email_followups DROP CONSTRAINT IF EXISTS cold_email_followups_status_check;

ALTER TABLE cold_email_followups 
ADD CONSTRAINT cold_email_followups_status_check 
CHECK (status IN ('pending', 'sent', 'cancelled', 'failed', 'skipped', 'replied'));

-- Remove reply_mail column if it was added previously (based on change of requirements)
ALTER TABLE cold_email_followups DROP COLUMN IF EXISTS reply_mail;
