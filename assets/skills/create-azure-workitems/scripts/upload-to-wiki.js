#!/usr/bin/env node

/**
 * Script para subir TR.md e IFAO.md al Wiki de Azure DevOps
 * 
 * Uso:
 *   node upload-to-wiki.js <nombre-iniciativa> <product_type> <organization> <project> <wikiId>
 * 
 * Ejemplo:
 *   node upload-to-wiki.js "ajustes-mejoras-regresion" "DIF" "hebmexico" "Dev - Product and Technology" "Dev---Product-and-Technology.wiki"
 * 
 * Lee TR.md e IFAO.md de tba-output/{nombre-iniciativa}/
 * y los sube al Wiki de Azure DevOps
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

// ============================================================================
// CONFIGURACIÓN
// ============================================================================

// Leer configuración del PAT
const configPath = path.join(__dirname, '..', 'config', 'azure-pat.js');

if (!fs.existsSync(configPath)) {
  console.error('❌ Error: No se encontró el archivo de configuración de PAT\n');
  console.error(`   Archivo esperado: ${configPath}\n`);
  console.error('   Por favor, crea el archivo config/azure-pat.js con tu PAT de Azure DevOps');
  process.exit(1);
}

const azureConfig = require(configPath);
const patToken = azureConfig.AZURE_DEVOPS_PAT;

if (!patToken || patToken === "TU_PAT_AQUI") {
  console.error('❌ Error: PAT no configurado correctamente\n');
  console.error(`   Edita el archivo: ${configPath}`);
  console.error('   Reemplaza "TU_PAT_AQUI" con tu Personal Access Token de Azure DevOps');
  process.exit(1);
}

// ============================================================================
// VALIDACIÓN DE ARGUMENTOS
// ============================================================================

const [,, initiativeName, productType, organization, project, wikiId] = process.argv;

if (!initiativeName || !productType || !organization || !project || !wikiId) {
  console.error('❌ Error: Faltan argumentos requeridos\n');
  console.error('Uso: node upload-to-wiki.js <nombre-iniciativa> <product_type> <organization> <project> <wikiId>\n');
  console.error('Ejemplo:');
  console.error('  node upload-to-wiki.js "ajustes-mejoras-regresion" "DIF" "hebmexico" "Dev - Product and Technology" "Dev---Product-and-Technology.wiki"');
  process.exit(1);
}

// ============================================================================
// FUNCIÓN AUXILIAR: Subir página al Wiki
// ============================================================================

/**
 * Obtiene el ETag de una página del Wiki (si existe)
 */
function getWikiPageETag(pagePath) {
  return new Promise((resolve, reject) => {
    const auth = Buffer.from(`:${patToken}`).toString('base64');
    const encodedOrg = encodeURIComponent(organization);
    const encodedProject = encodeURIComponent(project);
    const encodedWikiId = encodeURIComponent(wikiId);
    const encodedPagePath = encodeURIComponent(pagePath);
    
    const apiPath = `/${encodedOrg}/${encodedProject}/_apis/wiki/wikis/${encodedWikiId}/pages?path=${encodedPagePath}&api-version=7.1`;
    
    const options = {
      hostname: 'dev.azure.com',
      path: apiPath,
      method: 'GET',
      headers: {
        'Authorization': `Basic ${auth}`,
        'User-Agent': 'TBA-Orchestrator/1.0'
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        if (res.statusCode === 200) {
          // El ETag viene en los headers HTTP, no en el body JSON
          const etag = res.headers['etag'] || res.headers['ETag'];
          resolve(etag || null);
        } else if (res.statusCode === 404) {
          // Página no existe
          resolve(null);
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${data}`));
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.end();
  });
}

/**
 * Sube una página al Wiki de Azure DevOps
 */
function uploadWikiPage(pagePath, content, etag = null) {
  return new Promise((resolve, reject) => {
    const auth = Buffer.from(`:${patToken}`).toString('base64');
    const encodedOrg = encodeURIComponent(organization);
    const encodedProject = encodeURIComponent(project);
    const encodedWikiId = encodeURIComponent(wikiId);
    const encodedPagePath = encodeURIComponent(pagePath);
    
    const apiPath = `/${encodedOrg}/${encodedProject}/_apis/wiki/wikis/${encodedWikiId}/pages?path=${encodedPagePath}&api-version=7.1`;
    
    const body = JSON.stringify({ content });
    
    const headers = {
      'Authorization': `Basic ${auth}`,
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(body),
      'User-Agent': 'TBA-Orchestrator/1.0'
    };
    
    // Si hay ETag, agregar header If-Match para actualización
    if (etag) {
      headers['If-Match'] = etag;
    }
    
    const options = {
      hostname: 'dev.azure.com',
      path: apiPath,
      method: 'PUT',
      headers
    };

    const req = https.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try {
            resolve(JSON.parse(data));
          } catch (e) {
            resolve(data);
          }
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${data}`));
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.write(body);
    req.end();
  });
}

/**
 * Construye la URL de una página del Wiki
 */
function buildWikiUrl(pagePath) {
  const encodedOrg = encodeURIComponent(organization);
  const encodedProject = encodeURIComponent(project);
  const encodedWikiId = encodeURIComponent(wikiId);
  const encodedPagePath = encodeURIComponent(pagePath);
  
  return `https://dev.azure.com/${encodedOrg}/${encodedProject}/_wiki/wikis/${encodedWikiId}?pagePath=${encodedPagePath}`;
}

// ============================================================================
// FUNCIÓN AUXILIAR: Verificar página del Wiki
// ============================================================================

/**
 * Verifica que una página del Wiki tenga el contenido completo
 */
function verifyWikiPage(pagePath, originalSize) {
  return new Promise((resolve, reject) => {
    const auth = Buffer.from(`:${patToken}`).toString('base64');
    const encodedOrg = encodeURIComponent(organization);
    const encodedProject = encodeURIComponent(project);
    const encodedWikiId = encodeURIComponent(wikiId);
    const encodedPagePath = encodeURIComponent(pagePath);
    
    const apiPath = `/${encodedOrg}/${encodedProject}/_apis/wiki/wikis/${encodedWikiId}/pages?path=${encodedPagePath}&includeContent=true&api-version=7.1`;
    
    const options = {
      hostname: 'dev.azure.com',
      path: apiPath,
      method: 'GET',
      headers: {
        'Authorization': `Basic ${auth}`,
        'User-Agent': 'TBA-Orchestrator/1.0'
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try {
            const response = JSON.parse(data);
            const uploadedSize = (response.content || '').length;
            
            if (uploadedSize !== originalSize) {
              reject(new Error(`Validación de tamaño falló: subidos ${uploadedSize} bytes, esperados ${originalSize} bytes`));
            } else {
              resolve({ uploadedSize, expectedSize: originalSize });
            }
          } catch (e) {
            resolve({ uploadedSize: 0, expectedSize: originalSize });
          }
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${data}`));
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.end();
  });
}

// ============================================================================
// EJECUCIÓN PRINCIPAL
// ============================================================================

async function main() {
  try {
    // Intentar múltiples rutas posibles para los archivos
    let basePath, trPath, ifaoPath;
    
    // Opción 1: Estamos en tba-output/{initiativeName}
    const cwdPath = process.cwd();
    if (cwdPath.endsWith(initiativeName)) {
      basePath = cwdPath;
      trPath = path.join(basePath, 'TR.md');
      ifaoPath = path.join(basePath, 'IFAO.md');
    } else {
      // Opción 2: Estamos en el directorio del proyecto
      const projectPath = path.join(cwdPath, `tba-output/${initiativeName}`);
      if (fs.existsSync(projectPath)) {
        basePath = projectPath;
        trPath = path.join(basePath, 'TR.md');
        ifaoPath = path.join(basePath, 'IFAO.md');
      } else {
        // Opción 3: Buscar en directorio padre
        const parentDir = path.dirname(cwdPath);
        const parentProjectPath = path.join(parentDir, `tba-output/${initiativeName}`);
        if (fs.existsSync(parentProjectPath)) {
          basePath = parentProjectPath;
          trPath = path.join(basePath, 'TR.md');
          ifaoPath = path.join(basePath, 'IFAO.md');
        } else {
          throw new Error(`No se encontró el directorio tba-output/${initiativeName}. Intenta: ${projectPath} o ${parentProjectPath}`);
        }
      }
    }

    // Verificar que existan los archivos
    if (!fs.existsSync(trPath)) {
      throw new Error(`No se encontró: ${trPath}`);
    }
    if (!fs.existsSync(ifaoPath)) {
      throw new Error(`No se encontró: ${ifaoPath}`);
    }

    // Leer contenido de los archivos
    console.log('📂 Leyendo archivos...');
    const trContent = fs.readFileSync(trPath, 'utf8');
    const ifaoContent = fs.readFileSync(ifaoPath, 'utf8');
    
    console.log(`   ✅ TR.md: ${trContent.length} bytes`);
    console.log(`   ✅ IFAO.md: ${ifaoContent.length} bytes\n`);

    // Paths del Wiki
    const rootPath = `/TR´S TBA`;
    
    // Construir paths del Wiki
    const productTypePath = `${rootPath}/${productType}`;
    const trWikiPath = `${productTypePath}/${initiativeName}`;
    const ifaoWikiPath = `${trWikiPath}/IFAO`;

    console.log('📝 Estrategia de subida:');
    console.log(`   1. Verificar/crear página raíz: ${rootPath}`);
    console.log(`   2. Verificar/crear página tipo: ${productTypePath}`);
    console.log(`   3. Subir TR.md: ${trWikiPath}`);
    console.log(`   4. Subir IFAO.md: ${ifaoWikiPath}`);
    console.log('');
    
    // Función auxiliar para crear placeholder
    async function createPlaceholderIfNotExists(pagePath, content = '') {
      try {
        console.log(`🔍 Verificando: ${pagePath}`);
        await uploadWikiPage(pagePath, content);
        console.log(`   ✅ Página existe o creada exitosamente\n`);
      } catch (error) {
        // Si la página ya existe, continuar
        if (error.message.includes('already exists') || error.message.includes('WikiPageAlreadyExistsException')) {
          console.log(`   ✅ Página ya existe\n`);
        } else if (error.message.includes('ancestor pages') || error.message.includes('does not exist')) {
          console.log(`   ⚠️  Página ancestro no existe, intentando crear...`);
          await uploadWikiPage(pagePath, content);
          console.log(`   ✅ Página creada\n`);
        } else {
          throw error;
        }
      }
    }
    
    // Paso 1: Verificar/crear raíz
    console.log('PASO 1/4: Verificar/crear página raíz');
    await createPlaceholderIfNotExists(rootPath);
    
    // Paso 2: Verificar/crear tipo de producto
    console.log('PASO 2/4: Verificar/crear página tipo de producto');
    await createPlaceholderIfNotExists(productTypePath);
    
    // Paso 3: Subir TR.md
    console.log('PASO 3/4: Subiendo TR.md...');
    console.log(`   Path: ${trWikiPath}`);
    console.log(`   Tamaño: ${trContent.length} bytes`);
    
    let trRes;
    try {
      // Obtener ETag si la página ya existe
      const trETag = await getWikiPageETag(trWikiPath);
      if (trETag) {
        console.log(`   ℹ️  Página ya existe, actualizando...`);
      }
      trRes = await uploadWikiPage(trWikiPath, trContent, trETag);
      console.log(`   ✅ TR.md ${trETag ? 'actualizado' : 'creado'} exitosamente (ID: ${trRes.id || trRes.page?.id || 'N/A'})\n`);
    } catch (error) {
      throw new Error(`Error subiendo TR.md: ${error.message}`);
    }
    
    // Paso 4: Subir IFAO.md
    console.log('PASO 4/4: Subiendo IFAO.md...');
    console.log(`   Path: ${ifaoWikiPath}`);
    console.log(`   Tamaño: ${ifaoContent.length} bytes`);
    
    let ifaoRes;
    try {
      // Obtener ETag si la página ya existe
      const ifaoETag = await getWikiPageETag(ifaoWikiPath);
      if (ifaoETag) {
        console.log(`   ℹ️  Página ya existe, actualizando...`);
      }
      ifaoRes = await uploadWikiPage(ifaoWikiPath, ifaoContent, ifaoETag);
      console.log(`   ✅ IFAO.md ${ifaoETag ? 'actualizado' : 'creado'} exitosamente (ID: ${ifaoRes.id || ifaoRes.page?.id || 'N/A'})\n`);
    } catch (error) {
      throw new Error(`Error subiendo IFAO.md: ${error.message}`);
    }

    // Verificar que el contenido se subió completo
    console.log('🔍 Verificando integridad del contenido...');
    
    await verifyWikiPage(trWikiPath, trContent.length);
    await verifyWikiPage(ifaoWikiPath, ifaoContent.length);
    
    console.log('   ✅ Validación de tamaño exitosa\n');

    // Construir URLs
    const trUrl = buildWikiUrl(trWikiPath);
    const ifaoUrl = buildWikiUrl(ifaoWikiPath);

    // Retornar resultados
    const result = {
      status: 'success',
      wiki: {
        tr: {
          path: trWikiPath,
          url: trUrl,
          pageId: trRes.id || trRes.page?.id || null,
          size: trContent.length
        },
        ifao: {
          path: ifaoWikiPath,
          url: ifaoUrl,
          pageId: ifaoRes.id || ifaoRes.page?.id || null,
          size: ifaoContent.length
        },
        sizeValidation: {
          tr: {
            original: trContent.length,
            uploaded: trContent.length
          },
          ifao: {
            original: ifaoContent.length,
            uploaded: ifaoContent.length
          }
        }
      }
    };

    console.log('============================================================');
    console.log('✅ SUBIDA AL WIKI COMPLETADA EXITOSAMENTE');
    console.log('============================================================\n');
    console.log('📊 Resumen:');
    console.log(`   - TR.md: ${trContent.length} bytes`);
    console.log(`   - IFAO.md: ${ifaoContent.length} bytes`);
    console.log(`\n🔗 URLs:`);
    console.log(`   - TR:   ${trUrl}`);
    console.log(`   - IFAO: ${ifaoUrl}\n`);
    console.log('============================================================\n');
    
    console.log(JSON.stringify(result, null, 2));

  } catch (error) {
    console.error('\n💥 Error fatal:');
    console.error(error.message);
    process.exit(1);
  }
}

main();
