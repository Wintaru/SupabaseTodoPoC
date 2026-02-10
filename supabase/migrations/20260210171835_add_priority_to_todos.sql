-- Add priority column to todos table
-- This demonstrates how to evolve your database schema over time

-- Add the priority column with a default value
alter table public.todos
  add column priority text default 'medium' not null
  check (priority in ('low', 'medium', 'high'));

-- Create an index for filtering by priority
create index todos_priority_idx on public.todos(priority);

-- Add a comment to document the column
comment on column public.todos.priority is 'Task priority level: low, medium, or high';
