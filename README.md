# Soupabase - Supabase + Next.js Proof of Concept

A demonstration of Supabase integration with Next.js, focusing on database migrations, type-safe operations, and practical workflows for building full-stack applications.

## What This Project Demonstrates

- **Supabase Local Development** - Complete local development environment with Docker
- **Type-Safe Database Operations** - Auto-generated TypeScript types from database schema
- **Migration Management** - Version-controlled SQL migrations with Supabase CLI
- **Row Level Security (RLS)** - PostgreSQL security policies for data access control
- **CRUD Operations** - RESTful API routes with Next.js App Router
- **Real-Time Updates** - Automatic timestamp triggers and database constraints
- **Schema Evolution** - Demonstrated with follow-up migration adding priority field

## Quick Start

### Prerequisites

- Node.js 18+ and npm
- Docker Desktop (running)
- Supabase CLI: `brew install supabase/tap/supabase`

### Get Started in 5 Minutes

```bash
# Clone and install
git clone <your-repo-url>
cd Soupabase
npm install

# Start Supabase (Docker must be running)
supabase start

# Apply migrations
supabase db reset

# Generate TypeScript types
supabase gen types typescript --local > lib/types/database.types.ts

# Start development server
npm run dev
```

Visit:
- **App**: http://localhost:3000
- **Supabase Studio**: http://127.0.0.1:54323
- **API**: http://localhost:3000/api/todos

## Project Structure

```
soupabase/
├── app/                      # Next.js App Router
│   ├── api/todos/           # RESTful API endpoints
│   └── todos/               # Todo list page
├── components/              # React components
│   └── todos/               # Todo UI components
├── lib/
│   ├── supabase/            # Supabase client configuration
│   └── types/               # TypeScript type definitions
├── supabase/
│   ├── migrations/          # Database migrations (version controlled)
│   └── config.toml          # Supabase configuration
└── docs/                    # Comprehensive documentation
    ├── SETUP.md             # Step-by-step setup guide
    ├── MIGRATIONS.md        # Migration patterns and best practices
    └── NEW_PROJECT_GUIDE.md # Template for adding new features
```

## Key Features

### Database Migrations

Version-controlled SQL files that track schema changes:

```bash
# Create a new migration
supabase migration new add_feature

# Test locally
supabase db reset

# Deploy to production
supabase db push
```

See [docs/MIGRATIONS.md](docs/MIGRATIONS.md) for detailed migration patterns.

### Type-Safe Database Operations

Automatically generated TypeScript types ensure type safety:

```typescript
import type { Todo, TodoInsert, TodoUpdate } from '@/lib/types'

const { data, error } = await supabase
  .from('todos')
  .select('*')
  .returns<Todo[]>()
```

### Row Level Security

PostgreSQL RLS policies control data access:

```sql
create policy "Users can view their own todos"
  on public.todos for select
  using (auth.uid() = user_id);
```

### API Routes Pattern

RESTful endpoints following Next.js conventions:

- `GET /api/todos` - List all todos
- `POST /api/todos` - Create new todo
- `GET /api/todos/[id]` - Get specific todo
- `PATCH /api/todos/[id]` - Update todo
- `DELETE /api/todos/[id]` - Delete todo

## Documentation

This project includes comprehensive documentation:

- **[SETUP.md](docs/SETUP.md)** - Complete setup guide from scratch
- **[MIGRATIONS.md](docs/MIGRATIONS.md)** - Migration workflows and patterns
- **[NEW_PROJECT_GUIDE.md](docs/NEW_PROJECT_GUIDE.md)** - Template for adding new entities

## Example: Todo CRUD

The project demonstrates a complete Todo application with:

- ✅ Create todos with title and description
- ✅ Mark todos as complete/incomplete
- ✅ Delete todos
- ✅ Automatic timestamps (created_at, updated_at)
- ✅ Priority levels (low, medium, high) - added via migration
- ✅ Type-safe operations throughout

## Migrations Timeline

This project demonstrates schema evolution:

1. **Initial Migration** (`20260210170613_create_todos_table.sql`)
   - Created todos table
   - Added RLS policies
   - Created updated_at trigger
   - Added indexes

2. **Follow-up Migration** (`20260210171835_add_priority_to_todos.sql`)
   - Added priority column with CHECK constraint
   - Created priority index
   - Demonstrates schema evolution pattern

## Environment Variables

Create `.env.local`:

```bash
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-from-supabase-start
```

Get your local keys by running `supabase status`.

## Useful Commands

```bash
# Supabase
supabase start              # Start local Supabase
supabase stop               # Stop local Supabase
supabase status             # Check status and get credentials
supabase db reset           # Reset database and apply migrations
supabase migration new NAME # Create new migration
supabase gen types          # Generate TypeScript types

# Next.js
npm run dev                 # Start development server
npm run build               # Build for production
npm run start               # Start production server
```

## Testing the API

```bash
# List all todos
curl http://localhost:3000/api/todos

# Create a todo
curl -X POST http://localhost:3000/api/todos \
  -H "Content-Type: application/json" \
  -d '{"title":"Test Todo","description":"Testing"}'

# Update a todo
curl -X PATCH http://localhost:3000/api/todos/{id} \
  -H "Content-Type: application/json" \
  -d '{"is_completed":true}'

# Delete a todo
curl -X DELETE http://localhost:3000/api/todos/{id}
```

## Production Deployment

For production deployment to Supabase Cloud:

```bash
# Link to your Supabase project
supabase link --project-ref your-project-ref

# Push migrations to production
supabase db push

# Deploy Next.js app (Vercel, etc.)
npm run build
```

## Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Database**: PostgreSQL (via Supabase)
- **ORM/Client**: Supabase JavaScript Client
- **Language**: TypeScript (strict mode)
- **Styling**: Tailwind CSS
- **Development**: Docker, Supabase CLI

## Learning Resources

- [Supabase Documentation](https://supabase.com/docs)
- [Next.js App Router](https://nextjs.org/docs/app)
- [PostgreSQL Docs](https://www.postgresql.org/docs/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)

## Architecture Principles

This project follows these principles:

1. **Type Safety** - Leverage TypeScript throughout
2. **Schema First** - Database migrations drive type generation
3. **Security by Default** - Always use RLS policies
4. **Local Development** - Develop and test locally before deploying
5. **Version Control** - Track schema changes in migrations
6. **Documentation** - Comprehensive guides for replication

## Next Steps

To extend this project:

1. Add authentication with Supabase Auth
2. Implement user-specific RLS policies
3. Add real-time subscriptions for live updates
4. Create additional entities (Projects, Categories, etc.)
5. Add pagination to list endpoints
6. Implement full-text search
7. Add file storage with Supabase Storage

Follow [docs/NEW_PROJECT_GUIDE.md](docs/NEW_PROJECT_GUIDE.md) for step-by-step instructions.

## License

MIT

## Questions?

- Check the [docs/](docs/) folder for detailed guides
- Review the migration files for SQL examples
- Examine the API routes for implementation patterns
- Open an issue for questions or improvements
