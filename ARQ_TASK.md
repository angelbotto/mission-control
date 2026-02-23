# Task: Implementar La Oficina Virtual con PixiJS

## Contexto
Eres Arq, el agente coder de Bottico. Estás trabajando en el repositorio `mission-control`, que es un dashboard Next.js 16 / React 19 para gestionar un equipo de agentes de IA.

La página `/office` actualmente muestra avatares flotando en un grid oscuro. La tarea es reemplazarla con una **oficina virtual estilo RPG top-down** usando PixiJS y el tileset "Modern Office Revamped".

## Archivos del tileset (ya copiados a `/public/tileset/`)
- `Room_Builder_Office_32x32.png` — 512×448px, 16×14 tiles (32px cada tile): pisos, paredes, divisores
- `Modern_Office_32x32.png` — 512×1696px, 16×53 tiles: muebles (escritorios, sillas, computadores, plantas, estantes)
- `Modern_Office_Black_Shadow_32x32.png` — igual que el anterior pero con sombras

## Lo que debes construir

### Objetivo general
Un canvas PixiJS que muestre una oficina isométrica/top-down con:
- Piso con tiles reales del tileset
- Zonas de escritorios para cada agente
- Avatar de cada agente sobre su escritorio (circular, con imagen o emoji)
- Indicador de estado (verde = online, ámbar = idle, gris = offline)
- Click en agente → navega a /editor?agent=KEY
- Refresh automático de estado cada 15 segundos
- La oficina tiene 7 estaciones: K (jefa, centro), Vera, Nexo, Pluma, Arq, Oráculo, Vault

### Agentes
Los agentes se cargan desde `/api/agents` (GET, devuelve array con key, emoji, role, status, lastActivity, avatarUrl).
Los agentes esperados son: k, assistant (Vera), infra (Nexo), content (Pluma), coder (Arq), research (Oráculo), finance (Vault)

## Implementación paso a paso

### 1. Instalar PixiJS
```bash
cd /tmp/arq-office-[tu-directorio]
npm install pixi.js@^7
```

### 2. Crear componente PixiJS
Crea `src/components/OfficeCanvas.tsx`:
- Usar `"use client"` al inicio
- Importar PixiJS dinámicamente dentro de useEffect para evitar problemas SSR
- Canvas que ocupa todo el contenedor padre

### 3. Layout de la oficina (en píxeles de tile, cada tile = 32px)
```
Tamaño canvas: 800×600px (pero responsivo al contenedor)

ZONA K (jefa):     1 escritorio central, arriba
ZONA EQUIPO:       6 escritorios en 2 filas de 3, abajo
  Fila 1: Vera | Nexo | Pluma
  Fila 2: Arq  | Oráculo | Vault

Fondo: tile de piso gris del Room_Builder_Office tileset
Cada estación: escritorio + silla + computador del Modern_Office tileset
```

### 4. Renderizado de tiles
Para el piso:
- Usar PixiJS `TilingSprite` con un tile de piso del Room_Builder_Office_32x32.png
- O usar Graphics para dibujar un fondo oscuro con pattern grid

Para los escritorios/muebles (si quieres usar el tileset directamente):
- Los primeros tiles del Modern_Office_32x32.png (fila 0-1, col 0-3) son escritorios de madera/tan
- Las filas 2-3 tienen sillas de oficina negras
- En vez de hacer un tilemap complejo, puedes usar crop del spritesheet: `new PIXI.Texture(baseTexture, new PIXI.Rectangle(x, y, width, height))`

**ALTERNATIVA MÁS SIMPLE**: Si el tilemap se complica, usa el Canvas 2D API directamente (sin PixiJS) para dibujar el floor pattern y muebles desde el spritesheet. Lo importante es que se vea el tileset real, no solo colores planos.

### 5. Avatar de agente
Cada agente tiene:
- Círculo de fondo (color según status: #00c691 online, #f59e0b idle, #333 offline)
- Imagen circular si tiene avatarUrl, sino emoji grande
- Nombre debajo
- Al pasar el mouse: cursor pointer, escala 1.1
- Al click: router.push(`/editor?agent=${agent.key}`)
- Animación de idle breathing (scaleY 0.97↔1.03, 3s loop) si está online

### 6. Archivo final: `src/app/office/page.tsx`
Reemplazar completamente el contenido actual. Usar dynamic import del componente PixiJS:
```tsx
"use client";
import dynamic from "next/dynamic";
import Shell from "@/components/Shell";

const OfficeCanvas = dynamic(() => import("@/components/OfficeCanvas"), { ssr: false });

export default function OfficePage() {
  return (
    <Shell>
      <h2 style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-muted, #555)", textTransform: "uppercase", letterSpacing: "0.08em", margin: "0 0 12px 0" }}>
        La Oficina
      </h2>
      <div style={{ height: "calc(100vh - 130px)", borderRadius: "12px", overflow: "hidden", border: "1px solid var(--border, #1f1f1f)" }}>
        <OfficeCanvas />
      </div>
    </Shell>
  );
}
```

### 7. Fetching de agentes en el componente
Dentro del OfficeCanvas, usar fetch a /api/agents cada 15s, actualizar el estado visual de los avatares sin re-renderizar todo el canvas.

## Calidad esperada
- Se debe ver el tileset real (no colores planos)
- Los escritorios deben estar alineados en una cuadrícula
- Los avatares deben tener animación sutil
- Todo debe funcionar en `npm run dev` sin errores de TypeScript graves

## Al terminar
1. Asegúrate que `npm run build` o al menos `npm run dev` compila sin errores fatales (warnings OK)
2. Haz commit de todos los cambios: `git add -A && git commit -m "feat(office): PixiJS tilemap virtual office with agent avatars"`
3. Push: `git push origin main`
4. Corre este comando: `openclaw system event --text "Arq terminó: La Oficina Virtual PixiJS está lista y pusheada a GitHub" --mode now`

## Notas importantes
- La app corre en http://100.99.139.9:3001 (NAS), el push a GitHub triggerea un pull manual
- PixiJS v7 es la versión target (no v8)
- El componente OfficeCanvas debe funcionar standalone (no depende de next/router salvo para navegación)
- Si PixiJS da problemas en Next.js 16, puedes usar Canvas 2D API nativo como fallback — lo importante es que use el tileset visual
