'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { apiFetch } from '@/lib/fetch'
import { useConfirm } from '@/components/ui/ConfirmDialog'
import type { RealtimeChannel } from '@supabase/supabase-js'
import type { Todo, Category, TodoWithCategories } from '@/lib/types'
import AttachmentSection from './AttachmentSection'
import CategoryBadge from '@/components/categories/CategoryBadge'
import CategoryFilter from '@/components/categories/CategoryFilter'
import CategoryPicker from '@/components/categories/CategoryPicker'
import CategoryManager from '@/components/categories/CategoryManager'

interface TodoListProps {
  initialTodos: TodoWithCategories[]
  initialCategories: Category[]
}

export default function TodoList({ initialTodos, initialCategories }: TodoListProps) {
  const [todos, setTodos] = useState<TodoWithCategories[]>(initialTodos)
  const [categories, setCategories] = useState<Category[]>(initialCategories)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [priority, setPriority] = useState<'low' | 'medium' | 'high'>('medium')
  const [dueDate, setDueDate] = useState('')
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([])
  const [filterCategoryId, setFilterCategoryId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<TodoWithCategories[] | null>(null)
  const [isSearching, setIsSearching] = useState(false)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const channelRef = useRef<RealtimeChannel | null>(null)
  const categoriesChannelRef = useRef<RealtimeChannel | null>(null)
  const todoCategoriesChannelRef = useRef<RealtimeChannel | null>(null)
  const confirm = useConfirm()

  // Set up real-time subscriptions
  useEffect(() => {
    const supabase = createClient()
    let cancelled = false

    const setupSubscription = async () => {
      const { data: { session } } = await supabase.auth.getSession()

      if (cancelled) return

      if (!session) {
        console.warn('No auth session — skipping Realtime subscription')
        return
      }

      setCurrentUserId(session.user.id)
      supabase.realtime.setAuth(session.access_token)

      // Todos channel
      const channel = supabase
        .channel('todos-changes')
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'todos' },
          (payload) => {
            setTodos((current) => {
              const exists = current.some(todo => todo.id === payload.new.id)
              if (exists) return current
              const newTodo = { ...payload.new as Todo, todo_categories: [] } as TodoWithCategories
              return [newTodo, ...current]
            })
          }
        )
        .on(
          'postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'todos' },
          (payload) => {
            setTodos((current) =>
              current.map((todo) =>
                todo.id === payload.new.id
                  ? { ...payload.new, todo_categories: todo.todo_categories } as TodoWithCategories
                  : todo
              )
            )
          }
        )
        .on(
          'postgres_changes',
          { event: 'DELETE', schema: 'public', table: 'todos' },
          (payload) => {
            setTodos((current) =>
              current.filter((todo) => todo.id !== payload.old.id)
            )
          }
        )
        .subscribe()

      channelRef.current = channel

      // Categories channel
      const categoriesChannel = supabase
        .channel('categories-changes')
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'categories' },
          (payload) => {
            setCategories((current) => {
              const exists = current.some(c => c.id === payload.new.id)
              if (exists) return current
              return [...current, payload.new as Category].sort((a, b) => a.name.localeCompare(b.name))
            })
          }
        )
        .on(
          'postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'categories' },
          (payload) => {
            setCategories((current) =>
              current.map((c) =>
                c.id === payload.new.id ? (payload.new as Category) : c
              ).sort((a, b) => a.name.localeCompare(b.name))
            )
          }
        )
        .on(
          'postgres_changes',
          { event: 'DELETE', schema: 'public', table: 'categories' },
          (payload) => {
            setCategories((current) =>
              current.filter((c) => c.id !== payload.old.id)
            )
            // Also remove from todos' category lists
            setTodos((current) =>
              current.map((todo) => ({
                ...todo,
                todo_categories: todo.todo_categories.filter(
                  (tc) => tc.category_id !== payload.old.id
                ),
              }))
            )
            // Clear filter if the deleted category was being filtered
            setFilterCategoryId((current) =>
              current === payload.old.id ? null : current
            )
          }
        )
        .subscribe()

      categoriesChannelRef.current = categoriesChannel

      // Todo-categories junction channel
      const todoCategoriesChannel = supabase
        .channel('todo-categories-changes')
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'todo_categories' },
          (payload) => {
            const { todo_id, category_id } = payload.new as { todo_id: string; category_id: string }
            setTodos((current) =>
              current.map((todo) => {
                if (todo.id !== todo_id) return todo
                const exists = todo.todo_categories.some(tc => tc.category_id === category_id)
                if (exists) return todo
                // Find the category to embed
                setCategories((cats) => {
                  const cat = cats.find(c => c.id === category_id)
                  if (cat) {
                    setTodos((inner) =>
                      inner.map((t) =>
                        t.id === todo_id
                          ? {
                              ...t,
                              todo_categories: [
                                ...t.todo_categories.filter(tc => tc.category_id !== category_id),
                                { category_id, categories: cat },
                              ],
                            }
                          : t
                      )
                    )
                  }
                  return cats
                })
                return todo
              })
            )
          }
        )
        .on(
          'postgres_changes',
          { event: 'DELETE', schema: 'public', table: 'todo_categories' },
          (payload) => {
            const { todo_id, category_id } = payload.old as { todo_id: string; category_id: string }
            setTodos((current) =>
              current.map((todo) =>
                todo.id === todo_id
                  ? {
                      ...todo,
                      todo_categories: todo.todo_categories.filter(
                        (tc) => tc.category_id !== category_id
                      ),
                    }
                  : todo
              )
            )
          }
        )
        .subscribe()

      todoCategoriesChannelRef.current = todoCategoriesChannel
    }

    setupSubscription()

    return () => {
      cancelled = true
      if (channelRef.current) supabase.removeChannel(channelRef.current)
      if (categoriesChannelRef.current) supabase.removeChannel(categoriesChannelRef.current)
      if (todoCategoriesChannelRef.current) supabase.removeChannel(todoCategoriesChannelRef.current)
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current)
    }
  }, [])

  const addTodo = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) return

    setIsLoading(true)
    try {
      const response = await apiFetch('/api/todos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          description,
          priority,
          due_date: dueDate || null,
          category_ids: selectedCategoryIds,
        }),
      })

      if (response.ok) {
        const newTodo = await response.json()
        setTodos([newTodo, ...todos])
        setTitle('')
        setDescription('')
        setPriority('medium')
        setDueDate('')
        setSelectedCategoryIds([])
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
        setTodos(todos.map(todo =>
          todo.id === id ? { ...updatedTodo, todo_categories: todo.todo_categories } : todo
        ))
      }
    } catch (error) {
      console.error('Error toggling todo:', error)
    }
  }

  const deleteTodo = async (id: string) => {
    const confirmed = await confirm('Are you sure you want to delete this todo?')
    if (!confirmed) return

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

  const assignCategory = async (todoId: string, categoryId: string) => {
    try {
      const response = await apiFetch(`/api/todos/${todoId}/categories`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category_id: categoryId }),
      })

      if (response.ok) {
        const data = await response.json()
        setTodos(todos.map(todo =>
          todo.id === todoId
            ? { ...todo, todo_categories: [...todo.todo_categories, data] }
            : todo
        ))
      }
    } catch (error) {
      console.error('Error assigning category:', error)
    }
  }

  const removeCategory = async (todoId: string, categoryId: string) => {
    try {
      const response = await apiFetch(`/api/todos/${todoId}/categories/${categoryId}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        setTodos(todos.map(todo =>
          todo.id === todoId
            ? {
                ...todo,
                todo_categories: todo.todo_categories.filter(tc => tc.category_id !== categoryId),
              }
            : todo
        ))
      }
    } catch (error) {
      console.error('Error removing category:', error)
    }
  }

  const handleSearch = (value: string) => {
    setSearchQuery(value)

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current)
    }

    if (!value.trim()) {
      setSearchResults(null)
      setIsSearching(false)
      return
    }

    setIsSearching(true)
    searchTimeoutRef.current = setTimeout(async () => {
      try {
        const response = await apiFetch(`/api/todos?q=${encodeURIComponent(value.trim())}`)
        if (response.ok) {
          const data = await response.json()
          setSearchResults(data)
        }
      } catch (error) {
        console.error('Error searching todos:', error)
      } finally {
        setIsSearching(false)
      }
    }, 300)
  }

  const clearSearch = () => {
    setSearchQuery('')
    setSearchResults(null)
    setIsSearching(false)
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current)
    }
  }

  // Determine base set of todos (search results or all)
  const baseTodos = searchResults !== null ? searchResults : todos

  // Filter by selected category
  const filteredTodos = filterCategoryId
    ? baseTodos.filter(todo =>
        todo.todo_categories.some(tc => tc.category_id === filterCategoryId)
      )
    : baseTodos

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-8">Todo List</h1>

      {/* Category Manager */}
      <CategoryManager
        categories={categories}
        currentUserId={currentUserId}
        onCategoryCreated={(category) =>
          setCategories([...categories, category].sort((a, b) => a.name.localeCompare(b.name)))
        }
        onCategoryUpdated={(updated) =>
          setCategories(
            categories.map(c => (c.id === updated.id ? updated : c)).sort((a, b) => a.name.localeCompare(b.name))
          )
        }
        onCategoryDeleted={(categoryId) => {
          setCategories(categories.filter(c => c.id !== categoryId))
          setTodos(todos.map(todo => ({
            ...todo,
            todo_categories: todo.todo_categories.filter(tc => tc.category_id !== categoryId),
          })))
          if (filterCategoryId === categoryId) setFilterCategoryId(null)
        }}
      />

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
        <div className="grid grid-cols-3 gap-4 mb-4">
          <div>
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
          <div>
            <label htmlFor="due-date" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Due Date
            </label>
            <input
              type="date"
              id="due-date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Categories
            </label>
            <CategoryPicker
              categories={categories}
              selectedIds={selectedCategoryIds}
              onChange={setSelectedCategoryIds}
              currentUserId={currentUserId}
            />
          </div>
        </div>
        <button
          type="submit"
          disabled={isLoading}
          className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 transition-colors"
        >
          {isLoading ? 'Adding...' : 'Add Todo'}
        </button>
      </form>

      {/* Category Filter */}
      <CategoryFilter
        categories={categories}
        selectedCategoryId={filterCategoryId}
        onSelect={setFilterCategoryId}
      />

      {/* Search Bar */}
      <div className="relative mb-4">
        <input
          type="search"
          placeholder="Search todos..."
          value={searchQuery}
          onChange={(e) => handleSearch(e.target.value)}
          className="w-full px-4 py-2 pl-10 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          aria-label="Search todos"
        />
        <svg
          className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 dark:text-gray-500"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
        {searchQuery && (
          <button
            onClick={clearSearch}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
            aria-label="Clear search"
          >
            &times;
          </button>
        )}
      </div>
      {isSearching && (
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">Searching...</p>
      )}

      {/* Todo List */}
      <div className="space-y-4">
        {filteredTodos.length === 0 ? (
          <p className="text-gray-500 dark:text-gray-400 text-center py-8">
            {searchResults !== null
              ? 'No todos match your search.'
              : filterCategoryId
                ? 'No todos with this category.'
                : 'No todos yet. Add one above!'}
          </p>
        ) : (
          filteredTodos.map((todo) => {
            const isOwner = currentUserId != null && todo.user_id === currentUserId
            return (
            <div
              key={todo.id}
              className="p-4 bg-white dark:bg-gray-800 rounded-lg shadow-md flex items-start gap-4"
            >
              {isOwner ? (
                <input
                  type="checkbox"
                  checked={todo.is_completed ?? false}
                  onChange={() => toggleTodo(todo.id, todo.is_completed ?? false)}
                  className="mt-1 h-5 w-5 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
              ) : (
                <div className="mt-1 h-5 w-5 flex items-center justify-center text-gray-400 dark:text-gray-500" title="Shared">
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
              )}
              <div className="flex-1">
                <div className="flex items-center gap-2 flex-wrap">
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
                  {todo.due_date && <DueDateBadge dueDate={todo.due_date} />}
                  {todo.todo_categories.map((tc) => (
                    <CategoryBadge
                      key={tc.category_id}
                      category={tc.categories}
                      onRemove={isOwner ? () => removeCategory(todo.id, tc.category_id) : undefined}
                    />
                  ))}
                  {/* Inline add category */}
                  {isOwner && categories.length > 0 && (
                    <InlineCategoryAdd
                      categories={categories}
                      assignedCategoryIds={todo.todo_categories.map(tc => tc.category_id)}
                      onAssign={(categoryId) => assignCategory(todo.id, categoryId)}
                    />
                  )}
                </div>
                {todo.description && (
                  <p className={`text-sm mt-1 ${todo.is_completed ? 'text-gray-400 dark:text-gray-500' : 'text-gray-600 dark:text-gray-300'}`}>
                    {todo.description}
                  </p>
                )}
                <AttachmentSection todoId={todo.id} readOnly={!isOwner} />
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
                  Created: {new Date(todo.created_at).toLocaleString()}
                </p>
              </div>
              {isOwner && (
                <button
                  onClick={() => deleteTodo(todo.id)}
                  className="px-3 py-1 text-sm text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                >
                  Delete
                </button>
              )}
            </div>
            )
          })
        )}
      </div>
    </div>
  )
}

function toLocalDateStr(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function getDueDateStatus(dueDateStr: string): 'overdue' | 'today' | 'upcoming' {
  // Compare YYYY-MM-DD strings to avoid UTC-vs-local timezone shifts
  const todayStr = toLocalDateStr(new Date())
  const dueStr = dueDateStr.slice(0, 10)

  if (dueStr < todayStr) return 'overdue'
  if (dueStr === todayStr) return 'today'
  return 'upcoming'
}

function DueDateBadge({ dueDate }: { dueDate: string }) {
  const status = getDueDateStatus(dueDate)
  // Parse date parts to avoid timezone-shifted formatting
  const [year, month, day] = dueDate.slice(0, 10).split('-')
  const formatted = new Date(Number(year), Number(month) - 1, Number(day)).toLocaleDateString()

  const styles = {
    overdue: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
    today: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
    upcoming: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  }

  const labels = {
    overdue: `Overdue: ${formatted}`,
    today: 'Due today',
    upcoming: `Due: ${formatted}`,
  }

  return (
    <span className={`px-2 py-0.5 text-xs font-medium rounded ${styles[status]}`}>
      {labels[status]}
    </span>
  )
}

// Small inline component for adding a category to a todo
function InlineCategoryAdd({
  categories,
  assignedCategoryIds,
  onAssign,
}: {
  categories: Category[]
  assignedCategoryIds: string[]
  onAssign: (categoryId: string) => void
}) {
  const [isOpen, setIsOpen] = useState(false)
  const unassigned = categories.filter(c => !assignedCategoryIds.includes(c.id))

  if (unassigned.length === 0) return null

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="px-1.5 py-0.5 text-xs text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 border border-dashed border-gray-300 dark:border-gray-600 rounded transition-colors"
        aria-label="Add category"
      >
        +
      </button>
      {isOpen && (
        <div className="absolute z-10 left-0 mt-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md shadow-lg min-w-[150px]">
          {unassigned.map((category) => (
            <button
              key={category.id}
              onClick={() => {
                onAssign(category.id)
                setIsOpen(false)
              }}
              className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors flex items-center gap-2"
            >
              <CategoryBadge category={category} />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
