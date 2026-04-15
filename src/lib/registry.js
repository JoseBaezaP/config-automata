import https from 'https';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const pkg = require('../../package.json');

/**
 * GitHub repo that hosts the releases for this CLI.
 * Read from package.json → tbaAgent.githubRepo so it's easy to change
 * when the CLI moves to its own dedicated repo.
 *
 * Tags must follow semver: "v1.0.0" or "1.0.0" (the "v" prefix is stripped).
 */
const GITHUB_REPO = pkg.tbaAgent?.githubRepo ?? 'JoseBaezaP/TBA-Orchestrator';

/**
 * Fetches the latest release version from GitHub Releases API.
 * Returns null if the request fails for any reason (no internet, timeout,
 * no releases published yet, etc.) — never throws.
 *
 * @returns {Promise<string | null>} semver string like "1.2.0", or null
 */
export async function getLatestVersion() {
  return new Promise((resolve) => {
    const options = {
      hostname: 'api.github.com',
      path: `/repos/${GITHUB_REPO}/releases/latest`,
      method: 'GET',
      headers: {
        'User-Agent': 'tba-agent-cli',
        'Accept': 'application/vnd.github.v3+json',
      },
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          // Normalize "v1.0.0" → "1.0.0"
          const version = json.tag_name?.replace(/^v/, '') ?? null;
          resolve(version);
        } catch {
          resolve(null);
        }
      });
    });

    // Timeout de 5 segundos — misma política que la versión npm
    req.setTimeout(5000, () => {
      req.destroy();
      resolve(null);
    });

    req.on('error', () => resolve(null));
    req.end();
  });
}

/**
 * Compares two semver version strings.
 *
 * @param {string | null} installed - Currently installed version
 * @param {string | null} latest    - Latest available version from GitHub
 * @returns {'up-to-date' | 'update-available' | 'unknown'}
 */
export function compareVersions(installed, latest) {
  if (!installed || !latest) return 'unknown';

  const parse = (v) => v.split('.').map(Number);
  const [iMaj, iMin, iPatch] = parse(installed);
  const [lMaj, lMin, lPatch] = parse(latest);

  if (lMaj > iMaj) return 'update-available';
  if (lMaj === iMaj && lMin > iMin) return 'update-available';
  if (lMaj === iMaj && lMin === iMin && lPatch > iPatch) return 'update-available';

  return 'up-to-date';
}
