-- Set REPLICA IDENTITY FULL on todos table for Realtime + RLS compatibility.
--
-- By default, PostgreSQL only includes the primary key in WAL entries for
-- UPDATE/DELETE. Supabase Realtime's WALRUS system needs to impersonate
-- subscribers and run SELECT queries to verify RLS policies. With FULL
-- replica identity, the complete row data is available in the WAL, ensuring
-- WALRUS can properly evaluate RLS policies for INSERT and UPDATE events.
-- (DELETE events bypass RLS in Realtime regardless of this setting.)

ALTER TABLE public.todos REPLICA IDENTITY FULL;
