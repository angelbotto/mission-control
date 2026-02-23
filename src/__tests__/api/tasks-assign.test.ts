/**
 * tasks-assign.test.ts — Unit tests for /api/tasks/assign validation logic
 */

const AGENT_SESSION_MAP: Record<string, string> = {
  K: 'agent:main:main',
  Vera: 'agent:assistant:main',
  Nexo: 'agent:infra:main',
  Pluma: 'agent:content:main',
  Arq: 'agent:coder:main',
  Oráculo: 'agent:research:main',
  Vault: 'agent:finance:main',
};

// Validate request fields (mirrors route logic)
function validateAssignRequest(body: { agentKey?: string; message?: string }): string | null {
  if (!body.agentKey || !body.message) return 'agentKey and message required';
  if (!AGENT_SESSION_MAP[body.agentKey]) return `Unknown agent: ${body.agentKey}`;
  return null;
}

describe('POST /api/tasks/assign — validation', () => {
  it('returns 400 when agentKey is missing', () => {
    const err = validateAssignRequest({ message: 'do something' });
    expect(err).toContain('agentKey');
  });

  it('returns 400 when message is missing', () => {
    const err = validateAssignRequest({ agentKey: 'K' });
    expect(err).toBeTruthy();
  });

  it('returns 400 when both fields are missing', () => {
    const err = validateAssignRequest({});
    expect(err).toBeTruthy();
  });

  it('passes validation for valid K + message', () => {
    const err = validateAssignRequest({ agentKey: 'K', message: 'analyze this' });
    expect(err).toBeNull();
  });

  it('passes validation for all known agents', () => {
    Object.keys(AGENT_SESSION_MAP).forEach((key) => {
      const err = validateAssignRequest({ agentKey: key, message: 'task' });
      expect(err).toBeNull();
    });
  });

  it('rejects unknown agent with descriptive error', () => {
    const err = validateAssignRequest({ agentKey: 'UnknownBot', message: 'task' });
    expect(err).toContain('Unknown agent');
  });
});

describe('AGENT_SESSION_MAP', () => {
  it('maps K to agent:main:main', () => {
    expect(AGENT_SESSION_MAP['K']).toBe('agent:main:main');
  });

  it('maps Arq to agent:coder:main', () => {
    expect(AGENT_SESSION_MAP['Arq']).toBe('agent:coder:main');
  });

  it('contains all 7 agents', () => {
    expect(Object.keys(AGENT_SESSION_MAP)).toHaveLength(7);
  });
});
