# Application Layer Guidelines

## Core Principles

- Single Responsibility: one use case = one `execute()` method
- Generic Interface: all use cases implement `IUseCase<TInput, TOutput>`
- Orchestration only: coordinate domain, don't contain business logic
- Max 3 dependencies per constructor
- DTO conversion: use cases convert entities to DTOs
- No validation: handled by value objects in domain
- DI parameters: hooks receive use cases via dependency injection
- NO node_modules imports: use interfaces from shared modules
- Reusability First: check shared/ and components/ui/ before creating new

## Use Case Pattern

```typescript
// Generic interface (in shared/domain/contracts/)
export interface IUseCase<TInput, TOutput> {
  execute(input: TInput): Promise<TOutput>;
}

// Use case interface (in domain/contracts/)
interface IGetProductsUseCase
  extends IUseCase<IProductFiltersDTO, IPaginationResult<IProductResponseDTO>> {}

// Implementation (in application/use-cases/)
export class GetProductsUseCase implements IGetProductsUseCase {
  constructor(private readonly productRepository: IProductRepository) {}

  async execute(filters: IProductFiltersDTO): Promise<IPaginationResult<IProductResponseDTO>> {
    try {
      const result = await this.productRepository.getProducts(filters);
      return {
        data: result.data.map((product) => this.entityToDTO(product)),
        total: result.total,
        page: result.page,
        pageSize: result.pageSize,
        totalPages: result.totalPages,
      };
    } catch (error) {
      if (error instanceof ProductNotFoundError) {
        throw new Error('Products not found');
      }
      throw error;
    }
  }

  private entityToDTO(product: Product): IProductResponseDTO {
    return {
      id: product.id,
      name: product.name,
      price: product.price,
      formattedPrice: product.getFormattedPrice(),
      createdAt: product.createdAt.toISOString(),
    };
  }
}
```

**Use Case Rules:**
- One class = one `execute()` method only
- All implement `IUseCase<TInput, TOutput>`
- Clear naming: `GetProductsUseCase`, `CreateOrderUseCase`
- Orchestration only, no business logic
- Max 3 dependencies in constructor
- Always convert entities to DTOs before returning
- Translate domain errors to application errors
- Each use case has its own interface in domain/contracts/

## Hook Pattern

Hooks receive use cases via DI parameters:

```typescript
interface IUseProductListResult {
  products: IProductResponseDTO[];
  isLoading: boolean;
  error: string | null;
  nextPage: () => void;
  refreshProducts: () => void;
}

export function useProductList(
  getProductsUseCase: IGetProductsUseCase,
  getProductByIdUseCase: IGetProductByIdUseCase
): IUseProductListResult {
  const [products, setProducts] = useState<IProductResponseDTO[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchProducts = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await getProductsUseCase.execute(filters);
      setProducts(result.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch');
    } finally {
      setIsLoading(false);
    }
  }, [getProductsUseCase, filters]);

  // ... return state and actions
}
```

**Hook Rules:**
- Receive use cases as parameters (not direct imports)
- Multiple use cases OK if feature needs them
- Handle loading, error, and data states
- Return typed result interface
- No business logic (only UI state + use case orchestration)

## Presentation Layer

### Reusability Check (MANDATORY)

Before creating any component:
1. Search `src/modules/shared/` for existing hooks and utilities
2. Check `src/components/ui/` for available shadcn components
3. Review other modules' presentation components
4. Only create new if no suitable alternative exists

If needed in 2+ modules: move to `src/modules/shared/application/presentation/`

### UI Wrappers

```typescript
// presentation/ui/button.tsx
export { Button } from '@/components/ui/button';

// presentation/ui/card.tsx
export { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
```

### Feature Components

```typescript
// components/product-card/index.tsx
interface IProductCardProps {
  product: IProductResponseDTO;
  onSelect?: (id: string) => void;
}

export function ProductCard({ product, onSelect }: IProductCardProps) {
  return (
    <Card>
      <CardHeader><CardTitle>{product.name}</CardTitle></CardHeader>
      <CardContent>
        <Button onClick={() => onSelect?.(product.id)}>View Details</Button>
      </CardContent>
    </Card>
  );
}
```

### Views

```typescript
// product-list.view.tsx
export function ProductListView({ getProductsUseCase }: IProductListViewProps) {
  const { products, isLoading, error } = useProductList(getProductsUseCase);
  // Compose feature components, no business logic
}
```

**Presentation Rules:**
- shadcn only via ui/ wrappers
- Tailwind CSS for styling
- Feature components: `{name}/index.tsx` + `style.module.scss`
- CSS Modules: `import styles from './style.module.scss'`
- Views (`{name}.view.tsx`) compose feature components
- No business logic in views
- Use cases passed as props from client wrappers

## File Organization

```
application/
├── use-cases/
│   ├── get-products.use-case.ts
│   └── create-product.use-case.ts
├── hooks/
│   └── use-product-list.hook.ts
└── presentation/
    ├── ui/
    │   ├── button.tsx
    │   └── card.tsx
    ├── components/
    │   └── product-card/
    │       ├── index.tsx
    │       └── style.module.scss
    └── views/
        └── product-list.view.tsx
```
