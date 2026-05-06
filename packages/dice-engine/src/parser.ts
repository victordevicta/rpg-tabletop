import type { ParsedExpression, ParsedTerm, ParsedDice, ModifierType, FilterType } from './types';

const DICE_RE = /^(\d+)?d(\d+)(kh\d+|kl\d+|dh\d+|dl\d+)?(>=\d+|<=\d+|>\d+|<\d+)?$/i;
const TERM_RE = /([+-]?\s*(?:\d+d\d+(?:kh\d+|kl\d+|dh\d+|dl\d+)?(?:>=\d+|<=\d+|>\d+|<\d+)?|\d+))/gi;

function parseDicePart(raw: string): ParsedDice {
  const m = DICE_RE.exec(raw.trim());
  if (!m) throw new Error(`Invalid dice expression: ${raw}`);

  const count = m[1] ? parseInt(m[1], 10) : 1;
  const sides = parseInt(m[2], 10);

  let modifier: ParsedDice['modifier'];
  if (m[3]) {
    const modType = m[3].slice(0, 2).toLowerCase() as ModifierType;
    const modVal = parseInt(m[3].slice(2), 10);
    modifier = { type: modType, value: modVal };
  }

  let filter: ParsedDice['filter'];
  if (m[4]) {
    const opMatch = m[4].match(/^(>=|<=|>|<)(\d+)$/);
    if (opMatch) {
      filter = { type: opMatch[1] as FilterType, value: parseInt(opMatch[2], 10) };
    }
  }

  return { count, sides, modifier, filter };
}

export function parseExpression(expr: string): ParsedExpression {
  const normalized = expr.replace(/\s+/g, '');

  if (!normalized) throw new Error('Empty expression');

  const terms: ParsedTerm[] = [];
  let remaining = normalized;

  // Ensure leading sign
  if (!/^[+-]/.test(remaining)) remaining = '+' + remaining;

  const tokenRe = /([+-])([^+-]+)/g;
  let match: RegExpExecArray | null;

  while ((match = tokenRe.exec(remaining)) !== null) {
    const sign: 1 | -1 = match[1] === '+' ? 1 : -1;
    const raw = match[2];

    if (/^\d+$/.test(raw)) {
      terms.push({ type: 'constant', sign, constant: parseInt(raw, 10), raw });
    } else if (/d/i.test(raw)) {
      const dice = parseDicePart(raw);
      terms.push({ type: 'dice', sign, dice, raw });
    } else {
      throw new Error(`Unrecognized term: ${raw}`);
    }
  }

  if (terms.length === 0) throw new Error(`Could not parse: ${expr}`);

  return { terms, raw: expr };
}
