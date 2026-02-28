import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";

export const Route = createFileRoute("/proto/v4")({
  component: V4ManagerIsland,
});

/* ── palette ─────────────────────────────────────────── */
const P = {
  floor: "#3a3a5c",
  floorAlt: "#33335a",
  wall: "#2a2a4a",
  wallTrim: "#4a4a6a",
  desk: "#8b6914",
  deskTop: "#a07828",
  deskLeg: "#6b4c10",
  monitor: "#1a1a2e",
  monitorScreen: "#44ee88",
  monitorScreenAlt: "#33ccff",
  chair: "#5a2d82",
  chairAlt: "#2d5a82",
  plant: "#2d8b46",
  plantPot: "#8b5a2d",
  rug: "#4a2d6b",
  rugBorder: "#5a3d7b",
  lamp: "#ffcc44",
  lampPost: "#666666",
  bookshelf: "#6b4c28",
  book1: "#cc4444",
  book2: "#4488cc",
  book3: "#44cc88",
  whiteboard: "#e8e8e8",
  whiteboardFrame: "#888888",
  shadow: "#22223a",
};

const COLS = 20;
const ROWS = 11;
const TILE = 4; /* 4x zoom: each pixel = 4 screen px */
const CANVAS_W = COLS * 8 * TILE;
const CANVAS_H = ROWS * 8 * TILE;

type Desk = { col: number; row: number; screenColor: string };

const DESKS: Desk[] = [
  { col: 2, row: 3, screenColor: P.monitorScreen },
  { col: 6, row: 3, screenColor: P.monitorScreenAlt },
  { col: 12, row: 3, screenColor: P.monitorScreen },
  { col: 16, row: 3, screenColor: P.monitorScreenAlt },
  { col: 2, row: 7, screenColor: P.monitorScreenAlt },
  { col: 6, row: 7, screenColor: P.monitorScreen },
  { col: 12, row: 7, screenColor: P.monitorScreenAlt },
  { col: 16, row: 7, screenColor: P.monitorScreen },
];

/* ── tiny pixel drawing helpers ────────────────────── */
function fillTile(
  ctx: CanvasRenderingContext2D,
  col: number,
  row: number,
  color: string,
) {
  const s = 8 * TILE;
  ctx.fillStyle = color;
  ctx.fillRect(col * s, row * s, s, s);
}

function fillPx(
  ctx: CanvasRenderingContext2D,
  col: number,
  row: number,
  x: number,
  y: number,
  w: number,
  h: number,
  color: string,
) {
  const s = 8 * TILE;
  ctx.fillStyle = color;
  ctx.fillRect(col * s + x * TILE, row * s + y * TILE, w * TILE, h * TILE);
}

/* ── draw routines ──────────────────────────────────── */
function drawFloor(ctx: CanvasRenderingContext2D) {
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      fillTile(ctx, c, r, (c + r) % 2 === 0 ? P.floor : P.floorAlt);
    }
  }
}

function drawWalls(ctx: CanvasRenderingContext2D) {
  for (let c = 0; c < COLS; c++) {
    fillTile(ctx, c, 0, P.wall);
    fillPx(ctx, c, 0, 0, 7, 8, 1, P.wallTrim);
  }
}

function drawDesk(ctx: CanvasRenderingContext2D, d: Desk) {
  const { col, row, screenColor } = d;
  /* desk surface */
  fillPx(ctx, col, row, 0, 4, 8, 2, P.deskTop);
  fillPx(ctx, col, row, 0, 6, 8, 1, P.desk);
  /* legs */
  fillPx(ctx, col, row, 1, 7, 1, 1, P.deskLeg);
  fillPx(ctx, col, row, 6, 7, 1, 1, P.deskLeg);
  /* monitor */
  fillPx(ctx, col, row, 2, 1, 4, 3, P.monitor);
  fillPx(ctx, col, row, 3, 2, 2, 1, screenColor);
  /* monitor stand */
  fillPx(ctx, col, row, 3, 4, 2, 1, P.monitor);
  /* shadow under desk */
  fillPx(ctx, col, row + 1, 0, 0, 8, 1, P.shadow);
}

function drawChair(
  ctx: CanvasRenderingContext2D,
  col: number,
  row: number,
  color: string,
) {
  fillPx(ctx, col, row, 2, 2, 4, 3, color);
  fillPx(ctx, col, row, 3, 5, 2, 1, color);
  fillPx(ctx, col, row, 2, 6, 1, 1, P.deskLeg);
  fillPx(ctx, col, row, 5, 6, 1, 1, P.deskLeg);
}

function drawPlant(
  ctx: CanvasRenderingContext2D,
  col: number,
  row: number,
) {
  fillPx(ctx, col, row, 3, 5, 2, 2, P.plantPot);
  fillPx(ctx, col, row, 2, 3, 4, 2, P.plant);
  fillPx(ctx, col, row, 3, 2, 2, 1, P.plant);
}

function drawBookshelf(
  ctx: CanvasRenderingContext2D,
  col: number,
  row: number,
) {
  fillPx(ctx, col, row, 0, 0, 8, 8, P.bookshelf);
  fillPx(ctx, col, row, 1, 1, 2, 3, P.book1);
  fillPx(ctx, col, row, 3, 1, 2, 3, P.book2);
  fillPx(ctx, col, row, 5, 1, 2, 3, P.book3);
  fillPx(ctx, col, row, 1, 5, 2, 2, P.book3);
  fillPx(ctx, col, row, 3, 5, 2, 2, P.book1);
  fillPx(ctx, col, row, 5, 5, 2, 2, P.book2);
}

function drawWhiteboard(
  ctx: CanvasRenderingContext2D,
  col: number,
  row: number,
) {
  fillPx(ctx, col, row, 1, 1, 6, 5, P.whiteboardFrame);
  fillPx(ctx, col, row, 2, 2, 4, 3, P.whiteboard);
}

function drawRug(ctx: CanvasRenderingContext2D) {
  const cx = 9;
  const cy = 5;
  fillPx(ctx, cx, cy, 0, 2, 8, 4, P.rug);
  fillPx(ctx, cx + 1, cy, 0, 2, 8, 4, P.rug);
  fillPx(ctx, cx, cy, 0, 2, 1, 4, P.rugBorder);
  fillPx(ctx, cx + 1, cy, 7, 2, 1, 4, P.rugBorder);
  fillPx(ctx, cx, cy, 0, 2, 8, 1, P.rugBorder);
  fillPx(ctx, cx + 1, cy, 0, 2, 8, 1, P.rugBorder);
  fillPx(ctx, cx, cy, 0, 5, 8, 1, P.rugBorder);
  fillPx(ctx, cx + 1, cy, 0, 5, 8, 1, P.rugBorder);
}

function drawLamp(
  ctx: CanvasRenderingContext2D,
  col: number,
  row: number,
) {
  fillPx(ctx, col, row, 3, 6, 2, 2, P.lampPost);
  fillPx(ctx, col, row, 3, 3, 2, 3, P.lampPost);
  fillPx(ctx, col, row, 2, 1, 4, 2, P.lamp);
}

function drawScene(ctx: CanvasRenderingContext2D) {
  ctx.imageSmoothingEnabled = false;
  drawFloor(ctx);
  drawWalls(ctx);
  drawRug(ctx);

  /* whiteboards on wall */
  drawWhiteboard(ctx, 4, 0);
  drawWhiteboard(ctx, 14, 0);

  /* furniture */
  drawBookshelf(ctx, 0, 1);
  drawBookshelf(ctx, 19, 1);
  drawPlant(ctx, 0, 5);
  drawPlant(ctx, 19, 5);
  drawLamp(ctx, 10, 8);
  drawLamp(ctx, 0, 9);
  drawLamp(ctx, 19, 9);

  /* desks + chairs */
  for (const d of DESKS) {
    drawDesk(ctx, d);
    const chairColor =
      d.screenColor === P.monitorScreen ? P.chair : P.chairAlt;
    drawChair(ctx, d.col, d.row + 1, chairColor);
  }
}

/* ── component ──────────────────────────────────────── */
function V4ManagerIsland() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [task, setTask] = useState("");

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    drawScene(ctx);
  }, []);

  return (
    <>
      {/* Google Font */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap');
        .ps2p { font-family: 'Press Start 2P', monospace; }
      `}</style>

      <div
        className="ps2p"
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "100%",
          background: "#0e0e1a",
          paddingBottom: 100,
        }}
      >
        {/* canvas */}
        <canvas
          ref={canvasRef}
          width={CANVAS_W}
          height={CANVAS_H}
          style={{
            imageRendering: "pixelated",
            border: "2px solid #4a4a6a",
            boxShadow: "0 0 0 4px #0e0e1a, 0 4px 24px rgba(0,0,0,0.6)",
          }}
        />
      </div>

      {/* ── Manager Island — fixed bottom bar ──────── */}
      <div
        className="ps2p"
        style={{
          position: "fixed",
          bottom: 0,
          left: 0,
          right: 0,
          display: "flex",
          justifyContent: "center",
          padding: "12px 16px",
          pointerEvents: "none",
          zIndex: 50,
        }}
      >
        <div
          style={{
            background: "#1e1e2e",
            border: "2px solid #4a4a6a",
            boxShadow:
              "0 -2px 0 #4a4a6a, 0 4px 0 #0a0a14, 4px 0 0 #0a0a14, -4px 0 0 #0a0a14, 0 -8px 24px rgba(78,78,120,0.25)",
            borderRadius: 0,
            display: "flex",
            alignItems: "center",
            gap: 16,
            padding: "10px 20px",
            pointerEvents: "auto",
            maxWidth: 720,
            width: "100%",
          }}
        >
          {/* robot + label */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              flexShrink: 0,
            }}
          >
            <span style={{ fontSize: 20 }}>🤖</span>
            <span
              style={{
                fontSize: 9,
                color: "#c0c0e0",
                letterSpacing: 1,
              }}
            >
              Manager
            </span>
          </div>

          {/* divider */}
          <div
            style={{
              width: 2,
              height: 24,
              background: "#4a4a6a",
              flexShrink: 0,
            }}
          />

          {/* text input */}
          <input
            type="text"
            value={task}
            onChange={(e) => setTask(e.target.value)}
            placeholder="Give the manager a task..."
            style={{
              flex: 1,
              background: "#16161e",
              border: "2px solid #4a4a6a",
              color: "#e0e0ff",
              fontSize: 8,
              fontFamily: "'Press Start 2P', monospace",
              padding: "8px 10px",
              outline: "none",
              minWidth: 0,
            }}
          />

          {/* divider */}
          <div
            style={{
              width: 2,
              height: 24,
              background: "#4a4a6a",
              flexShrink: 0,
            }}
          />

          {/* tasks badge */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              flexShrink: 0,
            }}
          >
            <span
              style={{
                fontSize: 7,
                color: "#a0a0c0",
                whiteSpace: "nowrap",
              }}
            >
              Tasks:
            </span>
            <span
              style={{
                fontSize: 8,
                color: "#ffcc44",
                background: "#2a2a3e",
                border: "1px solid #4a4a6a",
                padding: "3px 6px",
                whiteSpace: "nowrap",
              }}
            >
              3/5
            </span>
          </div>

          {/* divider */}
          <div
            style={{
              width: 2,
              height: 24,
              background: "#4a4a6a",
              flexShrink: 0,
            }}
          />

          {/* sandbox status */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              flexShrink: 0,
            }}
          >
            <div
              style={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                background: "#44ee88",
                boxShadow: "0 0 6px #44ee88",
              }}
            />
            <span
              style={{
                fontSize: 7,
                color: "#a0a0c0",
                whiteSpace: "nowrap",
              }}
            >
              Sandbox
            </span>
          </div>
        </div>
      </div>
    </>
  );
}
