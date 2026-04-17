---
name: Generate Wiki (TR.md)
description: Genera documentacion tecnica completa (TR.md) en formato Markdown a partir de la iniciativa, plan de implementacion, requerimientos y restricciones de arquitectura. El TR.md se sube al Wiki de Azure DevOps y es el documento principal de referencia tecnica. Desencadenar despues de generate-requirements, o cuando se necesite crear el documento de Requerimientos Tecnicos, generar el TR, o documentacion tecnica para el wiki.
---

# Skill: Generate Wiki (TR.md)

## Proposito

Genera un documento Markdown de Requerimientos Tecnicos (TR.md) completo y profesional, listo para publicar en Azure DevOps Wiki. Transforma datos estructurados (iniciativa + plan de implementacion + requirements) en documentacion legible para arquitectos, lideres de proyecto y desarrolladores.

## Cuando Usar

- Despues de `generate-requirements`
- Antes de `generate-ifao`
- Cuando se necesita el documento tecnico principal para el wiki

## Entrada / Salida

**Entrada**:
- `nombre_iniciativa`: Nombre de la iniciativa
- **Requerido**: `tba-output/{nombre}/iniciativa.json` (requerimientos, Gherkin)
- **Requerido**: `tba-output/{nombre}/implementation-plan.json` (userStories, archivos por capa)
- **Requerido**: `tba-output/{nombre}/Requirements.json` (NFRs, diagramas, riesgos)
- **Requerido**: `tba-output/{nombre}/architecture-constraints.json` (tech stack, projectContext)
- **Opcional**: Configuracion de producto (roles)

**Salida**: `tba-output/{nombre}/TR.md`

---

## Conversion HTML a Markdown

Los campos de `implementation-plan.json` (`descripcion`, `criteriosAceptacion`, `contentGuidance`) son texto plano. El TR.md debe ser Markdown puro — no se requiere conversion HTML->MD.

| HTML | Markdown |
|------|----------|
| `<p class="editor-paragraph">texto</p>` | `texto\n` |
| `<strong class="editor-text-bold">texto</strong>` | `**texto**` |
| `<ul><li>item</li></ul>` | `- item` |
| `<br>` o `<br><br>` | `\n` |

**Excepcion**:
- Diagramas Mermaid en Requirements.json: Ya usan `::: mermaid ... :::` -> copiar directamente

---

## Estructura del TR.md (10 secciones)

### 1. Titulo Principal

```markdown
# Documentacion Tecnica: {titulo descriptivo de la iniciativa}
```

**Fuente**: Derivar del contexto general de las HUs.

### 2. Resumen Ejecutivo

Parrafo de 2-3 lineas sintetizando el proposito principal.

**Fuente**: `implementation-plan.json` -> `userStories[]` + `Requirements.json` -> `integraciones_tecnicas.descripcion_tecnica`

### 3. Datos Informativos

Tabla con los roles del equipo.

**Fuente de datos**: Configuracion de producto proporcionada por el orquestador. Si se recibe `projectKey`, leer roles de [config/productos.json](./config/productos.json):
- `Product_Owner` (array) -> tomar primer elemento
- `Scrum_Master` (array) -> tomar primer elemento
- `Lideres_Tecnicos` (array) -> unir con comas
- `TBA` -> usar directamente

| Rol | Nombre |
|-----|--------|
| Product Owner | {nombre} |
| Scrum Master | {nombre} |
| Lideres Tecnicos | {nombres separados por coma} |
| TBA | {nombre} |

### 4. Historias de Usuario

Para cada user story en `implementation-plan.json` -> `userStories[]`:

```markdown
### {N}. {userStory.titulo}

**Descripcion:**
{userStory.descripcion}

#### Criterios de Aceptacion
{userStory.criteriosAceptacion como lista Markdown (cada item es un bullet)}

#### Tareas Tecnicas de Implementacion

Para cada archivo en `implementationOrder[].files[]` donde `usReference == userStory.id`:

##### {N}.{M} {file.purpose}

**Capa**: {file.layer} | **Archivo**: `{file.path}`

**Detalle:**
{file.contentGuidance}

{file.architectureNotes si existe}
```

**Regla importante**: Las tareas `[QA]` se excluyen de esta seccion. Se muestran en la seccion 5. Esto es porque los escenarios QA tienen una estructura diferente (Gherkin) y es mas util tenerlos agrupados.

### 5. Escenarios de Prueba

Leer los escenarios de `iniciativa.json` -> `grupos[].escenariosPrueba[]`. Para cada user story en `implementation-plan.json`, filtrar los escenarios cuyo `id` aparece en `userStory.escenariosPrueba[]`:

```markdown
## Escenarios de Prueba para las HUs

### {N}. {userStory.titulo}

Para cada escenario en `grupos[].escenariosPrueba[]` donde el id esta en `userStory.escenariosPrueba`:

#### {escenario.titulo} ({escenario.tipo})

{escenario.gherkin — copiar el bloque Gherkin completo preservando indentacion y keywords Dado/Cuando/Entonces}
```

### 6. Solucion Tecnica y Arquitectura

Usar `Requirements.json` -> `integraciones_tecnicas` para generar 5 subsecciones:

| Subseccion | Fuente en Requirements.json |
|------------|---------------------------|
| Descripcion Tecnica | `integraciones_tecnicas.descripcion_tecnica` |
| Sistemas Involucrados | `integraciones_tecnicas.sistemas_involucrados` |
| Interfaces y Eventos | `integraciones_tecnicas.interfaces` |
| Flujos de Datos | `integraciones_tecnicas.flujos_de_datos` |
| Autenticacion y Autorizacion | `integraciones_tecnicas.autenticacion_y_autorizacion` |

### 7. Diagramas de Arquitectura

Insertar los 3 diagramas de `Requirements.json` -> `diagramas_mermaid`:

```markdown
## Diagramas de Arquitectura

### Proceso Principal
::: mermaid
{diagramas_mermaid.proceso_principal}
:::

### Secuencia de Interaccion
::: mermaid
{diagramas_mermaid.secuencia_interaccion}
:::

### Flujo de Datos
::: mermaid
{diagramas_mermaid.flujo_de_datos}
:::
```

**Formato obligatorio**: `::: mermaid ... :::` (renderiza en Azure DevOps Wiki). **NO** usar ` ```mermaid ``` ` (bloques de codigo).

### 8. Requerimientos No Funcionales

Lista con las 6 dimensiones de `Requirements.json` -> `requerimientos_no_funcionales`:

```markdown
- **Rendimiento:** {texto}
- **Seguridad:** {texto}
- **Fiabilidad:** {texto}
- **Usabilidad:** {texto}
- **Mantenimiento:** {texto}
- **Escalabilidad:** {texto}
```

### 9. Matriz de Analisis de Riesgos

Tabla derivada de `Requirements.json` -> `matriz_de_riesgos`:

| ID | Descripcion | Probabilidad | Impacto | Nivel de Riesgo | Clasificacion | Tipo de Riesgo | Recomendacion |
|----|-------------|--------------|---------|-----------------|---------------|----------------|---------------|
| {id} | {desc} | {prob} | {imp} | {nivel} | {clasif} | {tipo} | {recom} |

### 10. Stack Tecnologico y APIs

Dos subsecciones derivadas de `implementation-plan.json` + `architecture-constraints.json`:

**Tecnologias Involucradas**: Unificar todos los arrays `tecnologias` de `userStories[]` (sin duplicados), complementar con `architecture-constraints.json` -> `projectContext.techStack`.

**APIs y Eventos de Conexion**: Unificar todos los arrays `apisInvolucradas` de `userStories[]` (sin duplicados).

---

## Proceso

### 1. Leer Entrada

```
[Read: file_path="tba-output/{nombre}/implementation-plan.json"]
[Read: file_path="tba-output/{nombre}/iniciativa.json"]
[Read: file_path="tba-output/{nombre}/Requirements.json"]
[Read: file_path="tba-output/{nombre}/architecture-constraints.json"]
```

### 2. Generar Documento

Seguir la estructura de 10 secciones documentada arriba. Para cada seccion:
1. Identificar la fuente de datos (implementation-plan.json, iniciativa.json, o Requirements.json)
2. Aplicar conversion HTML->MD donde aplique
3. Formatear en Markdown puro

### 3. Validar y Guardar

**Validaciones antes de guardar**:
- 10 secciones presentes
- Tareas QA separadas de tareas de implementacion (seccion 4 vs 5)
- Diagramas Mermaid con `::: mermaid ... :::` (NO ` ```mermaid ``` `)
- NO hay tags HTML en el documento final (`<p class=`, `<strong class=`, `<ul>`, `<br>`)
- Markdown valido (tablas, listas, headers correctos)

Guardar con `Write`:
```
[Write: file_path="tba-output/{nombre}/TR.md"]
```

---

## Manejo de Errores

| Error | Accion |
|-------|--------|
| implementation-plan.json no existe | Reportar error, sugerir ejecutar plan-implementation |
| Requirements.json no existe | Reportar error, sugerir ejecutar generate-requirements |
| Sin configuracion de producto | Usar valores placeholder ("Pendiente de asignar") en Datos Informativos |
| HTML residual en output | Revisar conversion y limpiar antes de guardar |

## Conexion con Otros Skills

**Input de**:
- `plan-implementation` -> implementation-plan.json
- `analyze-initiative` -> iniciativa.json
- `detect-architecture` -> architecture-constraints.json
- `generate-requirements` -> Requirements.json
- `config/productos.json` -> roles del equipo (copia local)

**Output para**:
- `generate-ifao` -> IFAO se basa en el TR.md como referencia
- `create-azure-workitems` -> sube TR.md al Wiki de Azure DevOps

## Ejemplo Real

Ver [examples/TR.md](./examples/TR.md) para un documento TR.md completo con todas las secciones.
