-- Create todos table
create table public.todos (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  is_completed boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create index for faster queries on created_at
create index todos_created_at_idx on public.todos(created_at desc);

-- Create index for filtering by completion status
create index todos_is_completed_idx on public.todos(is_completed);

-- Enable Row Level Security
alter table public.todos enable row level security;

-- Create policy for public access (for demo purposes)
-- In production, you'd want to restrict this to authenticated users
create policy "Allow public access"
  on public.todos for all
  using (true)
  with check (true);

-- Create function to automatically update updated_at timestamp
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = timezone('utc'::text, now());
  return new;
end;
$$ language plpgsql;

-- Create trigger to call the function before each update
create trigger set_updated_at
  before update on public.todos
  for each row
  execute function public.handle_updated_at();
