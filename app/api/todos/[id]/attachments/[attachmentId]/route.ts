import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

type Params = Promise<{ id: string; attachmentId: string }>

// DELETE /api/todos/[id]/attachments/[attachmentId] - Delete an attachment
export async function DELETE(
  request: Request,
  context: { params: Params }
) {
  try {
    const { attachmentId } = await context.params
    const supabase = await createClient()

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get the attachment record to find the file path
    const { data: attachment, error: fetchError } = await supabase
      .from('todo_attachments')
      .select('*')
      .eq('id', attachmentId)
      .single()

    if (fetchError || !attachment) {
      return NextResponse.json(
        { error: 'Attachment not found' },
        { status: 404 }
      )
    }

    // Delete from storage
    const { error: storageError } = await supabase.storage
      .from('todo-attachments')
      .remove([attachment.file_path])

    if (storageError) {
      console.error('Error deleting file from storage:', storageError)
      return NextResponse.json(
        { error: storageError.message },
        { status: 500 }
      )
    }

    // Delete the database record
    const { error: deleteError } = await supabase
      .from('todo_attachments')
      .delete()
      .eq('id', attachmentId)

    if (deleteError) {
      console.error('Error deleting attachment record:', deleteError)
      return NextResponse.json(
        { error: deleteError.message },
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
