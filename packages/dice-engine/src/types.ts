export type ModifierType = 'kh' | 'kl' | 'dh' | 'dl';
export type FilterType = '>=' | '<=' | '>' | '<';

export interface ParsedDice {
  count: number;
  sides: number;
  modifier?: { type: ModifierType; value: number };
  filter?: { type: FilterType; value: number };
}

export interface ParsedTerm {
  type: 'dice' | 'constant';
  sign: 1 | -1;
  dice?: ParsedDice;
  constant?: number;
  raw: string;
}

export interface ParsedExpression {
  terms: ParsedTerm[];
  raw: string;
}
