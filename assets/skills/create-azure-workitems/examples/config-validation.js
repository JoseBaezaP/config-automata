// Ejemplo de lectura correcta de configuración desde productos.json

// ✅ CORRECTO - Paso 1: Obtener configuración del producto
// Ruta relativa desde el skill directory
const productosConfig = JSON.parse(
  readFile('./config/productos.json')  // Relativo al directorio del skill
);

// ✅ CORRECTO - Paso 2: Usar projectKey para acceder al producto
const productConfig = productosConfig[projectKey];  // ← CRÍTICO: projectKey, NO productName

// ✅ CORRECTO - Paso 3: Leer campos con nombres correctos (guión bajo)
const areaPath = productConfig.area_path;          // "Dev - Product and Technology\\Fulfillment IMS"
const tbaProyecto = productConfig.tba_proyecto;  // "Dev - Product and Technology"
const productType = productConfig.product_type;      // "DIF"
const wikiId = productConfig.wiki_id;
const organizacion = productConfig.organizacion;

// ✅ CORRECTO - Paso 4: Validar que no sea undefined
if (!areaPath) {
  throw new Error(`areaPath vacío. Debe venir de productos.json.area_path, no usar la clave del producto "${projectKey}"`);
}

// ✅ CORRECTO - Paso 5: Validar que tenga backslash doble
if (!areaPath.includes('\\')) {
  throw new Error(`areaPath no tiene backslash doble (\\): "${areaPath}". Un área válida SIEMPRE tiene backslash doble.`);
}

// ❌ ERROR CRÍTICO - ESTO CAUSA EL PROBLEMA EN AZURE DEVOPS
// ¡PROBLEMA! NO se obtiene productConfig, se usa directamente productKey
const datosGeneralesErroneos = {
  areaPath: productKey, // ← productKey = "Fulfillment" (NO ES UN ÁREA VÁLIDA)
};

// ❌ INCORRECTO - Intentar leer campo sin obtener productConfig primero
const datosGeneralesErroneos2 = {
  areaPath: productConfig.areaPath,  // ← ¡ERROR! productConfig no existe o es undefined
};

// ❌ INCORRECTO - Usar nombre de campo equivocado
const datosGeneralesErroneos3 = {
  areaPath: productConfig.areaPath,  // ← ¡WRONG! El campo es area_path con guión bajo
};

// Estructura de productos.json:
/*
{
  "Fulfillment": {
    "area_path": "Dev - Product and Technology\\Fulfillment IMS",
    "tba_proyecto": "Dev - Product and Technology",
    "product_type": "DIF",
    "wiki_id": "Dev---Product-and-Technology.wiki",
    "organizacion": "hebmexico"
  }
}
*/
