---
name: Create Azure DevOps Work Items
description: Crea la jerarquia completa de work items en Azure DevOps (Epic -> Feature -> User Story -> Tasks) y sube documentacion tecnica (TR.md e IFAO.md) al Wiki. Este es el paso final del flujo TBA que integra todo el contenido generado en Azure DevOps. Desencadenar cuando el usuario solicita crear work items en Azure DevOps, subir documentacion al wiki, publicar HUs en Azure, o integrar con Azure DevOps despues de haber generado toda la documentacion (HUs, Requirements, TR.md, IFAO.md). Tambien aplica cuando se menciona "subir a Azure", "crear epics", "publicar en wiki", o "integrar con DevOps".
---

# Skill: Create Azure DevOps Work Items

## Proposito

Este skill toma las Historias de Usuario (HUs.json), documentacion tecnica (TR.md, IFAO.md) y crea la estructura completa en Azure DevOps:

```
Epic
  └── Feature
        ├── User Story 1
        │     ├── Task [BD]
        │     ├── Task [BACK]
        │     ├── Task [FRONT]
        │     └── Task [QA]
        ├── User Story 2
        │     └── ...
        └── Wiki
              ├── TR.md (Requerimientos Tecnicos)
              └── IFAO.md (Factibilidad y Alineacion)
```

La razon por la que se usan scripts Node.js en lugar de llamadas directas a la API es que el batch processing maneja paralelismo, vinculacion secuencial y reintentos automaticos, lo cual reduciria el tiempo de ~3 minutos a ~30-60 segundos.

## Cuando Usar

- Despues de que **toda** la documentacion haya sido generada: HUs.json, TR.md, IFAO.md
- Como paso final del flujo TBA (despues de generate-hus, generate-wiki, generate-ifao)

## Prerrequisitos

1. **PAT de Azure DevOps** configurado en [config/azure-pat.js](./config/azure-pat.js)
   - Si no existe, ver la guia en [config/README.md](./config/README.md)
2. **Node.js** instalado (para ejecutar los scripts)
3. **Configuracion del producto** en [config/productos.json](./config/productos.json)

## Entrada

| Parametro | Origen | Ejemplo |
|-----------|--------|---------|
| `projectKey` | Usuario o orquestador | `"Fulfillment"`, `"EcommAdmin"` |
| `nombre_iniciativa` | Iniciativa analizada | `"ajustes-mejoras-regresion"` |
| `TBA_Iniciativa` | Titulo del Epic/Feature | `"Ajustes y Mejoras de Regresion"` |
| `HUs.json` | generate-hus skill | `tba-output/{nombre}/HUs.json` |
| `TR.md` | generate-wiki skill | `tba-output/{nombre}/TR.md` |
| `IFAO.md` | generate-ifao skill | `tba-output/{nombre}/IFAO.md` |

## Salida

```json
{
  "success": true,
  "epic_id": 12345,
  "feature_id": 12346,
  "user_stories": [
    {
      "id": 12347,
      "title": "HU-01: Ajustes en Detalle de Tienda",
      "tasks": [
        { "id": 12348, "title": "[FRONT] Agregar checkbox 'Activa'" },
        { "id": 12349, "title": "[QA] - Escenarios de prueba" }
      ]
    }
  ],
  "wiki_pages": {
    "tr_url": "https://dev.azure.com/.../TR%20page",
    "ifao_url": "https://dev.azure.com/.../IFAO%20page"
  }
}
```

---

## Proceso Paso a Paso

### Paso 1: Cargar y Validar Configuracion

Leer la configuracion del producto desde [config/productos.json](./config/productos.json) usando `Read`:

```
[Read: file_path="<skill_dir>/config/productos.json"]
```

Extraer los campos necesarios. Es critico usar los nombres de campo correctos (snake_case con guion bajo):

| Campo en productos.json | Variable | Ejemplo | Para que se usa |
|------------------------|----------|---------|-----------------|
| `area_path` | areaPath | `"Dev - Product and Technology\Fulfillment IMS"` | Work Items |
| `tba_proyecto` | project | `"Dev - Product and Technology"` | API + Wiki |
| `product_type` | productType | `"DIF"` | Wiki paths |
| `organizacion` | organization | `"hebmexico"` | API base URL |
| `wiki_id` | wikiId | `"Dev---Product-and-Technology.wiki"` | Wiki upload |

**Errores comunes que evitar** (estos causan fallos silenciosos):
- Usar `productConfig.areaPath` (camelCase) en vez de `productConfig.area_path` (snake_case)
- Usar `projectKey` directamente como areaPath (ej: `"Fulfillment"` no es un area valida)
- Un areaPath valido **siempre** contiene backslash: `"Dev - Product and Technology\Fulfillment IMS"`

Para mas detalles ver [examples/config-validation.js](./examples/config-validation.js).

### Paso 2: Transformar HUs.json a HUs_batch.json

El script de creacion de work items necesita un formato extendido (`HUs_batch.json`) que incluye `DatosGenerales` (Epic title, Feature title, areaPath). El script `transform-hus-to-batch.js` convierte automaticamente el formato.

**2.1** Verificar que existe `HUs.json`:
```
[Glob: pattern="HUs.json" path="tba-output/{nombre_iniciativa}"]
```

**2.2** Crear un `HUs_batch.json` inicial con los DatosGenerales:

Usar `Write` para crear `tba-output/{nombre_iniciativa}/HUs_batch.json` con la estructura base:

```json
{
  "DatosGenerales": {
    "epicTitle": "{TBA_Iniciativa}",
    "epicDescription": "<p>Epic generado por TBA - {TBA_Iniciativa}</p>",
    "featureTitle": "{TBA_Iniciativa}",
    "featureDescription": "<p>Feature principal - {TBA_Iniciativa}</p>",
    "areaPath": "{area_path desde productos.json}",
    "productType": "{product_type}",
    "initiativeName": "{nombre_iniciativa}"
  },
  "HistoriasDeUsuario": []
}
```

**2.3** Ejecutar la transformacion (pasando la ruta del directorio como argumento):

```bash
node <skill_dir>/scripts/transform-hus-to-batch.js "tba-output/{nombre_iniciativa}"
```

Este script:
- Recibe el directorio donde estan los archivos como primer argumento (ruta relativa o absoluta)
- Lee `HUs.json` y preserva `DatosGenerales` del `HUs_batch.json` existente
- Genera IDs secuenciales (HU-001, HU-002...)
- Extrae tipo de tarea del titulo (`[BACK]` -> `"BACK"`)
- Muestra estadisticas (total HUs, tareas por tipo)

Para ver el formato completo del output: [examples/HUs-batch.json](./examples/HUs-batch.json)

**Alternativa (flujo Automata)**: Si la fuente es `implementation-plan.json` (generado por plan-implementation), usar:

```bash
node <skill_dir>/scripts/transform-plan-to-batch.js "tba-output/{nombre_iniciativa}/implementation-plan.json"
```

### Paso 2.5: Enrichment (automatico)

Ambos scripts de transformacion (`transform-hus-to-batch.js` y `transform-plan-to-batch.js`) detectan y cargan automaticamente archivos opcionales del mismo directorio `tba-output/{nombre}/` para enriquecer las descripciones de los work items:

| Archivo | Datos que aporta | Requerido |
|---------|-----------------|-----------|
| `implementation-plan.json` | Archivos por capa, notas de arquitectura, dependencias, test plan | No |
| `iniciativa.json` | Escenarios Gherkin completos, reglas de negocio, notas tecnicas | No |

**Que se enriquece:**

- **User Story Description**: Se extiende con Reglas de Negocio, Notas Tecnicas, Tecnologias, APIs Involucradas
- **User Story AcceptanceCriteria**: Se agrega tabla de Escenarios Gherkin (ID, titulo, tipo)
- **Task [BACK/FRONT/INTEG/BD]**: Se agrega tabla de archivos (path, capa, proposito, complejidad), notas de arquitectura, dependencias
- **Task [QA]**: Se agrega tabla de archivos de test (test, fuente, tipo, escenarios) y Gherkin completo renderizado

Si los archivos de enrichment no existen, los scripts producen el mismo output que antes (degradacion graceful).

### Paso 3: Crear Work Items en Azure DevOps

Ejecutar el script principal de creacion en batch:

```bash
node <skill_dir>/scripts/create-work-items-batch.js \
  "tba-output/{nombre_iniciativa}/HUs_batch.json" \
  "{organizacion}" \
  "{tba_proyecto}"
```

**Que hace el script internamente:**
1. Crea el Epic
2. Crea el Feature vinculado al Epic
3. Crea todas las User Stories en paralelo (Promise.all)
4. Crea todas las Tasks en paralelo
5. Vincula todo secuencialmente (con pausas de 200ms entre links para evitar throttling)
6. Valida integridad de los vinculos

**Output del script**: Imprime un resumen con todos los IDs creados. Capturar el Epic ID y Feature ID del output.

Si hay errores parciales (ej: algunas tasks fallaron), el script continua y reporta los errores al final. Ver [examples/troubleshooting.md](./examples/troubleshooting.md) para errores comunes.

### Paso 4: Subir Documentacion al Wiki

Ejecutar el script de upload que sube tanto TR.md como IFAO.md en una sola ejecucion. El script busca automaticamente los archivos en `tba-output/{nombre_iniciativa}/` desde el directorio de trabajo actual (no necesita `cd`):

```bash
node <skill_dir>/scripts/upload-to-wiki.js \
  "{nombre_iniciativa}" \
  "{productType}" \
  "{organizacion}" \
  "{tba_proyecto}" \
  "{wikiId}"
```

**Que hace el script:**
1. Busca TR.md e IFAO.md automaticamente (prueba `cwd/tba-output/{nombre}/`, `cwd/` si ya esta en el directorio, y directorio padre)
2. Verifica/crea paginas ancestro: `/TR'S TBA/` y `/TR'S TBA/{productType}/`
3. Sube `TR.md` a `/TR'S TBA/{productType}/{nombre_iniciativa}`
4. Sube `IFAO.md` como pagina hija: `/TR'S TBA/{productType}/{nombre_iniciativa}/IFAO`
5. Valida que el contenido se subio completo (compara tamanos)
6. Muestra URLs de las paginas creadas

**Lectura de archivos grandes**: Los scripts leen el contenido completo de TR.md e IFAO.md. Si necesitas leer estos archivos antes con `Read`, usa `limit: 999999` para no truncar.

### Paso 5: Confirmar y Retornar Resumen

Mostrar al usuario un resumen estructurado con:
- Epic ID y URL
- Feature ID y URL
- Lista de User Stories con sus Tasks (IDs)
- URLs del Wiki (TR y IFAO)

---

## Modo Interactivo

Pedir confirmacion al usuario en estos puntos clave (la razon es que crear work items en Azure DevOps no es reversible facilmente):

1. **Antes de crear Epic/Feature**: Mostrar titulo, descripcion, areaPath. Confirmar.
2. **Despues de crear Epic/Feature**: Mostrar IDs creados. Confirmar antes de crear User Stories.
3. **Despues de User Stories**: Mostrar cuantas se crearon. Confirmar antes de subir al Wiki.
4. **Despues del Wiki**: Mostrar resumen final con todas las URLs.

## Manejo de Errores

| Error | Causa probable | Solucion |
|-------|---------------|----------|
| PAT no configurado | `azure-pat.js` no existe o tiene valor default | Ver [config/README.md](./config/README.md) para generar un PAT |
| areaPath undefined | Usando `areaPath` en vez de `area_path` | Usar snake_case: `productConfig.area_path` |
| areaPath = nombre proyecto | Usando `tba_proyecto` en vez de `area_path` | `area_path` incluye backslash, `tba_proyecto` no |
| WikiAncestorPageNotFoundException | Paginas ancestro no existen | El script `upload-to-wiki.js` las crea automaticamente |
| Wiki truncado | Archivo leido parcialmente | Usar `Read` con `limit: 999999` |
| Tasks sin vincular | sourceId/targetId null | El script valida antes de vincular. Ver logs para detalles |
| API throttling (429) | Demasiadas requests paralelas | El script usa pausas de 200ms entre links |

Para diagnostico detallado: [examples/troubleshooting.md](./examples/troubleshooting.md)

## Referencia de Scripts

| Script | Proposito | Ubicacion |
|--------|----------|-----------|
| `create-work-items-batch.js` | Crea Epic, Feature, US, Tasks en batch | [scripts/](./scripts/create-work-items-batch.js) |
| `transform-hus-to-batch.js` | Convierte HUs.json -> HUs_batch.json (con enrichment) | [scripts/](./scripts/transform-hus-to-batch.js) |
| `transform-plan-to-batch.js` | Convierte implementation-plan.json -> HUs_batch.json (con enrichment) | [scripts/](./scripts/transform-plan-to-batch.js) |
| `upload-to-wiki.js` | Sube TR.md e IFAO.md al Wiki | [scripts/](./scripts/upload-to-wiki.js) |

Documentacion completa de scripts: [scripts/README.md](./scripts/README.md)

## Conexion con Otros Skills

**Input de**:
- `generate-hus` -> `HUs.json`
- `generate-wiki` -> `TR.md`
- `generate-ifao` -> `IFAO.md`

**Este skill es el paso final** del flujo TBA. No tiene outputs que alimenten otros skills.

## Nota sobre `<skill_dir>`

En los comandos de este skill, `<skill_dir>` se refiere al directorio donde esta instalado este skill. Los scripts usan rutas relativas (`__dirname`) para encontrar `config/azure-pat.js` y `config/productos.json`, por lo que funcionan sin importar desde donde se ejecuten.

Para Claude Code, la ruta tipica es la ubicacion del directorio de este skill. Usa `Glob` para localizarlo si es necesario:
```
[Glob: pattern="**/create-azure-workitems/scripts/create-work-items-batch.js"]
```
