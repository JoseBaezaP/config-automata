---
name: Generate IFAO
description: Genera un documento IFAO (Informe de Factibilidad y Alineacion Operativa) en Markdown, basado en la iniciativa, plan de implementacion y requerimientos. Documento ejecutivo revisado por Product Owners, arquitectos y equipos tecnicos antes de iniciar desarrollo. Desencadenar despues de generate-wiki, o cuando se necesite el informe de factibilidad, documento ejecutivo, o analisis de factibilidad tecnica.
---

# Skill: Generate IFAO

## Proposito

Genera el IFAO (Informe de Factibilidad y Alineacion Operativa): un documento Markdown ejecutivo que evalua si una iniciativa es tecnica y operativamente viable. Es revisado por Product Owners, Scrum Masters, arquitectos y equipos de soporte antes de aprobar el inicio de desarrollo.

La razon de este documento es que el TR.md es demasiado detallado para ejecutivos. El IFAO sintetiza lo esencial: que se va a hacer, es factible, cuales son los riesgos, y que se necesita antes de empezar.

## Cuando Usar

- Despues de generar el TR.md (generate-wiki)
- Antes de subir documentacion al Wiki de Azure DevOps (create-azure-workitems)

## Entrada / Salida

**Entrada**:
- `nombre_iniciativa`: Nombre de la iniciativa
- **Requerido**: `tba-output/{nombre}/iniciativa.json` (requerimientos, Gherkin)
- **Requerido**: `tba-output/{nombre}/implementation-plan.json` (userStories, archivos, APIs)
- **Requerido**: `tba-output/{nombre}/Requirements.json` (NFRs, integraciones, diagramas, riesgos)
- **Requerido**: `tba-output/{nombre}/architecture-constraints.json` (tech stack, projectContext)
- **Opcional**: Configuracion de producto (roles)

**Salida**: `tba-output/{nombre}/IFAO.md`

---

## Estructura del Documento

El IFAO tiene exactamente 8 secciones separadas por `---`. Cada seccion tiene un proposito especifico para su audiencia.

```markdown
# Informe de Factibilidad y Alineacion Operativa (IFAO)
## 1. Resumen Ejecutivo              <- Para: Todos (vision general)
## 2. Alcance del PRD                <- Para: Product Owner (que se incluye)
## 3. Evaluacion de Factibilidad Tecnica  <- Para: Arquitectura (es viable?)
##    3.1 Integraciones
##    3.2 Base de Datos
##    3.3 Seguridad
## 4. Evaluacion Operativa           <- Para: Soporte (impacto operativo)
## 5. Riesgos y Stoppers             <- Para: Todos (que puede salir mal)
## 6. Requerimientos Previos (Checklist) <- Para: TBA/Equipo (que falta antes de empezar)
## 7. Validaciones                   <- Para: QA/TBA (que verificar)
## 8. Anexos                         <- Para: Referencia tecnica
```

---

## Proceso

### 1. Leer Entrada

```
[Read: file_path="tba-output/{nombre}/HUs.json"]
[Read: file_path="tba-output/{nombre}/Requirements.json"]
```

Opcionalmente leer productos.json si se proporciono `projectKey`:
```
[Read: file_path="<skill_dir>/create-azure-workitems/config/productos.json"]
```

### 2. Generar Cada Seccion

#### Seccion 1: Resumen Ejecutivo

Parrafo de 3-5 oraciones que responda:
- Que busca la iniciativa (objetivo principal)
- Stack tecnologico principal (extraer de `HUs.json` -> `Tecnologias`)
- Integraciones clave (extraer de `Requirements.json` -> `integraciones_tecnicas`)

**Fuente de datos**: HUs.json (Tecnologias, APIsDeConexion) + Requirements.json (integraciones_tecnicas)

#### Seccion 2: Alcance del PRD

Tabla con dos columnas: `Objetivo` y `Alcance Principal`.

Derivar una fila por cada HU en HUs.json. El titulo de la HU se convierte en Objetivo, y la descripcion resumida en Alcance Principal.

| Objetivo | Alcance Principal |
|----------|------------------|
| {HU-01 titulo resumido} | {Descripcion sintetizada en 1 linea} |
| {HU-02 titulo resumido} | {Descripcion sintetizada en 1 linea} |

#### Seccion 3: Evaluacion de Factibilidad Tecnica

##### 3.1 Integraciones

Tabla con los endpoints e integraciones encontrados. Extraer de:
- `HUs.json` -> `APIsDeConexion` de cada HU
- `Requirements.json` -> `integraciones_tecnicas.sistemas_involucrados`

**Regla critica**: NO inventar endpoints ni URLs. Solo incluir los que aparecen explicitamente en los datos de entrada. Si un sistema se menciona pero no tiene URL, poner "No especificado".

| Sistema/Proceso | Endpoint/URL Identificado |
|-----------------|--------------------------|
| {sistema} | {endpoint real o "No especificado"} |

##### 3.2 Base de Datos

Solo crear esta seccion SI las HUs contienen tareas `[BD]` con cambios de esquema. Si no hay cambios de BD, escribir: "No se identifican modificaciones de esquema de base de datos en esta iniciativa."

Si hay cambios, documentar:
- Servidor y puerto (si se conocen, sino "No especificado")
- Tablas creadas/modificadas con estructura
- Relaciones afectadas

##### 3.3 Seguridad

Extraer de `Requirements.json` -> `requerimientos_no_funcionales.Seguridad`. Listar:
- Autenticacion (JWT, OAuth, etc.)
- Autorizacion (roles, permisos)
- Proteccion de datos en transito y reposo
- Consideraciones adicionales

#### Seccion 4: Evaluacion Operativa

Parrafos que describan el impacto operativo basado en la `matriz_de_riesgos` de Requirements.json. Enfocarse en:
- Que puede afectar la operacion diaria
- Que areas de soporte se ven impactadas
- Que monitoreo se necesita

#### Seccion 5: Riesgos y Stoppers

Tabla derivada directamente de `Requirements.json` -> `matriz_de_riesgos`:

| ID | Descripcion | Probabilidad | Impacto | Nivel de Riesgo | Clasificacion | Tipo de Riesgo | Recomendacion |
|----|-------------|--------------|---------|-----------------|---------------|----------------|---------------|
| Riesgo-001 | {descripcion} | {1-3} | {1-3} | {P*I} | {Riesgo/Aceptable} | {tipo} | {recomendacion} |

Despues de la tabla, resaltar los riesgos criticos usando blockquotes:

```markdown
> **STOPPER:** {descripcion del riesgo con nivel >= 6 que puede detener el desarrollo}

> **Riesgo Critico:** {descripcion del riesgo con nivel >= 4 que requiere atencion}
```

Solo incluir stoppers si hay riesgos con nivel >= 6. Solo incluir riesgos criticos si hay riesgos con nivel >= 4.

#### Seccion 6: Requerimientos Previos (Checklist)

Lista de prerequisitos que deben completarse ANTES de iniciar desarrollo. Derivar de:
- Integraciones que requieren credenciales/acceso
- Cambios de BD que requieren validacion
- Endpoints que necesitan documentacion
- Configuraciones de ambiente

Formato: checklist con `- [ ]`

#### Seccion 7: Validaciones

Lista de validaciones que deben realizarse durante/despues del desarrollo. Si se proporciono configuracion de producto con roles, personalizar:

```markdown
- [ ] Validacion con Product Owner ({nombre real}): Confirmar priorizacion de features
- [ ] Validacion con Scrum Master ({nombre real}): Confirmar capacidad del sprint
```

Si no hay configuracion de producto, usar referencias genericas ("Product Owner", "Scrum Master").

#### Seccion 8: Anexos

Incluir 3 subsecciones:

**Requerimientos No Funcionales**: Tabla resumen de las 6 dimensiones de `Requirements.json` -> `requerimientos_no_funcionales`:

| Categoria | Descripcion |
|-----------|-------------|
| Rendimiento | {resumen} |
| Seguridad | {resumen} |
| Fiabilidad | {resumen} |
| Usabilidad | {resumen} |
| Mantenimiento | {resumen} |
| Escalabilidad | {resumen} |

**Integraciones Tecnicas**: Tabla detallada de sistemas con descripcion e interfaces.

**Diagramas**: Insertar los 3 diagramas de `Requirements.json` -> `diagramas_mermaid`. Usar sintaxis `::: mermaid` para renderizado en Azure DevOps Wiki:

```markdown
#### Proceso Principal
::: mermaid
{contenido de diagramas_mermaid.proceso_principal}
:::

#### Secuencia de Interaccion
::: mermaid
{contenido de diagramas_mermaid.secuencia_interaccion}
:::

#### Flujo de Datos
::: mermaid
{contenido de diagramas_mermaid.flujo_de_datos}
:::
```

**Matriz de Riesgos**: Repetir la tabla de riesgos completa como referencia rapida en los anexos (esto es intencional - ejecutivos ven la seccion 5, tecnicos consultan el anexo).

### 3. Validar y Guardar

**Validaciones antes de guardar**:
- Las 8 secciones presentes y separadas por `---`
- Tablas usadas para datos tecnicos (no listas)
- Checklists usan sintaxis `- [ ]`
- Blockquotes (`>`) resaltan riesgos criticos/stoppers
- No se inventaron endpoints ni detalles de BD
- Diagramas Mermaid usan sintaxis `::: mermaid`
- Matriz de riesgos coincide con Requirements.json
- Documento claro, conciso y accionable para ejecutivos

Guardar con `Write`:
```
[Write: file_path="tba-output/{nombre}/IFAO.md"]
```

---

## Manejo de Errores

| Error | Accion |
|-------|--------|
| HUs.json no existe | Reportar error, sugerir ejecutar generate-hus primero |
| Requirements.json no existe | Reportar error, sugerir ejecutar generate-requirements primero |
| 0 riesgos en matriz | Generar al menos 3 riesgos basicos (tecnico, funcional, seguridad) |
| Sin tareas [BD] | Seccion 3.2 dice "No aplica" con explicacion |
| Sin configuracion de producto | Usar roles genericos en validaciones |

## Conexion con Otros Skills

**Input de**:
- `generate-hus` -> HUs.json
- `generate-requirements` -> Requirements.json
- `create-azure-workitems/config/productos.json` -> roles (opcional)

**Output para**:
- `create-azure-workitems` -> sube IFAO.md al Wiki de Azure DevOps

## Ejemplo Real

Ver [examples/IFAO.md](./examples/IFAO.md) para un documento IFAO completo con todas las secciones, tablas, riesgos y diagramas Mermaid.
