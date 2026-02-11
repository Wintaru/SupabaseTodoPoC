import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)

  // Handle OAuth provider errors (e.g., user denied consent, provider misconfigured)
  const errorParam = requestUrl.searchParams.get('error')
  if (errorParam) {
    const errorUrl = new URL('/login', requestUrl.origin)
    errorUrl.searchParams.set('error', errorParam)
    const errorDescription = requestUrl.searchParams.get('error_description')
    if (errorDescription) {
      errorUrl.searchParams.set('error_description', errorDescription)
    }
    return NextResponse.redirect(errorUrl)
  }

  const code = requestUrl.searchParams.get('code')

  if (code) {
    // Create the redirect response FIRST, then set cookies directly on it.
    // This ensures auth cookies are included in the redirect (same pattern as the middleware).
    const redirectResponse = NextResponse.redirect(new URL('/todos', requestUrl.origin))

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll()
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              redirectResponse.cookies.set(name, value, options)
            })
          },
        },
      }
    )

    // Exchange the code for a session (works for both email confirmation and OAuth PKCE)
    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      return redirectResponse
    }

    console.error('Error exchanging code for session:', error)
  }

  // Redirect to login on failure or missing code
  return NextResponse.redirect(new URL('/login?error=confirmation_failed', requestUrl.origin))
}
