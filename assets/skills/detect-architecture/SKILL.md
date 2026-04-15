---
name: Detect Architecture
description: Analiza un proyecto de codigo fuente para detectar su arquitectura, extraer restricciones, convenciones, patrones de testing, y contexto completo del proyecto (tech stack, APIs, BD, integraciones). Genera architecture-constraints.json que alimenta al architect-planner, code-implementor y doc-generator. Desencadenar al inicio del flujo Automata despues de analyze-initiative, o cuando se necesite analizar un proyecto antes de implementar.
---

# Skill: Detect Architecture

## Proposito

Analizar un proyecto de codigo fuente para:
1. Detectar que arquitectura usa y extraer sus restricciones
2. Entender el contexto completo del proyecto (tech stack, APIs, BD, integraciones, testing)

Todo en un solo output JSON que sirve como fuente de verdad del proyecto para todos los agentes downstream.

## Cuando Usar

- Al inicio del flujo Automata, despues de `analyze-initiative`
- Cuando se necesite entender un proyecto antes de planear implementacion
- Antes de invocar `plan-implementation`

## Entrada / Salida

**Entrada**:
- `ruta_proyecto`: Path absoluto al proyecto a analizar
- `nombre_iniciativa`: Nombre de la iniciativa (para rutas de output)

**Salida**: `tba-output/{nombre}/architecture-constraints.json`

---

## Proceso

### Paso 0: Analizar Contexto del Proyecto

Antes de detectar la arquitectura, analizar el proyecto completo para entender su contexto. Este paso reemplaza al antiguo skill `analyze-with-project`.

#### 0.1 Estructura del Proyecto
```
[Glob: src/**/*]
[Read: package.json]
```
Mapear la estructura de directorios principales y su proposito.

#### 0.2 Stack Tecnologico
Leer `package.json` (dependencies + devDependencies) para detectar:
- Runtime (Node.js version en engines)
- Framework (Next.js, NestJS, Express, etc.)
- Lenguaje (TypeScript strict?, JavaScript?)
- Base de datos (pg, mysql2, mongodb, prisma, typeorm)
- ORM (Prisma, TypeORM, Sequelize, Mongoose)
- Testing (jest, vitest, mocha, cypress, playwright)
- Build (webpack, vite, turbopack, esbuild)
- Librerias clave (shadcn, tailwind, zod, axios, etc.)

#### 0.3 UI / Frontend
Buscar y leer archivos clave:
```
[Glob: src/components/**/*.tsx]
[Glob: src/app/**/*.tsx]
```
Detectar: framework UI, libreria de componentes, state management, routing.

#### 0.4 APIs y Endpoints
```
[Grep: "@Get|@Post|@Patch|@Put|@Delete|app.get|app.post|router.get"]
```
Listar endpoints con modulo, ruta, metodos HTTP, controlador/handler.

#### 0.5 Base de Datos
```
[Glob: prisma/schema.prisma OR src/**/entities/*.ts OR src/**/models/*.ts]
[Glob: **/migrations/**]
```
Detectar: tipo BD, ORM, entidades, relaciones, migraciones.

#### 0.6 Integraciones Externas
```
[Grep: "fetch|axios|HttpService|http.get|https.request"]
```
Listar servicios externos, tipo (REST/GraphQL/gRPC), clientes HTTP usados.

#### 0.7 Testing
```
[Glob: **/*.test.ts OR **/*.spec.ts OR **/__tests__/**]
[Read: jest.config.* OR vitest.config.*]
```
Detectar: framework, ubicacion de tests, cantidad, patrones de mock, coverage.

#### 0.8 CI/CD e Infraestructura
```
[Glob: Dockerfile OR docker-compose.* OR .github/workflows/** OR azure-pipelines.yml]
```
Detectar: Docker, pipeline, stages, environments.

### Paso 1: Deteccion de Skill Explicito (mayor confianza)

Buscar skills de arquitectura configurados:

1. **Skills del agente TBA**: Buscar en `claude/skills/` cualquier SKILL.md cuya descripcion contenga keywords:
   - `hexagonal`, `clean architecture`, `DDD`, `ports and adapters`
   - `domain layer`, `application layer`, `infrastructure layer`
   - `entities`, `value objects`, `use cases`, `repositories`

2. **Skills del proyecto**: Buscar en `{ruta_proyecto}/.claude/` por skills de arquitectura

3. **CLAUDE.md del proyecto**: Buscar en `{ruta_proyecto}/CLAUDE.md` por reglas arquitectonicas

**Si se encuentra un skill (ej: hexagonal-architect):**
- Leer `SKILL.md` completo
- Leer todos los archivos en `references/project/`
- Extraer reglas criticas, decision trees, anti-patterns
- Establecer `architectureType` y `skillPath`

### Paso 2: Inferencia de Estructura (confianza media)

Si no hay skill explicito, inferir del codigo:

| Patron detectado | Arquitectura |
|-----------------|-------------|
| `src/modules/*/domain/` + `application/` + `infrastructure/` | hexagonal |
| `src/domain/` + `src/application/` + `src/infrastructure/` | clean-architecture |
| `src/controllers/` + `src/services/` + `src/models/` | mvc |
| `src/features/*/` con subcarpetas mixtas | feature-based |
| Ninguno de los anteriores | unknown |

Ademas, leer 5-10 archivos para detectar:
- Sufijos de archivos (`.controller.ts`, `.use-case.ts`, etc.)
- Prefijos de interfaces (`I` prefix)
- Naming de archivos (kebab-case, camelCase, PascalCase)
- Direccion de dependencias entre carpetas

### Paso 3: Fallback (confianza baja)

Si no se puede determinar la arquitectura:
- `architectureType: "unknown"`
- Extraer solo patrones de testing y naming observados
- El implementor seguira los patrones existentes leyendo archivos similares

---

## Estructura del JSON de Salida

```json
{
  "architectureType": "hexagonal",
  "detectionMethod": "explicit-skill",
  "confidence": 0.95,
  "skillPath": "claude/skills/hexagonal-architect/SKILL.md",
  "referencePaths": [
    "claude/skills/hexagonal-architect/references/project/domain-layer.md",
    "claude/skills/hexagonal-architect/references/project/application-layer.md",
    "claude/skills/hexagonal-architect/references/project/infrastructure-layer.md",
    "claude/skills/hexagonal-architect/references/project/folder-structure.md",
    "claude/skills/hexagonal-architect/references/project/naming-conventions.md",
    "claude/skills/hexagonal-architect/references/project/testing-guidelines.md"
  ],
  "layerRules": {
    "domain": {
      "path": "src/modules/{module}/domain/",
      "subfolders": ["entities", "value-objects", "contracts", "errors"],
      "canImportFrom": ["domain"],
      "restrictions": ["Zero framework dependencies", "Zero node_modules imports"]
    },
    "application": {
      "path": "src/modules/{module}/application/",
      "subfolders": ["use-cases", "hooks", "presentation"],
      "canImportFrom": ["domain", "application"],
      "restrictions": ["No infrastructure imports"]
    },
    "infrastructure": {
      "path": "src/modules/{module}/infrastructure/",
      "subfolders": ["repositories", "services"],
      "canImportFrom": ["domain", "application", "infrastructure"],
      "restrictions": []
    }
  },
  "namingConventions": {
    "fileNaming": "kebab-case",
    "entityPattern": "{name}.ts",
    "valueObjectPattern": "{name}.ts",
    "interfacePattern": "{name}.interface.ts",
    "dtoPattern": "{name}.dto.ts",
    "errorPattern": "{name}.error.ts",
    "useCasePattern": "{action}-{entity}.use-case.ts",
    "hookPattern": "use-{feature}.hook.ts",
    "viewPattern": "{name}.view.tsx",
    "repositoryPattern": "{name}.repository.ts",
    "servicePattern": "{provider}-{name}.service.ts",
    "componentPattern": "{name}/index.tsx",
    "testPattern": "{source-name}.test.ts"
  },
  "folderStructure": {
    "moduleTemplate": "src/modules/{name}/",
    "routingTemplate": "src/app/{route}/",
    "testTemplate": "src/tests/modules/{module}/{layer}/",
    "sharedModule": "src/modules/shared/",
    "uiComponents": "src/components/ui/"
  },
  "testingRules": {
    "framework": "jest",
    "componentFramework": "@testing-library/react",
    "e2eFramework": null,
    "coverageTarget": "90%",
    "testLocation": "src/tests/modules/{module}/{layer}/",
    "patterns": {
      "domain": "Pure unit tests, no mocks, no external dependencies",
      "useCase": "Mock all repositories/services, test orchestration + DTO conversion",
      "hook": "renderHook + mocked use cases, test loading/error/success states",
      "component": "@testing-library/react + user-event, test user flows not implementation"
    },
    "existingTestExamples": [
      "src/tests/modules/stores/domain/entities/store.test.ts"
    ]
  },
  "criticalRules": [
    "Domain is pure - zero framework dependencies",
    "One use case = one execute() implementing IUseCase<TInput, TOutput>",
    "Max 3 dependencies per constructor",
    "Max 300 lines per file",
    "I-prefix on all interfaces",
    "kebab-case for all file names"
  ],
  "moduleCreationOrder": ["domain", "infrastructure", "application", "presentation", "routing", "tests"],
  "dependencyRule": "Infrastructure -> Application -> Domain (always inward)",
  "antiPatterns": [
    "Anemic Domain Model - entities must contain business logic",
    "Leaking Infrastructure - domain must not import framework libs",
    "God Use Case - one class = one execute()"
  ],
  "techStack": {
    "framework": "Next.js 15 (App Router)",
    "language": "TypeScript (strict)",
    "ui": "shadcn/ui + Tailwind CSS",
    "stateManagement": "React hooks with DI",
    "orm": "Prisma",
    "httpClient": "fetch / custom IHttpClient"
  },
  "projectContext": {
    "projectStructure": "src/modules/ (hexagonal modules), src/app/ (Next.js routes), src/components/ui/ (shadcn wrappers), src/tests/ (mirror structure)",
    "stackTecnologico": {
      "runtime": "Node.js 20",
      "framework": "Next.js 15 (App Router)",
      "language": "TypeScript 5.x (strict)",
      "database": "PostgreSQL",
      "orm": "Prisma",
      "testing": "Jest + React Testing Library",
      "build": "Turbopack",
      "keyLibraries": ["shadcn/ui", "tailwindcss", "zod", "react-hook-form"]
    },
    "ui": {
      "framework": "React 19",
      "library": "shadcn/ui + Tailwind CSS",
      "components": ["src/components/ui/*", "src/modules/*/application/presentation/*"],
      "stateManagement": "React hooks with DI",
      "styling": "CSS Modules (style.module.scss) + 7-1 SASS",
      "routing": "Next.js App Router (src/app/)"
    },
    "apis": [
      {
        "module": "stores",
        "endpoint": "/api/stores",
        "methods": ["GET", "POST", "PATCH"],
        "description": "CRUD de tiendas con filtros por zipCode, city, state"
      }
    ],
    "database": {
      "type": "PostgreSQL",
      "orm": "Prisma",
      "migrationsPath": "prisma/migrations/",
      "entities": [
        { "name": "Store", "path": "src/modules/stores/domain/entities/store.ts" }
      ],
      "relationships": ["Store 1:N Capacity", "Store 1:N BlackoutDate"]
    },
    "integrations": [
      {
        "service": "HEB Cart Services API",
        "type": "REST",
        "baseUrl": "https://heb-cart-services.styrk.io/api",
        "client": "IHttpClient wrapper"
      }
    ],
    "testing": {
      "framework": "Jest",
      "componentFramework": "@testing-library/react",
      "testFilesCount": 45,
      "coverageCommand": "npm test -- --coverage",
      "exampleTestPaths": [
        "src/tests/modules/stores/domain/entities/store.test.ts"
      ]
    },
    "cicd": {
      "docker": true,
      "pipeline": "Azure Pipelines",
      "stages": ["build", "test", "deploy"],
      "environments": ["dev", "staging", "production"]
    },
    "notes": "Soft-delete pattern. Multi-tenant via tenant header. Pagination via cursor."
  }
}
```

---

## Validaciones

**Pre-deteccion**:
- `ruta_proyecto` existe y contiene codigo fuente
- Directorio tiene al menos `package.json` o `pom.xml` o similar

**Post-deteccion**:
- JSON generado es valido
- `architectureType` tiene un valor (aunque sea "unknown")
- `testingRules` tiene al menos `framework` detectado
- `projectContext` tiene al menos `stackTecnologico` con `framework` detectado
- Si `detectionMethod` es "explicit-skill", `skillPath` no esta vacio

## Manejo de Errores

| Error | Accion |
|-------|--------|
| Proyecto no existe | Reportar error, sugerir verificar ruta |
| No hay archivos de codigo | Reportar, generar constraints minimos con "unknown" |
| Skill encontrado pero no legible | Log warning, continuar con Capa 2 |
| Multiples arquitecturas detectadas | Reportar ambiguedad, pedir confirmacion al usuario |

## Conexion con Otros Skills

**Input de**: Orquestador (ruta del proyecto)
**Output para**: `plan-implementation`, `implement-code`, `generate-requirements`, `generate-wiki`, `generate-ifao`

---

## Ejemplo de Referencia

Ver [examples/architecture-constraints.json](./examples/architecture-constraints.json) para un output completo.
