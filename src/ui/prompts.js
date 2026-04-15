import * as clack from '@clack/prompts';
import figlet from 'figlet';
import pc from 'picocolors';

/**
 * Displays the ASCII art header using figlet + clack.intro.
 */
export function showHeader() {
  const ascii = figlet.textSync('TBA Agent', { font: 'Standard' });
  console.log(pc.cyan(ascii));
  clack.intro(pc.bgCyan(pc.black(' TBA Agent CLI ')));
}

/**
 * Prompts the user to select an AI assistant.
 * Returns the selected value or a cancel symbol.
 * @returns {Promise<string | symbol>}
 */
export async function selectAssistant() {
  return clack.select({
    message: 'Selecciona tu AI assistant:',
    options: [
      { value: 'claude', label: 'Claude Code', hint: 'Anthropic Claude Code CLI' },
      { value: 'opencode', label: 'OpenCode', hint: 'OpenCode CLI' },
      { value: 'copilot', label: 'GitHub Copilot', hint: 'GitHub Copilot en VS Code' },
    ],
  });
}

/**
 * Prompts the user to select installation scope.
 * Returns the selected value or a cancel symbol.
 * @param {string} assistant - Selected assistant (for label display)
 * @returns {Promise<string | symbol>}
 */
export async function selectScope(assistant = '') {
  const assistantDir = assistant || 'assistant';
  return clack.select({
    message: 'Selecciona el scope de instalacion:',
    options: [
      {
        value: 'global',
        label: 'Global',
        hint: `~/.${assistantDir}/ — disponible en todos los proyectos`,
      },
      {
        value: 'project',
        label: 'Project',
        hint: `./${assistantDir}/ — solo en este proyecto`,
      },
    ],
  });
}

/**
 * Prompts the user to enter their Azure DevOps Personal Access Token.
 * Returns the entered value (possibly empty) or a cancel symbol.
 * @returns {Promise<string | symbol>}
 */
export async function askAzurePAT() {
  clack.note(
    'El PAT requiere los siguientes permisos en Azure DevOps:\n' +
    '  • Wiki       — Read & Write\n' +
    '  • Work Items — Create, Read & Edit',
    'Permisos requeridos'
  );
  return clack.password({
    message: 'Azure DevOps PAT (dejar vacío para configurar después):',
    mask: '*',
  });
}

/**
 * Asks the user to configure their Azure DevOps product/team entry.
 * Returns a config object, null if the user skips, or a cancel symbol.
 * @returns {Promise<object|null|symbol>}
 */
export async function askProductoConfig() {
  const wants = await clack.confirm({
    message: '¿Deseas configurar tu producto/equipo en Azure DevOps ahora?',
    initialValue: true,
  });

  if (clack.isCancel(wants)) return wants;
  if (!wants) return null;

  const fields = [
    { key: 'nombre',       message: 'Nombre del producto/equipo:', placeholder: 'ej. Fulfillment' },
    { key: 'tba',          message: 'Tu nombre (TBA):',             placeholder: 'ej. Jose Baeza' },
    { key: 'organizacion', message: 'Organización Azure DevOps:',   placeholder: 'ej. hebmexico' },
    { key: 'proyecto',     message: 'Proyecto Azure DevOps:',       placeholder: 'ej. Dev - Product and Technology' },
    { key: 'areaPath',     message: 'Area Path:',                   placeholder: 'ej. Dev - Product and Technology\\Fulfillment IMS' },
    { key: 'wikiId',       message: 'Wiki ID:',                     placeholder: 'ej. Dev---Product-and-Technology.wiki' },
  ];

  const config = {};
  for (const field of fields) {
    const value = await clack.text({
      message: field.message,
      placeholder: field.placeholder,
      validate: (v) => (v.trim() ? undefined : 'Este campo es requerido'),
    });
    if (clack.isCancel(value)) return value;
    config[field.key] = value.trim();
  }

  // Optional fields
  const wantsOptional = await clack.confirm({
    message: '¿Configurar campos opcionales? (Product Owner, Scrum Master, Líderes Técnicos, tipo)',
    initialValue: false,
  });
  if (clack.isCancel(wantsOptional)) return wantsOptional;

  if (!wantsOptional) {
    config.skippedOptional = true;
    return config;
  }

  const productType = await clack.text({
    message: 'Tipo de producto:',
    placeholder: 'ej. DIF',
  });
  if (clack.isCancel(productType)) return productType;
  config.productType = productType.trim();

  const optionalArrayFields = [
    { key: 'productOwners',   message: 'Product Owners (separados por coma):', placeholder: 'ej. Oscar Almaguer, Chuck Covian' },
    { key: 'scrumMasters',    message: 'Scrum Masters (separados por coma):',  placeholder: 'ej. Rocio Garza' },
    { key: 'lideresTecnicos', message: 'Líderes Técnicos (separados por coma):', placeholder: 'ej. David Morales, Jose Roque Solis' },
  ];

  for (const field of optionalArrayFields) {
    const value = await clack.text({ message: field.message, placeholder: field.placeholder });
    if (clack.isCancel(value)) return value;
    config[field.key] = value.trim()
      ? value.trim().split(',').map((v) => v.trim()).filter(Boolean)
      : [];
  }

  return config;
}

/**
 * Shows a clack.note telling the user where to edit the optional producto fields.
 * @param {string} skillsDir - Destination skills directory
 */
export function showProductosLocation(skillsDir) {
  clack.note(
    `Edita los campos opcionales (Product Owner, Scrum Master,\n` +
    `Líderes Técnicos, tipo de producto) en:\n\n` +
    `  ${skillsDir}/create-azure-workitems/config/productos.json`,
    'Campos opcionales pendientes'
  );
}

/**
 * Shows a clack.note with all config files the user needs to edit manually.
 * Called when the user skips the product/team configuration entirely.
 * @param {string} skillsDir - Destination skills directory
 */
export function showPendingConfig(skillsDir) {
  clack.note(
    `Para que las skills funcionen correctamente, edita los siguientes archivos:\n\n` +
    `  1. Producto / Equipo\n` +
    `     ${skillsDir}/create-azure-workitems/config/productos.json\n\n` +
    `  2. Azure DevOps PAT  (si aún no lo configuraste)\n` +
    `     ${skillsDir}/create-azure-workitems/config/azure-pat.js`,
    'Configuración pendiente'
  );
}

/**
 * Prompts the user to confirm overwriting an existing installation.
 * Returns true/false or a cancel symbol.
 * @returns {Promise<boolean | symbol>}
 */
export async function confirmOverwrite() {
  return clack.confirm({
    message: 'Ya existe una instalacion TBA. Sobreescribir?',
    initialValue: false,
  });
}

/**
 * Returns a clack spinner instance with the given message started.
 * The caller is responsible for calling spinner.stop().
 * @param {string} message
 * @returns {{ stop: (msg?: string) => void }}
 */
export function showProgress(message) {
  const spinner = clack.spinner();
  spinner.start(message);
  return spinner;
}

/**
 * Shows a list of successfully copied files using clack log.
 * @param {string[]} files - Array of file paths
 */
export function showFileList(files) {
  if (!files || files.length === 0) {
    clack.log.info('No se copiaron archivos.');
    return;
  }
  clack.log.success(pc.green(`${files.length} archivos instalados:`));
  for (const file of files.slice(0, 20)) {
    clack.log.message(`  ${pc.green('✓')} ${file}`);
  }
  if (files.length > 20) {
    clack.log.message(`  ${pc.dim(`... y ${files.length - 20} archivos mas`)}`);
  }
}

/**
 * Shows the Next Steps section with relevant commands based on the assistant.
 * @param {('claude'|'opencode'|'copilot')} assistant
 */
export function showNextSteps(assistant) {
  const steps = {
    claude: [
      `Reinicia Claude Code para cargar los nuevos agentes y skills`,
      `Prueba: ${pc.cyan('claude "Analiza esta iniciativa"')}`,
      `Para actualizar: ${pc.cyan('npx tba-agent update')}`,
    ],
    opencode: [
      `Reinicia OpenCode para cargar los nuevos agentes y skills`,
      `Prueba: ${pc.cyan('opencode "Analiza esta iniciativa"')}`,
      `Para actualizar: ${pc.cyan('npx tba-agent update')}`,
    ],
    copilot: [
      `Recarga VS Code para cargar los nuevos agentes y skills`,
      `Abre GitHub Copilot Chat y selecciona un agente`,
      `Para actualizar: ${pc.cyan('npx tba-agent update')}`,
    ],
  };

  const stepList = steps[assistant] || steps.claude;
  clack.note(stepList.join('\n'), pc.bold('Proximos pasos'));
}

/**
 * Displays a human-readable error message.
 * @param {string} message
 */
export function showError(message) {
  clack.log.error(pc.red(message));
}

/**
 * Shows a warning message.
 * @param {string} message
 */
export function showWarning(message) {
  clack.log.warn(pc.yellow(message));
}

/**
 * Shows the cancellation outro message.
 */
export function showCancelled() {
  clack.outro(pc.yellow('Instalacion cancelada.'));
}

/**
 * Shows the success outro message.
 * @param {string} [message]
 */
export function showSuccess(message = 'Instalacion completada exitosamente!') {
  clack.outro(pc.green(message));
}
