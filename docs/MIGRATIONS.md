# Database Migrations Guide

This guide explains how to work with Supabase migrations for database schema management.

## What are Migrations?

Migrations are version-controlled SQL files that track changes to your database schema over time. Each migration:

- Has a timestamp-based filename (e.g., `20260210170613_create_todos_table.sql`)
- Contains SQL statements to modify the database
- Runs exactly once (tracked in `supabase_migrations.schema_migrations`)
- Executes in chronological order

## Migration Workflow

### 1. Create a New Migration

```bash
supabase migration new your_migration_name
```

**Example:**
```bash
supabase migration new add_priority_to_todos
```

This creates: `supabase/migrations/20260210123456_add_priority_to_todos.sql`

### 2. Write Your Migration

Edit the generated file with your SQL changes:

```sql
-- supabase/migrations/20260210123456_add_priority_to_todos.sql

-- Add priority column
alter table public.todos
  add column priority text default 'medium'
  check (priority in ('low', 'medium', 'high'));

-- Create index for filtering
create index todos_priority_idx on public.todos(priority);
```

### 3. Test Locally

Apply the migration to your local database:

```bash
supabase db reset
```

**What `db reset` does:**
- Drops your local database
- Recreates it from scratch
- Applies ALL migrations in order
- Runs seed data (if any)

**Alternative** (apply only new migrations):
```bash
supabase migration up
```

### 4. Generate Updated Types

After schema changes, regenerate TypeScript types:

```bash
supabase gen types typescript --local > lib/types/database.types.ts
```

**Important:** Always regenerate types after migration changes!

### 5. Verify Changes

1. **Check Supabase Studio:** http://127.0.0.1:54323
   - Browse to your table
   - Verify the new column appears

2. **Test in your app:**
   - Restart your dev server if needed
   - Test CRUD operations with the new field

### 6. Commit to Git

Once verified, commit your migration:

```bash
git add supabase/migrations/
git add lib/types/
git commit -m "feat: add priority field to todos"
```

## Migration Best Practices

### Do's ✅

- **Always test locally first** before deploying to production
- **Keep migrations small** - one logical change per migration
- **Use transactions** for multi-step changes:
  ```sql
  begin;
    -- Your changes here
  commit;
  ```
- **Add comments** explaining complex changes
- **Create indexes** for columns you'll query frequently
- **Enable RLS** (Row Level Security) on all tables:
  ```sql
  alter table public.your_table enable row level security;
  ```

### Don'ts ❌

- **Don't edit applied migrations** - Create a new migration instead
- **Don't rely on data being present** - Migrations run on empty databases too
- **Don't use `CASCADE` carelessly** - Be explicit about dependencies
- **Don't skip `db reset`** - Always test the full migration path

## Common Migration Patterns

### Adding a Column

```sql
alter table public.todos
  add column due_date timestamp with time zone;
```

### Adding a Column with Default

```sql
alter table public.todos
  add column priority text default 'medium' not null;
```

### Modifying a Column

```sql
-- Make a column nullable
alter table public.todos
  alter column description drop not null;

-- Change column type
alter table public.todos
  alter column priority type integer using (
    case priority
      when 'low' then 1
      when 'medium' then 2
      when 'high' then 3
    end
  );
```

### Dropping a Column

```sql
alter table public.todos
  drop column description;
```

**Warning:** This deletes all data in that column!

### Creating an Index

```sql
create index todos_title_idx on public.todos(title);

-- Partial index (only non-completed todos)
create index todos_active_idx on public.todos(created_at)
  where is_completed = false;
```

### Adding a Foreign Key

```sql
-- Add user_id column
alter table public.todos
  add column user_id uuid references auth.users(id) on delete cascade;

-- Make it required for new rows
alter table public.todos
  alter column user_id set not null;
```

### Creating a New Table

```sql
create table public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table public.categories enable row level security;

-- Add RLS policy
create policy "Allow public read access"
  on public.categories for select
  using (true);
```

## Row Level Security (RLS)

Always enable RLS on tables and create appropriate policies:

### Public Access (Demo Only)

```sql
alter table public.todos enable row level security;

create policy "Allow all access"
  on public.todos for all
  using (true)
  with check (true);
```

### Authenticated Users Only

```sql
create policy "Users can view their own todos"
  on public.todos for select
  using (auth.uid() = user_id);

create policy "Users can create their own todos"
  on public.todos for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own todos"
  on public.todos for update
  using (auth.uid() = user_id);

create policy "Users can delete their own todos"
  on public.todos for delete
  using (auth.uid() = user_id);
```

## Database Functions and Triggers

### Auto-Update Timestamp

```sql
-- Function
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = timezone('utc'::text, now());
  return new;
end;
$$ language plpgsql;

-- Trigger
create trigger set_updated_at
  before update on public.todos
  for each row
  execute function public.handle_updated_at();
```

### Soft Deletes

```sql
-- Add deleted_at column
alter table public.todos
  add column deleted_at timestamp with time zone;

-- Function to soft delete
create or replace function soft_delete()
returns trigger as $$
begin
  update public.todos
  set deleted_at = timezone('utc'::text, now())
  where id = old.id;
  return null;
end;
$$ language plpgsql;

-- Trigger
create trigger soft_delete_trigger
  before delete on public.todos
  for each row
  execute function soft_delete();
```

## Deploying to Production

### Option 1: Supabase Cloud (Linked Project)

```bash
# Link to your cloud project
supabase link --project-ref your-project-ref

# Push migrations to production
supabase db push
```

### Option 2: Manual SQL Execution

1. Copy your migration SQL
2. Go to Supabase Dashboard → SQL Editor
3. Paste and run the SQL
4. Update your production types

## Rollback Strategies

Supabase doesn't have built-in rollback, so you need to:

### 1. Create a Reverse Migration

If you added a column:
```sql
-- Original: 20260210123456_add_priority.sql
alter table public.todos add column priority text;
```

Create a new migration to remove it:
```sql
-- New: 20260210123457_remove_priority.sql
alter table public.todos drop column priority;
```

### 2. Backup Before Risky Changes

```bash
# Dump your database
supabase db dump -f backup.sql

# If something goes wrong, restore:
psql postgresql://postgres:postgres@127.0.0.1:54322/postgres < backup.sql
```

## Checking Migration Status

```bash
# List applied migrations
supabase migration list

# See pending migrations
supabase db diff

# View migration history in database
psql postgresql://postgres:postgres@127.0.0.1:54322/postgres \
  -c "SELECT * FROM supabase_migrations.schema_migrations ORDER BY version;"
```

## Tips for Team Development

1. **Pull latest migrations** before creating new ones:
   ```bash
   git pull
   supabase db reset  # Apply teammates' migrations
   ```

2. **Communicate** about schema changes in PRs

3. **Don't create conflicting migrations** - coordinate with your team

4. **Use feature branches** for experimental migrations

5. **Test migrations** in a staging environment before production

## Further Reading

- [Supabase Migrations Docs](https://supabase.com/docs/guides/cli/local-development#database-migrations)
- [PostgreSQL ALTER TABLE](https://www.postgresql.org/docs/current/sql-altertable.html)
- [Row Level Security](https://supabase.com/docs/guides/auth/row-level-security)
