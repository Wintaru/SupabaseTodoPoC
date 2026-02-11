import { DELETE } from '@/app/api/todos/[id]/attachments/[attachmentId]/route'
import { createClient } from '@/lib/supabase/server'

jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(),
}))

describe('/api/todos/[id]/attachments/[attachmentId]', () => {
  let mockSupabase: any
  let mockStorageRemove: jest.Mock
  const TEST_USER_ID = 'test-user-id-123'
  const TEST_TODO_ID = 'test-todo-id-456'
  const TEST_ATTACHMENT_ID = 'test-att-id-789'
  const mockContext = {
    params: Promise.resolve({ id: TEST_TODO_ID, attachmentId: TEST_ATTACHMENT_ID }),
  }

  beforeEach(() => {
    mockStorageRemove = jest.fn().mockResolvedValue({ error: null })

    mockSupabase = {
      auth: {
        getUser: jest.fn(() => ({
          data: { user: { id: TEST_USER_ID } },
          error: null,
        })),
      },
      from: jest.fn(() => mockSupabase),
      select: jest.fn(() => mockSupabase),
      delete: jest.fn(() => mockSupabase),
      eq: jest.fn(() => mockSupabase),
      single: jest.fn(() => mockSupabase),
      storage: {
        from: jest.fn(() => ({
          remove: mockStorageRemove,
        })),
      },
    }
    ;(createClient as jest.Mock).mockResolvedValue(mockSupabase)
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('DELETE /api/todos/[id]/attachments/[attachmentId]', () => {
    it('should delete an attachment and its storage file', async () => {
      const mockAttachment = {
        id: TEST_ATTACHMENT_ID,
        todo_id: TEST_TODO_ID,
        user_id: TEST_USER_ID,
        file_name: 'photo.jpg',
        file_path: `${TEST_USER_ID}/${TEST_TODO_ID}/photo.jpg`,
        file_size: 1024,
        content_type: 'image/jpeg',
        created_at: '2024-01-01T00:00:00Z',
      }

      // DELETE handler calls eq() twice:
      // 1. .eq('id', attachmentId) in fetch chain -> return mockSupabase for .single()
      // 2. .eq('id', attachmentId) in delete chain -> terminal, returns result
      mockSupabase.eq
        .mockReturnValueOnce(mockSupabase) // eq #1: fetch chain
        .mockResolvedValueOnce({ error: null }) // eq #2: delete chain (terminal)

      // single() after fetch chain
      mockSupabase.single.mockResolvedValueOnce({
        data: mockAttachment,
        error: null,
      })

      const request = new Request(
        `http://localhost:3000/api/todos/${TEST_TODO_ID}/attachments/${TEST_ATTACHMENT_ID}`,
        { method: 'DELETE' }
      )

      const response = await DELETE(request, mockContext)
      const data = await response.json()

      expect(mockStorageRemove).toHaveBeenCalledWith([mockAttachment.file_path])
      expect(mockSupabase.from).toHaveBeenCalledWith('todo_attachments')
      expect(data).toEqual({ success: true })
      expect(response.status).toBe(200)
    })

    it('should return 401 if user is not authenticated', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'Unauthorized' },
      })

      const request = new Request(
        `http://localhost:3000/api/todos/${TEST_TODO_ID}/attachments/${TEST_ATTACHMENT_ID}`,
        { method: 'DELETE' }
      )

      const response = await DELETE(request, mockContext)
      const data = await response.json()

      expect(data).toEqual({ error: 'Unauthorized' })
      expect(response.status).toBe(401)
      expect(mockSupabase.delete).not.toHaveBeenCalled()
    })

    it('should return 404 if attachment not found', async () => {
      mockSupabase.single.mockResolvedValueOnce({
        data: null,
        error: { message: 'Not found' },
      })

      const request = new Request(
        `http://localhost:3000/api/todos/${TEST_TODO_ID}/attachments/${TEST_ATTACHMENT_ID}`,
        { method: 'DELETE' }
      )

      const response = await DELETE(request, mockContext)
      const data = await response.json()

      expect(data).toEqual({ error: 'Attachment not found' })
      expect(response.status).toBe(404)
    })

    it('should handle storage deletion errors', async () => {
      const mockAttachment = {
        id: TEST_ATTACHMENT_ID,
        file_path: `${TEST_USER_ID}/${TEST_TODO_ID}/photo.jpg`,
      }

      mockSupabase.single.mockResolvedValueOnce({
        data: mockAttachment,
        error: null,
      })

      mockStorageRemove.mockResolvedValue({
        error: { message: 'Storage error' },
      })

      const request = new Request(
        `http://localhost:3000/api/todos/${TEST_TODO_ID}/attachments/${TEST_ATTACHMENT_ID}`,
        { method: 'DELETE' }
      )

      const response = await DELETE(request, mockContext)
      const data = await response.json()

      expect(data).toEqual({ error: 'Storage error' })
      expect(response.status).toBe(500)
    })
  })
})
