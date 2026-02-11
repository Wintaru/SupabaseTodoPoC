'use client'

import { useState } from 'react'
import { apiFetch } from '@/lib/fetch'
import { useConfirm } from '@/components/ui/ConfirmDialog'
import type { Category } from '@/lib/types'
import { CATEGORY_COLORS, CATEGORY_COLOR_CLASSES } from '@/lib/types'

interface CategoryManagerProps {
  categories: Category[]
  onCategoryCreated: (category: Category) => void
  onCategoryUpdated: (category: Category) => void
  onCategoryDeleted: (categoryId: string) => void
}

export default function CategoryManager({
  categories,
  onCategoryCreated,
  onCategoryUpdated,
  onCategoryDeleted,
}: CategoryManagerProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [name, setName] = useState('')
  const [color, setColor] = useState<string>(CATEGORY_COLORS[0].value)
  const [isLoading, setIsLoading] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editColor, setEditColor] = useState('')
  const confirm = useConfirm()

  const createCategory = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return

    setIsLoading(true)
    try {
      const response = await apiFetch('/api/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, color }),
      })

      if (response.ok) {
        const newCategory = await response.json()
        onCategoryCreated(newCategory)
        setName('')
        setColor(CATEGORY_COLORS[0].value)
      }
    } catch (error) {
      console.error('Error creating category:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const startEdit = (category: Category) => {
    setEditingId(category.id)
    setEditName(category.name)
    setEditColor(category.color)
  }

  const saveEdit = async (categoryId: string) => {
    if (!editName.trim()) return

    try {
      const response = await apiFetch(`/api/categories/${categoryId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editName, color: editColor }),
      })

      if (response.ok) {
        const updated = await response.json()
        onCategoryUpdated(updated)
        setEditingId(null)
      }
    } catch (error) {
      console.error('Error updating category:', error)
    }
  }

  const deleteCategory = async (categoryId: string, categoryName: string) => {
    const confirmed = await confirm(`Delete category "${categoryName}"? It will be removed from all todos.`)
    if (!confirmed) return

    try {
      const response = await apiFetch(`/api/categories/${categoryId}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        onCategoryDeleted(categoryId)
      }
    } catch (error) {
      console.error('Error deleting category:', error)
    }
  }

  return (
    <div className="mb-6">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
      >
        {isOpen ? '\u25BC' : '\u25B6'} Manage Categories ({categories.length})
      </button>

      {isOpen && (
        <div className="mt-3 p-4 bg-white dark:bg-gray-800 rounded-lg shadow-md">
          {/* Create category form */}
          <form onSubmit={createCategory} className="flex gap-2 mb-4">
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="flex-1 px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Category name"
            />
            <select
              value={color}
              onChange={(e) => setColor(e.target.value)}
              className="px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {CATEGORY_COLORS.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.name}
                </option>
              ))}
            </select>
            <button
              type="submit"
              disabled={isLoading || !name.trim()}
              className="px-4 py-1.5 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 transition-colors"
            >
              {isLoading ? 'Adding...' : 'Add'}
            </button>
          </form>

          {/* Category list */}
          {categories.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">No categories yet.</p>
          ) : (
            <div className="space-y-2">
              {categories.map((category) => {
                const colors = CATEGORY_COLOR_CLASSES[category.color] || CATEGORY_COLOR_CLASSES.blue

                if (editingId === category.id) {
                  return (
                    <div key={category.id} className="flex items-center gap-2">
                      <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="flex-1 px-2 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <select
                        value={editColor}
                        onChange={(e) => setEditColor(e.target.value)}
                        className="px-2 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        {CATEGORY_COLORS.map((c) => (
                          <option key={c.value} value={c.value}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                      <button
                        onClick={() => saveEdit(category.id)}
                        className="px-2 py-1 text-xs text-green-600 dark:text-green-400 hover:text-green-800 dark:hover:text-green-300"
                      >
                        Save
                      </button>
                      <button
                        onClick={() => setEditingId(null)}
                        className="px-2 py-1 text-xs text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
                      >
                        Cancel
                      </button>
                    </div>
                  )
                }

                return (
                  <div key={category.id} className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 text-xs font-medium rounded ${colors.badge} ${colors.badgeDark}`}>
                      {category.name}
                    </span>
                    <div className="ml-auto flex gap-1">
                      <button
                        onClick={() => startEdit(category)}
                        className="px-2 py-1 text-xs text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => deleteCategory(category.id, category.name)}
                        className="px-2 py-1 text-xs text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
