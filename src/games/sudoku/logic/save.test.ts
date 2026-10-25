import { parseGrid } from './board';
import { setValue, toggleNote, type Game } from './game';
import { bucketOf, DEFAULT_LEVEL, fromSave, fromSettings, fromStats, hasProgress, SAVE_VERSION, toSave } from './save';

const SOLUTION = parseGrid('534678912672195348198342567859761423426853791713924856961537284287419635345286179');
const PUZZLE = parseGrid('.3467891267219534819834256785976142342685379171392485696153728428741963534528617.');
const fresh: Game = { puzzle: PUZZLE, solution: SOLUTION, values: PUZZLE, notes: Array(81).fill(0) };

describe('hasProgress', () => {
  it('is false for a fresh game', () => {
    expect(hasProgress(fresh)).toBe(false);
  });

  it('is true after a digit', () => {
    expect(hasProgress(setValue(fresh, 0, 5))).toBe(true);
  });

  it('is true after a note', () => {
    expect(hasProgress(toggleNote(fresh, 0, 5))).toBe(true);
  });

  it('is false again after the digit is erased', () => {
    expect(hasProgress(setValue(setValue(fresh, 0, 5), 0, 0))).toBe(false);
  });
});

describe('toSave / fromSave', () => {
  it('is version 2', () => {
    expect(SAVE_VERSION).toBe(2);
  });

  it('round-trips a game, its time, hint flag and level, through JSON', () => {
    const game = toggleNote(setValue(fresh, 0, 5), 80, 9);
    const back = fromSave(JSON.parse(JSON.stringify(toSave(game, 4200, true, 4))));
    expect(back).toEqual({ game, elapsedMs: 4200, hinted: true, level: 4 });
  });

  it('has the documented fields', () => {
    expect(Object.keys(toSave(fresh, 0, false, 3)).sort()).toEqual([
      'elapsedMs',
      'hinted',
      'level',
      'notes',
      'puzzle',
      'solution',
      'values',
    ]);
  });

  it.each([
    ['null', null],
    ['a string', 'x'],
    ['a short grid', { ...toSave(fresh, 0, false, 3), values: [1, 2, 3] }],
    ['a missing field', { ...toSave(fresh, 0, false, 3), notes: undefined }],
    ['a bad time', { ...toSave(fresh, 0, false, 3), elapsedMs: 'soon' }],
    ['a digit above 9', { ...toSave(fresh, 0, false, 3), values: [...fresh.values.slice(0, 80), 10] }],
    ['an unknown level', { ...toSave(fresh, 0, false, 3), level: 6 }],
    ['no level (a version 1 save)', { ...toSave(fresh, 0, false, 3), level: undefined }],
    ['the old classic level', { ...toSave(fresh, 0, false, 3), level: 'classic' }],
  ])('rejects %s', (_name, data) => {
    expect(fromSave(data)).toBeNull();
  });
});

describe('fromStats', () => {
  const GOOD = { solved: 5, timedCount: 4, totalMs: 968_000, bestMs: 190_000 };
  const HINTED_ONLY = { solved: 2, timedCount: 0, totalMs: 0, bestMs: null };

  it('keeps valid entries, also with no best time', () => {
    const stats = { 2: GOOD, 3: HINTED_ONLY };
    expect(fromStats(JSON.parse(JSON.stringify(stats)))).toEqual(stats);
  });

  it('takes fractional times: the clock does not count whole milliseconds', () => {
    const stats = { 3: { solved: 1, timedCount: 1, totalMs: 1234.5, bestMs: 1234.5 } };
    expect(fromStats(stats)).toEqual(stats);
  });

  it.each([
    ['a missing field', { solved: 5 }],
    ['a negative count', { ...GOOD, solved: -1 }],
    ['a count that is a string', { ...GOOD, timedCount: '4' }],
    ['a fractional count', { ...GOOD, solved: 1.5 }],
    ['a total that is not a time', { ...GOOD, totalMs: NaN }],
    ['a best time that is not a time', { ...GOOD, bestMs: 'fast' }],
    ['a best time that is missing', { solved: 5, timedCount: 4, totalMs: 968_000 }],
    ['null', null],
  ])('drops an entry with %s and keeps the others', (_name, bad) => {
    expect(fromStats({ 2: bad, 3: GOOD })).toEqual({ 3: GOOD });
  });

  it('drops a bucket that is not a level', () => {
    expect(fromStats({ 3: GOOD, classic: GOOD, 6: GOOD, 0: GOOD })).toEqual({ 3: GOOD });
  });

  it.each([
    ['null', null],
    ['a string', 'x'],
    ['an array', [GOOD]],
    ['undefined', undefined],
  ])('falls back to empty for %s', (_name, data) => {
    expect(fromStats(data)).toEqual({});
  });
});

describe('levels', () => {
  it('uses the level as the stats bucket', () => {
    expect(bucketOf(3)).toBe('3');
  });

  it('starts at Medium, and reads the last level from the settings', () => {
    expect(DEFAULT_LEVEL).toBe(3);
    expect(fromSettings(null)).toBe(3);
    expect(fromSettings({ level: 5 })).toBe(5);
    expect(fromSettings({ level: 9 })).toBe(3);
    expect(fromSettings('x')).toBe(3);
  });
});
