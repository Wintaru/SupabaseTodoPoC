import { Database } from './database.types'

// Export database types
export type { Database }

// Todo types
export type Todo = Database['public']['Tables']['todos']['Row']
export type TodoInsert = Database['public']['Tables']['todos']['Insert']
export type TodoUpdate = Database['public']['Tables']['todos']['Update']

// Attachment types
export type Attachment = Database['public']['Tables']['todo_attachments']['Row']
export type AttachmentInsert = Database['public']['Tables']['todo_attachments']['Insert']

// Category types
export type Category = Database['public']['Tables']['categories']['Row']
export type CategoryInsert = Database['public']['Tables']['categories']['Insert']
export type CategoryUpdate = Database['public']['Tables']['categories']['Update']
export type TodoCategory = Database['public']['Tables']['todo_categories']['Row']

// Todo with nested categories (from joined query)
export type TodoWithCategories = Todo & {
  todo_categories: Array<{
    category_id: string
    categories: Category
  }>
}

// Predefined category color palette
export const CATEGORY_COLORS = [
  { name: 'Red', value: 'red' },
  { name: 'Orange', value: 'orange' },
  { name: 'Yellow', value: 'yellow' },
  { name: 'Green', value: 'green' },
  { name: 'Blue', value: 'blue' },
  { name: 'Purple', value: 'purple' },
  { name: 'Pink', value: 'pink' },
] as const

// Tailwind class mappings for category colors (must be static for Tailwind to detect)
export const CATEGORY_COLOR_CLASSES: Record<string, { badge: string; badgeDark: string; filter: string; filterDark: string; filterActive: string; filterActiveDark: string }> = {
  red: {
    badge: 'bg-red-100 text-red-800',
    badgeDark: 'dark:bg-red-900/30 dark:text-red-300',
    filter: 'bg-red-50 text-red-700 border-red-200',
    filterDark: 'dark:bg-red-900/20 dark:text-red-400 dark:border-red-800',
    filterActive: 'bg-red-200 text-red-900 border-red-400',
    filterActiveDark: 'dark:bg-red-900/50 dark:text-red-200 dark:border-red-600',
  },
  orange: {
    badge: 'bg-orange-100 text-orange-800',
    badgeDark: 'dark:bg-orange-900/30 dark:text-orange-300',
    filter: 'bg-orange-50 text-orange-700 border-orange-200',
    filterDark: 'dark:bg-orange-900/20 dark:text-orange-400 dark:border-orange-800',
    filterActive: 'bg-orange-200 text-orange-900 border-orange-400',
    filterActiveDark: 'dark:bg-orange-900/50 dark:text-orange-200 dark:border-orange-600',
  },
  yellow: {
    badge: 'bg-yellow-100 text-yellow-800',
    badgeDark: 'dark:bg-yellow-900/30 dark:text-yellow-300',
    filter: 'bg-yellow-50 text-yellow-700 border-yellow-200',
    filterDark: 'dark:bg-yellow-900/20 dark:text-yellow-400 dark:border-yellow-800',
    filterActive: 'bg-yellow-200 text-yellow-900 border-yellow-400',
    filterActiveDark: 'dark:bg-yellow-900/50 dark:text-yellow-200 dark:border-yellow-600',
  },
  green: {
    badge: 'bg-green-100 text-green-800',
    badgeDark: 'dark:bg-green-900/30 dark:text-green-300',
    filter: 'bg-green-50 text-green-700 border-green-200',
    filterDark: 'dark:bg-green-900/20 dark:text-green-400 dark:border-green-800',
    filterActive: 'bg-green-200 text-green-900 border-green-400',
    filterActiveDark: 'dark:bg-green-900/50 dark:text-green-200 dark:border-green-600',
  },
  blue: {
    badge: 'bg-blue-100 text-blue-800',
    badgeDark: 'dark:bg-blue-900/30 dark:text-blue-300',
    filter: 'bg-blue-50 text-blue-700 border-blue-200',
    filterDark: 'dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800',
    filterActive: 'bg-blue-200 text-blue-900 border-blue-400',
    filterActiveDark: 'dark:bg-blue-900/50 dark:text-blue-200 dark:border-blue-600',
  },
  purple: {
    badge: 'bg-purple-100 text-purple-800',
    badgeDark: 'dark:bg-purple-900/30 dark:text-purple-300',
    filter: 'bg-purple-50 text-purple-700 border-purple-200',
    filterDark: 'dark:bg-purple-900/20 dark:text-purple-400 dark:border-purple-800',
    filterActive: 'bg-purple-200 text-purple-900 border-purple-400',
    filterActiveDark: 'dark:bg-purple-900/50 dark:text-purple-200 dark:border-purple-600',
  },
  pink: {
    badge: 'bg-pink-100 text-pink-800',
    badgeDark: 'dark:bg-pink-900/30 dark:text-pink-300',
    filter: 'bg-pink-50 text-pink-700 border-pink-200',
    filterDark: 'dark:bg-pink-900/20 dark:text-pink-400 dark:border-pink-800',
    filterActive: 'bg-pink-200 text-pink-900 border-pink-400',
    filterActiveDark: 'dark:bg-pink-900/50 dark:text-pink-200 dark:border-pink-600',
  },
}
