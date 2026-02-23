# Codebase Concerns

**Analysis Date:** 2026-02-23

## Tech Debt

**Silent Error Handling:**
- Issue: Multiple API endpoints and data loaders silently catch all errors without logging or user notification. Errors are suppressed with empty catch blocks or `.catch(() => {})`.
- Files: `src/app/page.tsx`, `src/app/kanban/page.tsx`, `src/components/OfficeCanvas.tsx`, `src/app/kanban/page.tsx:59`, `src/app/activity/page.tsx:47`, `src/app/chat/page.tsx:96`
- Impact: When APIs fail (network timeouts, server errors), users see no indication. Data appears to freeze or load indefinitely. Debugging production issues becomes difficult.
- Fix approach: Implement proper error logging (even console.error) and/or show error states to users. Add typed error handling that distinguishes between transient (retry) and permanent failures.

**Unvalidated JSON.parse Calls:**
- Issue: Multiple locations parse JSON without validation, relying on try-catch to silently fail. Malformed files crash the parsing chain without graceful fallback.
- Files: `src/app/page.tsx:53-55` (localStorage), `src/app/api/agents/route.ts:176` (openclaw.json), `src/app/api/activity/route.ts:102-126` (JSONL lines), `src/app/api/agent-chat/[agentId]/history/route.ts` (session files)
- Impact: If any agent session file, config file, or stored data is malformed, the entire feed/activity/agent list fails silently. No way to recover without manual intervention.
- Fix approach: Add JSON schema validation or zod/pydantic-style runtime validation. Log parse errors with context (file path, line number). Implement fallback values or skip malformed records instead of entire failure.

**State Synchronization Race Conditions:**
- Issue: Multiple useEffect hooks fetch the same data at different intervals without coordination. No request deduplication or optimistic updates.
- Files: `src/app/page.tsx:176-186` (agents + activity at 30s intervals), `src/app/kanban/page.tsx:58-70` (GSD sync every 5 min + tasks every 10s), `src/app/org/page.tsx:138-147` (hierarchy fetch without loading gate)
- Impact: Duplicate API calls consume bandwidth. If two requests race, state updates may overwrite each other. Offline-first patterns are missing.
- Fix approach: Implement request deduplication with AbortController. Use SWR or React Query for consistent cache management. Add loading gates to prevent duplicate fetches.

**Memory Leaks from setInterval/requestAnimationFrame:**
- Issue: Multiple components set up intervals and animation frames. While cleanup functions exist, there's no guarantee they run if component unmounts mid-fetch.
- Files: `src/components/OfficeCanvas.tsx:389-398` (fetchAgents interval + render loop), `src/app/page.tsx:180-185` (agent + activity intervals), `src/app/chat/page.tsx` (loadHistory interval), `src/components/AgentWorld.tsx` (PIXI ticker)
- Impact: If a page is navigated away before cleanup fires, intervals continue running in background, consuming CPU and memory. Over time (multiple page transitions) this accumulates.
- Fix approach: Use useEffect dependency arrays carefully. Add AbortController to fetch calls inside intervals. Consider using custom hook wrapper for interval management.

**Unsafe Type Coercions:**
- Issue: Multiple "as unknown as" type casts without runtime validation, especially for data from external sources.
- Files: `src/app/org/page.tsx:44` (cast data to AgentInfo without validation), `src/app/api/activity/route.ts:61` (cast to Record<string, unknown>), `src/app/kanban/page.tsx:48-49` (Task array without schema validation)
- Impact: If API contract changes or returns unexpected shape, TypeScript gives false confidence while runtime crashes occur.
- Fix approach: Use runtime validators (zod, typeguard, or simple shape checks). Never cast external data without validation.

## Performance Bottlenecks

**Canvas Rendering in OfficeCanvas:**
- Problem: `OfficeCanvas.tsx` redraws entire 32x32 tile grid every frame (60fps assumed). Does not use requestAnimationFrame optimization or dirty rect tracking.
- Files: `src/components/OfficeCanvas.tsx:207-314` (full canvas redraw in render callback)
- Cause: The render loop redraws floor, furniture, and all agents every frame without caching tile positions or checking if anything changed.
- Improvement path: Use Canvas 2D layer caching (off-screen canvas for static background). Track dirty regions. Batch avatar updates separately from background.

**Large File Reading in Session Analysis:**
- Problem: `src/app/api/agents/route.ts:96-142` reads entire JSONL session files into memory and iterates twice (backwards for recent, forwards for tokens). No streaming or pagination.
- Files: `src/app/api/agents/route.ts:96-142`
- Cause: `readFile()` loads entire file, then `split('\n')` creates full string array. For agents with multi-month sessions (100K+ lines), this is slow.
- Improvement path: Use streaming JSONL parser. Read only the last N lines for activity (most recent). Cache token counts separately.

**Plane API Over-Fetching:**
- Problem: `src/app/api/tasks/route.ts:85-100` fetches states for every project (up to 20) even if only displaying tasks. Limits to 100 issues per project with no pagination for larger projects.
- Files: `src/app/api/tasks/route.ts:85-100`
- Cause: No filtering or lazy-loading. All states + all issues loaded eagerly.
- Improvement path: Fetch only active projects. Implement pagination for large projects. Cache state mappings in memory or Redis.

**Duplicate Agent Data Loading:**
- Problem: `/api/agents` is called from multiple pages independently: `page.tsx`, `kanban/page.tsx`, `chat/page.tsx`, `editor/page.tsx`, `org/page.tsx`. No global cache or provider.
- Files: Multiple page files
- Cause: No state management layer (Context, Redux, Zustand). Each page re-fetches.
- Improvement path: Create a global `AgentProvider` context or use React Query with persistent cache.

## Known Bugs

**Agent Status Not Reflecting Real-Time Activity:**
- Symptoms: Agent status shows as "idle" or "offline" even when actively processing requests via API gateway.
- Files: `src/app/api/agents/route.ts:166-202` (gateway lookup only updates status if gateway says "active")
- Trigger: When an agent is actively streaming responses but gateway status endpoint hasn't updated yet.
- Workaround: Manually refresh the page (/api/agents has no-store header so it doesn't cache, but may need hard refresh).

**Canvas Click Detection Math Incorrect for DPI Scaling:**
- Symptoms: OfficeCanvas avatar click targets misaligned on high-DPI displays (2x Retina, etc).
- Files: `src/components/OfficeCanvas.tsx:318-338` (hit testing uses getBoundingClientRect scale but doesn't account for device pixel ratio)
- Trigger: On displays with window.devicePixelRatio > 1, clicks register offset from actual avatar.
- Workaround: None. Clicking slightly above avatar will register.

**GSD Sync Not Idempotent:**
- Symptoms: Running GSD sync multiple times can create duplicate task cards.
- Files: `src/app/kanban/page.tsx:59` (syncGSD called every 5 min without checking if sync is in progress)
- Trigger: If /api/gsd-sync takes > 5 min, next interval fires before first completes.
- Workaround: Manually delete duplicate tasks or wait for next full sync cycle.

## Security Considerations

**Hardcoded File Paths and Environment Variables:**
- Risk: Absolute paths like `/Users/angelbotto/.openclaw/agents` and `/Users/angelbotto/.openclaw/openclaw.json` are hardcoded with fallbacks to env vars. If env vars not set, assumes specific local paths that may not exist in production.
- Files: `src/app/api/agents/route.ts:6-10`, `src/app/api/activity/route.ts:6`, `src/app/api/tasks/route.ts:5-7`
- Current mitigation: Env vars checked before fallback.
- Recommendations: Add startup validation that paths exist and are readable. Use a config loader that fails loudly if critical paths are missing.

**API Token in Filesystem:**
- Risk: Plane API token stored in plain text file at `/Users/angelbotto/.openclaw/workspace/.secrets/plane_api_token.txt`. If codebase or server is compromised, token is exposed.
- Files: `src/app/api/tasks/route.ts:7`
- Current mitigation: File is in .secrets/ directory, assumed to be in .gitignore.
- Recommendations: Use environment variables or OS keychain for sensitive tokens. Never read tokens from filesystem in production. Rotate tokens regularly.

**No Input Validation on File Paths:**
- Risk: `src/app/api/files/route.ts` reads/writes files based on query/body parameters. If agent or path params not validated, could read arbitrary files.
- Files: `src/app/api/files/route.ts` (need to verify full file)
- Current mitigation: Path appears to be limited to known agent directories, but no explicit validation visible.
- Recommendations: Whitelist allowed file names (SOUL.md, USER.md, etc). Validate agent IDs against known agents list. Use path.resolve() + check it's within agents directory.

**Cross-Site Scripting (XSS) via Agent Data:**
- Risk: Agent emojis, names, and roles are displayed without sanitization. If agent config is compromised or malformed, could inject scripts.
- Files: `src/components/OfficeCanvas.tsx:175-180` (emoji rendered to canvas - safe), but `src/app/page.tsx:124` (agent.role displayed directly - need check), `src/app/org/page.tsx:68` (agent.key as div text - likely safe but not explicit)
- Current mitigation: React auto-escapes by default unless using dangerouslySetInnerHTML (not found).
- Recommendations: Explicitly validate that agent keys/roles match expected patterns (alphanumeric + spaces/hyphens only). Use Content Security Policy.

## Fragile Areas

**OfficeCanvas Component:**
- Files: `src/components/OfficeCanvas.tsx` (414 lines)
- Why fragile: Complex canvas rendering with manual coordinate calculations. Tileset indices hardcoded. Hit detection math brittle. Resizing logic depends on parentElement which may not exist.
- Safe modification: Don't change DESK_LAYOUT without updating both x/y position calculations AND hit detection radius. Test on multiple DPI scales. Use constants for all magic numbers.
- Test coverage: No unit tests for OfficeCanvas. Only integration tests for /api/agents (which feeds it data).

**Session File Parsing:**
- Files: `src/app/api/agents/route.ts:96-142`, `src/app/api/activity/route.ts:118-170`
- Why fragile: Iterates through JSONL lines and parses them. If even one line is malformed, `JSON.parse()` throws (caught but suppressed). Entire agent's activity/token count becomes wrong.
- Safe modification: Always wrap JSON.parse in try-catch. Log errors with filename + line number. Implement a JSONL validator. Test with malformed files.
- Test coverage: `src/__tests__/api/agents.test.ts` exists but limited to happy path. No malformed input tests.

**Kanban GSD Sync:**
- Files: `src/app/kanban/page.tsx:57-70` (sync logic)
- Why fragile: Interval-based sync with no concurrency control. Task state updates optimistically then fire async requests. If requests fail, UI shows wrong state.
- Safe modification: Add AbortController to cancel in-flight requests. Add request deduplication by task ID. Implement rollback on API error.
- Test coverage: `src/__tests__/api/tasks-assign.test.ts` exists.

**Agent Config Loading in Agent Creation:**
- Files: `src/app/api/agents/create/route.ts` (reads openclaw.json then writes new agent config)
- Why fragile: No locking mechanism. If two simultaneous creates fire, both read original config, both write, second write overwrites first.
- Safe modification: Add file-level locking or atomic writes (write to temp file, rename). Implement creation idempotency (if agent key exists, return existing).
- Test coverage: Need to add concurrency tests.

## Test Coverage Gaps

**API Error Paths:**
- What's not tested: Error handling when Plane API is down, when session files are malformed, when openclaw.json doesn't exist.
- Files: `src/app/api/agents/route.ts`, `src/app/api/activity/route.ts`, `src/app/api/tasks/route.ts`
- Risk: Silent failures mean bugs in error paths go unnoticed until production.
- Priority: High - these endpoints are critical for UI functionality.

**Browser-Side State Management:**
- What's not tested: useEffect cleanup, component unmounting during async operations, rapid page transitions.
- Files: `src/app/page.tsx`, `src/app/kanban/page.tsx`, `src/app/editor/page.tsx`
- Risk: Memory leaks and race conditions may not surface in test suite.
- Priority: Medium - affects performance over time but not immediate UX.

**Canvas Interactions:**
- What's not tested: OfficeCanvas click detection, avatar rendering, tileset loading failures.
- Files: `src/components/OfficeCanvas.tsx`
- Risk: Rendering bugs or interaction failures discovered only by manual testing.
- Priority: Medium - affects visual component but fallback CSS exists.

**Type Safety:**
- What's not tested: Data shape validation on API responses. What happens if /api/agents returns wrong schema?
- Files: All page files that call fetch("/api/agents")
- Risk: Runtime crashes if API contract changes.
- Priority: Medium - need runtime validation layer.

## Missing Critical Features

**Observability:**
- Problem: No error logging, no request tracing, no performance metrics. When users report "it's slow" or "data isn't updating", no logs to investigate.
- Blocks: Debugging production issues, performance optimization.

**Request Cancellation:**
- Problem: No AbortController usage in fetch calls. Navigating away from a page doesn't cancel in-flight requests. Race conditions between multiple fetches.
- Blocks: Proper concurrent request management, memory leak prevention.

**Data Validation Layer:**
- Problem: No schema validation (zod, joi, etc). All external data (APIs, files, localStorage) assumed to match expected shape.
- Blocks: Type safety at runtime, graceful degradation for API contract changes.

**Offline Support:**
- Problem: No service worker, no local cache. If network is slow/down, UI appears frozen instead of showing stale data.
- Blocks: Resilience to connectivity issues, better UX for flaky networks.

## Dependencies at Risk

**@xyflow/react v12.10.1:**
- Risk: Major version (v12). Check if there are breaking changes in v13+. Upgrading could break org chart layout.
- Impact: If left outdated, eventually becomes a security/performance risk.
- Migration plan: Review @xyflow/react changelog before upgrading. Test org chart thoroughly.

**pixi.js v8.16.0:**
- Risk: PixiJS is large and complex. If bugs found in rendering or memory management, difficult to patch without major refactor.
- Impact: AgentWorld component depends on it heavily. Performance issues affect office visualization.
- Migration plan: Monitor pixi.js releases. Consider falling back to simpler Canvas API if performance issues emerge.

**jest v30.2.0, @testing-library versions:**
- Risk: Jest 30 is very recent (released Feb 2025). May have instability. TypeScript support via ts-jest could break.
- Impact: Tests fail unexpectedly, CI/CD blocked.
- Migration plan: Monitor jest releases and ts-jest compatibility. Consider pinning to stable versions (29.x) until 30.x stabilizes.

**next v16.1.6:**
- Risk: Next.js 16 is cutting edge. App Router (used here) is still evolving. Edge Cases in dynamic imports and async components possible.
- Impact: Unforeseen behavior in dynamic rendering, streaming, or cache invalidation.
- Migration plan: Follow Next.js releases carefully. Test major features (office page, kanban sync) on new Next versions before upgrading production.

---

*Concerns audit: 2026-02-23*
