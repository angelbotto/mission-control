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

const MIN_ZOOM = 0.8;
const MAX_ZOOM = 3;
const LERP = 0.1;

export function createCamera(canvasW: number, canvasH: number): Camera {
  // Auto-fit: zoom so the map fills the canvas (cover, not contain)
  const fitZoom = Math.max(canvasW / MAP_W, canvasH / MAP_H, MIN_ZOOM);
  return {
    x: 0,
    y: 0,
    zoom: fitZoom,
    targetX: 0,
    targetY: 0,
    targetZoom: fitZoom,
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

  // Clamp or center
  const scaledW = MAP_W * cam.zoom;
  const scaledH = MAP_H * cam.zoom;

  if (scaledW <= cam.canvasW) {
    // Map fits horizontally — center it
    const cx = (cam.canvasW - scaledW) / 2;
    cam.x = cx;
    cam.targetX = cx;
  } else {
    const minX = cam.canvasW - scaledW;
    cam.x = Math.min(0, Math.max(minX, cam.x));
    cam.targetX = Math.min(0, Math.max(minX, cam.targetX));
  }

  if (scaledH <= cam.canvasH) {
    // Map fits vertically — center it
    const cy = (cam.canvasH - scaledH) / 2;
    cam.y = cy;
    cam.targetY = cy;
  } else {
    const minY = cam.canvasH - scaledH;
    cam.y = Math.min(0, Math.max(minY, cam.y));
    cam.targetY = Math.min(0, Math.max(minY, cam.targetY));
  }

  worldContainer.scale.set(cam.zoom);
  worldContainer.x = cam.x;
  worldContainer.y = cam.y;
}

export function centerOnPoint(cam: Camera, worldX: number, worldY: number) {
  cam.targetX = cam.canvasW / 2 - worldX * cam.zoom;
  cam.targetY = cam.canvasH / 2 - worldY * cam.zoom;
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
