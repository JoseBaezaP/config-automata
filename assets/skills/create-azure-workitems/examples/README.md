# Ejemplos - Create Azure Work Items

Este directorio contiene ejemplos de archivos de configuración y plantillas para la creación de work items en Azure DevOps.

## Archivos Disponibles

### config-validation.js
Ejemplo de lectura correcta de configuración desde `productos.json`.

Ver este archivo para aprender cómo:
- Leer `productos.json` correctamente
- Mapear campos con guión bajo (`area_path`) a variables (`areaPath`)
- Validar que `areaPath` tenga el formato correcto con backslash doble

### HUs-batch.json
Plantilla de ejemplo de archivo HUs_batch.json requerido por `create-work-items-batch.js`.

Estructura:
- `DatosGenerales`: Configuración general del Epic y Feature
- `HistoriasDeUsuario`: Array de User Stories con sus Tasks

### troubleshooting.md
Documentación de errores comunes y soluciones.

Errores cubiertos:
- WikiAncestorPageNotFoundException
- Error: Script Node.js no encuentra el PAT
- Error: "HTTP 401 Unauthorized"
- Error: areaPath inválido
- Y más...

## Scripts Auxiliares

> **Nota:** Los scripts auxiliares (`transform-hus-to-batch.js`, `create-work-items-batch.js`) están en el directorio `../scripts/`.

### transform-hus-to-batch.js (ubicado en `scripts/`)

Transforma el formato HUs.json generado por @hu-generator al formato HUs_batch.json requerido por create-work-items-batch.js.

#### Uso

```bash
cd tba-output/{nombre_iniciativa}/
node $HOME/.config/opencode/skills/create-azure-workitems/scripts/transform-hus-to-batch.js
```

Ver documentación completa en: `scripts/README.md`

