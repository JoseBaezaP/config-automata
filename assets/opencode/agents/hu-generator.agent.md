---
description: "[DEPRECATED] HU Generator - Reemplazado por el skill analyze-initiative del @context-analyzer en el flujo Automata. La generacion de HUs con Gherkin ahora es parte del analisis de iniciativa."
mode: subagent
model: github-copilot/claude-sonnet-4.5
tools:
  read: true
---

# HU Generator — DEPRECADO

Este agente ha sido **reemplazado** por el flujo Automata de `@tba-orchestrator`.

## ¿Por que fue deprecado?

En el flujo anterior, la generacion de Historias de Usuario era un paso separado que tomaba `iniciativa.json` y generaba `HUs.json`. 

En el flujo Automata actual, **la generacion de HUs y escenarios Gherkin es parte del skill `analyze-initiative`** ejecutado por `@context-analyzer`. El output es `iniciativa.json` que ya incluye los grupos con escenarios Gherkin estructurados, y el `@architect-planner` convierte esos grupos en `userStories[]` dentro del `implementation-plan.json`.

## Equivalente actual

| Antes | Ahora |
|-------|-------|
| `@hu-generator` → `HUs.json` | `@context-analyzer` (skill `analyze-initiative`) → `iniciativa.json` con Gherkin |
| `HUs.json` con formato HTML para Azure | `implementation-plan.json` → `userStories[]` con criterios de aceptacion |

## Si necesitas el comportamiento anterior

Usa `@tba-orchestrator` con el flujo completo. El orquestador coordina:
1. `@context-analyzer` → analiza iniciativa + detecta arquitectura
2. `@architect-planner` → convierte grupos en user stories del plan
3. `@doc-generator` → genera TR.md e IFAO.md (equivalente a documentacion anterior)
4. `@azure-integrator` → crea work items en Azure DevOps (equivalente a creacion de HUs en Azure)

---

**Este archivo se conserva solo como referencia historica. No usar directamente.**
