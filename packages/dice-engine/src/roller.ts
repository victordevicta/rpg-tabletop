import type { ParsedExpression, ParsedDice } from './types';
import type { RollResult, RollTermResult } from '@eldertable/shared';
import { parseExpression } from './parser';

function rollDie(sides: number): number {
  return Math.floor(Math.random() * sides) + 1;
}

function rollDice(dice: ParsedDice, sign: 1 | -1): RollTermResult {
  const { count, sides, modifier, filter } = dice;
  const rolls: number[] = Array.from({ length: count }, () => rollDie(sides));
  const kept: boolean[] = new Array(count).fill(true);

  if (modifier) {
    const { type, value } = modifier;
    const indexed = rolls.map((r, i) => ({ r, i }));

    if (type === 'kh') {
      indexed.sort((a, b) => b.r - a.r);
      indexed.slice(value).forEach(({ i }) => (kept[i] = false));
    } else if (type === 'kl') {
      indexed.sort((a, b) => a.r - b.r);
      indexed.slice(value).forEach(({ i }) => (kept[i] = false));
    } else if (type === 'dh') {
      indexed.sort((a, b) => b.r - a.r);
      indexed.slice(0, value).forEach(({ i }) => (kept[i] = false));
    } else if (type === 'dl') {
      indexed.sort((a, b) => a.r - b.r);
      indexed.slice(0, value).forEach(({ i }) => (kept[i] = false));
    }
  }

  if (filter) {
    const { type, value } = filter;
    let successes = 0;
    rolls.forEach((r, i) => {
      if (!kept[i]) return;
      const hit =
        type === '>=' ? r >= value :
        type === '<=' ? r <= value :
        type === '>' ? r > value :
        r < value;
      if (hit) successes++;
    });
    return { dice, rolls, kept, successes, sign, subtotal: sign * successes };
  }

  const keptSum = rolls.reduce((sum, r, i) => sum + (kept[i] ? r : 0), 0);
  return { dice, rolls, kept, sign, subtotal: sign * keptSum };
}

function buildFormula(result: RollResult): string {
  return result.terms.map((t, idx) => {
    const prefix = idx === 0 ? (t.sign === -1 ? '-' : '') : (t.sign === -1 ? ' - ' : ' + ');
    if (t.constant !== undefined) return `${prefix}${t.constant}`;
    const kept = t.rolls!.filter((_, i) => t.kept![i]);
    return `${prefix}[${t.rolls!.map((r, i) => (t.kept![i] ? r : `~~${r}~~`)).join(', ')}]`;
  }).join('');
}

function rollDiceWithValues(dice: ParsedDice, sign: 1 | -1, values: number[]): RollTermResult {
  const { modifier, filter } = dice;
  const count = dice.count;
  const rolls = values.slice(0, count);
  const kept: boolean[] = new Array(count).fill(true);

  if (modifier) {
    const { type, value } = modifier;
    const indexed = rolls.map((r, i) => ({ r, i }));
    if (type === 'kh') {
      indexed.sort((a, b) => b.r - a.r);
      indexed.slice(value).forEach(({ i }) => (kept[i] = false));
    } else if (type === 'kl') {
      indexed.sort((a, b) => a.r - b.r);
      indexed.slice(value).forEach(({ i }) => (kept[i] = false));
    } else if (type === 'dh') {
      indexed.sort((a, b) => b.r - a.r);
      indexed.slice(0, value).forEach(({ i }) => (kept[i] = false));
    } else if (type === 'dl') {
      indexed.sort((a, b) => a.r - b.r);
      indexed.slice(0, value).forEach(({ i }) => (kept[i] = false));
    }
  }

  if (filter) {
    const { type, value } = filter;
    let successes = 0;
    rolls.forEach((r, i) => {
      if (!kept[i]) return;
      const hit =
        type === '>=' ? r >= value :
        type === '<=' ? r <= value :
        type === '>'  ? r > value :
        r < value;
      if (hit) successes++;
    });
    return { dice, rolls, kept, successes, sign, subtotal: sign * successes };
  }

  const keptSum = rolls.reduce((sum, r, i) => sum + (kept[i] ? r : 0), 0);
  return { dice, rolls, kept, sign, subtotal: sign * keptSum };
}

/**
 * Like roll(), but uses externally provided die values (e.g., from a 3D dice
 * animation) instead of Math.random(). Modifiers (dl, kh, filters, constants)
 * are still applied by the engine so the log always matches what was animated.
 */
export function rollWithPrerolled(expression: string, prerolled: number[]): RollResult {
  const parsed = parseExpression(expression);
  const terms: RollTermResult[] = [];
  let idx = 0;

  for (const term of parsed.terms) {
    if (term.type === 'constant') {
      terms.push({ constant: term.constant, sign: term.sign, subtotal: term.sign * term.constant! });
    } else {
      const count = term.dice!.count;
      const values = prerolled.slice(idx, idx + count);
      idx += count;
      // If dice-box returned fewer values than expected, fall back to random
      while (values.length < count) values.push(rollDie(term.dice!.sides));
      terms.push(rollDiceWithValues(term.dice!, term.sign, values));
    }
  }

  const total = terms.reduce((sum, t) => sum + t.subtotal, 0);
  const result: RollResult = { expression, formula: '', total, terms, timestamp: Date.now() };
  result.formula = buildFormula(result);

  if (
    terms.length === 1 &&
    terms[0].dice?.sides === 20 &&
    terms[0].dice.count === 1 &&
    !terms[0].dice.modifier &&
    !terms[0].dice.filter
  ) {
    const val = terms[0].rolls![0];
    if (val === 20) result.critical = 'success';
    else if (val === 1) result.critical = 'failure';
  }

  return result;
}

export function roll(expression: string): RollResult {
  const parsed = parseExpression(expression);
  const terms: RollTermResult[] = [];

  for (const term of parsed.terms) {
    if (term.type === 'constant') {
      terms.push({ constant: term.constant, sign: term.sign, subtotal: term.sign * term.constant! });
    } else {
      terms.push(rollDice(term.dice!, term.sign));
    }
  }

  const total = terms.reduce((sum, t) => sum + t.subtotal, 0);
  const result: RollResult = { expression, formula: '', total, terms, timestamp: Date.now() };
  result.formula = buildFormula(result);

  // Detect critical for single d20 rolls
  if (
    terms.length === 1 &&
    terms[0].dice?.sides === 20 &&
    terms[0].dice.count === 1 &&
    !terms[0].dice.modifier &&
    !terms[0].dice.filter
  ) {
    const val = terms[0].rolls![0];
    if (val === 20) result.critical = 'success';
    else if (val === 1) result.critical = 'failure';
  }

  return result;
}
