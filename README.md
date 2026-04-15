# TBA Agent CLI

CLI interactivo para instalar y mantener actualizado el ecosistema de agentes y skills de **TBA (Team-Based Automation)** en tu AI assistant favorito.

---

## Tabla de contenidos

- [Requisitos](#requisitos)
- [Instalación](#instalación)
- [Comandos](#comandos)
- [Flujo de instalación](#flujo-de-instalación)
- [Asistentes soportados](#asistentes-soportados)
- [Agentes incluidos](#agentes-incluidos)
- [Skills incluidas](#skills-incluidas)
- [Configuración de Azure DevOps](#configuración-de-azure-devops)
- [Actualizar](#actualizar)
- [Estructura de archivos instalados](#estructura-de-archivos-instalados)
- [Consideraciones por sistema operativo](#consideraciones-por-sistema-operativo)

---

## Requisitos

- **Node.js** >= 18
- Acceso a internet (para verificar versiones en GitHub Releases)
- Cuenta en **Azure DevOps** con un proyecto activo (para las skills de integración)

---

## Instalación

No requiere instalación previa. Ejecuta directamente con `npx`:

```bash
npx tba-agent
```

O si prefieres instalar globalmente:

```bash
npm install -g tba-agent
tba-agent
```

---

## Comandos

| Comando | Descripción |
|---|---|
| `npx tba-agent` | Instalar TBA Agent interactivamente |
| `npx tba-agent install` | Instalar TBA Agent interactivamente |
| `npx tba-agent update` | Actualizar una instalación existente |
| `npx tba-agent version` | Mostrar versión instalada y disponible |

---

## Flujo de instalación

Al ejecutar `npx tba-agent install`, el CLI guía al usuario paso a paso:

### 1. Selección de AI assistant

```
◆ Selecciona tu AI assistant:
  ● Claude Code   — Anthropic Claude Code CLI
  ○ OpenCode      — OpenCode CLI
  ○ GitHub Copilot — GitHub Copilot en VS Code
```

### 2. Selección de scope

```
◆ Selecciona el scope de instalacion:
  ● Global   — ~/.claude/  — disponible en todos los proyectos
  ○ Project  — ./.claude/  — solo en este proyecto
```

- **Global**: instala en el directorio home (`~/.claude/`, `~/.opencode/`, etc.). Los agentes y skills están disponibles en cualquier proyecto.
- **Project**: instala en el directorio actual. Útil para equipos con configuraciones por proyecto.

### 3. Configuración del Azure DevOps PAT

```
┌ Permisos requeridos
│ El PAT requiere los siguientes permisos en Azure DevOps:
│   • Wiki       — Read & Write
│   • Work Items — Create, Read & Edit
└

◆ Azure DevOps PAT (dejar vacío para configurar después): ****
```

Puedes generar tu PAT en:
```
https://dev.azure.com/{tu-organizacion}/_usersSettings/tokens
```

Si lo dejas vacío, puedes configurarlo después editando el archivo:
```
{skillsDir}/create-azure-workitems/config/azure-pat.js
```

> **Nota de seguridad**: cuando el scope es `project`, el archivo `azure-pat.js` se agrega automáticamente al `.gitignore` del proyecto para evitar que se suba accidentalmente.

### 4. Configuración del producto/equipo

```
◆ ¿Deseas configurar tu producto/equipo en Azure DevOps ahora? › Sí

  Nombre del producto/equipo:    Fulfillment
  Tu nombre (TBA):               Jose Baeza
  Organización Azure DevOps:     hebmexico
  Proyecto Azure DevOps:         Dev - Product and Technology
  Area Path:                     Dev - Product and Technology\Fulfillment IMS
  Wiki ID:                       Dev---Product-and-Technology.wiki
```

#### Campos opcionales

```
◆ ¿Configurar campos opcionales? (Product Owner, Scrum Master, Líderes Técnicos, tipo) › No

┌ Campos opcionales pendientes
│ Edita los campos opcionales en:
│   {skillsDir}/create-azure-workitems/config/productos.json
└
```

Si aceptas configurarlos:

```
  Tipo de producto:                DIF
  Product Owners (separados por coma):    Oscar Almaguer, Chuck Cov
  Scrum Masters (separados por coma):     Rocio Garza
  Líderes Técnicos (separados por coma):  David Morales, Jose Roque Solis
```

> Los archivos `productos.json` de `create-azure-workitems` y `generate-wiki` están enlazados mediante un **symlink**, por lo que editar uno actualiza el otro automáticamente.

---

## Asistentes soportados

| Assistant | Directorio global | Directorio proyecto |
|---|---|---|
| Claude Code | `~/.claude/` | `.claude/` |
| OpenCode | `~/.opencode/` | `.opencode/` |
| GitHub Copilot | `~/.copilot/` | `.github/` |

> GitHub Copilot instala además `copilot-instructions.md` en `.github/` y `settings.json` en `.vscode/`.

---

## Agentes incluidos

Los agentes se instalan en `{dir}/agents/` y son subagentes especializados que el orquestador coordina automáticamente.

| Agente | Descripción |
|---|---|
| `tba-orchestrator` | Orquestador principal. Coordina todos los demás agentes en el flujo TBA |
| `context-analyzer` | Analiza iniciativas de negocio y detecta la arquitectura del proyecto |
| `architect-planner` | Diseña el plan de implementación file-by-file respetando la arquitectura |
| `code-implementor` | Ejecuta el plan de implementación escribiendo código de producción y tests |
| `doc-generator` | Genera documentación técnica (TR.md, IFAO.md) |
| `azure-integrator` | Crea work items en Azure DevOps y sube documentación al Wiki |
| `git-manager` | Gestiona ramas y commits con formato Conventional Commits |
| `simple-implementor` | Implementador simplificado para tareas de menor complejidad |

---

## Skills incluidas

Las skills se instalan en `{dir}/skills/` y son prompts especializados invocables desde el AI assistant.

| Skill | Descripción |
|---|---|
| `analyze-initiative` | Analiza un PRD o iniciativa y genera estructura JSON con Gherkin |
| `detect-architecture` | Detecta la arquitectura del proyecto y genera `architecture-constraints.json` |
| `plan-implementation` | Genera un plan de implementación ordenado file-by-file |
| `implement-code` | Ejecuta un `implementation-plan.json` escribiendo código y tests |
| `generate-requirements` | Genera requerimientos no funcionales, diagramas Mermaid y matriz de riesgos |
| `generate-wiki` | Genera documentación técnica completa `TR.md` para el Wiki de Azure DevOps |
| `generate-ifao` | Genera el documento IFAO (Informe de Factibilidad y Alineación Operativa) |
| `create-azure-workitems` | Crea la jerarquía de work items en Azure DevOps (Epic → Feature → HU → Tasks) |
| `link-commits-to-workitems` | Vincula commits de git a work items de Azure DevOps |
| `hexagonal-architect` | Guía de arquitectura Hexagonal + DDD + Clean Architecture |
| `clean-architecture` | Principios y mejores prácticas de Clean Architecture |
| `product-owner` | Agente Product Owner que analiza el codebase antes de conversar |

---

## Configuración de Azure DevOps

### PAT (Personal Access Token)

Archivo: `{skillsDir}/create-azure-workitems/config/azure-pat.js`

```js
module.exports = {
  AZURE_DEVOPS_PAT: "tu-token-aqui",
  DEFAULT_ORGANIZATION: "tu-organizacion",
  DEFAULT_PROJECT: "Tu Proyecto"
};
```

### Productos / Equipos

Archivo: `{skillsDir}/create-azure-workitems/config/productos.json`

```json
{
  "NombreEquipo": {
    "Product_Owner": ["Nombre 1", "Nombre 2"],
    "Scrum_Master": ["Nombre"],
    "Lideres_Tecnicos": ["Nombre 1", "Nombre 2"],
    "TBA": "Tu Nombre",
    "organizacion": "tu-org",
    "product_type": "DIF",
    "area_path": "Proyecto\Area",
    "tba_proyecto": "Nombre del Proyecto",
    "wiki_id": "Nombre-del-Proyecto.wiki"
  }
}
```

> El `area_path` debe usar **un solo backslash** (`\`). El CLI lo normaliza automáticamente al guardar.

Este archivo está enlazado con `generate-wiki/config/productos.json` mediante un symlink — editar uno actualiza el otro.

---

## Actualizar

Para actualizar los agentes y skills a la última versión manteniendo tu configuración:

```bash
npx tba-agent update
```

El comando lee el manifest de instalación existente (assistant y scope) y sobreescribe solo los archivos de agentes y skills, sin tocar tu configuración de PAT ni productos.

Para verificar si hay una actualización disponible:

```bash
npx tba-agent version
```

```
Version instalada:   1.0.0
Version disponible:  1.1.0

Actualización disponible! Corre `npx tba-agent update` para actualizar.
```

---

## Estructura de archivos instalados

### Claude Code (global)

```
~/.claude/
├── agents/
│   ├── tba-orchestrator.md
│   ├── context-analyzer.md
│   ├── architect-planner.md
│   ├── code-implementor.md
│   ├── doc-generator.md
│   ├── azure-integrator.md
│   ├── git-manager.md
│   └── simple-implementor.md
└── skills/
    ├── analyze-initiative/
    ├── create-azure-workitems/
    │   └── config/
    │       ├── azure-pat.js        ← tu PAT
    │       └── productos.json      ← config del equipo
    ├── generate-wiki/
    │   └── config/
    │       └── productos.json      ← symlink → create-azure-workitems
    └── ... (resto de skills)
```

### GitHub Copilot (project)

```
.github/
├── agents/
├── skills/
└── copilot-instructions.md
.vscode/
└── settings.json
```

---

## Consideraciones por sistema operativo

### Linux / macOS

Funcionamiento completo. El symlink entre los dos archivos `productos.json` se crea sin configuración adicional.

### Windows

La creación de symlinks en Windows requiere uno de los siguientes:

- **Developer Mode** activado (Configuración → Actualización y seguridad → Para desarrolladores)
- Ejecutar la terminal **como Administrador**

Si ninguna de las dos condiciones se cumple, el CLI muestra un aviso y copia el archivo en ambas ubicaciones. En ese caso, al editar `productos.json` deberás actualizarlo manualmente en ambas rutas:

```
.claude\skills\create-azure-workitems\config\productos.json
.claude\skills\generate-wiki\config\productos.json
```
