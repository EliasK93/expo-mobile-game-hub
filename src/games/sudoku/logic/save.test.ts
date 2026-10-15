import { parseGrid } from './board';
import { setValue, toggleNote, type Game } from './game';
import { fromSave, hasProgress, toSave } from './save';

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
  it('round-trips a game and its time, through JSON', () => {
    const game = toggleNote(setValue(fresh, 0, 5), 80, 9);
    const back = fromSave(JSON.parse(JSON.stringify(toSave(game, 4200))));
    expect(back).toEqual({ game, elapsedMs: 4200, hinted: false });
  });

  it('has the documented fields', () => {
    expect(Object.keys(toSave(fresh, 0)).sort()).toEqual(
      ['elapsedMs', 'hinted', 'notes', 'puzzle', 'solution', 'values'],
    );
  });

  it.each([
    ['null', null],
    ['a string', 'x'],
    ['a short grid', { ...toSave(fresh, 0), values: [1, 2, 3] }],
    ['a missing field', { ...toSave(fresh, 0), notes: undefined }],
    ['a bad time', { ...toSave(fresh, 0), elapsedMs: 'soon' }],
    ['a digit above 9', { ...toSave(fresh, 0), values: [...fresh.values.slice(0, 80), 10] }],
  ])('rejects %s', (_name, data) => {
    expect(fromSave(data)).toBeNull();
  });
});
