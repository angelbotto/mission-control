import type { Container, Texture, Sprite as PIXISprite, Rectangle as PIXIRect } from "pixi.js";

export const TILE = 32;
export const MAP_COLS = 30;
export const MAP_ROWS = 22;
export const MAP_W = MAP_COLS * TILE;
export const MAP_H = MAP_ROWS * TILE;

// Tile IDs
const _ = 0;  // void
const G = 1;  // gray stone floor
const B = 2;  // beige/tan floor
const P = 3;  // parquet/dark brown floor
const W = 4;  // wall
const L = 5;  // lavender/marble floor

// Floor layer — 5 distinct areas + corridor
export const FLOOR: number[][] = [
  [W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W],
  [W,P,P,P,P,P,P,P,P,W,G,G,G,G,G,G,G,G,G,G,W,G,G,G,G,G,G,G,G,W],
  [W,P,P,P,P,P,P,P,P,W,G,G,G,G,G,G,G,G,G,G,W,G,G,G,G,G,G,G,G,W],
  [W,P,P,P,P,P,P,P,P,W,G,G,G,G,G,G,G,G,G,G,W,G,G,G,G,G,G,G,G,W],
  [W,P,P,P,P,P,P,P,P,W,G,G,G,G,G,G,G,G,G,G,W,G,G,G,G,G,G,G,G,W],
  [W,P,P,P,P,P,P,P,P,W,G,G,G,G,G,G,G,G,G,G,W,G,G,G,G,G,G,G,G,W],
  [W,P,P,P,P,P,P,P,P,W,G,G,G,G,G,G,G,G,G,G,W,G,G,G,G,G,G,G,G,W],
  [W,P,P,P,P,P,P,P,P,W,G,G,G,G,G,G,G,G,G,G,W,G,G,G,G,G,G,G,G,W],
  [W,P,P,P,P,P,P,P,P,W,G,G,G,G,G,G,G,G,G,G,W,G,G,G,G,G,G,G,G,W],
  [W,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,W],
  [W,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,W],
  [W,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,W],
  [W,L,L,L,L,L,L,L,L,W,B,B,B,B,B,B,B,B,B,B,W,B,B,B,B,B,B,B,B,W],
  [W,L,L,L,L,L,L,L,L,W,B,B,B,B,B,B,B,B,B,B,W,B,B,B,B,B,B,B,B,W],
  [W,L,L,L,L,L,L,L,L,W,B,B,B,B,B,B,B,B,B,B,W,B,B,B,B,B,B,B,B,W],
  [W,L,L,L,L,L,L,L,L,W,B,B,B,B,B,B,B,B,B,B,W,B,B,B,B,B,B,B,B,W],
  [W,L,L,L,L,L,L,L,L,W,B,B,B,B,B,B,B,B,B,B,W,B,B,B,B,B,B,B,B,W],
  [W,L,L,L,L,L,L,L,L,W,B,B,B,B,B,B,B,B,B,B,W,B,B,B,B,B,B,B,B,W],
  [W,L,L,L,L,L,L,L,L,W,B,B,B,B,B,B,B,B,B,B,W,B,B,B,B,B,B,B,B,W],
  [W,L,L,L,L,L,L,L,L,W,B,B,B,B,B,B,B,B,B,B,W,B,B,B,B,B,B,B,B,W],
  [W,L,L,L,L,L,L,L,L,W,B,B,B,B,B,B,B,B,B,B,W,B,B,B,B,B,B,B,B,W],
  [W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W],
];

// Tile colors for programmatic rendering
const TILE_COLORS: Record<number, number> = {
  [_]: 0x0d0d14,
  [G]: 0x3a3a4a,
  [B]: 0x8b7b5e,
  [P]: 0x5c3a1e,
  [W]: 0x1a1a2a,
  [L]: 0x4a4a6a,
};

// Tile patterns (checkerboard alternating shade for visual depth)
const TILE_ALT_COLORS: Record<number, number> = {
  [G]: 0x424252,
  [B]: 0x938568,
  [P]: 0x6b4428,
  [L]: 0x525274,
};

// Room_Builder_Office_32x32.png tile positions (col, row in spritesheet)
const TILESET_COORDS: Record<number, { col: number; row: number }> = {
  [G]: { col: 0, row: 4 },
  [B]: { col: 3, row: 6 },
  [P]: { col: 3, row: 8 },
  [W]: { col: 0, row: 0 },
  [L]: { col: 0, row: 10 },
};

export interface TilemapResult {
  container: Container;
  wallTiles: Set<string>;
}

export async function renderTilemap(PIXI: typeof import("pixi.js")): Promise<TilemapResult> {
  const container = new PIXI.Container();
  const wallTiles = new Set<string>();

  let roomSheet: Texture | null = null;
  try {
    const loaded: Texture = await PIXI.Assets.load("/tileset/Room_Builder_Office_32x32.png");
    loaded.source.scaleMode = "nearest";
    roomSheet = loaded;
  } catch { /* fallback to colors */ }

  for (let row = 0; row < MAP_ROWS; row++) {
    for (let col = 0; col < MAP_COLS; col++) {
      const tileId = FLOOR[row][col];
      const px = col * TILE;
      const py = row * TILE;

      if (tileId === W) {
        wallTiles.add(`${col},${row}`);
        // Wall: render with texture pattern
        const wallG = new PIXI.Graphics()
          .rect(px, py, TILE, TILE)
          .fill({ color: 0x1a1a2a });
        // Add subtle brick pattern
        wallG.rect(px + 1, py + 1, TILE - 2, TILE / 2 - 1)
          .fill({ color: 0x222238 });
        wallG.rect(px + TILE / 2, py + TILE / 2 + 1, TILE / 2 - 1, TILE / 2 - 2)
          .fill({ color: 0x222238 });
        wallG.rect(px + 1, py + TILE / 2 + 1, TILE / 2 - 2, TILE / 2 - 2)
          .fill({ color: 0x1e1e30 });
        container.addChild(wallG);
        continue;
      }

      if (roomSheet && TILESET_COORDS[tileId]) {
        const coords = TILESET_COORDS[tileId];
        const frame = new PIXI.Rectangle(
          coords.col * TILE,
          coords.row * TILE,
          TILE,
          TILE
        );
        const tex = new PIXI.Texture({
          source: roomSheet.source,
          frame: frame as PIXIRect,
        });
        const sprite = new PIXI.Sprite(tex) as PIXISprite;
        sprite.x = px;
        sprite.y = py;
        sprite.texture.source.scaleMode = "nearest";
        container.addChild(sprite);
      } else {
        // Checkerboard pattern for floor distinction
        const isAlt = (row + col) % 2 === 0;
        const color = isAlt && TILE_ALT_COLORS[tileId]
          ? TILE_ALT_COLORS[tileId]
          : TILE_COLORS[tileId] ?? TILE_COLORS[_];
        const g = new PIXI.Graphics()
          .rect(px, py, TILE, TILE)
          .fill({ color });
        container.addChild(g);
      }
    }
  }

  // Room divider lines along wall edges
  const dividers = new PIXI.Graphics();
  for (let row = 0; row < MAP_ROWS; row++) {
    for (let col = 0; col < MAP_COLS; col++) {
      const tile = FLOOR[row][col];
      if (tile === W) continue;
      const px = col * TILE;
      const py = row * TILE;
      // Check adjacent tiles for wall borders
      if (col > 0 && FLOOR[row][col - 1] === W) {
        dividers.rect(px, py, 2, TILE).fill({ color: 0x0a0a16, alpha: 0.6 });
      }
      if (col < MAP_COLS - 1 && FLOOR[row][col + 1] === W) {
        dividers.rect(px + TILE - 2, py, 2, TILE).fill({ color: 0x0a0a16, alpha: 0.6 });
      }
      if (row > 0 && FLOOR[row - 1][col] === W) {
        dividers.rect(px, py, TILE, 2).fill({ color: 0x0a0a16, alpha: 0.6 });
      }
      if (row < MAP_ROWS - 1 && FLOOR[row + 1][col] === W) {
        dividers.rect(px, py + TILE - 2, TILE, 2).fill({ color: 0x0a0a16, alpha: 0.6 });
      }
    }
  }
  container.addChild(dividers);

  // Room labels
  const rooms = [
    { text: "Oficina CEO", x: 4.5, y: 1.2 },
    { text: "Dev Lab", x: 14, y: 1.2 },
    { text: "Ala Derecha", x: 24.5, y: 1.2 },
    { text: "Corredor", x: 14, y: 9.2 },
    { text: "Lounge", x: 4.5, y: 12.2 },
    { text: "Investigación", x: 14, y: 12.2 },
    { text: "Operaciones", x: 24.5, y: 12.2 },
  ];
  for (const r of rooms) {
    const label = new PIXI.Text({
      text: r.text,
      style: {
        fill: "#666688",
        fontSize: 9,
        fontFamily: "monospace",
        fontWeight: "bold",
        letterSpacing: 1,
      },
    });
    label.x = r.x * TILE;
    label.y = r.y * TILE;
    label.alpha = 0.6;
    container.addChild(label);
  }

  return { container, wallTiles };
}

export function renderFurniture(PIXI: typeof import("pixi.js")): Container {
  const c = new PIXI.Container();

  const drawDesk = (x: number, y: number, color: number = 0x8b7355) => {
    const desk = new PIXI.Graphics()
      .roundRect(x, y, 48, 28, 3)
      .fill({ color })
      .roundRect(x + 2, y + 2, 44, 24, 2)
      .fill({ color: color + 0x111111 });
    c.addChild(desk);

    const monitor = new PIXI.Graphics()
      .rect(x + 16, y - 6, 16, 12)
      .fill({ color: 0x222233 })
      .rect(x + 18, y - 4, 12, 8)
      .fill({ color: 0x4488cc })
      .rect(x + 22, y + 6, 4, 4)
      .fill({ color: 0x444444 });
    c.addChild(monitor);
  };

  const drawChair = (x: number, y: number, color: number = 0x333344) => {
    const chair = new PIXI.Graphics()
      .roundRect(x, y, 20, 20, 4)
      .fill({ color })
      .roundRect(x + 2, y + 2, 16, 16, 3)
      .fill({ color: color + 0x111111 });
    c.addChild(chair);
  };

  const drawPlant = (x: number, y: number) => {
    const plant = new PIXI.Graphics()
      .rect(x + 4, y + 12, 12, 10)
      .fill({ color: 0x8b5e3c })
      .ellipse(x + 10, y + 8, 10, 10)
      .fill({ color: 0x2d8b4e })
      .ellipse(x + 6, y + 4, 6, 6)
      .fill({ color: 0x3aad5e })
      .ellipse(x + 14, y + 6, 5, 5)
      .fill({ color: 0x45b868 });
    c.addChild(plant);
  };

  const drawBookshelf = (x: number, y: number) => {
    const shelf = new PIXI.Graphics()
      .rect(x, y, 32, 48)
      .fill({ color: 0x5c4033 })
      .rect(x + 2, y + 2, 28, 10)
      .fill({ color: 0xcc4444 })
      .rect(x + 2, y + 14, 28, 10)
      .fill({ color: 0x4488cc })
      .rect(x + 2, y + 26, 28, 10)
      .fill({ color: 0xccaa44 })
      .rect(x + 2, y + 38, 28, 8)
      .fill({ color: 0x44aa88 });
    c.addChild(shelf);
  };

  const drawWhiteboard = (x: number, y: number) => {
    const wb = new PIXI.Graphics()
      .rect(x, y, 64, 6)
      .fill({ color: 0x888888 })
      .rect(x + 2, y + 6, 60, 40)
      .fill({ color: 0xe8e8e8 })
      .rect(x + 6, y + 12, 30, 2)
      .fill({ color: 0x333399 })
      .rect(x + 6, y + 18, 22, 2)
      .fill({ color: 0xcc3333 })
      .rect(x + 6, y + 24, 36, 2)
      .fill({ color: 0x333399 });
    c.addChild(wb);
  };

  const drawCouch = (x: number, y: number) => {
    const couch = new PIXI.Graphics()
      .roundRect(x, y, 64, 28, 5)
      .fill({ color: 0x3a3a5a })
      .roundRect(x + 4, y + 4, 24, 20, 3)
      .fill({ color: 0x4a4a6a })
      .roundRect(x + 36, y + 4, 24, 20, 3)
      .fill({ color: 0x4a4a6a });
    c.addChild(couch);
  };

  const drawCoffeeTable = (x: number, y: number) => {
    const table = new PIXI.Graphics()
      .roundRect(x, y, 32, 20, 3)
      .fill({ color: 0x6b5b4a })
      .circle(x + 10, y + 10, 4)
      .fill({ color: 0x884422 })
      .circle(x + 22, y + 10, 3)
      .fill({ color: 0x446688 });
    c.addChild(table);
  };

  // === Room 1: CEO Office (parquet) — top-left ===
  drawDesk(3 * TILE, 3 * TILE);
  drawChair(4 * TILE, 5 * TILE, 0x663399);
  drawPlant(1 * TILE + 8, 1 * TILE + 8);
  drawBookshelf(7 * TILE, 2 * TILE);
  drawPlant(8 * TILE + 8, 7 * TILE);

  // === Room 2: Dev Lab (gray) — top-center ===
  drawDesk(12 * TILE, 3 * TILE);
  drawChair(13 * TILE, 5 * TILE, 0xcc4444);
  drawDesk(16 * TILE, 3 * TILE);
  drawChair(17 * TILE, 5 * TILE, 0x44aa88);
  drawDesk(14 * TILE, 7 * TILE);
  drawChair(15 * TILE, 6 * TILE - 8, 0xcc44aa);
  drawWhiteboard(11 * TILE, 1 * TILE + 8);
  drawPlant(19 * TILE, 1 * TILE + 8);

  // === Room 3: Right wing (gray) — top-right ===
  drawDesk(23 * TILE, 3 * TILE);
  drawChair(24 * TILE, 5 * TILE, 0x8855cc);
  drawDesk(26 * TILE, 3 * TILE);
  drawChair(27 * TILE, 5 * TILE, 0x22aa88);
  drawPlant(28 * TILE, 1 * TILE + 8);

  // === Corridor decorations ===
  drawPlant(5 * TILE, 10 * TILE);
  drawPlant(15 * TILE, 10 * TILE);
  drawPlant(25 * TILE, 10 * TILE);

  // === Room 4: Lounge (lavender) — bottom-left ===
  drawCouch(2 * TILE, 14 * TILE);
  drawCoffeeTable(3 * TILE, 16 * TILE);
  drawCouch(2 * TILE, 18 * TILE);
  drawPlant(1 * TILE + 8, 12 * TILE + 8);
  drawBookshelf(7 * TILE, 13 * TILE);
  drawPlant(8 * TILE, 19 * TILE);

  // === Room 5: Research & Finance (beige) — bottom-center ===
  drawDesk(12 * TILE, 14 * TILE);
  drawChair(13 * TILE, 16 * TILE, 0x5555cc);
  drawDesk(16 * TILE, 14 * TILE);
  drawChair(17 * TILE, 16 * TILE, 0x44aa44);
  drawDesk(14 * TILE, 18 * TILE);
  drawChair(15 * TILE, 17 * TILE - 4, 0xcc8844);
  drawWhiteboard(11 * TILE, 12 * TILE + 8);
  drawPlant(19 * TILE, 19 * TILE);

  // === Room 6: Operations (beige) — bottom-right ===
  drawDesk(23 * TILE, 14 * TILE);
  drawChair(24 * TILE, 16 * TILE, 0x0088cc);
  drawDesk(26 * TILE, 14 * TILE);
  drawChair(27 * TILE, 16 * TILE, 0x9966cc);
  drawPlant(22 * TILE, 19 * TILE);
  drawBookshelf(27 * TILE, 18 * TILE);

  return c;
}

// Agent desk positions in pixel coordinates
export const AGENT_DESK: Record<string, { x: number; y: number }> = {
  main:      { x: 4 * TILE + 16, y: 4 * TILE + 16 },
  coder:     { x: 13 * TILE + 16, y: 4 * TILE + 16 },
  infra:     { x: 17 * TILE + 16, y: 4 * TILE + 16 },
  design:    { x: 15 * TILE + 16, y: 7 * TILE },
  alejo:     { x: 24 * TILE + 16, y: 4 * TILE + 16 },
  stivens:   { x: 27 * TILE + 16, y: 4 * TILE + 16 },
  content:   { x: 15 * TILE + 16, y: 18 * TILE + 16 },
  research:  { x: 13 * TILE + 16, y: 15 * TILE + 16 },
  finance:   { x: 17 * TILE + 16, y: 15 * TILE + 16 },
  assistant: { x: 24 * TILE + 16, y: 15 * TILE + 16 },
  kathe:     { x: 4 * TILE + 16, y: 15 * TILE + 16 },
  alma:      { x: 27 * TILE + 16, y: 15 * TILE + 16 },
};
