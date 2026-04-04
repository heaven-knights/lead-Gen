-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- organizations table
CREATE TABLE IF NOT EXISTS organizations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID REFERENCES organizations(id),
  email TEXT NOT NULL,
  full_name TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- campaigns table
CREATE TABLE IF NOT EXISTS campaigns (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID REFERENCES organizations(id) NOT NULL,
  name TEXT NOT NULL,
  location TEXT NOT NULL,
  niche TEXT NOT NULL,
  target_leads INT NOT NULL,
  batch_size INT DEFAULT 5,
  total_scraped INT DEFAULT 0,
  total_filtered INT DEFAULT 0,
  total_batches INT DEFAULT 0,
  status TEXT CHECK (status IN ('draft', 'scraping', 'ready', 'sending', 'completed')) DEFAULT 'draft',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

-- batches table
CREATE TABLE IF NOT EXISTS batches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID REFERENCES organizations(id) NOT NULL,
  campaign_id UUID REFERENCES campaigns(id) NOT NULL,
  batch_number INT NOT NULL,
  lead_count INT DEFAULT 0,
  status TEXT CHECK (status IN ('pending', 'scheduled', 'sending', 'completed', 'failed')) DEFAULT 'pending',
  scheduled_for TIMESTAMPTZ,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- leads table
CREATE TABLE IF NOT EXISTS leads (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID REFERENCES organizations(id) NOT NULL,
  campaign_id UUID REFERENCES campaigns(id) NOT NULL,
  batch_id UUID REFERENCES batches(id),
  company_name TEXT,
  primary_email TEXT,
  primary_phone TEXT,
  website TEXT,
  city TEXT,
  country TEXT,
  rating NUMERIC,
  reviews_count INT,
  place_id TEXT,
  raw_data JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- email_templates table
CREATE TABLE IF NOT EXISTS email_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID REFERENCES organizations(id) NOT NULL,
  name TEXT NOT NULL,
  subject TEXT,
  body TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- email_messages table
CREATE TABLE IF NOT EXISTS email_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID REFERENCES organizations(id) NOT NULL,
  campaign_id UUID REFERENCES campaigns(id) NOT NULL,
  batch_id UUID REFERENCES batches(id) NOT NULL,
  lead_id UUID REFERENCES leads(id) NOT NULL,
  to_email TEXT NOT NULL,
  subject TEXT,
  body TEXT,
  provider_id TEXT,
  status TEXT CHECK (status IN ('queued', 'sent', 'failed')) DEFAULT 'queued',
  sent_at TIMESTAMPTZ,
  thread_id TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- replies table
CREATE TABLE IF NOT EXISTS replies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID REFERENCES organizations(id) NOT NULL,
  campaign_id UUID REFERENCES campaigns(id) NOT NULL,
  lead_id UUID REFERENCES leads(id) NOT NULL,
  email_id UUID REFERENCES email_messages(id),
  from_email TEXT NOT NULL,
  content TEXT,
  message_thread JSONB,
  received_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- automation_jobs table
CREATE TABLE IF NOT EXISTS automation_jobs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID REFERENCES organizations(id) NOT NULL,
  campaign_id UUID REFERENCES campaigns(id) NOT NULL,
  batch_id UUID REFERENCES batches(id),
  type TEXT CHECK (type IN ('scrape', 'filter', 'send', 'reply_sync')),
  status TEXT CHECK (status IN ('pending', 'running', 'completed', 'failed')) DEFAULT 'pending',
  error TEXT,
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- automation_events table
CREATE TABLE IF NOT EXISTS automation_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID REFERENCES organizations(id) NOT NULL,
  campaign_id UUID REFERENCES campaigns(id) NOT NULL,
  batch_id UUID REFERENCES batches(id),
  lead_id UUID REFERENCES leads(id),
  event_type TEXT NOT NULL,
  payload JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);
