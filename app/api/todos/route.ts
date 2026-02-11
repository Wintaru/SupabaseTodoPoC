import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { listTodos, createTodo } from '@/lib/accessors/todos'
import type { TodoInsert } from '@/lib/types'

// GET /api/todos - List all todos (with optional full-text search via ?q=)
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const query = searchParams.get('q')?.trim() || ''

    const { data, error } = await listTodos(query || undefined)

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
      due_date: body.due_date || null,
      user_id: user.id,
    }

    const { data, error } = await createTodo(todoData, body.category_ids)

    if (error) {
      console.error('Error creating todo:', error)
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json(data, { status: 201 })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    )
  }
}
