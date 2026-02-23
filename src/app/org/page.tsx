"use client";

import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  ReactFlow,
  Node,
  Edge,
  Background,
  BackgroundVariant,
  useNodesState,
  useEdgesState,
  Panel,
  type NodeProps,
  Handle,
  Position,
  useReactFlow,
  ReactFlowProvider,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import dagre from "@dagrejs/dagre";
import Shell from "@/components/Shell";
import AgentCreatorModal from "@/components/AgentCreatorModal";
import AgentDrawer from "@/components/AgentDrawer";

interface AgentInfo {
  key: string;
  dirName?: string;
  emoji: string;
  role: string;
  model: string;
  status: string;
  lastActivity: string | null;
  totalTokens: number;
  avatarUrl?: string;
}

const STATUS_COLORS: Record<string, string> = {
  online: "#00c691",
  idle: "#f59e0b",
  offline: "#ef4444",
};

function AgentNode({ data }: NodeProps) {
  const d = data as unknown as AgentInfo & { onCreateSub?: (key: string) => void };
  const borderColor = STATUS_COLORS[d.status] || "#333";
  const router = useRouter();

  return (
    <>
      <Handle type="target" position={Position.Top} style={{ visibility: "hidden" }} />
      <div
        onClick={() => router.push("/editor?agent=" + d.key)}
        style={{
          background: "#111",
          border: `2px solid ${borderColor}`,
          borderRadius: "12px",
          padding: "16px 20px",
          minWidth: "140px",
          textAlign: "center",
          cursor: "pointer",
          position: "relative",
        }}
      >
        {d.avatarUrl ? (
          <img src={d.avatarUrl} alt={d.key} style={{ width: 40, height: 40, borderRadius: "50%", objectFit: "cover", marginBottom: 4 }} />
        ) : (
          <div style={{ fontSize: "32px", marginBottom: "4px" }}>{d.emoji}</div>
        )}
        <div style={{ fontSize: "14px", fontWeight: 600, color: "#ededed" }}>{d.key}</div>
        <div style={{ fontSize: "10px", color: "#666", marginTop: "2px" }}>{d.role}</div>
        <div
          style={{
            position: "absolute",
            top: "8px",
            right: "8px",
            width: "8px",
            height: "8px",
            borderRadius: "50%",
            background: borderColor,
            animation: d.status === "online" ? "pulse-online 2s ease-in-out infinite" : "none",
          }}
        />
      </div>
      <Handle type="source" position={Position.Bottom} style={{ visibility: "hidden" }} />
    </>
  );
}

const nodeTypes = { agent: AgentNode };

function layoutGraph(nodes: Node[], edges: Edge[]): { nodes: Node[]; edges: Edge[] } {
  const g = new dagre.graphlib.Graph();
  g.setDefaultEdgeLabel(() => ({}));
  g.setGraph({ rankdir: "TB", nodesep: 60, ranksep: 80 });

  nodes.forEach((n) => g.setNode(n.id, { width: 160, height: 120 }));
  edges.forEach((e) => g.setEdge(e.source, e.target));

  dagre.layout(g);

  const laidOut = nodes.map((n) => {
    const pos = g.node(n.id);
    return { ...n, position: { x: pos.x - 80, y: pos.y - 60 } };
  });

  return { nodes: laidOut, edges };
}

// Agents are now loaded dynamically from /api/agents — no hardcoded list.

// Debounce helper
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function debounce<T extends (...args: any[]) => void>(fn: T, ms: number): (...args: Parameters<T>) => void {
  let t: ReturnType<typeof setTimeout>;
  return (...args: Parameters<T>) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), ms);
  };
}

function OrgChartInner({
  agentsData,
  onShowCreator,
  onFetchAgents,
  onNodeClick,
}: {
  agentsData: AgentInfo[];
  onShowCreator: () => void;
  onFetchAgents: () => void;
  onNodeClick?: (agent: AgentInfo) => void;
}) {
  const { fitView } = useReactFlow();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const saveRef = useRef<((...args: any[]) => void) | null>(null);
  const savedLayout = useRef<{ nodes: Node[]; edges: Edge[] } | null>(null);
  const layoutLoaded = useRef(false);

  // Load persisted layout once
  useEffect(() => {
    fetch("/api/hierarchy")
      .then((r) => r.json())
      .then((data) => {
        if (data?.nodes?.length) {
          savedLayout.current = data;
        }
        layoutLoaded.current = true;
      })
      .catch(() => { layoutLoaded.current = true; });
  }, []);

  const { nodes: initialNodes, edges: initialEdges } = useMemo(() => {
    if (agentsData.length === 0) return { nodes: [], edges: [] };

    // Find root agent (dirName === "main" or key === "K")
    const rootAgent =
      agentsData.find((a) => a.dirName === "main" || a.key === "K") ||
      agentsData[0];

    const rawNodes: Node[] = agentsData.map((a) => ({
      id: a.key,
      type: "agent",
      position: { x: 0, y: 0 },
      data: { ...a },
    }));

    const rawEdges: Edge[] = agentsData
      .filter((a) => a.key !== rootAgent.key)
      .map((a) => ({
        id: `${rootAgent.key}-${a.key}`,
        source: rootAgent.key,
        target: a.key,
        style: { stroke: "#333", strokeWidth: 1.5 },
        animated: a.status === "online",
      }));

    return layoutGraph(rawNodes, rawEdges);
  }, [agentsData]);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  // Apply saved or computed layout after first load
  useEffect(() => {
    const apply = () => {
      if (savedLayout.current) {
        // Merge saved positions with current node data (live status)
        const posMap = new Map(savedLayout.current.nodes.map((n) => [n.id, n.position]));
        setNodes(initialNodes.map((n) => ({
          ...n,
          position: posMap.get(n.id) || n.position,
        })));
        setEdges(initialEdges);
      } else {
        setNodes(initialNodes);
        setEdges(initialEdges);
      }
      setTimeout(() => fitView({ padding: 0.15 }), 100);
    };

    if (layoutLoaded.current) {
      apply();
    } else {
      const t = setInterval(() => {
        if (layoutLoaded.current) {
          clearInterval(t);
          apply();
        }
      }, 50);
      return () => clearInterval(t);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialNodes, initialEdges]);

  // Debounced save to API
  const persistLayout = useCallback(
    debounce((updatedNodes: Node[], updatedEdges: Edge[]) => {
      fetch("/api/hierarchy", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nodes: updatedNodes, edges: updatedEdges }),
      }).catch(console.error);
    }, 600),
    []
  );

  saveRef.current = persistLayout;

  const onNodeDragStop = useCallback(
    (_: React.MouseEvent, node: Node) => {
      setNodes((nds) => {
        const updated = nds.map((n) => (n.id === node.id ? node : n));
        saveRef.current?.(updated, edges);
        return updated;
      });
    },
    [edges, setNodes]
  );

  return (
    <div style={{ height: "calc(100vh - 130px)", background: "#0a0a0a", borderRadius: "12px", border: "1px solid #1f1f1f", overflow: "hidden" }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeDragStop={onNodeDragStop}
        onNodeClick={(_: React.MouseEvent, node: Node) => {
          const agent = agentsData.find((a) => a.key === node.id);
          if (agent && onNodeClick) onNodeClick(agent);
        }}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.15 }}
        panOnScroll
        zoomOnScroll
        proOptions={{ hideAttribution: true }}
        style={{ background: "#0a0a0a" }}
      >
        <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="#1a1a1a" />
        <Panel position="top-right" style={{ display: "flex", gap: "8px" }}>
          <button
            onClick={() => fitView({ padding: 0.15 })}
            style={{
              background: "#1a1a1a",
              border: "1px solid #2a2a2a",
              borderRadius: "8px",
              padding: "8px 12px",
              color: "#888",
              fontSize: "13px",
              cursor: "pointer",
            }}
          >
            ⊡ Fit
          </button>
          <button
            onClick={onShowCreator}
            style={{
              background: "#1a3a2a",
              border: "1px solid #2a5a3a",
              borderRadius: "8px",
              padding: "8px 16px",
              color: "#00c691",
              fontSize: "13px",
              cursor: "pointer",
              fontWeight: 600,
            }}
          >
            + Nuevo Agente
          </button>
        </Panel>
      </ReactFlow>
    </div>
  );
}

export default function OrgChartPage() {
  const [agentsData, setAgentsData] = useState<AgentInfo[]>([]);
  const [showCreator, setShowCreator] = useState(false);
  const [drawerAgent, setDrawerAgent] = useState<AgentInfo | null>(null);

  const fetchAgents = useCallback(async () => {
    try {
      const res = await fetch("/api/agents");
      if (res.ok) setAgentsData(await res.json());
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    fetchAgents();
    const i = setInterval(fetchAgents, 30000);
    return () => clearInterval(i);
  }, [fetchAgents]);

  return (
    <Shell>
      <ReactFlowProvider>
        <OrgChartInner
          agentsData={agentsData}
          onShowCreator={() => setShowCreator(true)}
          onFetchAgents={fetchAgents}
          onNodeClick={(agent) => setDrawerAgent(agent)}
        />
      </ReactFlowProvider>

      {showCreator && (
        <AgentCreatorModal
          onClose={() => setShowCreator(false)}
          onCreated={() => {
            setShowCreator(false);
            fetchAgents();
          }}
        />
      )}

      <AgentDrawer agent={drawerAgent} onClose={() => setDrawerAgent(null)} />
    </Shell>
  );
}
