-- Add user_id column to todos table for user-specific todos
-- This migration adds authentication support and Row Level Security (RLS) policies

-- Add user_id column (nullable initially to handle existing data)
ALTER TABLE public.todos
  ADD COLUMN user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;

-- Create index for query performance
CREATE INDEX todos_user_id_idx ON public.todos(user_id);

-- Drop the permissive "Allow public access" policy
DROP POLICY IF EXISTS "Allow public access" ON public.todos;

-- Create user-specific RLS policies
-- These policies enforce that users can only see and modify their own todos

CREATE POLICY "Users can view own todos"
  ON public.todos FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own todos"
  ON public.todos FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own todos"
  ON public.todos FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own todos"
  ON public.todos FOR DELETE
  USING (auth.uid() = user_id);
