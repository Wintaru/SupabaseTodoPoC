'use client'

import type { Category } from '@/lib/types'
import { CATEGORY_COLOR_CLASSES } from '@/lib/types'

interface CategoryFilterProps {
  categories: Category[]
  selectedCategoryId: string | null
  onSelect: (categoryId: string | null) => void
}

export default function CategoryFilter({ categories, selectedCategoryId, onSelect }: CategoryFilterProps) {
  if (categories.length === 0) return null

  return (
    <div className="flex flex-wrap gap-2 mb-4">
      <button
        onClick={() => onSelect(null)}
        className={`px-3 py-1 text-xs font-medium rounded-full border transition-colors ${
          selectedCategoryId === null
            ? 'bg-gray-200 text-gray-900 border-gray-400 dark:bg-gray-600 dark:text-gray-100 dark:border-gray-500'
            : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700 dark:hover:bg-gray-700'
        }`}
      >
        All
      </button>
      {categories.map((category) => {
        const colors = CATEGORY_COLOR_CLASSES[category.color] || CATEGORY_COLOR_CLASSES.blue
        const isActive = selectedCategoryId === category.id

        return (
          <button
            key={category.id}
            onClick={() => onSelect(isActive ? null : category.id)}
            className={`px-3 py-1 text-xs font-medium rounded-full border transition-colors ${
              isActive
                ? `${colors.filterActive} ${colors.filterActiveDark}`
                : `${colors.filter} ${colors.filterDark} hover:opacity-80`
            }`}
          >
            {category.name}
          </button>
        )
      })}
    </div>
  )
}
