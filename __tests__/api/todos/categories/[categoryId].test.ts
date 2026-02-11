import { DELETE } from '@/app/api/todos/[id]/categories/[categoryId]/route'
import { createClient } from '@/lib/supabase/server'

jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(),
}))

describe('/api/todos/[id]/categories/[categoryId]', () => {
  let mockSupabase: any
  const TEST_USER_ID = 'test-user-id-123'
  const mockContext = {
    params: Promise.resolve({ id: 'todo-id-123', categoryId: 'cat-id-456' }),
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
      delete: jest.fn(() => mockSupabase),
      eq: jest.fn(() => mockSupabase),
    }
    ;(createClient as jest.Mock).mockResolvedValue(mockSupabase)
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('DELETE /api/todos/[id]/categories/[categoryId]', () => {
    it('should remove a category from a todo', async () => {
      // The second .eq() call is the terminal one that returns the result
      let eqCallCount = 0
      mockSupabase.eq.mockImplementation(() => {
        eqCallCount++
        if (eqCallCount >= 2) {
          return Promise.resolve({ error: null })
        }
        return mockSupabase
      })

      const request = new Request(
        'http://localhost:3000/api/todos/todo-id-123/categories/cat-id-456',
        { method: 'DELETE' }
      )

      const response = await DELETE(request, mockContext)
      const data = await response.json()

      expect(mockSupabase.from).toHaveBeenCalledWith('todo_categories')
      expect(mockSupabase.delete).toHaveBeenCalled()
      expect(mockSupabase.eq).toHaveBeenCalledWith('todo_id', 'todo-id-123')
      expect(mockSupabase.eq).toHaveBeenCalledWith('category_id', 'cat-id-456')
      expect(data).toEqual({ success: true })
      expect(response.status).toBe(200)
    })

    it('should return 401 if user is not authenticated', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'Unauthorized' },
      })

      const request = new Request(
        'http://localhost:3000/api/todos/todo-id-123/categories/cat-id-456',
        { method: 'DELETE' }
      )

      const response = await DELETE(request, mockContext)
      const data = await response.json()

      expect(data).toEqual({ error: 'Unauthorized' })
      expect(response.status).toBe(401)
      expect(mockSupabase.delete).not.toHaveBeenCalled()
    })

    it('should handle database errors', async () => {
      let eqCallCount = 0
      mockSupabase.eq.mockImplementation(() => {
        eqCallCount++
        if (eqCallCount >= 2) {
          return Promise.resolve({ error: { message: 'Database error' } })
        }
        return mockSupabase
      })

      const request = new Request(
        'http://localhost:3000/api/todos/todo-id-123/categories/cat-id-456',
        { method: 'DELETE' }
      )

      const response = await DELETE(request, mockContext)
      const data = await response.json()

      expect(data).toEqual({ error: 'Database error' })
      expect(response.status).toBe(500)
    })
  })
})
