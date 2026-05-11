---
name: Plan Implementation
description: Transforma la iniciativa (iniciativa.json) + restricciones de arquitectura (architecture-constraints.json) en un plan de implementacion ordenado file-by-file con userStories derivadas de los grupos, plan de tests basado en Gherkin, y plan de commits. Desencadenar despues de detect-architecture cuando se necesite planear la implementacion de codigo, o cuando se ejecute el flujo Automata en Fase 2.
---

# Skill: Plan Implementation

## Proposito

Transformar requerimientos (grupos con Gherkin de `iniciativa.json`) + contexto tecnico (`architecture-constraints.json`) en un plan de implementacion concreto. El plan especifica: que archivos crear/modificar, en que orden, que tests escribir, como agrupar commits, y genera `userStories[]` que alimentan tanto la implementacion como la documentacion.

La razon de separar planificacion de implementacion es que planear requiere razonamiento profundo sobre arquitectura (modelo opus), mientras que implementar es ejecucion dirigida (modelo sonnet).

## Cuando Usar

- Despues de tener `iniciativa.json` y `architecture-constraints.json`
- Antes de invocar `implement-code`
- En Fase 2 del flujo Automata

## Entrada / Salida

**Entrada**:
- `nombre_iniciativa`: Nombre de la iniciativa
- **Requerido**: `tba-output/{nombre}/iniciativa.json`
- **Requerido**: `tba-output/{nombre}/architecture-constraints.json`

**Salida**: `tba-output/{nombre}/implementation-plan.json`

---

## Proceso

### 1. Cargar Inputs

```
[Read: tba-output/{nombre}/iniciativa.json]
[Read: tba-output/{nombre}/architecture-constraints.json]
```

Si `architecture-constraints.json` tiene `skillPath` y `referencePaths`, leer los archivos de referencia del skill para tener las convenciones completas.

### 1.5 Detectar Modo de Ejecución

Evaluar en cuál de estos tres modos operar:

| Condición | Modo |
|-----------|------|
| `architectureType !== "unknown"` | **Con código existente** — usar arquitectura detectada |
| `architectureType === "unknown"` Y hay ruta de proyecto | **Proyecto nuevo** — aplicar arquitectura seleccionada por el architect-planner |
| Sin `architecture-constraints.json` | **Conceptual** — sin proyecto de código (ver sección al final) |

**MODO PROYECTO NUEVO**: Si `architectureType === "unknown"`, el architect-planner ya habrá ejecutado la Selección de Arquitectura y documentado la decisión. Usar la estructura canónica de la arquitectura seleccionada (MVC, Screaming, Clean o Hexagonal) definida en el agente `architect-planner`. **NUNCA** generar estructura plana ad-hoc.

### 2. Construir User Stories desde Grupos

Para cada grupo aprobado en `iniciativa.json` (donde `confianza >= 0.85` y `aprobado === true`):

1. Crear una entry en `userStories[]`:
   - `id`: "US-{NN}" secuencial
   - `grupoRef`: ID del grupo (ej: "GRUPO-001")
   - `titulo`: `grupo.nombre`
   - `criteriosAceptacion`: Consolidar criterios de todos los elementos del grupo (max 5 bullets, concisos)
   - `escenariosPrueba`: IDs de los escenarios Gherkin del grupo

   **NO incluir**: `descripcion` (Como/Quiero/Para), `tecnologias`, `apisInvolucradas` — ya están en `iniciativa.json` y no deben duplicarse aqui.

2. Cada user story representa una unidad funcional completa que se implementa como un conjunto de archivos.

### 3. Analizar Requerimientos de Implementacion

Para cada user story, analizar los elementos de su grupo:

1. Leer `criteriosAceptacion` y `notasTecnicas` de cada elemento
2. Leer los `escenariosPrueba` del grupo (Gherkin)
3. Determinar que necesita implementarse:
   - Datos/modelos necesarios (→ domain layer)
   - APIs a consumir o exponer (→ infrastructure layer)
   - Logica de negocio/orquestacion (→ application layer)
   - UI/componentes (→ presentation layer)
   - Rutas/paginas (→ routing layer)

### 4. Mapear Requerimientos a Archivos

Usando `layerRules`, `namingConventions` y `folderStructure` de architecture-constraints:

**Para cada requerimiento, determinar:**
- Que archivos crear o modificar
- En que capa (domain, infrastructure, application, presentation, routing)
- Con que nombre (siguiendo `namingConventions`)
- En que ruta (siguiendo `folderStructure`)

**Para modificaciones**: Usar `Read` + `Glob` para verificar que el archivo existe.
**Para creaciones**: Verificar que no existe algo similar reutilizable.

### 5. Ordenar por Fases

Respetar `moduleCreationOrder` de architecture-constraints:

| Fase | Capa | Que se crea |
|------|------|-------------|
| 1 | Domain | Entidades, value objects, interfaces, DTOs, errores |
| 2 | Infrastructure | Repositorios, servicios externos, dependency injection |
| 3 | Application | Use cases, hooks |
| 4 | Presentation | UI wrappers, componentes, vistas |
| 5 | Routing | Pages, client wrappers, layouts |
| 6 | Tests | Unit tests, integration tests, component tests |

Si `architectureType` es `"unknown"` (proyecto nuevo), usar las fases de la arquitectura seleccionada por el architect-planner:

**MVC**:
1. Models / Tipos e interfaces
2. Services / Lógica de negocio + lib/validaciones
3. API Route Handlers (controladores)
4. Components / UI
5. Pages / Routing
6. Tests

**Screaming Architecture**:
1. Shared types y utils
2. Services y hooks por feature
3. API Routes por feature
4. Components por feature
5. Pages / Routing
6. Tests

**PROHIBIDO**: Usar orden genérico plano (`src/types/`, `src/data/`, `src/lib/` mezclados) sin que correspondan a una arquitectura definida. Si no hay `architectureDecision`, el architect-planner debe haberlo calculado primero — reportar error si falta.

### 6. Planear Tests

Para cada archivo de implementacion:

1. Asignar `testFile` en la entry del archivo (ruta al archivo de test)
2. Mapear escenarios Gherkin del grupo a test cases en el archivo de tests de la fase 6
3. Determinar mocks necesarios segun `testingRules.patterns`

**NO generar `testPlan[]` como seccion separada** — la informacion de tests vive en las entries de archivos (fase 6 de `implementationOrder`) y en el campo `testFile` de cada archivo de implementacion.

### 7. Planear Commits

Agrupar archivos en commits logicos:

**Estrategia**: Un commit por fase por user story:
1. `feat(<scope>): add domain layer for <US>` — entidades, VOs, contracts
2. `feat(<scope>): add infrastructure layer for <US>` — repos, DI
3. `feat(<scope>): add application layer for <US>` — use cases, hooks, views
4. `test(<scope>): add tests for <US>` — todos los tests de la US
5. `feat(<scope>): add routing for <US>` — pages, wrappers

### 8. Validar y Guardar

Antes de guardar:
- Cada archivo tiene `usReference` valido
- No hay archivos duplicados
- El orden de fases respeta dependencias
- Cada archivo de implementacion tiene test asociado
- Los commits cubren todos los archivos
- No hay violaciones de `dependencyRule` ni `criticalRules`

**Modo conceptual — validacion adicional de tipos:**
- Cada `tasks[].tipo` usa EXCLUSIVAMENTE uno de los valores validos: `"backend"`, `"frontend"`, `"bd"`, `"integracion"`, `"design-review"`, `"qa"`, `"deploy"`
- Si alguna tarea tiene un tipo diferente (ej: `"desarrollo"`, `"configuracion"`, `"pruebas"`), corregirlo antes de guardar
- Verificar que el titulo de cada tarea tiene el prefijo correcto: `[BACK]`, `[BD]`, `[FRONT]`, `[INTEG]`, `[DESIGN]`, `[QA]`, `[DEPLOY]`

```
[Write: tba-output/{nombre}/implementation-plan.json]
```

---

## Modo Conceptual (sin proyecto de codigo)

Cuando NO existe `architecture-constraints.json` o el orquestador indica que no hay proyecto de codigo, el skill opera en **modo conceptual**. En este modo:

- **NO** se generan `implementationOrder` ni `testPlan` (no hay archivos reales que crear)
- Las tareas tecnicas se definen directamente en cada `userStory.tasks[]`
- El objetivo es generar las tareas que apareceran en Azure DevOps bajo cada HU

### Schema en Modo Conceptual

**CRITICO: Usar EXACTAMENTE estos nombres de campo y valores de `tipo`.** El script `transform-plan-to-batch.js` depende de este schema para generar el `HUs_batch.json` correctamente.

```json
{
  "iniciativa": "nombre-de-la-iniciativa",
  "branch": "feature/nombre-de-la-iniciativa",
  "detectedArchitecture": "conceptual",
  "planningMode": "conceptual",
  "notes": "Plan conceptual — sin proyecto de codigo local. Las tareas definen el trabajo tecnico de cada HU.",
  "totalUserStories": 4,
  "totalTasks": 22,

  "userStories": [
    {
      "id": "US-001",
      "grupoRef": "GRUPO-001",
      "titulo": "Nombre de la HU",
      "descripcion": "Como [rol]\nQuiero [accion]\nPara [beneficio]",
      "criteriosAceptacion": ["Criterio 1", "Criterio 2"],
      "escenariosPrueba": ["ESC-001", "ESC-002"],
      "tecnologias": ["VTEX CMS", "React"],
      "apisInvolucradas": [],
      "estimacionTotal": "8 SP",
      "tasks": [
        {
          "id": "TASK-001",
          "titulo": "[CMS] Configurar Content Type en VTEX",
          "tipo": "backend",
          "descripcion": "Descripcion detallada de lo que hay que hacer...",
          "estimacion": "1 SP",
          "dependencias": [],
          "criteriosDone": [
            "Content Type creado con todos los campos",
            "Validaciones funcionando"
          ]
        },
        {
          "id": "TASK-002",
          "titulo": "[FRONT] Desarrollar componente carousel mobile",
          "tipo": "frontend",
          "descripcion": "Descripcion detallada...",
          "estimacion": "3 SP",
          "dependencias": ["TASK-001"],
          "criteriosDone": ["Componente renderiza correctamente"]
        }
      ]
    }
  ],

  "commitPlan": [],
  "summary": {
    "totalUserStories": 4,
    "totalTasks": 22,
    "totalEstimation": "46 SP"
  }
}
```

### Valores validos para `tasks[].tipo`

Equivalencias con las capas del modo con codigo:

| `tipo` | Tipo Azure | Equivalente en modo codigo | Cuando usar |
|--------|-----------|---------------------------|-------------|
| `"backend"` | BACK | Domain + Application + Infrastructure | Logica de negocio, use cases, servicios, endpoints, configuracion de CMS/schema |
| `"bd"` | BD | Domain (migraciones) | Cambios de esquema, DDL, scripts SQL, tablas nuevas, migraciones de BD |
| `"frontend"` | FRONT | Presentation + Routing | Componentes UI, vistas, paginas, estilos, diseño responsive |
| `"integracion"` | INTEG | Infrastructure (APIs externas) | Conexion con APIs de terceros, servicios externos, CMS como fuente de datos |
| `"design-review"` | FRONT | — | Revision visual contra Figma/mockups (no tiene equivalente en modo codigo) |
| `"qa"` | QA | Test | Pruebas funcionales, de integracion, visuales, cross-browser |
| `"deploy"` | BACK | Infrastructure (ops) | Publicacion, configuracion de ambiente, entrega a produccion |

**NUNCA usar** `"backend/cms"`, `"desarrollo"`, `"configuracion"`, `"pruebas"` u otros valores no listados — el script no los mapea correctamente.

### Formato del titulo de cada tarea

Siempre con prefijo entre corchetes que indica el tipo:

```
[BACK] Configurar Content Type Shortcuts en VTEX
[BD]   Crear migracion de tabla productos
[FRONT] Desarrollar componente Shortcuts Carousel mobile
[INTEG] Integrar componente con datos del CMS
[DESIGN] Revision de diseno vs Figma
[QA] Testing funcional ESC-001 a ESC-010
[DEPLOY] Publicacion en produccion y documentacion
```

---

## Reglas de Plan Compacto

**El plan debe ser lo mas conciso posible. El implementador no necesita prosa — necesita rutas, acciones y dependencias.**

| Campo | Regla |
|-------|-------|
| `userStories[].criteriosAceptacion` | Max 5 bullets, una linea cada uno |
| `implementationOrder[].files[].purpose` | Max 1 linea (15 palabras) |
| `implementationOrder[].files[].architectureNotes` | **PROHIBIDO** — eliminar este campo |
| `implementationOrder[].files[].contentGuidance` | **PROHIBIDO** — eliminar este campo |
| `testPlan[]` | **PROHIBIDO como seccion separada** — usar `testFile` en cada archivo |
| `commitPlan[].message` | Una sola linea: `"type(scope): descripcion"`. Sin cuerpo multi-linea. |
| `summary` | Solo conteos numericos — sin `phasesOrdered`, `criticalDecisions`, `notes` |
| `filesNotTouched[]` | **PROHIBIDO** — omitir esta seccion |
| `warnings[]` | Max 1 oracion cada uno |

## Estructura del JSON de Salida (Modo con Codigo)

```json
{
  "iniciativa": "consulta-tienda-por-cp",
  "branch": "feature/consulta-tienda-por-cp",
  "detectedArchitecture": "hexagonal",
  "planningMode": "with-code",
  "includeTests": true,
  "totalFiles": 8,
  "totalTests": 4,
  "totalCommits": 2,

  "architectureDecision": {
    "isNewProject": true,
    "selected": "mvc",
    "reason": "Score 6/12: 3 entidades, 4 HUs, 0 integraciones, 5 reglas.",
    "complexityScore": 6,
    "complexityBreakdown": { "entities": 2, "hus": 2, "integrations": 0, "businessRules": 2 },
    "skillUsed": "built-in",
    "alternativesConsidered": ["screaming"]
  },

  "userStories": [
    {
      "id": "US-001",
      "grupoRef": "GRUPO-001",
      "titulo": "Busqueda de tienda por codigo postal",
      "criteriosAceptacion": [
        "Muestra tienda asignada si hay cobertura activa",
        "Muestra mensaje si no hay cobertura",
        "Mapa centra marcador en coordenadas de la tienda"
      ],
      "escenariosPrueba": ["ESC-001", "ESC-002", "ESC-003"]
    }
  ],

  "implementationOrder": [
    {
      "phase": 1,
      "phaseName": "Domain Layer",
      "files": [
        {
          "id": "FILE-001",
          "action": "create",
          "path": "src/modules/stores/domain/contracts/store-lookup.interface.ts",
          "layer": "domain",
          "purpose": "IStoreLookupRepository con findByZipCode(cp: string): Promise<IStoreDTO[]>",
          "usReference": "US-001",
          "dependencies": [],
          "estimatedComplexity": "low",
          "testFile": "FILE-T01"
        }
      ]
    }
  ],

  "commitPlan": [
    {
      "commitId": "COMMIT-001",
      "type": "feat",
      "scope": "stores",
      "message": "feat(stores): add domain layer for store lookup by zip code",
      "files": ["FILE-001", "FILE-002"],
      "afterPhase": 1
    }
  ],

  "warnings": ["INVENTORY_USERNAME/PASSWORD son secretos server-side, nunca usar NEXT_PUBLIC_."],

  "summary": {
    "totalFiles": 8,
    "newFiles": 6,
    "modifiedFiles": 2,
    "deletedFiles": 0,
    "totalTests": 4,
    "totalCommits": 2,
    "architecture": "hexagonal"
  }
}
```

---

## Validaciones

**Pre-planificacion**:
- `iniciativa.json` existe y tiene al menos 1 grupo aprobado
- `architecture-constraints.json` existe
- Cada grupo tiene al menos 1 escenario de prueba
- Si `architectureType === "unknown"`: verificar que el architect-planner ejecutó la Selección de Arquitectura y hay una decisión clara antes de planificar

**Post-planificacion**:
- Cada archivo tiene `id`, `action`, `path`, `layer`, `usReference`
- Cada archivo de implementacion tiene un `testFile` asociado
- No hay IDs duplicados
- El orden de fases es correcto
- Los commits cubren TODOS los archivos
- `userStories[]` tiene una entry por cada grupo aprobado
- No hay dependencias circulares

## Conexion con Otros Skills

**Input de**: `analyze-initiative` (iniciativa.json), `detect-architecture` (architecture-constraints.json)
**Output para**: `implement-code`, `git-manager` (commit plan), `generate-requirements`, `generate-wiki`, `generate-ifao`, `create-azure-workitems`

---

## Ejemplo de Referencia

Ver [examples/implementation-plan.json](./examples/implementation-plan.json) para un plan completo.
