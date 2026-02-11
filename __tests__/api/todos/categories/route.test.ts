import { GET, POST } from '@/app/api/todos/[id]/categories/route'
import { createClient } from '@/lib/supabase/server'

jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(),
}))

describe('/api/todos/[id]/categories', () => {
  let mockSupabase: any
  const TEST_USER_ID = 'test-user-id-123'
  const mockContext = {
    params: Promise.resolve({ id: 'todo-id-123' }),
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
      eq: jest.fn(() => mockSupabase),
      single: jest.fn(() => mockSupabase),
    }
    ;(createClient as jest.Mock).mockResolvedValue(mockSupabase)
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('GET /api/todos/[id]/categories', () => {
    it('should return categories for a todo', async () => {
      const mockTodoCategories = [
        {
          category_id: 'cat-1',
          categories: {
            id: 'cat-1',
            name: 'Bug',
            color: 'red',
            user_id: TEST_USER_ID,
            created_at: '2024-01-01T00:00:00Z',
            updated_at: '2024-01-01T00:00:00Z',
          },
        },
        {
          category_id: 'cat-2',
          categories: {
            id: 'cat-2',
            name: 'Feature',
            color: 'blue',
            user_id: TEST_USER_ID,
            created_at: '2024-01-01T00:00:00Z',
            updated_at: '2024-01-01T00:00:00Z',
          },
        },
      ]

      mockSupabase.eq.mockResolvedValue({
        data: mockTodoCategories,
        error: null,
      })

      const request = new Request('http://localhost:3000/api/todos/todo-id-123/categories')
      const response = await GET(request, mockContext)
      const data = await response.json()

      expect(mockSupabase.from).toHaveBeenCalledWith('todo_categories')
      expect(mockSupabase.select).toHaveBeenCalledWith('category_id, categories(*)')
      expect(mockSupabase.eq).toHaveBeenCalledWith('todo_id', 'todo-id-123')
      expect(data).toEqual(mockTodoCategories)
      expect(response.status).toBe(200)
    })

    it('should return 401 if user is not authenticated', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'Unauthorized' },
      })

      const request = new Request('http://localhost:3000/api/todos/todo-id-123/categories')
      const response = await GET(request, mockContext)
      const data = await response.json()

      expect(data).toEqual({ error: 'Unauthorized' })
      expect(response.status).toBe(401)
      expect(mockSupabase.from).not.toHaveBeenCalled()
    })

    it('should handle database errors', async () => {
      mockSupabase.eq.mockResolvedValue({
        data: null,
        error: { message: 'Database error' },
      })

      const request = new Request('http://localhost:3000/api/todos/todo-id-123/categories')
      const response = await GET(request, mockContext)
      const data = await response.json()

      expect(data).toEqual({ error: 'Database error' })
      expect(response.status).toBe(500)
    })
  })

  describe('POST /api/todos/[id]/categories', () => {
    it('should assign a category to a todo', async () => {
      const mockAssignment = {
        category_id: 'cat-1',
        categories: {
          id: 'cat-1',
          name: 'Bug',
          color: 'red',
          user_id: TEST_USER_ID,
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
        },
      }

      mockSupabase.single.mockResolvedValue({
        data: mockAssignment,
        error: null,
      })

      const request = new Request('http://localhost:3000/api/todos/todo-id-123/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category_id: 'cat-1' }),
      })

      const response = await POST(request, mockContext)
      const data = await response.json()

      expect(mockSupabase.from).toHaveBeenCalledWith('todo_categories')
      expect(mockSupabase.insert).toHaveBeenCalledWith({
        todo_id: 'todo-id-123',
        category_id: 'cat-1',
      })
      expect(mockSupabase.select).toHaveBeenCalledWith('category_id, categories(*)')
      expect(data).toEqual(mockAssignment)
      expect(response.status).toBe(201)
    })

    it('should return 401 if user is not authenticated', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'Unauthorized' },
      })

      const request = new Request('http://localhost:3000/api/todos/todo-id-123/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category_id: 'cat-1' }),
      })

      const response = await POST(request, mockContext)
      const data = await response.json()

      expect(data).toEqual({ error: 'Unauthorized' })
      expect(response.status).toBe(401)
      expect(mockSupabase.insert).not.toHaveBeenCalled()
    })

    it('should reject missing category_id', async () => {
      const request = new Request('http://localhost:3000/api/todos/todo-id-123/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })

      const response = await POST(request, mockContext)
      const data = await response.json()

      expect(data).toEqual({ error: 'category_id is required' })
      expect(response.status).toBe(400)
    })

    it('should return 409 when category is already assigned to the todo', async () => {
      mockSupabase.single.mockResolvedValue({
        data: null,
        error: { code: '23505', message: 'duplicate key value' },
      })

      const request = new Request('http://localhost:3000/api/todos/todo-id-123/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category_id: 'cat-1' }),
      })

      const response = await POST(request, mockContext)
      const data = await response.json()

      expect(data).toEqual({ error: 'Category already assigned to this todo' })
      expect(response.status).toBe(409)
    })

    it('should handle database errors', async () => {
      mockSupabase.single.mockResolvedValue({
        data: null,
        error: { message: 'Database error' },
      })

      const request = new Request('http://localhost:3000/api/todos/todo-id-123/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category_id: 'cat-1' }),
      })

      const response = await POST(request, mockContext)
      const data = await response.json()

      expect(data).toEqual({ error: 'Database error' })
      expect(response.status).toBe(500)
    })
  })
})
