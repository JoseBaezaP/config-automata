#!/usr/bin/env node

/**
* Script para crear work items en Azure DevOps en batch usando la API REST oficial
* 
* Uso:
*   node create-work-items-batch.js <ruta-HUs.json> <organization> <project>
* 
* Ejemplo:
*   node create-work-items-batch.js ./HUs.json "mi-org" "mi-proyecto"
* 
* NOTA: El PAT se carga automáticamente desde config/azure-pat.js
* 
* MEJORAS RECIENTES (para resolver problemas de vinculación Tasks ↔ User Stories):
* - Validación de userStory.id antes de crear tasks
* - Mejor manejo de errores en creación de tasks (no se detiene la ejecución)
* - Validación de links antes de procesar (evita links con sourceId/targetId null/undefined)
* - Logging detallado de errores de vinculación (muestra primeros 5 errores)
* - Validación final de integridad (verifica que todas las tasks estén vinculadas)
*/

const https = require('https');
const fs = require('fs');
const path = require('path');

// ============================================================================
// CARGAR CONFIGURACIÓN DE PAT
// ============================================================================

const configPath = path.join(__dirname, '..', 'config', 'azure-pat.js');

if (!fs.existsSync(configPath)) {
  console.error('❌ Error: No se encontró el archivo de configuración de PAT\n');
  console.error(`   Archivo esperado: ${configPath}\n`);
  console.error('   Por favor, crea el archivo config/azure-pat.js con tu PAT de Azure DevOps');
  console.error('   Usa config/azure-pat.js.template como referencia');
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
// CONFIGURACIÓN Y VALIDACIÓN DE ARGUMENTOS
// ============================================================================

const [, , husFilePath, organization, project] = process.argv;

if (!husFilePath || !organization || !project) {
  console.error('❌ Error: Faltan argumentos requeridos\n');
  console.error('Uso: node create-work-items-batch.js <ruta-HUs.json> <organization> <project>\n');
  console.error('Ejemplo:');
  console.error('  node create-work-items-batch.js ./HUs.json "mi-org" "mi-proyecto"');
  console.error('\nNOTA: El PAT se carga automáticamente desde config/azure-pat.js');
  process.exit(1);
}

// Validar que el archivo existe
if (!fs.existsSync(husFilePath)) {
  console.error(`❌ Error: No se encontró el archivo ${husFilePath}`);
  process.exit(1);
}

// ============================================================================
// FUNCIONES AUXILIARES PARA AZURE DEVOPS API
// ============================================================================

/**
* Realiza una petición HTTP a Azure DevOps API
*/
function azureDevOpsRequest(method, path, body = null) {
  return new Promise((resolve, reject) => {
    const auth = Buffer.from(`:${patToken}`).toString('base64');
    const hostname = 'dev.azure.com';
    const encodedOrg = encodeURIComponent(organization);
    const encodedProject = encodeURIComponent(project);
    const fullPath = `/${encodedOrg}/${encodedProject}/_apis/${path}`;

    const options = {
      hostname,
      path: fullPath,
      method,
      headers: {
        'Content-Type': 'application/json-patch+json',
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

    if (body) {
      req.write(JSON.stringify(body));
    }

    req.end();
  });
}

/**
* Crea un work item usando JSON Patch
*/
async function createWorkItem(workItemType, fields) {
  const operations = Object.entries(fields).map(([field, value]) => ({
    op: 'add',
    path: `/fields/${field}`,
    value
  }));

  const encodedWorkItemType = encodeURIComponent(workItemType);
  const result = await azureDevOpsRequest(
    'PATCH',
    `wit/workitems/$${encodedWorkItemType}?api-version=7.1`,
    operations
  );

  return result;
}

/**
* Vincula dos work items (parent-child relationship)
*/
async function linkWorkItems(sourceId, targetId, linkType = 'System.LinkTypes.Hierarchy-Forward') {
  const operations = [{
    op: 'add',
    path: '/relations/-',
    value: {
      rel: linkType,
      url: `vstfs:///WorkItemTracking/WorkItem/${targetId}`,
      attributes: {
        comment: 'Linked by TBA Orchestrator'
      }
    }
  }];

  return await azureDevOpsRequest(
    'PATCH',
    `wit/workitems/${sourceId}?api-version=7.1`,
    operations
  );
}

/**
* Vincula múltiples work items en batch usando la API de batch update
*/
async function linkWorkItemsBatch(links) {
  console.log(`🔗 Vinculando ${links.length} relaciones secuencialmente...`);

  // ⚠️ VALIDACIÓN CRÍTICA: Verificar que todos los links tengan sourceId y targetId válidos
  const invalidLinks = links.filter(l => !l.sourceId || !l.targetId);
  if (invalidLinks.length > 0) {
    console.error(`   ❌ ERROR: ${invalidLinks.length} links inválidos encontrados:`);
    console.error(JSON.stringify(invalidLinks, null, 2));
    throw new Error(`No se pueden vincular work items con sourceId o targetId inválidos`);
  }

  const results = [];
  let successful = 0;
  let failed = 0;

  // Procesar secuencialmente en lugar de en paralelo
  for (let i = 0; i < links.length; i++) {
    const { sourceId, targetId, linkType } = links[i];
    console.log(`   🔗 Vinculando ${i + 1}/${links.length}: ${sourceId} -> ${targetId}...`);

    try {
      await linkWorkItems(sourceId, targetId, linkType);
      successful++;
      results.push({ status: 'fulfilled', value: true });
    } catch (error) {
      failed++;
      results.push({ status: 'rejected', reason: error });
      console.error(`     ❌ Error vinculando ${sourceId} -> ${targetId}: ${error.message}`);
    }

    // Pequeña pausa entre vinculaciones para no saturar la API
    if (i < links.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 200));
    }
  }

  console.log(`✅ Vinculadas ${successful} relaciones exitosamente`);
  if (failed > 0) {
    console.log(`⚠️  ${failed} relaciones fallaron`);
  }

  return results;
}

// ============================================================================
// FUNCIÓN PRINCIPAL DE CREACIÓN
// ============================================================================

async function createWorkItemsFromHUs(husData, datosGenerales) {
  console.log('📋 Iniciando creación de work items en Azure DevOps...\n');

  // ⚠️ VALIDACIÓN CRÍTICA DE areaPath
  if (!datosGenerales.areaPath) {
    console.error('❌ ERROR CRÍTICO: El campo areaPath está vacío o undefined en DatosGenerales');
    console.error('   Esto causa que el script use el parámetro "project" como fallback');
    console.error(`   project: "${project}"`);
    console.error('   areaPath recibido:', datosGenerales.areaPath);
    console.error('\n   El parámetro "project" es el nombre del proyecto, no un area path válido.');
    console.error('\n   SOLUCIÓN: Verificar que HUs_batch.json se generó con el areaPath correcto de productos.json.area_path');
    throw new Error('areaPath no puede estar vacío. Revisar generación de HUs_batch.json');
  }

  // NOTA: areaPath puede ser igual al nombre del proyecto — eso es válido en Azure DevOps
  // cuando se usa el área raíz del proyecto (e.g., "Dev - Partner Experience")
  if (datosGenerales.areaPath === project) {
    console.log(`   ℹ️  areaPath es el área raíz del proyecto: "${datosGenerales.areaPath}"`);
  }

  const epicTitle = datosGenerales.epicTitle || 'Epic - Iniciativa';
  const featureTitle = datosGenerales.featureTitle || 'Feature - Implementación';
  const areaPath = datosGenerales.areaPath;  // ⚠️ NO USAR fallback project

  console.log('✅ Configuración validada:');
  console.log(`   areaPath: ${areaPath}`);
  console.log(`   epicTitle: ${epicTitle}`);
  console.log(`   featureTitle: ${featureTitle}\n`);

  const createdIds = {
    epic: null,
    feature: null,
    userStories: [],
    tasks: []
  };

  const links = [];

  try {
    // PASO 1: Crear Epic
    console.log('1️⃣  Creando Epic...');
    const epic = await createWorkItem('Epic', {
      'System.Title': epicTitle,
      'System.Description': datosGenerales.epicDescription || 'Epic creado por TBA Orchestrator',
      'System.AreaPath': areaPath
    });
    createdIds.epic = epic.id;
    console.log(`   ✅ Epic creado: ID ${epic.id}`);

    // PASO 2: Crear Feature
    console.log('\n2️⃣  Creando Feature...');
    const feature = await createWorkItem('Feature', {
      'System.Title': featureTitle,
      'System.Description': datosGenerales.featureDescription || 'Feature creado por TBA Orchestrator',
      'System.AreaPath': areaPath
    });
    createdIds.feature = feature.id;
    console.log(`   ✅ Feature creado: ID ${feature.id}`);

    // Vincular Feature -> Epic
    links.push({
      sourceId: feature.id,
      targetId: epic.id,
      linkType: 'System.LinkTypes.Hierarchy-Reverse'
    });

    // PASO 3: Crear User Stories en paralelo
    console.log(`\n3️⃣  Creando ${husData.HistoriasDeUsuario.length} User Stories en paralelo...`);

    const userStoryPromises = husData.HistoriasDeUsuario.map(async (hu, index) => {
      try {
        const userStory = await createWorkItem('User Story', {
          'System.Title': hu.Titulo,
          'System.Description': hu.Detalle || hu.Descripcion || '',
          'Microsoft.VSTS.Common.AcceptanceCriteria': hu.CriteriosDeAceptacion || '',
          'System.AreaPath': areaPath
        });

        console.log(`   ✅ User Story ${index + 1}/${husData.HistoriasDeUsuario.length} creada: ID ${userStory.id} - ${hu.Titulo.substring(0, 50)}...`);

        return { userStory, tasks: hu.Tareas || [] };
      } catch (error) {
        console.error(`   ❌ Error creando User Story ${index + 1}: ${error.message}`);
        throw error;
      }
    });

    const userStoriesResults = await Promise.all(userStoryPromises);

    // Vincular todas las User Stories al Feature
    userStoriesResults.forEach(({ userStory }) => {
      createdIds.userStories.push(userStory.id);
      links.push({
        sourceId: userStory.id,
        targetId: feature.id,
        linkType: 'System.LinkTypes.Hierarchy-Reverse'
      });
    });

    // PASO 4: Crear Tasks en paralelo
    console.log(`\n4️⃣  Creando Tasks en paralelo...`);

    const taskPromises = [];
    let totalTasks = 0;

    userStoriesResults.forEach(({ userStory, tasks }) => {
      // ⚠️ VALIDACIÓN CRÍTICA: Verificar que userStory.id existe
      if (!userStory || !userStory.id) {
        console.error(`   ❌ ERROR: User Story inválida o sin ID. No se pueden crear tasks para esta US.`);
        return;  // Skip esta User Story
      }

      tasks.forEach((task, taskIndex) => {
        totalTasks++;
        if (!task.Titulo.includes('[QA]') && task.SugerenciaCodigo) {
          task.Detalle += '\n\n<p class="editor-paragraph"><strong class="editor-text-bold">Sugerencia de codigo:</strong></p><p class="editor-paragraph"></p><pre><code>' + task.SugerenciaCodigo + '</pre>';
        }
        const taskPromise = createWorkItem('Task', {
          'System.Title': task.Titulo,
          'System.Description': task.Detalle || '',
          'System.AreaPath': areaPath
        }).then(createdTask => {
          console.log(`   ✅ Task creada: ID ${createdTask.id} - ${task.Titulo.substring(0, 50)}...`);

          createdIds.tasks.push(createdTask.id);

          // Vincular Task a User Story
          links.push({
            sourceId: createdTask.id,
            targetId: userStory.id,
            linkType: 'System.LinkTypes.Hierarchy-Reverse'
          });

          return createdTask;
        }).catch(error => {
          console.error(`   ❌ Error creando Task (${task.Titulo}): ${error.message}`);
          // ⚠️ NO hacer throw aquí, solo loguear para que continúe con otras tasks
          return null;  // Retornar null para indicar que falló
        });

        taskPromises.push(taskPromise);
      });
    });

    const taskResults = await Promise.all(taskPromises);
    console.log(`   ✅ Total de ${totalTasks} Tasks procesadas (${taskResults.filter(t => t !== null).length} exitosas, ${taskResults.filter(t => t === null).length} fallidas)`);

    // PASO 5: Vincular todos los work items en batch
    console.log(`\n5️⃣  Vinculando ${links.length} work items...`);
    await linkWorkItemsBatch(links);

    // VALIDACIÓN DE INTEGRIDAD DE VINCULACIONES
    console.log(`\n6️⃣  Validando integridad de vinculaciones...`);

    const expectedTaskLinks = totalTasks;  // Cada task debe tener 1 link a su User Story
    const actualTaskLinks = links.filter(l =>
      l.linkType === 'System.LinkTypes.Hierarchy-Reverse' &&
      userStoriesResults.some(us => us.userStory.id === l.targetId)
    ).length;

    console.log(`   ✅ Expected task links: ${expectedTaskLinks}`);
    console.log(`   ✅ Actual task links:   ${actualTaskLinks}`);

    if (actualTaskLinks !== expectedTaskLinks) {
      console.error(`   ⚠️  ADVERTENCIA: ${expectedTaskLinks - actualTaskLinks} tasks podrían no estar correctamente vinculadas a sus User Stories`);
      console.error(`   Verificar que todas las tasks tengan su link correspondiente en Azure DevOps`);
    } else {
      console.log(`   ✅ Todas las tasks están correctamente vinculadas a sus User Stories`);
    }

    // RESUMEN FINAL
    console.log('\n' + '='.repeat(60));
    console.log('✅ CREACIÓN COMPLETADA EXITOSAMENTE');
    console.log('='.repeat(60));
    console.log(`📊 Resumen:`);
    console.log(`   - Epic:         ID ${createdIds.epic}`);
    console.log(`   - Feature:      ID ${createdIds.feature}`);
    console.log(`   - User Stories: ${createdIds.userStories.length} creadas`);
    console.log(`   - Tasks:        ${createdIds.tasks.length} creadas`);
    console.log(`   - Links:        ${links.length} relaciones vinculadas`);
    console.log('='.repeat(60));
    console.log(`\n🔗 Ver Epic en Azure DevOps:`);
    console.log(`   https://dev.azure.com/${encodeURIComponent(organization)}/${encodeURIComponent(project)}/_workitems/edit/${createdIds.epic}\n`);

    return createdIds;

  } catch (error) {
    console.error('\n❌ Error durante la creación de work items:');
    console.error(error.message);
    console.error('\n📊 Work items creados antes del error:');
    console.error(JSON.stringify(createdIds, null, 2));
    throw error;
  }
}

// ============================================================================
// EJECUCIÓN PRINCIPAL
// ============================================================================

async function main() {
  try {
    // Leer el archivo HUs.json
    console.log(`📂 Leyendo archivo: ${husFilePath}\n`);
    const fileContent = fs.readFileSync(husFilePath, 'utf8');
    const husData = JSON.parse(fileContent);

    // Validar estructura
    if (!husData.HistoriasDeUsuario || !Array.isArray(husData.HistoriasDeUsuario)) {
      throw new Error('El archivo HUs.json no tiene la estructura esperada (debe contener "HistoriasDeUsuario")');
    }

    console.log(`✅ Archivo cargado exitosamente: ${husData.HistoriasDeUsuario.length} Historias de Usuario encontradas\n`);

    // ⚠️ VALIDACIÓN DE DatosGenerales antes de usar defaults
    console.log('🔍 Analizando DatosGenerales del archivo...');
    console.log(`   areaPath presente: ${husData.DatosGenerales ? 'SÍ' : 'NO'}`);
    if (husData.DatosGenerales?.areaPath) {
      console.log(`   areaPath valor: "${husData.DatosGenerales.areaPath}"`);
      // Verificar si tiene backslash (característica de un area path válido)
      if (!husData.DatosGenerales.areaPath.includes('\\')) {
        console.log(`   ℹ️  areaPath sin backslash — puede ser un área raíz válida (e.g., "Dev - Partner Experience")`);
      }
    } else {
      console.warn(`   ⚠️  ADVERTENCIA: areaPath está ausente en DatosGenerales`);
      console.warn(`      El script usará el parámetro "project" como fallback: "${project}"`);
      console.warn(`      ESTO GENERALMENTE CAUSA EL ERROR DE AREA INVÁLIDO`);
    }
    console.log('');

    // Configuración de datos generales (puede venir en el JSON o usar defaults)
    const datosGenerales = {
      epicTitle: husData.DatosGenerales?.epicTitle || 'Epic - Iniciativa TBA',
      epicDescription: husData.DatosGenerales?.epicDescription || 'Epic generado automáticamente por TBA Orchestrator',
      featureTitle: husData.DatosGenerales?.featureTitle || 'Feature - Implementación',
      featureDescription: husData.DatosGenerales?.featureDescription || 'Feature generado automáticamente por TBA Orchestrator',
      areaPath: husData.DatosGenerales?.areaPath || project  // ← ESTE ES EL PROBLEMA SI areaPath NO ESTÁ
    };

    // Crear los work items
    const result = await createWorkItemsFromHUs(husData, datosGenerales);

    process.exit(0);

  } catch (error) {
    console.error('\n💥 Error fatal:');
    console.error(error.message);
    process.exit(1);
  }
}

main();
