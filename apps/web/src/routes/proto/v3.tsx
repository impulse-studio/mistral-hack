import { createFileRoute } from "@tanstack/react-router";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type MouseEvent,
} from "react";

export const Route = createFileRoute("/proto/v3")({
  component: PixelOfficeV3,
});

// Grid & rendering
const COLS = 20;
const ROWS = 11;
const TILE = 16;
const SCALE = 4;
const PX = TILE * SCALE; // 64px per tile
const WIDTH = COLS * PX;
const HEIGHT = ROWS * PX;

// Palette — Mistral Orange
const C = {
  floor: "#2a2a3a",
  floorAlt: "#262636",
  wall: "#1e1e2e",
  wallTrim: "#33334a",
  desk: "#5c4a3a",
  deskTop: "#6e5a48",
  deskLeg: "#4a3a2c",
  monitor: "#111118",
  monitorGlow: "#FF7000",
  monitorScreen: "#1a1a2a",
  chair: "#3a3a4e",
  chairSeat: "#44445a",
  plant: "#2d6e3f",
  plantPot: "#8b6b4a",
  plantLeaf: "#3a8a50",
  agent: "#6a6a8a",
  agentHead: "#8a8aaa",
  carpet: "#2e2838",
  windowFrame: "#33334a",
  windowGlass: "#1a2a44",
  windowSky: "#0e1a30",
  star: "#ffffff",
  orange: "#FF7000",
  orangeDim: "#cc5a00",
  orangeGlow: "rgba(255, 112, 0, 0.12)",
  orangeGlowStrong: "rgba(255, 112, 0, 0.25)",
  shadow: "rgba(0,0,0,0.18)",
} as const;

// Desk layout: [col, row] positions (8 desks in cozy pairs)
const DESKS: [number, number][] = [
  [3, 3],
  [5, 3],
  [3, 6],
  [5, 6],
  [11, 3],
  [13, 3],
  [11, 6],
  [13, 6],
];

interface Agent {
  id: number;
  name: string;
  deskIndex: number;
  status: "idle" | "working" | "thinking";
  color: string;
}

const AGENT_COLORS = ["#7a5af0", "#e05a9c", "#4aa8d8", "#e8a838"];

function drawPixelRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  color: string,
) {
  ctx.fillStyle = color;
  ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
}

function drawFloor(ctx: CanvasRenderingContext2D) {
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const color = (r + c) % 2 === 0 ? C.floor : C.floorAlt;
      drawPixelRect(ctx, c * PX, r * PX, PX, PX, color);
    }
  }
  // Carpet under desk areas
  drawPixelRect(ctx, 2 * PX, 2 * PX, 5 * PX, 6 * PX, C.carpet);
  drawPixelRect(ctx, 10 * PX, 2 * PX, 5 * PX, 6 * PX, C.carpet);
}

function drawWalls(ctx: CanvasRenderingContext2D) {
  // Top wall
  drawPixelRect(ctx, 0, 0, WIDTH, PX, C.wall);
  drawPixelRect(ctx, 0, PX - 8, WIDTH, 8, C.wallTrim);

  // Windows on top wall
  const windowPositions = [2, 6, 10, 14, 17];
  for (const wx of windowPositions) {
    const x = wx * PX + 8;
    const y = 8;
    const w = PX - 16;
    const h = PX - 24;
    drawPixelRect(ctx, x, y, w, h, C.windowGlass);
    drawPixelRect(ctx, x - 4, y - 4, w + 8, 4, C.windowFrame);
    drawPixelRect(ctx, x - 4, y + h, w + 8, 4, C.windowFrame);
    drawPixelRect(ctx, x - 4, y, 4, h, C.windowFrame);
    drawPixelRect(ctx, x + w, y, 4, h, C.windowFrame);
    // Crossbar
    drawPixelRect(ctx, x, y + h / 2 - 2, w, 4, C.windowFrame);
    drawPixelRect(ctx, x + w / 2 - 2, y, 4, h, C.windowFrame);
    // Stars
    drawPixelRect(ctx, x + 10, y + 8, 4, 4, C.star);
    drawPixelRect(ctx, x + w - 18, y + 14, 3, 3, C.star);
  }
}

function drawDesk(
  ctx: CanvasRenderingContext2D,
  col: number,
  row: number,
  active: boolean,
) {
  const x = col * PX;
  const y = row * PX;

  // Orange ambient glow under active desks
  if (active) {
    drawPixelRect(ctx, x - 4, y + PX - 8, PX + 8, 16, C.orangeGlow);
    drawPixelRect(ctx, x, y + PX - 4, PX, 12, C.orangeGlowStrong);
  }

  // Shadow
  drawPixelRect(ctx, x + 6, y + PX - 8, PX - 12, 8, C.shadow);

  // Desk legs
  drawPixelRect(ctx, x + 8, y + 36, 8, 24, C.deskLeg);
  drawPixelRect(ctx, x + PX - 16, y + 36, 8, 24, C.deskLeg);

  // Desk surface
  drawPixelRect(ctx, x + 4, y + 28, PX - 8, 12, C.desk);
  drawPixelRect(ctx, x + 6, y + 28, PX - 12, 4, C.deskTop);

  // Monitor
  const mx = x + PX / 2 - 14;
  const my = y + 4;
  // Stand
  drawPixelRect(ctx, mx + 10, my + 20, 8, 8, C.monitor);
  drawPixelRect(ctx, mx + 6, my + 26, 16, 4, C.monitor);
  // Screen body
  drawPixelRect(ctx, mx, my, 28, 22, C.monitor);
  drawPixelRect(ctx, mx + 2, my + 2, 24, 16, C.monitorScreen);

  // Orange glow on active monitors
  if (active) {
    drawPixelRect(ctx, mx + 3, my + 3, 22, 14, C.monitorGlow);
    // Scanlines effect
    for (let i = 0; i < 7; i++) {
      drawPixelRect(
        ctx,
        mx + 3,
        my + 3 + i * 2,
        22,
        1,
        "rgba(0,0,0,0.15)",
      );
    }
    // Code-like dots on screen
    drawPixelRect(ctx, mx + 5, my + 5, 12, 2, "rgba(255,255,255,0.3)");
    drawPixelRect(ctx, mx + 5, my + 9, 8, 2, "rgba(255,255,255,0.2)");
    drawPixelRect(ctx, mx + 5, my + 13, 16, 2, "rgba(255,255,255,0.15)");
  }
}

function drawChair(ctx: CanvasRenderingContext2D, col: number, row: number) {
  const x = col * PX + PX / 2 - 10;
  const y = row * PX + 40;
  // Seat
  drawPixelRect(ctx, x, y, 20, 10, C.chairSeat);
  drawPixelRect(ctx, x + 2, y - 2, 16, 4, C.chair);
  // Back
  drawPixelRect(ctx, x + 4, y - 14, 12, 14, C.chair);
  drawPixelRect(ctx, x + 6, y - 12, 8, 10, C.chairSeat);
  // Legs
  drawPixelRect(ctx, x + 8, y + 10, 4, 6, C.chair);
}

function drawAgent(
  ctx: CanvasRenderingContext2D,
  col: number,
  row: number,
  agent: Agent,
  tick: number,
) {
  const x = col * PX + PX / 2 - 8;
  const y = row * PX + 10;
  const bounce = agent.status === "working" ? Math.sin(tick * 0.15) * 2 : 0;

  // Body
  drawPixelRect(ctx, x + 2, y + 12 + bounce, 12, 14, agent.color);
  // Head
  drawPixelRect(ctx, x + 3, y + 2 + bounce, 10, 10, C.agentHead);
  drawPixelRect(ctx, x + 4, y + 3 + bounce, 8, 8, agent.color);
  // Eyes
  drawPixelRect(ctx, x + 5, y + 5 + bounce, 3, 3, "#ffffff");
  drawPixelRect(ctx, x + 9, y + 5 + bounce, 3, 3, "#ffffff");
  drawPixelRect(ctx, x + 6, y + 6 + bounce, 2, 2, "#111118");
  drawPixelRect(ctx, x + 10, y + 6 + bounce, 2, 2, "#111118");

  // Thinking indicator
  if (agent.status === "thinking") {
    const dotPhase = Math.floor(tick * 0.08) % 3;
    for (let i = 0; i < 3; i++) {
      const alpha = i <= dotPhase ? 1 : 0.25;
      ctx.fillStyle = `rgba(255, 112, 0, ${alpha})`;
      ctx.fillRect(x + 16 + i * 6, y - 4, 4, 4);
    }
  }
}

function drawPlant(ctx: CanvasRenderingContext2D, x: number, y: number) {
  // Pot
  drawPixelRect(ctx, x + 6, y + 24, 20, 16, C.plantPot);
  drawPixelRect(ctx, x + 8, y + 22, 16, 4, C.plantPot);
  // Leaves
  drawPixelRect(ctx, x + 10, y + 8, 12, 16, C.plant);
  drawPixelRect(ctx, x + 4, y + 12, 8, 10, C.plantLeaf);
  drawPixelRect(ctx, x + 20, y + 10, 8, 12, C.plantLeaf);
  drawPixelRect(ctx, x + 12, y + 2, 8, 10, C.plantLeaf);
}

function drawMistralLogo(ctx: CanvasRenderingContext2D) {
  // Small pixel M in top-right — Mistral "M" mark
  const ox = WIDTH - 5 * PX + 8;
  const oy = 12;
  const s = 4; // pixel size

  ctx.fillStyle = C.orange;

  // "M" as 5-wide × 5-tall pixel grid
  const m = [
    [1, 0, 0, 0, 1],
    [1, 1, 0, 1, 1],
    [1, 0, 1, 0, 1],
    [1, 0, 0, 0, 1],
    [1, 0, 0, 0, 1],
  ];
  for (let r = 0; r < m.length; r++) {
    for (let c = 0; c < m[r].length; c++) {
      if (m[r][c]) {
        ctx.fillRect(ox + c * s, oy + r * s, s, s);
      }
    }
  }
}

function drawScene(
  ctx: CanvasRenderingContext2D,
  agents: Agent[],
  tick: number,
  hoveredDesk: number | null,
) {
  ctx.imageSmoothingEnabled = false;

  drawFloor(ctx);
  drawWalls(ctx);

  // Plants
  drawPlant(ctx, 0 * PX + 8, 1 * PX + 8);
  drawPlant(ctx, 8 * PX + 16, 1 * PX + 8);
  drawPlant(ctx, 16 * PX + 8, 1 * PX + 8);
  drawPlant(ctx, 9 * PX, 9 * PX);
  drawPlant(ctx, 18 * PX + 16, 9 * PX);

  // Occupied desk indices
  const occupiedDesks = new Set(agents.map((a) => a.deskIndex));

  // Desks & chairs
  for (let i = 0; i < DESKS.length; i++) {
    const [col, row] = DESKS[i];
    const active = occupiedDesks.has(i);
    drawDesk(ctx, col, row, active);
    drawChair(ctx, col, row + 1);
  }

  // Agents at desks
  for (const agent of agents) {
    const desk = DESKS[agent.deskIndex];
    if (desk) {
      drawAgent(ctx, desk[0], desk[1] + 1, agent, tick);
    }
  }

  // Hover highlight
  if (hoveredDesk !== null && !occupiedDesks.has(hoveredDesk)) {
    const [col, row] = DESKS[hoveredDesk];
    ctx.strokeStyle = C.orange;
    ctx.lineWidth = 3;
    ctx.setLineDash([8, 4]);
    ctx.strokeRect(col * PX - 4, row * PX - 4, PX + 8, PX * 2 + 8);
    ctx.setLineDash([]);
  }

  drawMistralLogo(ctx);
}

function PixelOfficeV3() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const tickRef = useRef(0);
  const [agents, setAgents] = useState<Agent[]>([
    { id: 1, name: "Codex", deskIndex: 0, status: "working", color: AGENT_COLORS[0] },
    { id: 2, name: "Scout", deskIndex: 1, status: "thinking", color: AGENT_COLORS[1] },
    { id: 3, name: "Archivist", deskIndex: 4, status: "idle", color: AGENT_COLORS[2] },
  ]);
  const [hoveredDesk, setHoveredDesk] = useState<number | null>(null);
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);

  const addAgent = useCallback(() => {
    setAgents((prev) => {
      const occupiedDesks = new Set(prev.map((a) => a.deskIndex));
      const freeDesk = DESKS.findIndex((_, i) => !occupiedDesks.has(i));
      if (freeDesk === -1) return prev;

      const id = Math.max(0, ...prev.map((a) => a.id)) + 1;
      const names = ["Pixel", "Byte", "Nova", "Flux", "Spark"];
      return [
        ...prev,
        {
          id,
          name: names[id % names.length],
          deskIndex: freeDesk,
          status: "idle" as const,
          color: AGENT_COLORS[id % AGENT_COLORS.length],
        },
      ];
    });
  }, []);

  const handleCanvasClick = useCallback(
    (e: MouseEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const scaleX = WIDTH / rect.width;
      const scaleY = HEIGHT / rect.height;
      const mx = (e.clientX - rect.left) * scaleX;
      const my = (e.clientY - rect.top) * scaleY;

      // Check if clicked on an agent's desk
      for (const agent of agents) {
        const desk = DESKS[agent.deskIndex];
        if (!desk) continue;
        const [col, row] = desk;
        if (
          mx >= col * PX &&
          mx < (col + 1) * PX &&
          my >= row * PX &&
          my < (row + 2) * PX
        ) {
          setSelectedAgent(agent);
          return;
        }
      }
      setSelectedAgent(null);
    },
    [agents],
  );

  const handleCanvasMove = useCallback(
    (e: MouseEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const scaleX = WIDTH / rect.width;
      const scaleY = HEIGHT / rect.height;
      const mx = (e.clientX - rect.left) * scaleX;
      const my = (e.clientY - rect.top) * scaleY;

      const occupiedDesks = new Set(agents.map((a) => a.deskIndex));
      let found: number | null = null;
      for (let i = 0; i < DESKS.length; i++) {
        if (occupiedDesks.has(i)) continue;
        const [col, row] = DESKS[i];
        if (
          mx >= col * PX - 4 &&
          mx < (col + 1) * PX + 4 &&
          my >= row * PX - 4 &&
          my < (row + 2) * PX + 4
        ) {
          found = i;
          break;
        }
      }
      setHoveredDesk(found);
    },
    [agents],
  );

  // Animation loop
  useEffect(() => {
    let raf: number;
    const loop = () => {
      tickRef.current++;
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext("2d");
        if (ctx) {
          drawScene(ctx, agents, tickRef.current, hoveredDesk);
        }
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [agents, hoveredDesk]);

  // Cycle agent statuses for demo
  useEffect(() => {
    const interval = setInterval(() => {
      setAgents((prev) =>
        prev.map((a) => {
          if (Math.random() > 0.3) return a;
          const statuses: Agent["status"][] = ["idle", "working", "thinking"];
          const next = statuses[(statuses.indexOf(a.status) + 1) % statuses.length];
          return { ...a, status: next };
        }),
      );
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 16,
        padding: 24,
        background: "#0e0e18",
        minHeight: "100%",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          width: "100%",
          maxWidth: WIDTH,
        }}
      >
        <h1
          style={{
            fontFamily: "monospace",
            fontSize: 18,
            color: "#ccc",
            margin: 0,
          }}
        >
          AI Office{" "}
          <span style={{ color: C.orange, fontSize: 14 }}>
            v3 — Mistral Orange
          </span>
        </h1>
        <button
          onClick={addAgent}
          style={{
            fontFamily: "monospace",
            fontSize: 14,
            padding: "6px 16px",
            background: "transparent",
            color: C.orange,
            border: `2px solid ${C.orange}`,
            cursor: "pointer",
            imageRendering: "pixelated",
          }}
        >
          [+ Agent]
        </button>
      </div>

      {/* Canvas */}
      <canvas
        ref={canvasRef}
        width={WIDTH}
        height={HEIGHT}
        onClick={handleCanvasClick}
        onMouseMove={handleCanvasMove}
        onMouseLeave={() => setHoveredDesk(null)}
        style={{
          width: "100%",
          maxWidth: WIDTH,
          imageRendering: "pixelated",
          cursor: hoveredDesk !== null ? "pointer" : "default",
          border: `2px solid ${C.wallTrim}`,
        }}
      />

      {/* Status bar */}
      <div
        style={{
          display: "flex",
          gap: 16,
          fontFamily: "monospace",
          fontSize: 13,
          color: "#888",
          width: "100%",
          maxWidth: WIDTH,
          justifyContent: "space-between",
        }}
      >
        <span>
          Agents: {agents.length}/{DESKS.length}
        </span>
        <span>
          Working:{" "}
          <span style={{ color: C.orange }}>
            {agents.filter((a) => a.status === "working").length}
          </span>{" "}
          | Thinking:{" "}
          <span style={{ color: "#e8a838" }}>
            {agents.filter((a) => a.status === "thinking").length}
          </span>{" "}
          | Idle:{" "}
          {agents.filter((a) => a.status === "idle").length}
        </span>
      </div>

      {/* Agent detail panel */}
      {selectedAgent && (
        <div
          style={{
            fontFamily: "monospace",
            fontSize: 13,
            color: "#ccc",
            background: "#1a1a2a",
            border: `1px solid ${C.wallTrim}`,
            padding: 16,
            width: "100%",
            maxWidth: WIDTH,
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span>
              <span
                style={{
                  display: "inline-block",
                  width: 10,
                  height: 10,
                  background: selectedAgent.color,
                  marginRight: 8,
                }}
              />
              {selectedAgent.name}
            </span>
            <span style={{ color: C.orange }}>{selectedAgent.status}</span>
          </div>
          <div style={{ color: "#666", marginTop: 4 }}>
            Desk #{selectedAgent.deskIndex + 1} &middot; ID: {selectedAgent.id}
          </div>
        </div>
      )}
    </div>
  );
}
