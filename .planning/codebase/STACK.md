# Technology Stack

**Analysis Date:** 2026-02-23

## Languages

**Primary:**
- TypeScript 5 - All source code (`src/**/*.ts`, `src/**/*.tsx`)
- JavaScript - Build and config files (Next.js, Jest, ESLint)

**Secondary:**
- JSON - Configuration, data storage, API responses

## Runtime

**Environment:**
- Node.js (implied by Next.js 16.1.6)
- Browser (React 19.2.3)

**Package Manager:**
- npm (standard Node package manager)
- Lockfile: `package-lock.json` (assumed present)

## Frameworks

**Core:**
- Next.js 16.1.6 - Full-stack React framework with API routes, server components
- React 19.2.3 - UI library, component rendering
- React DOM 19.2.3 - DOM reconciliation and rendering

**UI & Visualization:**
- PixiJS 8.16.0 - GPU-accelerated 2D WebGL renderer for virtual office canvas (`src/components/OfficeCanvas.tsx`)
- @xyflow/react 12.10.1 - Node-based graph visualization for agent hierarchy
- @dagrejs/dagre 2.0.4 - Directed acyclic graph layout engine for org chart
- CodeMirror 6.0.2 + @codemirror/* - Text editor with markdown syntax highlighting (`src/components/Editor.tsx`)

**Styling:**
- Tailwind CSS 4 - Utility-first CSS framework
- PostCSS 4 (@tailwindcss/postcss) - CSS transformation

**Testing:**
- Jest 30.2.0 - Test runner and framework
- @testing-library/react 16.3.2 - React component testing utilities
- @testing-library/jest-dom 6.9.1 - DOM matchers for Jest
- ts-jest 29.4.6 - TypeScript support for Jest
- jest-environment-jsdom 30.2.0 - DOM environment for component tests

**Build & Dev:**
- ESLint 9 - Static code analysis
- eslint-config-next 16.1.6 - Next.js recommended ESLint rules

## Key Dependencies

**Critical:**
- next 16.1.6 - Framework backbone, API routes, deployment
- react 19.2.3 - Core component system
- pixi.js 8.16.0 - Virtual office visualization (heavy computational workload)

**Infrastructure:**
- @xyflow/react 12.10.1 - Org chart/hierarchy visualization
- @dagrejs/dagre 2.0.4 - Graph layout algorithm for hierarchy positioning
- codemirror 6.0.2 - Rich text editor for task descriptions and prompts

**Data & Utilities:**
- crypto (Node.js built-in) - UUID generation (`randomUUID()`)
- fs/promises (Node.js built-in) - File system operations
- child_process (Node.js built-in) - Execute CLI commands (openclaw CLI)

## Configuration

**Environment:**
Set via `next.config.ts` `env` object:
- `AGENTS_DIR` - Path to agents directory (default: `/Users/angelbotto/.openclaw/agents`)
- `GATEWAY_URL` - Bottico gateway endpoint (default: `http://localhost:18789`)
- `OPENCLAW_GATEWAY_URL` - Alternative gateway URL (priority over `GATEWAY_URL`)
- `OPENCLAW_CONFIG` - Path to openclaw.json agent config (default: `/Users/angelbotto/.openclaw/openclaw.json`)
- `WORKSPACE_DIR` - Base workspace directory (default: `/Users/angelbotto/.openclaw/workspace`)

**Build:**
- `next.config.ts` - Next.js configuration with environment variables and external package declaration
- `tsconfig.json` - TypeScript compiler options (target ES2017, strict mode enabled)
- `jest.config.js` - Jest test configuration with 3 projects (API, components, integration)
- `eslint.config.mjs` - ESLint config using Next.js core-web-vitals and TypeScript presets
- `postcss.config.mjs` - PostCSS configuration for Tailwind CSS

## Platform Requirements

**Development:**
- Node.js runtime
- npm package manager
- TypeScript compiler (included in devDependencies)
- OpenClaw CLI (`openclaw` command in PATH) for agent communication

**Production:**
- Next.js standalone deployment
- Bottico gateway reachable via `OPENCLAW_GATEWAY_URL` or `GATEWAY_URL`
- Agent directories accessible via `AGENTS_DIR` path
- Workspace directory accessible via `WORKSPACE_DIR` path

---

*Stack analysis: 2026-02-23*
