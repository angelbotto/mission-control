import type { Container, Graphics, Text as PIXIText, Texture } from "pixi.js";

export interface CharacterSprite {
  container: Container;
  innerContainer: Container;
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
  // Inner container for the body — gets flipped for direction
  // Name label stays outside so it doesn't mirror
  const inner = new PIXI.Container();
  container.addChild(inner);

  const bodyColor = AGENT_BODY_COLORS[agentKey] || 0x6b7280;

  // Shadow
  const shadow = new PIXI.Graphics()
    .ellipse(0, 22, 12, 5)
    .fill({ color: 0x000000, alpha: 0.35 });
  inner.addChild(shadow);

  // Body (torso)
  const body = new PIXI.Graphics()
    .roundRect(-8, -2, 16, 18, 3)
    .fill({ color: bodyColor });
  inner.addChild(body);

  // Head
  const head = new PIXI.Graphics()
    .roundRect(-10, -22, 20, 20, 5)
    .fill({ color: 0xf5d0a9 });
  inner.addChild(head);

  // Try to load avatar as face texture
  const avatarUrl = AVATAR_MAP[agentKey];
  if (avatarUrl) {
    try {
      const tex: Texture = await PIXI.Assets.load(avatarUrl);
      const face = new PIXI.Sprite(tex);
      face.width = 18;
      face.height = 18;
      face.x = -9;
      face.y = -21;
      const mask = new PIXI.Graphics()
        .roundRect(-9, -21, 18, 18, 4)
        .fill({ color: 0xffffff });
      mask.visible = false;
      face.mask = mask;
      inner.addChild(mask);
      inner.addChild(face);
    } catch {
      addPixelFace(PIXI, inner);
    }
  } else {
    addPixelFace(PIXI, inner);
  }

  // Arms
  const armL = new PIXI.Graphics()
    .roundRect(-12, 0, 5, 12, 2)
    .fill({ color: bodyColor - 0x111111 });
  const armR = new PIXI.Graphics()
    .roundRect(7, 0, 5, 12, 2)
    .fill({ color: bodyColor - 0x111111 });
  inner.addChild(armL, armR);

  // Feet (animated)
  const footL = new PIXI.Graphics()
    .roundRect(-7, 16, 6, 8, 2)
    .fill({ color: 0x2a2a2a });
  const footR = new PIXI.Graphics()
    .roundRect(1, 16, 6, 8, 2)
    .fill({ color: 0x2a2a2a });
  inner.addChild(footL, footR);

  // Status dot (on outer container so it doesn't flip)
  const statusDot = new PIXI.Graphics()
    .circle(12, -20, 5)
    .fill({ color: STATUS_COLORS[status] || STATUS_COLORS.offline })
    .circle(12, -20, 5)
    .stroke({ width: 1.5, color: 0x0d0d14 });
  container.addChild(statusDot);

  // Name label (on outer container so it doesn't flip)
  const name = AGENT_NAMES[agentKey] || agentKey;
  const labelBg = new PIXI.Graphics()
    .roundRect(-24, 28, 48, 16, 4)
    .fill({ color: 0x000000, alpha: 0.75 });
  container.addChild(labelBg);

  const nameLabel = new PIXI.Text({
    text: name,
    style: {
      fill: "#e0e0e0",
      fontSize: 10,
      fontFamily: "monospace",
      fontWeight: "bold",
    },
  });
  nameLabel.anchor.set(0.5, 0);
  nameLabel.x = 0;
  nameLabel.y = 29;
  container.addChild(nameLabel);

  if (status === "offline") {
    container.alpha = 0.55;
  }

  return { container, innerContainer: inner, footL, footR, nameLabel, statusDot, bodyColor };
}

function addPixelFace(PIXI: typeof import("pixi.js"), container: Container) {
  const eyes = new PIXI.Graphics()
    .rect(-5, -14, 3, 3).fill({ color: 0xffffff })
    .rect(2, -14, 3, 3).fill({ color: 0xffffff })
    .rect(-4, -13, 2, 2).fill({ color: 0x333333 })
    .rect(3, -13, 2, 2).fill({ color: 0x333333 });
  // Mouth
  eyes.rect(-3, -8, 6, 1).fill({ color: 0xcc8866 });
  container.addChild(eyes);
}

export function updateWalkAnimation(
  sprite: CharacterSprite,
  frame: number,
  isMoving: boolean,
) {
  if (isMoving) {
    const walkPhase = Math.sin(frame * 0.4) * 3;
    sprite.footL.y = walkPhase;
    sprite.footR.y = -walkPhase;
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
    .circle(12, -20, 5)
    .fill({ color: STATUS_COLORS[status] || STATUS_COLORS.offline })
    .circle(12, -20, 5)
    .stroke({ width: 1.5, color: 0x0d0d14 });
}
