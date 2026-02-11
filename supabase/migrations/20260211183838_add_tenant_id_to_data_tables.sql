-- Add tenant_id to data tables for tenant-scoped RLS
--
-- WHY denormalize? Joining user_profiles on every RLS policy evaluation would
-- require a cross-table lookup per row. Denormalizing tenant_id onto data tables
-- allows single-table index lookups in RLS policies, which is critical for
-- performance at scale.

-- =============================================================================
-- 1. Helper function: get_my_tenant_id()
-- =============================================================================

-- Returns the current authenticated user's tenant_id from user_profiles.
-- SECURITY DEFINER: bypasses user_profiles RLS so this can be called from
-- RLS policies on other tables without triggering nested RLS checks.
-- STABLE: result is constant within a single statement, allowing PostgreSQL
-- to cache it during RLS evaluation across multiple rows.
CREATE OR REPLACE FUNCTION public.get_my_tenant_id()
RETURNS text
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT tenant_id FROM user_profiles WHERE id = auth.uid()
$$;

-- =============================================================================
-- 2. Add tenant_id columns (nullable — non-SSO users have no tenant)
-- =============================================================================

ALTER TABLE public.todos
  ADD COLUMN tenant_id text;

ALTER TABLE public.categories
  ADD COLUMN tenant_id text;

ALTER TABLE public.todo_attachments
  ADD COLUMN tenant_id text;

-- =============================================================================
-- 3. Indexes for tenant-scoped queries
-- =============================================================================

CREATE INDEX todos_tenant_id_idx ON public.todos(tenant_id);
CREATE INDEX categories_tenant_id_idx ON public.categories(tenant_id);
CREATE INDEX todo_attachments_tenant_id_idx ON public.todo_attachments(tenant_id);

-- =============================================================================
-- 4. Trigger function to auto-populate tenant_id on INSERT
-- =============================================================================

-- Reusable trigger: looks up the inserting user's tenant_id from user_profiles
-- and sets it on the new row. This keeps tenant_id consistent with the user's
-- profile without requiring the application to pass it explicitly.
CREATE OR REPLACE FUNCTION public.set_tenant_id_on_insert()
RETURNS trigger AS $$
BEGIN
  NEW.tenant_id := (
    SELECT tenant_id FROM public.user_profiles WHERE id = auth.uid()
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER set_tenant_id
  BEFORE INSERT ON public.todos
  FOR EACH ROW EXECUTE FUNCTION public.set_tenant_id_on_insert();

CREATE TRIGGER set_tenant_id
  BEFORE INSERT ON public.categories
  FOR EACH ROW EXECUTE FUNCTION public.set_tenant_id_on_insert();

CREATE TRIGGER set_tenant_id
  BEFORE INSERT ON public.todo_attachments
  FOR EACH ROW EXECUTE FUNCTION public.set_tenant_id_on_insert();

-- =============================================================================
-- 5. Backfill existing rows from user_profiles
-- =============================================================================

UPDATE public.todos t
SET tenant_id = up.tenant_id
FROM public.user_profiles up
WHERE t.user_id = up.id;

UPDATE public.categories c
SET tenant_id = up.tenant_id
FROM public.user_profiles up
WHERE c.user_id = up.id;

UPDATE public.todo_attachments ta
SET tenant_id = up.tenant_id
FROM public.user_profiles up
WHERE ta.user_id = up.id;
