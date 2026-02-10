-- Enable realtime for todos table
-- This allows real-time subscriptions to INSERT, UPDATE, and DELETE events on the todos table

ALTER PUBLICATION supabase_realtime ADD TABLE todos;
