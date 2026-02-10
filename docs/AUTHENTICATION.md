# Authentication Guide

This guide explains how authentication is implemented in this application using Supabase Auth with Row Level Security (RLS).

## Overview

This app uses **Supabase Auth** with:
- **Email/password authentication** - Users sign up and log in with email and password
- **Email confirmation** - Users must confirm their email address before logging in
- **Row Level Security (RLS)** - Database-level security ensuring users can only access their own data
- **Protected routes** - Unauthenticated users are automatically redirected to `/login`

## Architecture

### Authentication Flow

```
1. User visits app → Middleware checks auth → Redirects to /login if not authenticated
2. User signs up → Email sent to Mailpit → User confirms email → Can now log in
3. User logs in → Session cookie set → Redirected to /todos
4. User creates todo → API checks auth → Adds user_id → RLS policies enforce ownership
5. User signs out → Session cleared → Redirected to /login
```

### Key Components

#### 1. Supabase Client Setup

**Server-side client** ([lib/supabase/server.ts](../lib/supabase/server.ts)):
- Used in Server Components and API routes
- Handles cookie-based session management
- Type-safe with generated database types

**Browser client** ([lib/supabase/client.ts](../lib/supabase/client.ts)):
- Used in Client Components
- Shares session via cookies with server

#### 2. Middleware Protection

**File:** [lib/supabase/proxy.ts](../lib/supabase/proxy.ts)

Redirects unauthenticated users to `/login`:

```typescript
if (
  !user &&
  !request.nextUrl.pathname.startsWith('/login') &&
  !request.nextUrl.pathname.startsWith('/signup') &&
  !request.nextUrl.pathname.startsWith('/auth')
) {
  const url = request.nextUrl.clone()
  url.pathname = '/login'
  return NextResponse.redirect(url)
}
```

**Allowed paths without auth:**
- `/login` - Login page
- `/signup` - Signup page
- `/auth/*` - Supabase auth callbacks

#### 3. Auth Pages

**Login Page** ([app/login/page.tsx](../app/login/page.tsx)):
- Email/password form
- Uses `supabase.auth.signInWithPassword()`
- Redirects to `/todos` on success
- Dark mode support

**Signup Page** ([app/signup/page.tsx](../app/signup/page.tsx)):
- Email/password signup with confirmation field
- Password validation (minimum 6 characters)
- Uses `supabase.auth.signUp()`
- Shows email confirmation message
- Redirects to `/login` after 3 seconds

**Sign Out** ([components/auth/SignOutButton.tsx](../components/auth/SignOutButton.tsx)):
- Client component button
- Calls `supabase.auth.signOut()`
- Redirects to `/login`

#### 4. API Route Protection

All mutation endpoints (POST, PATCH, DELETE) check authentication:

```typescript
// Check authentication
const { data: { user }, error: authError } = await supabase.auth.getUser()
if (authError || !user) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
}

// Include user_id in data
const todoData: TodoInsert = {
  title: body.title.trim(),
  user_id: user.id,  // ← Automatically set to authenticated user
  // ...
}
```

**Protected endpoints:**
- `POST /api/todos` - Create todo (sets user_id automatically)
- `PATCH /api/todos/[id]` - Update todo (RLS ensures ownership)
- `DELETE /api/todos/[id]` - Delete todo (RLS ensures ownership)

**Note:** GET requests don't need explicit auth checks because RLS policies automatically filter results by `user_id`.

## Database Schema

### User-Todo Relationship

```sql
ALTER TABLE public.todos
  ADD COLUMN user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;

CREATE INDEX todos_user_id_idx ON public.todos(user_id);
```

**Key points:**
- `user_id` references `auth.users(id)` - Supabase's built-in auth table
- `ON DELETE CASCADE` - If user is deleted, their todos are deleted too
- Index on `user_id` for query performance

### Row Level Security Policies

**Migration:** [supabase/migrations/20260210185232_add_user_auth.sql](../supabase/migrations/20260210185232_add_user_auth.sql)

```sql
-- Users can view only their own todos
CREATE POLICY "Users can view own todos"
  ON public.todos FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert only their own todos
CREATE POLICY "Users can insert own todos"
  ON public.todos FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update only their own todos
CREATE POLICY "Users can update own todos"
  ON public.todos FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Users can delete only their own todos
CREATE POLICY "Users can delete own todos"
  ON public.todos FOR DELETE
  USING (auth.uid() = user_id);
```

**How RLS works:**
- `auth.uid()` returns the current authenticated user's ID
- Policies run automatically on every database query
- Even if you bypass the API, the database enforces the policies
- This is **database-level security**, not just application-level

## Email Confirmation

### Local Development Setup

Email confirmation is enabled in local development using **Mailpit** (local email testing service).

**Configuration files:**

1. **supabase/config.toml** - Enable email confirmations:
   ```toml
   [auth.email]
   enable_confirmations = true
   ```

2. **supabase/.env.local** - Override auto-confirm (REQUIRED):
   ```bash
   # Disable auto-confirmation so users must confirm email addresses
   GOTRUE_MAILER_AUTOCONFIRM=false
   ```

   **Why this is needed:** Supabase local development defaults to `GOTRUE_MAILER_AUTOCONFIRM=true` for convenience. This environment variable override is **essential** to enable the email confirmation flow.

### Viewing Confirmation Emails

1. **Start Supabase** with email confirmations enabled
2. **Sign up** for an account at http://localhost:3000/signup
3. **Open Mailpit** at http://127.0.0.1:54324
4. **Click the confirmation link** in the email
5. **Log in** at http://localhost:3000/login

**Mailpit features:**
- Web interface to view all emails sent by the app
- No real emails are sent (perfect for testing)
- Automatically catches all outbound emails from Supabase

### Production Setup

For production, configure SMTP in `supabase/config.toml`:

```toml
[auth.email.smtp]
enabled = true
host = "smtp.sendgrid.net"
port = 587
user = "apikey"
pass = "env(SENDGRID_API_KEY)"
admin_email = "admin@email.com"
sender_name = "Your App Name"
```

**Popular SMTP providers:**
- SendGrid
- Mailgun
- AWS SES
- Postmark

## Testing Authentication

### Manual Testing

1. **Sign up:**
   ```
   http://localhost:3000/signup
   Email: test@example.com
   Password: password123
   ```

2. **Confirm email:**
   - Open http://127.0.0.1:54324
   - Click confirmation link

3. **Log in:**
   ```
   http://localhost:3000/login
   Email: test@example.com
   Password: password123
   ```

4. **Create a todo:**
   - Should automatically be associated with your user

5. **Sign out and sign in as different user:**
   - Should NOT see the first user's todos

### Automated Tests

Tests mock `supabase.auth.getUser()` to return a test user:

```typescript
mockSupabase = {
  auth: {
    getUser: jest.fn(() => ({
      data: { user: { id: 'test-user-id-123' } },
      error: null,
    })),
  },
  // ...
}
```

**Test coverage:**
- ✅ Creating todos includes `user_id`
- ✅ Unauthorized requests return 401
- ✅ All mutations require authentication

## Troubleshooting

### Users are auto-confirmed despite settings

**Problem:** Users can log in immediately without confirming email.

**Solution:** Check if `GOTRUE_MAILER_AUTOCONFIRM=false` is set in `supabase/.env.local`:

```bash
# Verify environment variable
docker exec supabase_auth_Soupabase env | grep GOTRUE_MAILER_AUTOCONFIRM

# Should output: GOTRUE_MAILER_AUTOCONFIRM=false
```

If it shows `true`, restart Supabase after creating the `.env.local` file:

```bash
supabase stop
supabase start
```

### No emails appearing in Mailpit

**Check these:**

1. **Mailpit is running:**
   ```bash
   curl http://127.0.0.1:54324
   ```

2. **Email confirmations are enabled** in `supabase/config.toml`:
   ```toml
   enable_confirmations = true
   ```

3. **Auto-confirm is disabled:**
   ```bash
   docker exec supabase_auth_Soupabase env | grep GOTRUE_MAILER_AUTOCONFIRM
   ```

4. **Check Supabase logs:**
   ```bash
   docker logs supabase_auth_Soupabase 2>&1 | tail -50
   ```

### Cannot log in after signup

**With email confirmation enabled**, users must:
1. Sign up
2. Click the confirmation link in Mailpit
3. **Then** they can log in

If you try to log in before confirming, you'll get an error.

### Lost password - need to delete user

Delete user from database to re-register:

```bash
psql postgres://postgres:postgres@127.0.0.1:54322/postgres \
  -c "DELETE FROM auth.users WHERE email = 'user@example.com';"
```

Or use Supabase Studio:
1. Go to http://127.0.0.1:54323
2. Authentication → Users
3. Delete the user

## Security Best Practices

### ✅ DO

- **Always use RLS policies** - Database-level security is critical
- **Check auth in API routes** - Add auth checks to all mutation endpoints
- **Use `user_id` from `auth.getUser()`** - Never trust client-provided user IDs
- **Validate input** - Check and sanitize all user input
- **Use HTTPS in production** - Encrypt traffic
- **Rotate JWT secrets** - Change secrets periodically

### ❌ DON'T

- **Don't bypass RLS** - Never use the `service_role` key in client code
- **Don't trust client data** - Always validate on the server
- **Don't expose secret keys** - Keep `.env.local` out of git
- **Don't disable RLS** - Even temporarily
- **Don't store passwords** - Let Supabase handle it

## Supabase Auth Features NOT Yet Implemented

This implementation uses basic email/password auth. Supabase also supports:

- **OAuth providers** (Google, GitHub, GitLab, etc.)
- **Magic links** (passwordless email login)
- **Phone authentication** (SMS OTP)
- **Multi-factor authentication (MFA)**
- **SSO / SAML**
- **Anonymous sign-ins**

See [FUTURE_ENHANCEMENTS.md](../FUTURE_ENHANCEMENTS.md) for implementation guides.

## Additional Resources

- [Supabase Auth Documentation](https://supabase.com/docs/guides/auth)
- [Row Level Security Guide](https://supabase.com/docs/guides/database/postgres/row-level-security)
- [Auth Helpers for Next.js](https://supabase.com/docs/guides/auth/server-side/nextjs)
- [Email Templates](https://supabase.com/docs/guides/auth/auth-email-templates)

## Summary

This authentication system provides:
- ✅ **Secure** - Database-level RLS policies
- ✅ **Type-safe** - Generated TypeScript types
- ✅ **User-friendly** - Clear signup/login flow
- ✅ **Testable** - Mocked auth in tests
- ✅ **Production-ready** - Just add SMTP config

All user data is isolated by `user_id` and enforced at the database level, ensuring security even if the application layer is compromised.
