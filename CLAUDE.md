# Claude Code Instructions for Soupabase Project

This file contains project-specific conventions, rules, and preferences for working with this codebase.

## Project Overview

This is a **proof of concept** demonstrating:
- Supabase integration with Next.js
- Database migration workflows
- Type-safe database operations
- **NOT** focused on complex architectural patterns or layered abstractions
- Keep things **practical and simple**

## CSS & Styling Conventions

### Dark/Light Mode Support

**Rule:** The app supports both light and dark modes based on system preference.

**Configuration:**
- Tailwind config uses `darkMode: 'media'` (automatically detects system preference)
- All UI elements must have both light and dark mode styles
- Use Tailwind's `dark:` prefix for dark mode variants

**Color Scheme:**
- **Light Mode:** Gray-50 backgrounds, dark text, white cards
- **Dark Mode:** Gray-900 backgrounds, light text, gray-800 cards

**Example:**
```tsx
<div className="bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100">
  Content that works in both modes
</div>
```

### ✅ DO: Use Global Base Styles

**Rule:** Define common element styles globally in `app/globals.css` using Tailwind's `@layer base` directive with dark mode support.

**Why:** Prevents having to repeat the same classes on every element and ensures consistent dark/light mode behavior across the app.

**Example:**
```css
@layer base {
  input[type='text'],
  textarea,
  select {
    @apply text-gray-900 bg-white border-gray-300;
    @apply dark:text-gray-100 dark:bg-gray-800 dark:border-gray-600;
  }
}
```

**Benefits:**
- Consistent styling across the app
- Less code repetition
- Easier to maintain and update
- Fewer manual changes needed

### ❌ DON'T: Repeat Color/Background Classes

**Bad:**
```tsx
<input className="... text-gray-900 bg-white" />
<textarea className="... text-gray-900 bg-white" />
<select className="... text-gray-900 bg-white" />
```

**Good:**
```tsx
<!-- Base styles already applied globally -->
<input className="..." />
<textarea className="..." />
<select className="..." />
```

### Component-Level Styles

For component-specific styling that doesn't apply globally:
- Use Tailwind utility classes directly
- **Always include dark mode variants** using `dark:` prefix
- Group related styles together for readability
- Consider extracting repeated patterns into reusable components

**Common Dark Mode Patterns:**
```tsx
// Backgrounds
className="bg-white dark:bg-gray-800"

// Text
className="text-gray-900 dark:text-gray-100"

// Borders
className="border-gray-300 dark:border-gray-600"

// Hover states
className="hover:bg-gray-100 dark:hover:bg-gray-700"
```

## Documentation Standards

### Setup Instructions

**Always include:**
1. **Prerequisites** - List ALL required tools with installation commands
   - Example: `brew install supabase/tap/supabase` (don't assume it's installed)

2. **Exact commands to run** - Copy-pasteable, tested commands

3. **Expected outputs** - What users should see when commands succeed

4. **Troubleshooting** - Common issues and how to fix them

### Migration Documentation

- Every migration should demonstrate a clear pattern
- Include comments explaining WHY, not just WHAT
- Show both the migration SQL and how to use it in code
- Always regenerate types after schema changes

## Development Principles

### KISS (Keep It Simple)

**This project prioritizes:**
- ✅ Direct Supabase usage in API routes
- ✅ Clear, straightforward code
- ✅ Practical demonstrations
- ❌ NOT complex layering (services, repositories, etc.)
- ❌ NOT over-engineered abstractions

Prefer the simplest solution that works. Avoid premature abstraction — wait until a pattern repeats before extracting it. Complexity should be justified by a concrete requirement, not a hypothetical one.

### DRY (Don't Repeat Yourself)

- Extract shared logic into reusable components, hooks, or utilities when the same pattern appears in **two or more** places
- Shared UI behaviors (e.g., confirmation dialogs, error handling) should live in `components/ui/` and be accessed via hooks or context providers
- Cross-cutting concerns (auth, API fetching) belong in centralized wrappers (`lib/fetch.ts`, middleware)
- Global styles go in `app/globals.css` using `@layer base` — don't repeat the same Tailwind classes across multiple components
- **Balance DRY with KISS:** a small amount of duplication is better than a premature or unclear abstraction

### iDesign Principles (Adapted for PoC)

Apply iDesign thinking where it adds clarity, but keep it proportional to this project's scope:

- **Separation of concerns:** Each file/component should have one clear responsibility. API routes handle HTTP. Components handle rendering. Hooks handle shared stateful logic.
- **Volatility-based decomposition:** Group code by what changes together, not by technical layer. A feature's component, hook, and tests should be easy to find and modify as a unit.
- **Contracts at boundaries:** API routes define clear request/response contracts. TypeScript interfaces enforce shapes at component boundaries. Auto-generated Supabase types serve as the database contract.
- **Avoid layering for layering's sake:** In this PoC, don't introduce service/repository layers just for structure. Direct Supabase calls in API routes are fine.

### Always Add Tests

- **Every new feature or component must include tests.** No feature is complete without them.
- **Every bug fix should include a regression test** that would have caught the bug.
- **Test behavior, not implementation.** Tests should verify what the user experiences (rendered output, API responses), not internal function calls or state shapes.
- **Update existing tests** when modifying behavior — stale tests are worse than no tests.
- **Shared components** (like `ConfirmDialog`) should be tested through the components that use them, not in isolation, unless the shared component has complex standalone logic.

## Architecture Preferences

### Centralize Cross-Cutting Concerns

**Rule:** When a behavior applies to all API calls or all components, centralize it rather than repeating inline checks everywhere.

**Example — Auth redirect on 401:**
- `lib/fetch.ts` exports `apiFetch`, a wrapper around `fetch` that intercepts 401 responses and redirects to `/login`
- Client components must use `apiFetch` instead of raw `fetch` for all `/api/*` calls
- The middleware (`lib/supabase/proxy.ts`) returns 401 JSON for API routes (instead of redirecting to login HTML)

```typescript
import { apiFetch } from '@/lib/fetch'

// Good — 401 handling is automatic
const response = await apiFetch('/api/todos', { method: 'POST', ... })

// Bad — duplicates 401 logic in every call site
const response = await fetch('/api/todos', { method: 'POST', ... })
if (response.status === 401) { window.location.href = '/login'; return }
```

### Type Safety

- Always use auto-generated types from Supabase
- Run `supabase gen types typescript --local > lib/types/database.types.ts` after schema changes
- Never manually define database types

### Accessor Pattern for Data Access

**Rule:** Database queries live in accessor modules under `lib/accessors/`, not in API route handlers. API routes handle HTTP concerns only (auth, validation, request parsing, response formatting).

**Structure:**
- **Accessor files:** `lib/accessors/<entity>.ts` (e.g., `lib/accessors/todos.ts`)
- **Exports:** Plain async functions, one per DB operation (e.g., `listTodos`, `getTodo`, `createTodo`, `updateTodo`, `deleteTodo`)
- **Returns:** Raw Supabase `{ data, error }` — the route decides how to format the HTTP response
- **Client creation:** Each function calls `createClient()` internally
- **No auth checks:** Auth is a request-level concern that stays in the route handler

**Example — accessor:**
```typescript
// lib/accessors/todos.ts
import { createClient } from '@/lib/supabase/server'
import type { TodoInsert } from '@/lib/types'

export async function listTodos(searchQuery?: string) {
  const supabase = await createClient()
  let query = supabase.from('todos').select('*')
  if (searchQuery) {
    query = query.or(`title.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%`)
  }
  return query.order('created_at', { ascending: false })
}
```

**Example — route using accessor:**
```typescript
// app/api/todos/route.ts
import { listTodos } from '@/lib/accessors/todos'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const query = searchParams.get('q')?.trim() || ''
  const { data, error } = await listTodos(query || undefined)
  // ... error handling and response formatting
}
```

**When adding a new entity**, create its accessor module first, then build routes that call it.

## Development Workflow

### Making Changes

1. **Schema Changes:**
   - Create migration: `supabase migration new feature_name`
   - Write SQL in the migration file
   - Apply migration: `supabase migration up` (preserves existing data)
   - Regenerate types
   - Update components/API routes to use new fields
   - **Never use `supabase db reset` without asking first** — it wipes all data

2. **UI Changes:**
   - Check if styles should be global (in `globals.css`)
   - If styling applies to multiple elements → global base styles
   - If styling is component-specific → inline Tailwind classes

3. **Testing:**
   - Run `npm test` before committing
   - All tests must pass
   - Add tests for new features

### Verifying Changes

**IMPORTANT:** After making any code changes, always verify the code is valid by running:

1. **Build check:**
   ```bash
   npm run build
   ```
   - Ensures production build works
   - Catches TypeScript errors
   - Verifies all imports are correct

2. **Type checking:**
   ```bash
   npx tsc --noEmit
   ```
   - Validates TypeScript types without building
   - Faster than full build for quick checks

3. **Run tests:**
   ```bash
   npm test
   ```
   - Ensures all tests pass
   - Confirms no regressions

**Do this BEFORE staging changes for commit.** This prevents broken code from being committed.

## Code Style

### TypeScript

- Strict mode enabled
- No `any` types (use `unknown` if type is truly unknown)
- Prefer type inference where clear
- Explicit types for function parameters and returns

### React Components

- Use functional components
- Server components by default
- Client components only when needed (state, events, browser APIs)
- Clear prop types with TypeScript interfaces

### Naming Conventions

- **Files:** kebab-case (`todo-list.tsx`)
- **Components:** PascalCase (`TodoList`)
- **Functions:** camelCase (`createTodo`)
- **Types:** PascalCase (`Todo`, `TodoInsert`)
- **Database tables:** snake_case (`todos`, `user_profiles`)

## Supabase Conventions

### Row Level Security (RLS)

- **ALWAYS** enable RLS on tables
- For PoC/demo: Use public access policies (with comments noting it's for demo)
- For production: User-specific policies with `auth.uid()`

```sql
-- Demo/PoC
create policy "Allow public access"
  on public.todos for all
  using (true);

-- Production (uncomment when implementing auth)
-- create policy "Users can view their own todos"
--   on public.todos for select
--   using (auth.uid() = user_id);
```

### Migrations

- **Timestamp-based filenames** (auto-generated)
- **One logical change per migration**
- **Include comments** explaining complex changes
- **Add indexes** for frequently queried columns
- **Version control** all migrations in git

### Real-Time Subscriptions (RTS)

**Rule:** Always assume new features and tables need real-time support. Every new table should be configured for Realtime by default.

**Required steps for each new table:**
1. Add the table to the Realtime publication: `ALTER PUBLICATION supabase_realtime ADD TABLE public.<table_name>;`
2. Set `REPLICA IDENTITY FULL` so WALRUS can evaluate RLS policies: `ALTER TABLE public.<table_name> REPLICA IDENTITY FULL;`

**Why REPLICA IDENTITY FULL?** Supabase Realtime's WALRUS system impersonates subscribers and runs SELECT queries to verify RLS policies. Without FULL replica identity, only the primary key is in the WAL, and WALRUS can't properly evaluate RLS for INSERT/UPDATE events.

**Client-side:** When subscribing to Realtime channels, wait for the auth session to be ready before subscribing. Set the Realtime auth token explicitly with `supabase.realtime.setAuth(session.access_token)` so WALRUS can evaluate RLS with the correct user identity.

### Database Design

- Use `uuid` for primary keys
- Include `created_at` and `updated_at` timestamps
- Use triggers for automatic `updated_at` updates
- Add CHECK constraints for validation
- Create indexes for foreign keys and frequently queried columns

## Authentication

**Current State:** Authentication is **enabled**. The middleware (`lib/supabase/proxy.ts`) enforces auth:
- Page navigations by unauthenticated users redirect to `/login`
- API routes return 401 JSON (so client-side `apiFetch` can redirect)
- `/login`, `/signup`, and `/auth` paths are excluded from auth checks

**Key files:**
- `lib/supabase/proxy.ts` — Middleware session validation + auth redirects
- `lib/fetch.ts` — Client-side `apiFetch` wrapper that redirects to `/login` on 401
- `app/login/page.tsx`, `app/signup/page.tsx` — Auth pages

## Testing

### Running Tests

```bash
npm test              # Run all tests
npm run test:watch    # Watch mode
npm run test:coverage # With coverage report
```

### Test Standards

- Mock external dependencies (Supabase client, fetch)
- Test user behavior, not implementation details
- Use descriptive test names: "should do something when condition"
- Cover happy path and error cases

## Common Tasks

### Adding a New Entity

Follow the guide in `docs/NEW_PROJECT_GUIDE.md`:
1. Create migration (include RLS policies, Realtime publication, and `REPLICA IDENTITY FULL`)
2. Apply migration (`supabase migration up` — preserves data; ask before using `db reset`)
3. Regenerate types
4. Create API routes
5. Create UI components (use `apiFetch` for all API calls)
6. Add real-time subscriptions if applicable
7. Test end-to-end

### Debugging

**Supabase not starting?**
- Check Docker is running
- Run `supabase stop` then `supabase start`

**Types not matching database?**
- Regenerate: `supabase gen types typescript --local > lib/types/database.types.ts`
- Restart TypeScript server in VS Code

**Tests failing?**
- Check mocks are set up correctly
- Ensure you're not testing implementation details
- Read error messages carefully

## Environment

### Local Development

- **Supabase:** http://127.0.0.1:54321
- **Supabase Studio:** http://127.0.0.1:54323
- **Next.js App:** http://localhost:3000
- **API Routes:** http://localhost:3000/api/*

### Required Environment Variables

```bash
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=<from supabase start>
```

Get keys by running: `supabase status`

## Git Workflow

### Commits

**IMPORTANT:** Never run `git commit` directly. The user handles all commits themselves. When asked, stage the files and provide a commit message for the user to use.

### What to Commit

- ✅ Migration files (`supabase/migrations/*.sql`)
- ✅ Generated types (`lib/types/database.types.ts`)
- ✅ Application code
- ✅ Tests
- ✅ Documentation

### What NOT to Commit

- ❌ `.env.local` (use `.env.local.example` instead)
- ❌ `node_modules/`
- ❌ `.next/`
- ❌ Database dumps with sensitive data

## Resources

- **Setup Guide:** `docs/SETUP.md`
- **Migration Guide:** `docs/MIGRATIONS.md`
- **New Project Guide:** `docs/NEW_PROJECT_GUIDE.md`
- **Project Summary:** `PROJECT_SUMMARY.md`
- **Test Documentation:** `__tests__/README.md`

## Key Learnings

1. **Global styles prevent repetition** - Use `@layer base` for common element styling
2. **Migrations are version control for your database** - Never edit applied migrations
3. **Type generation is automatic** - Always regenerate after schema changes
4. **RLS is essential** - Security should be at the database level
5. **Keep it simple** - Don't over-engineer for this PoC
6. **Centralize cross-cutting concerns** - Use `apiFetch` instead of raw `fetch`, handle auth redirects in one place
7. **Always plan for real-time** - New tables need Realtime publication + `REPLICA IDENTITY FULL`
8. **DRY through shared components** - Reusable UI behaviors (e.g., `ConfirmDialog`) live in `components/ui/` with context providers and hooks
9. **Tests are not optional** - Every feature, bug fix, and behavioral change must include corresponding tests
10. **Separate concerns, not layers** - Organize by responsibility and volatility, not by arbitrary technical layers
11. **Accessor pattern for data access** - DB queries go in `lib/accessors/`, API routes handle HTTP concerns only

---

**Last Updated:** 2026-02-11

**Note:** This file should be updated whenever new conventions or patterns are established in the project.
