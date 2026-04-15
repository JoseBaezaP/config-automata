# PRD Template — Product Requirements Document

<!-- 
  INSTRUCCIONES PARA EL AGENTE:
  Este template define la estructura exacta del PRD. Cada sección tiene anotaciones
  entre <!-- comentarios --> que explican cómo llenarla. No incluir los comentarios
  en el documento final.
  
  Genera el PRD completo, reemplazando los placeholders [ASÍ] con contenido real.
  Elimina secciones vacías en lugar de dejarlas con "N/A" o "TBD".
-->

# [Título de la Iniciativa]
<!-- Título corto y descriptivo. Ej: "Consulta de Tienda por Código Postal" -->

**[PRD] Product Requirement Doc**

---

## Metadatos

| Campo | Valor |
|-------|-------|
| **Customer Journey Step** | [N/A o paso del journey: Discovery / Consideration / Purchase / Post-Purchase] |
| **Priority** | [HIGH / MEDIUM / LOW] |
| **Status** | DRAFT |

### Equipo

| Rol | Asignado |
|-----|----------|
| Product Manager | @ |
| Designer / UX | @ |
| Tech Lead | @ |
| TBA | @ |
| QA | @ |

<!-- Dejar con "@" si no hay asignados todavía. El usuario puede completarlos después. -->

---

## Objetivo

[Un párrafo claro que explique: QUÉ permite hacer esta iniciativa, a QUIÉN beneficia, y QUÉ resultado concreto se obtiene. Sin detalles técnicos aquí — eso va en Entregables Técnicos.]

<!--
Ejemplo:
"Permitir que un usuario ingrese un código postal (CP) y obtenga de forma inmediata
la tienda que atiende dicho CP, mostrando: nombre de tienda, dirección, servicios
disponibles (delivery/pickup) y su ubicación en mapa. Sin mostrar disponibilidad,
slots, capacidades, ni reglas de promesa de entrega."
-->

---

## Alcance

<!-- Lista de lo que SÍ incluye esta iniciativa. Sé específico — "endpoint de lectura" 
     es mejor que "acceso a datos". Lo que NO incluye va en Out of Scope. -->

- [Feature o componente 1 — sé específico]
- [Feature o componente 2]
- [Reglas de asignación o lógica de negocio incluida]
- [Permisos o restricciones de acceso]
- [Mensajería o estados de error incluidos]

---

## Requerimientos

<!-- Tabla con todas las User Stories. Cada fila es una historia funcional distinta.
     Agrupar por Overview cuando varias historias pertenecen al mismo flujo. -->

| Overview | User Story | Importancia | Criterios de Aceptación | Reglas de Negocio |
|----------|------------|-------------|------------------------|-------------------|
| [Nombre del flujo o módulo] | Como [rol específico] quiero [acción concreta] para [objetivo medible] | `MUST` | 1. [Criterio verificable] 2. [Criterio verificable] | **RN1** — [Regla específica y comprobable] **RN2** — [Regla] |

<!--
Importancia:
- MUST: sin esto el MVP no funciona / no puede lanzarse
- COULD: valioso pero no bloqueante para el lanzamiento
- SHOULD: deseable, planear para iteración futura

Criterios de aceptación — ejemplos de formato correcto:
✓ "Si existe al menos una tienda activa con cobertura para el CP, se muestra la tienda asignada"
✓ "Si no existe cobertura, mostrar estado 'No existe tienda que atienda este CP'"
✗ "El sistema funciona correctamente" (no verificable)
✗ "La UI es intuitiva" (subjetivo)

Reglas de negocio — ejemplos:
✓ "RN1 — Formato CP: 5 dígitos numéricos, permitir ceros a la izquierda"
✓ "RN2 — Activa: excluir tiendas con active = false"
✓ "RN3 — Cobertura: una tienda atiende si el CP está en zipCodeCoverage"
✗ "RN1 — Validar el CP" (demasiado vago)
-->

---

## Usuarios y Tareas Clave

<!-- Un bloque por cada rol que interactúa con esta feature. 
     Describe quién es, qué hace con esto, y su necesidad UX principal. -->

### [Rol 1 — ej: Administrador de Sistema / eCommerce]

**Descripción:** [Quién es este usuario y qué permisos tiene]

**Tareas clave:**
1. [Tarea principal que realiza con esta feature]
2. [Tarea secundaria]
3. [...]

**Insight UX:** [Qué necesita este usuario para que su experiencia sea exitosa — no técnico, sino funcional/emocional. Ej: "Requiere fluidez en la edición, feedback de guardado claro, y prevención de errores."]

---

## Criterios de Éxito UX

<!-- Por cada pantalla, flujo o feature principal, define cómo saber que la UX funciona.
     Criterios observables, no subjetivos. -->

### [Feature o Pantalla 1]

**Objetivo UX:** [Qué experiencia queremos que tenga el usuario aquí]

**Criterios de éxito:**
1. [Criterio observable — ej: "Los filtros son combinables y actualizan la tabla sin recargar la página"]
2. [Criterio observable]
3. [...]

---

## Diseño de Referencia

<!-- Links a Figma, Sketch, herramientas existentes, o capturas de pantalla.
     Si no hay diseño, describir qué existe actualmente como punto de partida.
     Si no aplica, eliminar esta sección. -->

[Descripción o link al diseño de referencia existente, si hay uno]

---

## Entregables Técnicos

<!-- APIs, endpoints, ejemplos de payloads, integraciones con sistemas externos.
     Esta sección es para el equipo técnico — puede incluir formato JSON, URLs de API, etc.
     Si no hay entregables técnicos definidos aún, mencionar cuáles se necesitan definir. -->

**API / Endpoints:**

```
[MÉTODO] [URL del endpoint]
Ejemplo: GET /api/stores?zipCode=66024
```

**Ejemplo de respuesta:**

```json
{
  "campo": "valor"
}
```

**Integraciones:**
- [Sistema externo 1 y cómo se conecta]
- [Sistema externo 2]

---

## Q&A

<!-- Preguntas que surgieron durante el proceso y sus respuestas.
     Útil para dejar trazabilidad de decisiones tomadas. -->

| Pregunta | Respuesta | Fecha |
|----------|-----------|-------|
| [Pregunta que surgió] | [Respuesta acordada] | [Fecha] |

---

## Out of Scope

<!-- Lista explícita de lo que NO incluye esta iniciativa.
     Crucial para prevenir scope creep. Incluir cosas que el usuario mencionó
     pero que conscientemente se dejan fuera. -->

- [Feature excluida 1 — y brevemente por qué si es relevante]
- [Feature excluida 2]
- [...]
