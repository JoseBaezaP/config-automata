/**
 * Integration tests for commands: install, update, version
 * Covers: ESC-001, ESC-004, ESC-008, ESC-009, ESC-011, ESC-013, ESC-019
 *
 * Mocks: @clack/prompts (UI), src/lib/registry.js (GitHub Releases)
 * Real filesystem in tmpdir for manifest and asset copy verification.
 */
import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import path from 'path';
import fs from 'fs';
import fsExtra from 'fs-extra';
import { createTmpDir, cleanTmpDir } from './helpers/setup.js';

// ---- Mocks set up BEFORE dynamic imports ----

const mockClack = {
  intro: jest.fn(),
  outro: jest.fn(),
  select: jest.fn(),
  confirm: jest.fn(),
  password: jest.fn().mockResolvedValue(''),
  text: jest.fn().mockResolvedValue(''),
  spinner: jest.fn(() => ({ start: jest.fn(), stop: jest.fn() })),
  note: jest.fn(),
  log: {
    success: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    message: jest.fn(),
  },
  isCancel: jest.fn((val) => val === Symbol.for('clack.cancel')),
};

const CANCEL_SYMBOL = Symbol.for('clack.cancel');

// Mock registry.js directly — https internals are covered in registry.test.js
const mockRegistry = {
  getLatestVersion: jest.fn().mockResolvedValue(null),
  compareVersions: jest.fn().mockReturnValue('unknown'),
};

jest.unstable_mockModule('@clack/prompts', () => mockClack);
jest.unstable_mockModule('figlet', () => ({
  default: { textSync: jest.fn(() => 'TBA AGENT') },
}));
jest.unstable_mockModule('../src/lib/registry.js', () => mockRegistry);

// Dynamic imports after mocks
const { install } = await import('../src/commands/install.js');
const { update } = await import('../src/commands/update.js');
const { version } = await import('../src/commands/version.js');

let tmpDir;
let originalCwd;
let originalExit;
let exitCode;

beforeEach(async () => {
  jest.clearAllMocks();
  mockClack.spinner.mockReturnValue({ start: jest.fn(), stop: jest.fn() });
  mockClack.isCancel.mockImplementation((val) => val === CANCEL_SYMBOL);

  tmpDir = await createTmpDir();
  originalCwd = process.cwd;
  process.cwd = () => tmpDir;

  const os = (await import('os')).default;
  os._originalHomedir = os.homedir;
  os.homedir = () => tmpDir;

  // Mock process.exit to prevent test termination
  exitCode = null;
  originalExit = process.exit;
  process.exit = jest.fn((code) => {
    exitCode = code;
    throw new Error(`process.exit(${code})`);
  });
});

afterEach(async () => {
  process.cwd = originalCwd;
  process.exit = originalExit;

  const os = (await import('os')).default;
  if (os._originalHomedir) {
    os.homedir = os._originalHomedir;
    delete os._originalHomedir;
  }

  await cleanTmpDir(tmpDir);
});

// ---- Helper to set up clack mock responses ----
function setupInstallFlow({ assistant = 'claude', scope = 'global', overwrite = null } = {}) {
  // selectAssistant returns assistant value
  mockClack.select
    .mockResolvedValueOnce(assistant) // selectAssistant
    .mockResolvedValueOnce(scope);    // selectScope

  if (overwrite !== null) {
    mockClack.confirm.mockResolvedValueOnce(overwrite);
  }
}

// ---- install command tests ----

describe('install command', () => {
  it('ESC-001: completes installation for Claude Code global, writes manifest', async () => {
    setupInstallFlow({ assistant: 'claude', scope: 'global' });

    await install();

    // Manifest should exist in tmpDir (which is homedir for global)
    const manifestPath = path.join(tmpDir, '.tba-kit.json');
    expect(fs.existsSync(manifestPath)).toBe(true);

    const manifest = await fsExtra.readJson(manifestPath);
    expect(manifest.assistant).toBe('claude');
    expect(manifest.scope).toBe('global');
    expect(manifest.version).toBeDefined();
    expect(manifest.installedAt).toBeDefined();

    // Agents and skills should be in place
    const agentsDir = path.join(tmpDir, '.claude', 'agents');
    expect(fs.existsSync(agentsDir)).toBe(true);
  });

  it('ESC-004: asks for overwrite confirmation when manifest already exists', async () => {
    // Pre-write a manifest to simulate existing installation
    await fsExtra.outputJson(path.join(tmpDir, '.tba-kit.json'), {
      version: '0.9.0',
      assistant: 'claude',
      scope: 'global',
      installedAt: new Date().toISOString(),
    });

    setupInstallFlow({ assistant: 'claude', scope: 'global', overwrite: true });

    await install();

    // confirm called twice: once for overwrite, once for askProductoConfig
    expect(mockClack.confirm).toHaveBeenCalledTimes(2);

    // Installation should complete, manifest updated
    const manifest = await fsExtra.readJson(path.join(tmpDir, '.tba-kit.json'));
    expect(manifest.version).toBeDefined();
  });

  it('ESC-004: stops installation if user declines overwrite', async () => {
    // Pre-write a manifest
    await fsExtra.outputJson(path.join(tmpDir, '.tba-kit.json'), {
      version: '0.9.0',
      assistant: 'claude',
      scope: 'global',
      installedAt: new Date().toISOString(),
    });

    // Setup: select claude+global, then decline overwrite
    mockClack.select
      .mockResolvedValueOnce('claude')
      .mockResolvedValueOnce('global');
    mockClack.confirm.mockResolvedValueOnce(false); // decline

    await expect(install()).rejects.toThrow('process.exit(0)');
    expect(exitCode).toBe(0);
  });

  it('ESC-019: cancelling assistant selection exits with code 0 and no files (ESC-019)', async () => {
    // selectAssistant returns cancel symbol
    mockClack.select.mockResolvedValueOnce(CANCEL_SYMBOL);
    mockClack.isCancel.mockImplementation((val) => val === CANCEL_SYMBOL);

    await expect(install()).rejects.toThrow('process.exit(0)');
    expect(exitCode).toBe(0);

    // No agents or skills should have been copied
    const agentsDir = path.join(tmpDir, '.claude', 'agents');
    expect(fs.existsSync(agentsDir)).toBe(false);
  });

  it('ESC-019: cancelling scope selection exits with code 0', async () => {
    mockClack.select
      .mockResolvedValueOnce('claude')           // assistant selection succeeds
      .mockResolvedValueOnce(CANCEL_SYMBOL);     // scope selection is cancelled
    mockClack.isCancel.mockImplementation((val) => val === CANCEL_SYMBOL);

    await expect(install()).rejects.toThrow('process.exit(0)');
    expect(exitCode).toBe(0);
  });
});

// ---- update command tests ----

describe('update command', () => {
  it('ESC-008: updates existing installation and updates manifest', async () => {
    // Pre-write a manifest with old version
    await fsExtra.outputJson(path.join(tmpDir, '.tba-kit.json'), {
      version: '0.9.0',
      assistant: 'claude',
      scope: 'project',
      installedAt: '2024-01-01T00:00:00.000Z',
    });

    await update();

    // Manifest should have updated version and installedAt
    const manifest = await fsExtra.readJson(path.join(tmpDir, '.tba-kit.json'));
    expect(manifest.version).toBeDefined();
    // installedAt should have changed (or at least be defined)
    expect(manifest.installedAt).not.toBe('2024-01-01T00:00:00.000Z');
  });

  it('ESC-009: shows error and exits 1 when no manifest exists', async () => {
    // No manifest in tmpDir

    await expect(update()).rejects.toThrow('process.exit(1)');
    expect(exitCode).toBe(1);

    // Error should have been shown
    expect(mockClack.log.error).toHaveBeenCalledTimes(1);
    const errorMsg = mockClack.log.error.mock.calls[0][0];
    expect(errorMsg).toContain('instalacion previa');
  });
});

// ---- version command tests ----

describe('version command', () => {
  it('ESC-011: shows installed and available versions with update notice', async () => {
    await fsExtra.outputJson(path.join(tmpDir, '.tba-kit.json'), {
      version: '1.0.0',
      assistant: 'claude',
      scope: 'project',
      installedAt: new Date().toISOString(),
    });

    // GitHub Releases returns newer version
    mockRegistry.getLatestVersion.mockResolvedValueOnce('1.2.0');
    mockRegistry.compareVersions.mockReturnValueOnce('update-available');

    const consoleLogs = [];
    const origLog = console.log;
    console.log = (...args) => consoleLogs.push(args.join(' '));

    await version();

    console.log = origLog;

    const output = consoleLogs.join('\n');
    expect(output).toContain('1.0.0');
    expect(output).toContain('1.2.0');
    expect(output).toContain('Actualizacion');
  });

  it('ESC-013: shows no installation message when manifest does not exist', async () => {
    // No manifest — getLatestVersion returns something so we verify the "no install" path
    mockRegistry.getLatestVersion.mockResolvedValueOnce('1.0.0');

    const consoleLogs = [];
    const origLog = console.log;
    console.log = (...args) => consoleLogs.push(args.join(' '));

    await version();

    console.log = origLog;

    const output = consoleLogs.join('\n');
    expect(output).toContain('instalacion previa');
  });

  it('ESC-012: shows N/A when GitHub is unreachable (sin conexion)', async () => {
    // getLatestVersion returns null when GitHub is unreachable
    mockRegistry.getLatestVersion.mockResolvedValueOnce(null);

    const consoleLogs = [];
    const origLog = console.log;
    console.log = (...args) => consoleLogs.push(args.join(' '));

    await version();

    console.log = origLog;

    const output = consoleLogs.join('\n');
    expect(output).toContain('N/A');
  });

  it('ESC-018: shows up-to-date message when versions match', async () => {
    await fsExtra.outputJson(path.join(tmpDir, '.tba-kit.json'), {
      version: '1.2.0',
      assistant: 'claude',
      scope: 'project',
      installedAt: new Date().toISOString(),
    });

    mockRegistry.getLatestVersion.mockResolvedValueOnce('1.2.0');
    mockRegistry.compareVersions.mockReturnValueOnce('up-to-date');

    const consoleLogs = [];
    const origLog = console.log;
    console.log = (...args) => consoleLogs.push(args.join(' '));

    await version();

    console.log = origLog;

    const output = consoleLogs.join('\n');
    expect(output).toContain('ultima version');
  });
});
