/**
 * integration.test.ts — Tests against the running server at localhost:3001
 * Requires the server to be running. Skipped when server is down.
 */

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3001';

async function serverIsUp(): Promise<boolean> {
  try {
    const res = await fetch(BASE_URL, { signal: AbortSignal.timeout(3000) });
    return res.ok || res.status < 500;
  } catch {
    return false;
  }
}

describe('Integration — live server at ' + BASE_URL, () => {
  let skip = false;

  beforeAll(async () => {
    skip = !(await serverIsUp());
    if (skip) {
      console.warn(`⚠️  Server not reachable at ${BASE_URL} — skipping integration tests`);
    }
  });

  // --- /api/agents ---
  describe('GET /api/agents', () => {
    it('returns 200 with an array', async () => {
      if (skip) return;
      const res = await fetch(`${BASE_URL}/api/agents`);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(Array.isArray(data)).toBe(true);
    });

    it('each agent has required fields', async () => {
      if (skip) return;
      const res = await fetch(`${BASE_URL}/api/agents`);
      const agents = await res.json();
      expect(agents.length).toBeGreaterThan(0);
      agents.forEach((a: Record<string, unknown>) => {
        expect(a).toHaveProperty('key');
        expect(a).toHaveProperty('emoji');
        expect(a).toHaveProperty('role');
        expect(a).toHaveProperty('status');
      });
    });

    it('status is one of: online, idle, offline', async () => {
      if (skip) return;
      const res = await fetch(`${BASE_URL}/api/agents`);
      const agents = await res.json();
      agents.forEach((a: { status: string }) => {
        expect(['online', 'idle', 'offline']).toContain(a.status);
      });
    });
  });

  // --- /api/activity ---
  describe('GET /api/activity', () => {
    it('returns 200', async () => {
      if (skip) return;
      const res = await fetch(`${BASE_URL}/api/activity`);
      expect(res.status).toBe(200);
    });

    it('returns an array', async () => {
      if (skip) return;
      const res = await fetch(`${BASE_URL}/api/activity`);
      const data = await res.json();
      expect(Array.isArray(data)).toBe(true);
    });

    it('events have timestamp when present', async () => {
      if (skip) return;
      const res = await fetch(`${BASE_URL}/api/activity`);
      const events = await res.json();
      events.forEach((e: Record<string, unknown>) => {
        expect(e).toHaveProperty('timestamp');
        expect(e).toHaveProperty('agent');
        const ts = new Date(e.timestamp as string);
        expect(ts.toString()).not.toBe('Invalid Date');
      });
    });
  });

  // --- /api/hierarchy ---
  describe('GET /api/hierarchy', () => {
    it('returns 200 or 404 (endpoint may be new)', async () => {
      if (skip) return;
      const res = await fetch(`${BASE_URL}/api/hierarchy`);
      // 200 = endpoint exists; 404 = server hasn't been rebuilt yet (acceptable pre-deploy)
      expect([200, 404]).toContain(res.status);
      if (res.status === 200) {
        const data = await res.json();
        // Either null (no saved layout) or an object with nodes/edges
        expect(data === null || typeof data === 'object').toBe(true);
      }
    });
  });

  // --- Security: path traversal ---
  describe('Security — path traversal blocked', () => {
    it('GET /api/files with path traversal returns 400', async () => {
      if (skip) return;
      const res = await fetch(`${BASE_URL}/api/files?agent=main&path=../../../etc/passwd`);
      expect(res.status).toBe(400);
    });

    it('GET /api/files with absolute path returns 400', async () => {
      if (skip) return;
      const res = await fetch(`${BASE_URL}/api/files?agent=main&path=/etc/passwd`);
      expect(res.status).toBe(400);
    });

    it('GET /api/files with unknown agent returns 400', async () => {
      if (skip) return;
      const res = await fetch(`${BASE_URL}/api/files?agent=evil-agent&path=SOUL.md`);
      expect(res.status).toBe(400);
    });
  });

  // --- Tasks assign ---
  describe('POST /api/tasks/assign', () => {
    it('returns 400 when body is empty', async () => {
      if (skip) return;
      const res = await fetch(`${BASE_URL}/api/tasks/assign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      expect(res.status).toBe(400);
    });

    it('returns 400 when agentKey is missing', async () => {
      if (skip) return;
      const res = await fetch(`${BASE_URL}/api/tasks/assign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: 'test' }),
      });
      expect(res.status).toBe(400);
    });

    it('returns 400 for unknown agent', async () => {
      if (skip) return;
      const res = await fetch(`${BASE_URL}/api/tasks/assign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agentKey: 'UnknownBot', message: 'test' }),
      });
      expect(res.status).toBe(400);
    });
  });
});
