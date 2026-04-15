import os from 'os';
import path from 'path';
import crypto from 'crypto';
import fsExtra from 'fs-extra';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);

/**
 * Creates a unique temporary directory for test isolation.
 * @returns {Promise<string>} Absolute path to the created tmpdir
 */
export async function createTmpDir() {
  const tmpBase = os.tmpdir();
  const uniqueId = crypto.randomUUID();
  const tmpDir = path.join(tmpBase, `tba-test-${uniqueId}`);
  await fsExtra.ensureDir(tmpDir);
  return tmpDir;
}

/**
 * Removes a temporary directory and all its contents.
 * @param {string} dir
 */
export async function cleanTmpDir(dir) {
  if (dir && await fsExtra.pathExists(dir)) {
    await fsExtra.remove(dir);
  }
}

let _originalHomedir = null;
let _originalCwd = null;

/**
 * Overrides os.homedir() to return a custom directory.
 * Must call restoreHomedir() in afterEach/afterAll.
 * Note: This patches the os module's homedir function.
 * @param {string} dir
 */
export function mockHomedir(dir) {
  _originalHomedir = os.homedir;
  os.homedir = () => dir;
}

/**
 * Restores the original os.homedir() function.
 */
export function restoreHomedir() {
  if (_originalHomedir) {
    os.homedir = _originalHomedir;
    _originalHomedir = null;
  }
}

/**
 * Overrides process.cwd() to return a custom directory.
 * @param {string} dir
 */
export function mockCwd(dir) {
  _originalCwd = process.cwd;
  process.cwd = () => dir;
}

/**
 * Restores the original process.cwd() function.
 */
export function restoreCwd() {
  if (_originalCwd) {
    process.cwd = _originalCwd;
    _originalCwd = null;
  }
}

/**
 * Returns the version from the CLI's package.json.
 * @returns {string}
 */
export function getPackageVersion() {
  try {
    // Resolve from the package root (two levels up from test/helpers/)
    const pkgPath = path.resolve(
      path.dirname(new URL(import.meta.url).pathname),
      '..', '..', 'package.json'
    );
    const pkg = require(pkgPath);
    return pkg.version;
  } catch {
    return '1.0.0';
  }
}
