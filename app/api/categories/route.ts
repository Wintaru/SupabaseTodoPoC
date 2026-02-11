import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import type { CategoryInsert } from '@/lib/types'
import { CATEGORY_COLORS } from '@/lib/types'

const VALID_COLORS = CATEGORY_COLORS.map(c => c.value)

// GET /api/categories - List all categories for the authenticated user
export async function GET() {
  try {
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .order('name', { ascending: true })

    if (error) {
      console.error('Error fetching categories:', error)
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

// POST /api/categories - Create a new category
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    if (!body.name || body.name.trim() === '') {
      return NextResponse.json(
        { error: 'Name is required' },
        { status: 400 }
      )
    }

    if (!body.color || !VALID_COLORS.includes(body.color)) {
      return NextResponse.json(
        { error: 'Valid color is required' },
        { status: 400 }
      )
    }

    const categoryData: CategoryInsert = {
      name: body.name.trim(),
      color: body.color,
      user_id: user.id,
    }

    const { data, error } = await supabase
      .from('categories')
      .insert(categoryData)
      .select()
      .single()

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json(
          { error: 'A category with this name already exists' },
          { status: 409 }
        )
      }
      console.error('Error creating category:', error)
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
