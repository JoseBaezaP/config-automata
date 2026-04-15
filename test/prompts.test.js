/**
 * Tests for src/ui/prompts.js
 * Verifies that prompts call @clack/prompts with correct parameters.
 *
 * Uses jest.unstable_mockModule for ESM mocking.
 */
import { describe, it, expect, jest, beforeEach } from '@jest/globals';

// Mock @clack/prompts before importing prompts.js
const mockClack = {
  intro: jest.fn(),
  outro: jest.fn(),
  select: jest.fn(),
  confirm: jest.fn(),
  password: jest.fn(),
  text: jest.fn(),
  spinner: jest.fn(() => ({ start: jest.fn(), stop: jest.fn() })),
  note: jest.fn(),
  log: {
    success: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    message: jest.fn(),
  },
  isCancel: jest.fn(() => false),
};

// Mock figlet before importing prompts.js
const mockFiglet = {
  textSync: jest.fn(() => 'TBA AGENT ASCII'),
};

jest.unstable_mockModule('@clack/prompts', () => mockClack);
jest.unstable_mockModule('figlet', () => ({ default: mockFiglet }));

const {
  showHeader,
  selectAssistant,
  selectScope,
  askAzurePAT,
  askProductoConfig,
  showProductosLocation,
  confirmOverwrite,
  showProgress,
  showFileList,
  showNextSteps,
  showError,
  showCancelled,
  showSuccess,
} = await import('../src/ui/prompts.js');

beforeEach(() => {
  jest.clearAllMocks();
  // Reset spinner mock to return a fresh object each time
  mockClack.spinner.mockReturnValue({ start: jest.fn(), stop: jest.fn() });
});

describe('showHeader', () => {
  it('calls figlet.textSync with TBA Agent', () => {
    showHeader();
    expect(mockFiglet.textSync).toHaveBeenCalledWith('TBA Agent', expect.any(Object));
  });

  it('calls clack.intro', () => {
    showHeader();
    expect(mockClack.intro).toHaveBeenCalled();
  });
});

describe('selectAssistant', () => {
  it('calls clack.select with 3 assistant options', async () => {
    mockClack.select.mockResolvedValueOnce('claude');
    await selectAssistant();

    expect(mockClack.select).toHaveBeenCalledTimes(1);
    const callArgs = mockClack.select.mock.calls[0][0];
    expect(callArgs.options).toHaveLength(3);

    const values = callArgs.options.map((o) => o.value);
    expect(values).toContain('claude');
    expect(values).toContain('opencode');
    expect(values).toContain('copilot');
  });

  it('includes Claude Code as an option', async () => {
    mockClack.select.mockResolvedValueOnce('claude');
    await selectAssistant();

    const callArgs = mockClack.select.mock.calls[0][0];
    const claudeOption = callArgs.options.find((o) => o.value === 'claude');
    expect(claudeOption).toBeDefined();
    expect(claudeOption.label).toContain('Claude');
  });
});

describe('selectScope', () => {
  it('calls clack.select with 2 scope options', async () => {
    mockClack.select.mockResolvedValueOnce('global');
    await selectScope('claude');

    expect(mockClack.select).toHaveBeenCalledTimes(1);
    const callArgs = mockClack.select.mock.calls[0][0];
    expect(callArgs.options).toHaveLength(2);

    const values = callArgs.options.map((o) => o.value);
    expect(values).toContain('global');
    expect(values).toContain('project');
  });
});

describe('askAzurePAT', () => {
  it('calls clack.password', async () => {
    mockClack.password.mockResolvedValueOnce('my-secret-pat');
    await askAzurePAT();
    expect(mockClack.password).toHaveBeenCalledTimes(1);
  });

  it('uses a mask character', async () => {
    mockClack.password.mockResolvedValueOnce('');
    await askAzurePAT();
    const callArgs = mockClack.password.mock.calls[0][0];
    expect(callArgs.mask).toBeDefined();
  });

  it('returns the value from clack.password', async () => {
    mockClack.password.mockResolvedValueOnce('abc123');
    const result = await askAzurePAT();
    expect(result).toBe('abc123');
  });
});

describe('askProductoConfig', () => {
  it('returns null when user declines', async () => {
    mockClack.confirm.mockResolvedValueOnce(false);
    const result = await askProductoConfig();
    expect(result).toBeNull();
    expect(mockClack.text).not.toHaveBeenCalled();
  });

  it('asks 6 required fields then skips optional when user declines', async () => {
    mockClack.confirm
      .mockResolvedValueOnce(true)   // wants main config
      .mockResolvedValueOnce(false); // skips optional
    mockClack.text
      .mockResolvedValueOnce('Fulfillment')
      .mockResolvedValueOnce('Jose Baeza')
      .mockResolvedValueOnce('hebmexico')
      .mockResolvedValueOnce('Dev - Product and Technology')
      .mockResolvedValueOnce('Dev - Product and Technology\\Fulfillment IMS')
      .mockResolvedValueOnce('Dev---Product-and-Technology.wiki');

    const result = await askProductoConfig();

    expect(mockClack.text).toHaveBeenCalledTimes(6);
    expect(result).toMatchObject({
      nombre: 'Fulfillment',
      tba: 'Jose Baeza',
      skippedOptional: true,
    });
    expect(result.productOwners).toBeUndefined();
  });

  it('collects optional fields when user accepts', async () => {
    mockClack.confirm
      .mockResolvedValueOnce(true)  // wants main config
      .mockResolvedValueOnce(true); // wants optional
    mockClack.text
      .mockResolvedValueOnce('Fulfillment')
      .mockResolvedValueOnce('Jose Baeza')
      .mockResolvedValueOnce('hebmexico')
      .mockResolvedValueOnce('Dev - Product and Technology')
      .mockResolvedValueOnce('Dev - Product and Technology\\Fulfillment IMS')
      .mockResolvedValueOnce('Dev---Product-and-Technology.wiki')
      .mockResolvedValueOnce('DIF')                              // productType
      .mockResolvedValueOnce('Oscar Almaguer, Chuck Cov')     // productOwners
      .mockResolvedValueOnce('Rocio Garza')                      // scrumMasters
      .mockResolvedValueOnce('David Morales, Jose Roque Solis'); // lideresTecnicos

    const result = await askProductoConfig();

    expect(result.productType).toBe('DIF');
    expect(result.productOwners).toEqual(['Oscar Almaguer', 'Chuck Cov']);
    expect(result.scrumMasters).toEqual(['Rocio Garza']);
    expect(result.lideresTecnicos).toEqual(['David Morales', 'Jose Roque Solis']);
    expect(result.skippedOptional).toBeUndefined();
  });

  it('propagates cancel symbol from confirm', async () => {
    const cancelSymbol = Symbol.for('clack.cancel');
    mockClack.confirm.mockResolvedValueOnce(cancelSymbol);
    mockClack.isCancel.mockReturnValueOnce(true);
    const result = await askProductoConfig();
    expect(result).toBe(cancelSymbol);
  });
});

describe('showProductosLocation', () => {
  it('calls clack.note with the skills dir path', () => {
    showProductosLocation('/home/user/.claude/skills');
    expect(mockClack.note).toHaveBeenCalledTimes(1);
    const content = mockClack.note.mock.calls[0][0];
    expect(content).toContain('/home/user/.claude/skills');
    expect(content).toContain('create-azure-workitems');
  });
});

describe('confirmOverwrite', () => {
  it('calls clack.confirm', async () => {
    mockClack.confirm.mockResolvedValueOnce(true);
    await confirmOverwrite();
    expect(mockClack.confirm).toHaveBeenCalledTimes(1);
  });

  it('asks about overwriting', async () => {
    mockClack.confirm.mockResolvedValueOnce(false);
    await confirmOverwrite();
    const callArgs = mockClack.confirm.mock.calls[0][0];
    expect(callArgs.message).toBeDefined();
    expect(typeof callArgs.message).toBe('string');
  });
});

describe('showProgress', () => {
  it('starts a clack spinner with the given message', () => {
    const spinnerMock = { start: jest.fn(), stop: jest.fn() };
    mockClack.spinner.mockReturnValueOnce(spinnerMock);

    showProgress('Copiando archivos...');

    expect(mockClack.spinner).toHaveBeenCalledTimes(1);
    expect(spinnerMock.start).toHaveBeenCalledWith('Copiando archivos...');
  });

  it('returns the spinner object', () => {
    const spinnerMock = { start: jest.fn(), stop: jest.fn() };
    mockClack.spinner.mockReturnValueOnce(spinnerMock);

    const result = showProgress('test');
    expect(result).toBe(spinnerMock);
  });
});

describe('showNextSteps', () => {
  it('calls clack.note for Claude assistant', () => {
    showNextSteps('claude');
    expect(mockClack.note).toHaveBeenCalledTimes(1);
    const content = mockClack.note.mock.calls[0][0];
    expect(content).toContain('Claude');
  });

  it('calls clack.note for OpenCode assistant', () => {
    showNextSteps('opencode');
    expect(mockClack.note).toHaveBeenCalledTimes(1);
    const content = mockClack.note.mock.calls[0][0];
    expect(content).toContain('OpenCode');
  });

  it('calls clack.note for Copilot assistant with different content', () => {
    showNextSteps('copilot');
    expect(mockClack.note).toHaveBeenCalledTimes(1);
    const content = mockClack.note.mock.calls[0][0];
    expect(content).toContain('Code');
  });

  it('generates different output for each assistant', () => {
    showNextSteps('claude');
    const claudeContent = mockClack.note.mock.calls[0][0];

    jest.clearAllMocks();

    showNextSteps('opencode');
    const opencodeContent = mockClack.note.mock.calls[0][0];

    expect(claudeContent).not.toBe(opencodeContent);
  });
});

describe('showError', () => {
  it('calls clack.log.error', () => {
    showError('Something went wrong');
    expect(mockClack.log.error).toHaveBeenCalledTimes(1);
  });
});

describe('showCancelled', () => {
  it('calls clack.outro with cancellation message', () => {
    showCancelled();
    expect(mockClack.outro).toHaveBeenCalledTimes(1);
    const msg = mockClack.outro.mock.calls[0][0];
    expect(typeof msg).toBe('string');
  });
});

describe('showSuccess', () => {
  it('calls clack.outro with success message', () => {
    showSuccess();
    expect(mockClack.outro).toHaveBeenCalledTimes(1);
  });

  it('accepts a custom message', () => {
    showSuccess('Custom success');
    expect(mockClack.outro).toHaveBeenCalledWith(expect.stringContaining('Custom success'));
  });
});

describe('showFileList', () => {
  it('calls clack.log.success and message for each file', () => {
    showFileList(['/path/to/file1.md', '/path/to/file2.md']);
    expect(mockClack.log.success).toHaveBeenCalledTimes(1);
    expect(mockClack.log.message).toHaveBeenCalledTimes(2);
  });

  it('handles empty array gracefully', () => {
    showFileList([]);
    expect(mockClack.log.info).toHaveBeenCalledTimes(1);
  });
});
