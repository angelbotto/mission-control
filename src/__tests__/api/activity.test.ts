/**
 * activity.test.ts — Unit tests for activity parsing and classification
 */

// Replicate classification logic from the route
type EventType = 'message' | 'tool_call' | 'model_change' | 'session_start' | 'compaction' | 'other';

function classifyEvent(event: Record<string, unknown>): EventType {
  const t = event.type as string;
  if (t === 'message') return 'message';
  if (t === 'model_change') return 'model_change';
  if (t === 'session') return 'session_start';
  if (t === 'compaction') return 'compaction';
  if (t === 'custom') {
    const ct = (event.customType as string) || '';
    if (ct.includes('tool')) return 'tool_call';
  }
  return 'other';
}

function truncate(s: string, max: number): string {
  if (s.length <= max) return s;
  return s.slice(0, max) + '…';
}

interface ActivityEvent {
  id: string;
  agent: string;
  agentEmoji: string;
  timestamp: string;
  type: EventType;
  label: string;
  tokensIn?: number;
  tokensOut?: number;
  sessionId: string;
}

describe('classifyEvent', () => {
  it('classifies message events', () => {
    expect(classifyEvent({ type: 'message' })).toBe('message');
  });

  it('classifies model_change events', () => {
    expect(classifyEvent({ type: 'model_change' })).toBe('model_change');
  });

  it('classifies session start events', () => {
    expect(classifyEvent({ type: 'session' })).toBe('session_start');
  });

  it('classifies compaction events', () => {
    expect(classifyEvent({ type: 'compaction' })).toBe('compaction');
  });

  it('classifies custom tool events', () => {
    expect(classifyEvent({ type: 'custom', customType: 'tool_use' })).toBe('tool_call');
  });

  it('classifies unknown events as other', () => {
    expect(classifyEvent({ type: 'some_random_type' })).toBe('other');
  });
});

describe('ActivityEvent structure', () => {
  const makeEvent = (overrides: Partial<ActivityEvent> = {}): ActivityEvent => ({
    id: 'test-id',
    agent: 'K',
    agentEmoji: '👽',
    timestamp: new Date().toISOString(),
    type: 'message',
    label: 'Test message',
    sessionId: 'session-123',
    ...overrides,
  });

  it('has required fields', () => {
    const e = makeEvent();
    expect(e.agent).toBeTruthy();
    expect(e.agentEmoji).toBeTruthy();
    expect(e.timestamp).toBeTruthy();
    expect(e.type).toBeTruthy();
    expect(e.label).toBeTruthy();
    expect(e.sessionId).toBeTruthy();
  });

  it('timestamp is valid ISO string', () => {
    const e = makeEvent();
    const d = new Date(e.timestamp);
    expect(d.toString()).not.toBe('Invalid Date');
  });

  it('event sorting — newer events come first', () => {
    const now = Date.now();
    const events: ActivityEvent[] = [
      makeEvent({ timestamp: new Date(now - 60000).toISOString(), id: 'old' }),
      makeEvent({ timestamp: new Date(now).toISOString(), id: 'new' }),
      makeEvent({ timestamp: new Date(now - 30000).toISOString(), id: 'mid' }),
    ];

    const sorted = [...events].sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );

    expect(sorted[0].id).toBe('new');
    expect(sorted[1].id).toBe('mid');
    expect(sorted[2].id).toBe('old');
  });
});

describe('truncate', () => {
  it('returns short strings unchanged', () => {
    expect(truncate('hello', 10)).toBe('hello');
  });

  it('truncates and appends ellipsis', () => {
    const result = truncate('hello world', 5);
    expect(result).toBe('hello…');
    expect(result.length).toBe(6); // 5 chars + ellipsis
  });

  it('handles exact length', () => {
    expect(truncate('hello', 5)).toBe('hello');
  });
});
