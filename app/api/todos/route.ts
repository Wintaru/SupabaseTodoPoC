import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import type { TodoInsert } from '@/lib/types'

// GET /api/todos - List all todos
export async function GET() {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('todos')
      .select('*, todo_categories(category_id, categories(*))')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching todos:', error)
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    )
  }
}

// POST /api/todos - Create new todo
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const supabase = await createClient()

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Validate required fields
    if (!body.title || body.title.trim() === '') {
      return NextResponse.json(
        { error: 'Title is required' },
        { status: 400 }
      )
    }

    const todoData: TodoInsert = {
      title: body.title.trim(),
      description: body.description?.trim() || null,
      is_completed: body.is_completed || false,
      priority: body.priority || 'medium',
      user_id: user.id,
    }

    const { data, error } = await supabase
      .from('todos')
      .insert(todoData)
      .select()
      .single()

    if (error) {
      console.error('Error creating todo:', error)
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      )
    }

    // Assign categories if provided
    const categoryIds: string[] = body.category_ids || []
    if (categoryIds.length > 0) {
      const junctionRows = categoryIds.map(categoryId => ({
        todo_id: data.id,
        category_id: categoryId,
      }))

      const { error: catError } = await supabase
        .from('todo_categories')
        .insert(junctionRows)

      if (catError) {
        console.error('Error assigning categories:', catError)
        // Todo was created, categories just failed to assign — don't fail the whole request
      }
    }

    // Re-fetch with categories included
    const { data: todoWithCategories } = await supabase
      .from('todos')
      .select('*, todo_categories(category_id, categories(*))')
      .eq('id', data.id)
      .single()

    return NextResponse.json(todoWithCategories ?? data, { status: 201 })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    )
  }
}
