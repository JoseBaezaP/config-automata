#!/usr/bin/env node
import pc from 'picocolors';
import { install } from '../src/commands/install.js';
import { update } from '../src/commands/update.js';
import { version } from '../src/commands/version.js';

process.on('SIGINT', () => {
  console.log('\nInstalacion cancelada.');
  process.exit(0);
});

const command = process.argv[2] || 'install';

try {
  switch (command) {
    case 'install':
      await install();
      break;
    case 'update':
      await update();
      break;
    case 'version':
      await version();
      break;
    default:
      console.log(pc.yellow(`Comando desconocido: ${command}`));
      console.log('');
      console.log('Uso:');
      console.log(`  ${pc.cyan('npx tba-agent')}              Instalar TBA Agent interactivamente`);
      console.log(`  ${pc.cyan('npx tba-agent install')}      Instalar TBA Agent interactivamente`);
      console.log(`  ${pc.cyan('npx tba-agent update')}       Actualizar instalacion existente`);
      console.log(`  ${pc.cyan('npx tba-agent version')}      Mostrar version instalada y disponible`);
      process.exit(1);
  }
} catch (err) {
  console.error(pc.red(`Error: ${err.message}`));
  process.exit(1);
}
