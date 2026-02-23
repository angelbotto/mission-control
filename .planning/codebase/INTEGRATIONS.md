# External Integrations

**Analysis Date:** 2026-02-23

## APIs & External Services

**OpenAI GPT API:**
- Service: OpenAI API (https://api.openai.com/v1/chat/completions)
- Used for: Prompt enhancement and agent soul generation
- SDK/Client: Native `fetch()` HTTP requests
- Auth: Environment variable `OPENAI_API_KEY`
- Models used:
  - `gpt-4o-mini` - Prompt enhancement (`src/app/api/enhance-prompt/route.ts`)
  - `gpt-4o` - Agent soul generation (`src/app/api/generate-soul/route.ts`)
- Timeout: 10-15 seconds per request

**Bottico OpenClaw Gateway:**
- Service: OpenClaw local gateway
- URL: `OPENCLAW_GATEWAY_URL` or `GATEWAY_URL` (default: `http://localhost:18789`)
- Used for: Agent session message dispatch, agent status queries
- Endpoints:
  - `POST /api/sessions/{sessionKey}/send` - Send message to agent session
  - `GET /api/agents` - Query active agents
- Fallback: CLI command `openclaw sessions send` if HTTP fails
- Connection timeout: 3-15 seconds

**Plane Project Management API:**
- Service: Plane (https://plane.botto.is/api/v1)
- Used for: Fetch tasks from Plane workspace "tikin"
- SDK/Client: Native `fetch()` HTTP requests
- Auth: API token file at `/Users/angelbotto/.openclaw/workspace/.secrets/plane_api_token.txt`
- Authentication header: `X-API-Key: {token}`
- Endpoints:
  - `GET /workspaces/{WORKSPACE_SLUG}/projects/` - List all projects
  - `GET /workspaces/{WORKSPACE_SLUG}/projects/{projectId}/states/` - Fetch state definitions
  - `GET /workspaces/{WORKSPACE_SLUG}/projects/{projectId}/issues/` - Fetch issues/tasks
- Workspace slug: `tikin`
- Timeout: 8 seconds
- Caching: Disabled (`Cache-Control: no-store`)
- Rate limiting: Up to 20 projects fetched in parallel, 100 issues per project

## Data Storage

**Databases:**
- None (no external database)

**File Storage:**
- **Local filesystem only** - No cloud storage
- Task storage: `{WORKSPACE_DIR}/mc-tasks.json` - Mission Control kanban tasks
- Agent hierarchy: `{WORKSPACE_DIR}/mc-hierarchy.json` - Org chart node/edge layout
- GSD plans: `$HOME/.claude/plans/` - Sync source for GSD tasks
- Agent sessions: `{AGENTS_DIR}/{agentName}/sessions/*.jsonl` - JSONL event logs
- Agent config: `openclaw.json` - Agent list and permissions
- Plane API token: `/Users/angelbotto/.openclaw/workspace/.secrets/plane_api_token.txt`

**Caching:**
- None (all API responses set `Cache-Control: no-store`)

## Authentication & Identity

**Auth Provider:**
- Custom/File-based
- OpenClaw gateway expects no auth (local service assumption)
- Plane API uses token-based auth (X-API-Key header)
- OpenAI uses Bearer token auth (Authorization header)

**Sessions:**
- Agent sessions mapped via `AGENT_SESSION_MAP` in `src/app/api/agent-chat/route.ts`:
  - Format: `agent:{dirName}:main`
  - Examples: `agent:main:main`, `agent:assistant:main`, `agent:coder:main`

## Monitoring & Observability

**Error Tracking:**
- None detected

**Logs:**
- Agent activity stored in JSONL session files (`{AGENTS_DIR}/{agentName}/sessions/*.jsonl`)
- Events include: message, tool_call, model_change, session_start, compaction
- Activity API reads last 50 events per agent (`src/app/api/activity/route.ts`)
- Console logging via `console.error()` for server-side errors

**Metrics:**
- Token usage tracked per agent (input/output tokens from API responses)
- Session count per agent
- Last activity timestamp per agent for status determination

## CI/CD & Deployment

**Hosting:**
- Not specified in codebase (development/staging environment unclear)
- Next.js supports Node.js runtime or serverless deployment

**CI Pipeline:**
- None detected

## Environment Configuration

**Required env vars:**
- `OPENAI_API_KEY` - OpenAI API authentication (required for prompt enhancement and soul generation)
- `OPENCLAW_GATEWAY_URL` or `GATEWAY_URL` - Bottico gateway URL (optional, defaults to localhost:18789)

**Optional env vars:**
- `AGENTS_DIR` - Path to agents directory (default: `/Users/angelbotto/.openclaw/agents`)
- `OPENCLAW_CONFIG` - Path to openclaw.json (default: `/Users/angelbotto/.openclaw/openclaw.json`)
- `WORKSPACE_DIR` - Path to workspace directory (default: `/Users/angelbotto/.openclaw/workspace`)
- `HIERARCHY_FILE` - Path to org chart hierarchy file (default: `{WORKSPACE_DIR}/mc-hierarchy.json`)
- `HOME` - User home directory (used for GSD plans directory)

**Secrets location:**
- OpenAI API key: Environment variable `OPENAI_API_KEY` (not checked in)
- Plane API token: `/Users/angelbotto/.openclaw/workspace/.secrets/plane_api_token.txt` (file-based, not checked in)

## Webhooks & Callbacks

**Incoming:**
- None detected (Mission Control is read-only for external services)

**Outgoing:**
- No webhooks sent to external services
- GSD task sync is poll-based: `POST /api/gsd-sync` scans `~/.claude/plans/` directory

## Data Flow Patterns

**Task Management:**
1. Mission Control polls Plane API → transforms state groups to kanban columns
2. GSD sync polls local `~/.claude/plans/` → creates tasks in `mc-tasks.json`
3. Frontend displays tasks from `mc-tasks.json` (merged Plane + GSD + manual)

**Agent Communication:**
1. Frontend sends message to `/api/agent-chat`
2. API calls `openclaw sessions send` CLI or falls back to gateway HTTP
3. Gateway delivers message to agent session
4. Agent processes and stores in JSONL session file

**Agent Discovery:**
1. `/api/agents` reads `openclaw.json` agent list
2. Reads SOUL.md from each agent workspace for metadata
3. Parses latest session JSONL for activity, model, token usage
4. Queries gateway for real-time agent status

---

*Integration audit: 2026-02-23*
