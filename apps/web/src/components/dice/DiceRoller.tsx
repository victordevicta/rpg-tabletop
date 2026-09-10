import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Dices, ChevronUp, ChevronDown, Settings, Check, Pipette } from 'lucide-react';
import { roll, rollWithPrerolled } from '@eldertable/dice-engine';
import type { RollResult } from '@eldertable/shared';
import { useTableStore } from '../../store/useTableStore';
import { useAuthStore } from '../../store/useAuthStore';
import { getSocket } from '../../lib/socket';

// ── Constants ─────────────────────────────────────────────────────────────────

const OVERLAY_ID  = 'dice-3d-container';
const SETTINGS_KEY = 'eldertable:dice-settings';

const DICE = [
  { sides: 4,   label: 'D4'   },
  { sides: 6,   label: 'D6'   },
  { sides: 8,   label: 'D8'   },
  { sides: 10,  label: 'D10'  },
  { sides: 12,  label: 'D12'  },
  { sides: 20,  label: 'D20'  },
  { sides: 100, label: 'D100' },
  { sides: 6,   label: 'Fudge', fudge: true },
] as const;

type Die      = typeof DICE[number];
type RollMode = 'normal' | '!' | '!!' | '!p';

// ── Skins ─────────────────────────────────────────────────────────────────────

interface Skin {
  id:      string;
  name:    string;
  /** Hex tint for the 3D material — empty = use theme default */
  color:   string;
  /** Babylon.js light intensity  */
  light:   number;
  /** Preview shown in the UI (CSS color or gradient string) */
  preview: string;
}

const SKINS: Skin[] = [
  { id: 'classic',   name: 'Clássico',     color: '',        light: 0.9,  preview: 'linear-gradient(135deg,#c8c8c8,#f0f0f0)' },
  { id: 'ruby',      name: 'Rubi',         color: '#b03a2e', light: 1.1,  preview: 'linear-gradient(135deg,#922b21,#e74c3c)' },
  { id: 'sapphire',  name: 'Safira',       color: '#1a5276', light: 1.05, preview: 'linear-gradient(135deg,#154360,#2980b9)' },
  { id: 'emerald',   name: 'Esmeralda',    color: '#1e8449', light: 1.0,  preview: 'linear-gradient(135deg,#145a32,#27ae60)' },
  { id: 'amethyst',  name: 'Ametista',     color: '#7d3c98', light: 0.95, preview: 'linear-gradient(135deg,#6c3483,#af7ac5)' },
  { id: 'gold',      name: 'Dourado',      color: '#d4ac0d', light: 1.5,  preview: 'linear-gradient(135deg,#b7950b,#f9e79f)' },
  { id: 'obsidian',  name: 'Obsidiana',    color: '#17202a', light: 0.55, preview: 'linear-gradient(135deg,#0d0d0d,#2c3e50)' },
  { id: 'ice',       name: 'Gelo',         color: '#aed6f1', light: 1.35, preview: 'linear-gradient(135deg,#85c1e9,#d6eaf8)' },
  { id: 'blood',     name: 'Sangue',       color: '#6e2222', light: 0.7,  preview: 'linear-gradient(135deg,#4a0e0e,#922b21)' },
  { id: 'void',      name: 'Vazio',        color: '#0b0c1a', light: 0.45, preview: 'linear-gradient(135deg,#060610,#1b1b3a)' },
  { id: 'rose',      name: 'Rosa',         color: '#c0185c', light: 1.1,  preview: 'linear-gradient(135deg,#880e4f,#f06292)' },
  { id: 'forest',    name: 'Floresta',     color: '#1a5c30', light: 0.8,  preview: 'linear-gradient(135deg,#0d3b1e,#27ae60)' },
  { id: 'bronze',    name: 'Bronze',       color: '#7d4a1e', light: 1.2,  preview: 'linear-gradient(135deg,#5c3317,#c87941)' },
  { id: 'galaxy',    name: 'Galáxia',      color: '#2e1065', light: 0.85, preview: 'linear-gradient(135deg,#0d001a,#7c3aed,#2563eb)' },
  { id: 'custom',    name: 'Personalizado', color: '#ffffff', light: 1.0,  preview: 'custom' },
];

// ── Critical easter-egg overlay ───────────────────────────────────────────────

const CRIT_SRCS: Record<'success' | 'failure', string> = {
  success: '/assets/critical-success.mp4',  // troque por .gif se quiser usar GIF
  failure: '/assets/critical-failure.mp4',  // troque por .gif se quiser usar GIF
};
const CRIT_GIF_DURATION_MS = 3000; // duração exibida quando o arquivo for .gif

type CritState = { type: 'success' | 'failure'; visible: boolean } | null;

// ── Settings ──────────────────────────────────────────────────────────────────

interface DiceSettings {
  animationEnabled: boolean;
  lingerTime:       number;   // seconds 0-5
  skinId:           string;
  customColor:      string;   // only when skinId === 'custom'
}

const DEFAULTS: DiceSettings = {
  animationEnabled: true,
  lingerTime:       1,
  skinId:           'classic',
  customColor:      '#e74c3c',
};

function loadSettings(): DiceSettings {
  try { return { ...DEFAULTS, ...JSON.parse(localStorage.getItem(SETTINGS_KEY) ?? '{}') }; }
  catch { return DEFAULTS; }
}

function saveSettings(s: DiceSettings) {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(s));
}

function resolveSkin(s: DiceSettings): { color: string; light: number } {
  if (s.skinId === 'custom') return { color: s.customColor, light: 1.0 };
  const skin = SKINS.find(sk => sk.id === s.skinId) ?? SKINS[0];
  return { color: skin.color, light: skin.light };
}

// ── Dice math helpers ─────────────────────────────────────────────────────────

function fudgeRoll(qty: number) {
  const map = [-1, -1, 0, 0, 1, 1];
  const faces = Array.from({ length: qty }, () => map[Math.floor(Math.random() * 6)]);
  return {
    total:   faces.reduce((a, b) => a + b, 0),
    formula: '[' + faces.map(f => f > 0 ? '+' : f < 0 ? '−' : '□').join(', ') + ']',
  };
}

function explodingRoll(initialRolls: number[], sides: number, mode: '!' | '!!' | '!p') {
  const rand = () => Math.floor(Math.random() * sides) + 1;
  if (mode === '!!') {
    const sums = initialRolls.map(init => {
      let sum = init, val = init, extra = 0;
      while (val === sides && extra < 10) { val = rand(); sum += val; extra++; }
      return sum;
    });
    return { total: sums.reduce((a, b) => a + b, 0), formula: `[${sums.join(', ')}]` };
  }
  const allRolls = initialRolls.flatMap(init => {
    const chain = [init]; let val = init, extra = 0;
    while (val === sides && extra < 10) {
      val = mode === '!p' ? Math.max(1, Math.floor(Math.random() * sides)) : rand();
      chain.push(val); extra++;
    }
    return chain;
  });
  return { total: allRolls.reduce((a, b) => a + b, 0), formula: `[${allRolls.join(', ')}]` };
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function DiceRoller() {
  const [settings, setSettings] = useState<DiceSettings>(loadSettings);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [gmRoll,       setGmRoll]       = useState(false);
  const [rolling,      setRolling]      = useState(false);
  const [diceReady,    setDiceReady]    = useState(false);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [advQty,       setAdvQty]       = useState(1);
  const [advSides,     setAdvSides]     = useState(20);
  const [advMod,       setAdvMod]       = useState(0);
  const [currentExpr,  setCurrentExpr]  = useState('');
  const boxRef      = useRef<any>(null);
  const critTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [crit, setCrit] = useState<CritState>(null);

  const rollLog  = useTableStore(s => s.rollLog);
  const worldId  = useTableStore(s => s.worldId);
  const user     = useAuthStore(s => s.user);
  const addRoll  = useTableStore(s => s.addRollEntry);

  // ── Dice-box lifecycle ────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;

    const init = async () => {
      boxRef.current = null;
      setDiceReady(false);
      document.getElementById(OVERLAY_ID)?.querySelector('canvas')?.remove();

      if (!settings.animationEnabled) return;

      try {
        const { default: DiceBox } = await import('@3d-dice/dice-box');
        if (cancelled) return;

        const { color, light } = resolveSkin(settings);
        const opts: Record<string, unknown> = {
          assetPath: '/assets/dice-box/', theme: 'default', offscreen: false,
          gravity: 2, mass: 1, friction: 0.8, restitution: 0.3,
          angularDamping: 0.5, linearDamping: 0.5,
          spinForce: 5, throwForce: 5, startingHeight: 8, settleTimeout: 5000,
          lightIntensity: light,
        };
        if (color) opts.themeColor = color;

        const box = new DiceBox(`#${OVERLAY_ID}`, opts);
        const canvas = document.querySelector(`#${OVERLAY_ID} canvas`) as HTMLCanvasElement | null;
        if (canvas) {
          Object.assign(canvas.style, { position: 'absolute', inset: '0', width: '100%', height: '100%' });
          canvas.width  = window.innerWidth;
          canvas.height = window.innerHeight;
        }
        await box.init();
        if (!cancelled) { boxRef.current = box; setDiceReady(true); }
      } catch (e) { console.error('DiceBox init:', e); }
    };

    init();
    return () => { cancelled = true; boxRef.current = null; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings.animationEnabled, settings.skinId, settings.customColor]);

  // ── Settings helpers ──────────────────────────────────────────────────────
  function updateSettings<K extends keyof DiceSettings>(key: K, value: DiceSettings[K]) {
    setSettings(prev => { const next = { ...prev, [key]: value }; saveSettings(next); return next; });
  }

  // ── 3D animation ──────────────────────────────────────────────────────────
  async function animate3D(notation: string): Promise<number[]> {
    if (!settings.animationEnabled || !boxRef.current || !diceReady) return [];
    try {
      const res: { value: number }[] = await boxRef.current.roll(notation);
      if (settings.lingerTime > 0) await new Promise(r => setTimeout(r, settings.lingerTime * 1000));
      return res.map(r => r.value);
    } catch { return []; }
  }

  // ── Critical overlay helpers ──────────────────────────────────────────────
  function showCrit(type: 'success' | 'failure') {
    if (critTimerRef.current) clearTimeout(critTimerRef.current);
    setCrit({ type, visible: false });
    // double-rAF so the initial opacity:0 is painted before transitioning to 1
    requestAnimationFrame(() =>
      requestAnimationFrame(() =>
        setCrit(prev => prev ? { ...prev, visible: true } : null),
      ),
    );
  }

  function hideCrit() {
    setCrit(prev => prev ? { ...prev, visible: false } : null);
    critTimerRef.current = setTimeout(() => setCrit(null), 600);
  }

  // ── Commit ────────────────────────────────────────────────────────────────
  function commit(expression: string, total: number, formula: string, critical?: 'success' | 'failure') {
    const speaker = gmRoll ? `[GM] ${user?.name ?? 'GM'}` : (user?.name ?? 'You');
    addRoll({ id: `local-${Date.now()}`, expression, result: { total, formula, critical }, speaker, createdAt: new Date().toISOString() });
    if (worldId && user)
      getSocket().emit('roll:create', { worldId, userId: user.id, expression, result: { expression, total, formula, critical, timestamp: Date.now(), terms: [] } });
    if (critical) showCrit(critical);
  }

  // ── Roll handlers ─────────────────────────────────────────────────────────
  async function handleRoll(die: Die, qty: number, mode: RollMode = 'normal') {
    if (rolling) return;
    if ('fudge' in die && die.fudge) {
      const { total, formula } = fudgeRoll(qty);
      commit(`${qty}dF`, total, formula);
      return;
    }
    const { sides } = die;
    const notation = `${qty}d${sides}`;
    const expr = mode === 'normal' ? notation : `${notation}${mode}`;
    setCurrentExpr(expr); setRolling(true);

    const initialRolls = await animate3D(notation);
    const base = initialRolls.length > 0 ? initialRolls : Array.from({ length: qty }, () => Math.floor(Math.random() * sides) + 1);

    if (mode === 'normal') {
      const result: RollResult = initialRolls.length > 0 ? rollWithPrerolled(notation, base) : roll(notation);
      setRolling(false); commit(result.expression, result.total, result.formula, result.critical);
    } else {
      const { total, formula } = explodingRoll(base, sides, mode as '!' | '!!' | '!p');
      setRolling(false); commit(expr, total, formula);
    }
  }

  async function handleAdvancedRoll() {
    if (rolling) return;
    const notation = `${advQty}d${advSides}`;
    const expr = advMod !== 0 ? `${notation}${advMod >= 0 ? '+' : ''}${advMod}` : notation;
    setCurrentExpr(expr); setRolling(true);
    const vals = await animate3D(notation);
    let result: RollResult;
    try { result = vals.length > 0 ? rollWithPrerolled(expr, vals) : roll(expr); }
    catch { alert(`Expressão inválida: ${expr}`); setRolling(false); return; }
    setRolling(false); commit(result.expression, result.total, result.formula, result.critical);
  }

  // ── Sub-components ────────────────────────────────────────────────────────
  function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
    return (
      <button role="switch" aria-checked={checked} onClick={() => onChange(!checked)}
        className={`relative w-8 h-4 rounded-full transition-colors flex-shrink-0 ${checked ? 'bg-pink-600' : 'bg-obsidian-600'}`}>
        <span className={`absolute top-0.5 w-3 h-3 bg-white rounded-full shadow transition-transform ${checked ? 'translate-x-4' : 'translate-x-0.5'}`} />
      </button>
    );
  }

  function Spinner({ value, onChange, min = -99 }: { value: number; onChange: (n: number) => void; min?: number }) {
    return (
      <div className="flex items-stretch border border-obsidian-600 rounded text-xs">
        <span className="px-2 py-1 font-mono text-gray-300 min-w-[2rem] text-center select-none">{value}</span>
        <div className="flex flex-col border-l border-obsidian-600">
          <button onClick={() => onChange(value + 1)} className="px-1 hover:bg-obsidian-700 text-gray-400 flex items-center py-0.5"><ChevronUp size={9} /></button>
          <button onClick={() => onChange(Math.max(min, value - 1))} className="px-1 hover:bg-obsidian-700 text-gray-400 flex items-center py-0.5 border-t border-obsidian-700"><ChevronDown size={9} /></button>
        </div>
      </div>
    );
  }

  // ── Render ────────────────────────────────────────────────────────────────
  const colTemplate  = '2.8rem repeat(6,1fr) 1.4rem 1.6rem 1.6rem';
  const activeSkin   = SKINS.find(s => s.id === settings.skinId) ?? SKINS[0];

  return (
    <>
      {/* ── Critical easter-egg overlay ── */}
      {crit && createPortal(
        <div
          aria-hidden="true"
          style={{
            position:       'fixed',
            inset:          0,
            zIndex:         300,
            display:        'flex',
            flexDirection:  'column',
            alignItems:     'center',
            justifyContent: 'center',
            gap:            '1.5rem',
            pointerEvents:  'none',
            opacity:        crit.visible ? 1 : 0,
            transition:     'opacity 0.5s ease',
          }}
        >
          <style>{`
            @keyframes neon-flash {
              0%, 100% { opacity: 1; }
              45%       { opacity: 1; }
              50%       { opacity: 0.05; }
              55%       { opacity: 1; }
            }
            .crit-label {
              font-family: 'serif';
              font-size: 2.4rem;
              font-weight: 900;
              letter-spacing: 0.08em;
              text-transform: uppercase;
              animation: neon-flash 0.6s ease-in-out infinite;
              user-select: none;
            }
            .crit-label-success {
              color: #00ff41;
              text-shadow:
                0 0 8px #00ff41,
                0 0 20px #00ff41,
                0 0 45px #00cc33,
                0 0 80px #00aa22;
            }
            .crit-label-failure {
              color: #ff2244;
              text-shadow:
                0 0 8px #ff2244,
                0 0 20px #ff2244,
                0 0 45px #cc1133,
                0 0 80px #aa0022;
            }
          `}</style>

          {/\.gif$/i.test(CRIT_SRCS[crit.type]) ? (
            <img
              src={CRIT_SRCS[crit.type]}
              alt=""
              style={{ width: 360, borderRadius: 16, boxShadow: '0 0 60px rgba(0,0,0,0.9)' }}
              onLoad={() => {
                if (critTimerRef.current) clearTimeout(critTimerRef.current);
                critTimerRef.current = setTimeout(hideCrit, CRIT_GIF_DURATION_MS);
              }}
            />
          ) : (
            <video
              key={crit.type}
              autoPlay
              muted
              playsInline
              onEnded={hideCrit}
              style={{ width: 360, borderRadius: 16, boxShadow: '0 0 60px rgba(0,0,0,0.9)' }}
            >
              <source src={CRIT_SRCS[crit.type]} />
            </video>
          )}

          <p className={`crit-label crit-label-${crit.type}`}>
            {crit.type === 'success' ? 'Critical Success!!!' : 'Critical Failure!!!'}
          </p>
        </div>,
        document.body,
      )}

      {/* 3D overlay — stays visible during crit video so the dark bg persists */}
      <div id={OVERLAY_ID} style={{
        position: 'fixed', inset: 0, zIndex: 50,
        opacity: (rolling || crit !== null) ? 1 : 0,
        pointerEvents: rolling ? 'auto' : 'none',
        background: (rolling || crit !== null) ? 'rgba(5,5,15,0.88)' : 'transparent',
        transition: 'opacity 0.3s',
      }}>
        {rolling && (
          <p className="absolute bottom-10 left-1/2 -translate-x-1/2 font-display text-xl text-amber tracking-widest animate-pulse select-none">
            Rolando {currentExpr}…
          </p>
        )}
      </div>

      <div className="flex flex-col h-full text-xs">

        {/* ── Header ── */}
        <div className="panel-header flex items-center gap-2">
          <Dices size={13} /> Rolo de Dados
          <div className="ml-auto flex items-center gap-2">
            {settings.animationEnabled && diceReady && (
              <span className="flex items-center gap-1 text-obsidian-500 text-[10px]">
                <span className="w-2 h-2 rounded-full inline-block" style={{ background: activeSkin.preview.startsWith('linear') ? activeSkin.preview : activeSkin.preview }} />
                3D
              </span>
            )}
            <button onClick={() => setSettingsOpen(o => !o)}
              className={`transition-colors ${settingsOpen ? 'text-amber' : 'text-gray-500 hover:text-gray-300'}`}>
              <Settings size={13} />
            </button>
          </div>
        </div>

        {/* ── Settings panel ── */}
        {settingsOpen && (
          <div className="border-b border-obsidian-600 bg-obsidian-900 px-3 py-3 space-y-4 overflow-y-auto max-h-72">

            {/* Animation toggle */}
            <div className="flex items-center justify-between">
              <span className="text-gray-300 font-medium">Animação 3D</span>
              <Toggle checked={settings.animationEnabled} onChange={v => updateSettings('animationEnabled', v)} />
            </div>

            <div className={`space-y-4 transition-opacity ${settings.animationEnabled ? 'opacity-100' : 'opacity-30 pointer-events-none'}`}>

              {/* Linger time */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">Tempo de exibição</span>
                  <span className="font-mono text-gray-300">{settings.lingerTime.toFixed(1)}s</span>
                </div>
                <input type="range" min={0} max={5} step={0.5} value={settings.lingerTime}
                  onChange={e => updateSettings('lingerTime', Number(e.target.value))}
                  className="w-full accent-pink-500 h-1 cursor-pointer" />
                <div className="flex justify-between text-gray-600 text-[10px]"><span>0s</span><span>5s</span></div>
              </div>

              {/* Skin grid */}
              <div className="space-y-2">
                <span className="text-gray-400">Skin dos dados</span>
                <div className="grid grid-cols-3 gap-1.5">
                  {SKINS.map(skin => {
                    const isSelected = settings.skinId === skin.id;
                    const isCustom   = skin.id === 'custom';
                    return (
                      <button
                        key={skin.id}
                        onClick={() => updateSettings('skinId', skin.id)}
                        className={`relative flex flex-col items-center gap-1 p-1.5 rounded-lg border transition-all ${
                          isSelected
                            ? 'border-amber bg-obsidian-700'
                            : 'border-obsidian-600 hover:border-obsidian-400 hover:bg-obsidian-800'
                        }`}
                      >
                        {/* Swatch */}
                        <div className="w-8 h-8 rounded-full border border-white/10 flex items-center justify-center overflow-hidden"
                          style={{ background: isCustom ? 'conic-gradient(#f00,#ff0,#0f0,#0ff,#00f,#f0f,#f00)' : skin.preview }}>
                          {isCustom && <Pipette size={12} className="text-white drop-shadow" />}
                        </div>
                        <span className="text-gray-400 text-[9px] leading-tight text-center">{skin.name}</span>
                        {isSelected && (
                          <span className="absolute top-1 right-1">
                            <Check size={8} className="text-amber" />
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Custom color picker — shown only when 'custom' is selected */}
                {settings.skinId === 'custom' && (
                  <div className="flex items-center gap-2 pt-1">
                    <span className="text-gray-400">Cor:</span>
                    <div className="relative flex items-center">
                      <div className="w-7 h-7 rounded border border-obsidian-500 overflow-hidden cursor-pointer relative">
                        <input type="color" value={settings.customColor}
                          onChange={e => updateSettings('customColor', e.target.value)}
                          className="absolute w-[200%] h-[200%] -top-1/4 -left-1/4 cursor-pointer opacity-0" />
                        <div className="w-full h-full" style={{ background: settings.customColor }} />
                      </div>
                    </div>
                    <span className="font-mono text-gray-500">{settings.customColor}</span>
                  </div>
                )}

                {(settings.skinId === 'custom' || settings.skinId !== 'classic') && (
                  <p className="text-obsidian-500 text-[10px] leading-tight">
                    Mudança de skin reinicializa os dados automaticamente.
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ── GM Roll toggle ── */}
        <div className="px-2 py-1.5 border-b border-obsidian-600 flex items-center gap-2">
          <Toggle checked={gmRoll} onChange={setGmRoll} />
          <span className="text-gray-400">Rolo de GM</span>
        </div>

        {/* ── Column headers ── */}
        <div className="grid border-b border-obsidian-700 px-2 py-0.5 text-center text-gray-600" style={{ gridTemplateColumns: colTemplate }}>
          <span />
          {[1,2,3,4,5,6].map(n => <span key={n}>{n}</span>)}
          <span className="text-pink-600">!</span>
          <span className="text-pink-600">!!</span>
          <span className="text-pink-600">!p</span>
        </div>

        {/* ── Die rows ── */}
        <div className="overflow-y-auto">
          {DICE.map(die => (
            <div key={die.label} className="grid border-b border-obsidian-800 px-2 items-center hover:bg-obsidian-800/30"
              style={{ gridTemplateColumns: colTemplate }}>
              <span className="text-gray-300 py-1.5 font-medium select-none">{die.label}</span>
              {[1,2,3,4,5,6].map(qty => (
                <button key={qty} disabled={rolling} onClick={() => handleRoll(die, qty)}
                  className="text-pink-500 hover:text-white hover:bg-pink-600 rounded py-1.5 transition-colors disabled:opacity-30 font-mono">
                  {qty}
                </button>
              ))}
              {'fudge' in die && die.fudge ? (<><span /><span /><span /></>) : (
                <>
                  <button disabled={rolling} onClick={() => handleRoll(die, 1, '!')} className="text-pink-600 hover:text-pink-300 transition-colors disabled:opacity-30 py-1.5">!</button>
                  <button disabled={rolling} onClick={() => handleRoll(die, 1, '!!')} className="text-pink-600 hover:text-pink-300 transition-colors disabled:opacity-30 py-1.5 text-[9px]">!!</button>
                  <button disabled={rolling} onClick={() => handleRoll(die, 1, '!p')} className="text-pink-600 hover:text-pink-300 transition-colors disabled:opacity-30 py-1.5 text-[9px]">!p</button>
                </>
              )}
            </div>
          ))}
        </div>

        {/* ── Advanced Roll ── */}
        <button onClick={() => setAdvancedOpen(o => !o)}
          className="px-3 py-1.5 text-left text-pink-500 hover:text-pink-300 border-t border-obsidian-600 flex items-center gap-1 transition-colors">
          Adv. rolo <span className="text-[9px] ml-0.5">{advancedOpen ? '▲' : '▼'}</span>
        </button>

        {advancedOpen && (
          <div className="px-2 py-2 border-t border-obsidian-700 bg-obsidian-900 flex items-center gap-1.5 flex-wrap">
            <Spinner value={advQty} onChange={setAdvQty} min={1} />
            <select value={advSides} onChange={e => setAdvSides(Number(e.target.value))} className="input-dark py-1 text-xs">
              {[4,6,8,10,12,20,100].map(s => <option key={s} value={s}>D{s}</option>)}
            </select>
            <span className="text-gray-500">+</span>
            <Spinner value={advMod} onChange={setAdvMod} />
            <button onClick={handleAdvancedRoll} disabled={rolling} className="btn-primary text-xs py-1 px-2 disabled:opacity-50">Roll</button>
          </div>
        )}

        {/* ── Roll log ── */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1.5 min-h-0 border-t border-obsidian-600">
          {rollLog.length === 0 && <p className="text-gray-600 text-center py-4">Nenhuma rolagem ainda.</p>}
          {rollLog.map(entry => (
            <div key={entry.id} className="border border-obsidian-600 rounded p-2 bg-obsidian-900">
              <div className="flex items-center justify-between mb-0.5">
                <span className="text-gray-500">{entry.speaker}</span>
                {entry.fromDiscord && <span className="text-indigo-400 bg-indigo-950/40 px-1.5 py-0.5 rounded">Discord</span>}
              </div>
              {entry.label && <p className="text-gray-400 mb-0.5">{entry.label}</p>}
              <div className="flex items-center gap-2">
                <span className="font-mono text-gray-400">{entry.expression}</span>
                <span className="text-gray-600">=</span>
                <span className={`dice-result text-sm ${entry.result.critical === 'success' ? 'critical-success' : entry.result.critical === 'failure' ? 'critical-failure' : ''}`}>
                  {entry.result.total}
                </span>
                {entry.result.critical === 'success' && <span className="text-green-400">✨ Crit!</span>}
                {entry.result.critical === 'failure' && <span className="text-red-400">💀 Fumble</span>}
              </div>
              <p className="text-gray-600 font-mono mt-0.5">{entry.result.formula}</p>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
