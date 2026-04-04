-- Add columns to email_templates
ALTER TABLE email_templates
ADD COLUMN IF NOT EXISTS type TEXT CHECK (type IN ('cold', 'promotional', 'seasonal')),
ADD COLUMN IF NOT EXISTS file_url TEXT,
ADD COLUMN IF NOT EXISTS file_name TEXT;

-- Create storage bucket for template files if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('template-files', 'template-files', true)
ON CONFLICT (id) DO NOTHING;

-- Policy to allow authenticated users to upload files
CREATE POLICY "Allow authenticated uploads"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'template-files');

-- Policy to allow public access to view files (or authenticated only)
CREATE POLICY "Allow public read access"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'template-files');
