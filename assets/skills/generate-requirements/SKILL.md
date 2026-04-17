---
name: Generate Requirements
description: Genera requerimientos no funcionales, integraciones tecnicas, diagramas Mermaid y matriz de riesgos a partir de la iniciativa, plan de implementacion y restricciones de arquitectura. El output (Requirements.json) alimenta los skills generate-wiki y generate-ifao. Desencadenar cuando se necesite analizar riesgos tecnicos, generar requerimientos no funcionales, crear diagramas de arquitectura, o despues de plan-implementation.
---

# Skill: Generate Requirements

## Proposito

Analiza la iniciativa y el plan de implementacion para generar un JSON estructurado con 4 secciones: requerimientos no funcionales, integraciones tecnicas, diagramas Mermaid y matriz de riesgos. Este JSON es la fuente de datos para generate-wiki (TR.md) y generate-ifao (IFAO.md).

La razon de separar esto en un skill independiente (en vez de generarlo inline en el TR o IFAO) es que estos datos se consumen en multiples documentos downstream. Generarlos una sola vez garantiza consistencia entre el TR.md y el IFAO.md.

## Cuando Usar

- Despues de `plan-implementation` (cuando ya existe implementation-plan.json)
- Antes de `generate-wiki` y `generate-ifao`

## Entrada / Salida

**Entrada**:
- `nombre_iniciativa`: Nombre de la iniciativa
- **Requerido**: `tba-output/{nombre}/iniciativa.json` (requerimientos, Gherkin, reglas de negocio)
- **Requerido**: `tba-output/{nombre}/implementation-plan.json` (userStories, archivos, capas, APIs)
- **Requerido**: `tba-output/{nombre}/architecture-constraints.json` (tech stack, projectContext, integraciones)

**Salida**: `tba-output/{nombre}/Requirements.json`

---

## Estructura del JSON de Salida

```json
{
  "requerimientos_no_funcionales": {
    "Rendimiento": "...",
    "Seguridad": "...",
    "Fiabilidad": "...",
    "Usabilidad": "...",
    "Mantenimiento": "...",
    "Escalabilidad": "..."
  },
  "integraciones_tecnicas": {
    "descripcion_tecnica": "...",
    "sistemas_involucrados": [
      { "sistema": "...", "tipo": "...", "endpoint": "..." }
    ],
    "interfaces": "...",
    "flujos_de_datos": "...",
    "autenticacion_y_autorizacion": "..."
  },
  "diagramas_mermaid": {
    "proceso_principal": "flowchart TD\n  A[...] --> B[...]",
    "secuencia_interaccion": "sequenceDiagram\n  participant A\n  ...",
    "flujo_de_datos": "flowchart LR\n  A[...] --> B[...]"
  },
  "matriz_de_riesgos": [
    {
      "id": "Riesgo-001",
      "descripcion": "...",
      "probabilidad": 3,
      "impacto": 2,
      "nivel_riesgo": 6,
      "clasificacion": "Riesgo",
      "tipo_riesgo": "Tecnico",
      "recomendacion": "..."
    }
  ]
}
```

**La salida debe ser JSON puro** — sin markdown wrapping, sin texto adicional.

---

## Proceso

### 1. Leer Entrada

```
[Read: file_path="tba-output/{nombre}/implementation-plan.json"]
[Read: file_path="tba-output/{nombre}/iniciativa.json"]
[Read: file_path="tba-output/{nombre}/architecture-constraints.json"]
```

Extraer de `implementation-plan.json`:
- `userStories[].tecnologias` -> stack tecnologico
- `userStories[].apisInvolucradas` -> endpoints e integraciones
- `implementationOrder[].files[].layer` -> tipos de trabajo (domain, infrastructure, application, presentation, test)
- `userStories[].criteriosAceptacion` -> restricciones funcionales

Extraer de `iniciativa.json`:
- `grupos[].escenariosPrueba[].gherkin` -> escenarios de prueba
- `elementos[].reglasNegocio` -> reglas de negocio
- `elementos[].notasTecnicas` -> notas tecnicas con endpoints

Extraer de `architecture-constraints.json`:
- `projectContext.stackTecnologico` -> tech stack detallado
- `projectContext.integrations` -> integraciones existentes
- `criticalRules` -> restricciones arquitectonicas

### 2. Requerimientos No Funcionales

Generar un texto descriptivo para cada una de las 6 dimensiones. Cada texto debe ser especifico a esta iniciativa, no generico.

| Dimension | Que analizar | Fuentes |
|-----------|-------------|---------|
| **Rendimiento** | Tiempos de respuesta esperados, volumen de datos, concurrencia | files con layer domain/infrastructure, criteriosAceptacion |
| **Seguridad** | Autenticacion, autorizacion, proteccion de datos, compliance | files con layer infrastructure + auth, integraciones externas |
| **Fiabilidad** | Tolerancia a fallos, reintentos, fallbacks, logs | apisInvolucradas, criterios que mencionan errores |
| **Usabilidad** | Accesibilidad, responsive, UX, feedback al usuario | files con layer presentation/routing, criterios de UI |
| **Mantenimiento** | Modularidad, testing, documentacion, desacoplamiento | architecture-constraints.json criticalRules, testPlan |
| **Escalabilidad** | Crecimiento de datos, usuarios, nuevas funcionalidades | Volumen de userStories, integraciones futuras |

**Ejemplo bueno** (especifico):
```
"Rendimiento": "Tiempo de respuesta <200ms para GET /api/stores, soporte para 500+ tiendas con paginacion, carga lazy de componentes en formulario de detalle"
```

**Ejemplo malo** (generico):
```
"Rendimiento": "El sistema debe tener buen rendimiento y tiempos de respuesta aceptables"
```

### 3. Integraciones Tecnicas

Analizar `userStories[].apisInvolucradas` y files con `layer: "infrastructure"` del `implementationOrder` para construir:

- **descripcion_tecnica**: Parrafo que describe el landscape de integraciones
- **sistemas_involucrados**: Array de objetos con sistema, tipo (REST, FTP, SMTP, Queue, etc.) y endpoint
- **interfaces**: Descripcion de los protocolos y formatos (JSON, XML, TXT, etc.)
- **flujos_de_datos**: Como se mueven los datos entre sistemas
- **autenticacion_y_autorizacion**: Mecanismos de seguridad entre sistemas (JWT, API Keys, OAuth, etc.)

Usar `architecture-constraints.json` -> `projectContext.integrations` para enriquecer con:
- HTTP clients reales del proyecto (axios, HttpService, fetch)
- Patrones de integracion existentes
- Message queues o event systems ya implementados

### 4. Diagramas Mermaid

Generar 3 diagramas que representen la arquitectura de la iniciativa. Cada diagrama debe usar sintaxis Mermaid valida.

#### proceso_principal (flowchart TD)

Diagrama de flujo top-down del proceso principal de la iniciativa. Debe mostrar:
- Actores/sistemas que inician el proceso
- Pasos principales con decisiones
- Resultados finales (exito y error)

```
flowchart TD
    A[Usuario accede a pantalla] --> B[Frontend carga datos]
    B --> C[Backend valida request]
    C --> D{Datos validos?}
    D -->|Si| E[Guardar en BD]
    D -->|No| F[Retornar error]
    E --> G[Confirmar al usuario]
```

#### secuencia_interaccion (sequenceDiagram)

Diagrama de secuencia mostrando la interaccion entre componentes. Derivar los participantes de:
- Tareas [FRONT] -> Frontend/UI
- Tareas [BACK] -> Backend/API
- Tareas [BD] -> Base de Datos
- Tareas [INTEG] -> Sistemas externos
- Actores (usuario, admin, etc.)

```
sequenceDiagram
    participant User
    participant Frontend
    participant Backend
    participant DB
    User->>Frontend: Accion
    Frontend->>Backend: Request
    Backend->>DB: Query
    DB-->>Backend: Result
    Backend-->>Frontend: Response
    Frontend-->>User: Feedback
```

#### flujo_de_datos (flowchart LR)

Diagrama left-to-right mostrando como fluyen los datos entre sistemas. Usar etiquetas en las flechas para indicar el tipo de operacion.

```
flowchart LR
    A[Frontend] --POST /api/stores--> B[Backend]
    B --INSERT--> C[PostgreSQL]
    B --notify--> D[Email Service]
```

### 5. Matriz de Riesgos

Identificar riesgos reales y especificos de esta iniciativa. Evitar riesgos genericos que aplican a cualquier proyecto.

**Criterios de evaluacion**:

| Nivel | Probabilidad | Impacto |
|-------|-------------|---------|
| 1 (Bajo) | Poco probable, requiere multiples fallos simultaneos | Impacto minimo, workaround facil |
| 2 (Medio) | Posible bajo condiciones especificas | Impacto moderado, requiere intervencion pero no detiene operacion |
| 3 (Alto) | Probable en condiciones normales de operacion | Impacto grave, detiene operacion o afecta datos criticos |

**Clasificacion**: `nivel_riesgo = probabilidad * impacto`. Si > 4 = "Riesgo", si <= 4 = "Aceptable".

**Ordenar el array descendente por `nivel_riesgo`**.

**Tipos de riesgo comunes**: Tecnico, Funcional, Seguridad, De Datos, Operativo, De Integracion.

Generar entre 4 y 8 riesgos. Considerar:
- Integraciones con sistemas externos (timeouts, cambios de API, disponibilidad)
- Cambios de BD (migraciones, datos existentes, rollback)
- Seguridad (acceso no autorizado, datos sensibles)
- Rendimiento (volumen de datos, concurrencia)
- Dependencias entre HUs

### 6. Validar y Guardar

**Validaciones**:
- JSON valido y parseable
- 6 dimensiones de requerimientos no funcionales presentes con contenido especifico
- 5 claves de integraciones tecnicas presentes
- 3 diagramas Mermaid con sintaxis valida (verificar que no tengan errores de parsing)
- Matriz de riesgos con al menos 4 riesgos, ordenada descendente por nivel_riesgo
- Clasificaciones correctas (>4 = "Riesgo", <=4 = "Aceptable")
- nivel_riesgo = probabilidad * impacto (verificar la multiplicacion)

Guardar con `Write`:
```
[Write: file_path="tba-output/{nombre}/Requirements.json"]
```

Mostrar resumen: cantidad de riesgos por clasificacion, dimensiones cubiertas, integraciones detectadas.

---

## Manejo de Errores

| Error | Accion |
|-------|--------|
| implementation-plan.json no existe | Reportar error, sugerir ejecutar plan-implementation primero |
| userStories sin apisInvolucradas | Generar integraciones basicas del stack en architecture-constraints.json |
| Sin files con layer infrastructure | Seccion integraciones basada solo en apisInvolucradas |
| Mermaid con sintaxis invalida | Verificar y corregir antes de guardar |

## Conexion con Otros Skills

**Input de**: `plan-implementation` -> implementation-plan.json, `analyze-initiative` -> iniciativa.json, `detect-architecture` -> architecture-constraints.json

**Output para**:
- `generate-wiki` -> usa Requirements.json para secciones tecnicas del TR.md
- `generate-ifao` -> usa Requirements.json para factibilidad, riesgos y diagramas
