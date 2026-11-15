import { describe, expect, it } from 'vitest';
import { rankingPeriods } from '../src/domain/periods.js';

describe('ranking period selection', () => {
  it('uses the selected season and four preceding seasons, plus the prior five-season window', () => {
    const available = [
      '2018-19', '2019-20', '2020-21', '2021-22', '2022-23', '2023-24',
    ];
    expect(rankingPeriods('2023-24', available)).toEqual({
      current: available.slice(1).map((seasonId) => ({ seasonId, available: true })),
      previous: available.slice(0, 5).map((seasonId) => ({ seasonId, available: true })),
    });
  });

  it('reports absent input seasons without substituting values', () => {
    const periods = rankingPeriods('2026-27', ['2026-27', '2025-26', '2024-25']);
    expect(periods.current).toEqual([
      { seasonId: '2022-23', available: false },
      { seasonId: '2023-24', available: false },
      { seasonId: '2024-25', available: true },
      { seasonId: '2025-26', available: true },
      { seasonId: '2026-27', available: true },
    ]);
    expect(periods.previous[0]).toEqual({ seasonId: '2021-22', available: false });
  });

  it('handles a century boundary and rejects invalid season IDs', () => {
    expect(rankingPeriods('2099-00', []).current.at(-1)).toEqual({
      seasonId: '2099-00', available: false,
    });
    expect(() => rankingPeriods('2023-25', [])).toThrow(TypeError);
    expect(() => rankingPeriods('0003-04', [])).toThrow(RangeError);
    expect(() => rankingPeriods('2023-24', ['invalid'])).toThrow(TypeError);
  });
});
