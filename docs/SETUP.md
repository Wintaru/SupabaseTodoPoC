# Setup Guide

This guide walks you through setting up a new Supabase + Next.js project from scratch.

## Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** (v18 or higher) - [Download](https://nodejs.org/)
- **npm** or **yarn** - Comes with Node.js
- **Docker Desktop** - [Download](https://docs.docker.com/desktop/) - Required for local Supabase development
- **Supabase CLI** - Install via Homebrew:
  ```bash
  brew install supabase/tap/supabase
  ```

## Step-by-Step Setup

### 1. Bootstrap Your Project

Run the Supabase bootstrap command to create a new Next.js project:

```bash
npx supabase@latest bootstrap
```

**When prompted, select:**
- Template: **nextjs** (Next.js App Router template with cookie-based auth)
- Project name: Your choice (e.g., `my-app`)
- **Skip login** when asked (for local development only)

**Note:** The bootstrap process may be interrupted. If so, you'll need to manually create the Next.js structure (see Troubleshooting below).

### 2. Navigate to Your Project

```bash
cd your-project-name
```

### 3. Install Dependencies

```bash
npm install
```

### 4. Initialize Supabase

If not already done by the bootstrap:

```bash
supabase init
```

This creates a `supabase/` directory with configuration files.

### 5. Start Docker Desktop

Make sure Docker Desktop is running before proceeding. Supabase requires Docker to run the local development environment.

### 6. Start Local Supabase

```bash
supabase start
```

**What this does:**
- Downloads and starts PostgreSQL, Auth, Storage, and other Supabase services in Docker containers
- Applies any migrations in `supabase/migrations/`
- Provides you with local API keys and URLs

**Save the output!** You'll see something like:

```
API URL: http://127.0.0.1:54321
Studio URL: http://127.0.0.1:54323
Publishable Key: sb_publishable_...
Secret Key: sb_secret_...
```

### 7. Configure Environment Variables

Create a `.env.local` file in your project root:

```bash
# .env.local
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your_publishable_key_from_step_6
```

**Important:**
- Replace `your_publishable_key_from_step_6` with the actual key from the `supabase start` output
- This file is gitignored by default - never commit it!

### 7b. Configure Email Confirmation (Optional)

If you want to test email confirmation locally, create `supabase/.env.local`:

```bash
# supabase/.env.local
# Disable auto-confirmation so users must confirm email addresses
GOTRUE_MAILER_AUTOCONFIRM=false
```

Then restart Supabase:

```bash
supabase stop && supabase start
```

**View emails:** Open Mailpit at http://127.0.0.1:54324

**Learn more:** See [AUTHENTICATION.md](./AUTHENTICATION.md) for complete auth setup

### 8. Create Your First Migration

```bash
supabase migration new create_your_table
```

This creates a new SQL file in `supabase/migrations/` with a timestamp prefix.

**Example migration** (`supabase/migrations/20260210170613_create_todos_table.sql`):

```sql
-- Create todos table
create table public.todos (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  is_completed boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create indexes
create index todos_created_at_idx on public.todos(created_at desc);

-- Enable Row Level Security
alter table public.todos enable row level security;

-- Create RLS policy (for demo - adjust for production!)
create policy "Allow public access"
  on public.todos for all
  using (true)
  with check (true);

-- Auto-update trigger
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = timezone('utc'::text, now());
  return new;
end;
$$ language plpgsql;

create trigger set_updated_at
  before update on public.todos
  for each row
  execute function public.handle_updated_at();
```

### 9. Apply Your Migration

Reset the database to apply all migrations:

```bash
supabase db reset
```

This will:
- Drop and recreate your local database
- Apply all migrations in order
- Seed data if you have a `supabase/seed.sql` file

### 10. Generate TypeScript Types

Generate type-safe TypeScript types from your database schema:

```bash
supabase gen types typescript --local > lib/types/database.types.ts
```

**Create a helper file** (`lib/types/index.ts`):

```typescript
import { Database } from './database.types'

export type { Database }

export type Todo = Database['public']['Tables']['todos']['Row']
export type TodoInsert = Database['public']['Tables']['todos']['Insert']
export type TodoUpdate = Database['public']['Tables']['todos']['Update']
```

### 11. Start the Development Server

```bash
npm run dev
```

Your app is now running at **http://localhost:3000**!

## Accessing Supabase Studio

Supabase Studio is a web-based interface for managing your database:

- **URL:** http://127.0.0.1:54323
- **Features:**
  - Browse tables and data
  - Run SQL queries
  - Manage auth users
  - View logs

## Troubleshooting

### Bootstrap was interrupted

If the bootstrap process was interrupted, you may need to manually create:

1. **Next.js configuration files:**
   - `tsconfig.json`
   - `next.config.ts`
   - `tailwind.config.ts`
   - `postcss.config.mjs`

2. **App structure:**
   - `app/layout.tsx`
   - `app/page.tsx`
   - `app/globals.css`

See this PoC's files as reference templates.

### Docker not running

```
Error: Cannot connect to the Docker daemon
```

**Solution:** Start Docker Desktop and try again.

### Supabase CLI not found

```
command not found: supabase
```

**Solution:** Install the Supabase CLI:
```bash
brew install supabase/tap/supabase
```

### Port already in use

If ports 54321-54324 are already in use:

```bash
supabase stop
supabase start
```

Or change ports in `supabase/config.toml`.

### TypeScript errors

After generating types, restart your TypeScript server:
- VS Code: `Cmd+Shift+P` → "TypeScript: Restart TS Server"

## Next Steps

- Read [AUTHENTICATION.md](./AUTHENTICATION.md) to learn about user authentication and RLS
- Read [MIGRATIONS.md](./MIGRATIONS.md) to learn about database migrations
- Read [NEW_PROJECT_GUIDE.md](./NEW_PROJECT_GUIDE.md) to replicate this setup for new features
- Check out [Supabase Documentation](https://supabase.com/docs)

## Stopping Your Development Environment

When you're done developing:

```bash
# Stop Next.js dev server
# Press Ctrl+C in the terminal running npm run dev

# Stop Supabase
supabase stop
```

To remove all Docker containers and volumes:

```bash
supabase stop --no-backup
```

**Warning:** This deletes all local data!
