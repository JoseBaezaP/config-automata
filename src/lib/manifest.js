import fs from 'fs';
import path from 'path';
import os from 'os';
import fsExtra from 'fs-extra';

/**
 * Returns the absolute path to .tba-kit.json for the given scope.
 * @param {('global'|'project')} scope
 * @returns {string}
 */
export function getManifestPath(scope) {
  if (scope === 'global') {
    return path.join(os.homedir(), '.tba-kit.json');
  }
  return path.join(process.cwd(), '.tba-kit.json');
}

/**
 * Reads and returns the manifest data for the given scope.
 * Returns null if the manifest file does not exist.
 * @param {('global'|'project')} scope
 * @returns {{ version: string, assistant: string, scope: string, installedAt: string } | null}
 */
export function readManifest(scope) {
  const manifestPath = getManifestPath(scope);
  if (!fs.existsSync(manifestPath)) {
    return null;
  }
  try {
    return fsExtra.readJsonSync(manifestPath);
  } catch {
    return null;
  }
}

/**
 * Writes manifest data to the correct location for the given scope.
 * @param {{ version: string, assistant: string, scope: string, installedAt: string }} data
 * @param {('global'|'project')} scope
 */
export async function writeManifest(data, scope) {
  const manifestPath = getManifestPath(scope);
  await fsExtra.outputJson(manifestPath, data, { spaces: 2 });
}

/**
 * Searches for a manifest first in project scope (cwd), then global (homedir).
 * Returns { data, scope } or null if not found in either location.
 * @returns {{ data: object, scope: string } | null}
 */
export function findManifest() {
  const projectPath = path.join(process.cwd(), '.tba-kit.json');
  if (fs.existsSync(projectPath)) {
    try {
      const data = fsExtra.readJsonSync(projectPath);
      return { data, scope: 'project' };
    } catch {
      // fall through to global
    }
  }

  const globalPath = path.join(os.homedir(), '.tba-kit.json');
  if (fs.existsSync(globalPath)) {
    try {
      const data = fsExtra.readJsonSync(globalPath);
      return { data, scope: 'global' };
    } catch {
      return null;
    }
  }

  return null;
}
