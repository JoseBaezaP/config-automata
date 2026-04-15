/**
 * Tests for src/lib/registry.js
 * Covers: ESC-011, ESC-012, ESC-018
 *
 * Mocks Node's built-in `https` module to simulate GitHub Releases API responses.
 */
import { describe, it, expect, jest, beforeEach } from '@jest/globals';

// ─── Mock infrastructure ──────────────────────────────────────────────────────
// We capture the response callback and error/timeout handlers so each test
// can trigger success, error or timeout programmatically.

let capturedResponseCb = null;
let capturedErrorCb = null;
let capturedTimeoutCb = null;

const mockReq = {
  on: jest.fn((event, cb) => {
    if (event === 'error') capturedErrorCb = cb;
    return mockReq;
  }),
  setTimeout: jest.fn((ms, cb) => {
    capturedTimeoutCb = cb;
    return mockReq;
  }),
  end: jest.fn(),
  destroy: jest.fn(),
};

jest.unstable_mockModule('https', () => ({
  default: {
    request: jest.fn((_options, cb) => {
      capturedResponseCb = cb;
      return mockReq;
    }),
  },
}));

// Dynamic import AFTER mock is registered
const { getLatestVersion, compareVersions } = await import('../src/lib/registry.js');

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Simulates a successful HTTPS response with the given JSON body.
 */
function simulateResponse(jsonBody) {
  const payload = JSON.stringify(jsonBody);
  let dataHandler, endHandler;

  const mockRes = {
    on: jest.fn((event, cb) => {
      if (event === 'data') dataHandler = cb;
      if (event === 'end') endHandler = cb;
    }),
  };

  capturedResponseCb(mockRes);
  dataHandler(payload);
  endHandler();
}

/**
 * Simulates a network error.
 */
function simulateError(message = 'ENOTFOUND api.github.com') {
  capturedErrorCb(new Error(message));
}

/**
 * Simulates a request timeout (calls the setTimeout callback and destroy).
 */
function simulateTimeout() {
  capturedTimeoutCb();
}

// ─── Reset before each test ───────────────────────────────────────────────────
beforeEach(() => {
  jest.clearAllMocks();
  capturedResponseCb = null;
  capturedErrorCb = null;
  capturedTimeoutCb = null;
  mockReq.on.mockImplementation((event, cb) => {
    if (event === 'error') capturedErrorCb = cb;
    return mockReq;
  });
  mockReq.setTimeout.mockImplementation((ms, cb) => {
    capturedTimeoutCb = cb;
    return mockReq;
  });
});

// ─── getLatestVersion ─────────────────────────────────────────────────────────

describe('getLatestVersion', () => {
  it('returns version string when GitHub responds with a release (ESC-011)', async () => {
    const promise = getLatestVersion();
    simulateResponse({ tag_name: 'v1.2.0', name: 'Release 1.2.0' });
    expect(await promise).toBe('1.2.0');
  });

  it('strips the "v" prefix from tag_name', async () => {
    const promise = getLatestVersion();
    simulateResponse({ tag_name: 'v2.0.0' });
    expect(await promise).toBe('2.0.0');
  });

  it('works with tags that have no "v" prefix', async () => {
    const promise = getLatestVersion();
    simulateResponse({ tag_name: '1.5.3' });
    expect(await promise).toBe('1.5.3');
  });

  it('returns null when GitHub is unreachable (no internet) (ESC-012)', async () => {
    const promise = getLatestVersion();
    simulateError('ENOTFOUND api.github.com');
    expect(await promise).toBeNull();
  });

  it('returns null on request timeout', async () => {
    const promise = getLatestVersion();
    simulateTimeout();
    expect(await promise).toBeNull();
  });

  it('calls req.destroy() on timeout', async () => {
    const promise = getLatestVersion();
    simulateTimeout();
    await promise;
    expect(mockReq.destroy).toHaveBeenCalled();
  });

  it('returns null when response body is not valid JSON', async () => {
    const promise = getLatestVersion();

    let dataHandler, endHandler;
    const mockRes = {
      on: jest.fn((event, cb) => {
        if (event === 'data') dataHandler = cb;
        if (event === 'end') endHandler = cb;
      }),
    };
    capturedResponseCb(mockRes);
    dataHandler('not-json{{{');
    endHandler();

    expect(await promise).toBeNull();
  });

  it('returns null when tag_name is absent from response', async () => {
    const promise = getLatestVersion();
    simulateResponse({ name: 'Draft release', draft: true });
    expect(await promise).toBeNull();
  });

  it('sets a 5-second timeout on every request', async () => {
    const promise = getLatestVersion();
    simulateResponse({ tag_name: 'v1.0.0' });
    await promise;
    expect(mockReq.setTimeout).toHaveBeenCalledWith(5000, expect.any(Function));
  });

  it('uses the GitHub API endpoint', async () => {
    const { default: https } = await import('https');
    const promise = getLatestVersion();
    simulateResponse({ tag_name: 'v1.0.0' });
    await promise;
    expect(https.request).toHaveBeenCalledWith(
      expect.objectContaining({
        hostname: 'api.github.com',
        path: expect.stringMatching(/^\/repos\/.+\/releases\/latest$/),
      }),
      expect.any(Function)
    );
  });
});

// ─── compareVersions ──────────────────────────────────────────────────────────

describe('compareVersions', () => {
  it('returns update-available when latest is greater (major)', () => {
    expect(compareVersions('1.0.0', '2.0.0')).toBe('update-available');
  });

  it('returns update-available when latest is greater (minor)', () => {
    expect(compareVersions('1.0.0', '1.2.0')).toBe('update-available');
  });

  it('returns update-available when latest is greater (patch)', () => {
    expect(compareVersions('1.2.0', '1.2.3')).toBe('update-available');
  });

  it('returns up-to-date when versions are equal (ESC-018)', () => {
    expect(compareVersions('1.2.0', '1.2.0')).toBe('up-to-date');
  });

  it('returns up-to-date when installed is higher than latest', () => {
    expect(compareVersions('2.0.0', '1.0.0')).toBe('up-to-date');
  });

  it('returns unknown when installed is null', () => {
    expect(compareVersions(null, '1.2.0')).toBe('unknown');
  });

  it('returns unknown when latest is null', () => {
    expect(compareVersions('1.0.0', null)).toBe('unknown');
  });

  it('returns unknown when both are null', () => {
    expect(compareVersions(null, null)).toBe('unknown');
  });
});
