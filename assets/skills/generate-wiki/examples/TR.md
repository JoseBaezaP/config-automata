# Documentación Técnica: Proceso de Check-In y Validación de Datos en Operaciones eFullfilment

## Resumen Ejecutivo

Esta documentación abarca la integración de procesos automáticos de carga y validación de registros provenientes de archivos de Instaleap, su almacenamiento en bases de datos empresariales y la visualización de estados y errores, con el objetivo de optimizar la medición de productividad y mantener la integridad de la información para operaciones de última milla y eFulfillment.

## Datos Informativos

| Product Owner   | Scrum Master  | Líderes Técnicos         | TBA                |
|-----------------|--------------|--------------------------|---------------------|
| Chuck Covian    | Javier Lopez | Abuir Juarez, Patricia Rodriguez | <jbaeza@hebmex.com> |

## Historia de Usuario

### 1. Carga de check-in de drivers

ID: #194258

**Descripción:**  
Como Gerente de Operaciones de Última Milla, quiero poder disponer de la información de llegada a tienda para cada driver, para poder medir la productividad, asistencia y tiempos de trabajo.

#### Criterios de Aceptación

- El archivo debe ser tomado del FTP por un proceso de Informatica.
- El proceso debe validar la información en los archivos para determinar si debe insertar o actualizar hacia la base de datos.
- La base de datos donde se hace la carga y actualización es el DWH del COMME.
- Se deben insertar o actualizar todas las columnas, excepto la columna client_id.
- Debe existir una tabla en el DWH con la estructura correspondiente.
- Una vez procesada la información, el archivo debe moverse a la carpeta “Procesados” en FTP.
- Si ocurre un error de procesamiento, archivo faltante o diferencias en registros, se debe enviar un correo al equipo de soporte.
- El workflow y job forman parte de la malla Instaleap en CAWA.

#### Tareas Técnicas de Implementación

##### 1.1 [BD] - Crear/Actualizar tabla Check-In en DWH

ID: #194259

**Detalle:**  
Diseñar y crear una tabla en el DWH del COMME para almacenar los datos de Check-In, conforme a la documentación 'Check-In.xlsx'.

```sql
CREATE TABLE dwh_comme.checkin (
  event_id INT,
  event_type VARCHAR(50),
  client_id INT,
  checked_in_at TIMESTAMP,
  store_id INT,
  resource_id INT,
  resource_latitude FLOAT,
  resource_longitude FLOAT,
  synced_at TIMESTAMP
);
```

##### 1.2 [INTEG] - Proceso automático de carga desde FTP

ID: #194260

**Detalle:**  
Desarrollar un proceso que monitoree el FTP, obtenga el archivo Checked_In_YYYYMMDD.txt y lo procese.

```js
// Node.js pseudo-code
const ftp = require('ftp');
ftp.connect({host: 'ftp.instaleap.com'});
ftp.get('Checked_In_YYYYMMDD.txt', function(stream) {
  // parse and process stream
  moveToProcessed();
});
```

##### 1.3 [BACK] - Proceso de validación y notificación de errores

ID: #194261

**Detalle:**  
Implementar lógica backend (Node.js) que valide registros insertados vs el archivo original y notifique por correo electrónico en caso de discrepancias.

```js
if (dbRows !== fileRows) {
  sendEmail('soporte@heb.com', 'Error en carga de Check-In');
}
```

##### 1.4 [FRONT] - Visualización de estado de carga y errores

ID: #194262

**Detalle:**  
Crear componente React que muestre a usuarios de operaciones el estado de cargas, fechas procesadas y errores reportados.

```jsx
// Componente React
function CheckInStatus() {
  const [status, setStatus] = useState(null);
  useEffect(() => {
    fetch('/api/checkin/status').then(r => r.json()).then(setStatus);
  }, []);
  return <div>{status}</div>;
}
```

---

### 2. Validación de cantidad de registros post-carga

ID: #194264

**Descripción:**  
Como ingeniero de soporte de eFullfilment, quiero que al finalizar la carga y actualización de información en la base de datos, se haga una comprobación de registros para validar integridad entre BD y archivos.

#### Criterios de Aceptación

- Los procesos de carga de IPC deben validar que la información de los archivos: nebula_jobs, nebula_items, nebula_tasks, nebula_steps, nebula_resources, odin_users coincida con la base de datos.
- Validar a nivel registro que el id exista en la tabla con el mismo estatus.
- En caso de diferencias, notificación por correo electrónico a <sefulfillment@hebmex.com>.

#### Tareas Técnicas de Implementación

##### 2.1 [BD] - Verificación de registros por tabla IPC

ID: #194265

**Detalle:**  
Implementar query en la BD que compare registros entre archivos de carga y tablas correspondientes.

```sql
SELECT id, state FROM nebula_jobs
WHERE state != (valor_en_archivo);
```

##### 2.2 [BACK] - Script de validación y notificación post-carga

ID: #194266

**Detalle:**  
Crear script que valide registros entre cada archivo y BD, enviando correos ante discrepancias.

```js
const idsArchivo = leerArchivo('nebula_jobs.txt');
const idsBD = queryBD('nebula_jobs');
if (!comparar(idsArchivo, idsBD)) {
  sendEmail('sefulfillment@hebmex.com', 'Diferencias en registros');
}
```

---

### 3. Ajustar tamaño de la columna route en nebula_task

ID: #194268

**Descripción:**  
Como administrador de BD, quiero que la columna “route” de la tabla “nebula_task” en ods_instaleap pueda almacenar toda la información proveniente de archivos nebula_tasks.

#### Criterios de Aceptación

- El campo debe aceptar 150 caracteres.
- El proceso de Informatica debe funcionar sin errores.

#### Tareas Técnicas de Implementación

##### 3.1 [BD] - Alterar columna route en nebula_task

ID: #194269

**Detalle:**  
Modificar la longitud del campo route a 150 caracteres en nebula_task de ods_instaleap.

```sql
ALTER TABLE ods_instaleap.nebula_task
ALTER COLUMN route TYPE VARCHAR(150);
```

##### 3.2 [BACK] - Validación de funcionalidad proceso Informatica

ID: #194270

**Detalle:**  
Ejecutar pruebas de carga y actualización con archivos nebula_tasks tras el cambio de longitud.

```js
// Test automatizado Node.js
process.run('WFL_ods_instaleap_nebula_tasks');
assert(process.status === 'OK');
```

---

## Escenarios de prueba para las HUs

### 1. Carga de check-in de drivers

Escenarios de prueba

ID: #194263

#### Escenario 1: Carga exitosa de registro  

Dado que existe el archivo Checked_In_YYYYMMDD.txt en el FTP  
Cuando el proceso se ejecuta correctamente  
Entonces la información se inserta/actualiza en la tabla  
Y el archivo se mueve a Procesados

#### Escenario 2: Error de archivo faltante  

Dado que el archivo esperado no existe en la carpeta FTP  
Cuando el proceso intenta ejecutarse  
Entonces se envía correo de error al equipo de soporte

#### Escenario 3: Diferencias en registros procesados  

Dado que se realizó una carga del archivo  
Y la cantidad de registros en la tabla no coincide con el archivo  
Cuando finaliza el proceso  
Entonces se envía correo de discrepancia al equipo de soporte

---

### 2. Validación de cantidad de registros post-carga

Escenarios de prueba

ID: #194267

#### Escenario 1: Validación exitosa de registros  

Dado que se han cargado los archivos nebula_jobs, nebula_items, nebula_tasks, nebula_steps, nebula_resources y odin_users  
Y que los datos en BD coinciden en número y estado por registro  
Cuando se ejecuta la validación post-carga  
Entonces no se envía ninguna notificación de diferencia

#### Escenario 2: Discrepancia detectada en estado  

Dado que se realiza la carga de un archivo y el estado del registro en la BD es diferente al archivo  
Cuando termina la verificación  
Entonces se envía correo a <sefulfillment@hebmex.com> reportando la diferencia

#### Escenario 3: Archivo incompleto  

Dado que un archivo contiene menos registros que la tabla equivalente en BD  
Cuando se finaliza la revisión  
Entonces se envía notificación por correo especificando registros faltantes

---

### 3. Ajustar tamaño de la columna route en nebula_task

Escenarios de prueba

ID: #194271

#### Escenario 1: Modificación exitosa de longitud  

Dado que la columna route está alterada a 150 caracteres  
Cuando se realiza una carga con datos que exceden el tamaño anterior  
Entonces la información se almacena sin truncamiento

#### Escenario 2: Proceso Informatica funciona correctamente  

Dado que el proceso INSTALEAP_NEBULA_TASKS está configurado  
Cuando se ejecuta tras el aumento de campo  
Entonces el workflow se completa sin errores

#### Escenario 3: Error al insertar campo mayor a 150  

Dado que se intenta insertar un valor mayor a 150 caracteres en route  
Cuando se realiza la operación  
Entonces se rechaza el valor y se genera error de longitud

---

## Solución Técnica y Arquitectura

### Descripción Técnica

La solución integra procesos automáticos de carga y validación entre sistemas Instaleap, DWH del COMME, IPC y ODS Instaleap. Node.js se emplea en backend; React en frontend; PostgreSQL como motor BD; Informatica para ETL; los workflows se orquestan en CAWA.

### Sistemas Involucrados

- Instaleap: Provisión de archivos check-in y nebula.
- Servidor FTP: Almacena y transporta archivos.
- DWH del COMME y BD IPC: Almacenan datos procesados.
- CAWA: Orquesta workflows.
- Backend Node.js: Valida y notifica errores.
- Frontend React: Visualiza estados y errores.
- Servidor SMTP: Envía notificaciones.

### Interfaces y Eventos

- FTP para transferencia de archivos.
- APIs REST (POST /api/checkin, GET /api/checkin/status) para consulta y visualización.
- SMTP para notificaciones.
- Formatos: TXT, JSON, SQL.
- Procesos ETL en Informatica y CAWA.

### Flujos de Datos

- Los archivos check-in y nebula se transfieren por FTP desde Instaleap.
- El ETL procesa y carga datos en DWH/IPC.
- Backend valida registros post-carga, enviando notificaciones al detectar discrepancias.
- Frontend consume APIs para mostrar estados y errores.

### Autenticación y Autorización

- Acceso a APIs y frontend controlado por roles (Gerente de Operaciones, Soporte, Administrador BD).
- Se recomienda JWT para autenticación/autorización.
- Permisos en CAWA y BD para procesos de carga/validación.
- Correos restringidos a destinatarios autorizados.

## Diagramas de Arquitectura

### Proceso Principal

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

### Secuencia de Interacción

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

### Flujo de Datos

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

## Requerimientos No Funcionales

- **Rendimiento:** El sistema debe procesar archivos y validaciones en menos de 5 minutos por lote, soportando miles de registros diarios. Procesos automáticos en ventanas programadas.
- **Seguridad:** Acceso y procesos restringidos por roles; archivos por FTP seguro; APIs autenticadas; envío de errores solo a correos autorizados.
- **Fiabilidad:** Validaciones automáticas post-carga; tolerancia a fallos; reintentos; logs de auditoría.
- **Usabilidad:** Interfaz clara de monitoreo; acceso por rol; notificaciones automáticas y útiles.
- **Mantenimiento:** Ajuste fácil de estructuras y procesos; documentación y escenarios de prueba; componentes desacoplados.
- **Escalabilidad:** Adición de archivos, tablas y procesos sin rediseño; crecimiento en datos y usuarios; integración de nuevos workflows y APIs.

## Matriz de Análisis de Riesgos

| ID           | Descripción                                                                      | Probabilidad | Impacto | Nivel de Riesgo | Clasificación | Tipo de Riesgo | Recomendación                                                                                        |
|--------------|----------------------------------------------------------------------------------|--------------|---------|-----------------|---------------|----------------|------------------------------------------------------------------------------------------------------|
| Riesgo-001   | Fallo en la carga automática desde FTP por archivo faltante o corrupto           | 3            | 2       | 6               | Riesgo        | Técnico        | Implementar reintentos automáticos, validación de integridad y alertas inmediatas por correo.        |
| Riesgo-002   | Diferencias entre registros en archivo y base de datos tras la carga             | 2            | 3       | 6               | Riesgo        | Funcional      | Automatizar validaciones post-carga y notificar discrepancias para revisión y corrección.            |
| Riesgo-003   | Error en el proceso de alteración de columna route en nebula_task                | 2            | 3       | 6               | Riesgo        | Técnico        | Realizar pruebas previas y monitorear logs tras el cambio; validar tamaño de datos antes de la carga.|
| Riesgo-004   | Acceso no autorizado a datos sensibles o procesos de carga/validación            | 2            | 2       | 4               | Aceptable     | Seguridad      | Restringir acceso por roles y aplicar autenticación robusta en APIs y BD.                            |
| Riesgo-005   | Interrupción del proceso ETL en Informatica/CAWA por cambios no controlados      | 1            | 3       | 3               | Aceptable     | Técnico        | Documentar y probar todos los cambios antes de implementarlos en producción.                         |
| Riesgo-006   | Sobrecarga de la base de datos por grandes volúmenes de registros                | 1            | 2       | 2               | Aceptable     | De Datos       | Monitorear el rendimiento y escalar recursos de BD según crecimiento.                                |

## Stack Tecnológico y APIs

### Tecnologías Involucradas

- Node.js
- React
- PostgreSQL
- Informatica
- Instaleap
- FTP
- CAWA

### APIs y Eventos de Conexión

- FTP://instaleap.com/Checked_In_YYYYMMDD.txt
- SMTP://soporte@heb.com
- POST /api/checkin
- GET /api/checkin/status
- SMTP://sefulfillment@hebmex.com
