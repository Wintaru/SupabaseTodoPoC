'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { apiFetch } from '@/lib/fetch'
import { useConfirm } from '@/components/ui/ConfirmDialog'
import type { RealtimeChannel } from '@supabase/supabase-js'
import type { Attachment } from '@/lib/types'

interface AttachmentWithUrl extends Attachment {
  url: string
}

interface AttachmentSectionProps {
  todoId: string
}

const MAX_ATTACHMENTS = 5

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function isImageType(contentType: string): boolean {
  return contentType.startsWith('image/')
}

export default function AttachmentSection({ todoId }: AttachmentSectionProps) {
  const [attachments, setAttachments] = useState<AttachmentWithUrl[]>([])
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [previewAttachment, setPreviewAttachment] = useState<AttachmentWithUrl | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const channelRef = useRef<RealtimeChannel | null>(null)
  const confirm = useConfirm()

  // Fetch attachments and set up realtime subscription
  useEffect(() => {
    const supabase = createClient()
    let cancelled = false

    const fetchAndSubscribe = async () => {
      // Fetch initial attachments
      try {
        const response = await apiFetch(`/api/todos/${todoId}/attachments`)
        if (cancelled) return
        if (response.ok) {
          const data = await response.json()
          setAttachments(data)
        }
      } catch (err) {
        console.error('Error fetching attachments:', err)
      }

      // Wait for auth session before subscribing to realtime
      const { data: { session } } = await supabase.auth.getSession()
      if (cancelled) return
      if (!session) return

      supabase.realtime.setAuth(session.access_token)

      const channel = supabase
        .channel(`attachments-${todoId}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'todo_attachments',
            filter: `todo_id=eq.${todoId}`,
          },
          (payload) => {
            const newRow = payload.new as Attachment
            // Compute public URL from file_path
            const { data: { publicUrl } } = supabase.storage
              .from('todo-attachments')
              .getPublicUrl(newRow.file_path)

            setAttachments((current) => {
              const exists = current.some(a => a.id === newRow.id)
              if (exists) return current
              return [...current, { ...newRow, url: publicUrl }]
            })
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'DELETE',
            schema: 'public',
            table: 'todo_attachments',
            filter: `todo_id=eq.${todoId}`,
          },
          (payload) => {
            setAttachments((current) =>
              current.filter((a) => a.id !== payload.old.id)
            )
          }
        )
        .subscribe()

      channelRef.current = channel
    }

    fetchAndSubscribe()

    return () => {
      cancelled = true
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
      }
    }
  }, [todoId])

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setError(null)

    if (file.size > 10 * 1024 * 1024) {
      setError('File size exceeds 10MB limit')
      return
    }

    if (attachments.length >= MAX_ATTACHMENTS) {
      setError(`Maximum ${MAX_ATTACHMENTS} attachments reached`)
      return
    }

    setIsUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)

      const response = await apiFetch(`/api/todos/${todoId}/attachments`, {
        method: 'POST',
        body: formData,
      })

      if (response.ok) {
        const newAttachment = await response.json()
        setAttachments([...attachments, newAttachment])
      } else {
        const data = await response.json()
        setError(data.error || 'Upload failed')
      }
    } catch (err) {
      console.error('Error uploading file:', err)
      setError('Upload failed')
    } finally {
      setIsUploading(false)
      // Reset the file input so the same file can be selected again
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const handleDelete = async (attachmentId: string) => {
    const confirmed = await confirm('Delete this attachment?')
    if (!confirmed) return

    try {
      const response = await apiFetch(
        `/api/todos/${todoId}/attachments/${attachmentId}`,
        { method: 'DELETE' }
      )

      if (response.ok) {
        setAttachments(attachments.filter((a) => a.id !== attachmentId))
      }
    } catch (err) {
      console.error('Error deleting attachment:', err)
    }
  }

  return (
    <div className="mt-3">
      {/* Attachment list */}
      {attachments.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-2">
          {attachments.map((attachment) => (
            <div
              key={attachment.id}
              className="flex items-center gap-2 px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-sm"
            >
              {isImageType(attachment.content_type) ? (
                <button
                  onClick={() => setPreviewAttachment(attachment)}
                  className="flex items-center gap-2 hover:underline cursor-pointer"
                >
                  <img
                    src={attachment.url}
                    alt={attachment.file_name}
                    className="w-8 h-8 object-cover rounded"
                  />
                  <span className="text-gray-700 dark:text-gray-300 max-w-[120px] truncate">
                    {attachment.file_name}
                  </span>
                </button>
              ) : (
                <a
                  href={attachment.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-blue-600 dark:text-blue-400 hover:underline"
                >
                  <span className="max-w-[120px] truncate">{attachment.file_name}</span>
                </a>
              )}
              <span className="text-gray-400 dark:text-gray-500 text-xs">
                {formatFileSize(attachment.file_size)}
              </span>
              <button
                onClick={() => handleDelete(attachment.id)}
                className="text-red-500 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 text-xs ml-1"
                title="Delete attachment"
              >
                &times;
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Upload button + count */}
      <div className="flex items-center gap-2">
        <label
          className={`inline-flex items-center gap-1 px-2 py-1 text-xs rounded cursor-pointer transition-colors ${
            isUploading || attachments.length >= MAX_ATTACHMENTS
              ? 'bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed'
              : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            onChange={handleUpload}
            disabled={isUploading || attachments.length >= MAX_ATTACHMENTS}
            className="hidden"
          />
          {isUploading ? 'Uploading...' : 'Attach file'}
        </label>
        <span className="text-xs text-gray-400 dark:text-gray-500">
          {attachments.length}/{MAX_ATTACHMENTS}
        </span>
      </div>

      {/* Error message */}
      {error && (
        <p className="text-xs text-red-600 dark:text-red-400 mt-1">{error}</p>
      )}

      {/* Image preview modal */}
      {previewAttachment && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70"
          onClick={() => setPreviewAttachment(null)}
          onKeyDown={(e) => { if (e.key === 'Escape') setPreviewAttachment(null) }}
          role="dialog"
          aria-label={`Preview of ${previewAttachment.file_name}`}
        >
          <div
            className="relative max-w-[90vw] max-h-[90vh]"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setPreviewAttachment(null)}
              className="absolute -top-3 -right-3 w-8 h-8 flex items-center justify-center bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-full shadow-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-lg"
              aria-label="Close preview"
            >
              &times;
            </button>
            <img
              src={previewAttachment.url}
              alt={previewAttachment.file_name}
              className="max-w-[90vw] max-h-[85vh] object-contain rounded-lg"
            />
            <p className="text-center text-white text-sm mt-2">
              {previewAttachment.file_name}
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
