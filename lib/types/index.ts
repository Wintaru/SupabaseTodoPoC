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
