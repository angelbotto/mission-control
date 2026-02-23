import { NextRequest, NextResponse } from "next/server";
import { mkdir, writeFile, readFile, copyFile } from "fs/promises";
import { join } from "path";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);
const OPENCLAW_CONFIG = process.env.OPENCLAW_CONFIG || "/Users/angelbotto/.openclaw/openclaw.json";
const AGENTS_BASE = "/Users/angelbotto/.openclaw/agents";

export async function POST(req: NextRequest) {
  try {
    const { id, name, emoji, role, model, botToken, soul } = await req.json();

    // Validate
    if (!id || !name) {
      return NextResponse.json({ error: "id and name required" }, { status: 400 });
    }
    if (!/^[a-z0-9-]+$/.test(id)) {
      return NextResponse.json({ error: "id must be lowercase letters, numbers, hyphens only" }, { status: 400 });
    }

    const workspaceDir = join(AGENTS_BASE, id, "workspace");
    const sessionsDir = join(AGENTS_BASE, id, "sessions");

    // 1. Create directories
    await mkdir(workspaceDir, { recursive: true });
    await mkdir(sessionsDir, { recursive: true });

    // 2. Write base files
    const files: Record<string, string> = {
      "SOUL.md": soul || `# ${name}\n\n${role || "Agente Bottico"}`,
      "USER.md": `# Usuario\n\nAngel Celis Botto — CEO de Tikin/BEU, CTO de Liftit.\n`,
      "AGENTS.md": `# Agentes\n\nSoy ${name} (${emoji}). Mi rol: ${role || "pendiente"}.\n`,
      "TOOLS.md": `# Tools\n\nHerramientas disponibles para ${name}.\n`,
      "HEARTBEAT.md": "",
      "IDENTITY.md": `# ${name} ${emoji}\n\nRol: ${role || "Agente"}\nModelo: ${model}\n`,
    };

    for (const [filename, content] of Object.entries(files)) {
      await writeFile(join(workspaceDir, filename), content, "utf-8");
    }

    // 3. Backup openclaw.json
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    await copyFile(OPENCLAW_CONFIG, `${OPENCLAW_CONFIG}.bak-${timestamp}`);

    // 4. Update openclaw.json
    const configRaw = await readFile(OPENCLAW_CONFIG, "utf-8");
    const config = JSON.parse(configRaw);

    if (!config.agents) config.agents = [];

    // Check for duplicate
    if (config.agents.find((a: { id: string }) => a.id === id)) {
      return NextResponse.json({ error: `Agent ${id} already exists` }, { status: 409 });
    }

    config.agents.push({
      id,
      label: name,
      model: `anthropic/${model}`,
      workspace: workspaceDir,
    });

    // 5. If bot token, add to telegram accounts
    if (botToken) {
      if (!config.channels) config.channels = {};
      if (!config.channels.telegram) config.channels.telegram = {};
      if (!config.channels.telegram.accounts) config.channels.telegram.accounts = [];
      config.channels.telegram.accounts.push({
        agentId: id,
        token: botToken,
      });
    }

    await writeFile(OPENCLAW_CONFIG, JSON.stringify(config, null, 2), "utf-8");

    // 6. Restart gateway
    try {
      await execAsync("openclaw gateway restart", { timeout: 15000 });
    } catch {
      // Gateway restart may fail but agent is created
    }

    return NextResponse.json({ ok: true, id, workspace: workspaceDir });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}
