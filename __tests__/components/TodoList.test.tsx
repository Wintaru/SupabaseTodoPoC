import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import userEvent from '@testing-library/user-event'
import TodoList from '@/components/todos/TodoList'
import { ConfirmDialogProvider } from '@/components/ui/ConfirmDialog'
import type { TodoWithCategories, Category } from '@/lib/types'

// Mock fetch
global.fetch = jest.fn()

// Mock AttachmentSection to avoid interference with fetch mocks
jest.mock('@/components/todos/AttachmentSection', () => {
  return function MockAttachmentSection() {
    return <div data-testid="attachment-section" />
  }
})

// Mock Supabase client
jest.mock('@/lib/supabase/client', () => ({
  createClient: jest.fn(() => ({
    channel: jest.fn(() => ({
      on: jest.fn().mockReturnThis(),
      subscribe: jest.fn((callback) => {
        // Call callback with SUBSCRIBED status
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
  })),
}))

function toLocalDateStr(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

describe('TodoList', () => {
  const mockCategories: Category[] = [
    {
      id: 'cat-1',
      name: 'Work',
      color: 'blue',
      user_id: 'test-user-id',
      tenant_id: null,
      created_at: '2024-01-01T00:00:00Z',
    },
  ]

  const mockTodos: TodoWithCategories[] = [
    {
      id: '1',
      title: 'Test Todo 1',
      description: 'Description 1',
      is_completed: false,
      priority: 'high',
      due_date: null,
      search_vector: null,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
      user_id: 'test-user-id',
      tenant_id: null,
      todo_categories: [{ category_id: 'cat-1', categories: mockCategories[0] }],
    },
    {
      id: '2',
      title: 'Test Todo 2',
      description: null,
      is_completed: true,
      priority: 'low',
      due_date: null,
      search_vector: null,
      created_at: '2024-01-02T00:00:00Z',
      updated_at: '2024-01-02T00:00:00Z',
      user_id: 'test-user-id',
      tenant_id: null,
      todo_categories: [],
    },
  ]

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should render the component with initial todos', () => {
    render(<TodoList initialTodos={mockTodos} initialCategories={mockCategories} />)

    expect(screen.getByText('Todo List')).toBeInTheDocument()
    expect(screen.getByText('Test Todo 1')).toBeInTheDocument()
    expect(screen.getByText('Test Todo 2')).toBeInTheDocument()
    expect(screen.getByText('Description 1')).toBeInTheDocument()
  })

  it('should display priority badges with correct colors', () => {
    render(<TodoList initialTodos={mockTodos} initialCategories={mockCategories} />)

    const highBadge = screen.getByText('high')
    const lowBadge = screen.getByText('low')

    expect(highBadge).toHaveClass('bg-red-100', 'text-red-800')
    expect(lowBadge).toHaveClass('bg-green-100', 'text-green-800')
  })

  it('should render empty state when no todos', () => {
    render(<TodoList initialTodos={[]} initialCategories={mockCategories} />)

    expect(screen.getByText('No todos yet. Add one above!')).toBeInTheDocument()
  })

  it('should show completed todos with line-through', () => {
    render(<TodoList initialTodos={mockTodos} initialCategories={mockCategories} />)

    const completedTodo = screen.getByText('Test Todo 2')
    expect(completedTodo).toHaveClass('line-through')
  })

  it('should add a new todo', async () => {
    const user = userEvent.setup()
    const newTodo: TodoWithCategories = {
      id: '3',
      title: 'New Todo',
      description: 'New Description',
      is_completed: false,
      priority: 'medium',
      due_date: null,
      search_vector: null,
      created_at: '2024-01-03T00:00:00Z',
      updated_at: '2024-01-03T00:00:00Z',
      user_id: 'test-user-id',
      tenant_id: null,
      todo_categories: [],
    }

    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => newTodo,
    })

    render(<TodoList initialTodos={[]} initialCategories={mockCategories} />)

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
        due_date: null,
        category_ids: [],
      }),
    })
  })

  it('should not add todo with empty title', async () => {
    const user = userEvent.setup()
    render(<TodoList initialTodos={[]} initialCategories={mockCategories} />)

    const submitButton = screen.getByRole('button', { name: /add todo/i })
    await user.click(submitButton)

    // Fetch should not be called
    expect(global.fetch).not.toHaveBeenCalled()
  })

  it('should clear form after adding todo', async () => {
    const user = userEvent.setup()
    const newTodo: TodoWithCategories = {
      id: '3',
      title: 'New Todo',
      description: 'New Description',
      is_completed: false,
      priority: 'high',
      due_date: null,
      search_vector: null,
      created_at: '2024-01-03T00:00:00Z',
      updated_at: '2024-01-03T00:00:00Z',
      user_id: 'test-user-id',
      tenant_id: null,
      todo_categories: [],
    }

    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => newTodo,
    })

    render(<TodoList initialTodos={[]} initialCategories={mockCategories} />)

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
    const updatedTodo: TodoWithCategories = {
      ...mockTodos[0],
      is_completed: true,
    }

    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => updatedTodo,
    })

    render(<TodoList initialTodos={mockTodos} initialCategories={mockCategories} />)

    // Wait for session to load so owner controls appear
    const checkboxes = await screen.findAllByRole('checkbox')
    const checkbox = checkboxes[0]
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

    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
    })

    render(
      <ConfirmDialogProvider>
        <TodoList initialTodos={mockTodos} initialCategories={mockCategories} />
        </ConfirmDialogProvider>
    )

    // Wait for session to load so owner controls appear
    const deleteButtons = await screen.findAllByRole('button', { name: /delete/i })
    await user.click(deleteButtons[0])

    // Confirm dialog should appear
    expect(screen.getByText('Are you sure you want to delete this todo?')).toBeInTheDocument()

    // Click confirm
    await user.click(screen.getByRole('button', { name: /confirm/i }))

    await waitFor(() => {
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

    render(
      <ConfirmDialogProvider>
        <TodoList initialTodos={mockTodos} initialCategories={mockCategories} />
        </ConfirmDialogProvider>
    )

    // Wait for session to load so owner controls appear
    const deleteButtons = await screen.findAllByRole('button', { name: /delete/i })
    await user.click(deleteButtons[0])

    // Confirm dialog should appear
    expect(screen.getByText('Are you sure you want to delete this todo?')).toBeInTheDocument()

    // Click cancel
    await user.click(screen.getByRole('button', { name: /cancel/i }))

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

    render(<TodoList initialTodos={[]} initialCategories={mockCategories} />)

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
        search_vector: null,
        created_at: '2024-01-03T00:00:00Z',
        updated_at: '2024-01-03T00:00:00Z',
        user_id: 'test-user-id',
        tenant_id: null,
        todo_categories: [],
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

    render(<TodoList initialTodos={[]} initialCategories={mockCategories} />)

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
    render(<TodoList initialTodos={[]} initialCategories={mockCategories} />)

    const prioritySelect = screen.getByLabelText(/priority/i)
    const options = within(prioritySelect).getAllByRole('option')

    expect(options).toHaveLength(3)
    expect(options[0]).toHaveValue('low')
    expect(options[1]).toHaveValue('medium')
    expect(options[2]).toHaveValue('high')
  })

  it('should render the due date input in the form', () => {
    render(<TodoList initialTodos={[]} initialCategories={mockCategories} />)

    const dueDateInput = screen.getByLabelText(/due date/i)
    expect(dueDateInput).toBeInTheDocument()
    expect(dueDateInput).toHaveAttribute('type', 'date')
  })

  it('should submit a todo with a due date', async () => {
    const user = userEvent.setup()
    const newTodo: TodoWithCategories = {
      id: '3',
      title: 'Todo with date',
      description: null,
      is_completed: false,
      priority: 'medium',
      due_date: '2026-03-15',
      search_vector: null,
      created_at: '2024-01-03T00:00:00Z',
      updated_at: '2024-01-03T00:00:00Z',
      user_id: 'test-user-id',
      tenant_id: null,
      todo_categories: [],
    }

    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => newTodo,
    })

    render(<TodoList initialTodos={[]} initialCategories={mockCategories} />)

    const titleInput = screen.getByLabelText(/title/i)
    const dueDateInput = screen.getByLabelText(/due date/i)

    await user.type(titleInput, 'Todo with date')
    fireEvent.change(dueDateInput, { target: { value: '2026-03-15' } })

    const submitButton = screen.getByRole('button', { name: /add todo/i })
    await user.click(submitButton)

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/todos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: 'Todo with date',
          description: '',
          priority: 'medium',
          due_date: '2026-03-15',
          category_ids: [],
        }),
      })
    })
  })

  it('should display overdue badge for past due dates', () => {
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    const yesterdayStr = toLocalDateStr(yesterday)

    const todosWithDueDate: TodoWithCategories[] = [
      {
        ...mockTodos[0],
        due_date: yesterdayStr,
      },
    ]

    render(<TodoList initialTodos={todosWithDueDate} initialCategories={mockCategories} />)

    expect(screen.getByText(/overdue/i)).toBeInTheDocument()
  })

  it('should display due today badge for todos due today', () => {
    const todayStr = toLocalDateStr(new Date())

    const todosWithDueDate: TodoWithCategories[] = [
      {
        ...mockTodos[0],
        due_date: todayStr,
      },
    ]

    render(<TodoList initialTodos={todosWithDueDate} initialCategories={mockCategories} />)

    expect(screen.getByText('Due today')).toBeInTheDocument()
  })

  it('should display upcoming badge for future due dates', () => {
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    const tomorrowStr = toLocalDateStr(tomorrow)

    const todosWithDueDate: TodoWithCategories[] = [
      {
        ...mockTodos[0],
        due_date: tomorrowStr,
      },
    ]

    render(<TodoList initialTodos={todosWithDueDate} initialCategories={mockCategories} />)

    expect(screen.getByText(/due:/i)).toBeInTheDocument()
  })

  it('should not display due date badge when due_date is null', () => {
    render(<TodoList initialTodos={mockTodos} initialCategories={mockCategories} />)

    expect(screen.queryByText(/overdue/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/due today/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/due:/i)).not.toBeInTheDocument()
  })

  it('should clear due date input after adding todo', async () => {
    const user = userEvent.setup()
    const newTodo: TodoWithCategories = {
      id: '3',
      title: 'New Todo',
      description: null,
      is_completed: false,
      priority: 'medium',
      due_date: '2026-03-15',
      search_vector: null,
      created_at: '2024-01-03T00:00:00Z',
      updated_at: '2024-01-03T00:00:00Z',
      user_id: 'test-user-id',
      tenant_id: null,
      todo_categories: [],
    }

    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => newTodo,
    })

    render(<TodoList initialTodos={[]} initialCategories={mockCategories} />)

    const titleInput = screen.getByLabelText(/title/i)
    const dueDateInput = screen.getByLabelText(/due date/i) as HTMLInputElement

    await user.type(titleInput, 'New Todo')
    fireEvent.change(dueDateInput, { target: { value: '2026-03-15' } })

    const submitButton = screen.getByRole('button', { name: /add todo/i })
    await user.click(submitButton)

    await waitFor(() => {
      expect(dueDateInput.value).toBe('')
    })
  })

  // --- Ownership tests ---

  it('should hide delete button and checkbox for todos not owned by current user', async () => {
    const sharedTodos: TodoWithCategories[] = [
      {
        id: 'shared-1',
        title: 'Shared Todo',
        description: 'From a teammate',
        is_completed: false,
        priority: 'medium',
        due_date: null,
        search_vector: null,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
        user_id: 'other-user-id',
        tenant_id: 'tenant-1',
        todo_categories: [],
      },
    ]

    render(<TodoList initialTodos={sharedTodos} initialCategories={mockCategories} />)

    // Wait for session to load
    await waitFor(() => {
      expect(screen.getByText('Shared Todo')).toBeInTheDocument()
    })

    // No checkboxes or delete buttons for non-owned todos
    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /delete/i })).not.toBeInTheDocument()

    // Attachment section is still rendered (read-only) for shared todos
    expect(screen.getByTestId('attachment-section')).toBeInTheDocument()
  })

  it('should show owner controls for own todos and hide for shared todos', async () => {
    const mixedTodos: TodoWithCategories[] = [
      {
        id: 'own-1',
        title: 'My Todo',
        description: null,
        is_completed: false,
        priority: 'medium',
        due_date: null,
        search_vector: null,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
        user_id: 'test-user-id',
        tenant_id: 'tenant-1',
        todo_categories: [],
      },
      {
        id: 'shared-1',
        title: 'Teammate Todo',
        description: null,
        is_completed: false,
        priority: 'high',
        due_date: null,
        search_vector: null,
        created_at: '2024-01-02T00:00:00Z',
        updated_at: '2024-01-02T00:00:00Z',
        user_id: 'other-user-id',
        tenant_id: 'tenant-1',
        todo_categories: [],
      },
    ]

    render(<TodoList initialTodos={mixedTodos} initialCategories={mockCategories} />)

    // Wait for session to load and own todo's checkbox to appear
    const checkboxes = await screen.findAllByRole('checkbox')
    expect(checkboxes).toHaveLength(1) // Only own todo has checkbox

    // Only one delete button (for own todo)
    const deleteButtons = screen.getAllByRole('button', { name: /delete/i })
    expect(deleteButtons).toHaveLength(1)

    // Both todos are rendered
    expect(screen.getByText('My Todo')).toBeInTheDocument()
    expect(screen.getByText('Teammate Todo')).toBeInTheDocument()
  })

  // --- Search functionality tests ---

  it('should render the search input', () => {
    render(<TodoList initialTodos={mockTodos} initialCategories={mockCategories} />)

    const searchInput = screen.getByLabelText(/search todos/i)
    expect(searchInput).toBeInTheDocument()
    expect(searchInput).toHaveAttribute('type', 'search')
  })

  it('should call API with search query after debounce', async () => {
    jest.useFakeTimers()
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime })

    const searchResults: TodoWithCategories[] = [
      {
        id: '1',
        title: 'Test Todo 1',
        description: 'Description 1',
        is_completed: false,
        priority: 'high',
        due_date: null,
        search_vector: null,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
        user_id: 'test-user-id',
        tenant_id: null,
        todo_categories: [],
      },
    ]

    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => searchResults,
    })

    render(<TodoList initialTodos={mockTodos} initialCategories={mockCategories} />)

    const searchInput = screen.getByLabelText(/search todos/i)
    await user.type(searchInput, 'test')

    jest.advanceTimersByTime(300)

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/todos?q=test',
        undefined
      )
    })

    jest.useRealTimers()
  })

  it('should show "No todos match your search." when search returns empty', async () => {
    jest.useFakeTimers()
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime })

    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => [],
    })

    render(<TodoList initialTodos={mockTodos} initialCategories={mockCategories} />)

    const searchInput = screen.getByLabelText(/search todos/i)
    await user.type(searchInput, 'nonexistent')

    jest.advanceTimersByTime(300)

    await waitFor(() => {
      expect(screen.getByText('No todos match your search.')).toBeInTheDocument()
    })

    jest.useRealTimers()
  })

  it('should clear search and show all todos when clear button is clicked', async () => {
    jest.useFakeTimers()
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime })

    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => [mockTodos[0]],
    })

    render(<TodoList initialTodos={mockTodos} initialCategories={mockCategories} />)

    const searchInput = screen.getByLabelText(/search todos/i)
    await user.type(searchInput, 'test')

    jest.advanceTimersByTime(300)

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalled()
    })

    const clearButton = screen.getByLabelText(/clear search/i)
    await user.click(clearButton)

    expect(screen.getByText('Test Todo 1')).toBeInTheDocument()
    expect(screen.getByText('Test Todo 2')).toBeInTheDocument()

    jest.useRealTimers()
  })

  it('should show searching indicator while search is in progress', async () => {
    jest.useFakeTimers()
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime })

    let resolveSearch!: (value: unknown) => void
    ;(global.fetch as jest.Mock).mockReturnValueOnce(
      new Promise((resolve) => { resolveSearch = resolve })
    )

    render(<TodoList initialTodos={mockTodos} initialCategories={mockCategories} />)

    const searchInput = screen.getByLabelText(/search todos/i)
    await user.type(searchInput, 'test')

    jest.advanceTimersByTime(300)

    expect(screen.getByText('Searching...')).toBeInTheDocument()

    resolveSearch({ ok: true, json: async () => mockTodos })

    await waitFor(() => {
      expect(screen.queryByText('Searching...')).not.toBeInTheDocument()
    })

    jest.useRealTimers()
  })
})

function within(element: HTMLElement) {
  return {
    getAllByRole: (role: string) => {
      return Array.from(element.querySelectorAll(`option`))
    },
  }
}
