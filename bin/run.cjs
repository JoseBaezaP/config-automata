#!/usr/bin/env node
'use strict';

var required = 18;
var current = parseInt(process.version.slice(1).split('.')[0], 10);

if (current < required) {
  console.error('');
  console.error('  Error: TBA Agent requiere Node.js ' + required + ' o superior.');
  console.error('  Version actual: ' + process.version);
  console.error('  Descarga la ultima version en: https://nodejs.org');
  console.error('');
  process.exit(1);
}

import('./cli.js').catch(function (err) {
  console.error(err);
  process.exit(1);
});
