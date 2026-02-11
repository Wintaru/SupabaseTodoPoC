'use client'

import type { Category } from '@/lib/types'
import { CATEGORY_COLOR_CLASSES } from '@/lib/types'

interface CategoryBadgeProps {
  category: Category
  onRemove?: () => void
}

export default function CategoryBadge({ category, onRemove }: CategoryBadgeProps) {
  const colors = CATEGORY_COLOR_CLASSES[category.color] || CATEGORY_COLOR_CLASSES.blue

  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded ${colors.badge} ${colors.badgeDark}`}
    >
      {category.name}
      {onRemove && (
        <button
          onClick={(e) => {
            e.stopPropagation()
            onRemove()
          }}
          className="ml-0.5 hover:opacity-70 transition-opacity"
          aria-label={`Remove ${category.name} category`}
        >
          &times;
        </button>
      )}
    </span>
  )
}
