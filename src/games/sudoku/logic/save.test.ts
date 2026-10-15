import { parseGrid } from './board';
import { setValue, toggleNote, type Game } from './game';
import {
  bucketOf,
  DEFAULT_LEVEL,
  fromSave,
  fromSettings,
  hasProgress,
  levelName,
  SAVE_VERSION,
  toSave,
} from './save';

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
    expect(Object.keys(toSave(fresh, 0, false, 3)).sort()).toEqual(
      ['elapsedMs', 'hinted', 'level', 'notes', 'puzzle', 'solution', 'values'],
    );
  });

  it('loads a version 1 save, which has no level, as classic', () => {
    const { level: _level, ...v1 } = toSave(fresh, 1500, false, 3);
    expect(fromSave(v1)).toEqual({ game: fresh, elapsedMs: 1500, hinted: false, level: 'classic' });
  });

  it.each([
    ['null', null],
    ['a string', 'x'],
    ['a short grid', { ...toSave(fresh, 0, false, 3), values: [1, 2, 3] }],
    ['a missing field', { ...toSave(fresh, 0, false, 3), notes: undefined }],
    ['a bad time', { ...toSave(fresh, 0, false, 3), elapsedMs: 'soon' }],
    ['a digit above 9', { ...toSave(fresh, 0, false, 3), values: [...fresh.values.slice(0, 80), 10] }],
    ['an unknown level', { ...toSave(fresh, 0, false, 3), level: 6 }],
  ])('rejects %s', (_name, data) => {
    expect(fromSave(data)).toBeNull();
  });
});

describe('levels', () => {
  it('uses the level as the stats bucket, and classic for old games', () => {
    expect(bucketOf(3)).toBe('3');
    expect(bucketOf('classic')).toBe('classic');
  });

  it('names a level from LEVEL_NAMES, and classic as Classic', () => {
    expect(levelName(1)).toBe('Very easy');
    expect(levelName(5)).toBe('Expert');
    expect(levelName('classic')).toBe('Classic');
  });

  it('starts at Medium, and reads the last level from the settings', () => {
    expect(DEFAULT_LEVEL).toBe(3);
    expect(fromSettings(null)).toBe(3);
    expect(fromSettings({ level: 5 })).toBe(5);
    expect(fromSettings({ level: 9 })).toBe(3);
    expect(fromSettings('x')).toBe(3);
  });
});
