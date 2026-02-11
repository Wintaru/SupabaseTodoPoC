import { GET, POST } from '@/app/api/todos/[id]/attachments/route'
import { createClient } from '@/lib/supabase/server'

jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(),
}))

describe('/api/todos/[id]/attachments', () => {
  let mockSupabase: any
  const TEST_USER_ID = 'test-user-id-123'
  const TEST_TODO_ID = 'test-todo-id-456'
  const mockContext = {
    params: Promise.resolve({ id: TEST_TODO_ID }),
  }

  beforeEach(() => {
    mockSupabase = {
      auth: {
        getUser: jest.fn(() => ({
          data: { user: { id: TEST_USER_ID } },
          error: null,
        })),
      },
      from: jest.fn(() => mockSupabase),
      select: jest.fn(() => mockSupabase),
      insert: jest.fn(() => mockSupabase),
      delete: jest.fn(() => mockSupabase),
      eq: jest.fn(() => mockSupabase),
      order: jest.fn(() => mockSupabase),
      single: jest.fn(() => mockSupabase),
      storage: {
        from: jest.fn(() => ({
          upload: jest.fn().mockResolvedValue({ data: { path: 'test-path' }, error: null }),
          getPublicUrl: jest.fn(() => ({
            data: { publicUrl: 'http://localhost:54321/storage/v1/object/public/todo-attachments/test-path' },
          })),
          remove: jest.fn().mockResolvedValue({ error: null }),
        })),
      },
    }
    ;(createClient as jest.Mock).mockResolvedValue(mockSupabase)
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('GET /api/todos/[id]/attachments', () => {
    it('should return attachments for a todo with public URLs', async () => {
      const mockAttachments = [
        {
          id: 'att-1',
          todo_id: TEST_TODO_ID,
          user_id: TEST_USER_ID,
          file_name: 'photo.jpg',
          file_path: `${TEST_USER_ID}/${TEST_TODO_ID}/photo.jpg`,
          file_size: 1024,
          content_type: 'image/jpeg',
          created_at: '2024-01-01T00:00:00Z',
        },
      ]

      mockSupabase.order.mockResolvedValue({
        data: mockAttachments,
        error: null,
      })

      const request = new Request(`http://localhost:3000/api/todos/${TEST_TODO_ID}/attachments`)
      const response = await GET(request, mockContext)
      const data = await response.json()

      expect(mockSupabase.from).toHaveBeenCalledWith('todo_attachments')
      expect(mockSupabase.eq).toHaveBeenCalledWith('todo_id', TEST_TODO_ID)
      expect(data).toHaveLength(1)
      expect(data[0].file_name).toBe('photo.jpg')
      expect(data[0].url).toBeDefined()
      expect(response.status).toBe(200)
    })

    it('should handle database errors', async () => {
      mockSupabase.order.mockResolvedValue({
        data: null,
        error: { message: 'Database error' },
      })

      const request = new Request(`http://localhost:3000/api/todos/${TEST_TODO_ID}/attachments`)
      const response = await GET(request, mockContext)
      const data = await response.json()

      expect(data).toEqual({ error: 'Database error' })
      expect(response.status).toBe(500)
    })
  })

  describe('POST /api/todos/[id]/attachments', () => {
    // Helper: create a request with a mocked formData() method
    // (whatwg-fetch polyfill in jest doesn't support FormData in Request bodies)
    function createRequestWithFormData(formData: FormData) {
      const request = new Request(`http://localhost:3000/api/todos/${TEST_TODO_ID}/attachments`, {
        method: 'POST',
      })
      request.formData = jest.fn().mockResolvedValue(formData)
      return request
    }

    it('should upload a file and return the attachment', async () => {
      const mockAttachment = {
        id: 'att-new',
        todo_id: TEST_TODO_ID,
        user_id: TEST_USER_ID,
        file_name: 'test.txt',
        file_path: `${TEST_USER_ID}/${TEST_TODO_ID}/test.txt`,
        file_size: 100,
        content_type: 'text/plain',
        created_at: '2024-01-01T00:00:00Z',
      }

      // eq() is called twice:
      // 1. .eq('id', todoId) in todo verification -> return mockSupabase for .single()
      // 2. .eq('todo_id', todoId) in count check -> terminal, returns count
      mockSupabase.eq
        .mockReturnValueOnce(mockSupabase)
        .mockResolvedValueOnce({ count: 0, error: null })

      // single() is called twice:
      // 1. After todo check -> returns todo
      // 2. After insert -> returns new attachment
      mockSupabase.single
        .mockResolvedValueOnce({ data: { id: TEST_TODO_ID }, error: null })
        .mockResolvedValueOnce({ data: mockAttachment, error: null })

      const fileContent = new Uint8Array([104, 101, 108, 108, 111]) // "hello"
      const file = new File([fileContent], 'test.txt', { type: 'text/plain' })
      // jsdom's File doesn't have arrayBuffer(), so add it
      file.arrayBuffer = jest.fn().mockResolvedValue(fileContent.buffer)
      const formData = new FormData()
      formData.append('file', file)
      const request = createRequestWithFormData(formData)

      const response = await POST(request, mockContext)
      const data = await response.json()

      expect(data.file_name).toBe('test.txt')
      expect(data.url).toBeDefined()
      expect(response.status).toBe(201)
    })

    it('should return 401 if user is not authenticated', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'Unauthorized' },
      })

      const formData = new FormData()
      formData.append('file', new File(['x'], 'test.txt', { type: 'text/plain' }))
      const request = createRequestWithFormData(formData)

      const response = await POST(request, mockContext)
      const data = await response.json()

      expect(data).toEqual({ error: 'Unauthorized' })
      expect(response.status).toBe(401)
    })

    it('should return 404 if todo does not exist', async () => {
      mockSupabase.single.mockResolvedValueOnce({
        data: null,
        error: { message: 'Not found' },
      })

      const formData = new FormData()
      formData.append('file', new File(['x'], 'test.txt', { type: 'text/plain' }))
      const request = createRequestWithFormData(formData)

      const response = await POST(request, mockContext)
      const data = await response.json()

      expect(data).toEqual({ error: 'Todo not found' })
      expect(response.status).toBe(404)
    })

    it('should return 400 if max attachments reached', async () => {
      mockSupabase.eq
        .mockReturnValueOnce(mockSupabase)
        .mockResolvedValueOnce({ count: 5, error: null })

      mockSupabase.single.mockResolvedValueOnce({
        data: { id: TEST_TODO_ID },
        error: null,
      })

      const formData = new FormData()
      formData.append('file', new File(['x'], 'test.txt', { type: 'text/plain' }))
      const request = createRequestWithFormData(formData)

      const response = await POST(request, mockContext)
      const data = await response.json()

      expect(data).toEqual({ error: 'Maximum 5 attachments per todo' })
      expect(response.status).toBe(400)
    })

    it('should return 400 if no file provided', async () => {
      mockSupabase.eq
        .mockReturnValueOnce(mockSupabase)
        .mockResolvedValueOnce({ count: 0, error: null })

      mockSupabase.single.mockResolvedValueOnce({
        data: { id: TEST_TODO_ID },
        error: null,
      })

      const formData = new FormData()
      const request = createRequestWithFormData(formData)

      const response = await POST(request, mockContext)
      const data = await response.json()

      expect(data).toEqual({ error: 'No file provided' })
      expect(response.status).toBe(400)
    })

    it('should return 400 if file exceeds 10MB', async () => {
      mockSupabase.eq
        .mockReturnValueOnce(mockSupabase)
        .mockResolvedValueOnce({ count: 0, error: null })

      mockSupabase.single.mockResolvedValueOnce({
        data: { id: TEST_TODO_ID },
        error: null,
      })

      const largeFile = new File(['x'], 'large.bin', { type: 'application/octet-stream' })
      Object.defineProperty(largeFile, 'size', { value: 11 * 1024 * 1024 })
      const formData = new FormData()
      formData.append('file', largeFile)
      const request = createRequestWithFormData(formData)

      const response = await POST(request, mockContext)
      const data = await response.json()

      expect(data).toEqual({ error: 'File size exceeds 10MB limit' })
      expect(response.status).toBe(400)
    })
  })
})
