#!/usr/bin/env node

/**
 * Transforma implementation-plan.json en HUs_batch.json para Azure DevOps
 *
 * Reemplaza al antiguo transform-hus-to-batch.js. En vez de leer HUs.json,
 * lee implementation-plan.json que contiene userStories[] y implementationOrder[].
 *
 * Uso:
 *   node transform-plan-to-batch.js <ruta-implementation-plan.json> [--output=ruta-salida]
 *
 * Ejemplo:
 *   node transform-plan-to-batch.js ./tba-output/consulta-tienda-por-cp/implementation-plan.json
 */

const fs = require('fs');
const path = require('path');

// ============================================================================
// ARGUMENTOS
// ============================================================================

const args = process.argv.slice(2);
const positionalArgs = args.filter(a => !a.startsWith('--'));
const flags = args.filter(a => a.startsWith('--'));

const [planFilePath] = positionalArgs;
const outputFlag = flags.find(f => f.startsWith('--output='));

if (!planFilePath) {
  console.error('Error: Falta ruta del implementation-plan.json');
  console.error('Uso: node transform-plan-to-batch.js <ruta-implementation-plan.json>');
  process.exit(1);
}

if (!fs.existsSync(planFilePath)) {
  console.error(`Error: No se encontro ${planFilePath}`);
  process.exit(1);
}

// ============================================================================
// FUNCIONES DE TRANSFORMACION
// ============================================================================

/**
 * Convierte texto plano a HTML con clases de Azure DevOps
 */
function textToHtml(text) {
  if (!text) return '';
  return text
    .split('\n')
    .map(line => `<p class="editor-paragraph">${line}</p>`)
    .join('');
}

/**
 * Convierte array de criterios a HTML lista
 */
function criteriosToHtml(criterios) {
  if (!criterios || !Array.isArray(criterios)) return '';
  return '<ul>' + criterios.map(c => `<li>${c}</li>`).join('') + '</ul>';
}

/**
 * Convierte escenarios Gherkin a HTML para tarea QA
 */
function gherkinToHtml(escenarios, iniciativaPath) {
  let iniciativa = null;
  if (iniciativaPath && fs.existsSync(iniciativaPath)) {
    iniciativa = JSON.parse(fs.readFileSync(iniciativaPath, 'utf8'));
  }

  let html = '';
  for (const escId of escenarios) {
    // Buscar el escenario en la iniciativa
    let found = null;
    if (iniciativa) {
      for (const grupo of iniciativa.grupos) {
        if (grupo.escenariosPrueba) {
          found = grupo.escenariosPrueba.find(e => e.id === escId);
          if (found) break;
        }
      }
    }

    if (found) {
      html += `<p class="editor-paragraph"><strong class="editor-text-bold">${found.titulo} (${found.tipo})</strong></p>`;
      const lines = found.gherkin.split('\n');
      for (const line of lines) {
        html += `<p class="editor-paragraph">${line}</p>`;
      }
      html += '<p class="editor-paragraph"></p><br><br>';
    }
  }
  return html;
}

/**
 * Mapea layer del plan a tipo de tarea Azure DevOps
 */
function layerToTaskType(layer, purpose) {
  const purposeLower = (purpose || '').toLowerCase();

  if (layer === 'domain') {
    if (purposeLower.includes('migration') || purposeLower.includes('schema') || purposeLower.includes('table')) {
      return 'BD';
    }
    return 'BACK';
  }
  if (layer === 'infrastructure') {
    if (purposeLower.includes('api') || purposeLower.includes('external') || purposeLower.includes('integra')) {
      return 'INTEG';
    }
    return 'BACK';
  }
  if (layer === 'application') return 'BACK';
  if (layer === 'presentation') return 'FRONT';
  if (layer === 'routing') return 'FRONT';
  if (layer === 'test') return 'QA';
  return 'GENERAL';
}

/**
 * Genera el detalle HTML de una tarea desde un file entry del plan
 */
function fileToTaskDetail(file) {
  let html = '';

  // Detalle principal
  html += '<h3>Detalle</h3>';
  html += `<p>${file.purpose || 'N/A'}</p>`;

  // Tabla de archivo
  html += '<h3>Archivo</h3>';
  html += '<table><tr><th>Path</th><th>Capa</th><th>Accion</th><th>Complejidad</th></tr>';
  html += `<tr><td><code>${file.path}</code></td><td>${file.layer}</td><td>${file.action}</td><td>${file.estimatedComplexity || 'N/A'}</td></tr>`;
  html += '</table>';

  // Notas de arquitectura
  if (file.architectureNotes) {
    html += '<h3>Notas de Arquitectura</h3>';
    html += `<ul><li>${file.architectureNotes}</li></ul>`;
  }

  // Guia de implementacion
  if (file.contentGuidance) {
    html += '<h3>Guia de Implementacion</h3>';
    html += `<pre><code>${escapeHtml(file.contentGuidance)}</code></pre>`;
  }

  // Dependencias
  if (file.dependencies && file.dependencies.length > 0) {
    html += '<h3>Dependencias</h3>';
    html += '<ul>' + file.dependencies.map(d => `<li>${d}</li>`).join('') + '</ul>';
  }

  return html;
}

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

// ============================================================================
// TRANSFORMACION PRINCIPAL
// ============================================================================

function transform(planFilePath) {
  const plan = JSON.parse(fs.readFileSync(planFilePath, 'utf8'));
  const planDir = path.dirname(planFilePath);
  const iniciativaPath = path.join(planDir, 'iniciativa.json');

  // Verificar que existan userStories
  if (!plan.userStories || plan.userStories.length === 0) {
    console.error('Error: implementation-plan.json no tiene userStories');
    process.exit(1);
  }

  // Leer DatosGenerales existentes si el archivo ya existe
  const outputPath = outputFlag
    ? outputFlag.split('=')[1]
    : path.join(planDir, 'HUs_batch.json');

  let datosGenerales = {};
  if (fs.existsSync(outputPath)) {
    const existing = JSON.parse(fs.readFileSync(outputPath, 'utf8'));
    datosGenerales = existing.DatosGenerales || {};
  }

  // Construir User Stories
  const historiasDeUsuario = plan.userStories.map((us, idx) => {
    const usId = `HU-${String(idx + 1).padStart(3, '0')}`;

    // Descripcion en HTML (Como/Quiero/Para)
    const descLines = (us.descripcion || '').split('\n');
    let descripcionHtml = '';
    for (const line of descLines) {
      if (line.toLowerCase().startsWith('como')) {
        descripcionHtml += `<p class="editor-paragraph"><strong class="editor-text-bold">Como</strong> ${line.replace(/^como\s*/i, '')}</p>`;
      } else if (line.toLowerCase().startsWith('quiero')) {
        descripcionHtml += `<p class="editor-paragraph"><strong class="editor-text-bold">Quiero</strong> ${line.replace(/^quiero\s*/i, '')}</p>`;
      } else if (line.toLowerCase().startsWith('para')) {
        descripcionHtml += `<p class="editor-paragraph"><strong class="editor-text-bold">Para</strong> ${line.replace(/^para\s*/i, '')}</p>`;
      } else {
        descripcionHtml += `<p class="editor-paragraph">${line}</p>`;
      }
    }

    // Recopilar archivos de este US desde implementationOrder
    const usFiles = [];
    for (const phase of plan.implementationOrder) {
      for (const file of phase.files) {
        if (file.usReference === us.id) {
          usFiles.push({ ...file, phaseName: phase.phaseName });
        }
      }
    }

    // Recopilar tests de este US
    const usTests = (plan.testPlan || []).filter(t => {
      const sourceFile = usFiles.find(f => f.id === t.sourceFile);
      return sourceFile !== undefined;
    });

    // Construir tareas por tipo (agrupadas por layer)
    const tareasByType = {};
    for (const file of usFiles) {
      const tipo = layerToTaskType(file.layer, file.purpose);
      if (!tareasByType[tipo]) tareasByType[tipo] = [];
      tareasByType[tipo].push(file);
    }

    // Orden de tipos: BD -> INTEG -> BACK -> FRONT -> QA
    const tipoOrder = ['BD', 'INTEG', 'BACK', 'FRONT', 'QA'];
    const tareas = [];

    for (const tipo of tipoOrder) {
      const files = tareasByType[tipo];
      if (!files || files.length === 0) continue;

      if (tipo === 'QA') continue; // QA se maneja aparte

      // Una tarea por archivo
      for (const file of files) {
        tareas.push({
          Tipo: tipo,
          Titulo: `[${tipo}] ${file.purpose}`,
          Detalle: fileToTaskDetail(file),
          SugerenciaCodigo: ''
        });
      }
    }

    // Tarea QA consolidada con Gherkin + tabla de test files
    if (us.escenariosPrueba && us.escenariosPrueba.length > 0) {
      let qaDetail = '';

      // Tabla de archivos de test
      if (usTests.length > 0) {
        qaDetail += '<h3>Archivos de Test</h3>';
        qaDetail += '<table><tr><th>Test</th><th>Archivo Fuente</th><th>Tipo</th><th>Escenarios</th></tr>';
        for (const tp of usTests) {
          const testFileName = path.basename(tp.testFile || '');
          const scenarios = (tp.gherkinScenarios || []).join(', ');
          qaDetail += `<tr><td><code>${testFileName}</code></td><td>${tp.sourceFile || ''}</td><td>${tp.testType || 'unit'}</td><td>${scenarios}</td></tr>`;
        }
        qaDetail += '</table>';
      }

      // Gherkin
      qaDetail += '<h3>Escenarios Gherkin</h3>';
      qaDetail += gherkinToHtml(us.escenariosPrueba, iniciativaPath);

      tareas.push({
        Tipo: 'QA',
        Titulo: '[QA] Escenarios de prueba',
        Detalle: qaDetail
      });
    }

    // Construir Detalle enriquecido para User Story
    let detalleHtml = descripcionHtml;

    // Tecnologias
    if (us.tecnologias && us.tecnologias.length > 0) {
      detalleHtml += '<h3>Tecnologias</h3>';
      detalleHtml += '<ul>' + us.tecnologias.map(t => `<li>${t}</li>`).join('') + '</ul>';
    }

    // APIs Involucradas
    if (us.apisInvolucradas && us.apisInvolucradas.length > 0) {
      detalleHtml += '<h3>APIs Involucradas</h3>';
      detalleHtml += '<ul>' + us.apisInvolucradas.map(a => `<li><code>${a}</code></li>`).join('') + '</ul>';
    }

    // Reglas de negocio (buscar en iniciativa.json si disponible)
    if (fs.existsSync(iniciativaPath)) {
      try {
        const inic = JSON.parse(fs.readFileSync(iniciativaPath, 'utf8'));
        const grupo = (inic.grupos || []).find(g => g.id === us.grupoRef);
        if (grupo) {
          // Buscar reglas en los elementos del grupo
          const elementosConReglas = (inic.elementos || [])
            .filter(e => (grupo.elementos || []).includes(e.id) && e.reglasNegocio);
          if (elementosConReglas.length > 0) {
            detalleHtml += '<h3>Reglas de Negocio</h3>';
            detalleHtml += '<ul>';
            for (const elem of elementosConReglas) {
              const reglas = elem.reglasNegocio.split('\n').filter(r => r.trim());
              for (const regla of reglas) {
                detalleHtml += `<li>${regla.trim()}</li>`;
              }
            }
            detalleHtml += '</ul>';
          }

          // Notas tecnicas
          const elementosConNotas = (inic.elementos || [])
            .filter(e => (grupo.elementos || []).includes(e.id) && e.notasTecnicas);
          if (elementosConNotas.length > 0) {
            detalleHtml += '<h3>Notas Tecnicas</h3>';
            for (const elem of elementosConNotas) {
              detalleHtml += `<p>${elem.notasTecnicas}</p>`;
            }
          }
        }
      } catch (e) {
        // Silently skip if iniciativa.json can't be parsed
      }
    }

    // Criterios de aceptacion enriquecidos con tabla Gherkin
    let criteriosHtml = criteriosToHtml(us.criteriosAceptacion);

    if (us.escenariosPrueba && us.escenariosPrueba.length > 0 && fs.existsSync(iniciativaPath)) {
      try {
        const inic = JSON.parse(fs.readFileSync(iniciativaPath, 'utf8'));
        const scenarios = [];
        for (const grupo of (inic.grupos || [])) {
          for (const esc of (grupo.escenariosPrueba || [])) {
            if (us.escenariosPrueba.includes(esc.id)) {
              scenarios.push(esc);
            }
          }
        }
        if (scenarios.length > 0) {
          criteriosHtml += '<h3>Escenarios de Prueba</h3>';
          criteriosHtml += '<table><tr><th>ID</th><th>Escenario</th><th>Tipo</th></tr>';
          for (const esc of scenarios) {
            criteriosHtml += `<tr><td>${esc.id}</td><td>${esc.titulo}</td><td>${esc.tipo}</td></tr>`;
          }
          criteriosHtml += '</table>';
        }
      } catch (e) {
        // Silently skip
      }
    }

    return {
      Id: usId,
      Titulo: `${usId}: ${us.titulo}`,
      Descripcion: descripcionHtml,
      Detalle: detalleHtml,
      CriteriosDeAceptacion: criteriosHtml,
      Tecnologias: us.tecnologias || [],
      APIsDeConexion: us.apisInvolucradas || [],
      Tareas: tareas
    };
  });

  // Construir batch
  const batch = {
    DatosGenerales: {
      ...datosGenerales,
      initiativeName: plan.iniciativa,
      totalUserStories: historiasDeUsuario.length,
      totalTareas: historiasDeUsuario.reduce((sum, hu) => sum + hu.Tareas.length, 0)
    },
    HistoriasDeUsuario: historiasDeUsuario
  };

  // Guardar
  fs.writeFileSync(outputPath, JSON.stringify(batch, null, 2));

  // Estadisticas
  const stats = {
    userStories: historiasDeUsuario.length,
    tareas: {
      BD: 0, INTEG: 0, BACK: 0, FRONT: 0, QA: 0, GENERAL: 0
    },
    total: 0
  };

  for (const hu of historiasDeUsuario) {
    for (const t of hu.Tareas) {
      stats.tareas[t.Tipo] = (stats.tareas[t.Tipo] || 0) + 1;
      stats.total++;
    }
  }

  console.log('\n=== Transform Plan to Batch ===\n');
  console.log(`User Stories: ${stats.userStories}`);
  console.log(`Tareas: BD=${stats.tareas.BD} INTEG=${stats.tareas.INTEG} BACK=${stats.tareas.BACK} FRONT=${stats.tareas.FRONT} QA=${stats.tareas.QA}`);
  console.log(`Total tareas: ${stats.total}`);
  console.log(`\nOutput: ${outputPath}`);

  return batch;
}

// Ejecutar
transform(planFilePath);
