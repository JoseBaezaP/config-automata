# Folder Structure & Module Organization

## Complete Project Structure

```
src/
├── app/                                    # Next.js routing only; imports only from modules
│   ├── {module-name}/                      # Module routes
│   │   ├── layout.tsx                      # Shared layout for all nested routes (optional)
│   │   ├── {module-name}-client.tsx        # DI wrapper ('use client')
│   │   └── page.tsx                        # Routing only (server component)
│   ├── globals.css                         # Global styles
│   ├── layout.tsx                          # Root layout
│   └── page.tsx                            # Home page
├── styles/                                 # Global styles (7-1 SASS pattern, no pages/ folder)
│   ├── abstracts/                          # Variables, mixins, functions
│   ├── base/                               # Reset, typography, base styles
│   ├── components/                         # Global component styles
│   ├── layout/                             # Layout styles (header, footer, navigation)
│   ├── themes/                             # Theme styles (dark mode, etc.)
│   └── vendors/                            # Third-party library overrides
├── components/                             # shadcn/ui components (read-only)
│   └── ui/
├── lib/                                    # shadcn/ui libraries (read-only)
│   └── utils.ts
├── modules/
│   ├── {module-name}/                      # Regular module
│   │   ├── domain/
│   │   │   ├── contracts/                  # Interfaces (I-prefix) & DTOs (I-prefix + DTO-suffix)
│   │   │   ├── entities/                   # Domain entities with _entity schema pattern
│   │   │   ├── value-objects/              # Value objects with validation
│   │   │   └── errors/                     # Custom domain errors
│   │   ├── application/
│   │   │   ├── use-cases/                  # Orchestration use cases (max 3 dependencies)
│   │   │   ├── hooks/                      # React hooks receiving use cases via DI
│   │   │   └── presentation/
│   │   │       ├── ui/                     # React wrappers around shadcn components
│   │   │       ├── components/             # Feature components
│   │   │       │   └── {component-name}/
│   │   │       │       ├── index.tsx
│   │   │       │       └── style.module.scss
│   │   │       └── views/
│   │   │           └── {name}.view.tsx
│   │   └── infrastructure/
│   │       ├── repositories/
│   │       ├── {external-services}/
│   │       └── dependency-injection.ts
│   └── shared/                             # Shared utilities (flat structure)
│       ├── domain/
│       │   ├── contracts/                  # IHttpClient, ILogger, IUseCase, etc.
│       │   ├── value-objects/
│       │   └── errors/
│       ├── application/
│       │   └── hooks/
│       └── infrastructure/
│           ├── http-client/
│           ├── uuid/
│           ├── session/
│           └── dependency-injection.ts
└── tests/                                  # Mirrors src/modules structure
    └── modules/
        └── {module-name}/
            ├── domain/
            ├── application/
            └── infrastructure/
```

## Module Template

Modules CANNOT have submodules. Each module maps directly to an app route.

```
src/modules/{module-name}/
├── domain/
│   ├── contracts/         # Interfaces + DTOs
│   ├── entities/          # Entities with _entity schema
│   ├── value-objects/     # Value objects with _entity schema
│   └── errors/            # Custom domain errors
├── application/
│   ├── use-cases/         # One execute() per class
│   ├── hooks/             # React hooks with DI
│   └── presentation/
│       ├── ui/            # shadcn wrappers
│       ├── components/    # Feature components
│       │   └── {name}/
│       │       ├── index.tsx
│       │       └── style.module.scss
│       └── views/
│           └── {name}.view.tsx
└── infrastructure/
    ├── repositories/
    ├── {services}/
    └── dependency-injection.ts
```

## Route Mapping

- Module: `products` + Route: `/products` -> `src/app/products/page.tsx`
- Module: `user-profile` + Route: `/profile` -> `src/app/profile/page.tsx`
- Module: `admin-users` + Route: `/admin/users` -> `src/app/admin/users/page.tsx`

## layout.tsx (Optional - Shared UI Across Routes)

Use layout.tsx when multiple routes share UI (sidebar, header, etc.):

```typescript
// src/app/dashboard/layout.tsx
import { DashboardClient } from './dashboard-client';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return <DashboardClient>{children}</DashboardClient>;
}
```

```
src/app/dashboard/
├── layout.tsx          # Wraps ALL routes below
├── dashboard-client.tsx
├── page.tsx            # /dashboard
├── users/
│   └── page.tsx        # /dashboard/users
└── settings/
    └── page.tsx        # /dashboard/settings
```

Use layout.tsx for: shared sidebar, persistent navigation, common providers, auth guards.
Do NOT use for single routes.

## Shared Module

Flat structure, no submodules. Only technical concerns, no business logic.

Required shared interfaces in `shared/domain/contracts/`:
- `IUseCase<TInput, TOutput>` - Generic use case interface
- `IHttpClient` - HTTP operations
- `IHttpResponse`, `IHttpConfig` - HTTP types
- `IUuidGenerator` - UUID generation
- `ISessionRepository` - Session management
- `ILogger` - Logging

Can include presentation components when reused across 2+ modules.

## Reusability Rules

Before creating ANYTHING new:
1. Search `src/modules/shared/` for existing functionality
2. Check `src/components/ui/` for shadcn components
3. Review other modules' presentation components

If a component is needed in 2+ modules:
- Move to `src/modules/shared/application/presentation/` if UI/technical concern
- Keep domain logic in its module (respect bounded contexts)

## Implementation Order

1. Domain layer (foundation)
2. Infrastructure layer (repos, DI)
3. Application layer (use cases, hooks)
4. Presentation layer (ui wrappers, components, views)
5. Routing layer (page.tsx, client wrapper)
6. Tests (90%+ coverage)
