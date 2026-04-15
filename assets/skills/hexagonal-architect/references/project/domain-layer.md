# Domain Layer Guidelines

## Core Principles

- Pure TypeScript only - zero framework dependencies
- NO node_modules imports - use interfaces from shared modules
- Immutable entities - return new instances for updates
- Business rules ONLY live here
- Interface-first design - all contracts use `I` prefix
- DTO pattern - all DTOs start with `I` and end with `DTO`

## Entity Pattern

Entities use the `_entity` schema pattern with private constructor and static factory:

```typescript
interface IProductSchema {
  id: string;
  name: string;
  price: number;
  createdAt: Date;
}

class Product {
  private constructor(private readonly _entity: IProductSchema) {}

  static create(id: string, name: string, price: number): Product {
    return new Product({ id, name, price, createdAt: new Date() });
  }

  get id(): string { return this._entity.id; }
  get name(): string { return this._entity.name; }
  get price(): number { return this._entity.price; }

  getFormattedPrice(): string {
    return `$${this._entity.price.toFixed(2)}`;
  }

  isExpensive(): boolean {
    return this._entity.price > 1000;
  }

  // Immutable update - returns NEW instance
  updatePrice(newPrice: number): Product {
    return new Product({ ...this._entity, price: newPrice });
  }
}
```

**Entity Rules:**
- Private constructor with static factory methods
- Immutable: return new instances for updates
- Business logic in entity methods
- Schema pattern: `private readonly _entity: ISchema`
- Getters only, no public setters

## Value Object Pattern

Value objects also use `_entity` schema and validate in factory:

```typescript
interface IPriceSchemaValueObject {
  value: number;
  currency: string;
}

class Price {
  private constructor(private readonly _entity: IPriceSchemaValueObject) {}

  static create(value: number, currency: string = 'USD'): Price {
    if (value < 0) throw new Error('Price cannot be negative');
    if (!['USD', 'EUR', 'GBP'].includes(currency)) throw new Error('Invalid currency');
    return new Price({ value, currency });
  }

  get value(): number { return this._entity.value; }
  get currency(): string { return this._entity.currency; }

  getFormatted(): string {
    return `${this._entity.currency} ${this._entity.value.toFixed(2)}`;
  }

  equals(other: Price): boolean {
    return this._entity.value === other.value && this._entity.currency === other.currency;
  }
}
```

**Value Object Rules:**
- Validation in factory method (throw errors for invalid values)
- Immutable (no update methods)
- Implement `equals()` for value comparison
- Schema pattern: `private readonly _entity: ISchemaValueObject`

## Interfaces & Contracts

```typescript
// Service interfaces - I-prefix
interface IProductService { /* ... */ }
interface IUserRepository { /* ... */ }

// DTO interfaces - I-prefix + DTO-suffix
interface ICreateProductDTO { name: string; price: number; categoryId: string; }
interface IProductResponseDTO { id: string; name: string; formattedPrice: string; }
interface IProductFiltersDTO { search?: string; page: number; pageSize: number; }
```

**Contract Rules:**
- All interfaces start with `I`
- All DTOs start with `I` and end with `DTO`
- Place in `domain/contracts/`
- One interface per file with `.interface.ts` suffix
- DTOs are plain objects, JSON-safe, no methods

## Domain Errors

```typescript
export class ProductNotFoundError extends Error {
  constructor(productId: string) {
    super(`Product with ID ${productId} not found`);
    this.name = 'ProductNotFoundError';
  }
}
```

Errors extend Error, have descriptive names, include context, represent domain concepts.

## File Organization

```
domain/
├── contracts/
│   ├── product-service.interface.ts
│   ├── product-repository.interface.ts
│   └── create-product.dto.ts
├── entities/
│   ├── product.ts
│   └── category.ts
├── value-objects/
│   ├── price.ts
│   └── product-code.ts
└── errors/
    ├── product-not-found.error.ts
    └── invalid-price.error.ts
```

## What NOT to Do

- Never add framework dependencies (React, Next.js)
- Never import from node_modules (use shared interfaces)
- Never put business logic outside domain
- Never expose entities directly (use DTOs)
- Never make entities mutable
- Never skip validation in value objects
- Never forget I-prefix on interfaces or DTO-suffix on DTOs
