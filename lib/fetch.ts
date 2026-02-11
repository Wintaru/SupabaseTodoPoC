/**
 * Wrapper around fetch for API calls that automatically redirects
 * to /login on 401 Unauthorized responses. Use this instead of
 * raw fetch() in client components calling /api/* routes.
 */
export async function apiFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const response = await fetch(input, init)

  if (response.status === 401) {
    window.location.href = '/login'
    // Return a never-resolving promise so callers don't continue processing
    return new Promise(() => {})
  }

  return response
}
