import { GET, PATCH, DELETE } from '@/app/api/todos/[id]/route'
import { createClient } from '@/lib/supabase/server'

jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(),
}))

describe('/api/todos/[id]', () => {
  let mockSupabase: any
  const TEST_USER_ID = 'test-user-id-123'
  const mockContext = {
    params: Promise.resolve({ id: 'test-id-123' }),
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
      update: jest.fn(() => mockSupabase),
      delete: jest.fn(() => mockSupabase),
      eq: jest.fn(() => mockSupabase),
      single: jest.fn(() => mockSupabase),
    }
    ;(createClient as jest.Mock).mockResolvedValue(mockSupabase)
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('GET /api/todos/[id]', () => {
    it('should return a specific todo', async () => {
      const mockTodo = {
        id: 'test-id-123',
        title: 'Test Todo',
        description: 'Test Description',
        is_completed: false,
        priority: 'medium',
        user_id: TEST_USER_ID,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      }

      mockSupabase.single.mockResolvedValue({
        data: mockTodo,
        error: null,
      })

      const request = new Request('http://localhost:3000/api/todos/test-id-123')
      const response = await GET(request, mockContext)
      const data = await response.json()

      expect(mockSupabase.from).toHaveBeenCalledWith('todos')
      expect(mockSupabase.select).toHaveBeenCalledWith('*')
      expect(mockSupabase.eq).toHaveBeenCalledWith('id', 'test-id-123')
      expect(data).toEqual(mockTodo)
      expect(response.status).toBe(200)
    })

    it('should return 404 if todo not found', async () => {
      mockSupabase.single.mockResolvedValue({
        data: null,
        error: { message: 'Todo not found' },
      })

      const request = new Request('http://localhost:3000/api/todos/nonexistent')
      const response = await GET(request, mockContext)
      const data = await response.json()

      expect(data).toEqual({ error: 'Todo not found' })
      expect(response.status).toBe(404)
    })
  })

  describe('PATCH /api/todos/[id]', () => {
    it('should update a todo with valid data', async () => {
      const updatedTodo = {
        id: 'test-id-123',
        title: 'Updated Todo',
        description: 'Updated Description',
        is_completed: true,
        priority: 'high',
        user_id: TEST_USER_ID,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-02T00:00:00Z',
      }

      mockSupabase.single.mockResolvedValue({
        data: updatedTodo,
        error: null,
      })

      const request = new Request('http://localhost:3000/api/todos/test-id-123', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: 'Updated Todo',
          description: 'Updated Description',
          is_completed: true,
          priority: 'high',
        }),
      })

      const response = await PATCH(request, mockContext)
      const data = await response.json()

      expect(mockSupabase.from).toHaveBeenCalledWith('todos')
      expect(mockSupabase.update).toHaveBeenCalledWith({
        title: 'Updated Todo',
        description: 'Updated Description',
        is_completed: true,
        priority: 'high',
      })
      expect(mockSupabase.eq).toHaveBeenCalledWith('id', 'test-id-123')
      expect(data).toEqual(updatedTodo)
      expect(response.status).toBe(200)
    })

    it('should return 401 if user is not authenticated', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'Unauthorized' },
      })

      const request = new Request('http://localhost:3000/api/todos/test-id-123', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: 'Updated',
        }),
      })

      const response = await PATCH(request, mockContext)
      const data = await response.json()

      expect(data).toEqual({ error: 'Unauthorized' })
      expect(response.status).toBe(401)
      expect(mockSupabase.update).not.toHaveBeenCalled()
    })

    it('should reject empty title', async () => {
      const request = new Request('http://localhost:3000/api/todos/test-id-123', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: '',
        }),
      })

      const response = await PATCH(request, mockContext)
      const data = await response.json()

      expect(data).toEqual({ error: 'Title cannot be empty' })
      expect(response.status).toBe(400)
    })

    it('should allow partial updates', async () => {
      mockSupabase.single.mockResolvedValue({
        data: {},
        error: null,
      })

      const request = new Request('http://localhost:3000/api/todos/test-id-123', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          is_completed: true,
        }),
      })

      await PATCH(request, mockContext)

      expect(mockSupabase.update).toHaveBeenCalledWith({
        is_completed: true,
      })
    })

    it('should update only priority', async () => {
      mockSupabase.single.mockResolvedValue({
        data: {},
        error: null,
      })

      const request = new Request('http://localhost:3000/api/todos/test-id-123', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          priority: 'low',
        }),
      })

      await PATCH(request, mockContext)

      expect(mockSupabase.update).toHaveBeenCalledWith({
        priority: 'low',
      })
    })

    it('should trim whitespace', async () => {
      mockSupabase.single.mockResolvedValue({
        data: {},
        error: null,
      })

      const request = new Request('http://localhost:3000/api/todos/test-id-123', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: '  Trimmed  ',
          description: '  Also Trimmed  ',
        }),
      })

      await PATCH(request, mockContext)

      expect(mockSupabase.update).toHaveBeenCalledWith({
        title: 'Trimmed',
        description: 'Also Trimmed',
      })
    })

    it('should handle database errors', async () => {
      mockSupabase.single.mockResolvedValue({
        data: null,
        error: { message: 'Database error' },
      })

      const request = new Request('http://localhost:3000/api/todos/test-id-123', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: 'Updated',
        }),
      })

      const response = await PATCH(request, mockContext)
      const data = await response.json()

      expect(data).toEqual({ error: 'Database error' })
      expect(response.status).toBe(404)
    })
  })

  describe('DELETE /api/todos/[id]', () => {
    it('should delete a todo', async () => {
      mockSupabase.eq.mockResolvedValue({
        error: null,
      })

      const request = new Request('http://localhost:3000/api/todos/test-id-123', {
        method: 'DELETE',
      })

      const response = await DELETE(request, mockContext)
      const data = await response.json()

      expect(mockSupabase.from).toHaveBeenCalledWith('todos')
      expect(mockSupabase.delete).toHaveBeenCalled()
      expect(mockSupabase.eq).toHaveBeenCalledWith('id', 'test-id-123')
      expect(data).toEqual({ success: true })
      expect(response.status).toBe(200)
    })

    it('should return 401 if user is not authenticated', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'Unauthorized' },
      })

      const request = new Request('http://localhost:3000/api/todos/test-id-123', {
        method: 'DELETE',
      })

      const response = await DELETE(request, mockContext)
      const data = await response.json()

      expect(data).toEqual({ error: 'Unauthorized' })
      expect(response.status).toBe(401)
      expect(mockSupabase.delete).not.toHaveBeenCalled()
    })

    it('should handle database errors', async () => {
      mockSupabase.eq.mockResolvedValue({
        error: { message: 'Database error' },
      })

      const request = new Request('http://localhost:3000/api/todos/test-id-123', {
        method: 'DELETE',
      })

      const response = await DELETE(request, mockContext)
      const data = await response.json()

      expect(data).toEqual({ error: 'Database error' })
      expect(response.status).toBe(404)
    })
  })
})
