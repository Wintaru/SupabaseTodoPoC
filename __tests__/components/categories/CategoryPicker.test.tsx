import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import userEvent from '@testing-library/user-event'
import CategoryPicker from '@/components/categories/CategoryPicker'
import type { Category } from '@/lib/types'

describe('CategoryPicker', () => {
  const mockCategories: Category[] = [
    {
      id: 'cat-1',
      name: 'Work',
      color: 'blue',
      user_id: 'test-user-id',
      created_at: '2024-01-01T00:00:00Z',
    },
    {
      id: 'cat-2',
      name: 'Personal',
      color: 'green',
      user_id: 'test-user-id',
      created_at: '2024-01-02T00:00:00Z',
    },
    {
      id: 'cat-3',
      name: 'Urgent',
      color: 'red',
      user_id: 'test-user-id',
      created_at: '2024-01-03T00:00:00Z',
    },
  ]

  it('should render nothing when categories is empty', () => {
    const onChange = jest.fn()
    const { container } = render(
      <CategoryPicker categories={[]} selectedIds={[]} onChange={onChange} />
    )

    expect(container.firstChild).toBeNull()
  })

  it('should show "Select categories..." when none selected', () => {
    const onChange = jest.fn()
    render(
      <CategoryPicker categories={mockCategories} selectedIds={[]} onChange={onChange} />
    )

    expect(screen.getByText('Select categories...')).toBeInTheDocument()
  })

  it('should show "N selected" when some categories are selected', () => {
    const onChange = jest.fn()
    render(
      <CategoryPicker categories={mockCategories} selectedIds={['cat-1', 'cat-2']} onChange={onChange} />
    )

    expect(screen.getByText('2 selected')).toBeInTheDocument()
  })

  it('should show "1 selected" when one category is selected', () => {
    const onChange = jest.fn()
    render(
      <CategoryPicker categories={mockCategories} selectedIds={['cat-3']} onChange={onChange} />
    )

    expect(screen.getByText('1 selected')).toBeInTheDocument()
  })

  it('should toggle dropdown open and closed on button click', async () => {
    const user = userEvent.setup()
    const onChange = jest.fn()
    render(
      <CategoryPicker categories={mockCategories} selectedIds={[]} onChange={onChange} />
    )

    // Dropdown should be closed initially - category names should not appear as labels
    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument()

    // Click to open
    await user.click(screen.getByText('Select categories...'))

    // Dropdown should now show checkboxes
    const checkboxes = screen.getAllByRole('checkbox')
    expect(checkboxes).toHaveLength(3)
    expect(screen.getByText('Work')).toBeInTheDocument()
    expect(screen.getByText('Personal')).toBeInTheDocument()
    expect(screen.getByText('Urgent')).toBeInTheDocument()

    // Click again to close
    await user.click(screen.getByText('Select categories...'))

    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument()
  })

  it('should call onChange with added category id when checking a category', async () => {
    const user = userEvent.setup()
    const onChange = jest.fn()
    render(
      <CategoryPicker categories={mockCategories} selectedIds={['cat-1']} onChange={onChange} />
    )

    // Open dropdown
    await user.click(screen.getByText('1 selected'))

    // Check "Personal" (cat-2)
    const checkboxes = screen.getAllByRole('checkbox')
    // Checkboxes are in order: Work (checked), Personal (unchecked), Urgent (unchecked)
    await user.click(checkboxes[1])

    expect(onChange).toHaveBeenCalledWith(['cat-1', 'cat-2'])
  })

  it('should call onChange with removed category id when unchecking a category', async () => {
    const user = userEvent.setup()
    const onChange = jest.fn()
    render(
      <CategoryPicker categories={mockCategories} selectedIds={['cat-1', 'cat-2']} onChange={onChange} />
    )

    // Open dropdown
    await user.click(screen.getByText('2 selected'))

    // Uncheck "Work" (cat-1) - first checkbox
    const checkboxes = screen.getAllByRole('checkbox')
    await user.click(checkboxes[0])

    expect(onChange).toHaveBeenCalledWith(['cat-2'])
  })

  it('should show checked state for selected categories', async () => {
    const user = userEvent.setup()
    const onChange = jest.fn()
    render(
      <CategoryPicker categories={mockCategories} selectedIds={['cat-1', 'cat-3']} onChange={onChange} />
    )

    // Open dropdown
    await user.click(screen.getByText('2 selected'))

    const checkboxes = screen.getAllByRole('checkbox') as HTMLInputElement[]
    expect(checkboxes[0]).toBeChecked() // Work (cat-1)
    expect(checkboxes[1]).not.toBeChecked() // Personal (cat-2)
    expect(checkboxes[2]).toBeChecked() // Urgent (cat-3)
  })
})
