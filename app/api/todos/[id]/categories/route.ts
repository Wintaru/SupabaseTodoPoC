import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

type Params = Promise<{ id: string }>

// GET /api/todos/[id]/categories - List categories for a todo
export async function GET(
  request: Request,
  context: { params: Params }
) {
  try {
    const { id } = await context.params
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { data, error } = await supabase
      .from('todo_categories')
      .select('category_id, categories(*)')
      .eq('todo_id', id)

    if (error) {
      console.error('Error fetching todo categories:', error)
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

// POST /api/todos/[id]/categories - Assign a category to a todo
export async function POST(
  request: Request,
  context: { params: Params }
) {
  try {
    const { id } = await context.params
    const body = await request.json()
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    if (!body.category_id) {
      return NextResponse.json(
        { error: 'category_id is required' },
        { status: 400 }
      )
    }

    const { data, error } = await supabase
      .from('todo_categories')
      .insert({ todo_id: id, category_id: body.category_id })
      .select('category_id, categories(*)')
      .single()

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json(
          { error: 'Category already assigned to this todo' },
          { status: 409 }
        )
      }
      console.error('Error assigning category:', error)
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
