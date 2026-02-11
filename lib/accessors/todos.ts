import { createClient } from '@/lib/supabase/server'
import type { TodoInsert, TodoUpdate } from '@/lib/types'

export async function listTodos(searchQuery?: string) {
  const supabase = await createClient()

  let query = supabase
    .from('todos')
    .select('*, todo_categories(category_id, categories(*))')

  if (searchQuery) {
    query = query.or(`title.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%`)
  }

  return query.order('created_at', { ascending: false })
}

export async function getTodo(id: string) {
  const supabase = await createClient()
  return supabase.from('todos').select('*').eq('id', id).single()
}

export async function createTodo(todoData: TodoInsert, categoryIds?: string[]) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('todos')
    .insert(todoData)
    .select()
    .single()

  if (error || !data) return { data: null, error }

  if (categoryIds?.length) {
    const rows = categoryIds.map(catId => ({ todo_id: data.id, category_id: catId }))
    const { error: catError } = await supabase.from('todo_categories').insert(rows)
    if (catError) console.error('Error assigning categories:', catError)
  }

  // Re-fetch with categories included
  return supabase
    .from('todos')
    .select('*, todo_categories(category_id, categories(*))')
    .eq('id', data.id)
    .single()
}

export async function updateTodo(id: string, data: TodoUpdate) {
  const supabase = await createClient()
  return supabase.from('todos').update(data).eq('id', id).select().single()
}

export async function deleteTodo(id: string) {
  const supabase = await createClient()
  return supabase.from('todos').delete().eq('id', id)
}
