---
name: hexagonal-architect
description: "Architecture orchestrator for Hexagonal + DDD + Clean Architecture projects. Combines project-specific implementation patterns (entities with _entity schema, IUseCase<T,O>, shadcn wrappers, Next.js App Router, React hooks with DI, kebab-case naming, module structure) with advanced DDD theory (aggregates, domain events, CQRS, bounded contexts, sagas, event sourcing). MUST trigger whenever: creating or editing files in src/modules/, src/app/, or src/tests/; making architectural decisions; creating new modules; designing entities, value objects, use cases, repositories; discussing architecture, DDD, hexagonal, or clean architecture patterns; integrating external libraries; writing tests; or when the user mentions domain layer, application layer, infrastructure layer, ports, adapters, or bounded contexts."
---

# Hexagonal Architecture Orchestrator

This skill orchestrates all architectural knowledge for projects using Hexagonal + DDD + Clean Architecture. It combines project-specific implementation conventions (in `references/project/`) with advanced DDD theory (in `references/ddd-advanced/`), applying the right level of complexity based on what you're building.

The `references/project/` files define the conventions for the current project. The `references/ddd-advanced/` files provide language-agnostic DDD theory that can be adapted to any project's conventions.

## Project Conventions

The following table reflects the current project's tech stack. These values come from `references/project/` and should be updated if the project changes.

| Aspect | Value |
|--------|-------|
| Framework | Next.js 15 (App Router) + React 19 |
| Language | TypeScript (strict) |
| UI | shadcn/ui + Tailwind CSS |
| Styles | CSS Modules (style.module.scss) + 7-1 SASS |
| Architecture | Hexagonal + DDD + Clean Architecture |
| Testing | Jest + React Testing Library (90%+ coverage) |
| MCP Servers | Context7 (docs), shadcn (UI components) |

To adapt this skill to a different project, update the files in `references/project/` with the new project's conventions.

## The Dependency Rule (NEVER Break This)

```
Infrastructure --> Application --> Domain
  (adapters)      (use cases)      (core)
```

| Can Import From | Domain | Application | Infrastructure |
|-----------------|--------|-------------|----------------|
| **Domain**      | self   | NO          | NO             |
| **Application** | YES    | self        | NO             |
| **Infrastructure** | YES | YES         | self           |

**src/app** imports ONLY from **src/modules** (never from src/components or src/lib).

## Critical Rules (Always Enforce)

These are the rules that matter most. Violating any of these breaks the architecture:

1. **Domain is pure** - Zero framework dependencies, zero node_modules imports
2. **_entity schema pattern** - All entities and value objects use `private readonly _entity: ISchema`
3. **One use case = one execute()** - All implement `IUseCase<TInput, TOutput>`
4. **Max 3 dependencies** per constructor
5. **Max 300 lines** per file
6. **I-prefix** on all interfaces, **I-prefix + DTO-suffix** on all DTOs
7. **kebab-case** for all file names
8. **No submodules** - Modules are flat: `src/modules/{name}/`
9. **shadcn via wrappers only** - Import from `presentation/ui/`, never from `@/components/ui`
10. **External libs need interfaces** - Create in `shared/domain/contracts/`, implement in `shared/infrastructure/`
11. **Reusability first** - Check `src/modules/shared/` and `src/components/ui/` before creating anything new
12. **Entities return DTOs** - Never expose entities directly outside the domain

## Decision Tree: Where Does This Code Go?

```
What are you building?
|
+-- Pure business rule or validation?
|   --> domain/entities/ or domain/value-objects/
|   --> Read: references/project/domain-layer.md
|
+-- Orchestrating a use case (coordinate domain + return DTOs)?
|   --> application/use-cases/
|   --> Read: references/project/application-layer.md
|
+-- React hook managing UI state with use cases?
|   --> application/hooks/
|   --> Read: references/project/application-layer.md
|
+-- UI component or view?
|   --> application/presentation/
|   --> Read: references/project/application-layer.md
|
+-- Talking to external API, database, or service?
|   --> infrastructure/repositories/ or infrastructure/{service}/
|   --> Read: references/project/infrastructure-layer.md
|
+-- Wiring dependencies together?
|   --> infrastructure/dependency-injection.ts
|   --> Read: references/project/infrastructure-layer.md
|
+-- Next.js route, page, or layout?
|   --> src/app/{route}/
|   --> Read: references/project/infrastructure-layer.md (Routing section)
|
+-- Writing tests?
|   --> src/tests/modules/{module}/
|   --> Read: references/project/testing-guidelines.md
|
+-- Need advanced DDD pattern (aggregates, events, CQRS)?
|   --> Read: references/ddd-advanced/ (see Advanced Patterns section below)
```

## Decision Tree: Entity or Value Object?

```
Does it have a unique identity that persists over time?
+-- YES --> Entity (equality by ID)
+-- NO  --> Value Object (equality by value, immutable, self-validating)
```

Both use `_entity` schema pattern in this project (see references/project/domain-layer.md). For the generic DDD perspective on this distinction, see references/ddd-advanced/ddd-tactical.md.

## Module Creation Order

When creating a new module, implement in this exact order:

1. **Domain** - entities, value objects, contracts (interfaces + DTOs), errors
2. **Infrastructure** - repositories, external services, dependency-injection.ts
3. **Application** - use cases, hooks
4. **Presentation** - ui/ wrappers, components/, views/
5. **Routing** - src/app/{route}/page.tsx + {module}-client.tsx
6. **Tests** - unit tests for all layers (90%+ coverage)

Read references/project/folder-structure.md for the complete template.

## File Naming Quick Reference

| Layer | Pattern | Example |
|-------|---------|---------|
| Entity | `{name}.ts` | `product.ts` |
| Value Object | `{name}.ts` | `price.ts` |
| Interface | `{name}.interface.ts` | `product-repository.interface.ts` |
| DTO | `{name}.dto.ts` | `create-product.dto.ts` |
| Error | `{name}.error.ts` | `product-not-found.error.ts` |
| Use Case | `{action}-{entity}.use-case.ts` | `get-products.use-case.ts` |
| Hook | `use-{feature}.hook.ts` | `use-product-list.hook.ts` |
| View | `{name}.view.tsx` | `product-list.view.tsx` |
| Repository | `{name}.repository.ts` | `platzi-product.repository.ts` |
| Service | `{provider}-{name}.service.ts` | `stripe-payment.service.ts` |
| Client Wrapper | `{module}-client.tsx` | `products-client.tsx` |
| Component | `{name}/index.tsx` + `style.module.scss` | `product-card/index.tsx` |

Full conventions: references/project/naming-conventions.md

## External Library Integration Pattern

When you need an external library in domain or application layers:

```typescript
// 1. Interface in shared/domain/contracts/
export interface IHttpClient {
  get<T>(url: string): Promise<IHttpResponse<T>>;
}

// 2. Implementation in shared/infrastructure/http-client/
import axios from 'axios'; // OK here in infrastructure!
export class AxiosHttpClient implements IHttpClient { ... }

// 3. Inject interface in use cases/hooks (never the implementation)
constructor(private readonly httpClient: IHttpClient) {}
```

Common wrappers: IHttpClient, ILogger, IValidator, IDateService, IStorageService, IAuthService.

## Advanced DDD Patterns (When to Escalate)

Start simple. Only escalate complexity when the problem demands it:

```
Level 1: Entities + Value Objects + Use Cases (DEFAULT for this project)
  |  When business rules grow complex...
Level 2: Aggregates with domain events
  |  When multiple entry points needed...
Level 3: Full Hexagonal with ports & adapters
  |  When read/write patterns diverge...
Level 4: CQRS (separate read/write models)
  |  When need complete audit trail...
Level 5: Event Sourcing
```

Most features start at Level 1-2. Consult advanced references when the domain demands more:

| Need | Reference |
|------|-----------|
| Aggregate design, consistency boundaries | [ddd-tactical.md](references/ddd-advanced/ddd-tactical.md) |
| Domain events, event handlers, outbox | [cqrs-events.md](references/ddd-advanced/cqrs-events.md) |
| Bounded contexts, context mapping, ACL | [ddd-strategic.md](references/ddd-advanced/ddd-strategic.md) |
| Ports & adapters deep dive | [hexagonal-ports-adapters.md](references/ddd-advanced/hexagonal-ports-adapters.md) |
| Full layer specifications | [layers-reference.md](references/ddd-advanced/layers-reference.md) |
| Quick decision guide | [cheatsheet.md](references/ddd-advanced/cheatsheet.md) |

**When using advanced patterns, always adapt them to this project's conventions** (defined in `references/project/`). For example, the generic DDD tactical patterns use an `Entity<ID>` base class, but this project uses the `_entity` schema pattern instead. Always check project references first to see how a pattern should be implemented here.

## Reference Index

### Project Conventions (How to implement in the current project)

| Reference | When to Read |
|-----------|--------------|
| [folder-structure.md](references/project/folder-structure.md) | Creating modules, restructuring, adding routes |
| [domain-layer.md](references/project/domain-layer.md) | Creating entities, value objects, DTOs, interfaces, errors |
| [application-layer.md](references/project/application-layer.md) | Creating use cases, hooks, views, components |
| [infrastructure-layer.md](references/project/infrastructure-layer.md) | Creating repos, DI, routing, client wrappers |
| [naming-conventions.md](references/project/naming-conventions.md) | Naming anything (files, classes, interfaces) |
| [testing-guidelines.md](references/project/testing-guidelines.md) | Writing any kind of test |
| [mcp-integrations.md](references/project/mcp-integrations.md) | Using Context7 for docs or shadcn for UI components |

### DDD Advanced (Language-agnostic theory and advanced patterns)

| Reference | When to Read |
|-----------|--------------|
| [cheatsheet.md](references/ddd-advanced/cheatsheet.md) | Quick decisions, anti-patterns, dependency matrix |
| [ddd-strategic.md](references/ddd-advanced/ddd-strategic.md) | Bounded contexts, context mapping, subdomains |
| [ddd-tactical.md](references/ddd-advanced/ddd-tactical.md) | Aggregates, domain events, factories, specifications |
| [hexagonal-ports-adapters.md](references/ddd-advanced/hexagonal-ports-adapters.md) | Ports, adapters, driver/driven patterns |
| [cqrs-events.md](references/ddd-advanced/cqrs-events.md) | CQRS, event sourcing, sagas, outbox |
| [layers-reference.md](references/ddd-advanced/layers-reference.md) | Complete layer specs, composition root |

## Common Anti-Patterns (Catch These)

| Anti-Pattern | Problem | Fix |
|-------------|---------|-----|
| Anemic Domain Model | Entities are data bags, logic in use cases | Move behavior INTO entities |
| Leaking Infrastructure | Domain imports axios/DB libs | Use interface wrappers in shared/ |
| God Use Case | Multiple methods in one use case | One class = one execute() |
| Direct shadcn Import | Import from @/components/ui in modules | Use presentation/ui/ wrappers |
| Fat Constructor | >3 dependencies | Split use case or create domain service |
| Cross-Module Sharing | Sharing entities between modules | Share via IDs and DTOs only |
| Skipping DI | Direct imports of implementations | Always inject interfaces |
| Business Logic in Views | Calculations or rules in .view.tsx | Move to entities or use cases |
| CRUD Thinking | Modeling data instead of behavior | Model business operations |
| Premature CQRS | Adding complexity before needed | Start simple, evolve when proven |
