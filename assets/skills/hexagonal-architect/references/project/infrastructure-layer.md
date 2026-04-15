# Infrastructure Layer Guidelines

## Core Principles

- Framework-agnostic (no React/Next.js code in repositories)
- Class-based OOP allowed
- Implement domain contracts only
- Handle APIs, databases, external services
- Provide factory functions for DI

## Repository Pattern

```typescript
export class PlatziProductRepository implements IProductRepository {
  constructor(private readonly httpClient: IHttpClient) {}

  async getProducts(filters: IProductFiltersDTO): Promise<IPaginationResult<Product>> {
    const { page, pageSize } = filters;
    const offset = (page - 1) * pageSize;

    try {
      const response = await this.httpClient.get<IPlatziProductDTO[]>(
        `/products?offset=${offset}&limit=${pageSize}`
      );
      const products = response.data.map(dto => this.mapToDomainEntity(dto));
      return { data: products, total: products.length, page, pageSize, totalPages: Math.ceil(products.length / pageSize) };
    } catch (error) {
      throw new ProductFetchError('Failed to fetch products from API');
    }
  }

  private mapToDomainEntity(dto: IPlatziProductDTO): Product {
    return Product.create(dto.id.toString(), dto.title, dto.price, ...);
  }
}
```

**Repository Rules:**
- Implement `IRepository` interfaces from domain
- Return domain entities, NEVER DTOs
- Map external DTOs to domain entities
- Throw domain errors (ProductNotFoundError, etc.)
- Receive dependencies via constructor (IHttpClient)
- Framework-agnostic (no React/Next.js)

## External Service Pattern

```typescript
// Interface in domain/contracts/
interface IPaymentService {
  processPayment(amount: number, currency: string): Promise<IPaymentResultDTO>;
}

// Implementation in infrastructure/
export class StripePaymentService implements IPaymentService {
  constructor(private readonly apiKey: string, private readonly httpClient: IHttpClient) {}

  async processPayment(amount: number, currency: string): Promise<IPaymentResultDTO> {
    try {
      const response = await this.httpClient.post('/payments', { amount, currency, apiKey: this.apiKey });
      return { transactionId: response.data.id, status: response.data.status, amount: response.data.amount };
    } catch (error) {
      throw new PaymentProcessingError('Failed to process payment');
    }
  }
}
```

## Dependency Injection

```typescript
// infrastructure/dependency-injection.ts
export function createProductRepository(httpClient: IHttpClient): IProductRepository {
  return new PlatziProductRepository(httpClient);
}

export function createGetProductsUseCase(productRepository: IProductRepository): IGetProductsUseCase {
  return new GetProductsUseCase(productRepository);
}

export function createProductModule(httpClient: IHttpClient) {
  const repository = createProductRepository(httpClient);
  return {
    repository,
    useCases: {
      getProducts: createGetProductsUseCase(repository),
      getProductById: createGetProductByIdUseCase(repository),
    },
  };
}
```

**DI Rules:**
- Factory functions (not classes)
- Return and accept interface types
- No singletons unless explicitly needed
- Type-safe TypeScript types

## HTTP Client (Shared Module)

```typescript
// shared/domain/contracts/http-client.interface.ts
export interface IHttpClient {
  get<T>(url: string, config?: IHttpConfig): Promise<IHttpResponse<T>>;
  post<T>(url: string, data?: unknown, config?: IHttpConfig): Promise<IHttpResponse<T>>;
  put<T>(url: string, data?: unknown, config?: IHttpConfig): Promise<IHttpResponse<T>>;
  delete<T>(url: string, config?: IHttpConfig): Promise<IHttpResponse<T>>;
}

// shared/infrastructure/http-client/fetch-http-client.ts
export class FetchHttpClient implements IHttpClient {
  constructor(private readonly baseURL?: string) {}
  async get<T>(url: string, config?: IHttpConfig): Promise<IHttpResponse<T>> {
    const response = await fetch(this.buildURL(url), { method: 'GET', headers: config?.headers });
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    return { data: await response.json(), status: response.status, headers: response.headers };
  }
  // ... post, put, delete similar
}
```

## Routing Layer (src/app)

### Client Wrapper

```typescript
// app/products/products-client.tsx
'use client';
import { FetchHttpClient } from '@/modules/shared/infrastructure/http-client/fetch-http-client';
import { ProductListView } from '@/modules/products/application/presentation/views/product-list.view';
import { createProductModule } from '@/modules/products/infrastructure/dependency-injection';

export function ProductsClient() {
  const httpClient = new FetchHttpClient('https://api.example.com/v1');
  const { useCases } = createProductModule(httpClient);
  return <ProductListView getProductsUseCase={useCases.getProducts} />;
}
```

### Server Component

```typescript
// app/products/page.tsx
import { ProductsClient } from './products-client';
export default function ProductsPage() {
  return <ProductsClient />;
}
```

### Layout Pattern

```typescript
// app/dashboard/layout.tsx - Wraps ALL /dashboard/* routes
import { DashboardClient } from './dashboard-client';
export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return <DashboardClient>{children}</DashboardClient>;
}
```

**Routing Rules:**
- Client wrapper: `{module-name}-client.tsx` with `'use client'`
- DI initialization in client wrapper
- page.tsx is server component (routing only, no styles)
- layout.tsx wraps nested routes (optional, for shared UI)
- Import ONLY from src/modules

## File Organization

```
infrastructure/
├── repositories/
│   └── platzi-product.repository.ts
├── external-services/
│   └── stripe-payment.service.ts
└── dependency-injection.ts
```
