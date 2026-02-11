# Soupabase - Supabase + Next.js Proof of Concept

A full-stack Todo app demonstrating Supabase integration with Next.js: database migrations, type-safe operations, real-time subscriptions, authentication, and more.

![Demo](https://github.com/user-attachments/assets/be23fde7-f332-429e-9a75-34d2f11515cb)


## Prerequisites

You need three things installed: **Node.js**, **Docker**, and the **Supabase CLI**.

### Mac

```bash
# Install Node.js (if you don't have it)
brew install node

# Install Docker Desktop
brew install --cask docker

# Install Supabase CLI
brew install supabase/tap/supabase
```

Open **Docker Desktop** once after installing to finish setup, then make sure it's running.

### Linux

```bash
# Install Node.js (using NodeSource - Ubuntu/Debian)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install Docker
sudo apt-get update
sudo apt-get install -y docker.io docker-compose-v2
sudo systemctl start docker
sudo systemctl enable docker
sudo usermod -aG docker $USER
# Log out and back in for the group change to take effect

# Install Supabase CLI
brew install supabase/tap/supabase
# Or without Homebrew:
# curl -fsSL https://raw.githubusercontent.com/supabase/cli/main/install.sh | sh
```

### Windows

```powershell
# Install Node.js - download from https://nodejs.org/ (LTS version)
# Or with winget:
winget install OpenJS.NodeJS.LTS

# Install Docker Desktop - download from https://docs.docker.com/desktop/install/windows-install/
# Or with winget:
winget install Docker.DockerDesktop

# Install Supabase CLI with npm (easiest on Windows)
npm install -g supabase
```

Open **Docker Desktop** once after installing to finish setup, then make sure it's running.

> **Windows note:** Use PowerShell or Git Bash for all commands below. If using Git Bash, the commands are the same as Mac/Linux.

## Getting Started

```bash
# 1. Clone and install dependencies
git clone <your-repo-url>
cd Soupabase
npm install

# 2. Start Supabase (Docker must be running)
supabase start
```

The `supabase start` command will print credentials including an **API URL** and **publishable key**. You need these for the next step.

```bash
# 3. Create your .env.local file
```

Create a file called `.env.local` in the project root with these two lines:

```
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<publishable key from supabase start output>
```

You can re-check the key anytime with `supabase status`.

```bash
# 4. Start the dev server
npm run dev
```

Open **http://localhost:3000** - you're up and running.

## Useful Links (Local)

| Service | URL |
|---------|-----|
| App | http://localhost:3000 |
| Supabase Studio (DB admin) | http://127.0.0.1:54323 |
| Mailpit (test emails) | http://127.0.0.1:54324 |
| Supabase API | http://127.0.0.1:54321 |

## Stopping / Restarting

```bash
# Stop Supabase (preserves data)
supabase stop

# Stop and delete all local data
supabase stop --no-backup

# Restart everything
supabase start
npm run dev
```

## Common Commands

```bash
# Run tests
npm test

# Build for production
npm run build

# Regenerate TypeScript types after schema changes
supabase gen types typescript --local > lib/types/database.types.ts

# Create a new database migration
supabase migration new my_feature_name

# Apply migrations (preserves data)
supabase migration up

# Reset database (wipes data, re-applies all migrations)
supabase db reset

# Check Supabase status and credentials
supabase status
```

## Project Structure

```
Soupabase/
├── app/                        # Next.js App Router
│   ├── api/                    # API route handlers
│   ├── login/, signup/         # Auth pages
│   └── todos/                  # Todo list page
├── components/                 # React components
│   ├── auth/                   # Auth components (SignOut, OAuth buttons)
│   ├── todos/                  # Todo-specific components
│   └── ui/                     # Shared UI (modals, etc.)
├── lib/
│   ├── accessors/              # Database query functions
│   ├── supabase/               # Supabase client setup
│   └── types/                  # Auto-generated DB types
├── supabase/
│   ├── migrations/             # SQL migration files
│   └── config.toml             # Supabase config
├── __tests__/                  # Test files
└── docs/                       # Detailed guides
```

## Tech Stack

- **Next.js 15** (App Router) + **React 18** + **TypeScript**
- **Supabase** (PostgreSQL, Auth, Realtime)
- **Tailwind CSS** (with dark mode support)
- **Jest** + **React Testing Library**

## Microsoft SSO (Optional)

To enable "Sign in with Microsoft":

1. **Register an Azure App:**
   - Go to [Azure Portal](https://portal.azure.com) > Microsoft Entra ID > App registrations > New registration
   - Name: "Soupabase Local Dev" (or any name)
   - Supported account types: Choose based on your needs (multi-tenant for any Microsoft account)
   - Redirect URI: Web — `http://localhost:54321/auth/v1/callback`
   - Click Register

2. **Add API permissions:**
   - Go to **API permissions** > **Add a permission** > **Microsoft Graph** > **Delegated permissions**
   - Add: `email`, `openid`, `profile`, and `User.Read`
   - Click **Grant admin consent** for your directory

3. **Add optional claims** (required for Azure to include email in the token):
   - Go to **Token configuration** > **Add optional claim**
   - Select **ID** token type
   - Check **`email`** and click **Add**
   - If prompted to add the Microsoft Graph `email` permission, confirm it

4. **Get credentials:**
   - Copy the **Application (client) ID** from the Overview page
   - Go to Certificates & secrets > New client secret > copy the **Value** (not the Secret ID)

5. **Configure locally:**
   Add to `supabase/.env.local`:
   ```bash
   SUPABASE_AUTH_EXTERNAL_AZURE_CLIENT_ID=<your-client-id>
   SUPABASE_AUTH_EXTERNAL_AZURE_SECRET=<your-client-secret>
   ```

6. **Restart Supabase:**
   ```bash
   supabase stop && supabase start
   ```

The "Sign in with Microsoft" button will appear on the login and signup pages.

### Troubleshooting Microsoft SSO

**"Bad request" or 400 error when clicking the button:**
- Clear browser cookies for **both** `127.0.0.1` **and** `localhost` (DevTools > Application > Cookies). Stale auth cookies from previous sessions can block the OAuth flow.
- If clearing cookies doesn't help, try an **incognito/private window**.

**"Error getting user email from external provider":**
- You're missing the optional email claim in Azure. Complete step 3 above (Token configuration > Add optional claim > ID token > email).
- Verify you granted admin consent for the API permissions in step 2.

**Redirect URI error in Azure ("Must start with HTTPS or http://localhost"):**
- Azure requires `http://localhost` (not `http://127.0.0.1`) for non-HTTPS redirect URIs. Use `http://localhost:54321/auth/v1/callback` exactly as shown in step 1.

**Credentials not working after restart:**
- Azure credentials go in `supabase/.env.local` (the Supabase directory), **not** the root `.env.local`. The root file is for Next.js; the Supabase directory file is read by the Docker auth service.
- Verify with: `docker exec supabase_auth_<project> printenv | grep -i azure`

**Signed in but redirected back to login instead of the app:**
- This usually means the auth callback route isn't setting cookies correctly on the redirect response. Ensure `app/auth/callback/route.ts` creates the `NextResponse.redirect` first, then builds the Supabase client with cookie handlers that write directly to that response object.

## Further Reading

- [docs/SETUP.md](docs/SETUP.md) - Detailed setup guide
- [docs/MIGRATIONS.md](docs/MIGRATIONS.md) - Migration patterns
- [docs/NEW_PROJECT_GUIDE.md](docs/NEW_PROJECT_GUIDE.md) - Adding new features

## License

MIT
