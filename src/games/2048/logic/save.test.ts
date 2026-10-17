import { mulberry32 } from '@/lib/random';
import { SIZES, fromValues, toValues, type Dir } from './board';
import { newGame, play, type Game } from './game';
import { DEFAULT_SETTINGS, fromSave, fromSettings, fromStats, toSave } from './save';
import { EMPTY_STATS, recordGame } from './stats';

// A started 5×5 game: a few seeded moves.
function started(): Game {
  const random = mulberry32(7);
  const dirs: Dir[] = ['left', 'up', 'right', 'down', 'left', 'up'];
  return dirs.reduce((g, dir) => play(g, dir, random).game, newGame(5, random));
}

const good = () => toSave(started());

describe('toSave / fromSave', () => {
  it('stores the values only, 0 for an empty cell, and the numbers and flags of the game', () => {
    const game = { ...started(), won: true, keptGoing: true, undoUsed: true };
    expect(toSave(game)).toEqual({
      size: 5,
      values: toValues(game.board),
      score: game.score,
      won: true,
      keptGoing: true,
      undoUsed: true,
      moves: game.moves,
    });
    expect(toSave(game).values).toHaveLength(25);
  });

  it('round-trips a game after a few moves, with the ids rebuilt in reading order and no undo step', () => {
    const game = started();
    expect(game.moves).toBeGreaterThan(0);
    const back = fromSave(JSON.parse(JSON.stringify(toSave(game))));
    const tiles = game.board.filter(Boolean).length;

    expect(back).toEqual({ ...game, board: fromValues(toValues(game.board)), prev: null, nextId: tiles + 1 });
    expect(back!.board.flatMap((t) => (t ? [t.id] : []))).toEqual(Array.from({ length: tiles }, (_, i) => i + 1));
  });

  it('round-trips the flags and a bigger score', () => {
    const game = { ...started(), score: 123_456, moves: 400, won: true, keptGoing: true, undoUsed: true };
    expect(fromSave(JSON.parse(JSON.stringify(toSave(game))))).toMatchObject({
      score: 123_456,
      moves: 400,
      won: true,
      keptGoing: true,
      undoUsed: true,
      status: 'playing',
    });
  });

  it('takes a game with moves 0 and any size', () => {
    for (const size of SIZES) {
      const game = newGame(size, mulberry32(size));
      expect(fromSave(JSON.parse(JSON.stringify(toSave(game))))?.size).toBe(size);
    }
  });

  const zeros = (n: number) => Array(n).fill(0);
  const checkerboard = [2, 4, 2, 4, 4, 2, 4, 2, 2, 4, 2, 4, 4, 2, 4, 2];

  it.each([
    ['not an object', 'x'],
    ['null', null],
    ['no size', { ...good(), size: undefined }],
    ['a size below 4', { ...good(), size: 3, values: zeros(9) }],
    ['a size above 7', { ...good(), size: 8, values: [2, ...zeros(63)] }],
    ['a size that is a string', { ...good(), size: '5' }],
    ['values that are not an array', { ...good(), values: 'x' }],
    ['too few values', { ...good(), values: [2, ...zeros(23)] }],
    ['too many values', { ...good(), values: [2, ...zeros(25)] }],
    ['a value that is not a power of two', { ...good(), values: [3, ...zeros(24)] }],
    ['a value of 1', { ...good(), values: [1, ...zeros(24)] }],
    ['a negative value', { ...good(), values: [-2, ...zeros(24)] }],
    ['a fractional value', { ...good(), values: [2.5, ...zeros(24)] }],
    ['a value that is a string', { ...good(), values: ['2', ...zeros(24)] }],
    ['an empty board', { ...good(), values: zeros(25) }],
    ['a board that is already over', { ...good(), size: 4, values: checkerboard }],
    ['a negative score', { ...good(), score: -1 }],
    ['a fractional score', { ...good(), score: 1.5 }],
    ['a score that is a string', { ...good(), score: '5' }],
    ['a negative move count', { ...good(), moves: -1 }],
    ['a move count that is not a number', { ...good(), moves: null }],
    ['won that is not a boolean', { ...good(), won: 1 }],
    ['keptGoing that is not a boolean', { ...good(), won: true, keptGoing: 'yes' }],
    ['undoUsed that is not a boolean', { ...good(), undoUsed: 0 }],
    ['keptGoing without won', { ...good(), won: false, keptGoing: true }],
  ])('rejects %s', (_name, data) => {
    expect(fromSave(data)).toBeNull();
  });
});

describe('fromStats', () => {
  it('keeps valid stats', () => {
    let stats = recordGame(EMPTY_STATS, 4, { score: 3000, bestTile: 256, won: false, undoUsed: false });
    stats = recordGame(stats, 7, { score: 90_000, bestTile: 16_384, won: true, undoUsed: false });

    expect(fromStats(JSON.parse(JSON.stringify(stats)))).toEqual(stats);
  });

  it('drops keys that are not a board size', () => {
    const stats = recordGame(EMPTY_STATS, 5, { score: 100, bestTile: 16, won: false, undoUsed: false });
    const back = fromStats({ ...stats, 8: EMPTY_STATS[4], extra: 'x' });

    expect(back).toEqual(stats);
    expect(Object.keys(back)).toEqual(['4', '5', '6', '7']);
  });

  const withSize = (size: number, value: unknown) => ({ ...EMPTY_STATS, [size]: value });

  it.each([
    ['null', null],
    ['not an object', 'x'],
    ['a missing size', { 4: EMPTY_STATS[4], 5: EMPTY_STATS[5], 6: EMPTY_STATS[6] }],
    ['a size that is null', withSize(5, null)],
    ['a negative count', withSize(4, { ...EMPTY_STATS[4], played: -1 })],
    ['a fractional count', withSize(6, { ...EMPTY_STATS[6], wins: 0.5 })],
    ['a missing best score', withSize(7, { played: 0, wins: 0, bestTile: null })],
    ['a bad best score', withSize(4, { ...EMPTY_STATS[4], bestScore: 'high' })],
    ['a bad best tile', withSize(5, { ...EMPTY_STATS[5], bestTile: -2 })],
  ])('falls back to empty stats for %s', (_name, data) => {
    expect(fromStats(data)).toEqual(EMPTY_STATS);
  });
});

describe('fromSettings', () => {
  it('keeps a valid size', () => {
    for (const size of SIZES) expect(fromSettings({ size })).toEqual({ size });
  });

  it('defaults to 4×4', () => {
    expect(DEFAULT_SETTINGS).toEqual({ size: 4 });
  });

  it.each([
    ['null', null],
    ['not an object', 7],
    ['no size', {}],
    ['a size below 4', { size: 3 }],
    ['a size above 7', { size: 8 }],
    ['a size that is a string', { size: '6' }],
    ['a fractional size', { size: 4.5 }],
  ])('falls back to the default for %s', (_name, data) => {
    expect(fromSettings(data)).toEqual(DEFAULT_SETTINGS);
  });
});
