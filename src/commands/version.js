import pc from 'picocolors';
import { findManifest } from '../lib/manifest.js';
import { getLatestVersion, compareVersions } from '../lib/registry.js';

/**
 * Version command:
 * 1. Read installed version from manifest
 * 2. Fetch latest version from GitHub Releases
 * 3. Display comparison with appropriate messages
 */
export async function version() {
  // Step 1: Get installed version from manifest
  const found = findManifest();
  const installedVersion = found?.data?.version ?? null;

  // Step 2: Fetch available version from GitHub Releases
  const latestVersion = await getLatestVersion();

  // Step 3: Display results
  console.log('');

  if (!installedVersion) {
    console.log(pc.yellow('No se encontro instalacion previa.'));
  } else {
    console.log(`Version instalada:   ${pc.cyan(installedVersion)}`);
  }

  if (!latestVersion) {
    console.log(`Version disponible:  ${pc.dim('N/A (sin conexion)')}`);
  } else {
    console.log(`Version disponible:  ${pc.cyan(latestVersion)}`);
  }

  console.log('');

  // Step 4: Show comparison message
  if (installedVersion && latestVersion) {
    const status = compareVersions(installedVersion, latestVersion);
    if (status === 'up-to-date') {
      console.log(pc.green('Ya tienes la ultima version.'));
    } else if (status === 'update-available') {
      console.log(
        pc.yellow('Actualizacion disponible! Corre ') +
          pc.cyan('`npx tba-agent update`') +
          pc.yellow(' para actualizar.')
      );
    }
  }

  console.log('');
}
