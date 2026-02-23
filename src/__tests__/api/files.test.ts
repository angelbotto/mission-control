/**
 * files.test.ts — Unit tests for /api/files path validation
 */

// Replicate the validatePath logic (same as in the route)
function validatePath(path: string): boolean {
  if (path.includes('..')) return false;
  if (path.startsWith('/')) return false;
  if (!/^[a-zA-Z0-9._-]+$/.test(path)) return false;
  return true;
}

describe('validatePath — security', () => {
  it('blocks path traversal with ..',  () => {
    expect(validatePath('../../../etc/passwd')).toBe(false);
  });

  it('blocks double-dot segment', () => {
    expect(validatePath('..%2F..%2Fetc')).toBe(false);
  });

  it('blocks absolute paths', () => {
    expect(validatePath('/etc/passwd')).toBe(false);
  });

  it('blocks paths with special chars', () => {
    expect(validatePath('foo;bar')).toBe(false);
    expect(validatePath('foo|bar')).toBe(false);
    expect(validatePath('foo bar')).toBe(false);
  });

  it('allows valid markdown filenames', () => {
    expect(validatePath('SOUL.md')).toBe(true);
    expect(validatePath('AGENTS.md')).toBe(true);
    expect(validatePath('TOOLS.md')).toBe(true);
    expect(validatePath('user-config.md')).toBe(true);
  });

  it('allows valid filenames with numbers', () => {
    expect(validatePath('notes-2024.md')).toBe(true);
  });
});

describe('WORKSPACE_MAP — agent validation', () => {
  const WORKSPACE_MAP: Record<string, string> = {
    main: '/Users/angelbotto/.openclaw/workspace/',
    assistant: '/Users/angelbotto/.openclaw/workspace-assistant/',
    infra: '/Users/angelbotto/.openclaw/workspace-infra/',
    coder: '/Users/angelbotto/.openclaw/workspace-coder/',
    content: '/Users/angelbotto/.openclaw/workspace-content/',
    research: '/Users/angelbotto/.openclaw/workspace-research/',
    finance: '/Users/angelbotto/.openclaw/workspace-finance/',
  };

  it('contains all expected agents', () => {
    const expected = ['main', 'assistant', 'infra', 'coder', 'content', 'research', 'finance'];
    expected.forEach((a) => expect(WORKSPACE_MAP[a]).toBeDefined());
  });

  it('rejects unknown agents', () => {
    expect(WORKSPACE_MAP['evil-agent']).toBeUndefined();
  });
});
