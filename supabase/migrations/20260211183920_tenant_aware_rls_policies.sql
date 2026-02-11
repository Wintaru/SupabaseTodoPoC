-- Rewrite all RLS policies to support tenant-based data sharing.
--
-- RULES:
-- 1. SELECT: Owner sees own data. Tenant members see each other's data.
--    Users with NULL tenant_id see only their own data.
-- 2. INSERT: Owner only (auth.uid() = user_id). tenant_id auto-set by trigger.
-- 3. UPDATE: Tenant members can see the row (USING) but only the owner can
--    modify it (WITH CHECK).
-- 4. DELETE: Owner only.

-- =============================================================================
-- 1. todos
-- =============================================================================

DROP POLICY IF EXISTS "Users can view own todos" ON public.todos;
DROP POLICY IF EXISTS "Users can insert own todos" ON public.todos;
DROP POLICY IF EXISTS "Users can update own todos" ON public.todos;
DROP POLICY IF EXISTS "Users can delete own todos" ON public.todos;

-- SELECT: own data OR same non-null tenant
CREATE POLICY "Users can view own or tenant todos"
  ON public.todos FOR SELECT
  USING (
    auth.uid() = user_id
    OR (tenant_id IS NOT NULL AND tenant_id = get_my_tenant_id())
  );

-- INSERT: owner only; tenant_id is populated by trigger
CREATE POLICY "Users can insert own todos"
  ON public.todos FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- UPDATE: can see tenant data (USING) but can only modify own (WITH CHECK)
CREATE POLICY "Users can update own todos"
  ON public.todos FOR UPDATE
  USING (
    auth.uid() = user_id
    OR (tenant_id IS NOT NULL AND tenant_id = get_my_tenant_id())
  )
  WITH CHECK (auth.uid() = user_id);

-- DELETE: owner only
CREATE POLICY "Users can delete own todos"
  ON public.todos FOR DELETE
  USING (auth.uid() = user_id);

-- =============================================================================
-- 2. categories
-- =============================================================================

DROP POLICY IF EXISTS "Users can view own categories" ON public.categories;
DROP POLICY IF EXISTS "Users can insert own categories" ON public.categories;
DROP POLICY IF EXISTS "Users can update own categories" ON public.categories;
DROP POLICY IF EXISTS "Users can delete own categories" ON public.categories;

-- SELECT: own data OR same non-null tenant
CREATE POLICY "Users can view own or tenant categories"
  ON public.categories FOR SELECT
  USING (
    auth.uid() = user_id
    OR (tenant_id IS NOT NULL AND tenant_id = get_my_tenant_id())
  );

-- INSERT: owner only
CREATE POLICY "Users can insert own categories"
  ON public.categories FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- UPDATE: see tenant data but only modify own
CREATE POLICY "Users can update own categories"
  ON public.categories FOR UPDATE
  USING (
    auth.uid() = user_id
    OR (tenant_id IS NOT NULL AND tenant_id = get_my_tenant_id())
  )
  WITH CHECK (auth.uid() = user_id);

-- DELETE: owner only
CREATE POLICY "Users can delete own categories"
  ON public.categories FOR DELETE
  USING (auth.uid() = user_id);

-- =============================================================================
-- 3. todo_attachments
-- =============================================================================

DROP POLICY IF EXISTS "Users can view own attachments" ON public.todo_attachments;
DROP POLICY IF EXISTS "Users can insert own attachments" ON public.todo_attachments;
DROP POLICY IF EXISTS "Users can delete own attachments" ON public.todo_attachments;

-- SELECT: own data OR same non-null tenant
CREATE POLICY "Users can view own or tenant attachments"
  ON public.todo_attachments FOR SELECT
  USING (
    auth.uid() = user_id
    OR (tenant_id IS NOT NULL AND tenant_id = get_my_tenant_id())
  );

-- INSERT: owner only
CREATE POLICY "Users can insert own attachments"
  ON public.todo_attachments FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- DELETE: owner only
CREATE POLICY "Users can delete own attachments"
  ON public.todo_attachments FOR DELETE
  USING (auth.uid() = user_id);

-- =============================================================================
-- 4. todo_categories (junction table — no tenant_id column needed)
-- =============================================================================

DROP POLICY IF EXISTS "Users can view own todo_categories" ON public.todo_categories;
DROP POLICY IF EXISTS "Users can insert own todo_categories" ON public.todo_categories;
DROP POLICY IF EXISTS "Users can delete own todo_categories" ON public.todo_categories;

-- SELECT: cascading RLS through todos — if the user can see the todo
-- (via the tenant-aware policy on todos), they can see its category assignments.
CREATE POLICY "Users can view accessible todo_categories"
  ON public.todo_categories FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.todos WHERE id = todo_categories.todo_id)
  );

-- INSERT: owner of BOTH the todo AND the category.
-- Tenant members should NOT assign categories to someone else's todo.
CREATE POLICY "Users can insert own todo_categories"
  ON public.todo_categories FOR INSERT
  WITH CHECK (
    todo_id IN (SELECT id FROM public.todos WHERE user_id = auth.uid())
    AND category_id IN (SELECT id FROM public.categories WHERE user_id = auth.uid())
  );

-- DELETE: owner of the todo OR owner of the category
CREATE POLICY "Users can delete own todo_categories"
  ON public.todo_categories FOR DELETE
  USING (
    todo_id IN (SELECT id FROM public.todos WHERE user_id = auth.uid())
    OR category_id IN (SELECT id FROM public.categories WHERE user_id = auth.uid())
  );
