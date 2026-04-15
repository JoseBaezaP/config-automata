# Scripts - Create Azure Work Items

Este directorio contiene scripts para la creación de work items en Azure DevOps.

## Scripts Disponibles

### 1. transform-hus-to-batch.js
Script auxiliar para transformar HUs.json (generado por @hu-generator) al formato HUs_batch.json requerido por create-work-items-batch.js.

#### Uso

```bash
cd tba-output/{nombre_iniciativa}/
node $HOME/.config/opencode/skills/create-azure-workitems/scripts/transform-hus-to-batch.js
```

#### Funciones

1. **Genera IDs automáticos**: HU-001, HU-002, HU-003, etc.
2. **Extrae tipo de tareas**: Del título (ej: `[BD]` → Tipo: `BD`)
3. **Combina campos**: Descripción + Tecnologías + APIs en el campo Detalle
4. **Preserva DatosGenerales**: Si HUs_batch.json ya existe, preserva su contenido
5. **Genera estadísticas**: Muestra resumen de HUs, tareas y distribución por tipo

#### Notas importantes

- El script debe ejecutarse desde el directorio `tba-output/{nombre_iniciativa}/`
- Si HUs_batch.json ya existe, preserva los DatosGenerales
- Los IDs son secuenciales y padding con ceros (HU-001, HU-002, etc.)
- Si una tarea no tiene corchetes `[TIPO]`, se asigna tipo 'GENERAL'

---

### 2. create-work-items-batch.js
Script principal para crear la jerarquía completa de work items en Azure DevOps.

#### Uso

```bash
node $HOME/.config/opencode/skills/create-azure-workitems/scripts/create-work-items-batch.js <ruta-HUs.json> <organization> <project>
```

**Nota**: El PAT se carga automáticamente desde `config/azure-pat.js`, no es necesario pasarlo como argumento.

#### Ejemplo

```bash
node $HOME/.config/opencode/skills/create-azure-workitems/scripts/create-work-items-batch.js ./HUs.json "hebmexico" "Dev - Product and Technology"
```

---

### 3. upload-to-wiki.js
Script para subir TR.md e IFAO.md al Wiki de Azure DevOps.

#### Uso

```bash
cd tba-output/{nombre_iniciativa}/
node $HOME/.config/opencode/skills/create-azure-workitems/scripts/upload-to-wiki.js "{nombre_iniciativa}" "{product_type}" "{organization}" "{project}" "{wikiId}"
```

#### Ejemplo

```bash
cd tba-output/ajustes-mejoras-regresion/
node $HOME/.config/opencode/skills/create-azure-workitems/scripts/upload-to-wiki.js "ajustes-mejoras-regresion" "DIF" "hebmexico" "Dev - Product and Technology" "Dev---Product-and-Technology.wiki"
```

#### Funciones

1. **Lee TR.md e IFAO.md**: Del directorio actual
2. **Sube ambos archivos**: Al Wiki de Azure DevOps
3. **Verifica integridad**: Compara el tamaño subido con el original
4. **Muestra URLs**: Retorna URLs de las páginas creadas

#### Parámetros

- `nombre_iniciativa`: Nombre de la iniciativa (ej: "ajustes-mejoras-regresion")
- `product_type`: Tipo de producto (ej: "DIF", "CEDI", "WMS")
- `organization`: Organización de Azure DevOps (ej: "hebmexico")
- `project`: Proyecto de Azure DevOps (ej: "Dev - Product and Technology")
- `wikiId`: ID del Wiki (ej: "Dev---Product-and-Technology.wiki")

**Nota**: Los valores de `organization`, `project` y `wikiId` deben obtenerse de `config/productos.json` para el producto específico.

#### Paths del Wiki

- TR:   `/TR´S TBA/{product_type}/{nombre_iniciativa}`
- IFAO: `/TR´S TBA/{product_type}/{nombre_iniciativa}/IFAO`

#### Salida del script

```
📂 Leyendo archivos...
   ✅ TR.md: 42338 bytes
   ✅ IFAO.md: 10823 bytes

📝 Estrategia de subida:
   1. Verificar/crear página raíz: /TR´S TBA
   2. Verificar/crear página tipo: /TR´S TBA/DIF
   3. Subir TR.md: /TR´S TBA/DIF/ajustes-mejoras-regresion
   4. Subir IFAO.md: /TR´S TBA/DIF/ajustes-mejoras-regresion/IFAO

PASO 1/4: Verificar/crear página raíz
   ✅ Página existe o creada exitosamente

PASO 2/4: Verificar/crear página tipo de producto
   ✅ Página existe o creada exitosamente

PASO 3/4: Subiendo TR.md...
   Path: /TR´S TBA/DIF/ajustes-mejoras-regresion
   Tamaño: 42338 bytes
   ✅ TR.md subido exitosamente

PASO 4/4: Subiendo IFAO.md...
   Path: /TR´S TBA/DIF/ajustes-mejoras-regresion/IFAO
   Tamaño: 10823 bytes
   ✅ IFAO.md subido exitosamente

🔍 Verificando integridad del contenido...
   ✅ Validación de tamaño exitosa

============================================================
✅ SUBIDA AL WIKI COMPLETADA EXITOSAMENTE
============================================================
📊 Resumen:
   - TR.md: 42338 bytes
   - IFAO.md: 10823 bytes

🔗 URLs:
   - TR:   https://dev.azure.com/hebmexico/Dev%20-%20Product%20and%20Technology/_wiki/wikis/Dev---Product-and-Technology.wiki?pagePath=%2FTR%C2%B4S%20TBA%2FDIF%2Fajustes-mejoras-regresion
   - IFAO: https://dev.azure.com/hebmexico/Dev%20-%20Product%20and%20Technology/_wiki/wikis/Dev---Product-and-Technology.wiki?pagePath=%2FTR%C2%B4S%20TBA%2FDIF%2Fajustes-mejoras-regresion%2FIFAO
============================================================
```

El archivo debe tener la siguiente estructura:

```json
{
  "DatosGenerales": {
    "epicTitle": "Epic - Implementación Topsort",
    "epicDescription": "Descripción del epic",
    "featureTitle": "Feature - Sponsored Brands",
    "featureDescription": "Descripción del feature",
    "areaPath": "MiProyecto\\MiArea",
    "tags": "TBA;Automatizado;Topsort"
  },
  "HistoriasDeUsuario": [
    {
      "Titulo": "[FRONT] Visualizar campañas...",
      "Descripcion": "<p>Como usuario...</p>",
      "CriteriosDeAceptacion": "<ul><li>Criterio 1</li></ul>",
      "Tareas": [
        {
          "Titulo": "[BD] Preparar estructuras...",
          "Detalle": "<p>Descripción técnica...</p>"
        }
      ]
    }
  ]
}
```

### Campos opcionales en DatosGenerales:

Si no se proporcionan, se usan valores por defecto:

- `epicTitle`: "Epic - Iniciativa TBA"
- `featureTitle`: "Feature - Implementación"
- `areaPath`: Nombre del proyecto
- `tags`: "TBA;Automatizado"

---

## 📊 Ejemplo de salida completo

```
📂 Leyendo archivo: ./HUs.json

✅ Archivo cargado exitosamente: 5 Historias de Usuario encontradas

📋 Iniciando creación de work items en Azure DevOps...

1️⃣  Creando Epic...
   ✅ Epic creado: ID 12345

2️⃣  Creando Feature...
   ✅ Feature creado: ID 12346

3️⃣  Creando 5 User Stories en paralelo...
   ✅ User Story 1/5 creada: ID 12347 - [FRONT] Visualizar campañas...
   ✅ User Story 2/5 creada: ID 12348 - [BACK] Crear endpoint...
   ...

4️⃣  Creando Tasks en paralelo...
   ✅ Task creada: ID 12352 - [BD] Preparar estructuras...
   ✅ Task creada: ID 12353 - [INTEG] Integración con API...
   ...

5️⃣  Vinculando 25 work items...
🔗 Vinculando 25 relaciones en batch...
✅ Vinculadas 25 relaciones exitosamente

===========================================================
✅ CREACIÓN COMPLETADA EXITOSAMENTE
===========================================================
📊 Resumen:
   - Epic:         ID 12345
   - Feature:      ID 12346
   - User Stories: 5 creadas
   - Tasks:        20 creadas
   - Links:        25 relaciones vinculadas
===========================================================

🔗 Ver Epic en Azure DevOps:
   https://dev.azure.com/mi-org/mi-proyecto/_workitems/edit/12345
```

---

## 🚀 Características

- ✅ **Creación rápida**: Crea Epic, Feature, User Stories y Tasks en paralelo
- ✅ **Vinculación automática**: Establece todas las relaciones Parent-Child en batch
- ✅ **Sin dependencias externas**: Usa solo módulos nativos de Node.js (`https`, `fs`)
- ✅ **Multiplataforma**: Funciona en Windows, macOS y Linux
- ✅ **Progress tracking**: Muestra el progreso en tiempo real
- ✅ **Error handling**: Manejo robusto de errores con información detallada

---

## 📋 Requisitos

- Node.js v14 o superior
- Personal Access Token (PAT) de Azure DevOps configurado en `config/azure-pat.js`

---

## 🔧 Configuración Inicial

**⚠️ IMPORTANTE**: Antes de usar los scripts, debes configurar tu PAT de Azure DevOps.

1. **Edita el archivo**: `$HOME/.config/opencode/skills/create-azure-workitems/config/azure-pat.js`
2. **Reemplaza** `"TU_PAT_AQUI"` con tu token real de Azure DevOps
3. **Guarda** el archivo

Ver instrucciones completas en: `$HOME/.config/opencode/skills/create-azure-workitems/config/README.md`

---

## ⚡ Rendimiento

- **Antes**: ~3 minutos para crear 1 Epic + 1 Feature + 5 User Stories + 20 Tasks (secuencial)
- **Después**: ~30-60 segundos para la misma jerarquía (paralelo + batch)

**Mejora**: **3x - 6x más rápido** ⚡

---

## 🛠️ Solución de problemas

### Error: "PAT no configurado correctamente"
- Edita `$HOME/.config/opencode/skills/create-azure-workitems/config/azure-pat.js` y reemplaza `"TU_PAT_AQUI"` con tu token real
- Ver instrucciones en `$HOME/.config/opencode/skills/create-azure-workitems/config/README.md`

### Error: "No se encontró el archivo de configuración de PAT"
- Verifica que existe el archivo: `$HOME/.config/opencode/skills/create-azure-workitems/config/azure-pat.js`
- Crea el archivo si no existe (usa el template en `$HOME/.config/opencode/skills/create-azure-workitems/config/README.md`)

### Error: "HTTP 401 Unauthorized"
- Verifica que el PAT en `$HOME/.config/opencode/skills/create-azure-workitems/config/azure-pat.js` sea válido y no haya expirado
- Asegúrate de que el token tenga permisos de escritura en Work Items
- Renueva tu PAT si ha expirado: https://dev.azure.com/{org}/_usersSettings/tokens

### Error: "HTTP 404 Not Found"
- Verifica que el nombre de la organización y proyecto sean correctos
- El proyecto debe existir en Azure DevOps

### Error: "HTTP 400 Bad Request"
- Revisa que la estructura del JSON sea correcta
- Verifica que el valor de `areaPath` exista en el proyecto

### Error: "oldString not found"
- Este script NO requiere lectura previa con Read tool
- Es un script standalone que se ejecuta directamente

---

## 📚 Referencias

- [Azure DevOps REST API - Work Items](https://learn.microsoft.com/en-us/rest/api/azure/devops/wit/work-items)
- [Azure DevOps REST API - Batch](https://learn.microsoft.com/en-us/rest/api/azure/devops/wit/work-items/update)

## 🚀 Características

- ✅ **Creación rápida**: Crea Epic, Feature, User Stories y Tasks en paralelo
- ✅ **Vinculación automática**: Establece todas las relaciones Parent-Child en batch
- ✅ **Sin dependencias externas**: Usa solo módulos nativos de Node.js (`https`, `fs`)
- ✅ **Multiplataforma**: Funciona en Windows, macOS y Linux
- ✅ **Progress tracking**: Muestra el progreso en tiempo real
- ✅ **Error handling**: Manejo robusto de errores con información detallada

## 📋 Requisitos

- Node.js v14 o superior
- Personal Access Token (PAT) de Azure DevOps configurado en `config/azure-pat.js`

## 🔧 Configuración Inicial

**⚠️ IMPORTANTE**: Antes de usar el script, debes configurar tu PAT de Azure DevOps.

1. **Edita el archivo**: `$HOME/.config/opencode/skills/create-azure-workitems/config/azure-pat.js`
2. **Reemplaza** `"TU_PAT_AQUI"` con tu token real de Azure DevOps
3. **Guarda** el archivo

Ver instrucciones completas en: `$HOME/.config/opencode/skills/create-azure-workitems/config/README.md`

## 🚀 Uso

```bash
node $HOME/.config/opencode/skills/create-azure-workitems/scripts/create-work-items-batch.js <ruta-HUs.json> <organization> <project>
```

**Nota**: El PAT se carga automáticamente desde `config/azure-pat.js`, no es necesario pasarlo como argumento.

### Ejemplo:

```bash
node $HOME/.config/opencode/skills/create-azure-workitems/scripts/create-work-items-batch.js ./HUs.json "hebmexico" "Dev - Product and Technology"
```

## 📄 Formato del archivo HUs.json

El archivo debe tener la siguiente estructura:

```json
{
  "DatosGenerales": {
    "epicTitle": "Epic - Implementación Topsort",
    "epicDescription": "Descripción del epic",
    "featureTitle": "Feature - Sponsored Brands",
    "featureDescription": "Descripción del feature",
    "areaPath": "MiProyecto\\MiArea",
    "tags": "TBA;Automatizado;Topsort"
  },
  "HistoriasDeUsuario": [
    {
      "Titulo": "[FRONT] Visualizar campañas...",
      "Descripcion": "<p>Como usuario...</p>",
      "CriteriosDeAceptacion": "<ul><li>Criterio 1</li></ul>",
      "Tareas": [
        {
          "Titulo": "[BD] Preparar estructuras...",
          "Detalle": "<p>Descripción técnica...</p>"
        }
      ]
    }
  ]
}
```

### Campos opcionales en DatosGenerales:

Si no se proporcionan, se usan valores por defecto:

- `epicTitle`: "Epic - Iniciativa TBA"
- `featureTitle`: "Feature - Implementación"
- `areaPath`: Nombre del proyecto
- `tags`: "TBA;Automatizado"

## 📊 Ejemplo de salida

```
📂 Leyendo archivo: ./HUs.json

✅ Archivo cargado exitosamente: 5 Historias de Usuario encontradas

📋 Iniciando creación de work items en Azure DevOps...

1️⃣  Creando Epic...
   ✅ Epic creado: ID 12345

2️⃣  Creando Feature...
   ✅ Feature creado: ID 12346

3️⃣  Creando 5 User Stories en paralelo...
   ✅ User Story 1/5 creada: ID 12347 - [FRONT] Visualizar campañas...
   ✅ User Story 2/5 creada: ID 12348 - [BACK] Crear endpoint...
   ...

4️⃣  Creando Tasks en paralelo...
   ✅ Task creada: ID 12352 - [BD] Preparar estructuras...
   ✅ Task creada: ID 12353 - [INTEG] Integración con API...
   ...

5️⃣  Vinculando 25 work items...
🔗 Vinculando 25 relaciones en batch...
✅ Vinculadas 25 relaciones exitosamente

============================================================
✅ CREACIÓN COMPLETADA EXITOSAMENTE
============================================================
📊 Resumen:
   - Epic:         ID 12345
   - Feature:      ID 12346
   - User Stories: 5 creadas
   - Tasks:        20 creadas
   - Links:        25 relaciones vinculadas
============================================================

🔗 Ver Epic en Azure DevOps:
   https://dev.azure.com/mi-org/mi-proyecto/_workitems/edit/12345
```

## ⚡ Rendimiento

- **Antes**: ~3 minutos para crear 1 Epic + 1 Feature + 5 User Stories + 20 Tasks (secuencial)
- **Después**: ~30-60 segundos para la misma jerarquía (paralelo + batch)

**Mejora**: **3x - 6x más rápido** ⚡

## 🛠️ Solución de problemas

### Error: "PAT no configurado correctamente"
- Edita `$HOME/.config/opencode/skills/create-azure-workitems/config/azure-pat.js` y reemplaza `"TU_PAT_AQUI"` con tu token real
- Ver instrucciones en `$HOME/.config/opencode/skills/create-azure-workitems/config/README.md`

### Error: "No se encontró el archivo de configuración de PAT"
- Verifica que existe el archivo: `$HOME/.config/opencode/skills/create-azure-workitems/config/azure-pat.js`
- Crea el archivo si no existe (usa el template en `$HOME/.config/opencode/skills/create-azure-workitems/config/README.md`)

### Error: "HTTP 401 Unauthorized"
- Verifica que el PAT en `$HOME/.config/opencode/skills/create-azure-workitems/config/azure-pat.js` sea válido y no haya expirado
- Asegúrate de que el token tenga permisos de escritura en Work Items
- Renueva tu PAT si ha expirado: https://dev.azure.com/{org}/_usersSettings/tokens

### Error: "HTTP 404 Not Found"
- Verifica que el nombre de la organización y proyecto sean correctos
- El proyecto debe existir en Azure DevOps

### Error: "HTTP 400 Bad Request"
- Revisa que la estructura del JSON sea correcta
- Verifica que el valor de `areaPath` exista en el proyecto

### Error: "oldString not found"
- Este script NO requiere lectura previa con Read tool
- Es un script standalone que se ejecuta directamente

## 📚 Referencias

- [Azure DevOps REST API - Work Items](https://learn.microsoft.com/en-us/rest/api/azure/devops/wit/work-items)
- [Azure DevOps REST API - Batch](https://learn.microsoft.com/en-us/rest/api/azure/devops/wit/work-items/update)
