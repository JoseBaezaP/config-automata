---
description: "[DEPRECATED] HU Generator - Reemplazado por el skill analyze-initiative del @context-analyzer en el flujo Automata. La generacion de HUs con Gherkin ahora es parte del analisis de iniciativa."
mode: subagent
model: Claude Sonnet 4.5
tools: [read]
---

# HU Generator — DEPRECADO

Este agente ha sido **reemplazado** por el flujo Automata de `@tba-orchestrator`.

## ¿Por que fue deprecado?

En el flujo anterior, la generacion de Historias de Usuario era un paso separado que tomaba `iniciativa.json` y generaba `HUs.json`.

En el flujo Automata actual, **la generacion de HUs y escenarios Gherkin es parte del skill `analyze-initiative`** ejecutado por `@context-analyzer`. El output es `iniciativa.json` que ya incluye los grupos con escenarios Gherkin estructurados, y el `@architect-planner` convierte esos grupos en `userStories[]` dentro del `implementation-plan.json`.

## Equivalente actual

Usa `@tba-orchestrator` para el flujo completo. El analisis de iniciativa y generacion de HUs se ejecuta automaticamente en la Fase 1.
