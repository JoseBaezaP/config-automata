import path from 'path';
import os from 'os';
import fs from 'fs/promises';
import { fileURLToPath } from 'url';
import fsExtra from 'fs-extra';

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
        extras: [
          {
            src: 'copilot/copilot-instructions.md',
            dest: path.join(base, '.github', 'copilot-instructions.md'),
          },
          {
            src: 'copilot/vscode-settings.json',
            dest: path.join(base, '.vscode', 'settings.json'),
          },
        ],
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
    /AZURE_DEVOPS_PAT:\s*"TU_PAT_AQUI"/,
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
        organizacion: config.organizacion,
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
 * Installs assets (agents + skills + optional extras) from the bundled assets/
 * directory to the correct destination paths based on assistant and scope.
 *
 * @param {{ assistant: ('claude'|'opencode'|'copilot'), scope: ('global'|'project') }} options
 * @returns {Promise<{ copiedFiles: string[] }>}
 * @throws Will throw with code 'EACCES' if permission denied on destination
 */
export async function installAssets({ assistant, scope }) {
  const assetsDir = getAssetsDir();
  const { agentsDir, skillsDir, extras } = getDestinationPaths(assistant, scope);
  const { agentsSrc, skillsSrc } = getSourcePaths(assistant);

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
