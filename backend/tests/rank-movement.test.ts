import { describe, expect, it } from 'vitest';
import { rankMovement, type RankState } from '../src/domain/rank-movement.js';

const state = (
  rank: number | null,
  rankStatus: RankState['rankStatus'] = rank === null ? 'incomplete' : 'resolved',
): RankState => ({ rank, rankStatus });

describe('shared rank movement', () => {
  it('reports rises, falls, and unchanged ranks as previous minus current', () => {
    const movements = rankMovement(new Map([
      ['rise', state(3)],
      ['fall', state(4)],
      ['same', state(2)],
    ]), new Map([
      ['rise', state(5)],
      ['fall', state(3)],
      ['same', state(2)],
    ]));
    expect(movements.get('rise')?.movement).toBe(2);
    expect(movements.get('fall')?.movement).toBe(-1);
    expect(movements.get('same')?.movement).toBe(0);
  });

  it('returns unavailable movement for new, missing, unresolved, or incomplete ranks', () => {
    const movements = rankMovement(new Map([
      ['new', state(1)],
      ['current-missing', state(null)],
      ['current-tie', state(null, 'unresolved')],
      ['previous-missing', state(4)],
      ['previous-tie', state(3)],
    ]), new Map([
      ['current-missing', state(2)],
      ['current-tie', state(1)],
      ['previous-tie', state(null, 'unresolved')],
    ]));
    expect(movements.get('new')).toMatchObject({
      previousRank: null, previousRankStatus: 'incomplete', movement: null,
    });
    expect(movements.get('current-missing')?.movement).toBeNull();
    expect(movements.get('current-tie')?.movement).toBeNull();
    expect(movements.get('previous-missing')?.movement).toBeNull();
    expect(movements.get('previous-tie')?.movement).toBeNull();
  });

  it('calculates movement by entity identity, independent of presentation sorting', () => {
    const current = new Map([['b', state(1)], ['a', state(2)]]);
    const previous = new Map([['a', state(1)], ['b', state(2)]]);
    const baseline = rankMovement(current, previous);
    const sortedForDisplay = new Map([...current].sort(([left], [right]) => left.localeCompare(right)));
    const afterSort = rankMovement(sortedForDisplay, previous);
    expect(afterSort).toEqual(baseline);
    expect(afterSort.get('a')?.movement).toBe(-1);
    expect(afterSort.get('b')?.movement).toBe(1);
  });
});
