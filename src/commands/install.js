import * as clack from '@clack/prompts';
import fsExtra from 'fs-extra';
import { createRequire } from 'module';
import { readManifest, writeManifest } from '../lib/manifest.js';
import { installAssets, getDestinationPaths, configureAzurePAT, configureProductos, updateOrchestratorCatalog } from '../lib/installer.js';
import {
  showHeader,
  selectAssistant,
  selectScope,
  askAzurePAT,
  askProductoConfig,
  showProductosLocation,
  showPendingConfig,
  confirmOverwrite,
  showProgress,
  showFileList,
  showNextSteps,
  showError,
  showWarning,
  showCancelled,
  showSuccess,
} from '../ui/prompts.js';

const require = createRequire(import.meta.url);
const pkg = require('../../package.json');

/**
 * Interactive install flow:
 * 1. Show header
 * 2. Select assistant
 * 3. Select scope
 * 4. Check for existing installation
 * 5. Confirm overwrite if needed
 * 6. Copy assets
 * 7. Write manifest
 * 8. Show file list
 * 9. Show Next Steps
 *
 * Handles cancellation at every prompt, cleans up partial copies on cancel/error.
 */
export async function install() {
  showHeader();

  // Step 1: Select assistant
  const assistant = await selectAssistant();
  if (clack.isCancel(assistant)) {
    showCancelled();
    process.exit(0);
  }

  // Step 2: Select scope
  const scope = await selectScope(assistant);
  if (clack.isCancel(scope)) {
    showCancelled();
    process.exit(0);
  }

  // Step 3: Check existing installation
  const existingManifest = readManifest(scope);
  if (existingManifest) {
    const overwrite = await confirmOverwrite();
    if (clack.isCancel(overwrite)) {
      showCancelled();
      process.exit(0);
    }
    if (!overwrite) {
      showCancelled();
      process.exit(0);
    }
  }

  // Step 4: Ask for Azure DevOps PAT
  const azurePAT = await askAzurePAT();
  if (clack.isCancel(azurePAT)) {
    showCancelled();
    process.exit(0);
  }

  // Step 5: Ask for product/team config
  const productoConfig = await askProductoConfig();
  if (clack.isCancel(productoConfig)) {
    showCancelled();
    process.exit(0);
  }

  // Step 6: Get destination paths for cleanup on cancel
  const { agentsDir, skillsDir } = getDestinationPaths(assistant, scope);

  // Step 6: Copy assets
  const spinner = showProgress('Copiando archivos...');
  let copiedFiles = [];

  try {
    const result = await installAssets({ assistant, scope, preserveUserConfig: !!existingManifest });
    copiedFiles = result.copiedFiles;
    spinner.stop('Archivos copiados exitosamente.');
  } catch (err) {
    spinner.stop('Error al copiar archivos.');

    // Clean up any partial copies
    try {
      await fsExtra.remove(agentsDir);
      await fsExtra.remove(skillsDir);
    } catch {
      // Best effort cleanup
    }

    if (err.code === 'EACCES') {
      showError(err.message);
    } else {
      showError(`Error inesperado: ${err.message}`);
    }
    process.exit(1);
  }

  // Step 7: Configure Azure PAT
  await configureAzurePAT(skillsDir, azurePAT, scope);

  // Step 8: Configure productos.json + symlink
  const { symlinked } = await configureProductos(skillsDir, productoConfig);
  await updateOrchestratorCatalog(agentsDir, productoConfig);
  if (!symlinked) {
    showWarning(
      'No se pudo crear el symlink entre productos.json (requiere permisos en Windows).\n' +
      '  Ambos archivos fueron copiados por separado — edítalos en sincronía manualmente.'
    );
  }

  // Step 9: Write manifest
  await writeManifest(
    {
      version: pkg.version,
      assistant,
      scope,
      installedAt: new Date().toISOString(),
    },
    scope
  );

  // Step 10: Show results
  showFileList(copiedFiles);
  showNextSteps(assistant);
  if (!productoConfig) {
    showPendingConfig(skillsDir);
  } else if (productoConfig.skippedOptional) {
    showProductosLocation(skillsDir);
  }
  showSuccess();
}
