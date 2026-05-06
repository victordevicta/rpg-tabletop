export interface DiceTerm {
  count: number;
  sides: number;
  modifier?: {
    type: 'kh' | 'kl' | 'dh' | 'dl';
    value: number;
  };
  filter?: {
    type: '>=' | '<=' | '>' | '<';
    value: number;
  };
}

export interface RollTermResult {
  dice?: DiceTerm;
  rolls?: number[];
  kept?: boolean[];
  successes?: number;
  constant?: number;
  sign: 1 | -1;
  subtotal: number;
}

export interface RollResult {
  expression: string;
  formula: string;
  total: number;
  terms: RollTermResult[];
  critical?: 'success' | 'failure';
  timestamp: number;
}
