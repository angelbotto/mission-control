# Coding Conventions

**Analysis Date:** 2026-02-23

## Naming Patterns

**Files:**
- React components: PascalCase (e.g., `AgentCard.tsx`, `KanbanBoard.tsx`)
- API routes: lowercase with hyphens or directories (e.g., `route.ts` in `/api/agents/`, `/api/mc-tasks/[id]/`)
- Utility modules: camelCase (e.g., `agents.ts`)
- Test files: match source with `.test.` suffix (e.g., `AgentCard.test.tsx`, `agents.test.ts`)

**Functions:**
- camelCase (e.g., `getStatusFromTimestamp`, `formatRelativeTime`, `parseSoulMd`, `validatePath`)
- Async functions: same camelCase, no special prefix

**Variables:**
- Local variables: camelCase (e.g., `lastActivity`, `sessionCount`, `selectedRole`)
- Constants: UPPER_SNAKE_CASE (e.g., `AGENTS_DIR`, `WORKSPACE_MAP`, `AGENTS`)
- Boolean flags: camelCase with "is" or "has" prefix (e.g., `skip`, `saving`, `generatingSoul`)

**Types:**
- Interfaces: PascalCase (e.g., `AgentDef`, `AgentInfo`, `Props`, `AgentStatus`)
- Type unions: PascalCase (e.g., `AgentStatus`)
- Record keys: lowercase (e.g., `Record<string, string>`)

## Code Style

**Formatting:**
- Prettier not explicitly configured; ESLint is primary tool
- 2-space indentation (consistent throughout codebase)
- Semicolons required
- Double quotes for JSX, single quotes tolerated in comments

**Linting:**
- Tool: ESLint v9
- Config: `eslint.config.mjs` (flat config format)
- Base configs: `eslint-config-next/core-web-vitals` and `eslint-config-next/typescript`
- Strictness: TypeScript strict mode enabled (`"strict": true` in tsconfig.json)
- No unused variables policy: prefixed with `_` when intentional (e.g., `_req` in unused request params)

## Import Organization

**Order:**
1. React and Next.js imports (e.g., `import { useState } from "react"`)
2. Next.js specific (e.g., `import { NextResponse } from "next/server"`)
3. Node.js built-ins (e.g., `import { readFile } from "fs/promises"`)
4. Aliased imports (e.g., `import { AGENTS } from "@/lib/agents"`)
5. Local imports (e.g., `import Navbar from "./Navbar"`)

**Path Aliases:**
- `@/*` maps to `src/*` (configured in tsconfig.json)
- Used consistently for shared utilities and types

**Comments:**
- Path separators: Comments use `// ─── SECTION NAME ────` ASCII art style (see `agents.ts` line 24, `files/route.ts` line 24)
- Block comments: `/* multi-line */` for complex logic
- Inline comments: `// explanation` for non-obvious code
- No over-commenting; code should be self-explanatory first

**JSDoc/TSDoc:**
- Optional, sparse usage
- When used: single-line `/** description */` format
- Example: `async function parseSoulMd(soulPath: string): Promise<{...}>`
- No @param/@return documentation observed; type annotations are primary

## Error Handling

**Patterns:**
- Try/catch used liberally for I/O operations (file read, fetch, JSON.parse)
- Silent catch blocks: `catch { /* fallback */ }` common for non-critical operations
  - Example: `catch { return { lastActivity: null, ... } }` (agents.ts line 70)
- Graceful degradation: return sensible defaults on error rather than throw
- API errors: return NextResponse.json with `{ error: "message" }` and explicit status codes (400, 404, 500)

**Validation:**
- Input validation at API boundaries (e.g., `validatePath()` in files/route.ts)
- Type checking before use (e.g., `!agent || !path` for required params)
- No validation library used; manual checks inline

## Function Design

**Size:** Functions are typically 15-50 lines; longer functions broken into smaller named helpers
  - Example: `readAgentInfo()` (agents.ts:58) is 90 lines but handles sequential concerns (read files, parse JSONL, extract metadata)

**Parameters:**
- Destructured from objects when multiple params: `{ id, path, content }` (files/route.ts:49)
- Type-safe via TypeScript interfaces for complex data
- Async functions use `await params` for Next.js dynamic routes (e.g., `const { id } = await params`)

**Return Values:**
- Explicit return types on all functions (TypeScript strict mode)
- NextResponse for API handlers: `NextResponse.json(data, { status: 200 })`
- Promise-based for async utilities: `Promise<AgentInfo>`
- Null/undefined used deliberately when absence is semantic (e.g., `lastActivity: null`)

## Module Design

**Exports:**
- Named exports for utilities: `export const AGENTS: AgentDef[] = [...]`
- Default export for React components: `export default function AgentCard(...) { ... }`
- Type exports: `export interface AgentDef { ... }`

**Barrel Files:**
- Not used; imports are explicit and direct
- Example: Import from `@/lib/agents` directly, no index.ts re-exports

**Constants:**
- Defined at module scope, before functions (e.g., AGENTS array, WORKSPACE_MAP object)
- Reused across multiple exports

## Conventions in Action

**Real Example — files/route.ts:**
```typescript
// ─── Validation at boundary ───
function validatePath(path: string): boolean {
  if (path.includes("..")) return false;
  if (path.startsWith("/")) return false;
  if (!/^[a-zA-Z0-9._-]+$/.test(path)) return false;
  return true;
}

// ─── Named error handling ───
export async function GET(req: NextRequest) {
  const agent = req.nextUrl.searchParams.get("agent");
  const path = req.nextUrl.searchParams.get("path");

  if (!agent || !path) {
    return NextResponse.json({ error: "agent and path required" }, { status: 400 });
  }

  // ─── Graceful degradation ───
  try {
    const content = await readFile(join(baseDir, path), "utf-8");
    return NextResponse.json({ content });
  } catch {
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }
}
```

**Real Example — agents.ts:**
```typescript
// ─── Type-safe utility ───
export function getStatusFromTimestamp(lastActivity: string | null): AgentStatus {
  if (!lastActivity) return "offline";
  const diff = Date.now() - new Date(lastActivity).getTime();
  const minutes = diff / 1000 / 60;
  if (minutes < 10) return "online";
  if (minutes < 240) return "idle";
  return "offline";
}

// ─── Clear, readable logic ───
export function formatRelativeTime(ts: string | null): string {
  if (!ts) return "nunca";
  const diff = Date.now() - new Date(ts).getTime();
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return `hace ${seconds}s`;
  // ... more thresholds
}
```

---

*Convention analysis: 2026-02-23*
