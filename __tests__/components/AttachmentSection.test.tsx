import { render, screen, waitFor, within } from '@testing-library/react'
import '@testing-library/jest-dom'
import userEvent from '@testing-library/user-event'
import AttachmentSection from '@/components/todos/AttachmentSection'
import { ConfirmDialogProvider } from '@/components/ui/ConfirmDialog'

// Mock fetch
global.fetch = jest.fn()

// Mock Supabase client for realtime subscription
jest.mock('@/lib/supabase/client', () => ({
  createClient: jest.fn(() => ({
    channel: jest.fn(() => ({
      on: jest.fn().mockReturnThis(),
      subscribe: jest.fn((callback) => {
        if (typeof callback === 'function') {
          callback('SUBSCRIBED')
        }
        return {}
      }),
    })),
    removeChannel: jest.fn(),
    auth: {
      getSession: jest.fn().mockResolvedValue({
        data: {
          session: {
            access_token: 'mock-access-token',
            user: { id: 'test-user-id', email: 'test@example.com' },
          },
        },
        error: null,
      }),
    },
    realtime: {
      setAuth: jest.fn(),
    },
    storage: {
      from: jest.fn(() => ({
        getPublicUrl: jest.fn((path: string) => ({
          data: { publicUrl: `http://localhost:54321/storage/v1/object/public/todo-attachments/${path}` },
        })),
      })),
    },
  })),
}))

describe('AttachmentSection', () => {
  const TEST_TODO_ID = 'test-todo-id-456'

  const mockAttachments = [
    {
      id: 'att-1',
      todo_id: TEST_TODO_ID,
      user_id: 'user-1',
      file_name: 'photo.jpg',
      file_path: 'user-1/test-todo-id-456/photo.jpg',
      file_size: 2048,
      content_type: 'image/jpeg',
      created_at: '2024-01-01T00:00:00Z',
      url: 'http://localhost:54321/storage/v1/object/public/todo-attachments/user-1/test-todo-id-456/photo.jpg',
    },
    {
      id: 'att-2',
      todo_id: TEST_TODO_ID,
      user_id: 'user-1',
      file_name: 'document.pdf',
      file_path: 'user-1/test-todo-id-456/document.pdf',
      file_size: 1048576,
      content_type: 'application/pdf',
      created_at: '2024-01-02T00:00:00Z',
      url: 'http://localhost:54321/storage/v1/object/public/todo-attachments/user-1/test-todo-id-456/document.pdf',
    },
  ]

  beforeEach(() => {
    jest.clearAllMocks()
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => [],
    })
  })

  it('should render the upload button and count', async () => {
    render(<AttachmentSection todoId={TEST_TODO_ID} />)

    await waitFor(() => {
      expect(screen.getByText('Attach file')).toBeInTheDocument()
      expect(screen.getByText('0/5')).toBeInTheDocument()
    })
  })

  it('should fetch and display attachments on mount', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockAttachments,
    })

    render(<AttachmentSection todoId={TEST_TODO_ID} />)

    await waitFor(() => {
      expect(screen.getByText('photo.jpg')).toBeInTheDocument()
      expect(screen.getByText('document.pdf')).toBeInTheDocument()
    })

    expect(global.fetch).toHaveBeenCalledWith(`/api/todos/${TEST_TODO_ID}/attachments`, undefined)
  })

  it('should show attachment count', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockAttachments,
    })

    render(<AttachmentSection todoId={TEST_TODO_ID} />)

    await waitFor(() => {
      expect(screen.getByText('2/5')).toBeInTheDocument()
    })
  })

  it('should show image thumbnails for image attachments', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => [mockAttachments[0]],
    })

    render(<AttachmentSection todoId={TEST_TODO_ID} />)

    await waitFor(() => {
      const img = screen.getByAltText('photo.jpg')
      expect(img).toBeInTheDocument()
      expect(img).toHaveAttribute('src', mockAttachments[0].url)
    })
  })

  it('should open image preview modal when clicking an image attachment', async () => {
    const user = userEvent.setup()

    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => [mockAttachments[0]],
    })

    render(<AttachmentSection todoId={TEST_TODO_ID} />)

    await waitFor(() => {
      expect(screen.getByAltText('photo.jpg')).toBeInTheDocument()
    })

    // Click the image thumbnail to open preview
    await user.click(screen.getByAltText('photo.jpg'))

    // Modal should appear with the full-size image and dialog role
    const dialog = screen.getByRole('dialog')
    expect(dialog).toBeInTheDocument()
    const previewImages = within(dialog).getAllByAltText('photo.jpg')
    expect(previewImages.length).toBeGreaterThan(0)

    // Close button should dismiss the modal
    await user.click(screen.getByLabelText('Close preview'))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('should show human-readable file sizes', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockAttachments,
    })

    render(<AttachmentSection todoId={TEST_TODO_ID} />)

    await waitFor(() => {
      expect(screen.getByText('2.0 KB')).toBeInTheDocument()
      expect(screen.getByText('1.0 MB')).toBeInTheDocument()
    })
  })

  it('should upload a file successfully', async () => {
    const user = userEvent.setup()

    // Initial fetch returns empty
    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => [],
    })

    render(<AttachmentSection todoId={TEST_TODO_ID} />)

    // Wait for initial render
    await waitFor(() => {
      expect(screen.getByText('0/5')).toBeInTheDocument()
    })

    // Mock upload response
    const newAttachment = {
      id: 'att-new',
      todo_id: TEST_TODO_ID,
      user_id: 'user-1',
      file_name: 'newfile.txt',
      file_path: 'user-1/test-todo-id-456/newfile.txt',
      file_size: 512,
      content_type: 'text/plain',
      created_at: '2024-01-03T00:00:00Z',
      url: 'http://localhost:54321/storage/v1/object/public/todo-attachments/user-1/test-todo-id-456/newfile.txt',
    }

    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => newAttachment,
    })

    // Upload a file
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
    const file = new File(['hello'], 'newfile.txt', { type: 'text/plain' })
    await user.upload(fileInput, file)

    await waitFor(() => {
      expect(screen.getByText('newfile.txt')).toBeInTheDocument()
      expect(screen.getByText('1/5')).toBeInTheDocument()
    })

    // Verify fetch was called with FormData
    expect(global.fetch).toHaveBeenCalledWith(
      `/api/todos/${TEST_TODO_ID}/attachments`,
      expect.objectContaining({
        method: 'POST',
      })
    )
  })

  it('should delete an attachment with confirmation', async () => {
    const user = userEvent.setup()

    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => [mockAttachments[0]],
    })

    render(
      <ConfirmDialogProvider>
        <AttachmentSection todoId={TEST_TODO_ID} />
      </ConfirmDialogProvider>
    )

    await waitFor(() => {
      expect(screen.getByText('photo.jpg')).toBeInTheDocument()
    })

    // Mock delete response
    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true }),
    })

    // Click delete button (the × button)
    const deleteButton = screen.getByTitle('Delete attachment')
    await user.click(deleteButton)

    // Confirm dialog should appear
    expect(screen.getByText('Delete this attachment?')).toBeInTheDocument()

    // Click confirm
    await user.click(screen.getByRole('button', { name: /confirm/i }))

    await waitFor(() => {
      expect(screen.queryByText('photo.jpg')).not.toBeInTheDocument()
    })
  })

  it('should not delete if confirmation is cancelled', async () => {
    const user = userEvent.setup()

    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => [mockAttachments[0]],
    })

    render(
      <ConfirmDialogProvider>
        <AttachmentSection todoId={TEST_TODO_ID} />
      </ConfirmDialogProvider>
    )

    await waitFor(() => {
      expect(screen.getByText('photo.jpg')).toBeInTheDocument()
    })

    const deleteButton = screen.getByTitle('Delete attachment')
    await user.click(deleteButton)

    // Confirm dialog should appear
    expect(screen.getByText('Delete this attachment?')).toBeInTheDocument()

    // Click cancel
    await user.click(screen.getByRole('button', { name: /cancel/i }))

    expect(screen.getByText('photo.jpg')).toBeInTheDocument()
    // Fetch should only have been called once (for initial load)
    expect(global.fetch).toHaveBeenCalledTimes(1)
  })

  it('should show error when upload fails', async () => {
    const user = userEvent.setup()

    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => [],
    })

    render(<AttachmentSection todoId={TEST_TODO_ID} />)

    await waitFor(() => {
      expect(screen.getByText('0/5')).toBeInTheDocument()
    })

    // Mock failed upload
    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: 'Upload failed' }),
    })

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
    const file = new File(['hello'], 'test.txt', { type: 'text/plain' })
    await user.upload(fileInput, file)

    await waitFor(() => {
      expect(screen.getByText('Upload failed')).toBeInTheDocument()
    })
  })

  it('should hide upload button and delete buttons in read-only mode', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockAttachments,
    })

    render(<AttachmentSection todoId={TEST_TODO_ID} readOnly />)

    await waitFor(() => {
      expect(screen.getByText('photo.jpg')).toBeInTheDocument()
      expect(screen.getByText('document.pdf')).toBeInTheDocument()
    })

    // Upload button and count should not be visible
    expect(screen.queryByText('Attach file')).not.toBeInTheDocument()
    expect(screen.queryByText('2/5')).not.toBeInTheDocument()

    // Delete buttons should not be visible
    expect(screen.queryByTitle('Delete attachment')).not.toBeInTheDocument()
  })

  it('should show error for files exceeding 10MB', async () => {
    const user = userEvent.setup()

    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => [],
    })

    render(<AttachmentSection todoId={TEST_TODO_ID} />)

    await waitFor(() => {
      expect(screen.getByText('0/5')).toBeInTheDocument()
    })

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
    const largeFile = new File(['x'], 'large.bin', { type: 'application/octet-stream' })
    Object.defineProperty(largeFile, 'size', { value: 11 * 1024 * 1024 })

    await user.upload(fileInput, largeFile)

    await waitFor(() => {
      expect(screen.getByText('File size exceeds 10MB limit')).toBeInTheDocument()
    })

    // Should not have made an upload request
    expect(global.fetch).toHaveBeenCalledTimes(1) // Only the initial fetch
  })
})
