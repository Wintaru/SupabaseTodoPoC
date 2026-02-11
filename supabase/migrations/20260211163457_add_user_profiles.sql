-- Add user_profiles table to store provider-specific metadata (e.g., Azure tenant ID)
-- A trigger on auth.users automatically creates a profile when a new user signs up.

-- =============================================================================
-- 1. Create user_profiles table
-- =============================================================================

CREATE TABLE public.user_profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  tenant_id text,            -- Microsoft Azure tenant ID (tid claim from OAuth)
  provider text,             -- Auth provider name (e.g. 'azure', 'email')
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Index for future tenant-scoped RLS queries
CREATE INDEX user_profiles_tenant_id_idx ON public.user_profiles(tenant_id);

-- Reuse existing handle_updated_at() function from create_todos_table migration
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- =============================================================================
-- 2. Enable RLS
-- =============================================================================

ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile"
  ON public.user_profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.user_profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- =============================================================================
-- 3. Trigger to auto-create profile on user signup
-- =============================================================================

-- SECURITY DEFINER: runs with the function owner's privileges so it can insert
-- into user_profiles during the auth flow (before the user has a session).
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.user_profiles (id, tenant_id, provider)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'tid',
    COALESCE(NEW.raw_app_meta_data->>'provider', 'email')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =============================================================================
-- 4. Enable realtime
-- =============================================================================

ALTER PUBLICATION supabase_realtime ADD TABLE public.user_profiles;

-- REPLICA IDENTITY FULL so WALRUS can evaluate RLS policies on realtime events
ALTER TABLE public.user_profiles REPLICA IDENTITY FULL;
