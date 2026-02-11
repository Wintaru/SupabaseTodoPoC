-- Set REPLICA IDENTITY FULL on todo_attachments table for Realtime + RLS compatibility.
--
-- Same fix as for the todos table: WALRUS needs full row data in the WAL
-- to evaluate RLS policies for realtime events. Without this, the
-- todo_attachments table in the realtime publication can disrupt RLS-filtered
-- subscriptions across the entire publication (including todos).

ALTER TABLE public.todo_attachments REPLICA IDENTITY FULL;
