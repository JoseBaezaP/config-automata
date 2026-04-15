#!/usr/bin/env node

/**
 * Script auxiliar para transformar HUs.json a HUs_batch.json
 *
 * Enriquece las descripciones con datos de implementation-plan.json e
 * iniciativa.json (si existen en el mismo directorio) para que los work items
 * de Azure DevOps tengan contenido rico y formateado.
 *
 * Uso:
 *   node transform-hus-to-batch.js <directorio-tba-output>
 *
 * Ejemplo:
 *   node transform-hus-to-batch.js tba-output/ajustes-mejoras-regresion
 */

const fs = require('fs');
const path = require('path');

// ============================================================================
// VALIDACION DE ARGUMENTOS
// ============================================================================

const inputDir = process.argv[2];

if (!inputDir) {
  console.error('Error: Debes indicar el directorio donde esta HUs.json\n');
  console.error('   Uso: node transform-hus-to-batch.js <directorio>');
  console.error('   Ejemplo: node transform-hus-to-batch.js tba-output/mi-iniciativa');
  process.exit(1);
}

const outputDir = path.resolve(inputDir);

if (!fs.existsSync(outputDir)) {
  console.error(`Error: El directorio no existe: ${outputDir}`);
  process.exit(1);
}

// ============================================================================
// LECTURA DE ARCHIVOS
// ============================================================================

const husOriginalPath = path.join(outputDir, 'HUs.json');
const husBatchPath = path.join(outputDir, 'HUs_batch.json');

console.log('Leyendo HUs.json...');

if (!fs.existsSync(husOriginalPath)) {
  console.error('Error: No se encontro HUs.json');
  console.error(`   Buscando en: ${husOriginalPath}`);
  process.exit(1);
}

const husOriginal = JSON.parse(fs.readFileSync(husOriginalPath, 'utf8'));

console.log(`HUs.json cargado: ${husOriginal.HistoriasDeUsuario?.length || 0} Historias de Usuario encontradas\n`);

// ============================================================================
// CARGA OPCIONAL DE ARCHIVOS DE ENRIQUECIMIENTO
// ============================================================================

let implementationPlan = null;
let iniciativa = null;

const implPlanPath = path.join(outputDir, 'implementation-plan.json');
const iniciativaPath = path.join(outputDir, 'iniciativa.json');

if (fs.existsSync(implPlanPath)) {
  try {
    implementationPlan = JSON.parse(fs.readFileSync(implPlanPath, 'utf8'));
    console.log('  Enrichment: implementation-plan.json cargado');
  } catch (e) {
    console.warn('  Warning: No se pudo parsear implementation-plan.json, omitiendo enrichment');
  }
}

if (fs.existsSync(iniciativaPath)) {
  try {
    iniciativa = JSON.parse(fs.readFileSync(iniciativaPath, 'utf8'));
    console.log('  Enrichment: iniciativa.json cargado');
  } catch (e) {
    console.warn('  Warning: No se pudo parsear iniciativa.json, omitiendo enrichment');
  }
}

console.log('');

// ============================================================================
// FUNCIONES HTML BUILDER PARA ENRIQUECIMIENTO
// ============================================================================

/**
 * Escape HTML entities
 */
function escapeHtml(text) {
  if (!text) return '';
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/**
 * Busca el User Story correspondiente en el implementation-plan por indice
 */
function findMatchingUSInPlan(huIndex) {
  if (!implementationPlan || !implementationPlan.userStories) return null;
  if (huIndex < implementationPlan.userStories.length) {
    return implementationPlan.userStories[huIndex];
  }
  return null;
}

/**
 * Busca escenarios Gherkin en iniciativa.json por sus IDs
 */
function findGherkinScenarios(scenarioIds) {
  if (!iniciativa || !iniciativa.grupos) return [];
  const found = [];
  for (const grupo of iniciativa.grupos) {
    if (!grupo.escenariosPrueba) continue;
    for (const esc of grupo.escenariosPrueba) {
      if (scenarioIds.includes(esc.id)) {
        found.push(esc);
      }
    }
  }
  return found;
}

/**
 * Mapea tipo de tarea a capas del plan
 */
function typeToLayers(taskType) {
  switch (taskType) {
    case 'BD': return ['domain'];
    case 'INTEG': return ['infrastructure'];
    case 'BACK': return ['domain', 'infrastructure', 'application'];
    case 'FRONT': return ['presentation', 'routing', 'application'];
    case 'QA': return ['test'];
    default: return [];
  }
}

/**
 * Busca un archivo por ID en el implementation plan
 */
function findFileById(fileId) {
  if (!implementationPlan) return null;
  for (const phase of implementationPlan.implementationOrder) {
    for (const file of phase.files) {
      if (file.id === fileId) return file;
    }
  }
  return null;
}

/**
 * Busca archivos del plan que correspondan a una tarea segun US + capa
 */
function findFilesForTask(taskType, usId) {
  if (!implementationPlan || !implementationPlan.implementationOrder) return [];

  const matchingLayers = typeToLayers(taskType);
  const files = [];

  for (const phase of implementationPlan.implementationOrder) {
    for (const file of phase.files) {
      if (!file.usReference) continue;
      const refs = file.usReference.split(',').map(r => r.trim());
      const matchesUS = refs.some(r =>
        r === usId ||
        r.replace('US-', 'HU-') === usId ||
        r.replace('HU-', 'US-') === usId.replace('HU-', 'US-')
      );
      if (!matchesUS) continue;
      if (matchingLayers.includes(file.layer)) {
        files.push(file);
      }
    }
  }
  return files;
}

/**
 * Busca entradas del testPlan para un US
 */
function findTestPlanForUS(usId) {
  if (!implementationPlan || !implementationPlan.testPlan) return [];

  return implementationPlan.testPlan.filter(tp => {
    const sourceFile = findFileById(tp.sourceFile);
    if (!sourceFile || !sourceFile.usReference) return false;
    const refs = sourceFile.usReference.split(',').map(r => r.trim());
    return refs.some(r =>
      r === usId ||
      r.replace('US-', 'HU-') === usId ||
      r.replace('HU-', 'US-') === usId.replace('HU-', 'US-')
    );
  });
}

/**
 * Construye Detalle enriquecido para User Story
 */
function buildEnrichedUserStoryDetalle(hu, implPlanUS) {
  let html = '';

  // Descripcion base (ya viene en HTML desde HUs.json)
  html += '<h3>Descripcion</h3>';
  html += hu.Descripcion || '';

  // Reglas de negocio (buscar en iniciativa.json)
  if (iniciativa && implPlanUS) {
    const grupo = (iniciativa.grupos || []).find(g => g.id === implPlanUS.grupoRef);
    if (grupo) {
      const elementosConReglas = (iniciativa.elementos || [])
        .filter(e => (grupo.elementos || []).includes(e.id) && e.reglasNegocio);
      if (elementosConReglas.length > 0) {
        html += '<h3>Reglas de Negocio</h3><ul>';
        for (const elem of elementosConReglas) {
          const reglas = elem.reglasNegocio.split('\n').filter(r => r.trim());
          for (const regla of reglas) {
            html += `<li>${regla.trim()}</li>`;
          }
        }
        html += '</ul>';
      }

      // Notas tecnicas
      const elementosConNotas = (iniciativa.elementos || [])
        .filter(e => (grupo.elementos || []).includes(e.id) && e.notasTecnicas);
      if (elementosConNotas.length > 0) {
        html += '<h3>Notas Tecnicas</h3>';
        for (const elem of elementosConNotas) {
          html += `<p>${elem.notasTecnicas}</p>`;
        }
      }
    }
  }

  // Tecnologias
  const tecnologias = hu.Tecnologias || (implPlanUS && implPlanUS.tecnologias) || [];
  if (tecnologias.length > 0) {
    html += '<h3>Tecnologias</h3>';
    html += '<ul>' + tecnologias.map(t => `<li>${t}</li>`).join('') + '</ul>';
  }

  // APIs
  const apis = hu.APIsDeConexion || (implPlanUS && implPlanUS.apisInvolucradas) || [];
  if (apis.length > 0) {
    html += '<h3>APIs Involucradas</h3>';
    html += '<ul>' + apis.map(a => `<li><code>${a}</code></li>`).join('') + '</ul>';
  }

  return html;
}

/**
 * Construye CriteriosDeAceptacion enriquecidos con tabla Gherkin
 */
function buildEnrichedAcceptanceCriteria(hu, implPlanUS) {
  let html = '';

  // Criterios base
  html += hu.CriteriosDeAceptacion || '';

  // Tabla de escenarios Gherkin
  if (implPlanUS && implPlanUS.escenariosPrueba && implPlanUS.escenariosPrueba.length > 0) {
    const scenarios = findGherkinScenarios(implPlanUS.escenariosPrueba);
    if (scenarios.length > 0) {
      html += '<h3>Escenarios de Prueba (Gherkin)</h3>';
      html += '<table><tr><th>ID</th><th>Escenario</th><th>Tipo</th></tr>';
      for (const esc of scenarios) {
        html += `<tr><td>${esc.id}</td><td>${esc.titulo}</td><td>${esc.tipo}</td></tr>`;
      }
      html += '</table>';
    }
  }

  return html;
}

/**
 * Construye descripcion enriquecida para task BACK/FRONT/INTEG/BD
 */
function buildEnrichedTaskDescription(originalDetalle, matchingFiles) {
  let html = '';

  // Detalle original
  html += '<h3>Detalle</h3>';
  html += originalDetalle || '';

  if (matchingFiles.length === 0) return html;

  // Tabla de archivos
  html += '<h3>Archivos</h3>';
  html += '<table><tr><th>Archivo</th><th>Capa</th><th>Proposito</th><th>Complejidad</th></tr>';
  for (const f of matchingFiles) {
    html += `<tr><td><code>${f.path}</code></td><td>${f.layer}</td><td>${f.purpose || ''}</td><td>${f.estimatedComplexity || 'N/A'}</td></tr>`;
  }
  html += '</table>';

  // Notas de arquitectura
  const archNotes = matchingFiles.filter(f => f.architectureNotes).map(f => f.architectureNotes);
  if (archNotes.length > 0) {
    html += '<h3>Notas de Arquitectura</h3>';
    html += '<ul>' + archNotes.map(n => `<li>${n}</li>`).join('') + '</ul>';
  }

  // Dependencias
  const allDeps = [];
  for (const f of matchingFiles) {
    for (const dep of (f.dependencies || [])) {
      if (!allDeps.includes(dep)) allDeps.push(dep);
    }
  }
  if (allDeps.length > 0) {
    html += '<h3>Dependencias</h3>';
    html += '<ul>' + allDeps.map(d => `<li>${d}</li>`).join('') + '</ul>';
  }

  return html;
}

/**
 * Construye descripcion enriquecida para task QA
 */
function buildEnrichedQATaskDescription(originalDetalle, usId) {
  let html = '';

  // Detalle original
  html += '<h3>Detalle</h3>';
  html += originalDetalle || '';

  // Tabla de archivos de test desde testPlan
  const testEntries = findTestPlanForUS(usId);
  if (testEntries.length > 0) {
    html += '<h3>Archivos de Test</h3>';
    html += '<table><tr><th>Test</th><th>Archivo Fuente</th><th>Tipo</th><th>Escenarios</th></tr>';
    for (const tp of testEntries) {
      const testFileName = path.basename(tp.testFile || '');
      const scenarios = (tp.gherkinScenarios || []).join(', ');
      html += `<tr><td><code>${testFileName}</code></td><td>${tp.sourceFile || ''}</td><td>${tp.testType || 'unit'}</td><td>${scenarios}</td></tr>`;
    }
    html += '</table>';
  }

  // Escenarios Gherkin completos
  const allScenarioIds = [];
  for (const tp of testEntries) {
    for (const sid of (tp.gherkinScenarios || [])) {
      if (!allScenarioIds.includes(sid)) allScenarioIds.push(sid);
    }
  }

  if (allScenarioIds.length > 0) {
    const scenarios = findGherkinScenarios(allScenarioIds);
    if (scenarios.length > 0) {
      html += '<h3>Escenarios Gherkin</h3>';
      for (const esc of scenarios) {
        html += `<p><strong>${esc.id}: ${esc.titulo} (${esc.tipo})</strong></p>`;
        html += `<pre>${escapeHtml(esc.gherkin)}</pre>`;
      }
    }
  }

  return html;
}

/**
 * Fallback: construye Detalle combinando descripcion con info tecnica (logica original)
 */
function buildFallbackDetalle(hu) {
  let detalle = hu.Descripcion || '';

  if (hu.Tecnologias || hu.APIsDeConexion) {
    const infoTecnica = [];
    if (hu.Tecnologias && hu.Tecnologias.length > 0) {
      infoTecnica.push(`<p><strong>Tecnologias:</strong></p><p>${hu.Tecnologias.join(', ')}</p>`);
    }
    if (hu.APIsDeConexion && hu.APIsDeConexion.length > 0) {
      infoTecnica.push(`<p><strong>APIs de conexion:</strong></p><p>${hu.APIsDeConexion.join(', ')}</p>`);
    }
    if (infoTecnica.length > 0) {
      detalle += `<br><br>${infoTecnica.join('<br><br>')}`;
    }
  }

  return detalle;
}

// ============================================================================
// TRANSFORMACION A HUs_batch.json
// ============================================================================

console.log('Transformando a HUs_batch.json...');

// Leer HUs_batch.json base (si existe) para obtener DatosGenerales
let datosGenerales = {
  epicTitle: 'Epic - Iniciativa TBA',
  epicDescription: 'Epic generado automaticamente por TBA Orchestrator',
  featureTitle: 'Feature - Implementacion',
  featureDescription: 'Feature generado automaticamente por TBA Orchestrator',
  areaPath: '',
  productType: '',
  initiativeName: ''
};

if (fs.existsSync(husBatchPath)) {
  console.log('  HUs_batch.json existente detectado, preservando DatosGenerales...');
  const husBatchExistente = JSON.parse(fs.readFileSync(husBatchPath, 'utf8'));
  datosGenerales = { ...datosGenerales, ...husBatchExistente.DatosGenerales };
}

// Transformar cada HU
const historiasTransformadas = husOriginal.HistoriasDeUsuario.map((hu, index) => {
  const id = `HU-${String(index + 1).padStart(3, '0')}`;

  // Buscar US correspondiente en el plan (para enrichment)
  const implPlanUS = findMatchingUSInPlan(index);

  // Transformar Tareas con enrichment
  const tareasTransformadas = (hu.Tareas || []).map(tarea => {
    const match = tarea.Titulo.match(/^\[(\w+)\]/);
    const tipo = match ? match[1] : 'GENERAL';

    let detalle = tarea.Detalle || '';

    // Enriquecer si hay implementation-plan disponible
    if (implementationPlan) {
      if (tipo === 'QA') {
        detalle = buildEnrichedQATaskDescription(tarea.Detalle || '', id);
      } else {
        const matchingFiles = findFilesForTask(tipo, id);
        if (matchingFiles.length > 0) {
          detalle = buildEnrichedTaskDescription(tarea.Detalle || '', matchingFiles);
        }
      }
    }

    return {
      Tipo: tipo,
      Titulo: tarea.Titulo,
      Detalle: detalle,
      SugerenciaCodigo: tarea.SugerenciaCodigo || undefined
    };
  });

  // Construir Detalle enriquecido para User Story
  let detalle;
  if (implementationPlan || iniciativa) {
    detalle = buildEnrichedUserStoryDetalle(hu, implPlanUS);
  } else {
    detalle = buildFallbackDetalle(hu);
  }

  // Construir CriteriosDeAceptacion enriquecidos
  let criterios;
  if (implementationPlan && iniciativa) {
    criterios = buildEnrichedAcceptanceCriteria(hu, implPlanUS);
  } else {
    criterios = hu.CriteriosDeAceptacion || '';
  }

  return {
    Id: id,
    Titulo: hu.Titulo,
    Descripcion: hu.Descripcion || '',
    Detalle: detalle,
    CriteriosDeAceptacion: criterios,
    SugerenciaCodigo: '',
    Tareas: tareasTransformadas
  };
});

// ============================================================================
// GENERACION DE HUs_batch.json
// ============================================================================

const husBatch = {
  DatosGenerales: datosGenerales,
  HistoriasDeUsuario: historiasTransformadas
};

console.log('\nEscribiendo HUs_batch.json...');
fs.writeFileSync(
  husBatchPath,
  JSON.stringify(husBatch, null, 2),
  'utf8'
);

// ============================================================================
// RESUMEN FINAL
// ============================================================================

console.log('HUs_batch.json generado correctamente\n');

const totalHUs = historiasTransformadas.length;
const totalTareas = historiasTransformadas.reduce((acc, hu) => acc + hu.Tareas.length, 0);

console.log('Estadisticas:');
console.log(`   - Historias de Usuario: ${totalHUs}`);
console.log(`   - Tareas: ${totalTareas}`);
console.log(`   - Enrichment: ${implementationPlan ? 'SI (implementation-plan.json)' : 'NO'} | ${iniciativa ? 'SI (iniciativa.json)' : 'NO'}`);

// Contar tareas por tipo
const tareasPorTipo = {};
historiasTransformadas.forEach(hu => {
  hu.Tareas.forEach(tarea => {
    const tipo = tarea.Tipo || 'GENERAL';
    tareasPorTipo[tipo] = (tareasPorTipo[tipo] || 0) + 1;
  });
});

if (Object.keys(tareasPorTipo).length > 0) {
  console.log('\nTareas por tipo:');
  Object.entries(tareasPorTipo).forEach(([tipo, count]) => {
    console.log(`   - ${tipo}: ${count}`);
  });
}

console.log('\nArchivo generado:');
console.log(`   ${husBatchPath}`);
console.log('\nSiguiente paso: Ejecutar create-work-items-batch.js');
console.log(`   node ${path.join(__dirname, 'create-work-items-batch.js')} "${husBatchPath}" {organizacion} {proyecto}`);
