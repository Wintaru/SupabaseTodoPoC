# Test Suite

This directory contains tests for the Supabase + Next.js application.

## Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

## Test Structure

```
__tests__/
├── api/
│   └── todos/
│       ├── route.test.ts          # Tests for /api/todos endpoints
│       └── [id].test.ts           # Tests for /api/todos/[id] endpoints
└── components/
    └── TodoList.test.tsx          # Tests for TodoList component
```

## Test Coverage

### API Route Tests (17 tests)

**`/api/todos` (Collection Endpoints)** - 6 tests:
- ✅ Returns all todos ordered by created_at desc
- ✅ Handles database errors
- ✅ Creates new todo with valid data
- ✅ Rejects empty title
- ✅ Uses default priority if not provided
- ✅ Trims whitespace from title and description

**`/api/todos/[id]` (Individual Resource)** - 11 tests:
- ✅ Returns a specific todo
- ✅ Returns 404 if todo not found
- ✅ Updates todo with valid data
- ✅ Rejects empty title on update
- ✅ Allows partial updates
- ✅ Updates only priority
- ✅ Trims whitespace on update
- ✅ Handles database errors on update
- ✅ Deletes a todo
- ✅ Handles database errors on delete
- ✅ Database error handling

### Component Tests (13 tests)

**TodoList Component**:
- ✅ Renders with initial todos
- ✅ Displays priority badges with correct colors
- ✅ Renders empty state when no todos
- ✅ Shows completed todos with line-through
- ✅ Adds a new todo
- ✅ Does not add todo with empty title
- ✅ Clears form after adding todo
- ✅ Toggles todo completion
- ✅ Deletes todo with confirmation
- ✅ Does not delete if confirmation cancelled
- ✅ Shows loading state when adding todo
- ✅ Handles API errors gracefully
- ✅ Renders all priority options in select

## Testing Technologies

- **Jest** - Test runner and assertion library
- **React Testing Library** - Component testing
- **@testing-library/user-event** - Simulating user interactions
- **@testing-library/jest-dom** - Additional DOM matchers

## Mocking Strategy

### Supabase Client
The Supabase client is mocked in API tests to avoid actual database calls:

```typescript
jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(),
}))
```

### Fetch API
Global `fetch` is mocked in component tests:

```typescript
global.fetch = jest.fn()
```

### Next.js Server APIs
NextResponse is mocked in `jest.setup.js` to work in the test environment.

## Writing New Tests

### API Route Test Template

```typescript
import { GET } from '@/app/api/your-route/route'
import { createClient } from '@/lib/supabase/server'

jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(),
}))

describe('/api/your-route', () => {
  let mockSupabase: any

  beforeEach(() => {
    mockSupabase = {
      from: jest.fn(() => mockSupabase),
      select: jest.fn(() => mockSupabase),
      // ... other methods
    }
    ;(createClient as jest.Mock).mockResolvedValue(mockSupabase)
  })

  it('should test something', async () => {
    mockSupabase.select.mockResolvedValue({
      data: [],
      error: null,
    })

    const response = await GET()
    // assertions...
  })
})
```

### Component Test Template

```typescript
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import YourComponent from '@/components/YourComponent'

describe('YourComponent', () => {
  it('should render', () => {
    render(<YourComponent />)
    expect(screen.getByText('Some Text')).toBeInTheDocument()
  })

  it('should handle user interaction', async () => {
    const user = userEvent.setup()
    render(<YourComponent />)

    const button = screen.getByRole('button')
    await user.click(button)

    // assertions...
  })
})
```

## Best Practices

1. **Arrange-Act-Assert**: Structure tests clearly
2. **Test User Behavior**: Focus on what users do, not implementation
3. **Mock External Dependencies**: Database, APIs, etc.
4. **Clean Up**: Use `beforeEach` and `afterEach` hooks
5. **Descriptive Test Names**: Use "should..." format
6. **Test Edge Cases**: Empty states, errors, validation
7. **Avoid Implementation Details**: Test public interfaces

## Continuous Integration

These tests can be run in CI/CD pipelines:

```yaml
# Example GitHub Actions
- name: Run tests
  run: npm test
```

## Troubleshooting

### Tests timing out
Increase timeout in jest.config.js or individual tests:
```typescript
it('should work', async () => {
  // test code
}, 10000) // 10 second timeout
```

### Mock not working
Make sure mocks are defined before imports:
```typescript
jest.mock('@/lib/supabase/server')
import { GET } from '@/app/api/route'
```

### Component not rendering
Ensure you're using the correct rendering approach:
```typescript
import { render } from '@testing-library/react'
// not from 'react-dom/test-utils'
```
