# Architecture

**Analysis Date:** 2026-02-23

## Pattern Overview

**Overall:** Next.js 16 monolithic web application with client-side state management and file-system backed API

**Key Characteristics:**
- Next.js App Router (v16) with React 19 for SSR/CSR hybrid rendering
- File-system persistence for tasks and agent metadata
- Fetch-based client-server communication with polling and background sync
- Real-time activity streaming from agent session logs
- Distributed agent orchestration via OpenClaw gateway

## Layers

**API Layer (Backend):**
- Location: `src/app/api/`
- Contains: RESTful route handlers for tasks, agents, chat, activity, GSD sync
- Depends on: File system access, process environment variables
- Used by: Client components via fetch()

**Page/View Layer (Client):**
- Location: `src/app/[page]/page.tsx`
- Contains: 6 main pages (home, activity, kanban, chat, org, office)
- Depends on: Components, lib utilities, API endpoints
- Used by: Browser navigation, Navbar routing

**Component Layer:**
- Location: `src/components/`
- Contains: UI components (Shell, Navbar, OfficeCanvas, AgentWorld, etc.)
- Depends on: Styling, React hooks, downstream utilities
- Used by: Page components

**Utilities/Lib Layer:**
- Location: `src/lib/agents.ts`
- Contains: Agent definitions, status helpers, formatting functions
- Depends on: Runtime types
- Used by: API routes and pages

## Data Flow

**Agent Status Flow:**

1. Client page component calls `GET /api/agents` on mount
2. API reads agent directories: `AGENTS_DIR/[dirName]/sessions/[id].jsonl`
3. API parses latest JSONL file to extract lastActivity, model, token counts
4. API queries OpenClaw gateway for real-time online status (3s timeout)
5. API returns merged agent list with status = online|idle|offline
6. Client renders agent cards, re-polls every 30 seconds

**Task Workflow:**

1. User creates task in Kanban modal or task comes from GSD sync
2. POST `/api/mc-tasks` saves task to file: `WORKSPACE_DIR/mc-tasks.json`
3. Store structure: `{ tasks: McTask[] }` with localStorage sync via page state
4. Task mutations (move, delete, assign) PUT/DELETE `/api/mc-tasks/[id]`
5. Client updates local state optimistically, refetches on interval

**GSD Auto-Sync:**

1. Kanban page POST `/api/gsd-sync` every 5 minutes (background)
2. API reads `~/.claude/plans/` directory recursively
3. For each `.md` file: extracts title and description (first 500 chars)
4. Creates McTask with source="gsd", checks for duplicates
5. Appends to tasks store if new
6. Returns sync count and refreshes client task list

**Activity Stream:**

1. Each agent has session directory: `AGENTS_DIR/[dirName]/sessions/[id].jsonl`
2. `GET /api/activity` reads latest session file for each agent
3. Parses last 50 JSONL lines, extracts events (message, tool_call, model_change, etc.)
4. Classifies and labels events based on type and content
5. Returns 200 most recent events across all agents, sorted by timestamp
6. Client pages refresh every 30-60 seconds

**State Management:**

- No centralized store (Redux/Zustand)
- Component-level useState for UI state
- localStorage for kanban tasks persistence: `localStorage.setItem("mc-tasks-v2", JSON.stringify(tasks))`
- API source-of-truth for agents and activities
- Client optimistic updates with refetch fallback

## Key Abstractions

**McTask:**
- Purpose: Represents a work item in the kanban board
- Examples: `src/app/api/mc-tasks/route.ts`, `src/app/kanban/page.tsx`
- Pattern: Immutable record with id, title, description, column (backlog|queue|working|review|done), source (kanban|gsd|chat)
- Can be assigned to agents and moved between columns

**AgentDef:**
- Purpose: Metadata for Bottico agents (name, emoji, role, model)
- Examples: `src/lib/agents.ts` (AGENTS constant array)
- Pattern: Hardcoded list with fallback to openclaw.json auto-discovery
- Maps dirName (file system) → key (display name)

**ActivityEvent:**
- Purpose: Single action from agent session logs
- Examples: `src/app/api/activity/route.ts`
- Pattern: Parsed from JSONL event streams with type classification and label extraction
- Used for activity feeds, debugging, token tracking

**AgentInfo:**
- Purpose: Aggregated agent runtime data
- Examples: `src/app/api/agents/route.ts`, `src/app/page.tsx`
- Pattern: Combines static metadata (emoji, role) with dynamic state (status, lastActivity, tokens)
- Status derived from lastActivity timestamp: online (<10min), idle (<4h), offline (>4h)

## Entry Points

**Home Page (`/`):**
- Location: `src/app/page.tsx`
- Triggers: Browser navigation, component mounts
- Responsibilities: Displays agent grid, quick stats (tokens, pending tasks), activity feed; fetches agents and activities every 30s

**Kanban Board (`/kanban`):**
- Location: `src/app/kanban/page.tsx`
- Triggers: User click on Kanban nav tab
- Responsibilities: 5-column task board (backlog→done), task CRUD, GSD auto-sync every 5min, task assignment workflow

**Chat Page (`/chat`):**
- Location: `src/app/chat/page.tsx`
- Triggers: User click on Chat nav tab
- Responsibilities: Select agent, load chat history from sessions, send messages via `/api/agent-chat`, poll for new messages

**Activity Feed (`/activity`):**
- Location: `src/app/activity/page.tsx`
- Triggers: User click on Activity nav tab
- Responsibilities: Fetch all agents and their message history, render as conversation list sorted by activity

**Organization Chart (`/org`):**
- Location: `src/app/org/page.tsx`
- Triggers: User click on Org nav tab
- Responsibilities: Fetch and render agent hierarchy via `/api/hierarchy`

**Virtual Office (`/office`):**
- Location: `src/app/office/page.tsx`
- Triggers: User click on Oficina nav tab
- Responsibilities: Load PixiJS world (client-side only), render agent avatars on tilemap, show agent details panel on click

**Code Editor (`/editor`):**
- Location: `src/app/editor/page.tsx`
- Triggers: Click agent from home page
- Responsibilities: Browse and edit agent SOUL.md files via CodeMirror UI

## Error Handling

**Strategy:** Silent failure with fallback data

**Patterns:**
- API errors caught in try/catch, return empty data or null values
- Network timeouts: gateway check uses AbortSignal.timeout(3000)
- File system errors: return empty arrays/objects instead of throwing
- Malformed JSON lines in sessions: skip and continue parsing
- Missing directories: return empty results and log nothing

## Cross-Cutting Concerns

**Logging:** No centralized logger; uses console silently in catch blocks

**Validation:** Minimal; relies on TypeScript strict mode; body validation only for required fields (e.g., title in POST /api/mc-tasks)

**Authentication:** None; application assumes single-user, local development environment

**CORS:** Not enforced; same-origin only (Next.js server and client are same host)

---

*Architecture analysis: 2026-02-23*
