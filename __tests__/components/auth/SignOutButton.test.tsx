import { render, screen, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import userEvent from '@testing-library/user-event'
import SignOutButton from '@/components/auth/SignOutButton'
import { useRouter } from 'next/navigation'

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}))

// Mock Supabase client
const mockSignOut = jest.fn()
jest.mock('@/lib/supabase/client', () => ({
  createClient: jest.fn(() => ({
    auth: {
      signOut: mockSignOut,
    },
  })),
}))

describe('SignOutButton', () => {
  const mockPush = jest.fn()
  const mockRefresh = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
    ;(useRouter as jest.Mock).mockReturnValue({
      push: mockPush,
      refresh: mockRefresh,
    })
  })

  it('should render the sign out button', () => {
    render(<SignOutButton />)
    expect(screen.getByRole('button', { name: /sign out/i })).toBeInTheDocument()
  })

  it('should sign out successfully and redirect to login', async () => {
    const user = userEvent.setup()
    mockSignOut.mockResolvedValueOnce({ error: null })

    render(<SignOutButton />)

    const button = screen.getByRole('button', { name: /sign out/i })
    await user.click(button)

    await waitFor(() => {
      expect(mockSignOut).toHaveBeenCalledTimes(1)
      expect(mockPush).toHaveBeenCalledWith('/login')
      expect(mockRefresh).toHaveBeenCalledTimes(1)
    })
  })

  it('should show loading state while signing out', async () => {
    const user = userEvent.setup()

    // Create a promise we can control
    let resolveSignOut: (value: any) => void
    const signOutPromise = new Promise((resolve) => {
      resolveSignOut = resolve
    })
    mockSignOut.mockReturnValueOnce(signOutPromise)

    render(<SignOutButton />)

    const button = screen.getByRole('button', { name: /sign out/i })
    await user.click(button)

    // Should show loading state
    expect(screen.getByText('Signing out...')).toBeInTheDocument()
    expect(button).toBeDisabled()

    // Resolve the sign out - after success, component redirects so we don't check for normal state
    resolveSignOut!({ error: null })

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/login')
    })
  })

  it('should handle sign out errors', async () => {
    const user = userEvent.setup()
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation()
    const signOutError = { message: 'Sign out failed' }
    mockSignOut.mockResolvedValueOnce({ error: signOutError })

    render(<SignOutButton />)

    const button = screen.getByRole('button', { name: /sign out/i })
    await user.click(button)

    await waitFor(() => {
      expect(consoleErrorSpy).toHaveBeenCalledWith('Sign out error:', signOutError)
      expect(mockPush).not.toHaveBeenCalled()
      expect(button).not.toBeDisabled()
    })

    consoleErrorSpy.mockRestore()
  })

  it('should handle unexpected errors during sign out', async () => {
    const user = userEvent.setup()
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation()
    const unexpectedError = new Error('Network error')
    mockSignOut.mockRejectedValueOnce(unexpectedError)

    render(<SignOutButton />)

    const button = screen.getByRole('button', { name: /sign out/i })
    await user.click(button)

    await waitFor(() => {
      expect(consoleErrorSpy).toHaveBeenCalledWith('Unexpected sign out error:', unexpectedError)
      expect(mockPush).not.toHaveBeenCalled()
      expect(button).not.toBeDisabled()
    })

    consoleErrorSpy.mockRestore()
  })

  it('should prevent multiple simultaneous sign out attempts', async () => {
    const user = userEvent.setup()

    let resolveSignOut: (value: any) => void
    const signOutPromise = new Promise((resolve) => {
      resolveSignOut = resolve
    })
    mockSignOut.mockReturnValueOnce(signOutPromise)

    render(<SignOutButton />)

    const button = screen.getByRole('button', { name: /sign out/i })

    // Click multiple times
    await user.click(button)
    await user.click(button)
    await user.click(button)

    // Should only call sign out once
    expect(mockSignOut).toHaveBeenCalledTimes(1)

    resolveSignOut!({ error: null })
  })
})
