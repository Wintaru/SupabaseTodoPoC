// Mock @supabase/ssr — the callback route creates an inline server client
const mockExchangeCodeForSession = jest.fn()

jest.mock('@supabase/ssr', () => ({
  createServerClient: jest.fn(() => ({
    auth: {
      exchangeCodeForSession: mockExchangeCodeForSession,
    },
  })),
}))

// Override the global NextResponse mock to include redirect + cookies
jest.mock('next/server', () => ({
  NextResponse: {
    json: (data: unknown, init?: { status?: number }) => ({
      json: async () => data,
      status: init?.status || 200,
      headers: new Map(),
    }),
    redirect: (url: URL) => {
      const headers = new Headers()
      headers.set('location', url.toString())
      return {
        status: 307,
        headers,
        cookies: {
          set: jest.fn(),
        },
      }
    },
  },
}))

/** Create a minimal NextRequest-like object with cookies support */
function createMockRequest(url: string) {
  return {
    url,
    cookies: {
      getAll: () => [],
    },
  } as any
}

describe('Auth Callback Route', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should exchange code for session and redirect to /todos on success', async () => {
    mockExchangeCodeForSession.mockResolvedValueOnce({ error: null })

    const { GET } = await import('@/app/auth/callback/route')
    const request = createMockRequest(
      'http://localhost:3000/auth/callback?code=test-auth-code'
    )

    const response = await GET(request)

    expect(mockExchangeCodeForSession).toHaveBeenCalledWith('test-auth-code')
    expect(response.status).toBe(307)
    expect(response.headers.get('location')).toBe(
      'http://localhost:3000/todos'
    )
  })

  it('should redirect to login with error when code exchange fails', async () => {
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation()
    mockExchangeCodeForSession.mockResolvedValueOnce({
      error: { message: 'Invalid code' },
    })

    const { GET } = await import('@/app/auth/callback/route')
    const request = createMockRequest(
      'http://localhost:3000/auth/callback?code=invalid-code'
    )

    const response = await GET(request)

    expect(mockExchangeCodeForSession).toHaveBeenCalledWith('invalid-code')
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      'Error exchanging code for session:',
      { message: 'Invalid code' }
    )
    expect(response.headers.get('location')).toBe(
      'http://localhost:3000/login?error=confirmation_failed'
    )

    consoleErrorSpy.mockRestore()
  })

  it('should redirect to login when no code is provided', async () => {
    const { GET } = await import('@/app/auth/callback/route')
    const request = createMockRequest('http://localhost:3000/auth/callback')

    const response = await GET(request)

    expect(mockExchangeCodeForSession).not.toHaveBeenCalled()
    expect(response.headers.get('location')).toBe(
      'http://localhost:3000/login?error=confirmation_failed'
    )
  })

  it('should redirect OAuth errors to login with error params', async () => {
    const { GET } = await import('@/app/auth/callback/route')
    const request = createMockRequest(
      'http://localhost:3000/auth/callback?error=access_denied&error_description=User+denied+consent'
    )

    const response = await GET(request)

    expect(mockExchangeCodeForSession).not.toHaveBeenCalled()
    const location = response.headers.get('location')!
    const url = new URL(location)
    expect(url.pathname).toBe('/login')
    expect(url.searchParams.get('error')).toBe('access_denied')
    expect(url.searchParams.get('error_description')).toBe(
      'User denied consent'
    )
  })

  it('should redirect OAuth error without description', async () => {
    const { GET } = await import('@/app/auth/callback/route')
    const request = createMockRequest(
      'http://localhost:3000/auth/callback?error=server_error'
    )

    const response = await GET(request)

    const location = response.headers.get('location')!
    const url = new URL(location)
    expect(url.pathname).toBe('/login')
    expect(url.searchParams.get('error')).toBe('server_error')
    expect(url.searchParams.has('error_description')).toBe(false)
  })
})
