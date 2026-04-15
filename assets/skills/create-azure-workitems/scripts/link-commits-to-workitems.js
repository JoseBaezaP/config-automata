#!/usr/bin/env node

/**
 * Script para vincular commits de git a work items de Azure DevOps
 *
 * Uso:
 *   node link-commits-to-workitems.js <commit-log.json> <azure-workitems.json> <organization> <project> [--repo-type=external] [--repo-url=URL]
 *
 * Ejemplo:
 *   node link-commits-to-workitems.js ./commit-log.json ./azure-workitems.json "hebmexico" "Dev - Product and Technology" --repo-type=external --repo-url=https://github.com/heb/ecomm-ecomtools-web
 *
 * NOTA: El PAT se carga automaticamente desde config/azure-pat.js
 *
 * Estrategias de linking:
 * - repo-type=azure: Usa ArtifactLink con vstfs:///Git/Commit/{projectId}%2F{repoId}%2F{sha}
 * - repo-type=external (default): Usa Hyperlink con URL del commit en el repo externo
 * - Fallback: Si el linking falla, agrega un comentario al work item
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

// ============================================================================
// CARGAR CONFIGURACION DE PAT
// ============================================================================

const configPath = path.join(__dirname, '..', 'config', 'azure-pat.js');

if (!fs.existsSync(configPath)) {
  console.error('Error: No se encontro el archivo de configuracion de PAT');
  console.error(`   Archivo esperado: ${configPath}`);
  process.exit(1);
}

const azureConfig = require(configPath);
const patToken = azureConfig.AZURE_DEVOPS_PAT;

if (!patToken || patToken === "TU_PAT_AQUI") {
  console.error('Error: PAT no configurado correctamente');
  process.exit(1);
}

// ============================================================================
// ARGUMENTOS
// ============================================================================

const args = process.argv.slice(2);
const positionalArgs = args.filter(a => !a.startsWith('--'));
const flags = args.filter(a => a.startsWith('--'));

const [commitLogPath, workitemsPath, organization, project] = positionalArgs;

if (!commitLogPath || !workitemsPath || !organization || !project) {
  console.error('Error: Faltan argumentos requeridos');
  console.error('Uso: node link-commits-to-workitems.js <commit-log.json> <azure-workitems.json> <organization> <project> [--repo-type=external] [--repo-url=URL]');
  process.exit(1);
}

const repoType = (flags.find(f => f.startsWith('--repo-type=')) || '--repo-type=external').split('=')[1];
const repoUrl = (flags.find(f => f.startsWith('--repo-url=')) || '--repo-url=').split('=')[1];

// Validar archivos
if (!fs.existsSync(commitLogPath)) {
  console.error(`Error: No se encontro ${commitLogPath}`);
  process.exit(1);
}
if (!fs.existsSync(workitemsPath)) {
  console.error(`Error: No se encontro ${workitemsPath}`);
  process.exit(1);
}

// ============================================================================
// FUNCIONES AZURE DEVOPS API
// ============================================================================

function azureDevOpsRequest(method, apiPath, body = null, contentType = 'application/json-patch+json') {
  return new Promise((resolve, reject) => {
    const auth = Buffer.from(`:${patToken}`).toString('base64');
    const hostname = 'dev.azure.com';
    const encodedOrg = encodeURIComponent(organization);
    const encodedProject = encodeURIComponent(project);
    const fullPath = `/${encodedOrg}/${encodedProject}/_apis/${apiPath}`;

    const options = {
      hostname,
      path: fullPath,
      method,
      headers: {
        'Content-Type': contentType,
        'Authorization': `Basic ${auth}`,
        'User-Agent': 'HEB-Automata/1.0'
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try { resolve(JSON.parse(data)); }
          catch (e) { resolve(data); }
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${data}`));
        }
      });
    });

    req.on('error', (error) => { reject(error); });
    if (body) { req.write(JSON.stringify(body)); }
    req.end();
  });
}

/**
 * Agrega un Hyperlink a un work item (para repos externos como GitHub)
 */
async function addHyperlinkToWorkItem(workItemId, url, comment) {
  const operations = [{
    op: 'add',
    path: '/relations/-',
    value: {
      rel: 'Hyperlink',
      url: url,
      attributes: {
        comment: comment
      }
    }
  }];

  return azureDevOpsRequest(
    'PATCH',
    `wit/workitems/${workItemId}?api-version=7.1`,
    operations
  );
}

/**
 * Agrega un ArtifactLink a un work item (para repos en Azure Repos)
 */
async function addArtifactLinkToWorkItem(workItemId, commitSha, repoId, comment) {
  const encodedProject = encodeURIComponent(project);
  const artifactUrl = `vstfs:///Git/Commit/${encodedProject}%2F${repoId}%2F${commitSha}`;

  const operations = [{
    op: 'add',
    path: '/relations/-',
    value: {
      rel: 'ArtifactLink',
      url: artifactUrl,
      attributes: {
        name: 'Fixed in Commit',
        comment: comment
      }
    }
  }];

  return azureDevOpsRequest(
    'PATCH',
    `wit/workitems/${workItemId}?api-version=7.1`,
    operations
  );
}

/**
 * Agrega un comentario a un work item (fallback si linking falla)
 */
async function addCommentToWorkItem(workItemId, text) {
  return azureDevOpsRequest(
    'POST',
    `wit/workitems/${workItemId}/comments?api-version=7.1-preview.4`,
    { text },
    'application/json'
  );
}

// ============================================================================
// LOGICA PRINCIPAL
// ============================================================================

async function main() {
  console.log('\n=== HEB-Automata: Link Commits to Work Items ===\n');

  // Cargar datos
  const commitLog = JSON.parse(fs.readFileSync(commitLogPath, 'utf8'));
  const workItems = JSON.parse(fs.readFileSync(workitemsPath, 'utf8'));

  console.log(`Commits a vincular: ${commitLog.commits.length}`);
  console.log(`Branch: ${commitLog.branch}`);
  console.log(`User Stories en Azure: ${workItems.userStories.length}`);
  console.log(`Repo type: ${repoType}`);
  if (repoUrl) console.log(`Repo URL: ${repoUrl}`);
  console.log('');

  // Crear mapping de HU reference -> work item IDs
  const huToWorkItems = {};
  for (const us of workItems.userStories) {
    if (us.huReference) {
      if (!huToWorkItems[us.huReference]) {
        huToWorkItems[us.huReference] = [];
      }
      huToWorkItems[us.huReference].push(us.id);
    }
  }

  const results = [];
  let linked = 0;
  let failed = 0;

  // Vincular cada commit a sus work items correspondientes
  for (const commit of commitLog.commits) {
    const commitMessage = commit.message || '';
    const shortSha = commit.shortSha || commit.sha.substring(0, 7);

    // Encontrar work items para este commit basado en huReferences
    const targetWorkItemIds = new Set();
    for (const huRef of (commit.huReferences || [])) {
      const ids = huToWorkItems[huRef] || [];
      ids.forEach(id => targetWorkItemIds.add(id));
    }

    // Si no hay work items especificos, vincular al Feature
    if (targetWorkItemIds.size === 0 && workItems.featureId) {
      targetWorkItemIds.add(workItems.featureId);
    }

    for (const workItemId of targetWorkItemIds) {
      try {
        const comment = `${commitMessage} (${shortSha}) - Branch: ${commitLog.branch}`;

        if (repoType === 'azure') {
          // Para repos en Azure Repos: usar ArtifactLink
          // Nota: necesita repoId que se debe obtener de Azure DevOps
          await addArtifactLinkToWorkItem(workItemId, commit.sha, 'default', comment);
        } else {
          // Para repos externos (GitHub, etc.): usar Hyperlink
          const commitUrl = repoUrl ? `${repoUrl}/commit/${commit.sha}` : `#commit-${shortSha}`;
          await addHyperlinkToWorkItem(workItemId, commitUrl, comment);
        }

        results.push({
          commitSha: shortSha,
          workItemId,
          linkType: repoType === 'azure' ? 'ArtifactLink' : 'Hyperlink',
          status: 'linked'
        });
        linked++;
        console.log(`  Linked: ${shortSha} -> Work Item #${workItemId}`);

        // Throttle para evitar rate limiting
        await new Promise(resolve => setTimeout(resolve, 200));

      } catch (error) {
        // Fallback: agregar comentario
        console.warn(`  Warning: Link failed for ${shortSha} -> #${workItemId}, trying comment fallback...`);

        try {
          const commentText = `<b>Commit vinculado:</b> ${shortSha}<br>` +
            `<b>Mensaje:</b> ${commitMessage}<br>` +
            `<b>Branch:</b> ${commitLog.branch}<br>` +
            `<b>Initiative:</b> ${commit.initiative || 'N/A'}<br>` +
            (repoUrl ? `<b>URL:</b> <a href="${repoUrl}/commit/${commit.sha}">${shortSha}</a>` : '');

          await addCommentToWorkItem(workItemId, commentText);

          results.push({
            commitSha: shortSha,
            workItemId,
            linkType: 'Comment (fallback)',
            status: 'comment-added'
          });
          linked++;
          console.log(`  Comment added: ${shortSha} -> Work Item #${workItemId} (fallback)`);
        } catch (commentError) {
          results.push({
            commitSha: shortSha,
            workItemId,
            linkType: 'none',
            status: 'failed',
            error: error.message
          });
          failed++;
          console.error(`  Failed: ${shortSha} -> #${workItemId}: ${error.message}`);
        }

        await new Promise(resolve => setTimeout(resolve, 200));
      }
    }
  }

  // Resumen
  console.log(`\n=== Resumen ===`);
  console.log(`Total vinculados: ${linked}`);
  console.log(`Total fallidos: ${failed}`);
  console.log(`Total resultados: ${results.length}`);

  // Guardar resultado
  const outputPath = path.join(path.dirname(commitLogPath), 'linking-result.json');
  const output = {
    timestamp: new Date().toISOString(),
    branch: commitLog.branch,
    initiative: commitLog.initiative,
    repoType,
    repoUrl: repoUrl || null,
    totalLinked: linked,
    totalFailed: failed,
    results
  };

  fs.writeFileSync(outputPath, JSON.stringify(output, null, 2));
  console.log(`\nResultado guardado en: ${outputPath}`);

  // Retornar JSON para el agente
  console.log('\n--- JSON OUTPUT ---');
  console.log(JSON.stringify(output, null, 2));

  if (failed > 0) {
    process.exit(1);
  }
}

main().catch(error => {
  console.error(`Error fatal: ${error.message}`);
  process.exit(1);
});
