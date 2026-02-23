"use client";

import { useEffect, useRef, useCallback } from "react";
import { AGENT_DESK, renderTilemap, renderFurniture } from "./tilemap";
import { createCharacterSprite, updateWalkAnimation, updateStatusDot, type CharacterSprite } from "./sprites";
import { createCamera, updateCamera, centerOnPoint, handleWheel, handleMouseDown, handleMouseMove, handleMouseUp, type Camera } from "./camera";

interface AgentData {
  key: string;
  emoji: string;
  role: string;
  status: "online" | "idle" | "offline";
  lastActivity: string | null;
  avatarUrl?: string;
}

interface AgentState {
  sprite: CharacterSprite;
  homeX: number;
  homeY: number;
  targetX: number;
  targetY: number;
  waitFrames: number;
  status: string;
  data: AgentData;
}

interface Props {
  onAgentClick: (agent: AgentData, x: number, y: number) => void;
}

export default function OfficeWorld({ onAgentClick }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const appRef = useRef<import("pixi.js").Application | null>(null);
  const agentsRef = useRef<Map<string, AgentState>>(new Map());
  const cameraRef = useRef<Camera | null>(null);
  const worldRef = useRef<import("pixi.js").Container | null>(null);
  const frameRef = useRef(0);
  const cleanupRef = useRef<(() => void) | null>(null);

  const initPixi = useCallback(async () => {
    if (!canvasRef.current) return;
    const PIXI = await import("pixi.js");

    const parent = canvasRef.current.parentElement;
    const w = parent?.clientWidth || 900;
    const h = parent?.clientHeight || 600;

    const app = new PIXI.Application();
    await app.init({
      canvas: canvasRef.current,
      width: w,
      height: h,
      backgroundColor: 0x0d0d14,
      antialias: false,
      resolution: 1,
    });
    appRef.current = app;

    const cam = createCamera(w, h);
    cameraRef.current = cam;

    const world = new PIXI.Container();
    worldRef.current = world;
    app.stage.addChild(world);

    const { container: tilemapContainer } = await renderTilemap(PIXI);
    world.addChild(tilemapContainer);

    const furnitureContainer = renderFurniture(PIXI);
    world.addChild(furnitureContainer);

    centerOnPoint(cam, 480, 350);

    // Ticker
    const tickerFn = () => {
      frameRef.current++;
      const frame = frameRef.current;

      if (cam.followAgent) {
        const agent = agentsRef.current.get(cam.followAgent);
        if (agent && agent.status === "online") {
          centerOnPoint(cam, agent.sprite.container.x, agent.sprite.container.y);
        } else {
          cam.followAgent = null;
        }
      }

      agentsRef.current.forEach((agent) => {
        const { sprite } = agent;
        if (agent.status === "online") {
          const dx = agent.targetX - sprite.container.x;
          const dy = agent.targetY - sprite.container.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 2) {
            if (agent.waitFrames > 0) {
              agent.waitFrames--;
              updateWalkAnimation(sprite, frame, false);
            } else {
              const angle = Math.random() * Math.PI * 2;
              const r = 15 + Math.random() * 25;
              agent.targetX = agent.homeX + Math.cos(angle) * r;
              agent.targetY = agent.homeY + Math.sin(angle) * r;
              agent.waitFrames = 60 + Math.floor(Math.random() * 120);
            }
          } else {
            sprite.container.x += (dx / dist) * 0.8;
            sprite.container.y += (dy / dist) * 0.8;
            updateWalkAnimation(sprite, frame, true);
            // Flip inner body for direction, keep labels unflipped
            sprite.innerContainer.scale.x = dx < 0 ? -1 : 1;
          }
        } else if (agent.status === "idle") {
          const bob = Math.sin(frame * 0.04 + agent.homeX * 0.1) * 2;
          sprite.container.x = agent.homeX;
          sprite.container.y = agent.homeY + bob;
          updateWalkAnimation(sprite, frame, false);
        } else {
          sprite.container.x = agent.homeX;
          sprite.container.y = agent.homeY;
        }
      });

      updateCamera(cam, world);
    };
    app.ticker.add(tickerFn);

    // Mouse handlers for camera
    const canvas = canvasRef.current;
    const onWheel = (e: WheelEvent) => handleWheel(cam, e);
    const onDown = (e: MouseEvent) => handleMouseDown(cam, e);
    const onMove = (e: MouseEvent) => handleMouseMove(cam, e);
    const onUp = () => handleMouseUp(cam);

    canvas.addEventListener("wheel", onWheel, { passive: false });
    canvas.addEventListener("mousedown", onDown);
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);

    const onResize = () => {
      const pw = parent?.clientWidth || 900;
      const ph = parent?.clientHeight || 600;
      app.renderer.resize(pw, ph);
      cam.canvasW = pw;
      cam.canvasH = ph;
    };
    window.addEventListener("resize", onResize);

    cleanupRef.current = () => {
      app.ticker.remove(tickerFn);
      canvas.removeEventListener("wheel", onWheel);
      canvas.removeEventListener("mousedown", onDown);
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      window.removeEventListener("resize", onResize);
    };
  }, []);

  const loadAgents = useCallback(async () => {
    try {
      const res = await fetch("/api/agents");
      if (!res.ok) return;
      const agents: AgentData[] = await res.json();
      if (!appRef.current || !worldRef.current) return;
      const PIXI = await import("pixi.js");

      for (const agent of agents) {
        const existing = agentsRef.current.get(agent.key);
        if (existing) {
          existing.status = agent.status;
          existing.data = agent;
          existing.sprite.container.alpha = agent.status === "offline" ? 0.55 : 1;
          updateStatusDot(PIXI, existing.sprite, agent.status);
        } else {
          const pos = AGENT_DESK[agent.key] || { x: 320, y: 320 };
          const sprite = await createCharacterSprite(PIXI, agent.key, agent.status);
          sprite.container.x = pos.x;
          sprite.container.y = pos.y;
          sprite.container.eventMode = "static";
          sprite.container.cursor = "pointer";
          sprite.container.hitArea = new PIXI.Rectangle(-20, -28, 40, 60);
          sprite.container.on("pointerdown", (e: import("pixi.js").FederatedPointerEvent) => {
            onAgentClick(agent, e.global.x, e.global.y);
          });

          worldRef.current!.addChild(sprite.container);

          agentsRef.current.set(agent.key, {
            sprite,
            homeX: pos.x,
            homeY: pos.y,
            targetX: pos.x,
            targetY: pos.y,
            waitFrames: Math.floor(Math.random() * 60),
            status: agent.status,
            data: agent,
          });
        }
      }
    } catch (err) {
      console.warn("OfficeWorld fetch error:", err);
    }
  }, [onAgentClick]);

  useEffect(() => {
    let intervalId: ReturnType<typeof setInterval>;

    initPixi().then(async () => {
      await loadAgents();
      intervalId = setInterval(loadAgents, 15000);
    });

    return () => {
      clearInterval(intervalId);
      agentsRef.current.clear();
      if (cleanupRef.current) cleanupRef.current();
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
        cursor: "grab",
      }}
    />
  );
}
