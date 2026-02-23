import { NextRequest, NextResponse } from "next/server";
import { readFile, writeFile } from "fs/promises";
import { join } from "path";

const WORKSPACE_MAP: Record<string, string> = {
  main: "/Users/angelbotto/.openclaw/workspace/",
  assistant: "/Users/angelbotto/.openclaw/workspace-assistant/",
  infra: "/Users/angelbotto/.openclaw/workspace-infra/",
  coder: "/Users/angelbotto/.openclaw/workspace-coder/",
  content: "/Users/angelbotto/.openclaw/workspace-content/",
  research: "/Users/angelbotto/.openclaw/workspace-research/",
  finance: "/Users/angelbotto/.openclaw/workspace-finance/",
  kathe: "/Users/angelbotto/.openclaw/workspace-kathe/",
};

function validatePath(path: string): boolean {
  if (path.includes("..")) return false;
  if (path.startsWith("/")) return false;
  if (!/^[a-zA-Z0-9._-]+$/.test(path)) return false;
  return true;
}

export async function GET(req: NextRequest) {
  const agent = req.nextUrl.searchParams.get("agent");
  const path = req.nextUrl.searchParams.get("path");

  if (!agent || !path) {
    return NextResponse.json({ error: "agent and path required" }, { status: 400 });
  }

  const baseDir = WORKSPACE_MAP[agent];
  if (!baseDir) {
    return NextResponse.json({ error: `Unknown agent: ${agent}` }, { status: 400 });
  }

  if (!validatePath(path)) {
    return NextResponse.json({ error: "Invalid path" }, { status: 400 });
  }

  try {
    const content = await readFile(join(baseDir, path), "utf-8");
    return NextResponse.json({ content });
  } catch {
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }
}

export async function PUT(req: NextRequest) {
  const { agent, path, content } = await req.json();

  if (!agent || !path || content === undefined) {
    return NextResponse.json({ error: "agent, path, and content required" }, { status: 400 });
  }

  const baseDir = WORKSPACE_MAP[agent];
  if (!baseDir) {
    return NextResponse.json({ error: `Unknown agent: ${agent}` }, { status: 400 });
  }

  if (!validatePath(path)) {
    return NextResponse.json({ error: "Invalid path" }, { status: 400 });
  }

  try {
    await writeFile(join(baseDir, path), content, "utf-8");
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Write failed" },
      { status: 500 }
    );
  }
}
