// Mock Supabase server client
const mockExchangeCodeForSession = jest.fn()

jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(() => ({
    auth: {
      exchangeCodeForSession: mockExchangeCodeForSession,
    },
  })),
}))

// Mock NextResponse to avoid testing Next.js framework behavior
jest.mock('next/server', () => ({
  NextResponse: {
    redirect: jest.fn((url: URL) => ({
      status: 307,
      headers: new Map([['location', url.toString()]]),
    })),
  },
}))

describe('Auth Callback Logic', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should call exchangeCodeForSession when code is provided', async () => {
    mockExchangeCodeForSession.mockResolvedValueOnce({ error: null })

    // Dynamically import to get mocked version
    const { GET } = await import('@/app/auth/callback/route')

    const request = new Request(
      'http://localhost:3000/auth/callback?code=test-auth-code'
    ) as any

    await GET(request)

    expect(mockExchangeCodeForSession).toHaveBeenCalledWith('test-auth-code')
  })

  it('should log error when code exchange fails', async () => {
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation()
    mockExchangeCodeForSession.mockResolvedValueOnce({
      error: { message: 'Invalid code' },
    })

    const { GET } = await import('@/app/auth/callback/route')

    const request = new Request(
      'http://localhost:3000/auth/callback?code=invalid-code'
    ) as any

    await GET(request)

    expect(mockExchangeCodeForSession).toHaveBeenCalledWith('invalid-code')
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      'Error exchanging code for session:',
      { message: 'Invalid code' }
    )

    consoleErrorSpy.mockRestore()
  })

  it('should not call exchangeCodeForSession when no code is provided', async () => {
    const { GET } = await import('@/app/auth/callback/route')

    const request = new Request('http://localhost:3000/auth/callback') as any

    await GET(request)

    expect(mockExchangeCodeForSession).not.toHaveBeenCalled()
  })
})
