# Codebase Structure

**Analysis Date:** 2026-02-23

## Directory Layout

```
mission-control/
├── src/                     # Application source code
│   ├── app/                 # Next.js App Router pages and API routes
│   │   ├── api/             # Backend API endpoints
│   │   ├── activity/        # Activity feed page
│   │   ├── kanban/          # Kanban board page
│   │   ├── chat/            # Chat interface page
│   │   ├── org/             # Organization chart page
│   │   ├── office/          # Virtual office page (PixiJS)
│   │   ├── editor/          # Code editor page
│   │   ├── layout.tsx       # Root layout with fonts and metadata
│   │   ├── page.tsx         # Home page (dashboard)
│   │   └── globals.css      # Global styles and CSS variables
│   ├── components/          # Reusable React components
│   ├── lib/                 # Shared utilities and constants
│   └── __tests__/           # Test files and mocks
├── public/                  # Static assets (avatars, tilesets)
├── .planning/               # GSD codebase analysis docs
├── package.json             # NPM dependencies and scripts
├── tsconfig.json            # TypeScript configuration
├── jest.config.js           # Jest test configuration
├── next.config.ts           # Next.js configuration
├── eslint.config.mjs        # ESLint rules
└── README.md                # Project documentation
```

## Directory Purposes

**src/app/**
- Purpose: Next.js App Router entry points and server/API logic
- Contains: Page components (TSX), API route handlers (TS)
- Key files: `page.tsx` for pages, `route.ts` for API endpoints

**src/app/api/**
- Purpose: Backend REST API endpoints
- Contains: Route handlers organized by resource (agents, tasks, activity, chat, etc.)
- Key files: `agents/route.ts`, `mc-tasks/route.ts`, `activity/route.ts`

**src/components/**
- Purpose: Reusable UI components
- Contains: Shell layout wrapper, Navbar navigation, OfficeCanvas, AgentWorld, etc.
- Key files: `Shell.tsx`, `Navbar.tsx`, `OfficeCanvas.tsx`, `AgentWorld.tsx`

**src/lib/**
- Purpose: Shared utilities, constants, types, and helpers
- Contains: Agent definitions, formatting functions, status helpers
- Key files: `agents.ts` (AGENTS constant, formatRelativeTime, getStatusFromTimestamp)

**src/__tests__/**
- Purpose: Unit and integration tests
- Contains: Test files colocated by feature (__mocks__, api, components, integration)
- Pattern: Jest test files

**public/**
- Purpose: Static assets served without processing
- Contains: Avatar images, tileset assets for PixiJS
- Key files: `avatars/*.png`, `tileset/`

## Key File Locations

**Entry Points:**
- `src/app/layout.tsx`: Root layout with fonts, metadata, HTML setup
- `src/app/page.tsx`: Home dashboard with agent grid and stats
- `src/app/kanban/page.tsx`: Kanban board main view
- `src/app/api/agents/route.ts`: Agent list API endpoint

**Configuration:**
- `tsconfig.json`: Path aliases (`@/*` → `src/*`), ES2017 target, strict mode
- `next.config.ts`: Environment variables, serverExternalPackages (dagre)
- `package.json`: React 19, Next.js 16, Tailwind, Jest, Testing Library

**Core Logic:**
- `src/app/api/mc-tasks/route.ts`: Task CRUD logic, file persistence
- `src/app/api/agents/route.ts`: Agent discovery from file system + gateway
- `src/app/api/activity/route.ts`: Activity stream parsing from JSONL logs
- `src/app/api/gsd-sync/route.ts`: Auto-sync from ~/.claude/plans/
- `src/lib/agents.ts`: Agent constants and helper functions

**Testing:**
- `src/__tests__/api/`: API route tests
- `src/__tests__/components/`: Component render tests
- `jest.config.js`: Test runner configuration

## Naming Conventions

**Files:**
- Pages: `page.tsx` (Next.js convention)
- API routes: `route.ts` (Next.js convention)
- Components: PascalCase.tsx (e.g., `Shell.tsx`, `Navbar.tsx`)
- Utilities: camelCase.ts (e.g., `agents.ts`)
- Styles: `globals.css` (global), component-scoped via `className`

**Directories:**
- Routes: kebab-case matching URL pattern (e.g., `/api/mc-tasks/[id]/move`)
- Features: kebab-case (e.g., `office/`, `agent-chat/`)
- Utilities: lowercase (e.g., `lib/`, `components/`)

**Variables/Functions:**
- Functions: camelCase (e.g., `formatRelativeTime`, `getStatusFromTimestamp`, `readAgentInfo`)
- Constants: UPPER_SNAKE_CASE (e.g., `AGENTS`, `AGENTS_DIR`, `COLUMNS`)
- React components: PascalCase (e.g., `AgentCard`, `DetailPanel`)
- Types/Interfaces: PascalCase (e.g., `AgentInfo`, `McTask`, `ActivityEvent`)

## Where to Add New Code

**New Feature:**
- Primary code: `src/app/[feature]/page.tsx` for page, `src/app/api/[feature]/route.ts` for API
- Tests: `src/__tests__/components/[feature].test.tsx` or `src/__tests__/api/[feature].test.ts`
- Components: `src/components/[Feature].tsx`

**New Component/Module:**
- Implementation: `src/components/[ComponentName].tsx`
- Tests: `src/__tests__/components/[ComponentName].test.tsx`
- Shared state: Use useState in parent, pass as props (no context)

**Utilities:**
- Shared helpers: `src/lib/[feature].ts`
- Agent-related: Add to `src/lib/agents.ts` or create `src/lib/agents/[aspect].ts`

**API Endpoints:**
- Resource CRUD: `src/app/api/[resource]/route.ts`
- Sub-resources: `src/app/api/[resource]/[id]/[action]/route.ts`

**Styles:**
- Global: `src/app/globals.css` (CSS variables, base rules)
- Component-scoped: Inline styles via `style={}` prop or TailwindCSS classes

## Special Directories

**public/avatars/:**
- Purpose: Agent avatar images
- Generated: No (manually added)
- Committed: Yes
- Pattern: `{agent-name}_v{N}.png`, `{agent-name}_final.png`, etc.

**public/tileset/:**
- Purpose: Tiled map editor tilesets for PixiJS virtual office
- Generated: No (externally created)
- Committed: Yes

**.planning/codebase/:**
- Purpose: GSD codebase analysis documents (ARCHITECTURE.md, STRUCTURE.md, etc.)
- Generated: Yes (by GSD mapping agent)
- Committed: Yes

**.next/**
- Purpose: Next.js build output and type declarations
- Generated: Yes (npm run build)
- Committed: No

**node_modules/:**
- Purpose: NPM dependencies
- Generated: Yes (npm install)
- Committed: No

## Pattern: File Persistence

All data files stored in `WORKSPACE_DIR` (default: `~/.openclaw/workspace/`):

- `mc-tasks.json`: Kanban task store (single file, read/write)
  - Format: `{ tasks: McTask[] }`
  - Accessed by: `src/app/api/mc-tasks/route.ts`

- Agent sessions: `AGENTS_DIR/[dirName]/sessions/[id].jsonl`
  - Format: One JSON event per line, most recent file is current session
  - Accessed by: `src/app/api/agents/route.ts`, `src/app/api/activity/route.ts`

- Agent config: `OPENCLAW_CONFIG` (default: `~/.openclaw/openclaw.json`)
  - Format: JSON with agents.list and subagents.allowAgents
  - Accessed by: `src/app/api/agents/route.ts`

## TypeScript Paths

```json
{
  "@/*": "./src/*"
}
```

Use `@/` prefix for all imports from src:
- `import Shell from "@/components/Shell"`
- `import { AGENTS } from "@/lib/agents"`
- `import { formatRelativeTime } from "@/lib/agents"`

---

*Structure analysis: 2026-02-23*
