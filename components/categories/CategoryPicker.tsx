'use client'

import { useState } from 'react'
import type { Category } from '@/lib/types'
import { CATEGORY_COLOR_CLASSES } from '@/lib/types'

interface CategoryPickerProps {
  categories: Category[]
  selectedIds: string[]
  onChange: (selectedIds: string[]) => void
}

export default function CategoryPicker({ categories, selectedIds, onChange }: CategoryPickerProps) {
  const [isOpen, setIsOpen] = useState(false)

  if (categories.length === 0) return null

  const toggleCategory = (categoryId: string) => {
    if (selectedIds.includes(categoryId)) {
      onChange(selectedIds.filter(id => id !== categoryId))
    } else {
      onChange([...selectedIds, categoryId])
    }
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-3 py-2 text-left text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
      >
        {selectedIds.length === 0
          ? 'Select categories...'
          : `${selectedIds.length} selected`}
        <span className="float-right">{isOpen ? '\u25B2' : '\u25BC'}</span>
      </button>

      {isOpen && (
        <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md shadow-lg max-h-48 overflow-y-auto">
          {categories.map((category) => {
            const colors = CATEGORY_COLOR_CLASSES[category.color] || CATEGORY_COLOR_CLASSES.blue
            const isSelected = selectedIds.includes(category.id)

            return (
              <label
                key={category.id}
                className="flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => toggleCategory(category.id)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <span className={`px-2 py-0.5 text-xs font-medium rounded ${colors.badge} ${colors.badgeDark}`}>
                  {category.name}
                </span>
              </label>
            )
          })}
        </div>
      )}
    </div>
  )
}
