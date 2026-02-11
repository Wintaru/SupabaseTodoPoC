-- Add file attachments support to todos
-- This migration creates the todo_attachments table, a public storage bucket,
-- and the necessary RLS + storage policies for user-scoped file management.

-- =============================================================================
-- 1. Create todo_attachments table
-- =============================================================================

CREATE TABLE public.todo_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  todo_id uuid NOT NULL REFERENCES public.todos(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  file_name text NOT NULL,
  file_path text NOT NULL,
  file_size bigint NOT NULL,
  content_type text NOT NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Indexes for query performance
CREATE INDEX todo_attachments_todo_id_idx ON public.todo_attachments(todo_id);
CREATE INDEX todo_attachments_user_id_idx ON public.todo_attachments(user_id);

-- =============================================================================
-- 2. Enable RLS on todo_attachments
-- =============================================================================

ALTER TABLE public.todo_attachments ENABLE ROW LEVEL SECURITY;

-- Users can only view their own attachments
CREATE POLICY "Users can view own attachments"
  ON public.todo_attachments FOR SELECT
  USING (auth.uid() = user_id);

-- Users can only insert attachments for their own todos
CREATE POLICY "Users can insert own attachments"
  ON public.todo_attachments FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can only delete their own attachments
CREATE POLICY "Users can delete own attachments"
  ON public.todo_attachments FOR DELETE
  USING (auth.uid() = user_id);

-- =============================================================================
-- 3. Create public storage bucket for todo attachments
-- =============================================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('todo-attachments', 'todo-attachments', true, 10485760);
-- 10485760 bytes = 10MB

-- =============================================================================
-- 4. Storage policies
-- =============================================================================

-- Authenticated users can upload files to their own folder (user_id prefix)
CREATE POLICY "Users can upload own attachments"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'todo-attachments'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Anyone can view files (public bucket)
CREATE POLICY "Public read access for todo attachments"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'todo-attachments');

-- Users can delete their own files
CREATE POLICY "Users can delete own attachment files"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'todo-attachments'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- =============================================================================
-- 5. Enable realtime for todo_attachments (so UI can react to changes)
-- =============================================================================

ALTER PUBLICATION supabase_realtime ADD TABLE todo_attachments;
