import * as clack from '@clack/prompts';
import pc from 'picocolors';
import { findManifest } from '../lib/manifest.js';
import { getDestinationPaths, addProductoToConfig, addProductToOrchestratorCatalog } from '../lib/installer.js';
import {
  showHeader,
  askProductoConfig,
  showCancelled,
  showSuccess,
  showError,
} from '../ui/prompts.js';

/**
 * add-product command:
 * 1. Read existing manifest (determines assistant + scope)
 * 2. Prompt for product/team config
 * 3. Merge new entry into productos.json (preserving existing entries)
 * 4. Merge new entry into tba-orchestrator.md catalog
 * 5. Show success
 */
export async function addProduct() {
  showHeader();

  // Step 1: Locate existing installation
  const found = findManifest();
  if (!found) {
    showError('No se encontró instalación previa. Corre `npx tba-agent install` primero.');
    process.exit(1);
  }

  const { data: manifest } = found;
  const { agentsDir, skillsDir } = getDestinationPaths(manifest.assistant, manifest.scope);

  clack.intro(pc.dim(`Instalación: ${manifest.assistant} / ${manifest.scope}`));

  // Step 2: Ask for product config
  const productoConfig = await askProductoConfig();
  if (clack.isCancel(productoConfig)) {
    showCancelled();
    process.exit(0);
  }
  if (!productoConfig) {
    showCancelled();
    process.exit(0);
  }

  // Step 3: Merge into productos.json
  const spinner = clack.spinner();
  spinner.start('Agregando producto...');

  try {
    await addProductoToConfig(skillsDir, productoConfig);
    await addProductToOrchestratorCatalog(agentsDir, productoConfig);
    spinner.stop(`Producto "${productoConfig.nombre}" agregado exitosamente.`);
  } catch (err) {
    spinner.stop('Error al agregar el producto.');
    showError(`Error inesperado: ${err.message}`);
    process.exit(1);
  }

  clack.note(
    `productos.json actualizado en:\n` +
    `  ${skillsDir}/create-azure-workitems/config/productos.json\n\n` +
    `Catálogo de productos actualizado en:\n` +
    `  ${agentsDir}/src/productos.json\n\n` +
    `El orquestador leerá este archivo en tiempo de ejecución.`,
    'Archivos modificados'
  );

  showSuccess('Producto agregado exitosamente!');
}
