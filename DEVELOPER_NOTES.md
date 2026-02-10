# Developer Notes

## Realtime Subscriptions Not Working with RLS (INSERT/UPDATE)

### Problem

When Row Level Security (RLS) was enabled on the `todos` table, Realtime subscriptions only received **DELETE** events. **INSERT** and **UPDATE** events were silently dropped. Disabling RLS made all events work.

### Root Cause

Supabase Realtime uses an internal system called **WALRUS** (Write Ahead Log Realtime Unified Security) to enforce RLS on real-time events. The behavior differs by event type:

| Event    | RLS Applied? | Why                                                        |
|----------|--------------|------------------------------------------------------------|
| DELETE   | No           | The row no longer exists — RLS cannot be evaluated         |
| INSERT   | Yes          | WALRUS runs a SELECT check to verify the subscriber can see the new row |
| UPDATE   | Yes          | WALRUS runs a SELECT check to verify the subscriber can see the updated row |

For INSERT and UPDATE, WALRUS impersonates the subscriber using their JWT and runs a `SELECT` query against the changed row. Our SELECT policy is:

```sql
CREATE POLICY "Users can view own todos"
  ON public.todos FOR SELECT
  USING (auth.uid() = user_id);
```

If `auth.uid()` returns `null` (no valid JWT on the Realtime WebSocket), the check fails and the event is silently dropped.

**The Supabase JS client initializes auth asynchronously.** In the original code, `.channel().subscribe()` was called immediately after `createClient()`, before the auth session had loaded. This meant the Realtime WebSocket connected with only the anon key — so `auth.uid()` was `null` for all WALRUS checks.

DELETE events still worked because Realtime bypasses RLS for deletes entirely (the row no longer exists in the database, so there's nothing to check against).

### Fix

Two changes were made:

#### 1. Wait for auth before subscribing (`components/todos/TodoList.tsx`)

The Realtime subscription now awaits `supabase.auth.getSession()` before calling `.subscribe()`, and explicitly sets the Realtime auth token:

```typescript
const { data: { session } } = await supabase.auth.getSession()
if (!session) return

supabase.realtime.setAuth(session.access_token)

const channel = supabase.channel('todos-changes').on(...).subscribe()
```

This ensures WALRUS has a valid JWT with the correct `auth.uid()` when evaluating RLS policies.

#### 2. Set REPLICA IDENTITY FULL (`supabase/migrations/20260211122828_set_todos_replica_identity_full.sql`)

```sql
ALTER TABLE public.todos REPLICA IDENTITY FULL;
```

By default, PostgreSQL only includes the primary key in WAL entries for UPDATE/DELETE. With `FULL`, the complete row data is available in the WAL, which ensures WALRUS can properly evaluate RLS policies.

### Key Takeaway

When using Supabase Realtime with RLS, always ensure the Realtime WebSocket connection has the authenticated user's JWT **before** subscribing to channels. The Supabase JS client does not guarantee the auth session is ready synchronously after `createClient()`.
