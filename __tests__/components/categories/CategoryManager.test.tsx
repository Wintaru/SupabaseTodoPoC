import { render, screen, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import userEvent from '@testing-library/user-event'
import CategoryManager from '@/components/categories/CategoryManager'
import type { Category } from '@/lib/types'

// Mock fetch (used by apiFetch internally)
global.fetch = jest.fn()

// Track the most recent confirm mock so tests can control it
let confirmMockFn: jest.Mock

jest.mock('@/components/ui/ConfirmDialog', () => ({
  useConfirm: () => {
    // Return the test-controlled confirm function
    return confirmMockFn
  },
}))

describe('CategoryManager', () => {
  const mockCategories: Category[] = [
    {
      id: 'cat-1',
      name: 'Work',
      color: 'blue',
      user_id: 'test-user-id',
      tenant_id: null,
      created_at: '2024-01-01T00:00:00Z',
    },
    {
      id: 'cat-2',
      name: 'Personal',
      color: 'green',
      user_id: 'test-user-id',
      tenant_id: null,
      created_at: '2024-01-02T00:00:00Z',
    },
  ]

  beforeEach(() => {
    jest.clearAllMocks()
    confirmMockFn = jest.fn().mockResolvedValue(true)
  })

  it('should render toggle button with category count', () => {
    render(
      <CategoryManager
        categories={mockCategories}
        currentUserId="test-user-id"
        onCategoryCreated={jest.fn()}
        onCategoryUpdated={jest.fn()}
        onCategoryDeleted={jest.fn()}
      />
    )

    expect(screen.getByText(/Manage Categories \(2\)/)).toBeInTheDocument()
  })

  it('should render toggle button with zero count when no categories', () => {
    render(
      <CategoryManager
        categories={[]}
        currentUserId="test-user-id"
        onCategoryCreated={jest.fn()}
        onCategoryUpdated={jest.fn()}
        onCategoryDeleted={jest.fn()}
      />
    )

    expect(screen.getByText(/Manage Categories \(0\)/)).toBeInTheDocument()
  })

  it('should expand and collapse on toggle click', async () => {
    const user = userEvent.setup()
    render(
      <CategoryManager
        categories={mockCategories}
        currentUserId="test-user-id"
        onCategoryCreated={jest.fn()}
        onCategoryUpdated={jest.fn()}
        onCategoryDeleted={jest.fn()}
      />
    )

    // Initially collapsed - form and list should not be visible
    expect(screen.queryByPlaceholderText('Category name')).not.toBeInTheDocument()

    // Click to expand
    await user.click(screen.getByText(/Manage Categories/))

    // Form and categories should now be visible
    expect(screen.getByPlaceholderText('Category name')).toBeInTheDocument()
    expect(screen.getByText('Work')).toBeInTheDocument()
    expect(screen.getByText('Personal')).toBeInTheDocument()

    // Click to collapse
    await user.click(screen.getByText(/Manage Categories/))

    expect(screen.queryByPlaceholderText('Category name')).not.toBeInTheDocument()
  })

  it('should show "No categories yet." when expanded with empty categories', async () => {
    const user = userEvent.setup()
    render(
      <CategoryManager
        categories={[]}
        currentUserId="test-user-id"
        onCategoryCreated={jest.fn()}
        onCategoryUpdated={jest.fn()}
        onCategoryDeleted={jest.fn()}
      />
    )

    await user.click(screen.getByText(/Manage Categories/))

    expect(screen.getByText('No categories yet.')).toBeInTheDocument()
  })

  it('should create a new category', async () => {
    const user = userEvent.setup()
    const onCategoryCreated = jest.fn()
    const newCategory: Category = {
      id: 'cat-new',
      name: 'Shopping',
      color: 'red',
      user_id: 'test-user-id',
      tenant_id: null,
      created_at: '2024-01-10T00:00:00Z',
    }

    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => newCategory,
    })

    render(
      <CategoryManager
        categories={mockCategories}
        currentUserId="test-user-id"
        onCategoryCreated={onCategoryCreated}
        onCategoryUpdated={jest.fn()}
        onCategoryDeleted={jest.fn()}
      />
    )

    // Expand the manager
    await user.click(screen.getByText(/Manage Categories/))

    // Fill in the form
    const nameInput = screen.getByPlaceholderText('Category name')
    await user.type(nameInput, 'Shopping')

    // Select color
    const colorSelect = screen.getAllByRole('combobox')[0]
    await user.selectOptions(colorSelect, 'red')

    // Click Add button
    await user.click(screen.getByRole('button', { name: /add/i }))

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Shopping', color: 'red' }),
      })
    })

    await waitFor(() => {
      expect(onCategoryCreated).toHaveBeenCalledWith(newCategory)
    })

    // Form should be cleared after successful creation
    await waitFor(() => {
      expect((nameInput as HTMLInputElement).value).toBe('')
    })
  })

  it('should not create a category with empty name', async () => {
    const user = userEvent.setup()
    const onCategoryCreated = jest.fn()

    render(
      <CategoryManager
        categories={[]}
        currentUserId="test-user-id"
        onCategoryCreated={onCategoryCreated}
        onCategoryUpdated={jest.fn()}
        onCategoryDeleted={jest.fn()}
      />
    )

    // Expand the manager
    await user.click(screen.getByText(/Manage Categories/))

    // Try to submit with empty name
    const addButton = screen.getByRole('button', { name: /add/i })
    expect(addButton).toBeDisabled()

    expect(global.fetch).not.toHaveBeenCalled()
    expect(onCategoryCreated).not.toHaveBeenCalled()
  })

  it('should show edit form when Edit is clicked', async () => {
    const user = userEvent.setup()

    render(
      <CategoryManager
        categories={mockCategories}
        currentUserId="test-user-id"
        onCategoryCreated={jest.fn()}
        onCategoryUpdated={jest.fn()}
        onCategoryDeleted={jest.fn()}
      />
    )

    // Expand the manager
    await user.click(screen.getByText(/Manage Categories/))

    // Click Edit on the first category
    const editButtons = screen.getAllByRole('button', { name: /edit/i })
    await user.click(editButtons[0])

    // Edit form should appear with the category's current values
    const editInput = screen.getByDisplayValue('Work')
    expect(editInput).toBeInTheDocument()

    // Save and Cancel buttons should be visible
    expect(screen.getByRole('button', { name: /save/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument()
  })

  it('should save edited category', async () => {
    const user = userEvent.setup()
    const onCategoryUpdated = jest.fn()
    const updatedCategory: Category = {
      ...mockCategories[0],
      name: 'Work Tasks',
      color: 'purple',
    }

    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => updatedCategory,
    })

    render(
      <CategoryManager
        categories={mockCategories}
        currentUserId="test-user-id"
        onCategoryCreated={jest.fn()}
        onCategoryUpdated={onCategoryUpdated}
        onCategoryDeleted={jest.fn()}
      />
    )

    // Expand
    await user.click(screen.getByText(/Manage Categories/))

    // Click Edit on "Work"
    const editButtons = screen.getAllByRole('button', { name: /edit/i })
    await user.click(editButtons[0])

    // Change the name
    const editInput = screen.getByDisplayValue('Work')
    await user.clear(editInput)
    await user.type(editInput, 'Work Tasks')

    // Change the color
    // The edit form has its own select - get the last combobox (the edit one)
    const selects = screen.getAllByRole('combobox')
    const editColorSelect = selects[selects.length - 1]
    await user.selectOptions(editColorSelect, 'purple')

    // Click Save
    await user.click(screen.getByRole('button', { name: /save/i }))

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/categories/cat-1', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Work Tasks', color: 'purple' }),
      })
    })

    await waitFor(() => {
      expect(onCategoryUpdated).toHaveBeenCalledWith(updatedCategory)
    })
  })

  it('should cancel editing when Cancel is clicked', async () => {
    const user = userEvent.setup()

    render(
      <CategoryManager
        categories={mockCategories}
        currentUserId="test-user-id"
        onCategoryCreated={jest.fn()}
        onCategoryUpdated={jest.fn()}
        onCategoryDeleted={jest.fn()}
      />
    )

    // Expand
    await user.click(screen.getByText(/Manage Categories/))

    // Click Edit on "Work"
    const editButtons = screen.getAllByRole('button', { name: /edit/i })
    await user.click(editButtons[0])

    // Verify edit form is showing
    expect(screen.getByDisplayValue('Work')).toBeInTheDocument()

    // Click Cancel
    await user.click(screen.getByRole('button', { name: /cancel/i }))

    // Edit form should be gone, normal view should be back
    expect(screen.queryByDisplayValue('Work')).not.toBeInTheDocument()
    expect(screen.getByText('Work')).toBeInTheDocument()
    expect(global.fetch).not.toHaveBeenCalled()
  })

  it('should delete a category after confirmation', async () => {
    const user = userEvent.setup()
    const onCategoryDeleted = jest.fn()

    confirmMockFn.mockResolvedValue(true)

    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      status: 200,
    })

    render(
      <CategoryManager
        categories={mockCategories}
        currentUserId="test-user-id"
        onCategoryCreated={jest.fn()}
        onCategoryUpdated={jest.fn()}
        onCategoryDeleted={onCategoryDeleted}
      />
    )

    // Expand
    await user.click(screen.getByText(/Manage Categories/))

    // Click Delete on the first category ("Work")
    const deleteButtons = screen.getAllByRole('button', { name: /delete/i })
    await user.click(deleteButtons[0])

    await waitFor(() => {
      expect(confirmMockFn).toHaveBeenCalledWith(
        'Delete category "Work"? It will be removed from all todos.'
      )
    })

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/categories/cat-1', {
        method: 'DELETE',
      })
    })

    await waitFor(() => {
      expect(onCategoryDeleted).toHaveBeenCalledWith('cat-1')
    })
  })

  it('should not delete a category when confirmation is cancelled', async () => {
    const user = userEvent.setup()
    const onCategoryDeleted = jest.fn()

    confirmMockFn.mockResolvedValue(false)

    render(
      <CategoryManager
        categories={mockCategories}
        currentUserId="test-user-id"
        onCategoryCreated={jest.fn()}
        onCategoryUpdated={jest.fn()}
        onCategoryDeleted={onCategoryDeleted}
      />
    )

    // Expand
    await user.click(screen.getByText(/Manage Categories/))

    // Click Delete
    const deleteButtons = screen.getAllByRole('button', { name: /delete/i })
    await user.click(deleteButtons[0])

    await waitFor(() => {
      expect(confirmMockFn).toHaveBeenCalled()
    })

    expect(global.fetch).not.toHaveBeenCalled()
    expect(onCategoryDeleted).not.toHaveBeenCalled()
  })

  it('should show loading state while creating a category', async () => {
    const user = userEvent.setup()

    let resolvePromise: (value: unknown) => void
    const promise = new Promise((resolve) => {
      resolvePromise = resolve
    })

    ;(global.fetch as jest.Mock).mockReturnValueOnce(promise)

    render(
      <CategoryManager
        categories={[]}
        currentUserId="test-user-id"
        onCategoryCreated={jest.fn()}
        onCategoryUpdated={jest.fn()}
        onCategoryDeleted={jest.fn()}
      />
    )

    // Expand
    await user.click(screen.getByText(/Manage Categories/))

    // Fill in name
    await user.type(screen.getByPlaceholderText('Category name'), 'Test')

    // Submit
    await user.click(screen.getByRole('button', { name: /add/i }))

    // Should show loading state
    expect(screen.getByText('Adding...')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /adding/i })).toBeDisabled()

    // Resolve the promise
    resolvePromise!({
      ok: true,
      json: async () => ({
        id: 'cat-new',
        name: 'Test',
        color: 'red',
        user_id: 'test-user-id',
        created_at: '2024-01-10T00:00:00Z',
      }),
    })

    await waitFor(() => {
      expect(screen.getByText('Add')).toBeInTheDocument()
    })
  })

  it('should handle API errors gracefully when creating', async () => {
    const user = userEvent.setup()
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation()
    const onCategoryCreated = jest.fn()

    ;(global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'))

    render(
      <CategoryManager
        categories={[]}
        currentUserId="test-user-id"
        onCategoryCreated={onCategoryCreated}
        onCategoryUpdated={jest.fn()}
        onCategoryDeleted={jest.fn()}
      />
    )

    // Expand
    await user.click(screen.getByText(/Manage Categories/))

    // Fill in name and submit
    await user.type(screen.getByPlaceholderText('Category name'), 'Test')
    await user.click(screen.getByRole('button', { name: /add/i }))

    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith('Error creating category:', expect.any(Error))
    })

    expect(onCategoryCreated).not.toHaveBeenCalled()
    consoleSpy.mockRestore()
  })

  it('should hide edit and delete buttons for categories not owned by current user', async () => {
    const user = userEvent.setup()
    const otherUserCategories: Category[] = [
      {
        id: 'cat-other',
        name: 'Shared',
        color: 'purple',
        user_id: 'other-user-id',
        tenant_id: null,
        created_at: '2024-01-01T00:00:00Z',
      },
    ]

    render(
      <CategoryManager
        categories={otherUserCategories}
        currentUserId="test-user-id"
        onCategoryCreated={jest.fn()}
        onCategoryUpdated={jest.fn()}
        onCategoryDeleted={jest.fn()}
      />
    )

    // Expand
    await user.click(screen.getByText(/Manage Categories/))

    // Category name should be visible
    expect(screen.getByText('Shared')).toBeInTheDocument()

    // Edit and Delete buttons should NOT be rendered
    expect(screen.queryByRole('button', { name: /edit/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /delete/i })).not.toBeInTheDocument()
  })

  it('should handle API errors gracefully when deleting', async () => {
    const user = userEvent.setup()
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation()
    const onCategoryDeleted = jest.fn()

    confirmMockFn.mockResolvedValue(true)
    ;(global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'))

    render(
      <CategoryManager
        categories={mockCategories}
        currentUserId="test-user-id"
        onCategoryCreated={jest.fn()}
        onCategoryUpdated={jest.fn()}
        onCategoryDeleted={onCategoryDeleted}
      />
    )

    // Expand
    await user.click(screen.getByText(/Manage Categories/))

    // Click Delete
    const deleteButtons = screen.getAllByRole('button', { name: /delete/i })
    await user.click(deleteButtons[0])

    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith('Error deleting category:', expect.any(Error))
    })

    expect(onCategoryDeleted).not.toHaveBeenCalled()
    consoleSpy.mockRestore()
  })
})
