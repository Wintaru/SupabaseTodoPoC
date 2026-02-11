-- Add categories support for todos (many-to-many relationship)
-- This migration creates the categories table, the todo_categories junction table,
-- and the necessary RLS policies, indexes, and realtime configuration.

-- =============================================================================
-- 1. Create categories table
-- =============================================================================

CREATE TABLE public.categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  color text NOT NULL,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE (user_id, name)
);

-- Index for user-scoped queries
CREATE INDEX categories_user_id_idx ON public.categories(user_id);

-- =============================================================================
-- 2. Create todo_categories junction table
-- =============================================================================

CREATE TABLE public.todo_categories (
  todo_id uuid NOT NULL REFERENCES public.todos(id) ON DELETE CASCADE,
  category_id uuid NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
  PRIMARY KEY (todo_id, category_id)
);

-- Indexes for JOIN performance
CREATE INDEX todo_categories_todo_id_idx ON public.todo_categories(todo_id);
CREATE INDEX todo_categories_category_id_idx ON public.todo_categories(category_id);

-- =============================================================================
-- 3. Enable RLS on categories
-- =============================================================================

ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own categories"
  ON public.categories FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own categories"
  ON public.categories FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own categories"
  ON public.categories FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own categories"
  ON public.categories FOR DELETE
  USING (auth.uid() = user_id);

-- =============================================================================
-- 4. Enable RLS on todo_categories
-- =============================================================================

ALTER TABLE public.todo_categories ENABLE ROW LEVEL SECURITY;

-- Users can view junction rows for their own categories
CREATE POLICY "Users can view own todo_categories"
  ON public.todo_categories FOR SELECT
  USING (
    category_id IN (SELECT id FROM public.categories WHERE user_id = auth.uid())
  );

-- Users can assign their own categories to their own todos
CREATE POLICY "Users can insert own todo_categories"
  ON public.todo_categories FOR INSERT
  WITH CHECK (
    category_id IN (SELECT id FROM public.categories WHERE user_id = auth.uid())
    AND todo_id IN (SELECT id FROM public.todos WHERE user_id = auth.uid())
  );

-- Users can remove their own category assignments
CREATE POLICY "Users can delete own todo_categories"
  ON public.todo_categories FOR DELETE
  USING (
    category_id IN (SELECT id FROM public.categories WHERE user_id = auth.uid())
  );

-- =============================================================================
-- 5. Enable realtime for both tables
-- =============================================================================

ALTER PUBLICATION supabase_realtime ADD TABLE public.categories;
ALTER PUBLICATION supabase_realtime ADD TABLE public.todo_categories;

-- REPLICA IDENTITY FULL so WALRUS can evaluate RLS policies on realtime events
ALTER TABLE public.categories REPLICA IDENTITY FULL;
ALTER TABLE public.todo_categories REPLICA IDENTITY FULL;
