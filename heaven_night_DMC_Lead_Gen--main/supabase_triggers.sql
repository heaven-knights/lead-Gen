-- Create a function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  -- Create an organization for the user, using their ID as the Org ID
  INSERT INTO public.organizations (id, name)
  VALUES (new.id, COALESCE(new.raw_user_meta_data->>'full_name', new.email) || '''s Organization');

  -- Create a profile for the user
  INSERT INTO public.profiles (id, org_id, email, full_name)
  VALUES (new.id, new.id, new.email, new.raw_user_meta_data->>'full_name');

  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create the trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Backfill for existing users
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN SELECT * FROM auth.users
  LOOP
    -- Insert Org if not exists
    INSERT INTO public.organizations (id, name)
    VALUES (r.id, COALESCE(r.raw_user_meta_data->>'full_name', r.email) || '''s Organization')
    ON CONFLICT (id) DO NOTHING;

    -- Insert Profile if not exists
    INSERT INTO public.profiles (id, org_id, email, full_name)
    VALUES (r.id, r.id, r.email, r.raw_user_meta_data->>'full_name')
    ON CONFLICT (id) DO NOTHING;
  END LOOP;
END;
$$;
