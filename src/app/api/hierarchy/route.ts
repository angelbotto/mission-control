import { NextRequest, NextResponse } from "next/server";
import { readFile, writeFile } from "fs/promises";
import path from "path";

const HIERARCHY_PATH =
  process.env.HIERARCHY_FILE ||
  "/Users/angelbotto/.openclaw/workspace/mc-hierarchy.json";

export async function GET() {
  try {
    const raw = await readFile(HIERARCHY_PATH, "utf-8");
    const data = JSON.parse(raw);
    return NextResponse.json(data);
  } catch {
    // File doesn't exist or is unreadable → return null so frontend uses default dagre layout
    return NextResponse.json(null);
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();

    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Invalid body" }, { status: 400 });
    }

    const payload = {
      nodes: body.nodes ?? [],
      edges: body.edges ?? [],
      updatedAt: new Date().toISOString(),
    };

    await writeFile(HIERARCHY_PATH, JSON.stringify(payload, null, 2), "utf-8");
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[hierarchy PUT]", err);
    return NextResponse.json({ error: "Failed to save" }, { status: 500 });
  }
}
