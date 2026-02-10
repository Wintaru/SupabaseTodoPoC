# New Project Setup Guide

This guide provides a step-by-step template for replicating this Supabase + Next.js setup in new projects.

## Quick Reference Checklist

When creating a new project from scratch:

- [ ] Install prerequisites (Node.js 18+, Docker, Supabase CLI)
- [ ] Run `npx supabase@latest bootstrap` and select Next.js template
- [ ] Initialize Supabase with `supabase init`
- [ ] Create your first migration
- [ ] Start Supabase locally
- [ ] Generate TypeScript types
- [ ] Create API routes for your domain
- [ ] Build UI components
- [ ] Test locally
- [ ] Deploy to production

## Adding a New Entity to This Project

Follow this pattern when adding new features (e.g., "Projects", "Users", "Categories"):

### 1. Create a Migration

```bash
# Replace 'entity_name' with your entity (e.g., projects, categories)
supabase migration new create_entity_name_table
```

**Migration template** (edit `supabase/migrations/YYYYMMDDHHMMSS_create_entity_name_table.sql`):

```sql
-- Example: Creating a 'projects' table
create table public.projects (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  status text default 'active' check (status in ('active', 'archived', 'completed')),
  user_id uuid references auth.users(id) on delete cascade,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Add indexes for commonly queried fields
create index projects_user_id_idx on public.projects(user_id);
create index projects_status_idx on public.projects(status);
create index projects_created_at_idx on public.projects(created_at desc);

-- Enable Row Level Security
alter table public.projects enable row level security;

-- RLS Policies (adjust based on your security requirements)

-- Option 1: Public access (demo/testing only)
create policy "Allow public access"
  on public.projects for all
  using (true)
  with check (true);

-- Option 2: User-specific access (production pattern)
-- Uncomment and use this for authenticated apps:
-- create policy "Users can view their own projects"
--   on public.projects for select
--   using (auth.uid() = user_id);
--
-- create policy "Users can create their own projects"
--   on public.projects for insert
--   with check (auth.uid() = user_id);
--
-- create policy "Users can update their own projects"
--   on public.projects for update
--   using (auth.uid() = user_id);
--
-- create policy "Users can delete their own projects"
--   on public.projects for delete
--   using (auth.uid() = user_id);

-- Add automatic updated_at trigger
create trigger set_updated_at
  before update on public.projects
  for each row
  execute function public.handle_updated_at();

-- Note: The handle_updated_at function already exists from the initial migration
-- If starting fresh, you'd need to create it (see MIGRATIONS.md)
```

### 2. Apply the Migration

```bash
# Option 1: Reset database (clean slate - recommended for development)
supabase db reset

# Option 2: Apply only new migrations
supabase migration up
```

### 3. Regenerate TypeScript Types

**Always regenerate after schema changes:**

```bash
supabase gen types typescript --local > lib/types/database.types.ts
```

### 4. Update Type Exports

Edit `lib/types/index.ts` to add your new entity:

```typescript
import { Database } from './database.types'

export type { Database }

// Existing
export type Todo = Database['public']['Tables']['todos']['Row']
export type TodoInsert = Database['public']['Tables']['todos']['Insert']
export type TodoUpdate = Database['public']['Tables']['todos']['Update']

// Add your new entity
export type Project = Database['public']['Tables']['projects']['Row']
export type ProjectInsert = Database['public']['Tables']['projects']['Insert']
export type ProjectUpdate = Database['public']['Tables']['projects']['Update']
```

### 5. Create API Routes

Create `app/api/projects/route.ts` for collection endpoints:

```typescript
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import type { ProjectInsert } from '@/lib/types'

// GET /api/projects - List all projects
export async function GET() {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching projects:', error)
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    )
  }
}

// POST /api/projects - Create new project
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const supabase = await createClient()

    // Validate required fields
    if (!body.title || body.title.trim() === '') {
      return NextResponse.json(
        { error: 'Title is required' },
        { status: 400 }
      )
    }

    const projectData: ProjectInsert = {
      title: body.title.trim(),
      description: body.description?.trim() || null,
      status: body.status || 'active',
    }

    const { data, error } = await supabase
      .from('projects')
      .insert(projectData)
      .select()
      .single()

    if (error) {
      console.error('Error creating project:', error)
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json(data, { status: 201 })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    )
  }
}
```

Create `app/api/projects/[id]/route.ts` for individual resource endpoints:

```typescript
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import type { ProjectUpdate } from '@/lib/types'

type Params = Promise<{ id: string }>

// GET /api/projects/[id]
export async function GET(
  request: Request,
  context: { params: Params }
) {
  try {
    const { id } = await context.params
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .eq('id', id)
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 404 })
    }

    return NextResponse.json(data)
  } catch (error) {
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    )
  }
}

// PATCH /api/projects/[id]
export async function PATCH(
  request: Request,
  context: { params: Params }
) {
  try {
    const { id } = await context.params
    const body = await request.json()
    const supabase = await createClient()

    const updateData: ProjectUpdate = {}

    if (body.title !== undefined) {
      if (body.title.trim() === '') {
        return NextResponse.json(
          { error: 'Title cannot be empty' },
          { status: 400 }
        )
      }
      updateData.title = body.title.trim()
    }

    if (body.description !== undefined) {
      updateData.description = body.description?.trim() || null
    }

    if (body.status !== undefined) {
      updateData.status = body.status
    }

    const { data, error } = await supabase
      .from('projects')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 404 })
    }

    return NextResponse.json(data)
  } catch (error) {
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    )
  }
}

// DELETE /api/projects/[id]
export async function DELETE(
  request: Request,
  context: { params: Params }
) {
  try {
    const { id } = await context.params
    const supabase = await createClient()

    const { error } = await supabase
      .from('projects')
      .delete()
      .eq('id', id)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 404 })
    }

    return NextResponse.json({ success: true }, { status: 200 })
  } catch (error) {
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    )
  }
}
```

### 6. Create UI Components

Create `components/projects/ProjectList.tsx`:

```typescript
'use client'

import { useState } from 'react'
import type { Project } from '@/lib/types'

interface ProjectListProps {
  initialProjects: Project[]
}

export default function ProjectList({ initialProjects }: ProjectListProps) {
  const [projects, setProjects] = useState<Project[]>(initialProjects)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const addProject = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) return

    setIsLoading(true)
    try {
      const response = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, description }),
      })

      if (response.ok) {
        const newProject = await response.json()
        setProjects([newProject, ...projects])
        setTitle('')
        setDescription('')
      }
    } catch (error) {
      console.error('Error adding project:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const deleteProject = async (id: string) => {
    if (!confirm('Are you sure you want to delete this project?')) return

    try {
      const response = await fetch(`/api/projects/${id}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        setProjects(projects.filter(project => project.id !== id))
      }
    } catch (error) {
      console.error('Error deleting project:', error)
    }
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-8">Projects</h1>

      <form onSubmit={addProject} className="mb-8 p-6 bg-white rounded-lg shadow-md">
        <div className="mb-4">
          <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
            Title *
          </label>
          <input
            type="text"
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
            required
          />
        </div>
        <div className="mb-4">
          <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
            Description
          </label>
          <textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
            rows={3}
          />
        </div>
        <button
          type="submit"
          disabled={isLoading}
          className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          {isLoading ? 'Adding...' : 'Add Project'}
        </button>
      </form>

      <div className="space-y-4">
        {projects.map((project) => (
          <div key={project.id} className="p-4 bg-white rounded-lg shadow-md">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-lg font-medium">{project.title}</h3>
                {project.description && (
                  <p className="text-sm text-gray-600 mt-1">{project.description}</p>
                )}
                <p className="text-xs text-gray-400 mt-2">
                  Status: {project.status}
                </p>
              </div>
              <button
                onClick={() => deleteProject(project.id)}
                className="px-3 py-1 text-sm text-red-600 hover:bg-red-50 rounded"
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
```

Create page `app/projects/page.tsx`:

```typescript
import { createClient } from '@/lib/supabase/server'
import ProjectList from '@/components/projects/ProjectList'

export default async function ProjectsPage() {
  const supabase = await createClient()
  const { data: projects } = await supabase
    .from('projects')
    .select('*')
    .order('created_at', { ascending: false })

  return <ProjectList initialProjects={projects || []} />
}
```

### 7. Test Your Changes

```bash
# Reset database to apply migration
supabase db reset

# Verify in Supabase Studio
# Open http://127.0.0.1:54323
# Check that your new table appears with correct schema

# Test API endpoints
curl http://localhost:3000/api/projects

# Create a test record
curl -X POST http://localhost:3000/api/projects \
  -H "Content-Type: application/json" \
  -d '{"title":"Test Project","description":"Testing the API"}'

# Visit your page
# http://localhost:3000/projects
```

### 8. Commit Your Changes

```bash
git add supabase/migrations/
git add lib/types/
git add app/api/projects/
git add components/projects/
git add app/projects/
git commit -m "feat: add projects entity with CRUD operations"
```

## Common Patterns Reference

### Adding a Foreign Key Relationship

Example: Link todos to projects

```sql
-- Migration: add_project_id_to_todos.sql
alter table public.todos
  add column project_id uuid references public.projects(id) on delete set null;

create index todos_project_id_idx on public.todos(project_id);
```

### Adding Enum-Style Columns

```sql
-- Use CHECK constraint for enum-like behavior
alter table public.todos
  add column priority text default 'medium'
  check (priority in ('low', 'medium', 'high'));

create index todos_priority_idx on public.todos(priority);
```

### Adding a Join Query to API

```typescript
// In your API route
const { data, error } = await supabase
  .from('todos')
  .select(`
    *,
    project:projects(id, title)
  `)
  .order('created_at', { ascending: false })
```

### Full-Text Search

```sql
-- Add tsvector column for search
alter table public.projects
  add column search_vector tsvector
  generated always as (
    to_tsvector('english', coalesce(title, '') || ' ' || coalesce(description, ''))
  ) stored;

create index projects_search_idx on public.projects using gin(search_vector);
```

Then query it:

```typescript
const { data } = await supabase
  .from('projects')
  .select('*')
  .textSearch('search_vector', searchQuery)
```

## Anti-Patterns to Avoid

❌ **Don't edit applied migrations** - Always create a new migration to change schema

❌ **Don't skip RLS** - Always enable Row Level Security and create appropriate policies

❌ **Don't forget to regenerate types** - Run type generation after every migration

❌ **Don't commit .env.local** - Keep your environment variables secure

❌ **Don't use SELECT \*** in production - Be explicit about which columns you need

❌ **Don't forget indexes** - Add indexes for foreign keys and frequently queried columns

## Production Deployment Checklist

Before deploying to production:

- [ ] All migrations tested locally with `supabase db reset`
- [ ] RLS policies configured correctly (not using `using (true)` in production)
- [ ] Environment variables configured in production environment
- [ ] Types regenerated and committed
- [ ] API routes have proper error handling
- [ ] Sensitive data is not exposed in API responses
- [ ] Database backups configured
- [ ] Monitoring and logging set up

## Troubleshooting

**TypeScript errors after migration:**
- Run `supabase gen types typescript --local > lib/types/database.types.ts`
- Restart your TypeScript server in VS Code

**Migration won't apply:**
- Check syntax in SQL file
- Look for table/column name conflicts
- Check `supabase logs` for detailed errors

**RLS blocking queries:**
- Verify your policies match your query patterns
- Use Supabase Studio to test policies
- Check auth.uid() is set correctly

**Types don't match database:**
- Regenerate types after every schema change
- Make sure Supabase is running when generating types

## Resources

- [Supabase Documentation](https://supabase.com/docs)
- [PostgreSQL ALTER TABLE](https://www.postgresql.org/docs/current/sql-altertable.html)
- [Next.js App Router](https://nextjs.org/docs/app)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/intro.html)
