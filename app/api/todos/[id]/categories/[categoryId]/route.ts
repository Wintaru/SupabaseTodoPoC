import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

type Params = Promise<{ id: string; categoryId: string }>

// DELETE /api/todos/[id]/categories/[categoryId] - Remove a category from a todo
export async function DELETE(
  request: Request,
  context: { params: Params }
) {
  try {
    const { id, categoryId } = await context.params
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { error } = await supabase
      .from('todo_categories')
      .delete()
      .eq('todo_id', id)
      .eq('category_id', categoryId)

    if (error) {
      console.error('Error removing category from todo:', error)
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true }, { status: 200 })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    )
  }
}
