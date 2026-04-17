import pc from 'picocolors';
import { createRequire } from 'module';
import { findManifest, writeManifest } from '../lib/manifest.js';
import { installAssets } from '../lib/installer.js';
import { showProgress, showFileList, showError } from '../ui/prompts.js';

const require = createRequire(import.meta.url);
const pkg = require('../../package.json');

/**
 * Update command:
 * 1. Read existing manifest
 * 2. Show progress spinner
 * 3. Overwrite all files without prompting
 * 4. Update manifest with new version and installedAt
 * 5. Show previous vs new version
 * 6. Show file list
 */
export async function update() {
  // Step 1: Find existing manifest
  const found = findManifest();
  if (!found) {
    showError('No se encontro instalacion previa. Corre `npx tba-agent install`');
    process.exit(1);
  }

  const { data: manifest } = found;
  const previousVersion = manifest.version;
  const newVersion = pkg.version;

  // Step 2: Copy assets
  const spinner = showProgress('Actualizando archivos...');
  let copiedFiles = [];

  try {
    const result = await installAssets({
      assistant: manifest.assistant,
      scope: manifest.scope,
      preserveUserConfig: true,
    });
    copiedFiles = result.copiedFiles;
    spinner.stop('Archivos actualizados exitosamente.');
  } catch (err) {
    spinner.stop('Error al actualizar archivos.');
    if (err.code === 'EACCES') {
      showError(err.message);
    } else {
      showError(`Error inesperado: ${err.message}`);
    }
    process.exit(1);
  }

  // Step 3: Update manifest
  await writeManifest(
    {
      ...manifest,
      version: newVersion,
      installedAt: new Date().toISOString(),
    },
    manifest.scope
  );

  // Step 4: Show version comparison
  console.log('');
  console.log(pc.dim(`Version anterior: ${previousVersion}`));
  console.log(pc.green(`Version nueva:    ${newVersion}`));
  console.log('');

  // Step 5: Show file list
  showFileList(copiedFiles);

  console.log(pc.green('\nActualizacion completada exitosamente!'));
}
