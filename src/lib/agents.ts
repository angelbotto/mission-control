export interface AgentDef {
  key: string;          // Bottico agent name
  emoji: string;
  dirName: string;      // directory name under /agents/
  defaultModel: string;
  role: string;
}

export const AGENTS: AgentDef[] = [
  {
    key: "K",
    emoji: "👾",
    dirName: "main",
    defaultModel: "claude-opus-4-6",
    role: "Orquestador",
  },
  {
    key: "Vera",
    emoji: "🪞",
    dirName: "assistant",
    defaultModel: "claude-sonnet-4-6",
    role: "Asistente",
  },
  {
    key: "Nexo",
    emoji: "🔗",
    dirName: "infra",
    defaultModel: "claude-sonnet-4-6",
    role: "Infraestructura",
  },
  {
    key: "Pluma",
    emoji: "✒️",
    dirName: "content",
    defaultModel: "claude-opus-4-6",
    role: "Contenido",
  },
  {
    key: "Arq",
    emoji: "🏗️",
    dirName: "coder",
    defaultModel: "claude-sonnet-4-6",
    role: "Código",
  },
  {
    key: "Oráculo",
    emoji: "🔮",
    dirName: "research",
    defaultModel: "claude-opus-4-6",
    role: "Investigación",
  },
  {
    key: "Iris",
    emoji: "🎨",
    dirName: "design",
    defaultModel: "claude-sonnet-4-6",
    role: "Diseño Visual",
  },
  {
    key: "Vault",
    emoji: "🏦",
    dirName: "finance",
    defaultModel: "claude-sonnet-4-6",
    role: "Finanzas",
  },
];

export type AgentStatus = "online" | "idle" | "offline";

export function getStatusFromTimestamp(lastActivity: string | null): AgentStatus {
  if (!lastActivity) return "offline";
  const diff = Date.now() - new Date(lastActivity).getTime();
  const minutes = diff / 1000 / 60;
  if (minutes < 10) return "online";       // active in last 10 min
  if (minutes < 240) return "idle";        // active in last 4 hours
  return "offline";                        // inactive > 4 hours
}

export function formatRelativeTime(ts: string | null): string {
  if (!ts) return "nunca";
  const diff = Date.now() - new Date(ts).getTime();
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return `hace ${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `hace ${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `hace ${hours}h`;
  const days = Math.floor(hours / 24);
  return `hace ${days}d`;
}
