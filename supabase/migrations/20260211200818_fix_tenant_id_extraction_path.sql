-- Fix tenant_id extraction path for Azure OAuth.
--
-- Azure stores the tenant ID (tid) under raw_user_meta_data->'custom_claims'->>'tid',
-- not at the top level. The original trigger used ->>'tid' which returned NULL.

-- =============================================================================
-- 1. Fix the handle_new_user() trigger (creates user_profiles on signup)
-- =============================================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.user_profiles (id, tenant_id, provider)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data->'custom_claims'->>'tid',
    COALESCE(NEW.raw_app_meta_data->>'provider', 'email')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- =============================================================================
-- 2. Backfill existing user_profiles with the correct tenant_id
-- =============================================================================

UPDATE public.user_profiles up
SET tenant_id = au.raw_user_meta_data->'custom_claims'->>'tid'
FROM auth.users au
WHERE up.id = au.id
  AND up.tenant_id IS NULL
  AND au.raw_user_meta_data->'custom_claims'->>'tid' IS NOT NULL;

-- =============================================================================
-- 3. Cascade to data tables (todos, categories, todo_attachments)
-- =============================================================================

UPDATE public.todos t
SET tenant_id = up.tenant_id
FROM public.user_profiles up
WHERE t.user_id = up.id
  AND t.tenant_id IS NULL
  AND up.tenant_id IS NOT NULL;

UPDATE public.categories c
SET tenant_id = up.tenant_id
FROM public.user_profiles up
WHERE c.user_id = up.id
  AND c.tenant_id IS NULL
  AND up.tenant_id IS NOT NULL;

UPDATE public.todo_attachments ta
SET tenant_id = up.tenant_id
FROM public.user_profiles up
WHERE ta.user_id = up.id
  AND ta.tenant_id IS NULL
  AND up.tenant_id IS NOT NULL;
