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

### 2. Construir User Stories desde Grupos

Para cada grupo aprobado en `iniciativa.json` (donde `confianza >= 0.85` y `aprobado === true`):

1. Crear una entry en `userStories[]`:
   - `id`: "US-{NN}" secuencial
   - `grupoRef`: ID del grupo (ej: "GRUPO-001")
   - `titulo`: `grupo.nombre`
   - `descripcion`: Sintetizar "Como/Quiero/Para" desde las descripciones de los elementos del grupo
   - `criteriosAceptacion`: Consolidar criterios de todos los elementos del grupo
   - `escenariosPrueba`: IDs de los escenarios Gherkin del grupo
   - `tecnologias`: Derivar de `architecture-constraints.json → techStack`
   - `apisInvolucradas`: Extraer de `elementos[].notasTecnicas` los endpoints mencionados

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

Si `architectureType` es "unknown", usar orden generico:
1. Tipos de datos / Interfaces
2. Servicios / Logica de negocio
3. Controladores / Endpoints
4. UI / Componentes
5. Tests

### 6. Planear Tests

Para cada archivo de implementacion:

1. Determinar el archivo de test segun `testingRules.testLocation`
2. Mapear escenarios Gherkin de `iniciativa.json → grupos[].escenariosPrueba[]` a test cases:
   - `Dado que...` → setup/arrange
   - `Cuando...` → act
   - `Entonces...` → assert
3. Determinar que mocks se necesitan segun `testingRules.patterns`
4. Verificar si existen tests similares en el proyecto para copiar patrones

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

```
[Write: tba-output/{nombre}/implementation-plan.json]
```

---

## Estructura del JSON de Salida

```json
{
  "iniciativa": "consulta-tienda-por-cp",
  "branch": "feature/consulta-tienda-por-cp",
  "detectedArchitecture": "hexagonal",
  "totalFiles": 8,
  "totalTests": 4,
  "totalCommits": 4,

  "userStories": [
    {
      "id": "US-001",
      "grupoRef": "GRUPO-001",
      "titulo": "Busqueda de tienda por codigo postal",
      "descripcion": "Como liveops\nQuiero ingresar un CP\nPara conocer la tienda que atiende un determinado codigo postal",
      "criteriosAceptacion": [
        "Si existe al menos una tienda activa con cobertura, se muestra la tienda asignada",
        "Si no existe cobertura, mostrar 'No existe tienda que atienda este CP'",
        "El mapa centra un marcador en las coordenadas de la tienda",
        "La direccion se muestra como: Calle + Numero, Colonia, Ciudad, Estado",
        "Los servicios se presentan como etiquetas (Delivery / Pick Up)"
      ],
      "escenariosPrueba": ["ESC-001", "ESC-002", "ESC-003", "ESC-004", "ESC-005"],
      "tecnologias": ["React 19", "Next.js 15", "TypeScript"],
      "apisInvolucradas": ["GET /stores?zipCode=XXXXX"]
    }
  ],

  "implementationOrder": [
    {
      "phase": 1,
      "phaseName": "Domain Layer",
      "description": "Interfaces, value objects y DTOs para consulta de tienda por CP",
      "files": [
        {
          "id": "FILE-001",
          "action": "create",
          "path": "src/modules/stores/domain/contracts/store-lookup.interface.ts",
          "layer": "domain",
          "purpose": "Interface IStoreLookupRepository para consulta de tiendas por CP",
          "usReference": "US-001",
          "dependencies": [],
          "estimatedComplexity": "low",
          "architectureNotes": "I-prefix obligatorio. Define metodo findByZipCode(cp: string): Promise<IStoreDTO[]>",
          "testFile": "FILE-T01",
          "contentGuidance": "Interface con metodo findByZipCode. Incluir IStoreDTO con campos: id, name, active, location, deliveryType, zipCodeCoverage"
        }
      ]
    }
  ],

  "testPlan": [
    {
      "id": "FILE-T01",
      "testFile": "src/tests/modules/stores/domain/value-objects/zip-code.test.ts",
      "sourceFile": "FILE-002",
      "testType": "unit",
      "gherkinScenarios": ["ESC-004"],
      "mockDependencies": [],
      "description": "Tests puros de dominio: validacion formato CP 5 digitos"
    }
  ],

  "commitPlan": [
    {
      "commitId": "COMMIT-001",
      "type": "feat",
      "scope": "stores",
      "message": "feat(stores): add domain layer for store lookup by zip code\n\nCreate IStoreLookupRepository interface, IStoreDTO, and ZipCode\nvalue object with 5-digit validation.\n\nRefs: US-001\nInitiative: consulta-tienda-por-cp",
      "files": ["FILE-001", "FILE-002"],
      "afterPhase": 1
    }
  ]
}
```

---

## Validaciones

**Pre-planificacion**:
- `iniciativa.json` existe y tiene al menos 1 grupo aprobado
- `architecture-constraints.json` existe
- Cada grupo tiene al menos 1 escenario de prueba

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
