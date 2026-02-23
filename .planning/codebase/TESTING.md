# Testing Patterns

**Analysis Date:** 2026-02-23

## Test Framework

**Runner:**
- Jest v30.2.0 (latest)
- Config: `jest.config.js` (multiple projects)
- ts-jest transformer for TypeScript support

**Assertion Library:**
- Jest built-in matchers
- @testing-library/jest-dom for DOM assertions (render, screen, etc.)

**Run Commands:**
```bash
npm test              # Run all tests (all 3 projects)
npm run test:ci      # CI mode with --passWithNoTests --forceExit
```

## Test File Organization

**Location:**
- Co-located in `src/__tests__/` with three subdirectories:
  - `src/__tests__/api/` — API route tests (Node environment)
  - `src/__tests__/components/` — React component smoke tests (jsdom environment)
  - `src/__tests__/integration/` — Live server integration tests (Node environment)
  - `src/__tests__/__mocks__/` — Module mocks for jsdom tests

**Naming:**
- Match source file name with `.test.` suffix
- Examples: `agents.test.ts` (for `lib/agents.ts`), `AgentCard.test.tsx` (for `AgentCard.tsx`)

**Structure:**
```
src/__tests__/
├── api/
│   ├── agents.test.ts
│   ├── files.test.ts
│   ├── hierarchy.test.ts
│   ├── tasks-assign.test.ts
│   └── activity.test.ts
├── components/
│   ├── AgentCard.test.tsx
│   ├── KanbanBoard.test.tsx
│   └── OrgChart.test.tsx
├── integration/
│   └── integration.test.ts
└── __mocks__/
    ├── styleMock.js
    ├── xyflow.js
    ├── dagre.js
    └── codemirror.js
```

## Test Structure

**Suite Organization:**
```typescript
// agents.test.ts — unit tests
describe('AGENTS definition', () => {
  it('contains all 7 required agents', () => {
    expect(AGENTS).toHaveLength(7);
  });

  it('each agent has required fields', () => {
    AGENTS.forEach((a) => {
      expect(a.key).toBeTruthy();
      expect(a.emoji).toBeTruthy();
      expect(a.dirName).toBeTruthy();
    });
  });
});

describe('getStatusFromTimestamp', () => {
  it('returns offline when lastActivity is null', () => {
    expect(getStatusFromTimestamp(null)).toBe('offline');
  });
});
```

**Patterns:**
- One `describe()` block per function or feature
- One `it()` per distinct test case (not multiple assertions in one test)
- Test names describe the expected outcome: `'returns X when Y'`
- No setup/teardown: tests are isolated and stateless

## Mocking

**Framework:** Jest built-in mocks (no external mocking library)

**Patterns:**

**Module Mocks (jsdom):**
```javascript
// src/__tests__/__mocks__/styleMock.js
module.exports = {};  // CSS modules return empty object

// src/__tests__/__mocks__/codemirror.js
module.exports = {};  // Placeholder for CodeMirror (complex external lib)
```

Configured in jest.config.js:
```javascript
moduleNameMapper: {
  '\\.(css|less|scss|sass)$': '<rootDir>/src/__tests__/__mocks__/styleMock.js',
  '^codemirror$': '<rootDir>/src/__tests__/__mocks__/codemirror.js',
  '^@codemirror/(.*)$': '<rootDir>/src/__tests__/__mocks__/codemirror.js',
}
```

**Fixture Factories:**
```typescript
// AgentCard.test.tsx — mock factory pattern
const mockAgent = (overrides: Partial<AgentInfo> = {}): AgentInfo => ({
  key: 'K',
  emoji: '👽',
  role: 'Orquestador',
  model: 'claude-opus-4-6',
  status: 'online',
  lastActivity: new Date().toISOString(),
  sessionCount: 5,
  totalTokens: 10000,
  ...overrides,
});

// Usage in test
render(<AgentCard agent={mockAgent({ key: 'Arq' })} />);
```

**What to Mock:**
- External CSS/styling (returns empty objects)
- Complex third-party libraries: @xyflow/react, @dagrejs/dagre, CodeMirror (expensive to instantiate)
- Child components: rarely mocked; prefer integration-style testing

**What NOT to Mock:**
- Utility functions (e.g., `getStatusFromTimestamp`) — test real logic
- Application types and interfaces — test contracts
- API responses in unit tests — use fixtures or mocks

## Fixtures and Factories

**Test Data:**
```typescript
// agents.test.ts — inline fixtures
const ts = new Date(Date.now() - 5 * 60 * 1000).toISOString();  // 5 min ago
expect(getStatusFromTimestamp(ts)).toBe('online');

// AgentCard.test.tsx — factory pattern
const mockAgent = (overrides = {}) => ({ ...defaults, ...overrides });
```

**Location:**
- Inline within test files (no shared fixture files)
- Factories defined at module scope, before describe blocks
- Reused across multiple test suites in same file

## Coverage

**Requirements:** Not enforced; no coverage thresholds in jest.config.js

**View Coverage:**
- Run: `npm test -- --coverage` (if configured) or not used
- No coverage directory tracked in git

## Test Types

**Unit Tests:**
- Scope: Single function or utility
- Approach: Import function directly, call with inputs, assert outputs
- Example: `agents.test.ts` tests pure functions (`getStatusFromTimestamp`, `formatRelativeTime`) in isolation
- Environment: Node.js (for API/utility tests)

```typescript
// agents.test.ts — unit test
describe('getStatusFromTimestamp', () => {
  it('returns online when activity < 10 min ago', () => {
    const ts = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    expect(getStatusFromTimestamp(ts)).toBe('online');
  });

  it('boundary: exactly 10 min returns idle', () => {
    const ts = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    expect(getStatusFromTimestamp(ts)).toBe('idle');
  });
});
```

**Component Smoke Tests:**
- Scope: Component renders without crashing, displays expected elements
- Approach: Render component with mocked props, assert elements in DOM
- Environment: jsdom (browser DOM simulation)
- NOT full interaction testing; just structural validation

```typescript
// AgentCard.test.tsx — smoke tests
describe('AgentCard', () => {
  it('renders without crashing', () => {
    render(<AgentCard agent={mockAgent()} />);
    expect(screen.getByTestId('agent-card')).toBeInTheDocument();
  });

  it('displays agent key', () => {
    render(<AgentCard agent={mockAgent({ key: 'Arq' })} />);
    expect(screen.getByTestId('agent-key')).toHaveTextContent('Arq');
  });

  it('shows online status with green color', () => {
    render(<AgentCard agent={mockAgent({ status: 'online' })} />);
    const statusEl = screen.getByTestId('agent-status');
    expect(statusEl).toHaveStyle({ color: '#00c691' });
  });
});
```

**Integration Tests:**
- Scope: Multi-component workflows, live API endpoints
- Approach: Fetch from running server at `http://localhost:3001`, validate responses
- Environment: Node.js with timeout handling
- Conditional: Tests skip gracefully if server is down

```typescript
// integration.test.ts
const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3001';

beforeAll(async () => {
  skip = !(await serverIsUp());
  if (skip) {
    console.warn(`⚠️  Server not reachable at ${BASE_URL} — skipping integration tests`);
  }
});

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
    agents.forEach((a) => {
      expect(a).toHaveProperty('key');
      expect(a).toHaveProperty('status');
    });
  });
});
```

## Common Patterns

**Test Organization:**
- Multiple related test cases grouped in single `describe()` block
- No before/after hooks; each test is independent and stateless
- Tests are readable as documentation of expected behavior

**Assertion Patterns:**
```typescript
// Existence
expect(x).toBeDefined();
expect(x).toBeTruthy();

// Equality
expect(val).toBe(expected);
expect(Array).toHaveLength(7);

// DOM
expect(screen.getByTestId('...')).toBeInTheDocument();
expect(screen.getByText('...')).toHaveTextContent('...');
expect(el).toHaveStyle({ color: '#00c691' });

// Collections
expect(AGENTS).toHaveLength(7);
agents.forEach((a) => expect(a).toHaveProperty('key'));

// Validation (security)
expect(validatePath('../../../etc/passwd')).toBe(false);
expect(validatePath('valid-file.md')).toBe(true);
```

**Async Testing:**
```typescript
// Direct await (integration tests)
const res = await fetch(`${BASE_URL}/api/agents`);
const data = await res.json();
expect(Array.isArray(data)).toBe(true);

// Error Testing (implicit via validation)
it('returns 400 when body is empty', async () => {
  if (skip) return;
  const res = await fetch(`${BASE_URL}/api/tasks/assign`, {
    method: 'POST',
    body: JSON.stringify({}),
  });
  expect(res.status).toBe(400);
});
```

**Boundary Testing:**
```typescript
// agents.test.ts — boundary conditions
describe('getStatusFromTimestamp', () => {
  it('boundary: exactly 10 min returns idle', () => {
    const ts = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    expect(getStatusFromTimestamp(ts)).toBe('idle');
  });
});
```

**Security Testing:**
```typescript
// files.test.ts — path traversal validation
describe('validatePath — security', () => {
  it('blocks path traversal with ..', () => {
    expect(validatePath('../../../etc/passwd')).toBe(false);
  });

  it('blocks absolute paths', () => {
    expect(validatePath('/etc/passwd')).toBe(false);
  });

  it('allows valid markdown filenames', () => {
    expect(validatePath('SOUL.md')).toBe(true);
  });
});

// integration.test.ts — API security
describe('Security — path traversal blocked', () => {
  it('GET /api/files with path traversal returns 400', async () => {
    if (skip) return;
    const res = await fetch(`${BASE_URL}/api/files?agent=main&path=../../../etc/passwd`);
    expect(res.status).toBe(400);
  });
});
```

## Test Coverage

**What's Tested:**
- Core utilities: `agents.ts` (status logic, time formatting) — fully covered
- API routes: Request validation, error handling, security (path traversal)
- Components: Rendering, props passed correctly, status indicators
- Integration: Live API endpoints, data contracts, security boundaries

**Not Tested:**
- UI interactions (click handlers, form submissions) — smoke tests only
- Visual regression (styling, layout)
- E2E user flows (would require Playwright/Cypress; not present in config)

---

*Testing analysis: 2026-02-23*
