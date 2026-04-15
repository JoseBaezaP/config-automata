# MCP Server Integrations

## Context7 - Library Documentation

### Configuration

```json
{
  "servers": {
    "context7": {
      "type": "http",
      "url": "https://mcp.context7.com/mcp",
      "headers": { "CONTEXT7_API_KEY": "${env:CONTEXT7_API_KEY}" }
    }
  }
}
```

### When to Use

- **Domain Layer** - TypeScript patterns, validation libraries (to create interface wrappers)
- **Application Layer** - React 19 hooks, Next.js 15 Server Actions
- **Infrastructure Layer** - External library APIs (HTTP clients, databases, cloud SDKs)
- **Testing** - Jest, React Testing Library, test patterns
- **General** - TypeScript, Next.js 15, React 19 documentation

### Usage by Layer

**Domain:** Understand libraries to create interface wrappers (never import directly).
```
Use MCP: "Get Zod documentation" -> Create IValidator interface -> Implement ZodValidator in infrastructure
```

**Application:** React and Next.js patterns.
```
Use MCP: "Get React 19 useCallback documentation"
Use MCP: "Get Next.js 15 Server Actions examples"
```

**Infrastructure:** External library APIs.
```
Use MCP: "Get Axios documentation" -> Create IHttpClient interface -> Implement AxiosHttpClient
```

### Best Practices

Always specify versions:
```
GOOD: "Get Next.js 15 Server Actions documentation"
BAD:  "Get Next.js documentation"
```

### External Library Integration Workflow

1. Get documentation via Context7
2. Create interface in `shared/domain/contracts/`
3. Implement in `shared/infrastructure/{service}/`
4. Inject interface via DI in application/domain layers

---

## shadcn - UI Components

### Configuration

```json
{
  "servers": {
    "shadcn": {
      "command": "npx",
      "args": ["shadcn@latest", "mcp"]
    }
  }
}
```

### When to Use

Only in the presentation layer:
- `application/presentation/ui/` - Creating shadcn wrappers
- `application/presentation/components/` - Building feature components
- `application/presentation/views/` - Composing views

### Workflow

1. **Search:** `Use MCP: "Search shadcn components for data table"`
2. **Add:** `Use MCP: "Add shadcn data-table component"` (installs to `src/components/ui/`)
3. **Wrap:**
   ```typescript
   // application/presentation/ui/data-table.tsx
   export { DataTable } from '@/components/ui/data-table';
   ```
4. **Use:**
   ```typescript
   // application/presentation/components/product-table/index.tsx
   import { DataTable } from '../../ui/data-table'; // From wrapper, NOT @/components/ui
   ```

### Rules

- Always create wrappers in `presentation/ui/`
- Import from ui/ wrappers (NEVER directly from `@/components/ui`)
- shadcn components are read-only (don't modify them)
- Never use shadcn in domain, use-cases, or infrastructure layers

### Styling

```typescript
// Tailwind directly on shadcn
<Button className="w-full bg-primary hover:bg-primary/90">Click</Button>

// CSS Modules for complex styling
import styles from './style.module.scss';
<Card className={styles.productCard}>...</Card>
```
