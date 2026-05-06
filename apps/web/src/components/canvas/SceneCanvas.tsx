import { useEffect, useRef, useState } from 'react';
import { Application, Container, Graphics, Text, TextStyle } from 'pixi.js';
import { useTableStore } from '../../store/useTableStore';
import { useAuthStore } from '../../store/useAuthStore';
import { getSocket } from '../../lib/socket';

const GRID_SIZE = 64;
const GRID_COLOR = 0x1e1e35;
const GRID_LINE_COLOR = 0x252540;

const TOKEN_COLORS: Record<string, number> = {
  friendly: 0x22c55e,
  neutral: 0xeab308,
  hostile: 0xef4444,
};

interface DragState {
  tokenId: string;
  offsetX: number;
  offsetY: number;
}

export default function SceneCanvas() {
  const canvasRef = useRef<HTMLDivElement>(null);
  const appRef = useRef<Application | null>(null);
  const tokens = useTableStore((s) => s.tokens);
  const moveToken = useTableStore((s) => s.moveToken);
  const worldId = useTableStore((s) => s.worldId);
  const user = useAuthStore((s) => s.user);
  const draggingRef = useRef<DragState | null>(null);
  const tokenContainerRef = useRef<Container | null>(null);

  useEffect(() => {
    if (!canvasRef.current) return;
    const el = canvasRef.current;
    let mounted = true;

    const app = new Application();

    app.init({
      width: el.clientWidth || 800,
      height: el.clientHeight || 600,
      backgroundColor: 0x0a0a0f,
      antialias: true,
      resolution: window.devicePixelRatio || 1,
      autoDensity: true,
    }).then(() => {
      if (!mounted) {
        app.destroy();
        return;
      }

      appRef.current = app;
      el.appendChild(app.canvas as HTMLCanvasElement);

      const cols = Math.ceil((el.clientWidth || 800) / GRID_SIZE) + 2;
      const rows = Math.ceil((el.clientHeight || 600) / GRID_SIZE) + 2;

      const gridGfx = new Graphics();
      for (let x = 0; x <= cols; x++) {
        gridGfx.moveTo(x * GRID_SIZE, 0).lineTo(x * GRID_SIZE, rows * GRID_SIZE)
          .stroke({ color: GRID_LINE_COLOR, width: 1, alpha: 0.5 });
      }
      for (let y = 0; y <= rows; y++) {
        gridGfx.moveTo(0, y * GRID_SIZE).lineTo(cols * GRID_SIZE, y * GRID_SIZE)
          .stroke({ color: GRID_LINE_COLOR, width: 1, alpha: 0.5 });
      }
      app.stage.addChild(gridGfx);

      const tokenContainer = new Container();
      app.stage.addChild(tokenContainer);
      tokenContainerRef.current = tokenContainer;

      renderTokens(tokenContainer, tokens);
    });

    const handleResize = () => {
      if (appRef.current?.renderer && el) {
        appRef.current.renderer.resize(el.clientWidth, el.clientHeight);
      }
    };
    const ro = new ResizeObserver(handleResize);
    ro.observe(el);

    return () => {
      mounted = false;
      ro.disconnect();
      if (appRef.current) {
        appRef.current.destroy();
        appRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (tokenContainerRef.current) {
      renderTokens(tokenContainerRef.current, tokens);
    }
  }, [tokens]);

  function renderTokens(container: Container, tokenList: typeof tokens) {
    container.removeChildren();

    for (const tok of tokenList) {
      const g = new Graphics();
      const color = TOKEN_COLORS[tok.disposition] ?? 0x888888;
      const px = tok.x * GRID_SIZE;
      const py = tok.y * GRID_SIZE;
      const size = tok.width * GRID_SIZE;

      g.roundRect(px + 2, py + 2, size - 4, size - 4, 6).fill({ color, alpha: 0.85 });
      g.roundRect(px + 2, py + 2, size - 4, size - 4, 6).stroke({ color: 0xffffff, width: 2, alpha: 0.3 });

      const label = new Text({
        text: tok.name.charAt(0).toUpperCase(),
        style: new TextStyle({ fill: 0xffffff, fontSize: 22, fontWeight: 'bold', fontFamily: 'Inter' }),
      });
      label.x = px + size / 2 - label.width / 2;
      label.y = py + size / 2 - label.height / 2;

      const nameLabel = new Text({
        text: tok.name,
        style: new TextStyle({ fill: 0xe5e7eb, fontSize: 10, fontFamily: 'Inter' }),
      });
      nameLabel.x = px + size / 2 - nameLabel.width / 2;
      nameLabel.y = py + size + 2;

      g.eventMode = 'static';
      g.cursor = 'grab';

      g.on('pointerdown', (e) => {
        draggingRef.current = {
          tokenId: tok.id,
          offsetX: e.global.x - px,
          offsetY: e.global.y - py,
        };
        g.cursor = 'grabbing';
      });

      container.addChild(g, label, nameLabel);
    }

    if (appRef.current) {
      const stage = appRef.current.stage;
      stage.eventMode = 'static';

      stage.off('pointermove');
      stage.off('pointerup');

      stage.on('pointermove', (e) => {
        if (!draggingRef.current) return;
        const { tokenId, offsetX, offsetY } = draggingRef.current;
        const newX = Math.floor((e.global.x - offsetX) / GRID_SIZE);
        const newY = Math.floor((e.global.y - offsetY) / GRID_SIZE);
        moveToken(tokenId, newX, newY);

        if (worldId && user) {
          getSocket().emit('token:move', {
            worldId,
            sceneId: 'default',
            tokenId,
            x: newX,
            y: newY,
            userId: user.id,
          });
        }
      });

      stage.on('pointerup', () => { draggingRef.current = null; });
    }
  }

  return (
    <div
      ref={canvasRef}
      className="w-full h-full bg-obsidian-950 rounded-lg overflow-hidden"
      style={{ touchAction: 'none' }}
    />
  );
}
