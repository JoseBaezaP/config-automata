# Solución de Problemas - Create Azure Work Items

## Error: "WikiAncestorPageNotFoundException: One or more ancestor pages does not exist"

**Síntoma:** Azure DevOps rechaza la creación de una página Wiki porque no existen los ancestros.

**Causa Raíz:** Intentar crear una página hija sin crear primero la página padre.

**Estructura correcta del Wiki:**

```
/TR´S TBA/{product_type}/{nombre_iniciativa}     ← Página padre (TR.md)
  ├── (contenido del TR.md)
  ├── IFAO/                                       ← Página hija (IFAO.md)
      └── (contenido del IFAO.md)
```

**Ejemplo correcto:**

```javascript
// ✅ CORRECTO - PASO 1: Obtener configuración
// Leer config relativa al directorio del skill
const productosConfig = JSON.parse(readFile('./config/productos.json'));
const productConfig = productosConfig[projectKey];
const areaPath = productConfig.area_path; // "Dev - Product and Technology\\Fulfillment IMS"
```

**Validacion:**

- El area valida SIEMPRE tiene backslash doble (`\\`)
- Ver formato en `config/productos.json` y revisar el campo `area_path`

## Error: Wiki truncado o con mensajes de "contenido continúa..."

**Síntoma:** La página Wiki no tiene todo el contenido o tiene placeholders.

**Solución:**

- Asegúrate de usar `read(filePath, limit: 999999)` para leer todo el archivo
- Si el archivo tiene >2000 líneas, usa `offset` para leer en chunks y concatenar
- **NUNCA agregues mensajes adicionales** al contenido leído

**Ejemplo correcto:**

```javascript
const content = read('tba-output/TR.md', { limit: 999999 });
await createOrUpdatePage({ content }); // Subir tal cual
```

## Error: Work items creados pero sin vínculos

**Síntoma:** Los work items existen pero no están vinculados en la jerarquía.

**Solución:**

- El script Node.js maneja automáticamente los vínculos
- Si fallan algunos, revisa los logs del script para ver qué vínculos fallaron
- Puedes vincular manualmente con `azure-devops-mcp_wit_work_items_link`

## Error: Campo areaPath undefined

**Síntoma:** El campo `areaPath` es `undefined` al crear work items.

**Causa Raíz:** Nombre de campo equivocado en `productos.json`.

**Solución:**

- El campo en `productos.json` es `area_path` (guión bajo), no `areaPath`
- Mapea correctamente: `const areaPath = productConfig.area_path;`

**Ver ejemplo completo en:** `examples/config-validation.js`

## Error: areaPath = nombre del proyecto

**Síntoma:** `areaPath` es "Dev - Product and Technology" en lugar de "Dev - Product and Technology\\Fulfillment IMS".

**Causa Raíz:** Usar `tba_proyecto` en lugar de `area_path`.

**Solución:**

```javascript
// ❌ INCORRECTO
const areaPath = productConfig.tba_proyecto; // Nombre del proyecto

// ✅ CORRECTO
const areaPath = productConfig.area_path; // Área específica
```

## Debugging: Verificar áreas disponibles en Azure

Para ver qué áreas están disponibles en tu proyecto:

```bash
node -e 'const https=require("https");const auth=Buffer.from(":"+process.env.AZURE_PAT).toString("base64");https.get({hostname:"dev.azure.com",path:"/hebmexico/Dev%20-%20Product%20and%20Technology/_apis/wit/classificationnodes/areas?$depth=6&api-version=7.1",headers:{Authorization:"Basic "+auth}}},res=>{res.on("data",d=>console.log(d.toString()));res.on("end",()=>process.exit(0))}'
```

## Debugging: Loguear valores intermedios

Si tienes problemas con el mapeo de campos, agrega logs:

```javascript
console.log('projectKey:', projectKey);
console.log('productConfig.area_path:', productConfig.area_path);
console.log('areaPath final:', areaPath);
```
