-- Enable Realtime for batches and campaigns tables
begin;
  -- Add tables to the publication if they are not already
  -- This is idempotent (safe to run multiple times)
  alter publication supabase_realtime add table batches;
  alter publication supabase_realtime add table campaigns;
commit;
