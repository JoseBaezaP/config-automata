/**
 * Tests for src/lib/installer.js
 * Covers: ESC-001, ESC-002, ESC-003, ESC-005, ESC-006, ESC-007
 *
 * Uses tmpdir as destination, real assets as source.
 */
import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import path from 'path';
import fs from 'fs';
import fsExtra from 'fs-extra';
import { createTmpDir, cleanTmpDir } from './helpers/setup.js';
import { getAssetsDir, getDestinationPaths, installAssets, configureAzurePAT, configureProductos } from '../src/lib/installer.js';

let tmpDir;
let originalCwd;
let originalHomedir;

beforeEach(async () => {
  tmpDir = await createTmpDir();

  // Override process.cwd and os.homedir to point to tmpDir
  originalCwd = process.cwd;
  process.cwd = () => tmpDir;

  const os = (await import('os')).default;
  originalHomedir = os.homedir.bind(os);
  os.homedir = () => tmpDir;
});

afterEach(async () => {
  process.cwd = originalCwd;

  const os = (await import('os')).default;
  os.homedir = originalHomedir;

  await cleanTmpDir(tmpDir);
});

describe('getAssetsDir', () => {
  it('returns an existing directory path', () => {
    const assetsDir = getAssetsDir();
    expect(fs.existsSync(assetsDir)).toBe(true);
  });

  it('contains expected subdirectories', () => {
    const assetsDir = getAssetsDir();
    expect(fs.existsSync(path.join(assetsDir, 'claude'))).toBe(true);
    expect(fs.existsSync(path.join(assetsDir, 'opencode'))).toBe(true);
    expect(fs.existsSync(path.join(assetsDir, 'copilot'))).toBe(true);
    expect(fs.existsSync(path.join(assetsDir, 'skills'))).toBe(true);
  });

  it('has claude/agents subdirectory and shared skills directory', () => {
    const assetsDir = getAssetsDir();
    expect(fs.existsSync(path.join(assetsDir, 'claude', 'agents'))).toBe(true);
    expect(fs.existsSync(path.join(assetsDir, 'skills'))).toBe(true);
  });
});

describe('installAssets — Claude Code (ESC-001, ESC-007)', () => {
  it('installs Claude agents and claude-specific skills to correct paths (ESC-001)', async () => {
    const result = await installAssets({ assistant: 'claude', scope: 'global' });

    expect(result.copiedFiles).toBeDefined();
    expect(Array.isArray(result.copiedFiles)).toBe(true);
    expect(result.copiedFiles.length).toBeGreaterThan(0);

    // Verify agents were copied to correct destination
    const agentsDir = path.join(tmpDir, '.claude', 'agents');
    expect(fs.existsSync(agentsDir)).toBe(true);

    // Verify at least one agent file was copied
    const agentFiles = fs.readdirSync(agentsDir);
    expect(agentFiles.length).toBeGreaterThan(0);
  });

  it('uses shared skills source for Claude (ESC-007)', async () => {
    const assetsDir = getAssetsDir();
    const sharedSkillsDir = path.join(assetsDir, 'skills');
    const sharedSkills = fs.readdirSync(sharedSkillsDir).sort();

    await installAssets({ assistant: 'claude', scope: 'project' });

    const installedSkillsDir = path.join(tmpDir, '.claude', 'skills');
    const installedSkills = fs.readdirSync(installedSkillsDir).sort();

    // Claude skills should match shared source
    expect(installedSkills).toEqual(sharedSkills);
  });
});

describe('installAssets — OpenCode (ESC-002)', () => {
  it('installs OpenCode agents and shared skills to correct paths', async () => {
    const result = await installAssets({ assistant: 'opencode', scope: 'project' });

    expect(result.copiedFiles.length).toBeGreaterThan(0);

    // Verify agents dir
    const agentsDir = path.join(tmpDir, '.opencode', 'agents');
    expect(fs.existsSync(agentsDir)).toBe(true);

    const agentFiles = fs.readdirSync(agentsDir);
    expect(agentFiles.length).toBeGreaterThan(0);

    // Verify skills dir
    const skillsDir = path.join(tmpDir, '.opencode', 'skills');
    expect(fs.existsSync(skillsDir)).toBe(true);

    const skillFiles = fs.readdirSync(skillsDir);
    expect(skillFiles.length).toBeGreaterThan(0);
  });

  it('uses shared skills (not claude skills) for OpenCode', async () => {
    const assetsDir = getAssetsDir();
    const sharedSkillsDir = path.join(assetsDir, 'skills');
    const sharedSkills = fs.readdirSync(sharedSkillsDir).sort();

    await installAssets({ assistant: 'opencode', scope: 'global' });

    const installedSkillsDir = path.join(tmpDir, '.opencode', 'skills');
    const installedSkills = fs.readdirSync(installedSkillsDir).sort();

    expect(installedSkills).toEqual(sharedSkills);
  });
});

describe('installAssets — GitHub Copilot (ESC-003)', () => {
  it('installs Copilot agents and shared skills to correct paths', async () => {
    const result = await installAssets({ assistant: 'copilot', scope: 'project' });

    expect(result.copiedFiles.length).toBeGreaterThan(0);

    // Verify agents dir
    const agentsDir = path.join(tmpDir, '.github', 'agents');
    expect(fs.existsSync(agentsDir)).toBe(true);

    const agentFiles = fs.readdirSync(agentsDir);
    expect(agentFiles.length).toBeGreaterThan(0);

    // Verify skills dir
    const skillsDir = path.join(tmpDir, '.github', 'skills');
    expect(fs.existsSync(skillsDir)).toBe(true);

    // Copilot no longer installs extra files (copilot-instructions.md / vscode-settings.json)
    expect(result.copiedFiles.some((f) => f.includes('copilot-instructions'))).toBe(false);
  });
});

describe('ESC-005: Destination directory auto-creation', () => {
  it('creates destination directories automatically if they do not exist', async () => {
    // Ensure directories don't exist before install
    const agentsDir = path.join(tmpDir, '.claude', 'agents');
    const skillsDir = path.join(tmpDir, '.claude', 'skills');

    expect(fs.existsSync(agentsDir)).toBe(false);
    expect(fs.existsSync(skillsDir)).toBe(false);

    await installAssets({ assistant: 'claude', scope: 'project' });

    expect(fs.existsSync(agentsDir)).toBe(true);
    expect(fs.existsSync(skillsDir)).toBe(true);
  });
});

describe('ESC-006: Permission error handling', () => {
  it('throws EACCES error with human-readable message on permission denied', async () => {
    // Create a read-only destination directory
    const readOnlyDir = path.join(tmpDir, 'readonly-parent');
    await fsExtra.ensureDir(readOnlyDir);

    // Make it read-only
    fs.chmodSync(readOnlyDir, 0o444);

    // Override homedir to the read-only parent to trigger EACCES
    const os = (await import('os')).default;
    const prevHomedir = os.homedir;
    os.homedir = () => readOnlyDir;

    try {
      await installAssets({ assistant: 'claude', scope: 'global' });
      // If we get here, skip the test (CI may run as root)
    } catch (err) {
      expect(err.code).toBe('EACCES');
      expect(err.message).toContain('Permiso denegado');
      expect(err.message).toContain('project');
    } finally {
      os.homedir = prevHomedir;
      // Restore permissions for cleanup
      try {
        fs.chmodSync(readOnlyDir, 0o755);
      } catch {
        // Ignore cleanup errors
      }
    }
  });
});

describe('configureAzurePAT', () => {
  it('writes the PAT into azure-pat.js', async () => {
    await installAssets({ assistant: 'claude', scope: 'project' });

    const patFilePath = path.join(tmpDir, '.claude', 'skills', 'create-azure-workitems', 'config', 'azure-pat.js');
    expect(fs.existsSync(patFilePath)).toBe(true);

    await configureAzurePAT(path.join(tmpDir, '.claude', 'skills'), 'my-real-pat', 'project');

    const content = fs.readFileSync(patFilePath, 'utf-8');
    expect(content).toContain('AZURE_DEVOPS_PAT: "my-real-pat"');
  });

  it('adds azure-pat.js to .gitignore for project scope', async () => {
    await installAssets({ assistant: 'claude', scope: 'project' });
    await configureAzurePAT(path.join(tmpDir, '.claude', 'skills'), 'my-real-pat', 'project');

    const gitignorePath = path.join(tmpDir, '.gitignore');
    expect(fs.existsSync(gitignorePath)).toBe(true);

    const gitignoreContent = fs.readFileSync(gitignorePath, 'utf-8');
    expect(gitignoreContent).toContain('azure-pat.js');
  });

  it('does not modify .gitignore for global scope', async () => {
    await installAssets({ assistant: 'claude', scope: 'global' });
    await configureAzurePAT(path.join(tmpDir, '.claude', 'skills'), 'my-real-pat', 'global');

    const gitignorePath = path.join(tmpDir, '.gitignore');
    expect(fs.existsSync(gitignorePath)).toBe(false);
  });

  it('does nothing if PAT is empty', async () => {
    await installAssets({ assistant: 'claude', scope: 'project' });

    const patFilePath = path.join(tmpDir, '.claude', 'skills', 'create-azure-workitems', 'config', 'azure-pat.js');
    const before = fs.readFileSync(patFilePath, 'utf-8');

    await configureAzurePAT(path.join(tmpDir, '.claude', 'skills'), '', 'project');

    const after = fs.readFileSync(patFilePath, 'utf-8');
    expect(after).toBe(before);
  });

  it('does not duplicate .gitignore entry on repeated calls', async () => {
    await installAssets({ assistant: 'claude', scope: 'project' });
    await configureAzurePAT(path.join(tmpDir, '.claude', 'skills'), 'pat1', 'project');
    await configureAzurePAT(path.join(tmpDir, '.claude', 'skills'), 'pat2', 'project');

    const gitignoreContent = fs.readFileSync(path.join(tmpDir, '.gitignore'), 'utf-8');
    const occurrences = (gitignoreContent.match(/azure-pat\.js/g) || []).length;
    expect(occurrences).toBe(1);
  });
});

describe('configureProductos', () => {
  const sampleConfig = {
    nombre: 'Fulfillment',
    tba: 'Jose Baeza',
    organizacion: 'hebmexico',
    proyecto: 'Dev - Product and Technology',
    areaPath: 'Dev - Product and Technology\\Fulfillment IMS',
    wikiId: 'Dev---Product-and-Technology.wiki',
  };

  it('writes config to create-azure-workitems/config/productos.json', async () => {
    await installAssets({ assistant: 'claude', scope: 'project' });
    const skillsDir = path.join(tmpDir, '.claude', 'skills');
    await configureProductos(skillsDir, sampleConfig);

    const primaryPath = path.join(skillsDir, 'create-azure-workitems', 'config', 'productos.json');
    const raw = fs.readFileSync(primaryPath, 'utf-8');

    expect(raw).toContain('"TBA": "Jose Baeza"');
    expect(raw).toContain('"organizacion": "hebmexico"');
    expect(raw).toContain('"tba_proyecto": "Dev - Product and Technology"');
    expect(raw).toContain('"wiki_id": "Dev---Product-and-Technology.wiki"');
    // area_path stored with single backslash in file
    expect(raw).toContain('"area_path": "Dev - Product and Technology\\Fulfillment IMS"');
    expect(raw).not.toContain('\\\\');
  });

  it('writes optional fields when provided', async () => {
    await installAssets({ assistant: 'claude', scope: 'project' });
    const skillsDir = path.join(tmpDir, '.claude', 'skills');

    await configureProductos(skillsDir, {
      ...sampleConfig,
      productType: 'DIF',
      productOwners: ['Oscar Almaguer', 'Chuck Covian'],
      scrumMasters: ['Rocio Garza'],
      lideresTecnicos: ['David Morales'],
    });

    const raw = fs.readFileSync(
      path.join(skillsDir, 'create-azure-workitems', 'config', 'productos.json'),
      'utf-8'
    );
    expect(raw).toContain('"product_type": "DIF"');
    expect(raw).toContain('"Oscar Almaguer"');
    expect(raw).toContain('"Rocio Garza"');
    expect(raw).toContain('"David Morales"');
  });

  it('normalizes double backslash in area_path input to single backslash in file', async () => {
    await installAssets({ assistant: 'claude', scope: 'project' });
    const skillsDir = path.join(tmpDir, '.claude', 'skills');

    await configureProductos(skillsDir, {
      ...sampleConfig,
      areaPath: 'Dev - Product and Technology\\\\Fulfillment IMS', // double backslash input
    });

    const raw = fs.readFileSync(
      path.join(skillsDir, 'create-azure-workitems', 'config', 'productos.json'),
      'utf-8'
    );
    expect(raw).toContain('"area_path": "Dev - Product and Technology\\Fulfillment IMS"');
    expect(raw).not.toContain('\\\\');
  });

  it('creates symlink at generate-wiki/config/productos.json pointing to primary', async () => {
    await installAssets({ assistant: 'claude', scope: 'project' });
    const skillsDir = path.join(tmpDir, '.claude', 'skills');
    const { symlinked } = await configureProductos(skillsDir, sampleConfig);

    if (symlinked) {
      const symlinkPath = path.join(skillsDir, 'generate-wiki', 'config', 'productos.json');
      const stat = fs.lstatSync(symlinkPath);
      expect(stat.isSymbolicLink()).toBe(true);

      // Both files should return the same raw content
      const primary = fs.readFileSync(path.join(skillsDir, 'create-azure-workitems', 'config', 'productos.json'), 'utf-8');
      const linked  = fs.readFileSync(symlinkPath, 'utf-8');
      expect(linked).toBe(primary);
    }
    // On Windows without permissions, symlinked=false is acceptable — just verify file exists
    const symlinkPath = path.join(skillsDir, 'generate-wiki', 'config', 'productos.json');
    expect(fs.existsSync(symlinkPath)).toBe(true);
  });

  it('modifying primary updates symlinked file', async () => {
    await installAssets({ assistant: 'claude', scope: 'project' });
    const skillsDir = path.join(tmpDir, '.claude', 'skills');
    const { symlinked } = await configureProductos(skillsDir, sampleConfig);

    if (!symlinked) return; // Skip on Windows fallback

    const primaryPath = path.join(skillsDir, 'create-azure-workitems', 'config', 'productos.json');
    const symlinkPath = path.join(skillsDir, 'generate-wiki', 'config', 'productos.json');

    // Modify primary directly
    const current = fs.readFileSync(primaryPath, 'utf-8');
    fs.writeFileSync(primaryPath, current.replace('"Jose Baeza"', '"Nuevo TBA"'), 'utf-8');

    // Symlink should reflect the change
    const linked = fs.readFileSync(symlinkPath, 'utf-8');
    expect(linked).toContain('"Nuevo TBA"');
  });

  it('works with null config — only creates symlink', async () => {
    await installAssets({ assistant: 'claude', scope: 'project' });
    const skillsDir = path.join(tmpDir, '.claude', 'skills');
    const { symlinked } = await configureProductos(skillsDir, null);

    const symlinkPath = path.join(skillsDir, 'generate-wiki', 'config', 'productos.json');
    expect(fs.existsSync(symlinkPath)).toBe(true);

    if (symlinked) {
      expect(fs.lstatSync(symlinkPath).isSymbolicLink()).toBe(true);
    }
  });
});

describe('getDestinationPaths', () => {
  it('returns correct paths for claude global scope', () => {
    const paths = getDestinationPaths('claude', 'global');
    expect(paths.agentsDir).toContain('.claude');
    expect(paths.agentsDir).toContain('agents');
    expect(paths.skillsDir).toContain('.claude');
    expect(paths.skillsDir).toContain('skills');
    expect(paths.extras).toHaveLength(0);
  });

  it('returns correct paths for opencode project scope', () => {
    const paths = getDestinationPaths('opencode', 'project');
    expect(paths.agentsDir).toContain('.opencode');
    expect(paths.skillsDir).toContain('.opencode');
    expect(paths.extras).toHaveLength(0);
  });

  it('returns correct paths for copilot project scope (no extras)', () => {
    const paths = getDestinationPaths('copilot', 'project');
    expect(paths.agentsDir).toContain('.github');
    expect(paths.skillsDir).toContain('.github');
    expect(paths.extras).toHaveLength(0);
  });
});
