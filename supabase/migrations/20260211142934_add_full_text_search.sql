-- Add tsvector column for full-text search on title and description
ALTER TABLE public.todos ADD COLUMN search_vector tsvector;

-- Create GIN index for fast full-text search
CREATE INDEX todos_search_idx ON public.todos USING gin(search_vector);

-- Auto-update search_vector on INSERT or UPDATE
-- Uses the built-in tsvector_update_trigger with 'english' text search configuration
CREATE TRIGGER todos_search_update
  BEFORE INSERT OR UPDATE ON public.todos
  FOR EACH ROW EXECUTE FUNCTION
  tsvector_update_trigger(search_vector, 'pg_catalog.english', title, description);

-- Backfill existing rows (the trigger only fires on future writes)
UPDATE public.todos
SET search_vector = to_tsvector('pg_catalog.english', coalesce(title, '') || ' ' || coalesce(description, ''));
