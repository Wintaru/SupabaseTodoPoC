import Link from 'next/link'

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24 bg-gray-50 dark:bg-gray-900">
      <div className="z-10 max-w-5xl w-full items-center justify-between font-mono text-sm">
        <h1 className="text-4xl font-bold mb-8 text-gray-900 dark:text-gray-100">Supabase + Next.js PoC</h1>
        <p className="mb-4 text-gray-700 dark:text-gray-300">
          This is a proof of concept demonstrating Supabase integration with Next.js.
        </p>
        <div className="flex gap-4 mt-8">
          <Link
            href="/todos"
            className="px-6 py-3 bg-blue-600 dark:bg-blue-500 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors"
          >
            View Todos
          </Link>
        </div>
      </div>
    </main>
  )
}
