# Testing Guidelines

## Strategy

- Mirror source structure: `src/tests/modules/{module}/{layer}/`
- Coverage requirement: 90%+ (branches, functions, lines, statements)
- Domain tests: pure unit tests, no mocks
- Use case tests: mocked dependencies
- Hook tests: renderHook + mocked use cases
- Component tests: @testing-library/react + user-event

## Domain Testing (No Mocks)

```typescript
describe('Product Entity', () => {
  it('should create a valid product', () => {
    const product = Product.create('1', 'Laptop', 1500, ...);
    expect(product.id).toBe('1');
    expect(product.price).toBe(1500);
  });

  it('should return new instance on update (immutability)', () => {
    const product = Product.create('1', 'Laptop', 1500, ...);
    const updated = product.updatePrice(1200);
    expect(updated.price).toBe(1200);
    expect(product.price).toBe(1500); // Original unchanged
    expect(updated).not.toBe(product);
  });
});

describe('Price Value Object', () => {
  it('should throw for negative price', () => {
    expect(() => Price.create(-10, 'USD')).toThrow('Price cannot be negative');
  });

  it('should implement value equality', () => {
    expect(Price.create(100, 'USD').equals(Price.create(100, 'USD'))).toBe(true);
    expect(Price.create(100, 'USD').equals(Price.create(200, 'USD'))).toBe(false);
  });
});
```

**Domain testing rules:** No mocks needed, test all business logic, test validation, test immutability, test edge cases.

## Use Case Testing (Mocked Dependencies)

```typescript
describe('GetProductsUseCase', () => {
  let useCase: GetProductsUseCase;
  let mockRepository: jest.Mocked<IProductRepository>;

  beforeEach(() => {
    mockRepository = {
      getProducts: jest.fn(),
      getProductById: jest.fn(),
    } as jest.Mocked<IProductRepository>;
    useCase = new GetProductsUseCase(mockRepository);
  });

  it('should return products as DTOs', async () => {
    const mockProduct = Product.create('1', 'Laptop', 1500, ...);
    mockRepository.getProducts.mockResolvedValue({
      data: [mockProduct], total: 1, page: 1, pageSize: 10, totalPages: 1,
    });

    const result = await useCase.execute({ page: 1, pageSize: 10 });
    expect(result.data).toHaveLength(1);
    expect(result.data[0].id).toBe('1');
  });

  it('should handle repository errors', async () => {
    mockRepository.getProducts.mockRejectedValue(new ProductFetchError('API error'));
    await expect(useCase.execute({ page: 1, pageSize: 10 })).rejects.toThrow();
  });
});
```

**Use case testing rules:** Always mock dependencies, test orchestration, test DTO conversion, test error handling.

## Hook Testing

```typescript
describe('useProductList', () => {
  let mockUseCase: jest.Mocked<IGetProductsUseCase>;

  beforeEach(() => {
    mockUseCase = { execute: jest.fn() } as any;
  });

  it('should fetch products', async () => {
    mockUseCase.execute.mockResolvedValue({ data: [], total: 0, page: 1, pageSize: 10, totalPages: 0 });
    const { result } = renderHook(() => useProductList(mockUseCase));
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(mockUseCase.execute).toHaveBeenCalled();
  });

  it('should handle errors', async () => {
    mockUseCase.execute.mockRejectedValue(new Error('API error'));
    const { result } = renderHook(() => useProductList(mockUseCase));
    await waitFor(() => expect(result.current.error).toBe('API error'));
  });
});
```

## Component Testing

```typescript
describe('ProductListView', () => {
  let mockUseCase: jest.Mocked<IGetProductsUseCase>;

  it('should display loading state', () => {
    mockUseCase.execute.mockImplementation(() => new Promise(() => {}));
    render(<ProductListView useCase={mockUseCase} />);
    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  it('should display products', async () => {
    mockUseCase.execute.mockResolvedValue({ data: [{ id: '1', title: 'Laptop', ... }], ... });
    render(<ProductListView useCase={mockUseCase} />);
    await waitFor(() => expect(screen.getByText('Laptop')).toBeInTheDocument());
  });

  it('should handle user interactions', async () => {
    const user = userEvent.setup();
    // ... render, interact, assert
  });
});
```

**Component testing rules:** Use @testing-library/react + user-event, mock use cases, test user flows, test loading/error/success states, don't test implementation details.

## Mock Patterns

```typescript
// Simple mock
const mockFn = jest.fn().mockReturnValue('value');

// Complex interface mock (jest-mock-extended)
import { mock } from 'jest-mock-extended';
const mockRepo = mock<IProductRepository>();
mockRepo.getProducts.mockResolvedValue({ ... });

// Module mock
jest.mock('@/modules/shared/http-client', () => ({
  FetchHttpClient: jest.fn().mockImplementation(() => ({ get: jest.fn(), post: jest.fn() })),
}));
```

## File Organization

```
tests/modules/{module}/
├── domain/
│   ├── entities/
│   │   └── product.test.ts
│   └── value-objects/
│       └── price.test.ts
├── application/
│   ├── use-cases/
│   │   └── get-products.use-case.test.ts
│   ├── hooks/
│   │   └── use-product-list.test.ts
│   └── presentation/
│       └── product-list.view.test.tsx
└── infrastructure/
    └── repositories/
        └── platzi-product.repository.test.ts
```

## What NOT to Do

- Never test infrastructure without mocks in unit tests
- Never skip mocking external dependencies
- Never test private methods directly
- Never create interfaces just for testing
- Never write slow or flaky tests
- Never skip edge case testing
- Never forget coverage check: `npm run test:coverage`
