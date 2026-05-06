import * as THREE from 'three';
import * as CANNON from 'cannon-es';

// ── Types ────────────────────────────────────────────────────────────────────

export interface Skin3DConfig {
  bodyColor:         number;
  metalness:         number;
  roughness:         number;
  emissiveColor:     number;
  emissiveIntensity: number;
  labelColor:        string;
  fogColor:          number;
  rimColor:          number;
}

interface FaceGroup {
  normal: THREE.Vector3;
  value:  number;
}

interface DieObject {
  mesh:       THREE.Mesh;
  label:      THREE.Sprite;
  body:       CANNON.Body;
  faceGroups: FaceGroup[];
  targetValue: number;
  sides:      number;
}

// ── Skin presets (keyed by DiceRoller skinId) ─────────────────────────────

export const SKIN_3D_MAP: Record<string, Skin3DConfig> = {
  classic:   { bodyColor: 0xd0d0d8, metalness: 0.05, roughness: 0.75, emissiveColor: 0x000000, emissiveIntensity: 0,    labelColor: '#ffffff', fogColor: 0x0a0a14, rimColor: 0xff4400 },
  ruby:      { bodyColor: 0x8b1a1a, metalness: 0.25, roughness: 0.40, emissiveColor: 0x550000, emissiveIntensity: 0.45, labelColor: '#ff8888', fogColor: 0x0f0508, rimColor: 0xff2200 },
  sapphire:  { bodyColor: 0x0d3b6e, metalness: 0.20, roughness: 0.35, emissiveColor: 0x001144, emissiveIntensity: 0.50, labelColor: '#66aaff', fogColor: 0x05080f, rimColor: 0x0066ff },
  emerald:   { bodyColor: 0x0d4f2b, metalness: 0.15, roughness: 0.50, emissiveColor: 0x003311, emissiveIntensity: 0.40, labelColor: '#66ff99', fogColor: 0x060e08, rimColor: 0x00ff44 },
  amethyst:  { bodyColor: 0x4a1a6b, metalness: 0.20, roughness: 0.40, emissiveColor: 0x220033, emissiveIntensity: 0.50, labelColor: '#cc88ff', fogColor: 0x09050f, rimColor: 0x9900ff },
  gold:      { bodyColor: 0xb8860b, metalness: 0.80, roughness: 0.25, emissiveColor: 0x332200, emissiveIntensity: 0.30, labelColor: '#ffe066', fogColor: 0x0d0a05, rimColor: 0xffaa00 },
  obsidian:  { bodyColor: 0x0d0d17, metalness: 0.85, roughness: 0.15, emissiveColor: 0x110033, emissiveIntensity: 0.25, labelColor: '#9988ff', fogColor: 0x06060d, rimColor: 0x4400ff },
  ice:       { bodyColor: 0x9bcfed, metalness: 0.10, roughness: 0.20, emissiveColor: 0x224466, emissiveIntensity: 0.35, labelColor: '#ddf4ff', fogColor: 0x08101a, rimColor: 0x88ddff },
  blood:     { bodyColor: 0x4a0d0d, metalness: 0.10, roughness: 0.60, emissiveColor: 0x330000, emissiveIntensity: 0.55, labelColor: '#ff4444', fogColor: 0x0c0404, rimColor: 0xff0000 },
  void:      { bodyColor: 0x080810, metalness: 0.95, roughness: 0.05, emissiveColor: 0x0a0022, emissiveIntensity: 0.60, labelColor: '#7766ff', fogColor: 0x030306, rimColor: 0x3300ff },
  rose:      { bodyColor: 0x8b0f46, metalness: 0.25, roughness: 0.40, emissiveColor: 0x440022, emissiveIntensity: 0.45, labelColor: '#ff88cc', fogColor: 0x0f0508, rimColor: 0xff0088 },
  forest:    { bodyColor: 0x0d3319, metalness: 0.10, roughness: 0.70, emissiveColor: 0x001108, emissiveIntensity: 0.35, labelColor: '#88ff99', fogColor: 0x060c07, rimColor: 0x00cc22 },
  bronze:    { bodyColor: 0x7d4a1e, metalness: 0.70, roughness: 0.35, emissiveColor: 0x221100, emissiveIntensity: 0.25, labelColor: '#ffcc88', fogColor: 0x0c0804, rimColor: 0xff6600 },
  galaxy:    { bodyColor: 0x1a0533, metalness: 0.60, roughness: 0.30, emissiveColor: 0x110033, emissiveIntensity: 0.70, labelColor: '#bb88ff', fogColor: 0x060310, rimColor: 0x6600ff },
  custom:    { bodyColor: 0xffffff, metalness: 0.20, roughness: 0.50, emissiveColor: 0x111111, emissiveIntensity: 0.30, labelColor: '#ffffff', fogColor: 0x0a0a14, rimColor: 0xff4400 },
};

export function skinFromHex(hex: string): Skin3DConfig {
  const n = parseInt(hex.replace('#', ''), 16);
  return { ...SKIN_3D_MAP.custom, bodyColor: n, emissiveColor: n >> 1 & 0x7f7f7f, labelColor: hex };
}

// ── Geometry helpers ─────────────────────────────────────────────────────────

function buildFaceGroups(geo: THREE.BufferGeometry, sides: number): FaceGroup[] {
  const pos = geo.attributes.position;
  const unique: THREE.Vector3[] = [];

  for (let i = 0; i < pos.count; i += 3) {
    const a = new THREE.Vector3().fromBufferAttribute(pos, i);
    const b = new THREE.Vector3().fromBufferAttribute(pos, i + 1);
    const c = new THREE.Vector3().fromBufferAttribute(pos, i + 2);
    const n = new THREE.Vector3()
      .crossVectors(new THREE.Vector3().subVectors(b, a), new THREE.Vector3().subVectors(c, a))
      .normalize();
    if (n.lengthSq() < 0.5) continue;
    if (!unique.some(u => u.dot(n) > 0.98)) unique.push(n);
  }

  unique.sort((a, b) => {
    if (Math.abs(b.y - a.y) > 0.02) return b.y - a.y;
    return Math.atan2(a.z, a.x) - Math.atan2(b.z, b.x);
  });

  return unique.slice(0, sides).map((normal, i) => ({ normal, value: i + 1 }));
}

/** Pentagonal bipyramid — 10 triangular faces, looks like a d10 */
function createD10Geometry(): THREE.BufferGeometry {
  const n = 5;
  const r = 0.9;
  const h = 0.75;
  const vs: [number, number, number][] = [
    [0, h, 0],
    ...Array.from({ length: n }, (_, i) => {
      const a = (i / n) * Math.PI * 2;
      return [Math.cos(a) * r, 0, Math.sin(a) * r] as [number, number, number];
    }),
    [0, -h, 0],
  ];

  const positions: number[] = [];
  const tri = (a: number, b: number, c: number) => positions.push(...vs[a], ...vs[b], ...vs[c]);

  for (let i = 0; i < n; i++) {
    tri(0, 1 + i, 1 + (i + 1) % n);
    tri(n + 1, 1 + (i + 1) % n, 1 + i);
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.computeVertexNormals();
  return geo;
}

function createDieGeometry(sides: number): THREE.BufferGeometry {
  switch (sides) {
    case 4:   return new THREE.TetrahedronGeometry(0.82, 0);
    case 6:   return new THREE.BoxGeometry(0.88, 0.88, 0.88);
    case 8:   return new THREE.OctahedronGeometry(0.88, 0);
    case 10:
    case 100: return createD10Geometry();
    case 12:  return new THREE.DodecahedronGeometry(0.88, 0);
    case 20:  return new THREE.IcosahedronGeometry(0.88, 0);
    default:  return new THREE.IcosahedronGeometry(0.88, 0);
  }
}

// ── Label sprite ─────────────────────────────────────────────────────────────

function createValueSprite(value: number, labelColor: string): THREE.Sprite {
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = size; canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  const grad = ctx.createRadialGradient(size / 2, size / 2, 4, size / 2, size / 2, size / 2 - 2);
  grad.addColorStop(0, labelColor + 'bb');
  grad.addColorStop(1, labelColor + '00');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);

  const fontSize = value >= 100 ? 42 : value >= 10 ? 56 : 72;
  ctx.shadowColor = labelColor;
  ctx.shadowBlur = 18;
  ctx.fillStyle = '#ffffff';
  ctx.font = `bold ${fontSize}px Georgia, serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(value.toString(), size / 2, size / 2);

  const tex = new THREE.CanvasTexture(canvas);
  const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false });
  const sprite = new THREE.Sprite(mat);
  sprite.scale.set(1.4, 1.4, 1);
  sprite.visible = false;
  return sprite;
}

// ── Renderer ─────────────────────────────────────────────────────────────────

export class Dice3DRenderer {
  private scene:    THREE.Scene;
  private camera:   THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private world:    CANNON.World;
  private dice:     DieObject[] = [];
  private rafId:    number | null = null;
  private skin:     Skin3DConfig;
  private running   = true;

  constructor(canvas: HTMLCanvasElement, skin: Skin3DConfig) {
    this.skin = skin;
    this.scene    = this.makeScene(skin);
    this.camera   = this.makeCamera(canvas);
    this.renderer = this.makeRenderer(canvas);
    this.world    = this.makeWorld();
    this.loop();
  }

  // ── Three.js setup ─────────────────────────────────────────────────────────

  private makeScene(skin: Skin3DConfig): THREE.Scene {
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(skin.fogColor);
    scene.fog = new THREE.FogExp2(skin.fogColor, 0.06);

    // Dim ambient
    scene.add(new THREE.AmbientLight(0x1a1a2e, 0.6));

    // Moonlight (directional)
    const moon = new THREE.DirectionalLight(0x8899cc, 2.0);
    moon.position.set(4, 12, 6);
    moon.castShadow = true;
    moon.shadow.mapSize.setScalar(1024);
    moon.shadow.camera.left   = -12;
    moon.shadow.camera.right  =  12;
    moon.shadow.camera.top    =  12;
    moon.shadow.camera.bottom = -12;
    moon.shadow.camera.far    =  40;
    scene.add(moon);

    // Rim / ember
    const rim = new THREE.PointLight(skin.rimColor, 3, 18);
    rim.position.set(-7, 4, -5);
    scene.add(rim);

    // Table — dark stone
    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(30, 30),
      new THREE.MeshStandardMaterial({ color: 0x0c0c14, roughness: 0.98, metalness: 0.0 }),
    );
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);

    return scene;
  }

  private makeCamera(canvas: HTMLCanvasElement): THREE.PerspectiveCamera {
    const cam = new THREE.PerspectiveCamera(45, canvas.clientWidth / canvas.clientHeight, 0.1, 100);
    cam.position.set(0, 14, 9);
    cam.lookAt(0, 0, 0);
    return cam;
  }

  private makeRenderer(canvas: HTMLCanvasElement): THREE.WebGLRenderer {
    const r = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
    r.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    r.setSize(canvas.clientWidth, canvas.clientHeight, false);
    r.shadowMap.enabled = true;
    r.shadowMap.type    = THREE.PCFSoftShadowMap;
    r.toneMapping       = THREE.ACESFilmicToneMapping;
    r.toneMappingExposure = 1.1;
    return r;
  }

  // ── Cannon-es setup ────────────────────────────────────────────────────────

  private makeWorld(): CANNON.World {
    const world = new CANNON.World({ gravity: new CANNON.Vec3(0, -40, 0) });
    (world.broadphase as any) = new CANNON.SAPBroadphase(world);
    world.allowSleep = true;

    // Floor
    const floor = new CANNON.Body({ mass: 0 });
    floor.addShape(new CANNON.Plane());
    floor.quaternion.setFromAxisAngle(new CANNON.Vec3(1, 0, 0), -Math.PI / 2);
    world.addBody(floor);

    // Walls (invisible box boundaries)
    const wall = (nx: number, nz: number, px: number, pz: number) => {
      const b = new CANNON.Body({ mass: 0 });
      b.addShape(new CANNON.Plane());
      const angle = Math.atan2(nx, nz);
      b.quaternion.setFromAxisAngle(new CANNON.Vec3(0, 1, 0), angle);
      b.position.set(px, 5, pz);
      world.addBody(b);
    };
    wall( 0,  1,  0, -9);
    wall( 0, -1,  0,  9);
    wall( 1,  0, -9,  0);
    wall(-1,  0,  9,  0);

    return world;
  }

  // ── Render loop ────────────────────────────────────────────────────────────

  private loop() {
    if (!this.running) return;
    this.rafId = requestAnimationFrame(() => this.loop());
    this.world.step(1 / 60);
    for (const d of this.dice) {
      d.mesh.position.copy(d.body.position as unknown as THREE.Vector3);
      d.mesh.quaternion.copy(d.body.quaternion as unknown as THREE.Quaternion);
      // Label floats above die
      d.label.position.set(d.mesh.position.x, d.mesh.position.y + 1.6, d.mesh.position.z);
    }
    this.renderer.render(this.scene, this.camera);
  }

  // ── Die creation ───────────────────────────────────────────────────────────

  private spawnDie(sides: number, targetValue: number, xOffset: number): DieObject {
    const geo      = createDieGeometry(sides);
    const faceGroups = buildFaceGroups(geo, sides);

    const mat = new THREE.MeshStandardMaterial({
      color:             this.skin.bodyColor,
      metalness:         this.skin.metalness,
      roughness:         this.skin.roughness,
      emissive:          new THREE.Color(this.skin.emissiveColor),
      emissiveIntensity: this.skin.emissiveIntensity,
    });

    const mesh = new THREE.Mesh(geo, mat);
    mesh.castShadow    = true;
    mesh.receiveShadow = true;
    this.scene.add(mesh);

    const label = createValueSprite(targetValue, this.skin.labelColor);
    this.scene.add(label);

    // Physics body
    const body = new CANNON.Body({
      mass: 1,
      linearDamping: 0.25,
      angularDamping: 0.30,
      sleepTimeLimit: 0.4,
      sleepSpeedLimit: 0.6,
    });

    if (sides === 6) {
      body.addShape(new CANNON.Box(new CANNON.Vec3(0.44, 0.44, 0.44)));
    } else {
      body.addShape(new CANNON.Sphere(0.56));
    }

    // Launch from above with random spin
    const rx = xOffset + (Math.random() - 0.5) * 1.2;
    const rz = (Math.random() - 0.5) * 3;
    body.position.set(rx, 9 + Math.random() * 2, rz);

    body.velocity.set(
      (Math.random() - 0.5) * 6,
      -(8 + Math.random() * 4),
      (Math.random() - 0.5) * 6,
    );
    body.angularVelocity.set(
      (Math.random() - 0.5) * 20,
      (Math.random() - 0.5) * 20,
      (Math.random() - 0.5) * 20,
    );

    this.world.addBody(body);

    const die: DieObject = { mesh, label, body, faceGroups, targetValue, sides };
    this.dice.push(die);
    return die;
  }

  // ── Snap to correct face ───────────────────────────────────────────────────

  private getTargetQuat(faceGroups: FaceGroup[], value: number): THREE.Quaternion {
    const face = faceGroups.find(f => f.value === value) ?? faceGroups[0];
    const up   = new THREE.Vector3(0, 1, 0);
    return new THREE.Quaternion().setFromUnitVectors(face.normal, up);
  }

  private async snapDice(): Promise<void> {
    const SNAP_MS = 500;
    const start   = performance.now();

    // Freeze all bodies and record from/to quats
    const transitions = this.dice.map(d => {
      d.body.velocity.setZero();
      d.body.angularVelocity.setZero();
      d.body.type = CANNON.Body.STATIC;

      // Gently lower to floor if needed
      d.body.position.y = Math.max(d.body.position.y, 0.56);

      return {
        die:   d,
        from:  d.mesh.quaternion.clone(),
        to:    this.getTargetQuat(d.faceGroups, d.targetValue),
        pos:   new THREE.Vector3(d.body.position.x, 0.56, d.body.position.z),
      };
    });

    await new Promise<void>(resolve => {
      const tick = () => {
        const t  = Math.min((performance.now() - start) / SNAP_MS, 1);
        const et = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t; // ease in-out

        for (const { die, from, to, pos } of transitions) {
          die.mesh.quaternion.slerpQuaternions(from, to, et);
          die.mesh.position.lerp(pos, et);
        }
        this.renderer.render(this.scene, this.camera);

        if (t < 1) requestAnimationFrame(tick);
        else resolve();
      };
      requestAnimationFrame(tick);
    });

    // Show labels
    for (const d of this.dice) d.label.visible = true;
  }

  // ── Public API ─────────────────────────────────────────────────────────────

  /**
   * Roll dice. `notation` is an array of {sides, value} pairs.
   * Returns after physics + snap animation complete.
   * Caller should call clearDice() after linger time.
   */
  async roll(notation: { sides: number; value: number }[]): Promise<void> {
    this.clearDice();

    const spread = (notation.length - 1) * 1.6;
    notation.forEach(({ sides, value }, i) => {
      const xOffset = -spread / 2 + i * 1.6;
      this.spawnDie(sides, value, xOffset);
    });

    // Physics settling phase
    await new Promise<void>(resolve => setTimeout(resolve, 2200));

    // Snap to correct face + show labels
    await this.snapDice();
  }

  clearDice(): void {
    for (const d of this.dice) {
      this.scene.remove(d.mesh);
      this.scene.remove(d.label);
      this.world.removeBody(d.body);
      (d.mesh.material as THREE.Material).dispose();
      d.mesh.geometry.dispose();
      (d.label.material as THREE.SpriteMaterial).map?.dispose();
      (d.label.material as THREE.SpriteMaterial).dispose();
    }
    this.dice = [];
  }

  resize(w: number, h: number): void {
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h, false);
  }

  dispose(): void {
    this.running = false;
    if (this.rafId !== null) cancelAnimationFrame(this.rafId);
    this.clearDice();
    this.renderer.dispose();
  }
}
