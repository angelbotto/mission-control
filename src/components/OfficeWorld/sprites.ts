import type { Container, Graphics, Text as PIXIText, Texture } from "pixi.js";

export interface CharacterSprite {
  container: Container;
  footL: Graphics;
  footR: Graphics;
  nameLabel: PIXIText;
  statusDot: Graphics;
  bodyColor: number;
}

const AGENT_BODY_COLORS: Record<string, number> = {
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

const STATUS_COLORS: Record<string, number> = {
  online:  0x00c691,
  idle:    0xf59e0b,
  offline: 0x444444,
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

const AGENT_NAMES: Record<string, string> = {
  main: "K", assistant: "Vera", infra: "Nexo", content: "Pluma",
  coder: "Arq", research: "Oráculo", finance: "Vault", design: "Iris",
  kathe: "Kathe", stivens: "Stivens", alejo: "Alejo", alma: "Alma",
};

export async function createCharacterSprite(
  PIXI: typeof import("pixi.js"),
  agentKey: string,
  status: string,
): Promise<CharacterSprite> {
  const container = new PIXI.Container();
  const bodyColor = AGENT_BODY_COLORS[agentKey] || 0x6b7280;

  // Shadow
  const shadow = new PIXI.Graphics()
    .ellipse(0, 20, 10, 4)
    .fill({ color: 0x000000, alpha: 0.3 });
  container.addChild(shadow);

  // Body (torso)
  const body = new PIXI.Graphics()
    .roundRect(-7, 0, 14, 16, 2)
    .fill({ color: bodyColor });
  container.addChild(body);

  // Head
  const head = new PIXI.Graphics()
    .roundRect(-8, -16, 16, 16, 4)
    .fill({ color: 0xf5d0a9 });
  container.addChild(head);

  // Try to load avatar as face texture
  const avatarUrl = AVATAR_MAP[agentKey];
  if (avatarUrl) {
    try {
      const tex: Texture = await PIXI.Assets.load(avatarUrl);
      const face = new PIXI.Sprite(tex);
      face.width = 14;
      face.height = 14;
      face.x = -7;
      face.y = -15;
      const mask = new PIXI.Graphics()
        .roundRect(-7, -15, 14, 14, 3)
        .fill({ color: 0xffffff });
      face.mask = mask;
      container.addChild(mask);
      container.addChild(face);
    } catch {
      addPixelFace(PIXI, container);
    }
  } else {
    addPixelFace(PIXI, container);
  }

  // Arms
  const armL = new PIXI.Graphics()
    .roundRect(-10, 2, 4, 10, 1)
    .fill({ color: bodyColor - 0x111111 });
  const armR = new PIXI.Graphics()
    .roundRect(6, 2, 4, 10, 1)
    .fill({ color: bodyColor - 0x111111 });
  container.addChild(armL, armR);

  // Feet (animated)
  const footL = new PIXI.Graphics()
    .roundRect(-6, 16, 5, 6, 1)
    .fill({ color: 0x333333 });
  const footR = new PIXI.Graphics()
    .roundRect(1, 16, 5, 6, 1)
    .fill({ color: 0x333333 });
  container.addChild(footL, footR);

  // Status dot
  const statusDot = new PIXI.Graphics()
    .circle(10, -14, 4)
    .fill({ color: STATUS_COLORS[status] || STATUS_COLORS.offline });
  container.addChild(statusDot);

  // Name label
  const name = AGENT_NAMES[agentKey] || agentKey;
  const labelBg = new PIXI.Graphics()
    .roundRect(-20, 24, 40, 14, 3)
    .fill({ color: 0x000000, alpha: 0.7 });
  container.addChild(labelBg);

  const nameLabel = new PIXI.Text({
    text: name,
    style: {
      fill: "#cccccc",
      fontSize: 9,
      fontFamily: "monospace",
      fontWeight: "bold",
    },
  });
  nameLabel.anchor.set(0.5, 0);
  nameLabel.x = 0;
  nameLabel.y = 25;
  container.addChild(nameLabel);

  // Scale for pixel art look
  container.scale.set(1.6);

  if (status === "offline") {
    container.alpha = 0.4;
  }

  return { container, footL, footR, nameLabel, statusDot, bodyColor };
}

function addPixelFace(PIXI: typeof import("pixi.js"), container: Container) {
  const eyes = new PIXI.Graphics()
    .rect(-4, -10, 2, 2).fill({ color: 0xffffff })
    .rect(2, -10, 2, 2).fill({ color: 0xffffff })
    .rect(-3, -9, 1, 1).fill({ color: 0x333333 })
    .rect(3, -9, 1, 1).fill({ color: 0x333333 });
  container.addChild(eyes);
}

export function updateWalkAnimation(
  sprite: CharacterSprite,
  frame: number,
  isMoving: boolean,
) {
  if (isMoving) {
    const walkFrame = Math.floor(frame / 8) % 2;
    sprite.footL.y = walkFrame === 0 ? -2 : 2;
    sprite.footR.y = walkFrame === 0 ? 2 : -2;
  } else {
    sprite.footL.y = 0;
    sprite.footR.y = 0;
  }
}

export function updateStatusDot(
  PIXI: typeof import("pixi.js"),
  sprite: CharacterSprite,
  status: string,
) {
  sprite.statusDot.clear()
    .circle(10, -14, 4)
    .fill({ color: STATUS_COLORS[status] || STATUS_COLORS.offline });
}
