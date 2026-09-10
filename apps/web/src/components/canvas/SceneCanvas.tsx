import { useEffect, useRef, useState } from 'react';
import { Application, Assets, Container, Graphics, Sprite, Text, TextStyle } from 'pixi.js';
import { Crosshair, Grid, Maximize2, ZoomIn, ZoomOut } from 'lucide-react';
import { useTableStore } from '../../store/useTableStore';
import { useAuthStore } from '../../store/useAuthStore';
import { getSocket } from '../../lib/socket';

// ── Constants ─────────────────────────────────────────────────────────────────

const DEFAULT_GRID_SIZE = 64;
const ZOOM_MIN = 0.05;
const ZOOM_MAX = 4;
const ZOOM_STEP = 1.2;

const TOKEN_COLORS: Record<string, number> = {
  friendly: 0x22c55e,
  neutral:  0xeab308,
  hostile:  0xef4444,
};

// ── Types ─────────────────────────────────────────────────────────────────────

interface Camera { x: number; y: number; zoom: number }
interface TokenDrag { tokenId: string; offsetWX: number; offsetWY: number }

// ── Component ─────────────────────────────────────────────────────────────────

export default function SceneCanvas() {
  // DOM / Pixi refs
  const wrapperRef        = useRef<HTMLDivElement>(null);
  const appRef            = useRef<Application | null>(null);
  const worldContainerRef = useRef<Container | null>(null);
  const bgSpriteRef       = useRef<Sprite | null>(null);
  const gridGfxRef        = useRef<Graphics | null>(null);
  const tokenContainerRef = useRef<Container | null>(null);

  // Camera (mutable — never triggers React re-render on pan/zoom)
  const cam = useRef<Camera>({ x: 0, y: 0, zoom: 1 });

  // Map dimensions (updated when image loads)
  const mapW = useRef(1024);
  const mapH = useRef(768);

  // Interaction state
  const spaceDown  = useRef(false);
  const isPanning  = useRef(false);
  const panOrigin  = useRef({ x: 0, y: 0 });
  const tokenDrag  = useRef<TokenDrag | null>(null);

  // React state (only for overlay UI)
  const [displayZoom, setDisplayZoom] = useState(100);
  const [showGrid,    setShowGrid]    = useState(true);

  // Store
  const tokens         = useTableStore(s => s.tokens);
  const moveToken      = useTableStore(s => s.moveToken);
  const worldId        = useTableStore(s => s.worldId);
  const activeSceneImg = useTableStore(s => s.activeSceneImg);
  const user           = useAuthStore(s => s.user);

  // ── Camera helpers ──────────────────────────────────────────────────────────

  function screenToWorld(sx: number, sy: number) {
    return {
      x: (sx - cam.current.x) / cam.current.zoom,
      y: (sy - cam.current.y) / cam.current.zoom,
    };
  }

  function applyCamera() {
    const wc = worldContainerRef.current;
    if (!wc) return;
    wc.x = cam.current.x;
    wc.y = cam.current.y;
    wc.scale.set(cam.current.zoom);
    setDisplayZoom(Math.round(cam.current.zoom * 100));
  }

  function clampZoom(z: number) {
    return Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, z));
  }

  function setZoomAtPoint(newZoom: number, sx: number, sy: number) {
    newZoom = clampZoom(newZoom);
    const c = cam.current;
    c.x    = sx + (c.x - sx) * (newZoom / c.zoom);
    c.y    = sy + (c.y - sy) * (newZoom / c.zoom);
    c.zoom = newZoom;
    applyCamera();
  }

  function fitToScreen() {
    const el = wrapperRef.current;
    if (!el) return;
    const vw = el.clientWidth;
    const vh = el.clientHeight;
    const zoom = clampZoom(Math.min(vw / mapW.current, vh / mapH.current) * 0.92);
    cam.current = {
      x:    (vw - mapW.current * zoom) / 2,
      y:    (vh - mapH.current * zoom) / 2,
      zoom,
    };
    applyCamera();
  }

  function centerMap() {
    const el = wrapperRef.current;
    if (!el) return;
    const zoom = cam.current.zoom;
    cam.current = {
      x:    (el.clientWidth  - mapW.current * zoom) / 2,
      y:    (el.clientHeight - mapH.current * zoom) / 2,
      zoom,
    };
    applyCamera();
  }

  function resetTo100() {
    const el = wrapperRef.current;
    if (!el) return;
    cam.current = {
      x:    (el.clientWidth  - mapW.current) / 2,
      y:    (el.clientHeight - mapH.current) / 2,
      zoom: 1,
    };
    applyCamera();
  }

  function zoomAtCenter(factor: number) {
    const el = wrapperRef.current;
    if (!el) return;
    setZoomAtPoint(cam.current.zoom * factor, el.clientWidth / 2, el.clientHeight / 2);
  }

  // ── Grid ────────────────────────────────────────────────────────────────────

  function redrawGrid() {
    const gfx = gridGfxRef.current;
    if (!gfx) return;

    // Pixi v8: rebuild geometry by calling clear() then re-draw
    gfx.clear();

    const gs   = DEFAULT_GRID_SIZE;
    const cols = Math.ceil(mapW.current / gs) + 1;
    const rows = Math.ceil(mapH.current / gs) + 1;

    for (let x = 0; x <= cols; x++) {
      gfx
        .moveTo(x * gs, 0)
        .lineTo(x * gs, rows * gs)
        .stroke({ color: 0x3a3a5c, width: 1, alpha: 0.55 });
    }
    for (let y = 0; y <= rows; y++) {
      gfx
        .moveTo(0, y * gs)
        .lineTo(cols * gs, y * gs)
        .stroke({ color: 0x3a3a5c, width: 1, alpha: 0.55 });
    }
  }

  // ── Tokens ──────────────────────────────────────────────────────────────────

  function renderTokens(container: Container, list: typeof tokens) {
    container.removeChildren();

    const gs = DEFAULT_GRID_SIZE;

    for (const tok of list) {
      const color = TOKEN_COLORS[tok.disposition] ?? 0x888888;
      const wx    = tok.x * gs;
      const wy    = tok.y * gs;
      const size  = tok.width * gs;

      const g = new Graphics();
      g.roundRect(wx + 2, wy + 2, size - 4, size - 4, 6).fill({ color, alpha: 0.85 });
      g.roundRect(wx + 2, wy + 2, size - 4, size - 4, 6).stroke({ color: 0xffffff, width: 2, alpha: 0.3 });

      const initLabel = new Text({
        text:  tok.name.charAt(0).toUpperCase(),
        style: new TextStyle({ fill: 0xffffff, fontSize: 22, fontWeight: 'bold', fontFamily: 'Inter' }),
      });
      initLabel.x = wx + size / 2 - initLabel.width / 2;
      initLabel.y = wy + size / 2 - initLabel.height / 2;

      const nameLabel = new Text({
        text:  tok.name,
        style: new TextStyle({ fill: 0xe5e7eb, fontSize: 10, fontFamily: 'Inter' }),
      });
      nameLabel.x = wx + size / 2 - nameLabel.width / 2;
      nameLabel.y = wy + size + 2;

      g.eventMode = 'static';
      g.cursor    = 'grab';

      g.on('pointerdown', (e) => {
        // Ignore token click when in pan mode
        if (spaceDown.current || isPanning.current) return;
        e.stopPropagation();
        const world = screenToWorld(e.global.x, e.global.y);
        tokenDrag.current = {
          tokenId:  tok.id,
          offsetWX: world.x - wx,
          offsetWY: world.y - wy,
        };
        g.cursor = 'grabbing';
      });

      container.addChild(g, initLabel, nameLabel);
    }
  }

  // ── Pixi init (runs once) ───────────────────────────────────────────────────

  useEffect(() => {
    const el = wrapperRef.current;
    if (!el) return;
    let mounted = true;

    const app = new Application();
    app.init({
      width:           el.clientWidth  || 800,
      height:          el.clientHeight || 600,
      backgroundColor: 0x0a0a0f,
      antialias:       true,
      resolution:      window.devicePixelRatio || 1,
      autoDensity:     true,
    }).then(() => {
      if (!mounted) { app.destroy(); return; }

      appRef.current = app;
      el.appendChild(app.canvas as HTMLCanvasElement);

      // worldContainer is the single node that receives pan/zoom transforms.
      // Layer order: bgSprite (added dynamically at 0) → gridGfx → tokenContainer
      const wc = new Container();
      wc.eventMode = 'static';
      app.stage.addChild(wc);
      worldContainerRef.current = wc;

      const gridGfx = new Graphics();
      wc.addChild(gridGfx);
      gridGfxRef.current = gridGfx;
      redrawGrid();

      const tokenContainer = new Container();
      wc.addChild(tokenContainer);
      tokenContainerRef.current = tokenContainer;
      renderTokens(tokenContainer, tokens);

      fitToScreen();
    });

    // ── DOM event handlers ────────────────────────────────────────────────────

    const rect = () => el.getBoundingClientRect();

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const r  = rect();
      const sx = e.clientX - r.left;
      const sy = e.clientY - r.top;
      setZoomAtPoint(cam.current.zoom * (e.deltaY < 0 ? ZOOM_STEP : 1 / ZOOM_STEP), sx, sy);
    };

    const onPointerDown = (e: PointerEvent) => {
      const isPanTrigger = e.button === 1 || (e.button === 0 && spaceDown.current);
      if (!isPanTrigger) return;
      e.preventDefault();
      isPanning.current = true;
      panOrigin.current = { x: e.clientX, y: e.clientY };
      el.setPointerCapture(e.pointerId);
      el.style.cursor = 'grabbing';
    };

    const onPointerMove = (e: PointerEvent) => {
      if (isPanning.current) {
        cam.current.x += e.clientX - panOrigin.current.x;
        cam.current.y += e.clientY - panOrigin.current.y;
        panOrigin.current = { x: e.clientX, y: e.clientY };
        applyCamera();
        return; // pan takes priority over token drag
      }

      if (tokenDrag.current) {
        const r     = rect();
        const world = screenToWorld(e.clientX - r.left, e.clientY - r.top);
        const gs    = DEFAULT_GRID_SIZE;
        const gx    = Math.floor((world.x - tokenDrag.current.offsetWX) / gs);
        const gy    = Math.floor((world.y - tokenDrag.current.offsetWY) / gs);
        moveToken(tokenDrag.current.tokenId, gx, gy);
        if (worldId && user) {
          getSocket().emit('token:move', {
            worldId,
            sceneId: 'default',
            tokenId: tokenDrag.current.tokenId,
            x: gx, y: gy,
            userId: user.id,
          });
        }
      }
    };

    const onPointerUp = (e: PointerEvent) => {
      if (isPanning.current) {
        isPanning.current = false;
        el.style.cursor = spaceDown.current ? 'grab' : '';
      }
      tokenDrag.current = null;
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !e.repeat) {
        // Prevent page scroll; only when canvas area is focused
        if (document.activeElement === el || el.contains(document.activeElement)) {
          e.preventDefault();
        }
        spaceDown.current = true;
        el.style.cursor   = 'grab';
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        spaceDown.current = false;
        if (!isPanning.current) el.style.cursor = '';
      }
    };

    // Middle-click context menu suppression
    const onContextMenu = (e: MouseEvent) => {
      if (e.button === 1) e.preventDefault();
    };

    el.addEventListener('wheel',       onWheel,       { passive: false });
    el.addEventListener('pointerdown', onPointerDown);
    el.addEventListener('pointermove', onPointerMove);
    el.addEventListener('pointerup',   onPointerUp);
    el.addEventListener('contextmenu', onContextMenu);
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup',   onKeyUp);

    // Resize
    const ro = new ResizeObserver(() => {
      const a = appRef.current;
      if (a?.renderer) a.renderer.resize(el.clientWidth, el.clientHeight);
    });
    ro.observe(el);

    return () => {
      mounted = false;
      el.removeEventListener('wheel',       onWheel);
      el.removeEventListener('pointerdown', onPointerDown);
      el.removeEventListener('pointermove', onPointerMove);
      el.removeEventListener('pointerup',   onPointerUp);
      el.removeEventListener('contextmenu', onContextMenu);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup',   onKeyUp);
      ro.disconnect();
      if (appRef.current) { appRef.current.destroy(); appRef.current = null; }
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Sync tokens ─────────────────────────────────────────────────────────────

  useEffect(() => {
    if (tokenContainerRef.current) renderTokens(tokenContainerRef.current, tokens);
  }, [tokens]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Sync background image ───────────────────────────────────────────────────

  useEffect(() => {
    const wc = worldContainerRef.current;
    if (!wc) return;

    // Remove previous bg sprite
    if (bgSpriteRef.current) {
      wc.removeChild(bgSpriteRef.current);
      bgSpriteRef.current.destroy();
      bgSpriteRef.current = null;
    }

    if (!activeSceneImg) {
      redrawGrid();
      fitToScreen();
      return;
    }

    Assets.load(activeSceneImg).then((texture) => {
      if (!worldContainerRef.current) return;

      mapW.current = texture.width;
      mapH.current = texture.height;

      const sprite = new Sprite(texture);
      // Insert behind grid (index 0) and grid behind tokens (index 1)
      worldContainerRef.current.addChildAt(sprite, 0);
      bgSpriteRef.current = sprite;

      redrawGrid();
      fitToScreen();
    }).catch(() => {});
  }, [activeSceneImg]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Sync grid visibility ────────────────────────────────────────────────────

  useEffect(() => {
    if (gridGfxRef.current) gridGfxRef.current.visible = showGrid;
  }, [showGrid]);

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="relative w-full h-full bg-obsidian-950 rounded-lg overflow-hidden">
      {/* Pixi canvas mount point */}
      <div
        ref={wrapperRef}
        className="w-full h-full"
        style={{ touchAction: 'none' }}
      />

      {/* Viewport controls overlay */}
      <div className="absolute bottom-3 right-3 flex items-center gap-0.5 bg-obsidian-900/90 border border-obsidian-600 rounded-lg px-1.5 py-1 backdrop-blur-sm select-none">
        <button
          onClick={fitToScreen}
          title="Fit to screen (F)"
          className="btn-ghost p-1.5"
        >
          <Maximize2 size={13} />
        </button>

        <button
          onClick={resetTo100}
          title="100% zoom"
          className="btn-ghost px-2 py-1.5 text-xs font-mono"
        >
          1:1
        </button>

        <button
          onClick={centerMap}
          title="Center map"
          className="btn-ghost p-1.5"
        >
          <Crosshair size={13} />
        </button>

        <div className="w-px h-4 bg-obsidian-600 mx-0.5" />

        <button
          onClick={() => zoomAtCenter(ZOOM_STEP)}
          title="Zoom in (+)"
          className="btn-ghost p-1.5"
        >
          <ZoomIn size={13} />
        </button>

        <span className="text-xs text-gray-400 font-mono w-11 text-center tabular-nums">
          {displayZoom}%
        </span>

        <button
          onClick={() => zoomAtCenter(1 / ZOOM_STEP)}
          title="Zoom out (-)"
          className="btn-ghost p-1.5"
        >
          <ZoomOut size={13} />
        </button>

        <div className="w-px h-4 bg-obsidian-600 mx-0.5" />

        <button
          onClick={() => setShowGrid(v => !v)}
          title="Toggle grid (G)"
          className={`btn-ghost p-1.5 ${showGrid ? 'text-amber' : 'text-gray-600'}`}
        >
          <Grid size={13} />
        </button>
      </div>

      {/* Keyboard hints */}
      <div className="absolute bottom-3 left-3 text-xs text-gray-700 select-none pointer-events-none leading-relaxed">
        <div>Scroll — zoom</div>
        <div>Middle drag / Space+drag — pan</div>
      </div>
    </div>
  );
}
