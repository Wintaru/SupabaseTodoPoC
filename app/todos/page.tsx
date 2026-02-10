import { createClient } from '@/lib/supabase/server'
import TodoList from '@/components/todos/TodoList'
import Link from 'next/link'
import SignOutButton from '@/components/auth/SignOutButton'

export default async function TodosPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  const { data: todos } = await supabase
    .from('todos')
    .select('*')
    .order('created_at', { ascending: false })

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-4xl mx-auto py-8">
        <div className="flex items-center justify-between mb-6">
          <Link
            href="/"
            className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
          >
            ← Back to Home
          </Link>
          <div className="flex items-center gap-4">
            {user?.email && (
              <span className="text-sm text-gray-600 dark:text-gray-400">
                {user.email}
              </span>
            )}
            <SignOutButton />
          </div>
        </div>
        <TodoList initialTodos={todos || []} />
      </div>
    </div>
  )
}
