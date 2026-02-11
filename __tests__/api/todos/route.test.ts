import { GET, POST } from '@/app/api/todos/route'
import { createClient } from '@/lib/supabase/server'

// Mock Supabase client
jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(),
}))

describe('/api/todos', () => {
  let mockSupabase: any
  const TEST_USER_ID = 'test-user-id-123'

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
      order: jest.fn(() => mockSupabase),
      single: jest.fn(() => mockSupabase),
      eq: jest.fn(() => mockSupabase),
    }
    ;(createClient as jest.Mock).mockResolvedValue(mockSupabase)
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('GET /api/todos', () => {
    it('should return all todos ordered by created_at desc', async () => {
      const mockTodos = [
        {
          id: '1',
          title: 'Test Todo',
          description: 'Test Description',
          is_completed: false,
          priority: 'medium',
          user_id: TEST_USER_ID,
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
        },
      ]

      mockSupabase.order.mockResolvedValue({
        data: mockTodos,
        error: null,
      })

      const response = await GET()
      const data = await response.json()

      expect(mockSupabase.from).toHaveBeenCalledWith('todos')
      expect(mockSupabase.select).toHaveBeenCalledWith('*, todo_categories(category_id, categories(*))')
      expect(mockSupabase.order).toHaveBeenCalledWith('created_at', { ascending: false })
      expect(data).toEqual(mockTodos)
      expect(response.status).toBe(200)
    })

    it('should handle database errors', async () => {
      mockSupabase.order.mockResolvedValue({
        data: null,
        error: { message: 'Database error' },
      })

      const response = await GET()
      const data = await response.json()

      expect(data).toEqual({ error: 'Database error' })
      expect(response.status).toBe(500)
    })
  })

  describe('POST /api/todos', () => {
    it('should create a new todo with valid data', async () => {
      const newTodo = {
        id: '1',
        title: 'New Todo',
        description: 'New Description',
        is_completed: false,
        priority: 'high',
        user_id: TEST_USER_ID,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      }

      const todoWithCategories = {
        ...newTodo,
        todo_categories: [],
      }

      // First single() for insert, second single() for re-fetch
      mockSupabase.single
        .mockResolvedValueOnce({ data: newTodo, error: null })
        .mockResolvedValueOnce({ data: todoWithCategories, error: null })

      const request = new Request('http://localhost:3000/api/todos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: 'New Todo',
          description: 'New Description',
          priority: 'high',
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(mockSupabase.from).toHaveBeenCalledWith('todos')
      expect(mockSupabase.insert).toHaveBeenCalledWith({
        title: 'New Todo',
        description: 'New Description',
        is_completed: false,
        priority: 'high',
        due_date: null,
        user_id: TEST_USER_ID,
      })
      expect(data).toEqual(todoWithCategories)
      expect(response.status).toBe(201)
    })

    it('should return 401 if user is not authenticated', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'Unauthorized' },
      })

      const request = new Request('http://localhost:3000/api/todos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: 'New Todo',
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(data).toEqual({ error: 'Unauthorized' })
      expect(response.status).toBe(401)
      expect(mockSupabase.insert).not.toHaveBeenCalled()
    })

    it('should reject empty title', async () => {
      const request = new Request('http://localhost:3000/api/todos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: '',
          description: 'Description',
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(data).toEqual({ error: 'Title is required' })
      expect(response.status).toBe(400)
    })

    it('should use default priority if not provided', async () => {
      const newTodo = {
        id: '1',
        title: 'New Todo',
        description: null,
        is_completed: false,
        priority: 'medium',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      }

      mockSupabase.single
        .mockResolvedValueOnce({ data: newTodo, error: null })
        .mockResolvedValueOnce({ data: { ...newTodo, todo_categories: [] }, error: null })

      const request = new Request('http://localhost:3000/api/todos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: 'New Todo',
        }),
      })

      await POST(request)

      expect(mockSupabase.insert).toHaveBeenCalledWith({
        title: 'New Todo',
        description: null,
        is_completed: false,
        priority: 'medium',
        due_date: null,
        user_id: TEST_USER_ID,
      })
    })

    it('should trim whitespace from title and description', async () => {
      mockSupabase.single
        .mockResolvedValueOnce({ data: { id: '1' }, error: null })
        .mockResolvedValueOnce({ data: { id: '1', todo_categories: [] }, error: null })

      const request = new Request('http://localhost:3000/api/todos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: '  Trimmed Title  ',
          description: '  Trimmed Description  ',
        }),
      })

      await POST(request)

      expect(mockSupabase.insert).toHaveBeenCalledWith({
        title: 'Trimmed Title',
        description: 'Trimmed Description',
        is_completed: false,
        priority: 'medium',
        due_date: null,
        user_id: TEST_USER_ID,
      })
    })

    it('should create a todo with a due date', async () => {
      const newTodo = {
        id: '1',
        title: 'Todo with due date',
        description: null,
        is_completed: false,
        priority: 'medium',
        due_date: '2026-03-15T00:00:00Z',
        user_id: TEST_USER_ID,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      }

      mockSupabase.single
        .mockResolvedValueOnce({ data: newTodo, error: null })
        .mockResolvedValueOnce({ data: { ...newTodo, todo_categories: [] }, error: null })

      const request = new Request('http://localhost:3000/api/todos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: 'Todo with due date',
          due_date: '2026-03-15T00:00:00Z',
        }),
      })

      const response = await POST(request)

      expect(mockSupabase.insert).toHaveBeenCalledWith({
        title: 'Todo with due date',
        description: null,
        is_completed: false,
        priority: 'medium',
        due_date: '2026-03-15T00:00:00Z',
        user_id: TEST_USER_ID,
      })
      expect(response.status).toBe(201)
    })

    it('should handle database errors', async () => {
      mockSupabase.single.mockResolvedValue({
        data: null,
        error: { message: 'Database error' },
      })

      const request = new Request('http://localhost:3000/api/todos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: 'New Todo',
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(data).toEqual({ error: 'Database error' })
      expect(response.status).toBe(500)
    })
  })
})
