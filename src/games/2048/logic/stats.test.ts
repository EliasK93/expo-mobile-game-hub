import { SIZES, fromValues, winTile } from './board';
import { newGame, resultOf, type Game } from './game';
import { EMPTY_STATS, isNewBest, liveBest, recordGame, type Stats } from './stats';

const result = (score: number, bestTile: number, extra: { won?: boolean; undoUsed?: boolean } = {}) => ({
  score,
  bestTile,
  won: false,
  undoUsed: false,
  ...extra,
});

describe('EMPTY_STATS', () => {
  it('has nothing recorded on any size', () => {
    for (const size of SIZES)
      expect(EMPTY_STATS[size]).toEqual({ played: 0, wins: 0, bestScore: null, bestTile: null });
  });
});

describe('recordGame', () => {
  it('a finished game counts as played and sets the best score and best tile', () => {
    expect(recordGame(EMPTY_STATS, 4, result(1200, 128))[4]).toEqual({
      played: 1,
      wins: 0,
      bestScore: 1200,
      bestTile: 128,
    });
  });

  it('a game that reached the win tile is a win as well', () => {
    expect(recordGame(EMPTY_STATS, 4, result(30_000, 2048, { won: true }))[4]).toEqual({
      played: 1,
      wins: 1,
      bestScore: 30_000,
      bestTile: 2048,
    });
  });

  it('the bests only grow, each on its own', () => {
    let stats: Stats = recordGame(EMPTY_STATS, 5, result(1000, 256));
    stats = recordGame(stats, 5, result(800, 512)); // lower score, higher tile
    expect(stats[5]).toEqual({ played: 2, wins: 0, bestScore: 1000, bestTile: 512 });
    stats = recordGame(stats, 5, result(1500, 128)); // higher score, lower tile
    expect(stats[5]).toEqual({ played: 3, wins: 0, bestScore: 1500, bestTile: 512 });
  });

  it('a game with score 0 counts as played but leaves the best score alone; the best tile still counts', () => {
    expect(recordGame(EMPTY_STATS, 4, result(0, 4))[4]).toEqual({ played: 1, wins: 0, bestScore: null, bestTile: 4 });
    const before = recordGame(EMPTY_STATS, 4, result(500, 32));
    expect(recordGame(before, 4, result(0, 64))[4]).toEqual({ played: 2, wins: 0, bestScore: 500, bestTile: 64 });
  });

  it('a game with undo counts as played and as a win, but stays out of the bests', () => {
    const before = recordGame(EMPTY_STATS, 4, result(1000, 128));
    const after = recordGame(before, 4, result(99_999, 2048, { won: true, undoUsed: true }));
    expect(after[4]).toEqual({ played: 2, wins: 1, bestScore: 1000, bestTile: 128 });
  });

  it('a first game with undo leaves the bests empty', () => {
    expect(recordGame(EMPTY_STATS, 6, result(500, 64, { undoUsed: true }))[6]).toEqual({
      played: 1,
      wins: 0,
      bestScore: null,
      bestTile: null,
    });
  });

  it('records into the chosen size and never touches the others', () => {
    const after7 = recordGame(EMPTY_STATS, 7, result(10, 8));
    expect(after7[7].played).toBe(1);
    for (const size of [4, 5, 6] as const) expect(after7[size]).toBe(EMPTY_STATS[size]);
    const after4 = recordGame(after7, 4, result(20, 16));
    expect(after4[7]).toBe(after7[7]);
  });

  it('does not change the stats it is given', () => {
    const before = JSON.stringify(EMPTY_STATS);
    recordGame(EMPTY_STATS, 4, result(10, 8));
    recordGame(EMPTY_STATS, 4, result(10, 8, { undoUsed: true }));
    expect(JSON.stringify(EMPTY_STATS)).toBe(before);
  });
});

describe('liveBest', () => {
  const at = (score: number, undoUsed = false): Game => ({ ...newGame(4, () => 0), score, undoUsed });

  it('is the stored best until the score passes it', () => {
    expect(liveBest(1000, at(400))).toBe(1000);
    expect(liveBest(1000, at(1000))).toBe(1000);
    expect(liveBest(1000, at(1200))).toBe(1200);
  });

  it('is the score of the running game when nothing is stored yet', () => {
    expect(liveBest(null, at(0))).toBe(0);
    expect(liveBest(null, at(36))).toBe(36);
  });

  it('in a game with undo it is the stored best only, however high the score', () => {
    expect(liveBest(1000, at(5000, true))).toBe(1000);
    expect(liveBest(null, at(5000, true))).toBe(0);
  });
});

describe('isNewBest', () => {
  const before = recordGame(EMPTY_STATS, 4, result(1000, 128))[4];

  it('is true for a score above the stored best score', () => {
    expect(isNewBest(before, result(1200, 64))).toBe(true);
  });

  it('is false for a score equal to or below it', () => {
    expect(isNewBest(before, result(1000, 256))).toBe(false);
    expect(isNewBest(before, result(900, 256))).toBe(false);
  });

  it('is true for the first scoring game, false for a score of 0', () => {
    expect(isNewBest(EMPTY_STATS[4], result(36, 8))).toBe(true);
    expect(isNewBest(EMPTY_STATS[4], result(0, 4))).toBe(false);
  });

  it('is false for a game with undo, however high the score', () => {
    expect(isNewBest(before, result(5000, 512, { undoUsed: true }))).toBe(false);
  });
});

describe('abandoning a game is the same as losing it', () => {
  const running = (extra: Partial<Game>): Game => ({
    ...newGame(4, () => 0),
    board: fromValues([2, 64, 0, 0, ...Array(12).fill(0)]),
    score: 640,
    moves: 20,
    ...extra,
  });

  it('a game left unfinished is recorded from its result: played, with its score and best tile', () => {
    expect(recordGame(EMPTY_STATS, 4, resultOf(running({})))[4]).toEqual({
      played: 1,
      wins: 0,
      bestScore: 640,
      bestTile: 64,
    });
  });

  it('a game that had already reached the win tile is a win when abandoned', () => {
    const g = running({ won: true, keptGoing: true, board: fromValues([winTile(4), ...Array(15).fill(0)]) });
    expect(recordGame(EMPTY_STATS, 4, resultOf(g))[4]).toEqual({ played: 1, wins: 1, bestScore: 640, bestTile: 2048 });
  });

  it('with undo it stays out of the bests, like a finished game', () => {
    expect(recordGame(EMPTY_STATS, 4, resultOf(running({ undoUsed: true })))[4]).toEqual({
      played: 1,
      wins: 0,
      bestScore: null,
      bestTile: null,
    });
  });

  it('gives the same stats as the same game ending in game over', () => {
    const abandoned = running({});
    const over = running({ status: 'over' });
    expect(recordGame(EMPTY_STATS, 4, resultOf(abandoned))).toEqual(recordGame(EMPTY_STATS, 4, resultOf(over)));
  });
});
