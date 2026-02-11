import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import type { CategoryUpdate } from '@/lib/types'
import { CATEGORY_COLORS } from '@/lib/types'

const VALID_COLORS = CATEGORY_COLORS.map(c => c.value)

type Params = Promise<{ id: string }>

// PATCH /api/categories/[id] - Update a category
export async function PATCH(
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

    const updateData: CategoryUpdate = {}

    if (body.name !== undefined) {
      if (body.name.trim() === '') {
        return NextResponse.json(
          { error: 'Name cannot be empty' },
          { status: 400 }
        )
      }
      updateData.name = body.name.trim()
    }

    if (body.color !== undefined) {
      if (!VALID_COLORS.includes(body.color)) {
        return NextResponse.json(
          { error: 'Invalid color' },
          { status: 400 }
        )
      }
      updateData.color = body.color
    }

    const { data, error } = await supabase
      .from('categories')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json(
          { error: 'A category with this name already exists' },
          { status: 409 }
        )
      }
      console.error('Error updating category:', error)
      return NextResponse.json(
        { error: error.message },
        { status: 404 }
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

// DELETE /api/categories/[id] - Delete a category
export async function DELETE(
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

    const { error } = await supabase
      .from('categories')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Error deleting category:', error)
      return NextResponse.json(
        { error: error.message },
        { status: 404 }
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
