import { render, screen, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import userEvent from '@testing-library/user-event'
import OAuthButton from '@/components/auth/OAuthButton'

// Mock Supabase client
const mockSignInWithOAuth = jest.fn()
jest.mock('@/lib/supabase/client', () => ({
  createClient: jest.fn(() => ({
    auth: {
      signInWithOAuth: mockSignInWithOAuth,
    },
  })),
}))

describe('OAuthButton', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should render the button with the provided label', () => {
    render(<OAuthButton provider="azure" label="Sign in with Microsoft" />)
    expect(screen.getByRole('button', { name: /sign in with microsoft/i })).toBeInTheDocument()
  })

  it('should render with an icon when provided', () => {
    render(
      <OAuthButton
        provider="azure"
        label="Sign in with Microsoft"
        icon={<svg data-testid="test-icon" />}
      />
    )
    expect(screen.getByTestId('test-icon')).toBeInTheDocument()
  })

  it('should call signInWithOAuth with the correct provider and redirectTo', async () => {
    const user = userEvent.setup()
    mockSignInWithOAuth.mockResolvedValueOnce({ error: null })

    render(<OAuthButton provider="azure" label="Sign in with Microsoft" />)

    await user.click(screen.getByRole('button'))

    expect(mockSignInWithOAuth).toHaveBeenCalledWith({
      provider: 'azure',
      options: {
        redirectTo: expect.stringContaining('/auth/callback'),
      },
    })
  })

  it('should show loading state while redirecting', async () => {
    const user = userEvent.setup()
    mockSignInWithOAuth.mockResolvedValueOnce({ error: null })

    render(<OAuthButton provider="azure" label="Sign in with Microsoft" />)

    await user.click(screen.getByRole('button'))

    // After a successful call, the button stays in loading state
    // because the browser is navigating away
    await waitFor(() => {
      expect(screen.getByText('Redirecting...')).toBeInTheDocument()
    })
  })

  it('should disable the button while loading', async () => {
    const user = userEvent.setup()

    let resolveOAuth: (value: unknown) => void
    const oauthPromise = new Promise((resolve) => {
      resolveOAuth = resolve
    })
    mockSignInWithOAuth.mockReturnValueOnce(oauthPromise)

    render(<OAuthButton provider="azure" label="Sign in with Microsoft" />)

    const button = screen.getByRole('button')
    await user.click(button)

    expect(button).toBeDisabled()
    expect(screen.getByText('Redirecting...')).toBeInTheDocument()

    resolveOAuth!({ error: null })
  })

  it('should display an error message when OAuth fails', async () => {
    const user = userEvent.setup()
    mockSignInWithOAuth.mockResolvedValueOnce({
      error: { message: 'Provider not enabled' },
    })

    render(<OAuthButton provider="azure" label="Sign in with Microsoft" />)

    await user.click(screen.getByRole('button'))

    await waitFor(() => {
      expect(screen.getByText('Provider not enabled')).toBeInTheDocument()
    })

    // Button should be re-enabled after error
    expect(screen.getByRole('button')).not.toBeDisabled()
  })

  it('should handle unexpected errors', async () => {
    const user = userEvent.setup()
    mockSignInWithOAuth.mockRejectedValueOnce(new Error('Network error'))

    render(<OAuthButton provider="azure" label="Sign in with Microsoft" />)

    await user.click(screen.getByRole('button'))

    await waitFor(() => {
      expect(screen.getByText('An unexpected error occurred')).toBeInTheDocument()
    })

    // Button should be re-enabled after error
    expect(screen.getByRole('button')).not.toBeDisabled()
  })

  it('should prevent multiple simultaneous clicks', async () => {
    const user = userEvent.setup()

    let resolveOAuth: (value: unknown) => void
    const oauthPromise = new Promise((resolve) => {
      resolveOAuth = resolve
    })
    mockSignInWithOAuth.mockReturnValueOnce(oauthPromise)

    render(<OAuthButton provider="azure" label="Sign in with Microsoft" />)

    const button = screen.getByRole('button')

    // Click multiple times
    await user.click(button)
    await user.click(button)
    await user.click(button)

    // Should only call signInWithOAuth once
    expect(mockSignInWithOAuth).toHaveBeenCalledTimes(1)

    resolveOAuth!({ error: null })
  })
})
