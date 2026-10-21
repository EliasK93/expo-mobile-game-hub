import { mulberry32 } from '@/lib/random';
import { clear, newRound, pause, place, skip, start, tick, type Game, type Status } from './game';
import { DEFAULT_SETTINGS, fromSave, fromSettings, fromStats, toSave, type SaveData } from './save';
import { EMPTY_STATS, recordRound } from './stats';
import { LEVEL_IDS } from './words';

const r = () => mulberry32(3);

// A running Normal round on PLATE (rack ALEPT), two tiles placed, 2 solved, 1 skip, CRANE used before.
const started = (): Game => {
  const g = start(newRound('normal', mulberry32(1)));
  const plate = { ...g, word: 'plate', rack: [...'alept'], used: ['crane', 'plate'], solved: 2, skips: 1 };
  return place(place(plate, 3, r()), 0, r());
};

const roundTrip = (game: Game, elapsedMs: number) => fromSave(JSON.parse(JSON.stringify(toSave(game, elapsedMs))));

const good = () => toSave(started(), 5000) as SaveData;

describe('toSave', () => {
  it('stores the level, the word, the rack as a string, the answer slots, the counts and the elapsed time', () => {
    expect(toSave(started(), 900)).toEqual({
      level: 'normal',
      word: 'plate',
      rack: 'alept',
      answer: [3, 0, null, null, null],
      solved: 2,
      skips: 1,
      used: ['crane', 'plate'],
      elapsedMs: 900,
    });
  });

  it.each<Status>(['ready', 'over'])('saves no %s round: only a started, unfinished one is saved', (status) => {
    expect(toSave({ ...started(), status }, 0)).toBeNull();
  });

  it('saves a paused round', () => {
    expect(toSave(pause(started(), 1000), 1000)).not.toBeNull();
  });

  it('saves nothing for a round that ran out of time', () => {
    expect(toSave(tick(started(), 60_000), 60_000)).toBeNull();
  });

  it('leaves the revealed solution out', () => {
    expect(toSave(skip(started(), 0, r()), 0)).not.toHaveProperty('revealed');
  });
});

describe('fromSave', () => {
  it('round-trips a started round, and it loads paused', () => {
    const g = started();
    expect(roundTrip(g, 12_345)).toEqual({ game: { ...g, status: 'paused' }, elapsedMs: 12_345 });
  });

  it.each(LEVEL_IDS)('round-trips a %s round with a wrong, full answer', (level) => {
    let g = start(newRound(level, mulberry32(8)));
    for (let i = 0; i < g.rack.length; i++) g = place(g, i, r());
    expect(roundTrip(g, 100)).toEqual({ game: { ...g, status: 'paused' }, elapsedMs: 100 });
  });

  it('round-trips a round with holes in the answer row', () => {
    const g = place(place(place(start(newRound('hard', mulberry32(2))), 0, r()), 1, r()), 2, r());
    const holes = { ...g, answer: [0, null, 2, null, null, null] };
    expect(roundTrip(holes, 7)?.game.answer).toEqual([0, null, 2, null, null, null]);
  });

  it('a round that showed a skipped solution loads with revealed null', () => {
    const g = skip(started(), 1000, r());
    expect(g.revealed).not.toBeNull();
    expect(roundTrip(g, 1000)).toEqual({ game: { ...g, revealed: null, status: 'paused' }, elapsedMs: 1000 });
  });

  it('a round that was just started, with nothing placed, round-trips', () => {
    const g = start(newRound('easy', mulberry32(6)));
    expect(roundTrip(g, 0)).toEqual({ game: { ...g, status: 'paused' }, elapsedMs: 0 });
    expect(roundTrip(clear(started()), 5)?.game.answer).toEqual([null, null, null, null, null]);
  });

  it('takes a fractional elapsed time: the clock does not count whole milliseconds', () => {
    expect(fromSave({ ...good(), elapsedMs: 1234.5 })?.elapsedMs).toBe(1234.5);
  });

  it('takes a round with time left, but not one without', () => {
    expect(fromSave({ ...good(), elapsedMs: 54_999 })).not.toBeNull();
    expect(fromSave({ ...good(), elapsedMs: 55_000, skips: 1 })).toBeNull();
  });

  const bad = (patch: Partial<Record<keyof SaveData, unknown>>) => ({ ...good(), ...patch });

  it.each<[string, unknown]>([
    ['not an object', 'x'],
    ['null', null],
    ['no level', bad({ level: undefined })],
    ['an unknown level', bad({ level: 'extreme' })],
    ['a level that is a number', bad({ level: 1 })],

    ['no word', bad({ word: undefined })],
    ['a word that is a number', bad({ word: 12345 })],
    ['a word of the wrong length for the level', bad({ word: 'plates', rack: 'alepts', used: ['plates'] })],
    ['a word with an upper case letter', bad({ word: 'Plate', used: ['Plate'] })],
    ['a word with a character outside a-z', bad({ word: 'plat3', rack: 'alep3', used: ['plat3'] })],

    ['no rack', bad({ rack: undefined })],
    ['a rack that is an array', bad({ rack: ['a', 'l', 'e', 'p', 't'] })],
    ['a rack with other letters than the word', bad({ rack: 'alepx' })],
    ['a rack that is too short', bad({ rack: 'alep' })],
    ['a rack that is too long', bad({ rack: 'aleptt' })],
    ['a rack with a letter twice and one missing', bad({ rack: 'alept'.replace('t', 'p') })],

    ['no answer', bad({ answer: undefined })],
    ['an answer that is not an array', bad({ answer: '01' })],
    ['an answer of the wrong length', bad({ answer: [0, 1, null, null] })],
    ['an answer slot past the rack', bad({ answer: [5, null, null, null, null] })],
    ['an answer slot that is negative', bad({ answer: [-1, null, null, null, null] })],
    ['an answer slot that is fractional', bad({ answer: [0.5, null, null, null, null] })],
    ['an answer slot that is a string', bad({ answer: ['0', null, null, null, null] })],
    ['an answer slot that is undefined', bad({ answer: [0, undefined, null, null, null] })],
    ['an answer that uses a tile twice', bad({ answer: [2, 2, null, null, null] })],

    ['no solved count', bad({ solved: undefined })],
    ['a solved count that is negative', bad({ solved: -1 })],
    ['a solved count that is fractional', bad({ solved: 1.5 })],
    ['a solved count that is a string', bad({ solved: '2' })],
    ['no skips count', bad({ skips: undefined })],
    ['a skips count that is negative', bad({ skips: -1 })],
    ['a skips count that is fractional', bad({ skips: 0.5 })],

    ['no used words', bad({ used: undefined })],
    ['used words that are not an array', bad({ used: 'plate' })],
    ['used words without the current word', bad({ used: ['crane'] })],
    ['used words that are not strings', bad({ used: ['plate', 7] })],

    ['a negative elapsed time', bad({ elapsedMs: -1 })],
    ['an elapsed time that is not finite', bad({ elapsedMs: Infinity })],
    ['an elapsed time that is a string', bad({ elapsedMs: '5000' })],
    ['no elapsed time', bad({ elapsedMs: undefined })],
    ['no time left', bad({ elapsedMs: 60_000 })],
    ['no time left after the skips', bad({ elapsedMs: 50_000, skips: 2 })],
  ])('rejects %s', (_name, data) => {
    expect(fromSave(data)).toBeNull();
  });
});

describe('fromStats', () => {
  it('keeps valid stats', () => {
    let stats = recordRound(EMPTY_STATS, 'normal', 12);
    stats = recordRound(stats, 'hard', 0);
    expect(fromStats(JSON.parse(JSON.stringify(stats)))).toEqual(stats);
  });

  it('drops keys that are not a level', () => {
    const stats = recordRound(EMPTY_STATS, 'easy', 5);
    const back = fromStats({ ...stats, extreme: EMPTY_STATS.easy, extra: 'x' });
    expect(back).toEqual(stats);
    expect(Object.keys(back)).toEqual(['easy', 'normal', 'hard']);
  });

  const withLevel = (level: string, value: unknown) => ({ ...EMPTY_STATS, [level]: value });
  const { easy, normal, hard } = EMPTY_STATS;

  it.each([
    ['null', null],
    ['not an object', 'x'],
    ['a missing level', { easy, normal }],
    ['a level that is null', withLevel('normal', null)],
    ['a negative count', withLevel('easy', { ...easy, played: -1 })],
    ['a fractional best score', withLevel('hard', { ...hard, best: 0.5 })],
    ['a total that is a string', withLevel('normal', { ...normal, totalWords: '3' })],
    ['a missing best score', withLevel('easy', { played: 0, totalWords: 0 })],
    ['a missing total', withLevel('easy', { played: 0, best: 0 })],
  ])('falls back to empty stats for %s', (_name, data) => {
    expect(fromStats(data)).toEqual(EMPTY_STATS);
  });
});

describe('fromSettings', () => {
  it('keeps a valid level', () => {
    for (const level of LEVEL_IDS) expect(fromSettings({ level })).toEqual({ level });
  });

  it('defaults to Normal', () => {
    expect(DEFAULT_SETTINGS).toEqual({ level: 'normal' });
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
