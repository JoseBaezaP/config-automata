/**
 * Configuración de Azure DevOps Personal Access Token (PAT)
 * 
 * INSTRUCCIONES:
 * 1. Reemplaza "TU_PAT_AQUI" con tu Personal Access Token de Azure DevOps
 * 2. Para generar un PAT:
 *    - Ve a: https://dev.azure.com/{tu-organizacion}/_usersSettings/tokens
 *    - Crea un nuevo token con permisos:
 *      * Work Items: Read, Write, Manage
 *      * Wiki: Read & Write
 *    - Copia el token y pégalo aquí
 * 3. NUNCA compartas este archivo públicamente (está en .gitignore)
 * 
 * IMPORTANTE: Este token es sensible y tiene acceso a tu organización de Azure DevOps.
 * Manténlo seguro y nunca lo incluyas en commits de git.
 */

module.exports = {
  /**
   * Personal Access Token de Azure DevOps
   * @type {string}
   */
  AZURE_DEVOPS_PAT: "TU_PAT_AQUI",

  /**
   * Organización de Azure DevOps (opcional, puede ser sobrescrito en runtime)
   * @type {string}
   */
  DEFAULT_ORGANIZATION: "hebmexico",

  /**
   * Proyecto por defecto (opcional, puede ser sobrescrito en runtime)
   * @type {string}
   */
  DEFAULT_PROJECT: "Dev - Product and Technology"
};
