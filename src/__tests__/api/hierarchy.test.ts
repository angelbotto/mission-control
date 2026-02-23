/**
 * hierarchy.test.ts — Unit tests for /api/hierarchy route logic
 */

import { readFile, writeFile } from 'fs/promises';

jest.mock('fs/promises', () => ({
  readFile: jest.fn(),
  writeFile: jest.fn(),
}));

const mockReadFile = readFile as jest.MockedFunction<typeof readFile>;
const mockWriteFile = writeFile as jest.MockedFunction<typeof writeFile>;

// ----- Replicate the GET logic -----
async function hierarchyGet(filePath: string) {
  try {
    const raw = await readFile(filePath, 'utf-8');
    return { ok: true, data: JSON.parse(raw as string) };
  } catch {
    return { ok: true, data: null };
  }
}

// ----- Replicate the PUT logic -----
async function hierarchyPut(body: unknown, filePath: string) {
  if (!body || typeof body !== 'object') {
    return { ok: false, status: 400, error: 'Invalid body' };
  }
  const payload = {
    nodes: (body as Record<string, unknown>).nodes ?? [],
    edges: (body as Record<string, unknown>).edges ?? [],
    updatedAt: new Date().toISOString(),
  };
  await writeFile(filePath, JSON.stringify(payload, null, 2), 'utf-8');
  return { ok: true, status: 200 };
}

const TEST_PATH = '/tmp/mc-hierarchy-test.json';

describe('GET /api/hierarchy', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns null when file does not exist', async () => {
    mockReadFile.mockRejectedValue(new Error('ENOENT'));
    const result = await hierarchyGet(TEST_PATH);
    expect(result.ok).toBe(true);
    expect(result.data).toBeNull();
  });

  it('returns parsed JSON when file exists', async () => {
    const fixture = { nodes: [{ id: 'K' }], edges: [] };
    mockReadFile.mockResolvedValue(JSON.stringify(fixture) as unknown as Buffer);
    const result = await hierarchyGet(TEST_PATH);
    expect(result.ok).toBe(true);
    expect(result.data).toEqual(fixture);
  });
});

describe('PUT /api/hierarchy', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockWriteFile.mockResolvedValue(undefined);
  });

  it('rejects null body with 400', async () => {
    const result = await hierarchyPut(null, TEST_PATH);
    expect(result.ok).toBe(false);
    expect(result.status).toBe(400);
  });

  it('rejects non-object body with 400', async () => {
    const result = await hierarchyPut('bad', TEST_PATH);
    expect(result.ok).toBe(false);
    expect(result.status).toBe(400);
  });

  it('saves valid payload and returns ok', async () => {
    const body = {
      nodes: [{ id: 'K', position: { x: 100, y: 50 } }],
      edges: [{ id: 'K-Arq', source: 'K', target: 'Arq' }],
    };
    const result = await hierarchyPut(body, TEST_PATH);
    expect(result.ok).toBe(true);
    expect(result.status).toBe(200);
    expect(mockWriteFile).toHaveBeenCalledTimes(1);
    const written = JSON.parse((mockWriteFile.mock.calls[0][1] as string));
    expect(written.nodes).toHaveLength(1);
    expect(written.edges).toHaveLength(1);
    expect(written.updatedAt).toBeDefined();
  });

  it('defaults nodes/edges to empty arrays when missing', async () => {
    const result = await hierarchyPut({}, TEST_PATH);
    expect(result.ok).toBe(true);
    const written = JSON.parse((mockWriteFile.mock.calls[0][1] as string));
    expect(written.nodes).toEqual([]);
    expect(written.edges).toEqual([]);
  });
});
