import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";

export const Route = createFileRoute("/proto/v5")({
  component: RouteComponent,
});

// ── Types ──────────────────────────────────────────────────────────────────

interface Character {
  id: string;
  name: string;
  role: string;
  status: "idle" | "working" | "talking";
  color: string;
  skinColor: string;
  deskIndex: number;
  // pixel position (set during render)
  x: number;
  y: number;
  w: number;
  h: number;
}

interface TaskCard {
  id: string;
  title: string;
  assignee: string;
  color: string;
}

type TabId = "terminal" | "tasks" | "files";

// ── Data ───────────────────────────────────────────────────────────────────

const CHARACTERS: Character[] = [
  { id: "mgr", name: "Manager", role: "Orchestrator", status: "working", color: "#FF7000", skinColor: "#f4c07a", deskIndex: 0, x: 0, y: 0, w: 0, h: 0 },
  { id: "dev1", name: "Coda", role: "Frontend Dev", status: "working", color: "#4ecdc4", skinColor: "#e8b88a", deskIndex: 1, x: 0, y: 0, w: 0, h: 0 },
  { id: "dev2", name: "Rex", role: "Backend Dev", status: "idle", color: "#ffe66d", skinColor: "#d4a574", deskIndex: 2, x: 0, y: 0, w: 0, h: 0 },
  { id: "qa", name: "Tessa", role: "QA Engineer", status: "talking", color: "#ff6b6b", skinColor: "#f4c07a", deskIndex: 3, x: 0, y: 0, w: 0, h: 0 },
  { id: "des", name: "Pixel", role: "Designer", status: "working", color: "#c792ea", skinColor: "#e8b88a", deskIndex: 4, x: 0, y: 0, w: 0, h: 0 },
  { id: "ops", name: "Bash", role: "DevOps", status: "idle", color: "#82aaff", skinColor: "#d4a574", deskIndex: 5, x: 0, y: 0, w: 0, h: 0 },
];

const TASKS: { todo: TaskCard[]; working: TaskCard[]; done: TaskCard[] } = {
  todo: [
    { id: "t1", title: "Add auth middleware", assignee: "Rex", color: "#ffe66d" },
    { id: "t2", title: "Design login screen", assignee: "Pixel", color: "#c792ea" },
  ],
  working: [
    { id: "t3", title: "Build canvas renderer", assignee: "Coda", color: "#4ecdc4" },
    { id: "t4", title: "Setup CI pipeline", assignee: "Bash", color: "#82aaff" },
    { id: "t5", title: "Write API tests", assignee: "Tessa", color: "#ff6b6b" },
  ],
  done: [
    { id: "t6", title: "Init monorepo", assignee: "Bash", color: "#82aaff" },
    { id: "t7", title: "Scaffold routes", assignee: "Coda", color: "#4ecdc4" },
  ],
};

const LOG_LINES = [
  "[mgr]  Dispatching task → dev1:build-canvas",
  "[dev1] $ bun install @pixi/react",
  "[dev1] ✓ 42 packages installed (1.2s)",
  "[dev2] Querying schema… 3 tables found",
  "[qa]   Running test suite: auth.test.ts",
  "[mgr]  Sub-agent dev2 status: IDLE",
  "[dev1] Compiling canvas renderer…",
  "[ops]  Deploying sandbox env-0a3f…",
  "[qa]   ✓ 12/12 tests passed",
  "[mgr]  Task t3 → status: IN_PROGRESS",
  "[des]  Generating sprite sheet…",
  "[ops]  $ docker build -t office:latest .",
  "[dev2] INSERT INTO agents (name, role)…",
  "[mgr]  All agents healthy ✓",
  "[dev1] Hot reload: 3 modules updated",
  "[qa]   Snapshot diff: +2 -0 files",
  "[ops]  SSL cert renewed → *.office.ai",
  "[des]  Exported: sprite_manager_idle.png",
  "[mgr]  Sprint velocity: 23 pts/week",
  "[dev2] Migration v004 applied ✓",
];

const FILE_TREE = [
  { name: "apps/", indent: 0, type: "dir" as const },
  { name: "web/", indent: 1, type: "dir" as const },
  { name: "src/", indent: 2, type: "dir" as const },
  { name: "routes/", indent: 3, type: "dir" as const },
  { name: "index.tsx", indent: 4, type: "file" as const },
  { name: "dashboard.tsx", indent: 4, type: "file" as const },
  { name: "ai.tsx", indent: 4, type: "file" as const },
  { name: "components/", indent: 3, type: "dir" as const },
  { name: "Canvas.tsx", indent: 4, type: "file" as const },
  { name: "Panel.tsx", indent: 4, type: "file" as const },
  { name: "packages/", indent: 0, type: "dir" as const },
  { name: "backend/", indent: 1, type: "dir" as const },
  { name: "convex/", indent: 2, type: "dir" as const },
  { name: "schema.ts", indent: 3, type: "file" as const },
  { name: "agent.ts", indent: 3, type: "file" as const },
  { name: "auth.config.ts", indent: 3, type: "file" as const },
  { name: "env/", indent: 1, type: "dir" as const },
  { name: "index.ts", indent: 2, type: "file" as const },
];

// ── Pixel drawing helpers ──────────────────────────────────────────────────

const PX = 4; // pixel scale

function drawRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, color: string) {
  ctx.fillStyle = color;
  ctx.fillRect(x * PX, y * PX, w * PX, h * PX);
}

function drawFloor(ctx: CanvasRenderingContext2D, cw: number, ch: number) {
  // floor tiles — dark checkerboard
  for (let y = 0; y < ch; y += PX) {
    for (let x = 0; x < cw; x += PX) {
      const tileX = Math.floor(x / (PX * 8));
      const tileY = Math.floor(y / (PX * 8));
      const dark = (tileX + tileY) % 2 === 0;
      ctx.fillStyle = dark ? "#1a1a2e" : "#16213e";
      ctx.fillRect(x, y, PX, PX);
    }
  }
}

function drawWalls(ctx: CanvasRenderingContext2D, cw: number) {
  // back wall
  drawRect(ctx, 0, 0, cw / PX, 18, "#2a2a3e");
  // wall trim
  drawRect(ctx, 0, 17, cw / PX, 2, "#3a3a5e");
  // window frames
  const windowPositions = [12, 40, 68];
  for (const wx of windowPositions) {
    // frame
    drawRect(ctx, wx, 3, 16, 12, "#3a3a5e");
    // glass
    drawRect(ctx, wx + 1, 4, 14, 10, "#0f3460");
    // stars
    drawRect(ctx, wx + 3, 6, 1, 1, "#e0e0ff");
    drawRect(ctx, wx + 9, 5, 1, 1, "#e0e0ff");
    drawRect(ctx, wx + 12, 8, 1, 1, "#e0e0ff");
    drawRect(ctx, wx + 6, 9, 1, 1, "#c0c0ee");
  }
}

function drawDesk(ctx: CanvasRenderingContext2D, dx: number, dy: number) {
  // desk surface
  drawRect(ctx, dx, dy, 18, 2, "#5c4033");
  drawRect(ctx, dx + 1, dy + 1, 16, 1, "#7a5a42");
  // legs
  drawRect(ctx, dx + 1, dy + 2, 2, 5, "#4a3020");
  drawRect(ctx, dx + 15, dy + 2, 2, 5, "#4a3020");
  // monitor
  drawRect(ctx, dx + 6, dy - 6, 8, 5, "#2a2a3a");
  drawRect(ctx, dx + 7, dy - 5, 6, 3, "#1a3a5a");
  // monitor stand
  drawRect(ctx, dx + 9, dy - 1, 2, 1, "#3a3a4a");
  // keyboard
  drawRect(ctx, dx + 5, dy + 1, 6, 1, "#3a3a4a");
}

function drawCharacter(ctx: CanvasRenderingContext2D, cx: number, cy: number, color: string, skinColor: string, status: string, frame: number) {
  // body
  drawRect(ctx, cx, cy, 6, 6, color);
  // head
  drawRect(ctx, cx + 1, cy - 4, 4, 4, skinColor);
  // hair
  drawRect(ctx, cx + 1, cy - 5, 4, 2, color);
  // eyes — blink every ~60 frames
  const blink = frame % 60 < 3;
  if (!blink) {
    drawRect(ctx, cx + 2, cy - 3, 1, 1, "#1a1a2e");
    drawRect(ctx, cx + 4, cy - 3, 1, 1, "#1a1a2e");
  }
  // arms
  if (status === "working") {
    // typing pose — arms forward
    drawRect(ctx, cx - 1, cy + 2, 1, 2, skinColor);
    drawRect(ctx, cx + 6, cy + 2, 1, 2, skinColor);
    // animate typing
    if (frame % 12 < 6) {
      drawRect(ctx, cx - 1, cy + 1, 1, 1, skinColor);
    } else {
      drawRect(ctx, cx + 6, cy + 1, 1, 1, skinColor);
    }
  } else if (status === "talking") {
    // one arm raised
    const armUp = frame % 30 < 15;
    drawRect(ctx, cx - 1, cy + (armUp ? 0 : 2), 1, 2, skinColor);
    drawRect(ctx, cx + 6, cy + 2, 1, 2, skinColor);
    // speech bubble
    drawRect(ctx, cx + 7, cy - 6, 5, 3, "#ffffff");
    drawRect(ctx, cx + 6, cy - 4, 1, 1, "#ffffff");
    drawRect(ctx, cx + 8, cy - 5, 1, 1, "#1a1a2e");
    drawRect(ctx, cx + 10, cy - 5, 1, 1, "#1a1a2e");
  } else {
    // idle — arms down
    drawRect(ctx, cx - 1, cy + 1, 1, 3, skinColor);
    drawRect(ctx, cx + 6, cy + 1, 1, 3, skinColor);
  }
  // legs
  drawRect(ctx, cx + 1, cy + 6, 2, 2, "#2a2a4e");
  drawRect(ctx, cx + 3, cy + 6, 2, 2, "#2a2a4e");
  // chair
  drawRect(ctx, cx - 1, cy + 3, 8, 1, "#3a2a2a");
  drawRect(ctx, cx - 1, cy - 1, 1, 5, "#3a2a2a");
}

function drawPlant(ctx: CanvasRenderingContext2D, px: number, py: number) {
  // pot
  drawRect(ctx, px, py, 4, 3, "#8b4513");
  drawRect(ctx, px + 1, py - 1, 2, 1, "#8b4513");
  // leaves
  drawRect(ctx, px, py - 3, 1, 2, "#228b22");
  drawRect(ctx, px + 1, py - 4, 2, 3, "#2ecc40");
  drawRect(ctx, px + 3, py - 3, 1, 2, "#228b22");
  drawRect(ctx, px + 1, py - 5, 1, 1, "#2ecc40");
  drawRect(ctx, px + 2, py - 6, 1, 1, "#228b22");
}

function drawCoffeeMachine(ctx: CanvasRenderingContext2D, mx: number, my: number) {
  drawRect(ctx, mx, my, 5, 6, "#4a4a5a");
  drawRect(ctx, mx + 1, my + 1, 3, 2, "#2a2a3a");
  drawRect(ctx, mx + 1, my + 4, 2, 1, "#8b4513");
  // steam
  drawRect(ctx, mx + 2, my - 1, 1, 1, "#aaaacc");
  drawRect(ctx, mx + 3, my - 2, 1, 1, "#8888aa");
}

function drawClock(ctx: CanvasRenderingContext2D, cx: number, cy: number, frame: number) {
  drawRect(ctx, cx, cy, 5, 5, "#3a3a4a");
  drawRect(ctx, cx + 1, cy + 1, 3, 3, "#1a1a2e");
  // hour hand
  drawRect(ctx, cx + 2, cy + 2, 1, 1, "#ff7000");
  // minute hand — rotates
  const tick = frame % 120;
  if (tick < 30) drawRect(ctx, cx + 2, cy + 1, 1, 1, "#ffffff");
  else if (tick < 60) drawRect(ctx, cx + 3, cy + 2, 1, 1, "#ffffff");
  else if (tick < 90) drawRect(ctx, cx + 2, cy + 3, 1, 1, "#ffffff");
  else drawRect(ctx, cx + 1, cy + 2, 1, 1, "#ffffff");
}

function drawWhiteboard(ctx: CanvasRenderingContext2D, wx: number, wy: number) {
  drawRect(ctx, wx, wy, 14, 8, "#e8e8e8");
  drawRect(ctx, wx + 1, wy + 1, 12, 6, "#ffffff");
  // scribbles
  drawRect(ctx, wx + 2, wy + 2, 4, 1, "#ff7000");
  drawRect(ctx, wx + 2, wy + 4, 6, 1, "#4ecdc4");
  drawRect(ctx, wx + 7, wy + 2, 3, 1, "#ff6b6b");
  drawRect(ctx, wx + 2, wy + 6, 8, 1, "#82aaff");
}

// ── Desk layout ────────────────────────────────────────────────────────────

// 6 desks in 2 rows of 3
function getDeskPositions(): { dx: number; dy: number }[] {
  const startX = 6;
  const gapX = 28;
  return [
    // row 1 (top)
    { dx: startX, dy: 28 },
    { dx: startX + gapX, dy: 28 },
    { dx: startX + gapX * 2, dy: 28 },
    // row 2 (bottom)
    { dx: startX, dy: 50 },
    { dx: startX + gapX, dy: 50 },
    { dx: startX + gapX * 2, dy: 50 },
  ];
}

// ── Component ──────────────────────────────────────────────────────────────

function RouteComponent() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameRef = useRef(0);
  const [activeTab, setActiveTab] = useState<TabId>("terminal");
  const [selectedChar, setSelectedChar] = useState<Character | null>(null);
  const [logOffset, setLogOffset] = useState(0);
  const [characters] = useState<Character[]>(() => JSON.parse(JSON.stringify(CHARACTERS)));

  // Advance terminal log
  useEffect(() => {
    const interval = setInterval(() => {
      setLogOffset((prev) => prev + 1);
    }, 1800);
    return () => clearInterval(interval);
  }, []);

  // Canvas render loop
  const render = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const cw = canvas.width;
    const ch = canvas.height;
    frameRef.current += 1;
    const frame = frameRef.current;

    ctx.imageSmoothingEnabled = false;

    // background
    ctx.fillStyle = "#0f0f23";
    ctx.fillRect(0, 0, cw, ch);

    drawFloor(ctx, cw, ch);
    drawWalls(ctx, cw);

    // decorations
    drawWhiteboard(ctx, 38, 4);
    drawClock(ctx, 58, 5, frame);
    drawPlant(ctx, 2, 62);
    drawPlant(ctx, 88, 62);
    drawCoffeeMachine(ctx, 80, 56);

    // desks + characters
    const desks = getDeskPositions();
    for (let i = 0; i < desks.length; i++) {
      const desk = desks[i];
      drawDesk(ctx, desk.dx, desk.dy);
      const char = characters[i];
      if (char) {
        const cx = desk.dx + 5;
        const cy = desk.dy + 3;
        drawCharacter(ctx, cx, cy, char.color, char.skinColor, char.status, frame);
        // store hit box for click detection (in canvas pixels)
        char.x = cx * PX;
        char.y = (cy - 5) * PX;
        char.w = 6 * PX;
        char.h = 13 * PX;
        // name label
        ctx.fillStyle = "#ffffff";
        ctx.font = "8px monospace";
        ctx.textAlign = "center";
        ctx.fillText(char.name, (cx + 3) * PX, (cy + 10) * PX);
      }
    }

    // status indicator dots above working characters
    for (const char of characters) {
      if (char.status === "working") {
        const dotColor = frame % 20 < 10 ? "#00ff41" : "#009920";
        ctx.fillStyle = dotColor;
        ctx.fillRect(char.x + char.w / 2 - 2, char.y - 6, 4, 4);
      }
    }
  }, [characters]);

  useEffect(() => {
    let raf: number;
    const loop = () => {
      render();
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [render]);

  // Click handler for canvas
  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const mx = (e.clientX - rect.left) * scaleX;
    const my = (e.clientY - rect.top) * scaleY;

    for (const char of characters) {
      if (mx >= char.x && mx <= char.x + char.w && my >= char.y && my <= char.y + char.h) {
        setSelectedChar(char);
        return;
      }
    }
    setSelectedChar(null);
  };

  // Visible log lines
  const visibleLogs = Array.from({ length: 20 }, (_, i) => {
    const idx = (logOffset + i) % LOG_LINES.length;
    return LOG_LINES[idx];
  });

  const tabs: { id: TabId; label: string }[] = [
    { id: "terminal", label: "Terminal" },
    { id: "tasks", label: "Tasks" },
    { id: "files", label: "Files" },
  ];

  return (
    <div className="flex h-full w-full overflow-hidden" style={{ imageRendering: "pixelated" }}>
      {/* ── Canvas (70%) ── */}
      <div className="flex flex-col" style={{ width: "70%" }}>
        <div className="flex items-center gap-2 px-3 py-2 border-b border-white/10">
          <div className="h-2 w-2 rounded-full bg-[#FF7000]" />
          <span className="text-xs font-mono text-white/70">AI Office — 6 agents online</span>
          <span className="ml-auto text-xs font-mono text-white/40">v5 proto</span>
        </div>
        <div className="flex-1 flex items-center justify-center bg-[#0f0f23] p-2">
          <canvas
            ref={canvasRef}
            width={380}
            height={280}
            onClick={handleCanvasClick}
            className="w-full h-full cursor-pointer"
            style={{ imageRendering: "pixelated", maxHeight: "100%", objectFit: "contain" }}
          />
        </div>
      </div>

      {/* ── Side Panel (30%) ── */}
      <div
        className="flex flex-col overflow-hidden"
        style={{
          width: "30%",
          background: "#0a0a14",
          borderLeft: "4px solid #2a2a3e",
          boxShadow: "inset 4px 0 0 #1a1a2e, inset 0 4px 0 #1a1a2e, inset 0 -4px 0 #1a1a2e",
        }}
      >
        {/* Character info bar */}
        {selectedChar && (
          <div
            className="flex items-center gap-2 px-3 py-2 font-mono text-xs"
            style={{
              background: "#111122",
              borderBottom: "2px solid #2a2a3e",
            }}
          >
            <div className="h-3 w-3 rounded-sm" style={{ background: selectedChar.color }} />
            <span className="font-bold" style={{ color: selectedChar.color }}>
              {selectedChar.name}
            </span>
            <span className="text-white/50">— {selectedChar.role}</span>
            <span
              className="ml-auto rounded-sm px-1.5 py-0.5 text-[10px] uppercase font-bold"
              style={{
                background: selectedChar.status === "working" ? "#00ff4120" : selectedChar.status === "talking" ? "#ffcb0020" : "#ffffff10",
                color: selectedChar.status === "working" ? "#00ff41" : selectedChar.status === "talking" ? "#ffcb00" : "#888",
              }}
            >
              {selectedChar.status}
            </span>
          </div>
        )}

        {/* Tabs */}
        <div className="flex border-b font-mono" style={{ borderColor: "#2a2a3e" }}>
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className="flex-1 px-2 py-1.5 text-xs transition-colors"
              style={{
                background: activeTab === tab.id ? "#1a1a2e" : "transparent",
                color: activeTab === tab.id ? "#FF7000" : "#666",
                borderBottom: activeTab === tab.id ? "2px solid #FF7000" : "2px solid transparent",
              }}
            >
              [{tab.label}]
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="flex-1 overflow-hidden">
          {/* ── Terminal Tab ── */}
          {activeTab === "terminal" && (
            <div
              className="h-full overflow-hidden p-2 font-mono text-[11px] leading-relaxed"
              style={{ background: "#000000", color: "#00ff41" }}
            >
              <div className="flex items-center gap-1.5 pb-1.5 mb-1.5 text-[10px]" style={{ borderBottom: "1px solid #00ff4130", color: "#00ff4180" }}>
                <span>●</span>
                <span>office-terminal</span>
                <span className="ml-auto">live</span>
              </div>
              {visibleLogs.map((line, i) => (
                <div
                  key={`${logOffset}-${i}`}
                  className="whitespace-nowrap overflow-hidden"
                  style={{
                    opacity: i < 3 ? 0.4 : i > 16 ? 0.6 : 1,
                    color: line.includes("✓") ? "#00ff41" : line.includes("✗") ? "#ff6b6b" : line.includes("[mgr]") ? "#FF7000" : "#00ff41",
                  }}
                >
                  {line}
                </div>
              ))}
              <div className="mt-1" style={{ color: "#00ff4180" }}>
                <span className="animate-pulse">▊</span>
              </div>
            </div>
          )}

          {/* ── Tasks Tab ── */}
          {activeTab === "tasks" && (
            <div className="h-full overflow-y-auto p-2">
              <div className="grid grid-cols-3 gap-1.5 h-full" style={{ gridTemplateRows: "auto 1fr" }}>
                {(["todo", "working", "done"] as const).map((col) => (
                  <div key={col} className="flex flex-col gap-1">
                    <div
                      className="text-center font-mono text-[10px] uppercase font-bold py-1 rounded-sm"
                      style={{
                        background: col === "todo" ? "#ffffff10" : col === "working" ? "#FF700020" : "#00ff4120",
                        color: col === "todo" ? "#888" : col === "working" ? "#FF7000" : "#00ff41",
                      }}
                    >
                      {col} ({TASKS[col].length})
                    </div>
                    {TASKS[col].map((task) => (
                      <div
                        key={task.id}
                        className="rounded-sm p-1.5 font-mono text-[10px] leading-tight"
                        style={{
                          background: "#1a1a2e",
                          borderLeft: `2px solid ${task.color}`,
                        }}
                      >
                        <div className="text-white/90">{task.title}</div>
                        <div className="mt-0.5" style={{ color: task.color }}>
                          {task.assignee}
                        </div>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Files Tab ── */}
          {activeTab === "files" && (
            <div
              className="h-full overflow-y-auto p-2 font-mono text-[11px]"
              style={{ background: "#0a0a14" }}
            >
              <div className="flex items-center gap-1.5 pb-1.5 mb-1.5 text-[10px]" style={{ borderBottom: "1px solid #ffffff10", color: "#888" }}>
                <span>workspace</span>
                <span className="ml-auto text-white/30">18 files</span>
              </div>
              {FILE_TREE.map((entry, i) => (
                <div
                  key={i}
                  className="flex items-center gap-1 py-0.5 cursor-default hover:bg-white/5 rounded-sm px-1"
                  style={{ paddingLeft: `${entry.indent * 12 + 4}px` }}
                >
                  <span style={{ color: entry.type === "dir" ? "#FF7000" : "#82aaff" }}>
                    {entry.type === "dir" ? "▸" : "·"}
                  </span>
                  <span style={{ color: entry.type === "dir" ? "#FF7000" : "#ccc" }}>
                    {entry.name}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Bottom status bar */}
        <div
          className="flex items-center gap-2 px-3 py-1.5 font-mono text-[10px]"
          style={{
            background: "#111122",
            borderTop: "2px solid #2a2a3e",
            color: "#666",
          }}
        >
          <span className="h-1.5 w-1.5 rounded-full bg-[#00ff41]" />
          <span>6 agents</span>
          <span className="text-white/20">│</span>
          <span>3 active</span>
          <span className="ml-auto text-[#FF7000]">mistral</span>
        </div>
      </div>
    </div>
  );
}
