'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { apiFetch } from '@/lib/fetch'
import type { RealtimeChannel } from '@supabase/supabase-js'
import type { Todo } from '@/lib/types'
import AttachmentSection from './AttachmentSection'

interface TodoListProps {
  initialTodos: Todo[]
}

export default function TodoList({ initialTodos }: TodoListProps) {
  const [todos, setTodos] = useState<Todo[]>(initialTodos)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [priority, setPriority] = useState<'low' | 'medium' | 'high'>('medium')
  const [isLoading, setIsLoading] = useState(false)
  const channelRef = useRef<RealtimeChannel | null>(null)

  // Set up real-time subscription for todos
  // IMPORTANT: We must wait for the auth session to be ready before subscribing.
  // The Supabase JS client initializes auth asynchronously — if we subscribe
  // before the JWT is available, the Realtime WebSocket connects with only the
  // anon key, causing WALRUS's RLS SELECT check to fail (auth.uid() = null).
  // DELETE events still work because Realtime bypasses RLS for deletes.
  useEffect(() => {
    const supabase = createClient()
    let cancelled = false

    const setupSubscription = async () => {
      // Wait for the auth session to be fully initialized
      const { data: { session } } = await supabase.auth.getSession()

      if (cancelled) return

      if (!session) {
        console.warn('No auth session — skipping Realtime subscription')
        return
      }

      // Explicitly set the Realtime auth token so WALRUS can evaluate
      // RLS policies with the correct user identity
      supabase.realtime.setAuth(session.access_token)

      const channel = supabase
        .channel('todos-changes')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'todos',
          },
          (payload) => {
            // Only add if not already in list (prevents duplicate from optimistic update)
            setTodos((current) => {
              const exists = current.some(todo => todo.id === payload.new.id)
              if (exists) return current
              return [payload.new as Todo, ...current]
            })
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'todos',
          },
          (payload) => {
            setTodos((current) =>
              current.map((todo) =>
                todo.id === payload.new.id ? (payload.new as Todo) : todo
              )
            )
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'DELETE',
            schema: 'public',
            table: 'todos',
          },
          (payload) => {
            setTodos((current) =>
              current.filter((todo) => todo.id !== payload.old.id)
            )
          }
        )
        .subscribe()

      channelRef.current = channel
    }

    setupSubscription()

    return () => {
      cancelled = true
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
      }
    }
  }, []) // Empty deps - subscribe once on mount

  const addTodo = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) return

    setIsLoading(true)
    try {
      const response = await apiFetch('/api/todos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, description, priority }),
      })

      if (response.ok) {
        const newTodo = await response.json()
        setTodos([newTodo, ...todos])
        setTitle('')
        setDescription('')
        setPriority('medium')
      }
    } catch (error) {
      console.error('Error adding todo:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const toggleTodo = async (id: string, is_completed: boolean) => {
    try {
      const response = await apiFetch(`/api/todos/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_completed: !is_completed }),
      })

      if (response.ok) {
        const updatedTodo = await response.json()
        setTodos(todos.map(todo => todo.id === id ? updatedTodo : todo))
      }
    } catch (error) {
      console.error('Error toggling todo:', error)
    }
  }

  const deleteTodo = async (id: string) => {
    if (!confirm('Are you sure you want to delete this todo?')) return

    try {
      const response = await apiFetch(`/api/todos/${id}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        setTodos(todos.filter(todo => todo.id !== id))
      }
    } catch (error) {
      console.error('Error deleting todo:', error)
    }
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-8">Todo List</h1>

      {/* Add Todo Form */}
      <form onSubmit={addTodo} className="mb-8 p-6 bg-white dark:bg-gray-800 rounded-lg shadow-md">
        <div className="mb-4">
          <label htmlFor="title" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Title *
          </label>
          <input
            type="text"
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Enter todo title"
            required
          />
        </div>
        <div className="mb-4">
          <label htmlFor="description" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Description
          </label>
          <textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Enter todo description"
            rows={3}
          />
        </div>
        <div className="mb-4">
          <label htmlFor="priority" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Priority
          </label>
          <select
            id="priority"
            value={priority}
            onChange={(e) => setPriority(e.target.value as 'low' | 'medium' | 'high')}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>
        </div>
        <button
          type="submit"
          disabled={isLoading}
          className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 transition-colors"
        >
          {isLoading ? 'Adding...' : 'Add Todo'}
        </button>
      </form>

      {/* Todo List */}
      <div className="space-y-4">
        {todos.length === 0 ? (
          <p className="text-gray-500 dark:text-gray-400 text-center py-8">No todos yet. Add one above!</p>
        ) : (
          todos.map((todo) => (
            <div
              key={todo.id}
              className="p-4 bg-white dark:bg-gray-800 rounded-lg shadow-md flex items-start gap-4"
            >
              <input
                type="checkbox"
                checked={todo.is_completed ?? false}
                onChange={() => toggleTodo(todo.id, todo.is_completed ?? false)}
                className="mt-1 h-5 w-5 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h3 className={`text-lg font-medium ${todo.is_completed ? 'line-through text-gray-500 dark:text-gray-400' : 'text-gray-900 dark:text-gray-100'}`}>
                    {todo.title}
                  </h3>
                  <span className={`px-2 py-0.5 text-xs font-medium rounded ${
                    todo.priority === 'high' ? 'bg-red-100 text-red-800' :
                    todo.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-green-100 text-green-800'
                  }`}>
                    {todo.priority}
                  </span>
                </div>
                {todo.description && (
                  <p className={`text-sm mt-1 ${todo.is_completed ? 'text-gray-400 dark:text-gray-500' : 'text-gray-600 dark:text-gray-300'}`}>
                    {todo.description}
                  </p>
                )}
                <AttachmentSection todoId={todo.id} />
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
                  Created: {new Date(todo.created_at).toLocaleString()}
                </p>
              </div>
              <button
                onClick={() => deleteTodo(todo.id)}
                className="px-3 py-1 text-sm text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
              >
                Delete
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
