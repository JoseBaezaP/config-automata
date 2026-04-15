---
name: Link Commits to Work Items
description: Vincula commits de git a work items de Azure DevOps usando Hyperlinks (repos externos como GitHub) o ArtifactLinks (Azure Repos), con fallback a comentarios si el linking falla. Desencadenar despues de que Track A (azure-integrator) y Track B (git-manager) hayan completado, cuando existan commit-log.json y azure-workitems.json, o cuando se necesite vincular commits a work items para trazabilidad.
---

# Skill: Link Commits to Work Items

## Proposito

Vincular commits de git a work items de Azure DevOps para trazabilidad completa. Cada commit queda referenciado en el work item correspondiente, permitiendo rastrear que codigo implementa cada Historia de Usuario.

## Cuando Usar

- Despues de que ambos tracks (A y B) completen en el flujo Automata
- Cuando existan `commit-log.json` (de git-manager) y `azure-workitems.json` (de azure-integrator)
- Al final del flujo, en la Fase 4 (Linking)

## Entrada / Salida

**Entrada**:
- `nombre_iniciativa`: Nombre de la iniciativa
- `tba-output/{nombre}/commit-log.json` (de git-manager)
- `tba-output/{nombre}/azure-workitems.json` (de azure-integrator)
- `repo_url` (opcional): URL del repositorio para repos externos (ej: https://github.com/org/repo)
- `repo_type` (opcional): `external` (default) o `azure`

**Salida**: `tba-output/{nombre}/linking-result.json`

---

## Proceso

### 1. Cargar Datos

Leer ambos archivos JSON:
- `commit-log.json`: Contiene array de commits con `sha`, `message`, `huReferences`, `files`
- `azure-workitems.json`: Contiene mapping de HU references a work item IDs

### 2. Mapear Commits a Work Items

Para cada commit en `commit-log.json`:
1. Extraer `huReferences` (ej: ["HU-01", "HU-02"])
2. Buscar en `azure-workitems.json` los work item IDs correspondientes a esas HUs
3. Si no hay match por HU, vincular al Feature ID como fallback

### 3. Crear Links

Ejecutar el script `link-commits-to-workitems.js`:

```bash
node skills/create-azure-workitems/scripts/link-commits-to-workitems.js \
  "tba-output/{nombre}/commit-log.json" \
  "tba-output/{nombre}/azure-workitems.json" \
  "{organization}" \
  "{project}" \
  --repo-type={external|azure} \
  --repo-url={url}
```

### 4. Estrategias de Linking

**Repo externo (GitHub, Bitbucket)**:
- Tipo de link: `Hyperlink`
- URL: `{repo_url}/commit/{sha}`
- Comentario: mensaje del commit + branch

**Repo en Azure Repos**:
- Tipo de link: `ArtifactLink`
- URL: `vstfs:///Git/Commit/{projectId}%2F{repoId}%2F{sha}`
- Atributo: "Fixed in Commit"

**Fallback** (si el link falla):
- Agrega un comentario en el work item con los datos del commit
- El comentario incluye: SHA, mensaje, branch, initiative, URL (si hay)

### 5. Guardar Resultado

El script guarda `linking-result.json` automaticamente.

---

## Estructura de linking-result.json

```json
{
  "timestamp": "2026-04-09T14:40:00Z",
  "branch": "feature/consulta-tienda-por-cp",
  "initiative": "consulta-tienda-por-cp",
  "repoType": "external",
  "repoUrl": "https://github.com/heb/ecomm-ecomtools-web",
  "totalLinked": 4,
  "totalFailed": 0,
  "results": [
    {
      "commitSha": "a1b2c3d",
      "workItemId": 12347,
      "linkType": "Hyperlink",
      "status": "linked"
    }
  ]
}
```

---

## Validaciones

**Pre-ejecucion**:
- `commit-log.json` existe y tiene al menos 1 commit
- `azure-workitems.json` existe y tiene al menos 1 user story
- Organization y project estan configurados

**Post-ejecucion**:
- `linking-result.json` generado
- Al menos 1 link creado exitosamente
- Si todos fallan, reportar error pero no bloquear el flujo

## Manejo de Errores

| Error | Accion |
|-------|--------|
| commit-log.json no existe | Reportar error, Track B probablemente fallo |
| azure-workitems.json no existe | Reportar error, Track A probablemente fallo |
| API de Azure rechaza link | Fallback a comentario en el work item |
| Todos los links fallan | Reportar, no es critico — documentar en resumen final |
| Rate limiting | Throttle 200ms entre requests (ya implementado en script) |

## Conexion con Otros Skills

**Input de**: `git-manager` (commit-log.json), `create-azure-workitems` (azure-workitems.json)
**Output para**: Orquestador (resumen final en Gate 5)
