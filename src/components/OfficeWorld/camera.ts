import type { Container } from "pixi.js";
import { MAP_W, MAP_H } from "./tilemap";

export interface Camera {
  x: number;
  y: number;
  zoom: number;
  targetX: number;
  targetY: number;
  targetZoom: number;
  isDragging: boolean;
  dragStartX: number;
  dragStartY: number;
  camStartX: number;
  camStartY: number;
  followAgent: string | null;
  canvasW: number;
  canvasH: number;
}

const MIN_ZOOM = 1;
const MAX_ZOOM = 3;
const LERP = 0.08;

export function createCamera(canvasW: number, canvasH: number): Camera {
  return {
    x: 0,
    y: 0,
    zoom: 1.2,
    targetX: 0,
    targetY: 0,
    targetZoom: 1.2,
    isDragging: false,
    dragStartX: 0,
    dragStartY: 0,
    camStartX: 0,
    camStartY: 0,
    followAgent: null,
    canvasW,
    canvasH,
  };
}

export function updateCamera(cam: Camera, worldContainer: Container) {
  cam.zoom += (cam.targetZoom - cam.zoom) * LERP;
  cam.x += (cam.targetX - cam.x) * LERP;
  cam.y += (cam.targetY - cam.y) * LERP;

  // Clamp
  const scaledW = MAP_W * cam.zoom;
  const scaledH = MAP_H * cam.zoom;
  const minX = cam.canvasW - scaledW;
  const minY = cam.canvasH - scaledH;
  cam.x = Math.min(0, Math.max(minX, cam.x));
  cam.y = Math.min(0, Math.max(minY, cam.y));
  cam.targetX = Math.min(0, Math.max(minX, cam.targetX));
  cam.targetY = Math.min(0, Math.max(minY, cam.targetY));

  worldContainer.scale.set(cam.zoom);
  worldContainer.x = cam.x;
  worldContainer.y = cam.y;
}

export function centerOnPoint(cam: Camera, worldX: number, worldY: number) {
  cam.targetX = cam.canvasW / 2 - worldX * cam.targetZoom;
  cam.targetY = cam.canvasH / 2 - worldY * cam.targetZoom;
}

export function handleWheel(cam: Camera, e: WheelEvent) {
  e.preventDefault();
  const delta = e.deltaY > 0 ? -0.15 : 0.15;
  cam.targetZoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, cam.targetZoom + delta));
}

export function handleMouseDown(cam: Camera, e: MouseEvent) {
  cam.isDragging = true;
  cam.dragStartX = e.clientX;
  cam.dragStartY = e.clientY;
  cam.camStartX = cam.targetX;
  cam.camStartY = cam.targetY;
  cam.followAgent = null;
}

export function handleMouseMove(cam: Camera, e: MouseEvent) {
  if (!cam.isDragging) return;
  const dx = e.clientX - cam.dragStartX;
  const dy = e.clientY - cam.dragStartY;
  cam.targetX = cam.camStartX + dx;
  cam.targetY = cam.camStartY + dy;
}

export function handleMouseUp(cam: Camera) {
  cam.isDragging = false;
}
