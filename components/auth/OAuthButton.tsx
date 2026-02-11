'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Provider } from '@supabase/supabase-js'

interface OAuthButtonProps {
  provider: Provider
  label: string
  icon?: React.ReactNode
  scopes?: string
}

export default function OAuthButton({ provider, label, icon, scopes }: OAuthButtonProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleOAuthLogin = async () => {
    if (isLoading) return

    setIsLoading(true)
    setError(null)

    try {
      const supabase = createClient()
      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
          ...(scopes && { scopes }),
        },
      })

      if (oauthError) {
        setError(oauthError.message)
        setIsLoading(false)
      }
      // If no error, the browser will redirect to the provider's login page.
      // We intentionally leave isLoading as true since the page is navigating away.
    } catch {
      setError('An unexpected error occurred')
      setIsLoading(false)
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={handleOAuthLogin}
        disabled={isLoading}
        className="w-full flex items-center justify-center gap-2 py-2 px-4 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {icon && <span className="w-5 h-5">{icon}</span>}
        {isLoading ? 'Redirecting...' : label}
      </button>
      {error && (
        <p className="mt-2 text-sm text-red-600 dark:text-red-400">{error}</p>
      )}
    </div>
  )
}
