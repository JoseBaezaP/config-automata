# HEB-Automata — Instrucciones para GitHub Copilot

Este proyecto usa el sistema **TBA-Automata**: agentes y skills para automatizar el flujo desde analisis de PRD hasta implementacion de codigo y Azure DevOps.

## Como usar

### Flujo completo

Selecciona el agente **tba-orchestrator** en el dropdown de Copilot Chat:

```
Quiero implementar [descripcion de la iniciativa]
PRD: [ruta al archivo o pega el texto]
Proyecto: [ruta al proyecto fuente]
```

El orquestador detecta automaticamente si es micro-change o flujo SDD completo.

### Skills disponibles (invocables con `/`)

| Skill | Cuando usarlo directamente |
|-------|---------------------------|
| `/analyze-initiative` | Analizar un PRD y generar Gherkin |
| `/detect-architecture` | Detectar arquitectura de un proyecto |
| `/plan-implementation` | Generar plan file-by-file desde los JSONs |
| `/implement-code` | Ejecutar el plan de implementacion |
| `/generate-requirements` | Generar RNFs y matriz de riesgos |
| `/generate-wiki` | Generar TR.md |
| `/generate-ifao` | Generar IFAO.md |
| `/create-azure-workitems` | Crear work items en Azure DevOps |
| `/link-commits-to-workitems` | Vincular commits a work items |

### Agentes disponibles (desde el dropdown)

- **tba-orchestrator** — Punto de entrada principal (flujo completo)

Los demas agentes son invocados automaticamente por el orquestador.

## Outputs

Todos los archivos en `tba-output/{nombre-iniciativa}/`:
- `iniciativa.json` — Requerimientos + Gherkin
- `architecture-constraints.json` — Arquitectura detectada
- `implementation-plan.json` — Plan file-by-file
- `requirements.json` — RNFs + riesgos + diagramas
- `TR.md` — Technical Requirements
- `IFAO.md` — Factibilidad y Alineacion Operativa
- `azure-workitems.json` — IDs de Azure DevOps
- `commit-log.json` — SHA de commits
- `implementation-report.json` — Reporte de implementacion

## Azure DevOps (opcional)

```bash
export AZURE_ORG="tu-organizacion"
export AZURE_PROJECT="tu-proyecto"
export AZURE_PAT="tu-personal-access-token"
```

PAT necesita permisos: Work Items (R/W), Wiki (R/W), Code (R).
