import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import userEvent from '@testing-library/user-event'
import CategoryFilter from '@/components/categories/CategoryFilter'
import type { Category } from '@/lib/types'

describe('CategoryFilter', () => {
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
    const onSelect = jest.fn()
    const { container } = render(
      <CategoryFilter categories={[]} selectedCategoryId={null} onSelect={onSelect} />
    )

    expect(container.firstChild).toBeNull()
  })

  it('should render "All" button and category buttons', () => {
    const onSelect = jest.fn()
    render(
      <CategoryFilter categories={mockCategories} selectedCategoryId={null} onSelect={onSelect} />
    )

    expect(screen.getByText('All')).toBeInTheDocument()
    expect(screen.getByText('Work')).toBeInTheDocument()
    expect(screen.getByText('Personal')).toBeInTheDocument()
    expect(screen.getByText('Urgent')).toBeInTheDocument()
  })

  it('should call onSelect(null) when "All" is clicked', async () => {
    const user = userEvent.setup()
    const onSelect = jest.fn()
    render(
      <CategoryFilter categories={mockCategories} selectedCategoryId={'cat-1'} onSelect={onSelect} />
    )

    await user.click(screen.getByText('All'))

    expect(onSelect).toHaveBeenCalledWith(null)
  })

  it('should call onSelect with category id when a category is clicked', async () => {
    const user = userEvent.setup()
    const onSelect = jest.fn()
    render(
      <CategoryFilter categories={mockCategories} selectedCategoryId={null} onSelect={onSelect} />
    )

    await user.click(screen.getByText('Work'))

    expect(onSelect).toHaveBeenCalledWith('cat-1')
  })

  it('should call onSelect(null) when the active category is clicked (toggle off)', async () => {
    const user = userEvent.setup()
    const onSelect = jest.fn()
    render(
      <CategoryFilter categories={mockCategories} selectedCategoryId={'cat-2'} onSelect={onSelect} />
    )

    await user.click(screen.getByText('Personal'))

    expect(onSelect).toHaveBeenCalledWith(null)
  })

  it('should apply active styling to the selected category', () => {
    const onSelect = jest.fn()
    render(
      <CategoryFilter categories={mockCategories} selectedCategoryId={'cat-1'} onSelect={onSelect} />
    )

    const workButton = screen.getByText('Work')
    // Active blue category should have the filterActive classes
    expect(workButton).toHaveClass('bg-blue-200')

    const personalButton = screen.getByText('Personal')
    // Inactive green category should have the filter (non-active) classes
    expect(personalButton).toHaveClass('bg-green-50')
  })

  it('should apply active styling to "All" when no category is selected', () => {
    const onSelect = jest.fn()
    render(
      <CategoryFilter categories={mockCategories} selectedCategoryId={null} onSelect={onSelect} />
    )

    const allButton = screen.getByText('All')
    expect(allButton).toHaveClass('bg-gray-200')
  })

  it('should apply inactive styling to "All" when a category is selected', () => {
    const onSelect = jest.fn()
    render(
      <CategoryFilter categories={mockCategories} selectedCategoryId={'cat-1'} onSelect={onSelect} />
    )

    const allButton = screen.getByText('All')
    expect(allButton).toHaveClass('bg-gray-50')
  })
})
