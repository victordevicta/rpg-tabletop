declare module '@3d-dice/dice-box' {
  interface DiceResult {
    value: number;
    sides: number;
    groupId: number;
    rollId: number;
  }

  interface DiceBoxOptions {
    assetPath?: string;
    theme?: string;
    offscreen?: boolean;
    gravity?: number;
    mass?: number;
    friction?: number;
    restitution?: number;
    angularDamping?: number;
    linearDamping?: number;
    spinForce?: number;
    throwForce?: number;
    startingHeight?: number;
    settleTimeout?: number;
    lightIntensity?: number;
    themeColor?: string;
    [key: string]: unknown;
  }

  export default class DiceBox {
    constructor(selector: string, options?: DiceBoxOptions);
    init(): Promise<void>;
    roll(notation: string): Promise<DiceResult[]>;
    clear(): void;
    hide(): void;
    show(): void;
  }
}
