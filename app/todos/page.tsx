import { createClient } from '@/lib/supabase/server'
import TodoList from '@/components/todos/TodoList'
import Link from 'next/link'

export default async function TodosPage() {
  const supabase = await createClient()
  const { data: todos } = await supabase
    .from('todos')
    .select('*')
    .order('created_at', { ascending: false })

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-4xl mx-auto py-8">
        <Link
          href="/"
          className="inline-block mb-4 text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
        >
          ← Back to Home
        </Link>
        <TodoList initialTodos={todos || []} />
      </div>
    </div>
  )
}
