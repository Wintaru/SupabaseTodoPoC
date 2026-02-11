import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
const MAX_ATTACHMENTS = 5

type Params = Promise<{ id: string }>

// GET /api/todos/[id]/attachments - List attachments for a todo
export async function GET(
  request: Request,
  context: { params: Params }
) {
  try {
    const { id: todoId } = await context.params
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('todo_attachments')
      .select('*')
      .eq('todo_id', todoId)
      .order('created_at', { ascending: true })

    if (error) {
      console.error('Error fetching attachments:', error)
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      )
    }

    // Add public URLs to each attachment
    const attachmentsWithUrls = data.map((attachment) => {
      const { data: { publicUrl } } = supabase.storage
        .from('todo-attachments')
        .getPublicUrl(attachment.file_path)

      return { ...attachment, url: publicUrl }
    })

    return NextResponse.json(attachmentsWithUrls)
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    )
  }
}

// POST /api/todos/[id]/attachments - Upload a file attachment
export async function POST(
  request: Request,
  context: { params: Params }
) {
  try {
    const { id: todoId } = await context.params
    const supabase = await createClient()

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Verify the todo exists and belongs to the user
    const { data: todo, error: todoError } = await supabase
      .from('todos')
      .select('id')
      .eq('id', todoId)
      .single()

    if (todoError || !todo) {
      return NextResponse.json(
        { error: 'Todo not found' },
        { status: 404 }
      )
    }

    // Check attachment count limit
    const { count, error: countError } = await supabase
      .from('todo_attachments')
      .select('*', { count: 'exact', head: true })
      .eq('todo_id', todoId)

    if (countError) {
      console.error('Error checking attachment count:', countError)
      return NextResponse.json(
        { error: countError.message },
        { status: 500 }
      )
    }

    if ((count ?? 0) >= MAX_ATTACHMENTS) {
      return NextResponse.json(
        { error: `Maximum ${MAX_ATTACHMENTS} attachments per todo` },
        { status: 400 }
      )
    }

    // Parse the form data
    const formData = await request.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      )
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: 'File size exceeds 10MB limit' },
        { status: 400 }
      )
    }

    // Upload to Supabase Storage
    // Sanitize file name: replace spaces/special chars with underscores, keep extension
    const sanitizedName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
    const filePath = `${user.id}/${todoId}/${sanitizedName}`
    const fileBuffer = Buffer.from(await file.arrayBuffer())

    const { error: uploadError } = await supabase.storage
      .from('todo-attachments')
      .upload(filePath, fileBuffer, {
        contentType: file.type,
        upsert: false,
      })

    if (uploadError) {
      console.error('Error uploading file:', uploadError)
      return NextResponse.json(
        { error: uploadError.message },
        { status: 500 }
      )
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('todo-attachments')
      .getPublicUrl(filePath)

    // Insert attachment record
    const { data: attachment, error: insertError } = await supabase
      .from('todo_attachments')
      .insert({
        todo_id: todoId,
        user_id: user.id,
        file_name: file.name,
        file_path: filePath,
        file_size: file.size,
        content_type: file.type,
      })
      .select()
      .single()

    if (insertError) {
      // Clean up uploaded file if DB insert fails
      await supabase.storage.from('todo-attachments').remove([filePath])
      console.error('Error saving attachment record:', insertError)
      return NextResponse.json(
        { error: insertError.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ ...attachment, url: publicUrl }, { status: 201 })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    )
  }
}
