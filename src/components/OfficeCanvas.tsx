"use client";

import { useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";

interface Agent {
  key: string;
  emoji: string;
  role: string;
  status: string;
  lastActivity: string | null;
  avatarUrl?: string;
}

// Office layout: 7 desks in an open-plan arrangement
// K (jefa) gets the top center, team gets 2 rows of 3 below
const DESK_LAYOUT = [
  { key: "k",        label: "K",       col: 3, row: 0 }, // CEO center-top
  { key: "assistant",label: "Vera",    col: 0, row: 2 },
  { key: "infra",    label: "Nexo",    col: 2, row: 2 },
  { key: "content",  label: "Pluma",   col: 4, row: 2 },
  { key: "coder",    label: "Arq",     col: 0, row: 4 },
  { key: "research", label: "Oráculo", col: 2, row: 4 },
  { key: "finance",  label: "Vault",   col: 4, row: 4 },
];

const STATUS_COLOR: Record<string, string> = {
  online:  "#00c691",
  idle:    "#f59e0b",
  offline: "#3a3a3a",
};
const STATUS_GLOW: Record<string, string> = {
  online:  "rgba(0,198,145,0.35)",
  idle:    "rgba(245,158,11,0.35)",
  offline: "transparent",
};

const TILE = 32;
const DESK_W = 2 * TILE; // each desk zone is 2×2 tiles
const DESK_H = 2 * TILE;
const COL_STRIDE = 160; // px between desk columns
const ROW_STRIDE = 180; // px between desk rows
const CANVAS_PAD = 40;

export default function OfficeCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const agentsRef = useRef<Agent[]>([]);
  const animFrameRef = useRef<number>(0);
  const tickRef = useRef(0);
  const router = useRouter();

  // Tileset images
  const floorImgRef  = useRef<HTMLImageElement | null>(null);
  const furniImgRef  = useRef<HTMLImageElement | null>(null);
  const shadowImgRef = useRef<HTMLImageElement | null>(null);
  const avatarImgsRef = useRef<Record<string, HTMLImageElement>>({});

  const loadImage = (src: string): Promise<HTMLImageElement> =>
    new Promise((res, rej) => {
      const img = new Image();
      img.onload = () => res(img);
      img.onerror = rej;
      img.src = src;
    });

  // ── Tile helpers ──────────────────────────────────────────────
  // Room_Builder_Office_32x32.png: 16 cols × 14 rows
  // Row 4 (y=128): gray stone floor — col 8 (x=256)
  // Row 5 (y=160): lighter gray   — col 8 (x=256)
  // Row 8 (y=256): dark brown tile  — col 12 (x=384)
  // Row 9 (y=288): tan/beige tile   — col 0  (x=0)

  const drawTile = (
    ctx: CanvasRenderingContext2D,
    img: HTMLImageElement,
    srcCol: number, srcRow: number,
    dstX: number, dstY: number,
    scale = 1
  ) => {
    ctx.drawImage(
      img,
      srcCol * TILE, srcRow * TILE, TILE, TILE,
      dstX, dstY, TILE * scale, TILE * scale
    );
  };

  // Draw a desk station from the furniture sheet
  // Modern_Office_32x32.png row 0-1 cols 0-3: wood desk (2×2 tiles)
  const drawDesk = (
    ctx: CanvasRenderingContext2D,
    furni: HTMLImageElement,
    x: number, y: number
  ) => {
    // Draw desk (2x2 tiles from row 0, col 0)
    drawTile(ctx, furni, 0, 0, x,        y);
    drawTile(ctx, furni, 1, 0, x + TILE, y);
    drawTile(ctx, furni, 0, 1, x,        y + TILE);
    drawTile(ctx, furni, 1, 1, x + TILE, y + TILE);
  };

  // Draw chair below the desk (row 2, col 0 in furniture sheet)
  const drawChair = (
    ctx: CanvasRenderingContext2D,
    furni: HTMLImageElement,
    x: number, y: number
  ) => {
    drawTile(ctx, furni, 2, 2, x + TILE / 2, y);
  };

  // Draw monitor on desk (row 4, col 8 in furniture sheet)
  const drawMonitor = (
    ctx: CanvasRenderingContext2D,
    furni: HTMLImageElement,
    x: number, y: number
  ) => {
    drawTile(ctx, furni, 8, 4, x + TILE / 4, y - TILE / 2);
  };

  const getDeskPos = (col: number, row: number) => ({
    x: CANVAS_PAD + col * COL_STRIDE,
    y: CANVAS_PAD + row * ROW_STRIDE + 60, // +60 for title bar
  });

  const drawAgent = (
    ctx: CanvasRenderingContext2D,
    agent: Agent | undefined,
    slot: typeof DESK_LAYOUT[0],
    tick: number
  ) => {
    const { x, y } = getDeskPos(slot.col, slot.row);

    const status = agent?.status || "offline";
    const color  = STATUS_COLOR[status] || STATUS_COLOR.offline;
    const glow   = STATUS_GLOW[status]  || "transparent";

    // Subtle breathing: online agents bob slightly
    const breathe = status === "online"
      ? Math.sin((tick / 60) * (Math.PI * 2) * 0.3) * 2
      : 0;

    const cx = x + DESK_W / 2;
    const avatarY = y - 52 + breathe;
    const R = 22;

    // Glow ring
    if (status !== "offline") {
      const grad = ctx.createRadialGradient(cx, avatarY, R * 0.8, cx, avatarY, R * 1.6);
      grad.addColorStop(0, glow);
      grad.addColorStop(1, "transparent");
      ctx.beginPath();
      ctx.arc(cx, avatarY, R * 1.6, 0, Math.PI * 2);
      ctx.fillStyle = grad;
      ctx.fill();
    }

    // Avatar circle bg
    ctx.beginPath();
    ctx.arc(cx, avatarY, R, 0, Math.PI * 2);
    ctx.fillStyle = "#1a1a1a";
    ctx.fill();
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.stroke();

    // Avatar image or emoji
    const avatarImg = agent?.avatarUrl ? avatarImgsRef.current[agent.key] : null;
    if (avatarImg?.complete && avatarImg.naturalWidth > 0) {
      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, avatarY, R - 1, 0, Math.PI * 2);
      ctx.clip();
      ctx.drawImage(avatarImg, cx - R + 1, avatarY - R + 1, (R - 1) * 2, (R - 1) * 2);
      ctx.restore();
    } else {
      const emoji = agent?.emoji || "🤖";
      ctx.font = `${R}px serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(emoji, cx, avatarY);
    }

    // Status dot
    ctx.beginPath();
    ctx.arc(cx + R * 0.7, avatarY + R * 0.7, 5, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
    ctx.strokeStyle = "#0a0a0a";
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Name label
    const name = agent?.key || slot.key;
    ctx.font = "bold 10px 'Inter', sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    ctx.fillStyle = status === "offline" ? "#444" : "#ccc";
    ctx.fillText(name, cx, avatarY + R + 5);

    // Role label
    if (agent?.role) {
      ctx.font = "9px 'Inter', sans-serif";
      ctx.fillStyle = "#555";
      ctx.fillText(agent.role.slice(0, 14), cx, avatarY + R + 17);
    }
  };

  const render = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const W = canvas.width;
    const H = canvas.height;
    tickRef.current++;
    const tick = tickRef.current;

    // ── Background ──────────────────────────────────────────────
    ctx.fillStyle = "#0d0d0d";
    ctx.fillRect(0, 0, W, H);

    // Tile the floor using Room_Builder tileset (gray floor = row 5, col 8)
    const floor = floorImgRef.current;
    if (floor?.complete && floor.naturalWidth > 0) {
      for (let fy = 0; fy < H; fy += TILE) {
        for (let fx = 0; fx < W; fx += TILE) {
          drawTile(ctx, floor, 8, 5, fx, fy);
        }
      }
      // Darker accent strip on top
      for (let fx = 0; fx < W; fx += TILE) {
        drawTile(ctx, floor, 8, 4, fx, 0);
        drawTile(ctx, floor, 8, 4, fx, TILE);
      }
    } else {
      // Fallback: dark grid
      ctx.fillStyle = "#111";
      ctx.fillRect(0, 0, W, H);
      ctx.strokeStyle = "#1a1a1a";
      ctx.lineWidth = 1;
      for (let fy = 0; fy < H; fy += TILE) {
        for (let fx = 0; fx < W; fx += TILE) {
          ctx.strokeRect(fx, fy, TILE, TILE);
        }
      }
    }

    // ── Title bar area ──────────────────────────────────────────
    ctx.fillStyle = "rgba(0,0,0,0.6)";
    ctx.fillRect(0, 0, W, 56);
    ctx.font = "bold 13px 'Inter', monospace";
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "#555";
    ctx.fillText("LA OFICINA", 16, 28);

    // Live count
    const online = agentsRef.current.filter(a => a.status === "online").length;
    ctx.font = "11px 'Inter', monospace";
    ctx.textAlign = "right";
    ctx.fillStyle = online > 0 ? "#00c691" : "#444";
    ctx.fillText(`● ${online} online`, W - 16, 28);

    // ── Draw each desk zone ──────────────────────────────────────
    const furni  = furniImgRef.current;
    const shadow = shadowImgRef.current;

    for (const slot of DESK_LAYOUT) {
      const agent = agentsRef.current.find(a => a.key === slot.key);
      const { x, y } = getDeskPos(slot.col, slot.row);

      // Desk area highlight
      ctx.fillStyle = "rgba(255,255,255,0.03)";
      ctx.beginPath();
      ctx.roundRect?.(x - 10, y - 60, DESK_W + 20, DESK_H + 80, 8) ??
        ctx.rect(x - 10, y - 60, DESK_W + 20, DESK_H + 80);
      ctx.fill();

      // Draw desk furniture from tileset
      if (furni?.complete && furni.naturalWidth > 0) {
        drawDesk(ctx, furni, x, y);
        // shadow version on top for depth
        if (shadow?.complete && shadow.naturalWidth > 0) {
          ctx.globalAlpha = 0.4;
          drawDesk(ctx, shadow, x, y);
          ctx.globalAlpha = 1;
        }
        drawMonitor(ctx, furni, x, y);
        drawChair(ctx, furni, x, y + DESK_H - TILE / 2);
      } else {
        // Fallback furniture
        ctx.fillStyle = "#2a2010";
        ctx.fillRect(x, y, DESK_W, DESK_H - 8);
        ctx.fillStyle = "#1a1a20";
        ctx.fillRect(x + 8, y + DESK_H - 8, DESK_W - 16, 24);
        // Monitor
        ctx.fillStyle = "#1e3a5f";
        ctx.fillRect(x + 12, y - 24, TILE + 8, 20);
      }

      // Draw agent avatar
      drawAgent(ctx, agent, slot, tick);
    }

    // ── Separator lines between K zone and team ──────────────────
    ctx.strokeStyle = "rgba(255,255,255,0.06)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    const sepY = getDeskPos(0, 1).y - 10;
    ctx.moveTo(CANVAS_PAD / 2, sepY);
    ctx.lineTo(W - CANVAS_PAD / 2, sepY);
    ctx.stroke();

    animFrameRef.current = requestAnimationFrame(render);
  }, []);

  // ── Hit testing for clicks ────────────────────────────────────
  const handleClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width  / rect.width;
    const scaleY = canvas.height / rect.height;
    const mx = (e.clientX - rect.left) * scaleX;
    const my = (e.clientY - rect.top)  * scaleY;

    for (const slot of DESK_LAYOUT) {
      const { x, y } = getDeskPos(slot.col, slot.row);
      const cx = x + DESK_W / 2;
      const ay = y - 52;
      const dist = Math.hypot(mx - cx, my - ay);
      if (dist < 30) {
        const agent = agentsRef.current.find(a => a.key === slot.key);
        if (agent) router.push(`/editor?agent=${agent.key}`);
        return;
      }
    }
  }, [router]);

  // ── Fetch agents ──────────────────────────────────────────────
  const fetchAgents = useCallback(async () => {
    try {
      const res = await fetch("/api/agents");
      if (!res.ok) return;
      const data: Agent[] = await res.json();
      agentsRef.current = data;

      // Preload avatars
      for (const agent of data) {
        if (agent.avatarUrl && !avatarImgsRef.current[agent.key]) {
          const img = new Image();
          img.crossOrigin = "anonymous";
          img.src = agent.avatarUrl;
          avatarImgsRef.current[agent.key] = img;
        }
      }
    } catch { /* ignore */ }
  }, []);

  // ── Init ──────────────────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Resize canvas to fill container
    const container = canvas.parentElement;
    const resize = () => {
      if (!container) return;
      canvas.width  = container.clientWidth  || 820;
      canvas.height = container.clientHeight || 580;
    };
    resize();
    const ro = new ResizeObserver(resize);
    if (container) ro.observe(container);

    // Load tileset images
    Promise.all([
      loadImage("/tileset/Room_Builder_Office_32x32.png"),
      loadImage("/tileset/Modern_Office_32x32.png"),
      loadImage("/tileset/Modern_Office_Black_Shadow_32x32.png"),
    ]).then(([floor, furni, shadow]) => {
      floorImgRef.current  = floor;
      furniImgRef.current  = furni;
      shadowImgRef.current = shadow;
    }).catch(() => { /* silently fall back to CSS rendering */ });

    // Initial fetch + interval
    fetchAgents();
    const interval = setInterval(fetchAgents, 15000);

    // Start render loop
    animFrameRef.current = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animFrameRef.current);
      clearInterval(interval);
      ro.disconnect();
    };
  }, [fetchAgents, render]);

  return (
    <canvas
      ref={canvasRef}
      onClick={handleClick}
      style={{
        display: "block",
        width: "100%",
        height: "100%",
        cursor: "default",
        imageRendering: "pixelated",
      }}
    />
  );
}
