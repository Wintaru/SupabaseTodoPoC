import { PATCH, DELETE } from '@/app/api/categories/[id]/route'
import { createClient } from '@/lib/supabase/server'

jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(),
}))

describe('/api/categories/[id]', () => {
  let mockSupabase: any
  const TEST_USER_ID = 'test-user-id-123'
  const mockContext = {
    params: Promise.resolve({ id: 'cat-id-123' }),
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

  describe('PATCH /api/categories/[id]', () => {
    it('should update a category with valid name and color', async () => {
      const updatedCategory = {
        id: 'cat-id-123',
        name: 'Updated Bug',
        color: 'blue',
        user_id: TEST_USER_ID,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-02T00:00:00Z',
      }

      mockSupabase.single.mockResolvedValue({
        data: updatedCategory,
        error: null,
      })

      const request = new Request('http://localhost:3000/api/categories/cat-id-123', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Updated Bug', color: 'blue' }),
      })

      const response = await PATCH(request, mockContext)
      const data = await response.json()

      expect(mockSupabase.from).toHaveBeenCalledWith('categories')
      expect(mockSupabase.update).toHaveBeenCalledWith({
        name: 'Updated Bug',
        color: 'blue',
      })
      expect(mockSupabase.eq).toHaveBeenCalledWith('id', 'cat-id-123')
      expect(data).toEqual(updatedCategory)
      expect(response.status).toBe(200)
    })

    it('should return 401 if user is not authenticated', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'Unauthorized' },
      })

      const request = new Request('http://localhost:3000/api/categories/cat-id-123', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Updated' }),
      })

      const response = await PATCH(request, mockContext)
      const data = await response.json()

      expect(data).toEqual({ error: 'Unauthorized' })
      expect(response.status).toBe(401)
      expect(mockSupabase.update).not.toHaveBeenCalled()
    })

    it('should reject empty name', async () => {
      const request = new Request('http://localhost:3000/api/categories/cat-id-123', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: '   ' }),
      })

      const response = await PATCH(request, mockContext)
      const data = await response.json()

      expect(data).toEqual({ error: 'Name cannot be empty' })
      expect(response.status).toBe(400)
    })

    it('should reject invalid color', async () => {
      const request = new Request('http://localhost:3000/api/categories/cat-id-123', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ color: 'neon-green' }),
      })

      const response = await PATCH(request, mockContext)
      const data = await response.json()

      expect(data).toEqual({ error: 'Invalid color' })
      expect(response.status).toBe(400)
    })

    it('should allow partial update with only name', async () => {
      mockSupabase.single.mockResolvedValue({
        data: { id: 'cat-id-123', name: 'Updated', color: 'red' },
        error: null,
      })

      const request = new Request('http://localhost:3000/api/categories/cat-id-123', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Updated' }),
      })

      await PATCH(request, mockContext)

      expect(mockSupabase.update).toHaveBeenCalledWith({ name: 'Updated' })
    })

    it('should allow partial update with only color', async () => {
      mockSupabase.single.mockResolvedValue({
        data: { id: 'cat-id-123', name: 'Bug', color: 'green' },
        error: null,
      })

      const request = new Request('http://localhost:3000/api/categories/cat-id-123', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ color: 'green' }),
      })

      await PATCH(request, mockContext)

      expect(mockSupabase.update).toHaveBeenCalledWith({ color: 'green' })
    })

    it('should trim whitespace from name', async () => {
      mockSupabase.single.mockResolvedValue({
        data: { id: 'cat-id-123', name: 'Trimmed', color: 'red' },
        error: null,
      })

      const request = new Request('http://localhost:3000/api/categories/cat-id-123', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: '  Trimmed  ' }),
      })

      await PATCH(request, mockContext)

      expect(mockSupabase.update).toHaveBeenCalledWith({ name: 'Trimmed' })
    })

    it('should return 409 on duplicate category name', async () => {
      mockSupabase.single.mockResolvedValue({
        data: null,
        error: { code: '23505', message: 'duplicate key value' },
      })

      const request = new Request('http://localhost:3000/api/categories/cat-id-123', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Existing Name' }),
      })

      const response = await PATCH(request, mockContext)
      const data = await response.json()

      expect(data).toEqual({ error: 'A category with this name already exists' })
      expect(response.status).toBe(409)
    })

    it('should handle database errors', async () => {
      mockSupabase.single.mockResolvedValue({
        data: null,
        error: { message: 'Database error' },
      })

      const request = new Request('http://localhost:3000/api/categories/cat-id-123', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Updated' }),
      })

      const response = await PATCH(request, mockContext)
      const data = await response.json()

      expect(data).toEqual({ error: 'Database error' })
      expect(response.status).toBe(404)
    })
  })

  describe('DELETE /api/categories/[id]', () => {
    it('should delete a category', async () => {
      mockSupabase.eq.mockResolvedValue({
        error: null,
      })

      const request = new Request('http://localhost:3000/api/categories/cat-id-123', {
        method: 'DELETE',
      })

      const response = await DELETE(request, mockContext)
      const data = await response.json()

      expect(mockSupabase.from).toHaveBeenCalledWith('categories')
      expect(mockSupabase.delete).toHaveBeenCalled()
      expect(mockSupabase.eq).toHaveBeenCalledWith('id', 'cat-id-123')
      expect(data).toEqual({ success: true })
      expect(response.status).toBe(200)
    })

    it('should return 401 if user is not authenticated', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'Unauthorized' },
      })

      const request = new Request('http://localhost:3000/api/categories/cat-id-123', {
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

      const request = new Request('http://localhost:3000/api/categories/cat-id-123', {
        method: 'DELETE',
      })

      const response = await DELETE(request, mockContext)
      const data = await response.json()

      expect(data).toEqual({ error: 'Database error' })
      expect(response.status).toBe(404)
    })
  })
})
