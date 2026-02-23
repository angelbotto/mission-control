import { NextResponse } from "next/server";
import { readFile } from "fs/promises";
import { join } from "path";

const PLANE_BASE = "https://plane.botto.is/api/v1";
const WORKSPACE_SLUG = "tikin";
const TOKEN_PATH = "/Users/angelbotto/.openclaw/workspace/.secrets/plane_api_token.txt";

export interface Task {
  id: string;
  title: string;
  state: string;          // state UUID
  stateName: string;      // human name
  stateGroup: string;     // backlog | unstarted | started | completed | cancelled
  priority: string;       // urgent | high | medium | low | none
  project: string;        // project name
  projectId: string;
  assignees: string[];
  column: "backlog" | "in_progress" | "in_review" | "done";
}

interface TasksResponse {
  tasks: Task[];
  error?: string;
}

// Map Plane state groups to our 4 kanban columns
function mapColumn(group: string): Task["column"] {
  switch (group) {
    case "backlog":
      return "backlog";
    case "started":
      return "in_progress";
    case "unstarted":
      return "in_review";   // "Todo" → "En revisión" (ready to be worked)
    case "completed":
    case "cancelled":
      return "done";
    default:
      return "backlog";
  }
}

async function getToken(): Promise<string | null> {
  try {
    const raw = await readFile(TOKEN_PATH, "utf-8");
    return raw.trim();
  } catch {
    return null;
  }
}

async function planeGet(url: string, token: string) {
  const res = await fetch(url, {
    headers: { "X-API-Key": token },
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) throw new Error(`Plane API ${res.status}: ${url}`);
  return res.json();
}

export async function GET() {
  const token = await getToken();

  if (!token) {
    return NextResponse.json<TasksResponse>(
      { tasks: [], error: "Configure Plane API" },
      { headers: { "Cache-Control": "no-store" } }
    );
  }

  try {
    // 1. Fetch all projects
    const projectsData = await planeGet(
      `${PLANE_BASE}/workspaces/${WORKSPACE_SLUG}/projects/?per_page=50`,
      token
    );
    const projects: Array<{ id: string; name: string }> = (
      projectsData.results || []
    ).map((p: { id: string; name: string }) => ({ id: p.id, name: p.name }));

    // 2. Fetch states & issues for each project (parallel, limit to 20 projects)
    const targetProjects = projects.slice(0, 20);

    const projectData = await Promise.all(
      targetProjects.map(async (proj) => {
        try {
          const [statesData, issuesData] = await Promise.all([
            planeGet(
              `${PLANE_BASE}/workspaces/${WORKSPACE_SLUG}/projects/${proj.id}/states/`,
              token
            ),
            planeGet(
              // Fetch active (non-completed) issues, up to 100 per project
              `${PLANE_BASE}/workspaces/${WORKSPACE_SLUG}/projects/${proj.id}/issues/?per_page=100`,
              token
            ),
          ]);

          const stateMap: Record<string, { name: string; group: string }> = {};
          const statesList = Array.isArray(statesData)
            ? statesData
            : statesData.results || [];
          for (const s of statesList) {
            stateMap[s.id] = { name: s.name, group: s.group };
          }

          const issues: Array<{
            id: string;
            name: string;
            state: string;
            priority: string;
            assignees: string[];
          }> = issuesData.results || [];

          return { proj, stateMap, issues };
        } catch {
          return { proj, stateMap: {}, issues: [] };
        }
      })
    );

    // 3. Build task list — filter out completed/cancelled to keep kanban clean
    //    (we still include them in the "done" column, but limit to recent)
    const tasks: Task[] = [];

    for (const { proj, stateMap, issues } of projectData) {
      for (const issue of issues) {
        const stateInfo = stateMap[issue.state] || { name: "Unknown", group: "backlog" };
        const column = mapColumn(stateInfo.group);

        // Skip "done" issues to avoid noise — comment out if you want them
        if (column === "done") continue;

        tasks.push({
          id: issue.id,
          title: issue.name,
          state: issue.state,
          stateName: stateInfo.name,
          stateGroup: stateInfo.group,
          priority: issue.priority || "none",
          project: proj.name,
          projectId: proj.id,
          assignees: issue.assignees || [],
          column,
        });
      }
    }

    // Sort: urgent first, then high, medium, low, none
    const PRIORITY_ORDER: Record<string, number> = {
      urgent: 0,
      high: 1,
      medium: 2,
      low: 3,
      none: 4,
    };
    tasks.sort(
      (a, b) =>
        (PRIORITY_ORDER[a.priority] ?? 4) - (PRIORITY_ORDER[b.priority] ?? 4)
    );

    return NextResponse.json<TasksResponse>(
      { tasks },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (err) {
    return NextResponse.json<TasksResponse>(
      {
        tasks: [],
        error:
          err instanceof Error ? err.message : "Error connecting to Plane API",
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  }
}
