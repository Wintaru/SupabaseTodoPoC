import { GET, POST } from '@/app/api/categories/route'
import { createClient } from '@/lib/supabase/server'

jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(),
}))

describe('/api/categories', () => {
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
    }
    ;(createClient as jest.Mock).mockResolvedValue(mockSupabase)
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('GET /api/categories', () => {
    it('should return all categories ordered by name ascending', async () => {
      const mockCategories = [
        {
          id: 'cat-1',
          name: 'Bug',
          color: 'red',
          user_id: TEST_USER_ID,
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
        },
        {
          id: 'cat-2',
          name: 'Feature',
          color: 'blue',
          user_id: TEST_USER_ID,
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
        },
      ]

      mockSupabase.order.mockResolvedValue({
        data: mockCategories,
        error: null,
      })

      const response = await GET()
      const data = await response.json()

      expect(mockSupabase.from).toHaveBeenCalledWith('categories')
      expect(mockSupabase.select).toHaveBeenCalledWith('*')
      expect(mockSupabase.order).toHaveBeenCalledWith('name', { ascending: true })
      expect(data).toEqual(mockCategories)
      expect(response.status).toBe(200)
    })

    it('should return 401 if user is not authenticated', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'Unauthorized' },
      })

      const response = await GET()
      const data = await response.json()

      expect(data).toEqual({ error: 'Unauthorized' })
      expect(response.status).toBe(401)
      expect(mockSupabase.from).not.toHaveBeenCalled()
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

  describe('POST /api/categories', () => {
    it('should create a new category with valid data', async () => {
      const newCategory = {
        id: 'cat-1',
        name: 'Bug',
        color: 'red',
        user_id: TEST_USER_ID,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      }

      mockSupabase.single.mockResolvedValue({
        data: newCategory,
        error: null,
      })

      const request = new Request('http://localhost:3000/api/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Bug', color: 'red' }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(mockSupabase.from).toHaveBeenCalledWith('categories')
      expect(mockSupabase.insert).toHaveBeenCalledWith({
        name: 'Bug',
        color: 'red',
        user_id: TEST_USER_ID,
      })
      expect(data).toEqual(newCategory)
      expect(response.status).toBe(201)
    })

    it('should return 401 if user is not authenticated', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'Unauthorized' },
      })

      const request = new Request('http://localhost:3000/api/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Bug', color: 'red' }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(data).toEqual({ error: 'Unauthorized' })
      expect(response.status).toBe(401)
      expect(mockSupabase.insert).not.toHaveBeenCalled()
    })

    it('should reject missing name', async () => {
      const request = new Request('http://localhost:3000/api/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ color: 'red' }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(data).toEqual({ error: 'Name is required' })
      expect(response.status).toBe(400)
    })

    it('should reject empty name', async () => {
      const request = new Request('http://localhost:3000/api/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: '   ', color: 'red' }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(data).toEqual({ error: 'Name is required' })
      expect(response.status).toBe(400)
    })

    it('should reject invalid color', async () => {
      const request = new Request('http://localhost:3000/api/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Bug', color: 'neon-green' }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(data).toEqual({ error: 'Valid color is required' })
      expect(response.status).toBe(400)
    })

    it('should reject missing color', async () => {
      const request = new Request('http://localhost:3000/api/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Bug' }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(data).toEqual({ error: 'Valid color is required' })
      expect(response.status).toBe(400)
    })

    it('should trim whitespace from name', async () => {
      mockSupabase.single.mockResolvedValue({
        data: { id: 'cat-1', name: 'Bug', color: 'red' },
        error: null,
      })

      const request = new Request('http://localhost:3000/api/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: '  Bug  ', color: 'red' }),
      })

      await POST(request)

      expect(mockSupabase.insert).toHaveBeenCalledWith({
        name: 'Bug',
        color: 'red',
        user_id: TEST_USER_ID,
      })
    })

    it('should return 409 on duplicate category name', async () => {
      mockSupabase.single.mockResolvedValue({
        data: null,
        error: { code: '23505', message: 'duplicate key value' },
      })

      const request = new Request('http://localhost:3000/api/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Bug', color: 'red' }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(data).toEqual({ error: 'A category with this name already exists' })
      expect(response.status).toBe(409)
    })

    it('should handle database errors', async () => {
      mockSupabase.single.mockResolvedValue({
        data: null,
        error: { message: 'Database error' },
      })

      const request = new Request('http://localhost:3000/api/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Bug', color: 'red' }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(data).toEqual({ error: 'Database error' })
      expect(response.status).toBe(500)
    })
  })
})
