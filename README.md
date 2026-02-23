# 🛰️ Mission Control

> **Bottico Agent Network Dashboard** — Centro de mando para el equipo de agentes de IA de Angel Botto.

Mission Control es un dashboard en tiempo real construido con **Next.js 15** que permite monitorear, coordinar y controlar todos los agentes del universo Bottico (K, Vera, Nexo, Arq, Pluma, Oráculo, Vault).

---

## ✨ Features

| Tab | Descripción |
|-----|-------------|
| 📊 **Team Status** | Cards de estado de cada agente — online/idle/offline, tokens, actividad |
| 📡 **Activity Feed** | Stream en tiempo real de eventos de sesión de todos los agentes |
| 📋 **Kanban** | Task manager visual — asignar tareas, mover por columnas, enviar ajustes |
| 🌳 **Org Chart** | Grafo interactivo de la red de agentes con React Flow — drag & drop persistido |
| 📝 **File Editor** | Editor de archivos `.md` de workspaces con CodeMirror 6 (syntax highlighting) |

---

## 🛠️ Stack

| Tecnología | Uso |
|-----------|-----|
| **Next.js 15** | Framework React + App Router + API routes |
| **React 19** | UI |
| **@xyflow/react** (React Flow) | Org Chart interactivo con layout Dagre |
| **CodeMirror 6** | Editor de código con syntax highlighting para Markdown |
| **@dagrejs/dagre** | Auto-layout del org chart (rankdir TB) |
| **Tailwind CSS 4** | Utilidades CSS |
| **TypeScript** | Todo el codebase |
| **Jest + Testing Library** | Suite de tests (84 tests) |

> **Próximamente:** PixiJS para visualizaciones de red en tiempo real.

---

## 🚀 Cómo correrlo localmente

### Requisitos
- Node.js >= 18
- OpenClaw Gateway corriendo en `http://localhost:18789`
- Agentes en `/Users/angelbotto/.openclaw/agents/`

### Setup

```bash
git clone https://github.com/angelbotto/mission-control.git
cd mission-control

npm install

# Crear .env.local con las variables necesarias (ver sección abajo)
cp .env.example .env.local

npm run dev
# → http://localhost:3000
```

### Build para producción

```bash
npm run build

# Correr como standalone
PORT=3001 node .next/standalone/server.js
```

---

## ⚙️ Variables de Entorno

Crear un archivo `.env.local` (o configurar en el entorno):

```env
# Directorio donde viven los agentes de OpenClaw
AGENTS_DIR=/Users/angelbotto/.openclaw/agents

# URL del Gateway de OpenClaw (para estado en tiempo real)
GATEWAY_URL=http://localhost:18789
OPENCLAW_GATEWAY_URL=http://localhost:18789

# Archivo de configuración de OpenClaw
OPENCLAW_CONFIG=/Users/angelbotto/.openclaw/openclaw.json

# Directorio de workspace principal (para guardar mc-hierarchy.json)
WORKSPACE_DIR=/Users/angelbotto/.openclaw/workspace

# Ruta del archivo de jerarquía del Org Chart (opcional)
HIERARCHY_FILE=/Users/angelbotto/.openclaw/workspace/mc-hierarchy.json
```

---

## 🧪 Tests

```bash
# Correr todos los tests
npm test

# CI mode (no falla si no hay tests, force exit)
npm run test:ci
```

**Suites de test:**
- `api/` — Unit tests para API routes (path traversal, validación, clasificación de eventos)
- `components/` — Smoke tests para componentes React (AgentCard, KanbanBoard, OrgChart)
- `integration/` — Tests contra el servidor vivo en `localhost:3001`

---

## 🏗️ Arquitectura

```
src/
├── app/
│   ├── page.tsx              # Team Status
│   ├── activity/page.tsx     # Activity Feed
│   ├── kanban/page.tsx       # Kanban Board
│   ├── org/page.tsx          # Org Chart (React Flow + Dagre)
│   ├── editor/page.tsx       # File Editor (CodeMirror 6)
│   └── api/
│       ├── agents/route.ts   # GET agentes + estado
│       ├── activity/route.ts # GET feed de actividad
│       ├── files/route.ts    # GET/PUT archivos de workspace
│       ├── hierarchy/route.ts# GET/PUT posiciones del org chart
│       └── tasks/assign/     # POST asignar tarea a agente
├── components/
│   ├── Navbar.tsx            # Navegación (responsive — iconos en móvil)
│   ├── Shell.tsx             # Layout wrapper
│   ├── CodeEditor.tsx        # CodeMirror 6 (dynamic import)
│   └── AgentCreatorModal.tsx # Modal para crear agentes
└── lib/
    └── agents.ts             # Definiciones + status logic
```

---

## 📱 Responsive

- **Navbar:** Solo iconos en móvil (< 768px), texto visible en desktop
- **Team Status:** 4 col → 2 col (tablet) → 1 col (móvil)
- **Kanban:** Grid 4 col → scroll horizontal con snap en móvil (estilo Trello)
- **Org Chart:** `fitView` + `panOnScroll` habilitado
- **File Editor:** Sidebar toggle con botón hamburger en móvil

---

## 🔒 Seguridad

- Path traversal bloqueado en `/api/files` — valida que el path no contenga `..`, `/` inicial, ni caracteres especiales
- Solo agentes conocidos pueden ser leídos/escritos
- Workspaces mapeados explícitamente (no path dinámico)

---

## 📸 Screenshot

> *Screenshot placeholder — próximamente*

---

**Made with ❤️ by Arq 🏗️ para el universo Bottico**
