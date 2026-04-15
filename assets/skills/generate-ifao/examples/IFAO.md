# Informe de Factibilidad y Alineación Operativa (IFAO)

## 1. Resumen Ejecutivo
La iniciativa busca automatizar y robustecer la gestión de datos de check-in de drivers y validaciones post-carga en los sistemas de Última Milla y eFulfillment. El objetivo es garantizar la integridad, trazabilidad y disponibilidad de información para la toma de decisiones operativas y soporte. El stack tecnológico principal está compuesto por Node.js/NestJS para backend, PostgreSQL como motor de base de datos, React para frontend, Informatica para orquestación ETL y CAWA para gestión de workflows. Las integraciones clave incluyen FTP seguro, APIs REST y notificaciones vía SMTP.

---

## 2. Alcance del PRD

| Objetivo | Alcance Principal |
|----------|------------------|
| Automatización de carga de check-in | Procesamiento automático de archivos Checked_In_YYYYMMDD.txt desde FTP Instaleap a DWH del COMME |
| Validación post-carga | Comparación de registros entre archivos nebula y tablas IPC, con notificación de discrepancias |
| Ajuste de estructura BD | Modificación de columna route en nebula_task a 150 caracteres en ods_instaleap |
| Visualización y monitoreo | Componente React para mostrar estado de cargas y errores a Gerentes de Operaciones |
| Notificaciones automáticas | Envío de alertas por correo ante errores, archivos faltantes o diferencias de registros |
| Integración de workflows | Orquestación de procesos en CAWA, asegurando alineación con malla Instaleap |
| Control de acceso | Restricción por roles en APIs, frontend y procesos de carga/validación |
| Escenarios de prueba | Validación funcional y técnica de todos los procesos involucrados |

---

## 3. Evaluación de Factibilidad Técnica

### 3.1 Integraciones

| Sistema/Proceso | Endpoint/URL Identificado |
|-----------------|--------------------------|
| FTP Instaleap   | FTP://instaleap.com/Checked_In_YYYYMMDD.txt |
| Notificación Soporte | SMTP://soporte@heb.com |
| API Backend Check-In | POST /api/checkin |
| API Estado de Carga | GET /api/checkin/status |
| Notificación eFulfillment | SMTP://sefulfillment@hebmex.com |

---

### 3.2 Base de Datos

**DWH del COMME**
- Servidor: No especificado
- Puerto: No especificado
- Tabla creada: `checkin`
  - Estructura: event_id, event_type, client_id, checked_in_at, store_id, resource_id, resource_latitude, resource_longitude, synced_at

**IPC**
- Servidor: No especificado
- Puerto: No especificado
- Tablas validadas: nebula_jobs, nebula_items, nebula_tasks, nebula_steps, nebula_resources, odin_users

**ODS Instaleap**
- Tabla modificada: nebula_task
  - Columna route ajustada a VARCHAR(150)

---

### 3.3 Seguridad

- Autenticación recomendada: JWT para APIs y frontend
- Autorización: Control por roles (Gerente de Operaciones, Soporte, Administrador BD)
- Protección de datos en tránsito: FTP seguro, APIs con HTTPS
- Protección de datos en reposo: Restricción de acceso a BD y procesos críticos
- Notificaciones: Solo a correos autorizados

---

## 4. Evaluación Operativa (Soporte)

La matriz de riesgos identifica impactos operativos relevantes:
- Fallos en carga automática desde FTP pueden generar reprocesos y requerir intervención de soporte.
- Diferencias entre registros en archivos y BD demandan revisión manual y corrección.
- Cambios en estructura de BD requieren validación exhaustiva para evitar interrupciones.
- El monitoreo y notificación automática minimizan tiempos de respuesta ante incidentes.

---

## 5. Riesgos y Stoppers (Arquitectura + Soporte + TBA)

| ID          | Descripción | Probabilidad | Impacto | Nivel de Riesgo | Clasificación | Tipo de Riesgo | Recomendación |
|-------------|-------------|--------------|---------|-----------------|---------------|----------------|---------------|
| Riesgo-001  | Fallo en la carga automática desde FTP por archivo faltante o corrupto. | 3 | 2 | 6 | Riesgo | Técnico | Implementar reintentos automáticos, validación de integridad y alertas inmediatas por correo. |
| Riesgo-002  | Diferencias entre registros en archivo y base de datos tras la carga. | 2 | 3 | 6 | Riesgo | Funcional | Automatizar validaciones post-carga y notificar discrepancias para revisión y corrección. |
| Riesgo-003  | Error en el proceso de alteración de columna route en nebula_task, provocando truncamiento o rechazo de datos. | 2 | 3 | 6 | Riesgo | Técnico | Realizar pruebas previas y monitorear logs tras el cambio; validar tamaño de datos antes de la carga. |
| Riesgo-004  | Acceso no autorizado a datos sensibles o procesos de carga/validación. | 2 | 2 | 4 | Aceptable | Seguridad | Restringir acceso por roles y aplicar autenticación robusta en APIs y BD. |
| Riesgo-005  | Interrupción del proceso ETL en Informatica/CAWA por cambios no controlados. | 1 | 3 | 3 | Aceptable | Técnico | Documentar y probar todos los cambios antes de implementarlos en producción. |
| Riesgo-006  | Sobrecarga de la base de datos por grandes volúmenes de registros. | 1 | 2 | 2 | Aceptable | De Datos | Monitorear el rendimiento y escalar recursos de BD según crecimiento. |

> **STOPPER:** Fallo en la carga automática desde FTP o error en alteración de columna route pueden detener la operación y requieren atención inmediata.

> **Riesgo Crítico:** Diferencias entre registros en archivo y BD pueden afectar la confiabilidad de métricas y decisiones operativas.

---

## 6. Requerimientos Previos a Desarrollo (Checklist)

- [ ] Validar acceso y credenciales al FTP Instaleap
- [ ] Confirmar estructura y permisos de la tabla checkin en DWH del COMME
- [ ] Documentar y validar endpoints de APIs REST (POST /api/checkin, GET /api/checkin/status)
- [ ] Configurar y probar notificaciones SMTP (soporte@heb.com, sefulfillment@hebmex.com)
- [ ] Ajustar columna route en nebula_task a 150 caracteres
- [ ] Validar funcionamiento de procesos ETL en Informatica y CAWA post-cambio
- [ ] Definir y documentar roles y permisos en APIs y frontend
- [ ] Preparar escenarios de prueba funcional y técnica
- [ ] Revisar logs y mecanismos de auditoría en BD y procesos automáticos

---

## 7. Validaciones (TBA / Arquitectura / Soporte / Producto)

- [ ] Validar que la carga automática desde FTP se realiza sin errores y mueve archivos procesados correctamente
- [ ] Verificar que la tabla checkin y tablas nebula reflejan fielmente los datos de los archivos procesados
- [ ] Confirmar que la columna route en nebula_task acepta 150 caracteres y no genera errores en procesos ETL
- [ ] Probar que las notificaciones por correo se envían ante errores, archivos faltantes o discrepancias
- [ ] Validar que el componente React muestra correctamente el estado de cargas y errores solo a usuarios autorizados
- [ ] Revisar que los procesos automáticos cumplen con los requerimientos de rendimiento (<5 minutos por lote)
- [ ] Auditar que los accesos y operaciones están restringidos por roles definidos
- [ ] Ejecutar escenarios de prueba QA para todos los procesos y flujos involucrados

---

## 8. Anexos

### Requerimientos No Funcionales

| Categoría      | Descripción |
|----------------|-------------|
| Rendimiento    | Procesamiento <5 min por lote, miles de registros diarios, ejecución en ventanas programadas |
| Seguridad      | Acceso restringido por roles, FTP seguro, APIs autenticadas, notificaciones a correos autorizados |
| Fiabilidad     | Validaciones automáticas, tolerancia a fallos, logs de auditoría |
| Usabilidad     | Interfaz clara, acceso por rol, notificaciones automáticas |
| Mantenimiento  | Ajustes sin afectar operación, documentación y escenarios de prueba, componentes desacoplados |
| Escalabilidad  | Soporte para nuevos archivos, tablas y procesos sin rediseño mayor |

---

### Integraciones Técnicas

| Sistema | Descripción Técnica | Interfaces |
|---------|---------------------|------------|
| Instaleap | Provee archivos de check-in y nebula | FTP, TXT |
| DWH COMME | Almacena datos procesados | SQL |
| IPC | Almacena datos validados | SQL |
| CAWA | Orquesta workflows | Informatica |
| Node.js | Backend validación y notificación | REST, SMTP |
| React | Frontend visualización | REST |
| SMTP | Notificaciones | SMTP |

---

### Diagramas

#### Proceso Principal
::: mermaid
flowchart TD
    A[FTP Instaleap: Archivo Check-In/nebula] --> B[Proceso ETL Informatica/CAWA]
    B --> C[Validación y carga en BD DWH/IPC]
    C --> D[Verificación post-carga]
    D -->|Sin errores| E[Visualización estado en Frontend]
    D -->|Con errores| F[Notificación por correo a Soporte]
    E --> G[Gerente de Operaciones]
    F --> H[Equipo de Soporte]
:::

#### Secuencia de Interacción
::: mermaid
sequenceDiagram
    participant Instaleap
    participant FTP
    participant ETL
    participant BD
    participant Backend
    participant Frontend
    participant Soporte
    Instaleap->>FTP: Envía archivo
    ETL->>FTP: Monitorea y descarga archivo
    ETL->>BD: Inserta/actualiza registros
    Backend->>BD: Valida registros
    Backend->>Soporte: Envía correo si hay errores
    Frontend->>Backend: Consulta estado y errores
    Frontend->>Gerente: Muestra información
:::

#### Flujo de Datos
::: mermaid
flowchart LR
    A[Archivo TXT FTP] --parse--> B[Proceso ETL]
    B --insert/update--> C[Tabla Check-In DWH]
    B --insert/update--> D[Tablas nebula IPC]
    C --validate--> E[Backend Node.js]
    D --validate--> E
    E --API--> F[Frontend React]
    E --SMTP--> G[Correo Soporte]
:::

---

### Matriz de Riesgos

| ID          | Descripción | Probabilidad | Impacto | Nivel de Riesgo | Clasificación | Tipo de Riesgo | Recomendación |
|-------------|-------------|--------------|---------|-----------------|---------------|----------------|---------------|
| Riesgo-001  | Fallo en la carga automática desde FTP por archivo faltante o corrupto. | 3 | 2 | 6 | Riesgo | Técnico | Implementar reintentos automáticos, validación de integridad y alertas inmediatas por correo. |
| Riesgo-002  | Diferencias entre registros en archivo y base de datos tras la carga. | 2 | 3 | 6 | Riesgo | Funcional | Automatizar validaciones post-carga y notificar discrepancias para revisión y corrección. |
| Riesgo-003  | Error en el proceso de alteración de columna route en nebula_task, provocando truncamiento o rechazo de datos. | 2 | 3 | 6 | Riesgo | Técnico | Realizar pruebas previas y monitorear logs tras el cambio; validar tamaño de datos antes de la carga. |
| Riesgo-004  | Acceso no autorizado a datos sensibles o procesos de carga/validación. | 2 | 2 | 4 | Aceptable | Seguridad | Restringir acceso por roles y aplicar autenticación robusta en APIs y BD. |
| Riesgo-005  | Interrupción del proceso ETL en Informatica/CAWA por cambios no controlados. | 1 | 3 | 3 | Aceptable | Técnico | Documentar y probar todos los cambios antes de implementarlos en producción. |
| Riesgo-006  | Sobrecarga de la base de datos por grandes volúmenes de registros. | 1 | 2 | 2 | Aceptable | De Datos | Monitorear el rendimiento y escalar recursos de BD según crecimiento. |

---
