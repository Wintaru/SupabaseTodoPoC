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

## Architecture Preferences

### Keep It Simple

**This project prioritizes:**
- ✅ Direct Supabase usage in API routes
- ✅ Clear, straightforward code
- ✅ Practical demonstrations
- ❌ NOT complex layering (services, repositories, etc.)
- ❌ NOT over-engineered abstractions

### Type Safety

- Always use auto-generated types from Supabase
- Run `supabase gen types typescript --local > lib/types/database.types.ts` after schema changes
- Never manually define database types

## Development Workflow

### Making Changes

1. **Schema Changes:**
   - Create migration: `supabase migration new feature_name`
   - Write SQL in the migration file
   - Test locally: `supabase db reset`
   - Regenerate types
   - Update components/API routes to use new fields

2. **UI Changes:**
   - Check if styles should be global (in `globals.css`)
   - If styling applies to multiple elements → global base styles
   - If styling is component-specific → inline Tailwind classes

3. **Testing:**
   - Run `npm test` before committing
   - All tests must pass
   - Add tests for new features

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

### Database Design

- Use `uuid` for primary keys
- Include `created_at` and `updated_at` timestamps
- Use triggers for automatic `updated_at` updates
- Add CHECK constraints for validation
- Create indexes for foreign keys and frequently queried columns

## Authentication

**Current State:** Authentication redirect is **disabled** for PoC.

**Location:** `lib/supabase/proxy.ts` (lines 40-53 are commented out)

**When implementing authentication:**
1. Uncomment the redirect logic in `proxy.ts`
2. Create login/signup pages
3. Update RLS policies to use `auth.uid()`
4. Add `user_id` foreign keys to tables

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
1. Create migration
2. Apply migration (`supabase db reset`)
3. Regenerate types
4. Create API routes
5. Create UI components
6. Test end-to-end

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

---

**Last Updated:** 2026-02-10

**Note:** This file should be updated whenever new conventions or patterns are established in the project.
