import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import type { TodoInsert } from '@/lib/types'

// GET /api/todos - List all todos
export async function GET() {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('todos')
      .select('*')
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

    return NextResponse.json(data, { status: 201 })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    )
  }
}
