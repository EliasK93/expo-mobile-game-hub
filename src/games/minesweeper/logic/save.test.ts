import { mulberry32 } from '@/lib/random';
import { LEVELS, LEVEL_IDS, cellCount, type Level } from './board';
import { newGame, open, toggleFlag, type Game } from './game';
import { DEFAULT_SETTINGS, fromSave, fromSettings, fromStats, toSave, type SaveData } from './save';
import { EMPTY_STATS, recordGame } from './stats';

const flags = (level: Level, ...indices: number[]) => Array.from({ length: cellCount(level) }, (_, i) => indices.includes(i));

// A started game, still playing: the middle cell tapped, a flag on the first and on the last covered cell.
function started(level: Level = 'beginner'): Game {
  const tapped = open(newGame(level), Math.floor(cellCount(level) / 2), mulberry32(7));
  expect(tapped.status).toBe('playing');
  const covered = tapped.opened.flatMap((o, i) => (o ? [] : [i]));
  return toggleFlag(toggleFlag(tapped, covered[0]), covered[covered.length - 1]);
}

const roundTrip = (game: Game, elapsedMs: number) => fromSave(JSON.parse(JSON.stringify(toSave(game, elapsedMs))));

const good = () => toSave(started(), 5000);
const safeCells = (data: SaveData) => Array.from({ length: cellCount('beginner') }, (_, i) => i).filter((i) => !data.mines.includes(i));

describe('toSave / fromSave', () => {
  it('stores the cells as ascending lists of indices, and the elapsed time', () => {
    const game: Game = {
      ...newGame('beginner'),
      mines: flags('beginner', 0, 1, 2, 3, 4, 5, 6, 7, 8, 9),
      opened: flags('beginner', 21, 20),
      flagged: flags('beginner', 0),
    };
    expect(toSave(game, 900)).toEqual({
      level: 'beginner',
      mines: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
      opened: [20, 21],
      flagged: [0],
      elapsedMs: 900,
    });
  });

  it('an unmined board stores an empty mines list', () => {
    expect(toSave(toggleFlag(newGame('expert'), 5), 0)).toEqual({ level: 'expert', mines: [], opened: [], flagged: [5], elapsedMs: 0 });
  });

  it('round-trips a started game with flags and the elapsed time', () => {
    const game = started();
    expect(game.mines).not.toBeNull();
    expect(roundTrip(game, 12_345)).toEqual({ game, elapsedMs: 12_345 });
  });

  it('round-trips a started game on every level', () => {
    for (const level of LEVEL_IDS) {
      const game = started(level);
      expect(roundTrip(game, 77)).toEqual({ game, elapsedMs: 77 });
      expect(game.mines!.filter(Boolean)).toHaveLength(LEVELS[level].mines);
    }
  });

  it('round-trips an unmined board, flags included: it stays unmined', () => {
    const game = toggleFlag(toggleFlag(newGame('intermediate'), 3), 100);
    const back = roundTrip(game, 0);
    expect(back).toEqual({ game, elapsedMs: 0 });
    expect(back!.game.mines).toBeNull();
  });

  it('round-trips a new game on every level', () => {
    for (const level of LEVEL_IDS) expect(roundTrip(newGame(level), 0)).toEqual({ game: newGame(level), elapsedMs: 0 });
  });

  it('takes a board with a single safe cell left, but not one with none', () => {
    const data = good();
    const safe = safeCells(data);
    expect(fromSave({ ...data, opened: safe.slice(1), flagged: [] })).not.toBeNull();
    expect(fromSave({ ...data, opened: safe, flagged: [] })).toBeNull();
  });

  it('takes a fractional elapsed time: the clock does not count whole milliseconds', () => {
    expect(fromSave({ ...good(), elapsedMs: 1234.5 })?.elapsedMs).toBe(1234.5);
  });

  const badLists = (['mines', 'opened', 'flagged'] as const).flatMap((key): [string, unknown][] => {
    const list = good()[key];
    return [
      [`${key} that is not an array`, { ...good(), [key]: 'x' }],
      [`a fractional index in ${key}`, { ...good(), [key]: [...list.slice(1), 1.5] }],
      [`a negative index in ${key}`, { ...good(), [key]: [-1, ...list.slice(1)] }],
      [`an index past the last cell in ${key}`, { ...good(), [key]: [...list.slice(1), cellCount('beginner')] }],
      [`an index that is a string in ${key}`, { ...good(), [key]: [...list.slice(1), '3'] }],
      [`a duplicate in ${key}`, { ...good(), [key]: [...list.slice(0, -1), list[0]] }],
    ];
  });

  it.each<[string, unknown]>([
    ['not an object', 'x'],
    ['null', null],
    ['no level', { ...good(), level: undefined }],
    ['an unknown level', { ...good(), level: 'extreme' }],
    ['a level that is a number', { ...good(), level: 1 }],
    ...badLists,
    ['one mine too few', { ...good(), mines: good().mines.slice(1) }],
    ['one mine too many', { ...good(), mines: [...good().mines, safeCells(good()).find((i) => !good().opened.includes(i))] }],
    ['opened cells on a board with no mines', { ...good(), mines: [] }],
    ['a mined board with nothing opened', { ...good(), opened: [] }],
    ['an opened mine', { ...good(), opened: [...good().opened, good().mines.find((m) => !good().flagged.includes(m))] }],
    ['a cell that is both opened and flagged', { ...good(), flagged: [...good().flagged, good().opened[0]] }],
    ['a finished game: every safe cell open', { ...good(), opened: safeCells(good()), flagged: [] }],
    ['a negative elapsed time', { ...good(), elapsedMs: -1 }],
    ['an elapsed time that is not finite', { ...good(), elapsedMs: Infinity }],
    ['an elapsed time that is a string', { ...good(), elapsedMs: '5000' }],
    ['an elapsed time that is null', { ...good(), elapsedMs: null }],
    ['no elapsed time', { ...good(), elapsedMs: undefined }],
  ])('rejects %s', (_name, data) => {
    expect(fromSave(data)).toBeNull();
  });
});

describe('fromStats', () => {
  it('keeps valid stats', () => {
    let stats = recordGame(EMPTY_STATS, 'beginner', { won: true, ms: 83_000 });
    stats = recordGame(stats, 'expert', { won: false, ms: 20_000 });

    expect(fromStats(JSON.parse(JSON.stringify(stats)))).toEqual(stats);
  });

  it('drops keys that are not a level', () => {
    const stats = recordGame(EMPTY_STATS, 'intermediate', { won: true, ms: 5_000 });
    const back = fromStats({ ...stats, extreme: EMPTY_STATS.beginner, extra: 'x' });

    expect(back).toEqual(stats);
    expect(Object.keys(back)).toEqual(['beginner', 'intermediate', 'expert']);
  });

  const withLevel = (level: Level, value: unknown) => ({ ...EMPTY_STATS, [level]: value });
  const { beginner, intermediate, expert } = EMPTY_STATS;

  it.each([
    ['null', null],
    ['not an object', 'x'],
    ['a missing level', { beginner, intermediate }],
    ['a level that is null', withLevel('intermediate', null)],
    ['a negative count', withLevel('beginner', { ...beginner, played: -1 })],
    ['a fractional count', withLevel('expert', { ...expert, wins: 0.5 })],
    ['a missing streak', withLevel('beginner', { played: 0, wins: 0, currentStreak: 0, bestMs: null })],
    ['a bad best streak', withLevel('expert', { ...expert, bestStreak: '3' })],
    ['a missing best time', withLevel('intermediate', { played: 0, wins: 0, currentStreak: 0, bestStreak: 0 })],
    ['a bad best time', withLevel('beginner', { ...beginner, bestMs: 'fast' })],
    ['a negative best time', withLevel('intermediate', { ...intermediate, bestMs: -5 })],
  ])('falls back to empty stats for %s', (_name, data) => {
    expect(fromStats(data)).toEqual(EMPTY_STATS);
  });
});

describe('fromSettings', () => {
  it('keeps a valid level', () => {
    for (const level of LEVEL_IDS) expect(fromSettings({ level })).toEqual({ level });
  });

  it('defaults to Beginner', () => {
    expect(DEFAULT_SETTINGS).toEqual({ level: 'beginner' });
  });

  it.each([
    ['null', null],
    ['not an object', 7],
    ['no level', {}],
    ['an unknown level', { level: 'extreme' }],
    ['a level that is a number', { level: 2 }],
  ])('falls back to the default for %s', (_name, data) => {
    expect(fromSettings(data)).toEqual(DEFAULT_SETTINGS);
  });
});
