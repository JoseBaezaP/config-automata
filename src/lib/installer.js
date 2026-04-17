import path from 'path';
import os from 'os';
import fs from 'fs/promises';
import { fileURLToPath } from 'url';
import fsExtra from 'fs-extra';

// Skill-relative paths that contain user config and must survive reinstalls/updates
const PROTECTED_SKILL_PATHS = [
  path.join('create-azure-workitems', 'config', 'azure-pat.js'),
  path.join('create-azure-workitems', 'config', 'productos.json'),
];

/**
 * Parses JSON that may contain raw (unescaped) backslashes in string values,
 * as produced by our .replace(/\\\\/g, '\\') write convention for Windows paths.
 * Escapes lone backslashes before parsing so JSON.parse doesn't throw.
 * @param {string} str
 * @returns {object}
 */
function parseStoredJson(str) {
  // Escape backslashes not already part of a valid JSON escape sequence
  const safe = str.replace(/\\(?!["\\/bfnrtu])/g, '\\\\');
  return JSON.parse(safe);
}

/**
 * Returns the absolute path to the assets/ directory bundled in this package.
 * Uses import.meta.url to resolve path relative to this file (ESM compatible).
 * @returns {string}
 */
export function getAssetsDir() {
  const thisFile = fileURLToPath(import.meta.url);
  // src/lib/installer.js -> ../../assets/
  return path.resolve(path.dirname(thisFile), '..', '..', 'assets');
}

/**
 * Returns the destination paths for agents, skills (and optional extras) based on
 * the assistant and scope selected by the user.
 * @param {('claude'|'opencode'|'copilot')} assistant
 * @param {('global'|'project')} scope
 * @returns {{ agentsDir: string, skillsDir: string, extras: Array<{src: string, dest: string}> }}
 */
export function getDestinationPaths(assistant, scope) {
  const base = scope === 'global' ? os.homedir() : process.cwd();

  const destinations = {
    claude: {
      global: {
        agentsDir: path.join(base, '.claude', 'agents'),
        skillsDir: path.join(base, '.claude', 'skills'),
        extras: [],
      },
      project: {
        agentsDir: path.join(base, '.claude', 'agents'),
        skillsDir: path.join(base, '.claude', 'skills'),
        extras: [],
      },
    },
    opencode: {
      global: {
        agentsDir: path.join(base, '.opencode', 'agents'),
        skillsDir: path.join(base, '.opencode', 'skills'),
        extras: [],
      },
      project: {
        agentsDir: path.join(base, '.opencode', 'agents'),
        skillsDir: path.join(base, '.opencode', 'skills'),
        extras: [],
      },
    },
    copilot: {
      global: {
        agentsDir: path.join(base, '.copilot', 'agents'),
        skillsDir: path.join(base, '.copilot', 'skills'),
        extras: [],
      },
      project: {
        agentsDir: path.join(base, '.github', 'agents'),
        skillsDir: path.join(base, '.github', 'skills'),
        extras: [],
      },
    },
  };

  return destinations[assistant][scope];
}

/**
 * Determines which source directories to use for agents and skills based on assistant.
 * @param {('claude'|'opencode'|'copilot')} assistant
 * @returns {{ agentsSrc: string, skillsSrc: string }}
 */
function getSourcePaths(assistant) {
  const assetsDir = getAssetsDir();

  if (assistant === 'claude') {
    return {
      agentsSrc: path.join(assetsDir, 'claude', 'agents'),
      skillsSrc: path.join(assetsDir, 'skills'),
    };
  }

  if (assistant === 'opencode') {
    return {
      agentsSrc: path.join(assetsDir, 'opencode', 'agents'),
      skillsSrc: path.join(assetsDir, 'skills'),
    };
  }

  // copilot
  return {
    agentsSrc: path.join(assetsDir, 'copilot', 'agents'),
    skillsSrc: path.join(assetsDir, 'skills'),
  };
}

/**
 * Writes the Azure DevOps PAT into the installed azure-pat.js config file
 * and adds the file to .gitignore when scope is 'project'.
 *
 * @param {string} skillsDir - Destination skills directory
 * @param {string} pat - Personal Access Token entered by the user
 * @param {('global'|'project')} scope
 * @returns {Promise<void>}
 */
export async function configureAzurePAT(skillsDir, pat, scope) {
  if (!pat || pat.trim() === '') return;

  const patFilePath = path.join(skillsDir, 'create-azure-workitems', 'config', 'azure-pat.js');

  if (!(await fsExtra.pathExists(patFilePath))) return;

  const content = await fsExtra.readFile(patFilePath, 'utf-8');
  const updated = content.replace(
    /AZURE_DEVOPS_PAT:\s*"[^"]*"/,
    `AZURE_DEVOPS_PAT: "${pat.trim()}"`
  );
  await fsExtra.writeFile(patFilePath, updated, 'utf-8');

  if (scope === 'project') {
    const cwd = process.cwd();
    const gitignorePath = path.join(cwd, '.gitignore');
    const relativePatPath = path.relative(cwd, patFilePath);

    let existing = '';
    if (await fsExtra.pathExists(gitignorePath)) {
      existing = await fsExtra.readFile(gitignorePath, 'utf-8');
    }

    if (!existing.includes(relativePatPath)) {
      const prefix = existing.length > 0 && !existing.endsWith('\n') ? '\n' : '';
      await fsExtra.appendFile(
        gitignorePath,
        `${prefix}# Azure DevOps PAT - do not commit\n${relativePatPath}\n`
      );
    }
  }
}

/**
 * Writes the product/team config to create-azure-workitems/config/productos.json
 * and replaces generate-wiki/config/productos.json with a relative symlink pointing to it.
 * On Windows without symlink permissions (EPERM), falls back to copying the file.
 *
 * @param {string} skillsDir - Destination skills directory
 * @param {object|null} config - Product config from askProductoConfig, or null to skip writing
 * @returns {Promise<{ symlinked: boolean }>}
 */
export async function configureProductos(skillsDir, config) {
  const primaryPath = path.join(skillsDir, 'create-azure-workitems', 'config', 'productos.json');
  const symlinkPath = path.join(skillsDir, 'generate-wiki', 'config', 'productos.json');

  if (!(await fsExtra.pathExists(primaryPath))) return { symlinked: false };

  if (config && typeof config === 'object') {
    const json = {
      [config.nombre]: {
        Product_Owner: config.productOwners || [],
        Scrum_Master: config.scrumMasters || [],
        Lideres_Tecnicos: config.lideresTecnicos || [],
        TBA: config.tba,
        organizacion: 'hebmexico',
        product_type: config.productType || '',
        area_path: config.areaPath.replace(/\\{2,}/g, '\\'),
        tba_proyecto: config.proyecto,
        wiki_id: config.wikiId,
      },
    };
    // Write manually so backslashes in area_path are stored as single \ (not \\)
    const raw = JSON.stringify(json, null, 2).replace(/\\\\/g, '\\');
    await fsExtra.writeFile(primaryPath, raw, 'utf-8');
  }

  // Relative path from symlink location to primary file
  const relTarget = path.relative(path.dirname(symlinkPath), primaryPath);

  try {
    await fsExtra.remove(symlinkPath);
    await fs.symlink(relTarget, symlinkPath);
    return { symlinked: true };
  } catch (err) {
    if (err.code === 'EPERM') {
      // Windows without Developer Mode / admin — fall back to copy
      await fsExtra.copy(primaryPath, symlinkPath, { overwrite: true });
      return { symlinked: false };
    }
    throw err;
  }
}

/**
 * Adds or updates a product entry in the installed productos.json, merging with
 * existing entries instead of replacing the entire file.
 *
 * Also updates the generate-wiki copy/symlink to stay in sync.
 *
 * @param {string} skillsDir - Destination skills directory
 * @param {object} config - Product config from askProductoConfig
 * @returns {Promise<void>}
 */
export async function addProductoToConfig(skillsDir, config) {
  const primaryPath = path.join(skillsDir, 'create-azure-workitems', 'config', 'productos.json');
  const wikiPath = path.join(skillsDir, 'generate-wiki', 'config', 'productos.json');

  if (!(await fsExtra.pathExists(primaryPath))) return;

  let existing = {};
  try {
    const raw = await fsExtra.readFile(primaryPath, 'utf-8');
    existing = parseStoredJson(raw);
  } catch {
    existing = {};
  }

  existing[config.nombre] = {
    Product_Owner: config.productOwners || [],
    Scrum_Master: config.scrumMasters || [],
    Lideres_Tecnicos: config.lideresTecnicos || [],
    TBA: config.tba,
    organizacion: 'hebmexico',
    product_type: config.productType || '',
    area_path: (config.areaPath || '').replace(/\\{2,}/g, '\\'),
    tba_proyecto: config.proyecto,
    wiki_id: config.wikiId,
  };

  const raw = JSON.stringify(existing, null, 2).replace(/\\\\/g, '\\');
  await fsExtra.writeFile(primaryPath, raw, 'utf-8');

  // If wiki path is not a symlink (Windows copy fallback), update it too
  try {
    const stats = await fs.lstat(wikiPath);
    if (!stats.isSymbolicLink()) {
      await fsExtra.writeFile(wikiPath, raw, 'utf-8');
    }
  } catch {
    // wikiPath doesn't exist — nothing to do
  }
}

/**
 * Adds or updates a product entry in the installed tba-orchestrator.md catalog,
 * merging with existing entries instead of replacing the entire catalog.
 *
 * @param {string} agentsDir - Destination agents directory
 * @param {object} config - Product config from askProductoConfig
 * @returns {Promise<void>}
 */
export async function addProductToOrchestratorCatalog(agentsDir, config) {
  if (!config || typeof config !== 'object' || !config.nombre) return;

  const orchestratorPath = path.join(agentsDir, 'tba-orchestrator.md');
  if (!(await fsExtra.pathExists(orchestratorPath))) return;

  const content = await fsExtra.readFile(orchestratorPath, 'utf-8');

  const match = content.match(/(## Catalogo de Productos[\s\S]*?```json\s*\n)([\s\S]*?)(\n```)/);
  if (!match) return;

  let existingCatalog = {};
  try {
    existingCatalog = parseStoredJson(match[2]);
  } catch {
    existingCatalog = {};
  }

  existingCatalog[config.nombre] = {
    Product_Owner: config.productOwners || [],
    Scrum_Master: config.scrumMasters || [],
    Lideres_Tecnicos: config.lideresTecnicos || [],
    TBA: config.tba || '',
    organizacion: 'hebmexico',
    product_type: config.productType || '',
    area_path: config.areaPath || '',
    tba_proyecto: config.proyecto || '',
    wiki_id: config.wikiId || '',
  };

  const newJson = JSON.stringify(existingCatalog, null, 2).replace(/\\\\/g, '\\');
  const updated = content.replace(
    /(## Catalogo de Productos[\s\S]*?```json\s*\n)([\s\S]*?)(\n```)/,
    '$1' + newJson + '\n$3'
  );

  if (updated !== content) {
    await fsExtra.writeFile(orchestratorPath, updated, 'utf-8');
  }
}

/**
 * Collects all file paths recursively from a directory.
 * @param {string} dir - Base directory to collect from
 * @param {string} [relativeTo] - Base for relative path computation
 * @returns {string[]} Array of absolute file paths
 */
async function collectFiles(dir, relativeTo) {
  const base = relativeTo || dir;
  const items = [];

  if (!(await fsExtra.pathExists(dir))) {
    return items;
  }

  const entries = await fsExtra.readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      const sub = await collectFiles(fullPath, base);
      items.push(...sub);
    } else {
      items.push(fullPath);
    }
  }

  return items;
}

/**
 * Updates the embedded "Catalogo de Productos" JSON block inside the installed
 * tba-orchestrator.md so it stays in sync with the user's configured producto.
 *
 * Only runs when the user provided a product config during install.
 * Leaves the rest of the file intact — only replaces the JSON inside the catalog section.
 *
 * @param {string} agentsDir - Destination agents directory
 * @param {object|null} config - Product config from askProductoConfig, or null to skip
 * @returns {Promise<void>}
 */
export async function updateOrchestratorCatalog(agentsDir, config) {
  if (!config || typeof config !== 'object' || !config.nombre) return;

  const orchestratorPath = path.join(agentsDir, 'tba-orchestrator.md');
  if (!(await fsExtra.pathExists(orchestratorPath))) return;

  const content = await fsExtra.readFile(orchestratorPath, 'utf-8');

  const productEntry = {
    Product_Owner: config.productOwners || [],
    Scrum_Master: config.scrumMasters || [],
    Lideres_Tecnicos: config.lideresTecnicos || [],
    TBA: config.tba || '',
    organizacion: 'hebmexico',
    product_type: config.productType || '',
    area_path: config.areaPath || '',
    tba_proyecto: config.proyecto || '',
    wiki_id: config.wikiId || '',
  };

  const newCatalog = { [config.nombre]: productEntry };
  // Keep single backslashes in area_path (JSON.stringify doubles them)
  const newJson = JSON.stringify(newCatalog, null, 2).replace(/\\\\/g, '\\');

  // Replace the JSON block inside ## Catalogo de Productos section
  const updated = content.replace(
    /(## Catalogo de Productos[\s\S]*?```json\s*\n)([\s\S]*?)(\n```)/,
    '$1' + newJson + '\n$3'
  );

  if (updated !== content) {
    await fsExtra.writeFile(orchestratorPath, updated, 'utf-8');
  }
}

/**
 * Installs assets (agents + skills + optional extras) from the bundled assets/
 * directory to the correct destination paths based on assistant and scope.
 *
 * When preserveUserConfig is true (used by update and re-install), protected
 * config files (azure-pat.js, productos.json) and the orchestrator product
 * catalog are backed up before copying and restored afterwards.
 *
 * @param {{ assistant: ('claude'|'opencode'|'copilot'), scope: ('global'|'project'), preserveUserConfig?: boolean }} options
 * @returns {Promise<{ copiedFiles: string[] }>}
 * @throws Will throw with code 'EACCES' if permission denied on destination
 */
export async function installAssets({ assistant, scope, preserveUserConfig = false }) {
  const assetsDir = getAssetsDir();
  const { agentsDir, skillsDir, extras } = getDestinationPaths(assistant, scope);
  const { agentsSrc, skillsSrc } = getSourcePaths(assistant);

  // --- Backup phase ---
  const skillBackups = {};
  let orchestratorCatalogBackup = null;

  if (preserveUserConfig) {
    for (const relPath of PROTECTED_SKILL_PATHS) {
      const destFile = path.join(skillsDir, relPath);
      if (await fsExtra.pathExists(destFile)) {
        skillBackups[relPath] = await fsExtra.readFile(destFile, 'utf-8');
      }
    }

    const orchPath = path.join(agentsDir, 'tba-orchestrator.md');
    if (await fsExtra.pathExists(orchPath)) {
      const orchContent = await fsExtra.readFile(orchPath, 'utf-8');
      const match = orchContent.match(/(## Catalogo de Productos[\s\S]*?```json\s*\n)([\s\S]*?)(\n```)/);
      if (match) orchestratorCatalogBackup = match[2];
    }
  }

  try {
    // Ensure destination directories exist
    await fsExtra.ensureDir(agentsDir);
    await fsExtra.ensureDir(skillsDir);

    // Copy agents
    await fsExtra.copy(agentsSrc, agentsDir, { overwrite: true });

    // Copy skills
    await fsExtra.copy(skillsSrc, skillsDir, { overwrite: true });

    // Copy extras (copilot only)
    for (const extra of extras) {
      const srcPath = path.join(assetsDir, extra.src);
      await fsExtra.ensureDir(path.dirname(extra.dest));
      await fsExtra.copy(srcPath, extra.dest, { overwrite: true });
    }

    // --- Restore phase ---
    if (preserveUserConfig) {
      for (const [relPath, content] of Object.entries(skillBackups)) {
        const destFile = path.join(skillsDir, relPath);
        await fsExtra.ensureDir(path.dirname(destFile));
        await fsExtra.writeFile(destFile, content, 'utf-8');
      }

      // Recreate symlink from generate-wiki → primary productos.json
      const primaryPath = path.join(skillsDir, 'create-azure-workitems', 'config', 'productos.json');
      const wikiPath = path.join(skillsDir, 'generate-wiki', 'config', 'productos.json');
      if (await fsExtra.pathExists(primaryPath)) {
        const relTarget = path.relative(path.dirname(wikiPath), primaryPath);
        try {
          await fsExtra.remove(wikiPath);
          await fs.symlink(relTarget, wikiPath);
        } catch (symlinkErr) {
          if (symlinkErr.code === 'EPERM') {
            await fsExtra.copy(primaryPath, wikiPath, { overwrite: true });
          }
        }
      }

      // Restore orchestrator catalog section
      if (orchestratorCatalogBackup !== null) {
        const orchPath = path.join(agentsDir, 'tba-orchestrator.md');
        const newOrchContent = await fsExtra.readFile(orchPath, 'utf-8');
        const restored = newOrchContent.replace(
          /(## Catalogo de Productos[\s\S]*?```json\s*\n)([\s\S]*?)(\n```)/,
          '$1' + orchestratorCatalogBackup + '\n$3'
        );
        if (restored !== newOrchContent) {
          await fsExtra.writeFile(orchPath, restored, 'utf-8');
        }
      }
    }

    // Collect all copied files for reporting
    const agentFiles = await collectFiles(agentsDir);
    const skillFiles = await collectFiles(skillsDir);
    const extraFiles = extras.map((e) => e.dest);

    const copiedFiles = [...agentFiles, ...skillFiles, ...extraFiles];

    return { copiedFiles };
  } catch (err) {
    if (err.code === 'EACCES') {
      const humanErr = new Error(
        `Permiso denegado al escribir en el directorio destino.\n` +
          `Sugerencia: usa scope "project" para instalar en el directorio actual en lugar del global.`
      );
      humanErr.code = 'EACCES';
      throw humanErr;
    }
    throw err;
  }
}
