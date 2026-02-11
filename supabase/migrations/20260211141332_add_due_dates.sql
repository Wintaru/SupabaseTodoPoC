-- Add due_date column to todos (nullable - not all todos need a due date)
ALTER TABLE public.todos ADD COLUMN due_date timestamptz;

-- Index for efficient date-based queries and sorting
CREATE INDEX todos_due_date_idx ON public.todos(due_date);
