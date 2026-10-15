import { parseGrid } from './board';
import { emptyCache, fromCache, PER_LEVEL } from './cache';
import { LEVELS } from './techniques';

const SOLUTION = parseGrid('534678912672195348198342567859761423426853791713924856961537284287419635345286179');
const PUZZLE = parseGrid('.3467891267219534819834256785976142342685379171392485696153728428741963534528617.');
const entry = { puzzle: PUZZLE, solution: SOLUTION };

describe('puzzle cache format', () => {
  it('keeps up to 3 puzzles per level', () => {
    expect(PER_LEVEL).toBe(3);
  });

  it('starts with an empty list for every level', () => {
    const c = emptyCache();
    expect(LEVELS.map((l) => c[l])).toEqual([[], [], [], [], []]);
  });

  it('round-trips through JSON', () => {
    const c = emptyCache();
    c[2].push(entry);
    c[5].push(entry, entry);
    expect(fromCache(JSON.parse(JSON.stringify(c)))).toEqual(c);
  });

  it('keeps the good entries, drops broken ones and anything beyond the limit', () => {
    const data = { 1: [entry, { puzzle: [1, 2, 3], solution: SOLUTION }, entry, entry, entry], 9: [entry] };
    const c = fromCache(data);
    expect(c[1]).toHaveLength(PER_LEVEL);
    expect(c[2]).toEqual([]);
  });

  it.each([null, 'x', 5, [entry]])('treats %p as an empty cache', (data) => {
    expect(fromCache(data)).toEqual(emptyCache());
  });
});
