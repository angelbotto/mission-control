"use client";

import type * as PIXI from "pixi.js";
import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { formatRelativeTime } from "@/lib/agents";

interface AgentData {
  key: string;
  emoji: string;
  role: string;
  status: "online" | "idle" | "offline";
  lastActivity: string | null;
  avatarUrl?: string;
}

interface AgentSprite {
  container: PIXI.Container;
  homeX: number;
  homeY: number;
  targetX: number;
  targetY: number;
  waitFrames: number;
  ticker: (delta: PIXI.Ticker) => void;
  status: string;
  statusDot: PIXI.Graphics;
  spriteEl: PIXI.Sprite | PIXI.Graphics;
}

const DESK_POSITIONS: Record<string, { x: number; y: number }> = {
  main:      { x: 180, y: 180 },
  assistant: { x: 360, y: 180 },
  infra:     { x: 540, y: 180 },
  content:   { x: 180, y: 350 },
  coder:     { x: 360, y: 350 },
  research:  { x: 540, y: 350 },
  finance:   { x: 180, y: 520 },
  design:    { x: 360, y: 520 },
  kathe:     { x: 540, y: 520 },
  stivens:   { x: 680, y: 350 },
  alejo:     { x: 680, y: 180 },
  alma:      { x: 680, y: 520 },
};

const AVATAR_MAP: Record<string, string> = {
  main:      "/avatars/k_avatar_official.png",
  assistant: "/avatars/vera_avatar.png",
  infra:     "/avatars/nexo_avatar.png",
  content:   "/avatars/pluma_avatar.png",
  coder:     "/avatars/arq_avatar.png",
  research:  "/avatars/oraculo_avatar.png",
  finance:   "/avatars/vault.png",
  design:    "/avatars/iris.png",
};

const STATUS_COLORS: Record<string, number> = {
  online:  0x00c691,
  idle:    0xf59e0b,
  offline: 0x444444,
};

const AGENT_COLORS: Record<string, number> = {
  main:      0x7c3aed,
  assistant: 0x0ea5e9,
  infra:     0x10b981,
  content:   0xf59e0b,
  coder:     0xef4444,
  research:  0x6366f1,
  finance:   0x22c55e,
  design:    0xec4899,
  kathe:     0xf97316,
  stivens:   0x14b8a6,
  alejo:     0x8b5cf6,
  alma:      0xa78bfa,
};

interface Props {
  onAgentClick: (agent: AgentData, x: number, y: number) => void;
}

export default function AgentWorld({ onAgentClick }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const appRef = useRef<import("pixi.js").Application | null>(null);
  const spritesRef = useRef<Map<string, AgentSprite>>(new Map());
  const agentsRef = useRef<AgentData[]>([]);
  const frameRef = useRef(0);

  const initPixi = useCallback(async () => {
    if (!canvasRef.current) return;
    const PIXI = await import("pixi.js");

    const app = new PIXI.Application();
    await app.init({
      canvas: canvasRef.current,
      width: 832,
      height: 700,
      backgroundColor: 0x0d0d14,
      antialias: false,
      resolution: 1,
    });
    appRef.current = app;

    // Load & render background
    try {
      const bgTex = await PIXI.Assets.load("/tileset/office_bg.png");
      const bg = new PIXI.Sprite(bgTex);
      bg.scale.set(2);
      bg.x = 0;
      bg.y = 0;
      // pixel-perfect rendering
      bgTex.source.scaleMode = "nearest";
      app.stage.addChild(bg);
    } catch {
      // fallback: dark grid background
      const grid = new PIXI.Graphics();
      for (let x = 0; x < 832; x += 48) {
        grid.rect(x, 0, 1, 700).fill({ color: 0x1a1a2e });
      }
      for (let y = 0; y < 700; y += 48) {
        grid.rect(0, y, 832, 1).fill({ color: 0x1a1a2e });
      }
      app.stage.addChild(grid);
    }

    // Main ticker
    app.ticker.add(() => {
      frameRef.current++;
      const frame = frameRef.current;

      spritesRef.current.forEach((sprite) => {
        if (sprite.status === "online") {
          // Walk towards target
          const dx = sprite.targetX - sprite.container.x;
          const dy = sprite.targetY - sprite.container.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 1.5) {
            // Reached target
            if (sprite.waitFrames > 0) {
              sprite.waitFrames--;
            } else {
              // Pick new random target near home
              const angle = Math.random() * Math.PI * 2;
              const r = Math.random() * 30;
              sprite.targetX = sprite.homeX + Math.cos(angle) * r;
              sprite.targetY = sprite.homeY + Math.sin(angle) * r;
              sprite.waitFrames = 80 + Math.floor(Math.random() * 80);
            }
          } else {
            sprite.container.x += (dx / dist) * 0.7;
            sprite.container.y += (dy / dist) * 0.7;
          }
        } else if (sprite.status === "idle") {
          // Bob up and down
          const bob = Math.sin(frame * 0.035 + sprite.homeX) * 3;
          sprite.container.x = sprite.homeX;
          sprite.container.y = sprite.homeY + bob;
        } else {
          // Offline — stay at home
          sprite.container.x = sprite.homeX;
          sprite.container.y = sprite.homeY;
        }
      });
    });

  }, []);

  const buildAgentSprite = useCallback(async (agent: AgentData, PIXIModule: typeof import("pixi.js")) => {
    const PIXI = PIXIModule;
    const pos = DESK_POSITIONS[agent.key] || { x: 400, y: 350 };
    const container = new PIXI.Container();
    container.x = pos.x;
    container.y = pos.y;
    container.eventMode = "static";
    container.cursor = "pointer";

    // Avatar circle
    const avatarUrl = AVATAR_MAP[agent.key];
    let avatarEl: PIXI.Sprite | PIXI.Graphics;

    if (avatarUrl) {
      try {
        const tex = await PIXI.Assets.load(avatarUrl);
        const spr = new PIXI.Sprite(tex);
        spr.width = 40;
        spr.height = 40;
        spr.anchor.set(0.5);

        // Circular mask
        const mask = new PIXI.Graphics()
          .circle(0, 0, 20)
          .fill({ color: 0xffffff });
        spr.mask = mask;
        container.addChild(mask);
        container.addChild(spr);
        avatarEl = spr;
      } catch {
        avatarEl = buildEmojiCircle(agent, PIXI);
        container.addChild(avatarEl);
      }
    } else {
      avatarEl = buildEmojiCircle(agent, PIXI);
      container.addChild(avatarEl);
    }

    // Status dot
    const dot = new PIXI.Graphics()
      .circle(14, 14, 5)
      .fill({ color: STATUS_COLORS[agent.status] || STATUS_COLORS.offline });
    container.addChild(dot);

    // Name label with background
    const labelBg = new PIXI.Graphics()
      .roundRect(-28, 24, 56, 16, 4)
      .fill({ color: 0x000000, alpha: 0.6 });
    container.addChild(labelBg);

    const label = new PIXI.Text({
      text: agent.key,
      style: {
        fill: "#cccccc",
        fontSize: 10,
        fontFamily: "Inter, sans-serif",
      },
    });
    label.anchor.set(0.5, 0);
    label.x = 0;
    label.y = 25;
    container.addChild(label);

    // Offline filter
    if (agent.status === "offline") {
      container.alpha = 0.4;
    }

    // Click handler
    container.on("pointerdown", (e: import("pixi.js").FederatedPointerEvent) => {
      onAgentClick(agent, e.global.x, e.global.y);
    });

    const homeX = pos.x;
    const homeY = pos.y;

    const sprite: AgentSprite = {
      container,
      homeX,
      homeY,
      targetX: homeX,
      targetY: homeY,
      waitFrames: Math.floor(Math.random() * 100),
      ticker: () => {},
      status: agent.status,
      statusDot: dot,
      spriteEl: avatarEl,
    };

    spritesRef.current.set(agent.key, sprite);
    return container;
  }, [onAgentClick]);

  function buildEmojiCircle(agent: AgentData, PIXI: typeof import("pixi.js")): PIXI.Graphics {
    const color = AGENT_COLORS[agent.key] || 0x6b7280;
    const circle = new PIXI.Graphics()
      .circle(0, 0, 20)
      .fill({ color });

    const emoji = new PIXI.Text({
      text: agent.emoji,
      style: { fontSize: 18 },
    });
    emoji.anchor.set(0.5);
    circle.addChild(emoji);
    return circle;
  }

  const loadAgents = useCallback(async () => {
    try {
      const res = await fetch("/api/agents");
      if (!res.ok) return;
      const agents: AgentData[] = await res.json();
      agentsRef.current = agents;

      if (!appRef.current) return;
      const PIXI = await import("pixi.js");

      for (const agent of agents) {
        if (spritesRef.current.has(agent.key)) {
          // Update existing sprite status
          const sprite = spritesRef.current.get(agent.key)!;
          sprite.status = agent.status;
          sprite.container.alpha = agent.status === "offline" ? 0.4 : 1;
          sprite.statusDot.clear()
            .circle(14, 14, 5)
            .fill({ color: STATUS_COLORS[agent.status] || STATUS_COLORS.offline });
        } else {
          // Add new sprite
          const container = await buildAgentSprite(agent, PIXI);
          appRef.current!.stage.addChild(container);
        }
      }
    } catch (err) {
      console.warn("AgentWorld fetch error:", err);
    }
  }, [buildAgentSprite]);

  useEffect(() => {
    let intervalId: ReturnType<typeof setInterval>;

    initPixi().then(async () => {
      await loadAgents();
      intervalId = setInterval(loadAgents, 15000);
    });

    return () => {
      clearInterval(intervalId);
      spritesRef.current.clear();
      if (appRef.current) {
        appRef.current.destroy(true);
        appRef.current = null;
      }
    };
  }, [initPixi, loadAgents]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        display: "block",
        width: "100%",
        height: "100%",
        imageRendering: "pixelated",
      }}
    />
  );
}
