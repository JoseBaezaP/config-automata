---
name: analyze-initiative
description: Analiza iniciativas de negocio en formato PDF, Markdown (.md) o texto plano, detectando requerimientos y generando estructura JSON con agrupacion logica y escenarios de prueba Gherkin (Dado/Cuando/Entonces). Desencadenar cuando el usuario proporciona un PRD, archivo .md con una iniciativa, pega texto con requerimientos, o pide analizar/procesar una iniciativa. Tambien al inicio del flujo Automata.
---

# Analyze Initiative

Extrae requerimientos de una iniciativa de negocio y genera `iniciativa.json` con agrupacion logica y escenarios de prueba Gherkin para que los skills downstream (`plan-implementation`, `generate-requirements`, etc.) puedan consumirlo.

## Formatos de entrada soportados

### PDF
PRD de Product Owners en formato PDF. Extraer texto, tablas, criterios de aceptacion y reglas de negocio.

### Markdown (.md)
Estructura tipica con encabezados `##` para secciones y `###` para cambios individuales. Puede incluir bloques "Como/Quiero/Para", criterios numerados y prioridades (MUST/SHOULD/COULD).

### Texto plano
Texto pegado en el chat o archivo .txt. Secciones marcadas con ":", separadores (`---`), o encabezados informales.

No importa el formato — el objetivo es el mismo: identificar cada requerimiento y generar escenarios de prueba.

## Proceso

### Paso 1: Obtener la entrada

- Si el usuario da una ruta de archivo (PDF/MD) -> leerlo con Read
- Si el usuario pega texto -> usarlo directamente
- Preguntar el **nombre de la iniciativa** si no es evidente del contenido

### Paso 2: Extraer elementos

Leer el contenido completo y extraer cada cambio/requerimiento como un elemento. Para cada uno, capturar:

| Campo | Requerido | Descripcion |
|-------|-----------|-------------|
| `id` | Si | Numero secuencial (1, 2, 3...) |
| `titulo` | Si | Titulo descriptivo del cambio |
| `descripcion` | Si | Formato "Como [rol] / Quiero [accion] / Para [objetivo]" si existe, o descripcion libre |
| `criteriosAceptacion` | Si | Lista de criterios tal como aparecen en el PRD |
| `notas` | No | Notas generales |
| `notasTecnicas` | No | Detalles tecnicos de implementacion (endpoints, APIs, formatos) |
| `reglasNegocio` | No | Reglas de negocio especificas |
| `prioridad` | No | MUST / SHOULD / COULD |

**Como identificar elementos:**
- En PDF: tablas de requerimientos, secciones con User Stories, criterios de aceptacion
- En Markdown: cada `###` suele ser un elemento; bloques "Como/Quiero/Para" marcan elementos distintos
- En texto plano: bullets o bloques separados por lineas vacias
- Si un elemento tiene ID existente (ej: "ST32"), preservarlo en el titulo

### Paso 3: Agrupar elementos

Cada grupo se convertira en **una User Story**, asi que debe representar una unidad funcional coherente. Agrupar segun estos criterios (de mayor a menor confianza):

| Criterio | Confianza | Ejemplo |
|----------|-----------|---------|
| Seccion explicita (`##` o tabla nombrada) | 0.90-0.95 | Todos los elementos bajo "Busqueda por CP" |
| Mismo modulo o pantalla | 0.80-0.90 | Elementos que afectan la misma vista |
| Proximidad y relacion funcional | 0.70-0.80 | Cambios consecutivos del mismo flujo |
| Relacion semantica | 0.60-0.70 | Comparten conceptos pero estan separados |

### Paso 4: Generar escenarios de prueba Gherkin

Para cada grupo, generar escenarios de prueba en formato Gherkin (Dado/Cuando/Entonces en espanol). Los escenarios se derivan de:

1. **Criterios de aceptacion** de los elementos del grupo
2. **Reglas de negocio** especificas
3. **Edge cases** inferidos (errores, estados vacios, limites)

**Reglas de generacion:**
- **Minimo obligatorio**: 1 happy-path + 1 edge-case por grupo
- **Tipos de escenario**: `happy-path`, `edge-case`, `error`, `boundary`
- **Formato Gherkin**: `Dado que... Cuando... Entonces...` (en espanol)
- **Cada escenario debe ser verificable**: No usar terminos vagos como "funciona correctamente"
- **Cubrir reglas de negocio**: Cada regla de negocio deberia tener al menos 1 escenario

**Ejemplo de generacion desde criterios:**

Criterio: "Si existe al menos una tienda activa con cobertura para el CP, se muestra la tienda asignada"
```
Escenario: Busqueda exitosa con tienda activa
Dado que existe una tienda activa con cobertura para el CP 25280
Cuando el usuario ingresa el CP 25280 y presiona buscar
Entonces se muestra la informacion de la tienda asignada con nombre, direccion y servicios
```

Regla de negocio: "En caso de que un CP se encuentre en 2 tiendas, mostrar las 2"
```
Escenario: CP con cobertura en multiples tiendas
Dado que existen 2 tiendas activas con cobertura para el CP 25280
Cuando el usuario busca por ese CP
Entonces se muestran ambas tiendas en paneles separados con su mapa correspondiente
```

Edge case inferido:
```
Escenario: CP con formato invalido
Dado que el usuario esta en la pantalla de busqueda
Cuando ingresa un CP con letras "ABC12"
Entonces se muestra un error de formato indicando que debe ser 5 digitos numericos
```

### Paso 5: Presentar propuesta al usuario

Mostrar los grupos detectados con sus escenarios y pedir confirmacion:

```
Se detectaron N grupos logicos:

GRUPO-001: "Busqueda por CP"
  Confianza: 95% | Escenarios: 4 (2 happy, 1 edge, 1 error)
  └─ 1. Busqueda por codigo postal
  └─ 2. Reintento sin recarga

  Escenarios de prueba:
  - [happy-path] Busqueda exitosa con 1 tienda
  - [happy-path] CP con 2 tiendas muestra ambas
  - [edge-case] CP sin cobertura muestra mensaje
  - [error] CP con formato invalido

GRUPO-002: "Visualizar tienda en mapa"
  Confianza: 90% | Escenarios: 3 (1 happy, 1 edge, 1 error)
  └─ 3. Mostrar mapa con ubicacion

Opciones:
1. Aceptar todos los grupos y escenarios
2. Modificar agrupaciones
3. Agregar/quitar escenarios de prueba
4. Usar ratio 1:1 (cada elemento = 1 grupo)
```

Esperar decision del usuario antes de generar el JSON.

### Paso 6: Generar y guardar JSON

1. Normalizar el nombre: minusculas, guiones en vez de espacios, sin acentos
2. Crear directorio: `tba-output/{nombre-normalizado}/`
3. Guardar: `tba-output/{nombre-normalizado}/iniciativa.json`
4. Confirmar con resumen: ruta, elementos, grupos, escenarios totales

## Estructura del JSON de salida

```json
{
  "nombreIniciativa": "consulta-tienda-por-cp",
  "formatoEntrada": "PDF | MARKDOWN | TEXTO_PLANO",
  "grupos": [
    {
      "id": "GRUPO-001",
      "nombre": "Busqueda de tienda por codigo postal",
      "descripcion": "Permitir buscar tiendas por CP mostrando nombre, direccion, servicios y mapa",
      "elementos": [1, 2],
      "confianza": 0.95,
      "aprobado": true,
      "escenariosPrueba": [
        {
          "id": "ESC-001",
          "titulo": "Busqueda exitosa con 1 tienda activa",
          "tipo": "happy-path",
          "gherkin": "Dado que existe una tienda activa con cobertura para el CP 25280\nCuando el usuario ingresa el CP y presiona buscar\nEntonces se muestra la tienda con nombre, direccion, servicios y ubicacion en mapa"
        },
        {
          "id": "ESC-002",
          "titulo": "CP con cobertura en 2 tiendas",
          "tipo": "happy-path",
          "gherkin": "Dado que existen 2 tiendas activas con cobertura para el mismo CP\nCuando el usuario busca por ese CP\nEntonces se muestran ambas tiendas en paneles separados con su mapa correspondiente"
        },
        {
          "id": "ESC-003",
          "titulo": "CP sin cobertura",
          "tipo": "edge-case",
          "gherkin": "Dado que no existe ninguna tienda activa con cobertura para el CP ingresado\nCuando el usuario busca por ese CP\nEntonces se muestra el estado 'No existe tienda que atienda este CP' con recomendacion"
        },
        {
          "id": "ESC-004",
          "titulo": "CP con formato invalido",
          "tipo": "error",
          "gherkin": "Dado que el usuario esta en la pantalla de busqueda\nCuando ingresa un CP con menos de 5 digitos o con caracteres no numericos\nEntonces se muestra un error de formato"
        }
      ]
    }
  ],
  "elementos": [
    {
      "id": 1,
      "titulo": "Busqueda por CP",
      "descripcion": "Como liveops\nQuiero ingresar un CP\nPara conocer la tienda que atiende un determinado codigo postal",
      "criteriosAceptacion": "1. Si existe al menos una tienda activa con cobertura para el CP, se muestra la tienda asignada.\n2. Si no existe cobertura, mostrar estado 'No existe tienda que atienda este CP'.\n3. El mapa centra un marcador en las coordenadas de la tienda.\n4. La direccion se muestra como: Calle + Numero, Colonia, Ciudad, Estado.\n5. Los servicios disponibles se presentan como etiquetas (Delivery / Pick Up).",
      "notas": "",
      "notasTecnicas": "Endpoint GET /stores?zipCode=XXXXX. Respuesta incluye: active, deliveryType, location.geoCoordinates, zipCodeCoverage",
      "reglasNegocio": "RN1: Formato CP 5 digitos numericos, permitir ceros a la izquierda.\nRN2: Excluir tiendas con active=false.\nRN3: Cobertura = CP esta en zipCodeCoverage.\nRN4: Mostrar deliveryType disponibles.",
      "prioridad": "MUST"
    }
  ]
}
```

### Campos criticos para compatibilidad downstream

- **`grupos[].elementos`**: Array de IDs numericos que referencian `elementos[].id`
- **`grupos[].confianza`**: Numero entre 0 y 1 (no porcentaje)
- **`grupos[].aprobado`**: `true` para grupos aceptados, `false` para rechazados
- **`grupos[].escenariosPrueba`**: Array de escenarios Gherkin (NUEVO, obligatorio)
- **`escenariosPrueba[].tipo`**: `happy-path | edge-case | error | boundary`
- **`elementos[].id`**: Numero secuencial empezando en 1
- **`elementos[].titulo`**, **`descripcion`**, **`criteriosAceptacion`**: Siempre presentes, nunca vacios

## Validaciones antes de guardar

- Al menos 1 elemento extraido
- Todos los elementos tienen `id`, `titulo`, `descripcion`, `criteriosAceptacion`
- Los IDs en `grupos[].elementos` corresponden a elementos existentes
- El JSON es valido y parseable
- Al menos 1 grupo con `aprobado: true`
- Cada grupo aprobado tiene al menos 2 escenarios (1 happy + 1 edge)
- Cada escenario tiene `id`, `titulo`, `tipo`, `gherkin` no vacios

Si algo falla, informar al usuario que esta mal y como corregirlo.

## Conexion con otros skills

```
[Usuario] → PRD (PDF/MD/texto)
       ↓
  analyze-initiative → tba-output/{nombre}/iniciativa.json
       ↓
  detect-architecture → tba-output/{nombre}/architecture-constraints.json
       ↓
  plan-implementation → tba-output/{nombre}/implementation-plan.json
       ↓
  generate-requirements / generate-wiki / generate-ifao / create-azure-workitems
```
