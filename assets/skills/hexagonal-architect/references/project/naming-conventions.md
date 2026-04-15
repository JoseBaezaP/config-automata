# Naming Conventions

## Code Symbols

| Type | Convention | Examples |
|------|-----------|----------|
| Interfaces | `I` prefix, PascalCase | `IProductService`, `IUserRepository` |
| DTOs | `I` prefix + `DTO` suffix | `ICreateProductDTO`, `IProductResponseDTO` |
| Classes | PascalCase | `Product`, `ProductService`, `Price` |
| Functions/Methods | camelCase | `createProduct`, `getUser`, `validateEmail` |
| Entity schema | `_entity` pattern | `private readonly _entity: IProductSchema` |
| Value Object schema | `_entity` pattern | `private readonly _entity: IPriceSchemaValueObject` |

## File Names (kebab-case)

All files and folders use lowercase kebab-case.

### Domain Files
- Entities: `product.ts`, `auth-user.ts`, `shopping-cart.ts`
- Value Objects: `price.ts`, `email.ts`, `product-code.ts`
- Interfaces: `product-service.interface.ts`, `user-repository.interface.ts`
- DTOs: `product.dto.ts`, `create-user.dto.ts`
- Errors: `product-not-found.error.ts`, `invalid-price.error.ts`

### Application Files
- Use Cases: `get-products.use-case.ts`, `create-product.use-case.ts`
- Hooks: `use-products.hook.ts`, `use-auth.hook.ts`
- Views: `product-list.view.tsx`, `user-profile.view.tsx`

### Infrastructure Files
- Repositories: `product.repository.ts`, `in-memory-user.repository.ts`
- External Services: `stripe-payment.service.ts`, `aws-s3.service.ts`
- DI: `dependency-injection.ts`

### Presentation Files
- UI Components: `button.tsx`, `product-card.tsx`
- Feature Folders: `product-list/`, `user-profile/`, `checkout-form/`
- Client Wrappers: `products-client.tsx`, `auth-client.tsx`

## Architecture-Specific Rules

- Use Cases: one class = one `execute()`; named as action (`GetProductsUseCase`)
- All use cases extend `IUseCase<TInput, TOutput>`
- Views: `{name}.view.tsx`
- Feature Components: `{name}/index.tsx` + `style.module.scss`
- Interfaces: `.interface.ts` suffix
- DTOs: `.dto.ts` suffix

## Examples by Layer

```
domain/
├── contracts/
│   ├── product-service.interface.ts
│   ├── product-repository.interface.ts
│   └── create-product.dto.ts
├── entities/
│   └── product.ts
├── value-objects/
│   └── price.ts
└── errors/
    └── product-not-found.error.ts

application/
├── use-cases/
│   └── get-products.use-case.ts
├── hooks/
│   └── use-product-list.hook.ts
└── presentation/
    ├── ui/
    │   └── button.tsx
    ├── components/
    │   └── product-card/
    │       ├── index.tsx
    │       └── style.module.scss
    └── views/
        └── product-list.view.tsx

infrastructure/
├── repositories/
│   └── platzi-product.repository.ts
└── dependency-injection.ts
```
