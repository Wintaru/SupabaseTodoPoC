import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import userEvent from '@testing-library/user-event'
import TodoList from '@/components/todos/TodoList'
import type { Todo } from '@/lib/types'

// Mock fetch
global.fetch = jest.fn()

describe('TodoList', () => {
  const mockTodos: Todo[] = [
    {
      id: '1',
      title: 'Test Todo 1',
      description: 'Description 1',
      is_completed: false,
      priority: 'high',
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
      user_id: 'test-user-id',
    },
    {
      id: '2',
      title: 'Test Todo 2',
      description: null,
      is_completed: true,
      priority: 'low',
      created_at: '2024-01-02T00:00:00Z',
      updated_at: '2024-01-02T00:00:00Z',
      user_id: 'test-user-id',
    },
  ]

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should render the component with initial todos', () => {
    render(<TodoList initialTodos={mockTodos} />)

    expect(screen.getByText('Todo List')).toBeInTheDocument()
    expect(screen.getByText('Test Todo 1')).toBeInTheDocument()
    expect(screen.getByText('Test Todo 2')).toBeInTheDocument()
    expect(screen.getByText('Description 1')).toBeInTheDocument()
  })

  it('should display priority badges with correct colors', () => {
    render(<TodoList initialTodos={mockTodos} />)

    const highBadge = screen.getByText('high')
    const lowBadge = screen.getByText('low')

    expect(highBadge).toHaveClass('bg-red-100', 'text-red-800')
    expect(lowBadge).toHaveClass('bg-green-100', 'text-green-800')
  })

  it('should render empty state when no todos', () => {
    render(<TodoList initialTodos={[]} />)

    expect(screen.getByText('No todos yet. Add one above!')).toBeInTheDocument()
  })

  it('should show completed todos with line-through', () => {
    render(<TodoList initialTodos={mockTodos} />)

    const completedTodo = screen.getByText('Test Todo 2')
    expect(completedTodo).toHaveClass('line-through')
  })

  it('should add a new todo', async () => {
    const user = userEvent.setup()
    const newTodo: Todo = {
      id: '3',
      title: 'New Todo',
      description: 'New Description',
      is_completed: false,
      priority: 'medium',
      created_at: '2024-01-03T00:00:00Z',
      updated_at: '2024-01-03T00:00:00Z',
      user_id: 'test-user-id',
    }

    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => newTodo,
    })

    render(<TodoList initialTodos={[]} />)

    // Fill in the form
    const titleInput = screen.getByLabelText(/title/i)
    const descriptionInput = screen.getByLabelText(/description/i)
    const prioritySelect = screen.getByLabelText(/priority/i)

    await user.type(titleInput, 'New Todo')
    await user.type(descriptionInput, 'New Description')
    await user.selectOptions(prioritySelect, 'medium')

    // Submit the form
    const submitButton = screen.getByRole('button', { name: /add todo/i })
    await user.click(submitButton)

    // Wait for the todo to appear
    await waitFor(() => {
      expect(screen.getByText('New Todo')).toBeInTheDocument()
    })

    expect(global.fetch).toHaveBeenCalledWith('/api/todos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'New Todo',
        description: 'New Description',
        priority: 'medium',
      }),
    })
  })

  it('should not add todo with empty title', async () => {
    const user = userEvent.setup()
    render(<TodoList initialTodos={[]} />)

    const submitButton = screen.getByRole('button', { name: /add todo/i })
    await user.click(submitButton)

    // Fetch should not be called
    expect(global.fetch).not.toHaveBeenCalled()
  })

  it('should clear form after adding todo', async () => {
    const user = userEvent.setup()
    const newTodo: Todo = {
      id: '3',
      title: 'New Todo',
      description: 'New Description',
      is_completed: false,
      priority: 'high',
      created_at: '2024-01-03T00:00:00Z',
      updated_at: '2024-01-03T00:00:00Z',
      user_id: 'test-user-id',
    }

    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => newTodo,
    })

    render(<TodoList initialTodos={[]} />)

    const titleInput = screen.getByLabelText(/title/i) as HTMLInputElement
    const descriptionInput = screen.getByLabelText(/description/i) as HTMLTextAreaElement
    const prioritySelect = screen.getByLabelText(/priority/i) as HTMLSelectElement

    await user.type(titleInput, 'New Todo')
    await user.type(descriptionInput, 'New Description')
    await user.selectOptions(prioritySelect, 'high')

    const submitButton = screen.getByRole('button', { name: /add todo/i })
    await user.click(submitButton)

    await waitFor(() => {
      expect(titleInput.value).toBe('')
      expect(descriptionInput.value).toBe('')
      expect(prioritySelect.value).toBe('medium')
    })
  })

  it('should toggle todo completion', async () => {
    const user = userEvent.setup()
    const updatedTodo: Todo = {
      ...mockTodos[0],
      is_completed: true,
    }

    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => updatedTodo,
    })

    render(<TodoList initialTodos={mockTodos} />)

    const checkbox = screen.getAllByRole('checkbox')[0]
    await user.click(checkbox)

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/todos/1', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_completed: true }),
      })
    })
  })

  it('should delete todo with confirmation', async () => {
    const user = userEvent.setup()
    window.confirm = jest.fn(() => true)

    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
    })

    render(<TodoList initialTodos={mockTodos} />)

    const deleteButtons = screen.getAllByRole('button', { name: /delete/i })
    await user.click(deleteButtons[0])

    await waitFor(() => {
      expect(window.confirm).toHaveBeenCalledWith('Are you sure you want to delete this todo?')
      expect(global.fetch).toHaveBeenCalledWith('/api/todos/1', {
        method: 'DELETE',
      })
    })

    // Todo should be removed from the list
    await waitFor(() => {
      expect(screen.queryByText('Test Todo 1')).not.toBeInTheDocument()
    })
  })

  it('should not delete todo if confirmation cancelled', async () => {
    const user = userEvent.setup()
    window.confirm = jest.fn(() => false)

    render(<TodoList initialTodos={mockTodos} />)

    const deleteButtons = screen.getAllByRole('button', { name: /delete/i })
    await user.click(deleteButtons[0])

    expect(window.confirm).toHaveBeenCalled()
    expect(global.fetch).not.toHaveBeenCalled()
    expect(screen.getByText('Test Todo 1')).toBeInTheDocument()
  })

  it('should show loading state when adding todo', async () => {
    const user = userEvent.setup()

    let resolvePromise: (value: any) => void
    const promise = new Promise((resolve) => {
      resolvePromise = resolve
    })

    ;(global.fetch as jest.Mock).mockReturnValueOnce(promise)

    render(<TodoList initialTodos={[]} />)

    const titleInput = screen.getByLabelText(/title/i)
    await user.type(titleInput, 'New Todo')

    const submitButton = screen.getByRole('button', { name: /add todo/i })
    await user.click(submitButton)

    // Button should show loading state
    expect(screen.getByText('Adding...')).toBeInTheDocument()
    expect(submitButton).toBeDisabled()

    // Resolve the promise
    resolvePromise!({
      ok: true,
      json: async () => ({
        id: '3',
        title: 'New Todo',
        description: null,
        is_completed: false,
        priority: 'medium',
        created_at: '2024-01-03T00:00:00Z',
        updated_at: '2024-01-03T00:00:00Z',
        user_id: 'test-user-id',
      }),
    })

    await waitFor(() => {
      expect(screen.getByText('Add Todo')).toBeInTheDocument()
    })
  })

  it('should handle API errors gracefully', async () => {
    const user = userEvent.setup()
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation()

    ;(global.fetch as jest.Mock).mockRejectedValueOnce(new Error('API Error'))

    render(<TodoList initialTodos={[]} />)

    const titleInput = screen.getByLabelText(/title/i)
    await user.type(titleInput, 'New Todo')

    const submitButton = screen.getByRole('button', { name: /add todo/i })
    await user.click(submitButton)

    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith('Error adding todo:', expect.any(Error))
    })

    consoleSpy.mockRestore()
  })

  it('should render all priority options in select', () => {
    render(<TodoList initialTodos={[]} />)

    const prioritySelect = screen.getByLabelText(/priority/i)
    const options = within(prioritySelect).getAllByRole('option')

    expect(options).toHaveLength(3)
    expect(options[0]).toHaveValue('low')
    expect(options[1]).toHaveValue('medium')
    expect(options[2]).toHaveValue('high')
  })
})

function within(element: HTMLElement) {
  return {
    getAllByRole: (role: string) => {
      return Array.from(element.querySelectorAll(`option`))
    },
  }
}
