import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef } from "react";

export const Route = createFileRoute("/proto/v9")({
  component: V9SpeechBubbles,
});

// ─── CONFIG ─────────────────────────────────────────
const TILE = 16,
  COLS = 22,
  ROWS = 14;
const W = COLS * TILE,
  H = ROWS * TILE;

// ─── COLORS ─────────────────────────────────────────
const C = {
  void: "#1e1e2e",
  wall: "#2a2a3d",
  floorA: "#8B6914",
  floorB: "#A07828",
  floorC: "#B8922E",
  floorD: "#6B4E0A",
  deskA: "#8B6914",
  deskB: "#A07828",
  deskC: "#6B4E0A",
  monFrame: "#555566",
  monScreen: "#334455",
  monGlow: "#55aacc",
  leafA: "#3D8B37",
  leafB: "#2D6B27",
  pot: "#B85C3A",
  potRim: "#8B4422",
  bookR: "#CC4444",
  bookB: "#4477AA",
  bookG: "#44AA66",
  bookY: "#CCAA33",
  bookP: "#9955AA",
  shelfWood: "#5A4010",
  shelfBack: "#3a3a4d",
  bubbleWhite: "#f0f0f4",
  bubbleBorder: "#aaaabc",
  bubbleYellow: "#fff8cc",
  bubbleYellowBorder: "#ccaa33",
};

// ─── SPRITE HELPERS ─────────────────────────────────
type Sprite = (string | null)[][];

function drawSprite(
  ctx: CanvasRenderingContext2D,
  sp: Sprite,
  x: number,
  y: number,
) {
  for (let r = 0; r < sp.length; r++)
    for (let c = 0; c < sp[r].length; c++)
      if (sp[r][c]) {
        ctx.fillStyle = sp[r][c]!;
        ctx.fillRect(x + c, y + r, 1, 1);
      }
}

// ─── TILE SPRITES ───────────────────────────────────
function makeFloor(seed: number): Sprite {
  const s: Sprite = [];
  for (let r = 0; r < 16; r++) {
    const row: (string | null)[] = [];
    for (let c = 0; c < 16; c++) {
      const h = (seed * 7 + r * 13 + c * 31) & 0xff;
      if (r === 0 || c === 0) row.push(C.floorD);
      else if (h % 7 === 0) row.push(C.floorA);
      else if (h % 5 === 0) row.push(C.floorB);
      else row.push(C.floorC);
    }
    s.push(row);
  }
  return s;
}

const WALL_SPRITE: Sprite = (() => {
  const s: Sprite = [];
  for (let r = 0; r < 16; r++) {
    const row: (string | null)[] = [];
    for (let c = 0; c < 16; c++) {
      if (r < 2) row.push("#3a3a5d");
      else if (r === 2) row.push("#4a4a6a");
      else row.push(C.wall);
    }
    s.push(row);
  }
  return s;
})();

// Desk 32x16
function makeDesk(): Sprite {
  const s: Sprite = [];
  for (let r = 0; r < 16; r++) {
    const row: (string | null)[] = [];
    for (let c = 0; c < 32; c++) {
      if (r < 2) row.push(C.deskC);
      else if (r < 4) row.push(C.deskA);
      else if (r < 10) {
        if (c < 2 || c > 29) row.push(C.deskC);
        else row.push(C.deskB);
      } else if (r < 12) row.push(C.deskA);
      else if (r < 14) {
        if ((c >= 2 && c <= 4) || (c >= 27 && c <= 29)) row.push(C.deskA);
        else row.push(null);
      } else {
        if ((c >= 1 && c <= 5) || (c >= 26 && c <= 30)) row.push(C.deskC);
        else row.push(null);
      }
    }
    s.push(row);
  }
  return s;
}

// Monitor 12x10
function makeMonitor(glowing: boolean): Sprite {
  const s: Sprite = [];
  const sc = glowing ? "#2a4455" : C.monScreen;
  const gl = glowing ? C.monGlow : "#445566";
  for (let r = 0; r < 10; r++) {
    const row: (string | null)[] = [];
    for (let c = 0; c < 12; c++) {
      if (r < 1) row.push(c >= 2 && c <= 9 ? C.monFrame : null);
      else if (r < 7) {
        if (c === 1 || c === 10) row.push(C.monFrame);
        else if (c > 1 && c < 10) {
          if (glowing && r % 2 === 0 && c > 2 && c < 9) row.push(gl);
          else row.push(sc);
        } else row.push(null);
      } else if (r === 7) row.push(c >= 1 && c <= 10 ? C.monFrame : null);
      else if (r === 8) row.push(c >= 4 && c <= 7 ? "#666677" : null);
      else row.push(c >= 3 && c <= 8 ? "#555566" : null);
    }
    s.push(row);
  }
  return s;
}

// Chair 12x12
function makeChair(): Sprite {
  const s: Sprite = [];
  for (let r = 0; r < 12; r++) {
    const row: (string | null)[] = [];
    for (let c = 0; c < 12; c++) {
      if (r >= 1 && r <= 6 && c >= 2 && c <= 9) row.push("#664422");
      else if (r >= 7 && r <= 9 && c >= 3 && c <= 8) row.push("#553318");
      else if (r >= 10 && ((c >= 2 && c <= 3) || (c >= 8 && c <= 9)))
        row.push("#553318");
      else row.push(null);
    }
    s.push(row);
  }
  return s;
}

// Plant 12x20
function makePlant(variant: number): Sprite {
  const s: Sprite = [];
  const lA = C.leafA,
    lB = C.leafB;
  for (let r = 0; r < 20; r++) {
    const row: (string | null)[] = [];
    for (let c = 0; c < 12; c++) {
      if (r < 3) {
        const leafy =
          variant === 0
            ? (r === 0 && c >= 3 && c <= 8) ||
              (r === 1 && c >= 2 && c <= 9) ||
              (r === 2 && c >= 1 && c <= 10)
            : (r === 0 && c >= 4 && c <= 7) ||
              (r === 1 && c >= 2 && c <= 9) ||
              (r === 2 && c >= 1 && c <= 10);
        row.push(leafy ? ((c + r) % 3 === 0 ? lB : lA) : null);
      } else if (r < 7) {
        const leafy = c >= 1 && c <= 10 && !((c === 1 || c === 10) && r > 5);
        row.push(leafy ? ((c + r) % 3 === 0 ? lB : lA) : null);
      } else if (r < 9) {
        const leafy = c >= 2 && c <= 9;
        row.push(leafy ? ((c + r) % 4 === 0 ? lB : lA) : null);
      } else if (r < 11) row.push(c >= 5 && c <= 6 ? "#5a7a44" : null);
      else if (r === 11) row.push(c >= 3 && c <= 8 ? C.potRim : null);
      else if (r < 18) {
        row.push(c >= 3 && c <= 8 ? C.pot : null);
      } else if (r === 18) row.push(c >= 4 && c <= 7 ? C.potRim : null);
      else row.push(null);
    }
    s.push(row);
  }
  return s;
}

// Bookshelf 16x24
function makeBookshelf(variant: number): Sprite {
  const s: Sprite = [];
  const bookColors = [
    [C.bookR, C.bookB, C.bookG, C.bookY, C.bookP, C.bookR, C.bookB],
    [C.bookG, C.bookP, C.bookY, C.bookR, C.bookB, C.bookG, C.bookY],
    [C.bookB, C.bookY, C.bookR, C.bookP, C.bookG, C.bookB, C.bookR],
  ][variant % 3];
  for (let r = 0; r < 24; r++) {
    const row: (string | null)[] = [];
    for (let c = 0; c < 16; c++) {
      if (c === 0 || c === 15) row.push(C.shelfWood);
      else if (r === 0 || r === 23) row.push(C.shelfWood);
      else if (r === 8 || r === 16) row.push(C.shelfWood);
      else {
        const section = r < 8 ? 0 : r < 16 ? 1 : 2;
        const localR = r < 8 ? r : r < 16 ? r - 8 : r - 16;
        const bi = (c - 1) % bookColors.length;
        const bCol = bookColors[(bi + section) % bookColors.length];
        if (localR < 2) row.push(C.shelfBack);
        else row.push(bCol);
      }
    }
    s.push(row);
  }
  return s;
}

// Water cooler 12x20
const COOLER: Sprite = (() => {
  const s: Sprite = [];
  for (let r = 0; r < 20; r++) {
    const row: (string | null)[] = [];
    for (let c = 0; c < 12; c++) {
      if (r < 3) row.push(c >= 3 && c <= 8 ? "#aabbdd" : null);
      else if (r < 5) row.push(c >= 4 && c <= 7 ? "#6699cc" : null);
      else if (r < 7) row.push(c >= 2 && c <= 9 ? "#ccccdd" : null);
      else if (r < 15) {
        if (c >= 2 && c <= 9) {
          if (c === 2 || c === 9) row.push("#999aaa");
          else row.push("#bbbbcc");
        } else row.push(null);
      } else if (r < 17) row.push(c >= 3 && c <= 8 ? "#888899" : null);
      else {
        if ((c >= 2 && c <= 3) || (c >= 8 && c <= 9)) row.push("#666677");
        else row.push(null);
      }
    }
    s.push(row);
  }
  return s;
})();

// ─── CHARACTER SPRITES ──────────────────────────────
function makeCharBody(
  skin: string,
  hair: string,
  shirt: string,
  pants: string,
): Sprite {
  const s: Sprite = [];
  for (let r = 0; r < 24; r++) {
    const row: (string | null)[] = [];
    for (let c = 0; c < 16; c++) {
      if (r < 3) row.push(c >= 5 && c <= 10 ? hair : null);
      else if (r >= 3 && r < 5) {
        if (c >= 4 && c <= 11) row.push(hair);
        else row.push(null);
      } else if (r >= 5 && r < 9) {
        if (c >= 5 && c <= 10) {
          if (r === 6 && (c === 6 || c === 9)) row.push("#222233");
          else if (r === 8 && c >= 7 && c <= 8) row.push("#cc8877");
          else row.push(skin);
        } else if (c === 4 || c === 11) row.push(r < 7 ? hair : null);
        else row.push(null);
      } else if (r === 9) row.push(c >= 7 && c <= 8 ? skin : null);
      else if (r >= 10 && r < 16) {
        if (c >= 4 && c <= 11) row.push(shirt);
        else row.push(null);
      } else if (r >= 16 && r < 18) {
        if (c >= 4 && c <= 11) row.push(shirt);
        else row.push(null);
      } else if (r === 18) {
        if ((c >= 3 && c <= 4) || (c >= 11 && c <= 12)) row.push(skin);
        else if (c >= 5 && c <= 10) row.push(pants);
        else row.push(null);
      } else if (r >= 19 && r < 22) {
        if (c >= 5 && c <= 10) row.push(pants);
        else row.push(null);
      } else if (r >= 22) {
        if ((c >= 4 && c <= 6) || (c >= 9 && c <= 11)) row.push("#333344");
        else row.push(null);
      }
    }
    s.push(row);
  }
  return s;
}

function makeTypeFrame(base: Sprite, frame: number): Sprite {
  const s = base.map((r) => [...r]);
  if (frame === 1 && s[17]) {
    s[17][11] = null;
    s[16][12] = s[18]?.[11] || "#ddbb99";
  }
  return s;
}

function makeWalkFrame(base: Sprite, frame: number): Sprite {
  const s = base.map((r) => [...r]);
  if (frame === 0 || frame === 2) return s;
  if (frame === 1 && s[22]) {
    s[22][4] = null;
    s[22][5] = null;
    s[22][6] = null;
    s[22][3] = "#333344";
    s[22][4] = "#333344";
    s[22][5] = "#333344";
  }
  if (frame === 3 && s[22]) {
    s[22][9] = null;
    s[22][10] = null;
    s[22][11] = null;
    s[22][10] = "#333344";
    s[22][11] = "#333344";
    s[22][12] = "#333344";
  }
  return s;
}

// ─── TOOL ICONS (tiny 5x5 pixel sprites) ────────────
const TOOL_ICONS: Record<string, Sprite> = {
  code: [
    [null, "#88bbee", null, "#88bbee", null],
    ["#88bbee", null, null, null, "#88bbee"],
    [null, "#88bbee", null, "#88bbee", null],
    ["#88bbee", null, null, null, "#88bbee"],
    [null, "#88bbee", null, "#88bbee", null],
  ],
  test: [
    [null, "#44aa66", "#44aa66", "#44aa66", null],
    ["#44aa66", null, null, null, "#44aa66"],
    ["#44aa66", null, "#44aa66", null, "#44aa66"],
    ["#44aa66", null, null, null, "#44aa66"],
    [null, "#44aa66", "#44aa66", "#44aa66", null],
  ],
  think: [
    [null, "#ccaa33", "#ccaa33", "#ccaa33", null],
    ["#ccaa33", null, null, null, "#ccaa33"],
    [null, null, "#ccaa33", null, null],
    [null, null, null, null, null],
    [null, null, "#ccaa33", null, null],
  ],
  approve: [
    ["#ccaa33", null, null, null, "#ccaa33"],
    [null, "#ccaa33", null, "#ccaa33", null],
    [null, null, "#ccaa33", null, null],
    [null, "#ccaa33", null, "#ccaa33", null],
    ["#ccaa33", null, null, null, "#ccaa33"],
  ],
};

// ─── SPEECH BUBBLE SPRITE (12x8 base shape) ─────────
function drawBubble(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  text: string,
  isApproval: boolean,
  opacity: number,
) {
  if (opacity <= 0) return;
  ctx.globalAlpha = opacity;

  const charW = 3;
  const textW = text.length * charW + 4;
  const bubbleW = Math.max(12, textW);
  const bubbleH = 8;
  const bx = x - bubbleW / 2;
  const by = y - bubbleH;

  // Border
  ctx.fillStyle = isApproval ? C.bubbleYellowBorder : C.bubbleBorder;
  ctx.fillRect(bx, by, bubbleW, bubbleH);

  // Fill
  ctx.fillStyle = isApproval ? C.bubbleYellow : C.bubbleWhite;
  ctx.fillRect(bx + 1, by + 1, bubbleW - 2, bubbleH - 2);

  // Tail (3px triangle)
  ctx.fillStyle = isApproval ? C.bubbleYellowBorder : C.bubbleBorder;
  ctx.fillRect(x - 1, by + bubbleH, 3, 1);
  ctx.fillRect(x, by + bubbleH + 1, 1, 1);

  ctx.fillStyle = isApproval ? C.bubbleYellow : C.bubbleWhite;
  ctx.fillRect(x, by + bubbleH, 1, 1);

  // Text
  ctx.fillStyle = isApproval ? "#665500" : "#333344";
  ctx.font = "3px monospace";
  ctx.fillText(text, bx + 2, by + 5);

  ctx.globalAlpha = 1.0;
}

// ─── STATUS DOT ─────────────────────────────────────
function drawStatusDot(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  status: "active" | "waiting" | "idle",
  time: number,
) {
  if (status === "active") {
    const pulse = 0.5 + 0.5 * Math.sin(time * 4);
    ctx.globalAlpha = 0.4 + pulse * 0.6;
    ctx.fillStyle = "#4499ff";
    ctx.fillRect(x, y, 3, 3);
    // Glow ring
    ctx.globalAlpha = pulse * 0.3;
    ctx.fillRect(x - 1, y, 5, 1);
    ctx.fillRect(x - 1, y + 2, 5, 1);
    ctx.fillRect(x, y - 1, 3, 1);
    ctx.fillRect(x, y + 3, 3, 1);
    ctx.globalAlpha = 1;
  } else if (status === "waiting") {
    const pulse = 0.6 + 0.4 * Math.sin(time * 2);
    ctx.globalAlpha = pulse;
    ctx.fillStyle = "#ccaa33";
    ctx.fillRect(x, y, 3, 3);
    ctx.globalAlpha = 1;
  } else {
    ctx.fillStyle = "#666677";
    ctx.fillRect(x, y, 3, 3);
  }
}

// ─── TYPES ──────────────────────────────────────────
interface CharDef {
  name: string;
  skin: string;
  hair: string;
  shirt: string;
  pants: string;
  action: string;
  status: "active" | "waiting" | "idle";
  toolIcon: string;
}

interface Character extends CharDef {
  x: number;
  y: number;
  tx: number;
  ty: number;
  state: "TYPE" | "WALK" | "IDLE";
  dir: string;
  base: Sprite;
  typeFrames: Sprite[];
  walkFrames: Sprite[];
  frame: number;
  frameTime: number;
  path: { x: number; y: number }[] | null;
  pathIdx: number;
  deskTx: number;
  deskTy: number;
  walkTimer: number;
  nextWalkTime: number;
  spawnEffect: number;
  spawnCols: number[];
  selected: boolean;
  bubbleOpacity: number;
  bubbleTarget: number;
  bubbleTimer: number;
  bubbleCycleIdx: number;
}

// ─── CHARACTER DEFS ─────────────────────────────────
const CHAR_DEFS: CharDef[] = [
  {
    name: "Alice",
    skin: "#E8B88A",
    hair: "#8B4513",
    shirt: "#CC4444",
    pants: "#334466",
    action: "Writing code...",
    status: "active",
    toolIcon: "code",
  },
  {
    name: "Bob",
    skin: "#D2956A",
    hair: "#1a1a2e",
    shirt: "#4477AA",
    pants: "#333344",
    action: "Thinking...",
    status: "active",
    toolIcon: "think",
  },
  {
    name: "Carol",
    skin: "#F5D0A9",
    hair: "#CC8833",
    shirt: "#44AA66",
    pants: "#3a3a4d",
    action: "Running tests...",
    status: "waiting",
    toolIcon: "test",
  },
  {
    name: "Dave",
    skin: "#C68642",
    hair: "#2a1a0e",
    shirt: "#9955AA",
    pants: "#2a3a4d",
    action: "Need approval",
    status: "waiting",
    toolIcon: "approve",
  },
];

const ACTION_CYCLE = [
  ["Writing code...", "Thinking...", "Running tests..."],
  ["Thinking...", "Writing code...", "Running tests..."],
  ["Running tests...", "Writing code...", "Thinking..."],
  ["Need approval", "Writing code...", "Running tests..."],
];

// ─── WORLD SETUP ────────────────────────────────────
const MAP: number[][] = [];
for (let r = 0; r < ROWS; r++) {
  MAP[r] = [];
  for (let c = 0; c < COLS; c++) {
    MAP[r][c] = r < 2 ? 1 : 0;
  }
}

const WALKABLE: boolean[][] = [];
for (let r = 0; r < ROWS; r++) {
  WALKABLE[r] = [];
  for (let c = 0; c < COLS; c++) {
    WALKABLE[r][c] = MAP[r][c] === 0;
  }
}

// 8 desk positions (4 columns x 2 rows)
const DESK_POSITIONS = [
  { tx: 1, ty: 4 },
  { tx: 5, ty: 4 },
  { tx: 9, ty: 4 },
  { tx: 13, ty: 4 },
  { tx: 1, ty: 9 },
  { tx: 5, ty: 9 },
  { tx: 9, ty: 9 },
  { tx: 13, ty: 9 },
];

// Character desk assignments (characters at desks 0,1,2,3)
const CHAR_DESKS = [0, 1, 2, 3];

// ─── BFS PATHFINDING ────────────────────────────────
function bfs(
  sx: number,
  sy: number,
  ex: number,
  ey: number,
): { x: number; y: number }[] | null {
  if (sx === ex && sy === ey) return [];
  if (!WALKABLE[ey] || !WALKABLE[ey][ex]) return null;
  const visited = Array.from({ length: ROWS }, () => Array(COLS).fill(false));
  const prev: ([number, number] | null)[][] = Array.from({ length: ROWS }, () =>
    Array(COLS).fill(null),
  );
  const q: [number, number][] = [[sx, sy]];
  visited[sy][sx] = true;
  const dirs: [number, number][] = [
    [0, -1],
    [0, 1],
    [-1, 0],
    [1, 0],
  ];
  while (q.length) {
    const [cx, cy] = q.shift()!;
    for (const [dx, dy] of dirs) {
      const nx = cx + dx,
        ny = cy + dy;
      if (
        nx >= 0 &&
        nx < COLS &&
        ny >= 0 &&
        ny < ROWS &&
        !visited[ny][nx] &&
        WALKABLE[ny][nx]
      ) {
        visited[ny][nx] = true;
        prev[ny][nx] = [cx, cy];
        if (nx === ex && ny === ey) {
          const path: { x: number; y: number }[] = [];
          let px = ex,
            py = ey;
          while (px !== sx || py !== sy) {
            path.unshift({ x: px, y: py });
            [px, py] = prev[py][px]!;
          }
          return path;
        }
        q.push([nx, ny]);
      }
    }
  }
  return null;
}

// ─── MAIN COMPONENT ─────────────────────────────────
function V9SpeechBubbles() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    canvas.width = W;
    canvas.height = H;
    ctx.imageSmoothingEnabled = false;

    // ── Build furniture ──
    const furniture: {
      type: string;
      tx: number;
      ty: number;
      sprite: Sprite;
      sortY: number;
    }[] = [];
    const floorTiles: { tx: number; ty: number; sprite: Sprite }[] = [];

    for (let r = 0; r < ROWS; r++)
      for (let c = 0; c < COLS; c++)
        if (MAP[r][c] === 0)
          floorTiles.push({ tx: c, ty: r, sprite: makeFloor(r * COLS + c) });

    // Bookshelves on back wall
    [0, 2, 4, 8, 10, 17, 19, 21].forEach((tx, i) => {
      furniture.push({
        type: "shelf",
        tx,
        ty: 1,
        sprite: makeBookshelf(i),
        sortY: 3 * TILE,
      });
      WALKABLE[2][tx] = false;
    });

    // 8 desks
    const DESK_SPRITE = makeDesk();
    DESK_POSITIONS.forEach((d) => {
      furniture.push({
        type: "desk",
        tx: d.tx,
        ty: d.ty,
        sprite: DESK_SPRITE,
        sortY: (d.ty + 1) * TILE,
      });
      WALKABLE[d.ty][d.tx] = false;
      WALKABLE[d.ty][d.tx + 1] = false;

      // Monitor
      furniture.push({
        type: "monitor",
        tx: d.tx + 0.1,
        ty: d.ty - 0.4,
        sprite: makeMonitor(true),
        sortY: d.ty * TILE - 2,
      });
      furniture.push({
        type: "monitor",
        tx: d.tx + 1.1,
        ty: d.ty - 0.4,
        sprite: makeMonitor(false),
        sortY: d.ty * TILE - 2,
      });

      // Chair
      const chairY = d.ty + 1;
      if (chairY < ROWS) {
        furniture.push({
          type: "chair",
          tx: d.tx + 0.2,
          ty: chairY,
          sprite: makeChair(),
          sortY: (chairY + 1) * TILE,
        });
        WALKABLE[chairY][d.tx] = false;
        WALKABLE[chairY][d.tx + 1] = false;
      }
    });

    // Plants
    [
      { tx: 17, ty: 3 },
      { tx: 0, ty: 7 },
      { tx: 21, ty: 7 },
      { tx: 0, ty: 12 },
      { tx: 21, ty: 12 },
    ].forEach((p, i) => {
      furniture.push({
        type: "plant",
        tx: p.tx,
        ty: p.ty,
        sprite: makePlant(i % 2),
        sortY: (p.ty + 1.5) * TILE,
      });
      WALKABLE[p.ty][p.tx] = false;
    });

    // Water cooler
    furniture.push({
      type: "cooler",
      tx: 18,
      ty: 6,
      sprite: COOLER,
      sortY: 8 * TILE,
    });
    WALKABLE[6][18] = false;
    WALKABLE[7][18] = false;

    // ── Characters ──
    const characters: Character[] = CHAR_DEFS.map((def, i) => {
      const base = makeCharBody(def.skin, def.hair, def.shirt, def.pants);
      const typeFrames = [base, makeTypeFrame(base, 1)];
      const walkFrames = [
        base,
        makeWalkFrame(base, 1),
        base,
        makeWalkFrame(base, 3),
      ];

      const deskIdx = CHAR_DESKS[i];
      const desk = DESK_POSITIONS[deskIdx];
      const seatX = desk.tx;
      const seatY = desk.ty + 1;

      return {
        ...def,
        x: seatX * TILE,
        y: seatY * TILE,
        tx: seatX,
        ty: seatY,
        state: "TYPE" as const,
        dir: "up",
        base,
        typeFrames,
        walkFrames,
        frame: 0,
        frameTime: 0,
        path: null,
        pathIdx: 0,
        deskTx: seatX,
        deskTy: seatY,
        walkTimer: 0,
        nextWalkTime: 5 + Math.random() * 12,
        spawnEffect: 0.4 + i * 0.15,
        spawnCols: Array.from({ length: 16 }, () => Math.random() * 0.2),
        selected: false,
        bubbleOpacity: 0,
        bubbleTarget: 1,
        bubbleTimer: 3 + Math.random() * 4,
        bubbleCycleIdx: 0,
      };
    });

    // ── Spawn effect ──
    function drawSpawnEffect(ch: Character, x: number, y: number) {
      const progress = 1 - ch.spawnEffect / 0.4;
      for (let c = 0; c < 16; c++) {
        const colProgress = Math.max(
          0,
          Math.min(1, (progress - ch.spawnCols[c]) / 0.6),
        );
        const headRow = Math.floor(colProgress * 24);
        for (let r = 0; r < 24; r++) {
          if (r <= headRow) {
            const dist = headRow - r;
            if (dist === 0) {
              ctx.fillStyle = "#ccffcc";
              ctx.fillRect(x + c, y + r, 1, 1);
            } else if (dist < 4) {
              ctx.globalAlpha = 1 - dist / 4;
              ctx.fillStyle = "#00ff41";
              ctx.fillRect(x + c, y + r, 1, 1);
              ctx.globalAlpha = 1;
            }
          }
        }
      }
    }

    // ── Update ──
    let totalTime = 0;

    function update(dt: number) {
      totalTime += dt;

      characters.forEach((ch, ci) => {
        if (ch.spawnEffect > 0) {
          ch.spawnEffect -= dt;
          if (ch.spawnEffect <= 0) ch.spawnEffect = 0;
          return;
        }

        // Bubble cycling
        ch.bubbleTimer -= dt;
        if (ch.bubbleTimer <= 0) {
          // Fade out
          ch.bubbleTarget = 0;
          setTimeout(() => {
            ch.bubbleCycleIdx =
              (ch.bubbleCycleIdx + 1) % ACTION_CYCLE[ci].length;
            ch.action = ACTION_CYCLE[ci][ch.bubbleCycleIdx];
            ch.status =
              ch.action === "Need approval"
                ? "waiting"
                : ch.action === "Thinking..."
                  ? "active"
                  : "active";
            ch.toolIcon =
              ch.action === "Writing code..."
                ? "code"
                : ch.action === "Running tests..."
                  ? "test"
                  : ch.action === "Thinking..."
                    ? "think"
                    : "approve";
            ch.bubbleTarget = 1;
          }, 500);
          ch.bubbleTimer = 5 + Math.random() * 5;
        }

        // Smooth bubble fade
        const fadeSpeed = 2.0; // per second
        if (ch.bubbleOpacity < ch.bubbleTarget) {
          ch.bubbleOpacity = Math.min(
            ch.bubbleTarget,
            ch.bubbleOpacity + fadeSpeed * dt,
          );
        } else if (ch.bubbleOpacity > ch.bubbleTarget) {
          ch.bubbleOpacity = Math.max(
            ch.bubbleTarget,
            ch.bubbleOpacity - fadeSpeed * dt,
          );
        }

        // Walk decision
        ch.nextWalkTime -= dt;
        if (ch.nextWalkTime <= 0 && ch.state !== "WALK") {
          const targets: { x: number; y: number }[] = [];
          for (let r = 2; r < ROWS; r++)
            for (let c = 0; c < COLS; c++)
              if (WALKABLE[r][c]) targets.push({ x: c, y: r });
          if (targets.length) {
            const t = targets[Math.floor(Math.random() * targets.length)];
            const path = bfs(ch.tx, ch.ty, t.x, t.y);
            if (path && path.length > 0 && path.length < 15) {
              ch.path = path;
              ch.pathIdx = 0;
              ch.state = "WALK";
              ch.frame = 0;
            }
          }
          ch.nextWalkTime = 10 + Math.random() * 18;
        }

        // Walking
        if (ch.state === "WALK" && ch.path) {
          ch.frameTime += dt;
          if (ch.frameTime >= 0.15) {
            ch.frame = (ch.frame + 1) % 4;
            ch.frameTime = 0;
          }
          const target = ch.path[ch.pathIdx];
          const ttx = target.x * TILE,
            tty = target.y * TILE;
          const speed = 48;
          const dx = ttx - ch.x,
            dy = tty - ch.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < speed * dt) {
            ch.x = ttx;
            ch.y = tty;
            ch.tx = target.x;
            ch.ty = target.y;
            ch.pathIdx++;
            if (ch.pathIdx >= ch.path.length) {
              ch.path = null;
              ch.state = "IDLE";
              ch.walkTimer = 2 + Math.random() * 3;
            }
          } else {
            const nx = dx / dist,
              ny = dy / dist;
            ch.x += nx * speed * dt;
            ch.y += ny * speed * dt;
            if (Math.abs(dx) > Math.abs(dy))
              ch.dir = dx > 0 ? "right" : "left";
            else ch.dir = dy > 0 ? "down" : "up";
          }
        }

        // Idle → return to desk
        if (ch.state === "IDLE") {
          ch.walkTimer -= dt;
          if (ch.walkTimer <= 0) {
            const path = bfs(ch.tx, ch.ty, ch.deskTx, ch.deskTy);
            if (path && path.length > 0) {
              ch.path = path;
              ch.pathIdx = 0;
              ch.state = "WALK";
              ch.frame = 0;
            } else {
              ch.state = "TYPE";
              ch.frame = 0;
            }
          }
        }

        // Back at desk → type
        if (
          ch.state !== "WALK" &&
          ch.tx === ch.deskTx &&
          ch.ty === ch.deskTy &&
          ch.walkTimer <= 0
        ) {
          ch.state = "TYPE";
          ch.dir = "up";
        }

        // Typing anim
        if (ch.state === "TYPE") {
          ch.frameTime += dt;
          if (ch.frameTime >= 0.3) {
            ch.frame = (ch.frame + 1) % 2;
            ch.frameTime = 0;
          }
        }
      });
    }

    // ── Render ──
    function render() {
      ctx.imageSmoothingEnabled = false;

      ctx.fillStyle = C.void;
      ctx.fillRect(0, 0, W, H);

      // Walls
      for (let c = 0; c < COLS; c++)
        for (let r = 0; r < 2; r++)
          drawSprite(ctx, WALL_SPRITE, c * TILE, r * TILE);

      // Floor
      floorTiles.forEach((f) =>
        drawSprite(ctx, f.sprite, f.tx * TILE, f.ty * TILE),
      );

      // Z-sorted items
      const renderItems: { sortY: number; draw: () => void }[] = [];

      furniture.forEach((f) => {
        renderItems.push({
          sortY: f.sortY,
          draw: () => drawSprite(ctx, f.sprite, f.tx * TILE, f.ty * TILE),
        });
      });

      characters.forEach((ch) => {
        const drawY = ch.y - 8;
        renderItems.push({
          sortY: ch.y + 16,
          draw: () => {
            if (ch.spawnEffect > 0) {
              drawSpawnEffect(ch, ch.x, drawY);
              return;
            }

            let sprite: Sprite;
            if (ch.state === "TYPE") sprite = ch.typeFrames[ch.frame];
            else if (ch.state === "WALK") sprite = ch.walkFrames[ch.frame];
            else sprite = ch.base;
            drawSprite(ctx, sprite, ch.x, drawY);

            // Tool icon next to character (if active/waiting)
            if (ch.status !== "idle" && TOOL_ICONS[ch.toolIcon]) {
              drawSprite(
                ctx,
                TOOL_ICONS[ch.toolIcon],
                ch.x + 17,
                drawY + 4,
              );
            }

            // Name label background
            const labelX = ch.x + 8;
            const labelY = drawY - 6;
            const name = ch.name;
            ctx.fillStyle = "rgba(30,30,46,0.8)";
            const labelW = name.length * 3.5 + 12;
            ctx.fillRect(labelX - labelW / 2, labelY - 3, labelW, 7);

            // Status dot above label
            drawStatusDot(
              ctx,
              labelX - labelW / 2 + 1,
              labelY - 2,
              ch.status,
              totalTime,
            );

            // Name text
            ctx.fillStyle = "#c0c0d0";
            ctx.font = "3px monospace";
            ctx.fillText(name, labelX - labelW / 2 + 6, labelY + 2);

            // Speech bubble
            if (ch.bubbleOpacity > 0.01) {
              const isApproval = ch.action === "Need approval";
              drawBubble(
                ctx,
                ch.x + 8,
                drawY - 10,
                ch.action,
                isApproval,
                ch.bubbleOpacity,
              );
            }

            // Selection ring
            if (ch.selected) {
              ctx.strokeStyle = "#5ac88c";
              ctx.lineWidth = 0.5;
              ctx.strokeRect(ch.x - 0.5, drawY - 0.5, 17, 25);
            }
          },
        });
      });

      renderItems.sort((a, b) => a.sortY - b.sortY);
      renderItems.forEach((item) => item.draw());
    }

    // ── Game loop ──
    let lastTime = 0;
    let animId: number;
    function frame(time: number) {
      const dt =
        lastTime === 0 ? 0 : Math.min((time - lastTime) / 1000, 0.1);
      lastTime = time;
      update(dt);
      render();
      animId = requestAnimationFrame(frame);
    }
    animId = requestAnimationFrame(frame);

    // ── Click handling ──
    function handleClick(e: MouseEvent) {
      const rect = canvas.getBoundingClientRect();
      const scaleX = W / rect.width;
      const scaleY = H / rect.height;
      const mx = (e.clientX - rect.left) * scaleX;
      const my = (e.clientY - rect.top) * scaleY;

      let clicked: Character | null = null;
      characters.forEach((ch) => {
        const drawYY = ch.y - 8;
        if (
          mx >= ch.x &&
          mx <= ch.x + 16 &&
          my >= drawYY &&
          my <= drawYY + 24
        ) {
          clicked = ch;
        }
      });

      characters.forEach((ch) => (ch.selected = false));
      if (clicked) (clicked as Character).selected = true;
    }
    canvas.addEventListener("click", handleClick);

    return () => {
      cancelAnimationFrame(animId);
      canvas.removeEventListener("click", handleClick);
    };
  }, []);

  return (
    <div
      style={{
        width: "100%",
        height: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#0a0a14",
        overflow: "hidden",
      }}
    >
      <canvas
        ref={canvasRef}
        style={{
          imageRendering: "pixelated",
          width: W * 4,
          height: H * 4,
          maxWidth: "95vw",
          maxHeight: "95vh",
          objectFit: "contain",
          cursor: "pointer",
        }}
      />
    </div>
  );
}
