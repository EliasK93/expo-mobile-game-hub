import { mulberry32 } from '@/lib/random';
import { SIZES, fromValues, toValues, winTile, type Dir, type Size } from './board';
import { isStarted, keepGoing, newGame, play, resultOf, undo, winOpen, type Game } from './game';

const first = () => 0; // spawns a 2 on the first empty cell
const sequence =
  (...numbers: number[]) =>
  () =>
    numbers.shift() as number;

// A game on a hand-built board (values in reading order, 0 = empty); the side comes from the number of values.
function withBoard(values: number[], extra: Partial<Game> = {}): Game {
  const board = fromValues(values);
  return {
    size: Math.sqrt(values.length) as Size,
    board,
    score: 0,
    won: false,
    keptGoing: false,
    undoUsed: false,
    prev: null,
    nextId: board.filter(Boolean).length + 1,
    moves: 0,
    status: 'playing',
    ...extra,
  };
}

// The first rows of a 4×4 board, the rest empty.
const rows4 = (...values: number[]) => [...values, ...Array(16 - values.length).fill(0)];

// Two tiles that merge into the win tile when moved left.
const nearlyWon = (size: Size) => {
  const values = Array(size * size).fill(0);
  values[0] = values[1] = winTile(size) / 2;
  return withBoard(values);
};

const sum = (values: number[]) => values.reduce((a, b) => a + b, 0);

describe('newGame', () => {
  it.each(SIZES)('size %i: a square board with two tiles, a 2 or a 4 each, with the ids 1 and 2', (size) => {
    const g = newGame(size, mulberry32(size));
    expect(g.size).toBe(size);
    expect(g.board).toHaveLength(size * size);
    const tiles = g.board.flatMap((t) => (t ? [t] : []));
    expect(tiles.map((t) => t.id).sort()).toEqual([1, 2]);
    for (const t of tiles) expect([2, 4]).toContain(t.value);
  });

  it('starts with nothing played, nothing used and the next id after the two tiles', () => {
    const g = newGame(4, mulberry32(3));
    expect(g).toEqual({
      size: 4,
      board: g.board,
      score: 0,
      won: false,
      keptGoing: false,
      undoUsed: false,
      prev: null,
      nextId: 3,
      moves: 0,
      status: 'playing',
    });
  });

  it('the same seed gives the same start', () => {
    expect(newGame(5, mulberry32(11))).toEqual(newGame(5, mulberry32(11)));
  });
});

describe('play', () => {
  it('moves, scores the merge and spawns one tile after the move', () => {
    const g = withBoard(rows4(2, 2, 0, 0, 0, 0, 0, 0, 4));
    const next = play(g, 'left', first).game;
    expect(toValues(next.board)).toEqual(rows4(4, 2, 0, 0, 0, 0, 0, 0, 4)); // the 4, then the spawned 2 in the first empty cell
    expect(next.score).toBe(4);
    expect(next.moves).toBe(1);
    expect(next.nextId).toBe(g.nextId + 1);
    expect(next.status).toBe('playing');
    expect(next.prev).toEqual({ board: g.board, score: 0 });
  });

  it('hands back what the animations need: the slides, the merges and the spawned tile', () => {
    const g = withBoard(rows4(2, 2));
    const result = play(g, 'left', first);
    expect(result.slides).toEqual([{ id: 2, from: 1, to: 0 }]);
    expect(result.merges).toEqual([{ id: 1, removedId: 2, at: 0, value: 4 }]);
    expect(result.spawned).toEqual({ id: g.nextId, at: 1, value: 2 });
    expect(result.game.board[1]).toEqual({ id: g.nextId, value: 2 });
  });

  it('the score adds up over the moves', () => {
    let g = withBoard(rows4(2, 2, 0, 0, 2, 2));
    g = play(g, 'left', first).game; // 4 and 4 merge: +8, the spawned 2 lands next to the first 4
    expect(g.score).toBe(8);
    g = play(g, 'up', first).game; // the two 4s in the first column merge: +8
    expect(g.score).toBe(16);
    expect(g.moves).toBe(2);
  });

  it('a swipe that changes nothing returns the same game: no spawn, no undo step, no move counted', () => {
    const g = withBoard(rows4(2, 0, 0, 0, 4));
    const result = play(g, 'left', first);
    expect(result.game).toBe(g);
    expect(result).toEqual({ game: g, slides: [], merges: [], spawned: null });
  });

  it('a finished game returns the same game, even when a move would still change the board', () => {
    const over = withBoard(rows4(2, 2, 4, 8), { status: 'over' });
    expect(play(over, 'left', first).game).toBe(over);
  });

  it('does not change the game it is given', () => {
    const g = withBoard(rows4(2, 2));
    const copy = JSON.stringify(g);
    play(g, 'left', first);
    expect(JSON.stringify(g)).toBe(copy);
  });

  it('a seeded game on every size: the tiles only ever grow by merging, and the score is the sum of the merges', () => {
    const dirs: Dir[] = ['left', 'up', 'right', 'down'];
    for (const size of SIZES) {
      const random = mulberry32(100 + size);
      let g = newGame(size, random);
      let total = sum(toValues(g.board)); // merging keeps the sum, so it grows only by what is spawned
      let merged = 0;
      for (let i = 0; i < 200 && g.status === 'playing'; i++) {
        const result = play(g, dirs[i % 4], random);
        if (result.spawned) total += result.spawned.value;
        merged += sum(result.merges.map((m) => m.value));
        g = result.game;
      }
      expect(g.moves).toBeGreaterThan(10);
      expect(sum(toValues(g.board))).toBe(total);
      expect(g.score).toBe(merged);
      const ids = g.board.flatMap((t) => (t ? [t.id] : []));
      expect(new Set(ids).size).toBe(ids.length);
    }
  });
});

describe('winning', () => {
  it.each(SIZES)(
    'size %i: merging two halves of the win tile wins, and the overlay is still to be dismissed',
    (size) => {
      const next = play(nearlyWon(size), 'left', first).game;
      expect(next.board[0]?.value).toBe(winTile(size));
      expect(next.won).toBe(true);
      expect(next.keptGoing).toBe(false);
      expect(next.status).toBe('playing');
    },
  );

  it('the win tile of a smaller board is no win on a bigger one', () => {
    const five = Array(25).fill(0);
    five[0] = five[1] = 1024; // 2048 on a 5×5 board: the win tile is 4096
    expect(play(withBoard(five), 'left', first).game.won).toBe(false);
    const six = Array(36).fill(0);
    six[0] = six[1] = 2048; // 4096 on a 6×6 board: the win tile is 8192
    expect(play(withBoard(six), 'left', first).game.won).toBe(false);
  });

  it('stays won for the rest of the game', () => {
    const won = play(nearlyWon(4), 'left', first).game;
    const next = play(won, 'right', first).game;
    expect(next.won).toBe(true);
    expect(next.moves).toBe(2);
  });

  it('a win with no move left is a won game that is over', () => {
    // Left merges the two 1024s; the spawned 2 fills the freed cell and nothing can move any more.
    const g = withBoard([1024, 1024, 4, 8, 4, 2, 4, 8, 2, 4, 2, 4, 4, 2, 4, 2]);
    const next = play(g, 'left', first).game;
    expect(toValues(next.board)).toEqual([2048, 4, 8, 2, 4, 2, 4, 8, 2, 4, 2, 4, 4, 2, 4, 2]);
    expect(next.won).toBe(true);
    expect(next.status).toBe('over');
  });
});

describe('keepGoing', () => {
  it('sets keptGoing on a won game, and the game carries on', () => {
    const won = play(nearlyWon(4), 'left', first).game;
    const kept = keepGoing(won);
    expect(kept).toEqual({ ...won, keptGoing: true });
    expect(play(kept, 'right', first).game.moves).toBe(2);
  });

  it('returns the same game when it is not won, or already kept going', () => {
    const fresh = newGame(4, mulberry32(1));
    expect(keepGoing(fresh)).toBe(fresh);
    const kept = keepGoing(play(nearlyWon(4), 'left', first).game);
    expect(keepGoing(kept)).toBe(kept);
  });
});

describe('winOpen', () => {
  it('is true from the win until Keep going, and false for a game that never won', () => {
    expect(winOpen(newGame(4, mulberry32(1)))).toBe(false);
    const won = play(nearlyWon(4), 'left', first).game;
    expect(winOpen(won)).toBe(true);
    expect(winOpen(keepGoing(won))).toBe(false);
  });

  it('is false once the game is over, so the finished board shows Game over alone', () => {
    const won = play(nearlyWon(4), 'left', first).game;
    expect(winOpen({ ...won, status: 'over' })).toBe(false);
  });
});

describe('game over', () => {
  // A checkerboard of 2 and 4 with one cell empty in the last row: left slides the row, the spawn fills the last cell.
  const nearlyOver = () => withBoard([2, 4, 2, 4, 4, 2, 4, 2, 2, 4, 2, 4, 4, 2, 0, 4]);

  it('is over when the spawn leaves no empty cell and no equal neighbours', () => {
    const next = play(nearlyOver(), 'left', first).game;
    expect(toValues(next.board)).toEqual([2, 4, 2, 4, 4, 2, 4, 2, 2, 4, 2, 4, 4, 2, 4, 2]);
    expect(next.status).toBe('over');
  });

  it('is not over while a merge is left: the board is full, but the spawned 4 sits next to a 4', () => {
    const next = play(nearlyOver(), 'left', sequence(0, 0.95)).game;
    expect(next.board.every((t) => t !== null)).toBe(true);
    expect(next.board[15]?.value).toBe(4);
    expect(next.status).toBe('playing');
  });

  it('a game that is over does not play or undo', () => {
    const over = play(nearlyOver(), 'left', first).game;
    expect(over.prev).not.toBeNull();
    expect(play(over, 'right', first).game).toBe(over);
    expect(undo(over)).toBe(over);
  });
});

describe('undo', () => {
  const start = () => withBoard(rows4(2, 2, 0, 0, 0, 0, 0, 0, 4));

  it('takes back the move: the board and score from before, the spawned tile gone with it', () => {
    const g = start();
    const played = play(g, 'left', first).game;
    expect(played.board).not.toEqual(g.board);
    const back = undo(played);
    expect(back.board).toEqual(g.board);
    expect(back.score).toBe(0);
    expect(back.prev).toBeNull();
    expect(back.undoUsed).toBe(true);
    expect(back.moves).toBe(1); // a move was made, undone or not
    expect(back.status).toBe('playing');
  });

  it('is one step only: a second undo does nothing until the next move', () => {
    const back = undo(play(start(), 'left', first).game);
    expect(undo(back)).toBe(back);
    const again = play(back, 'down', first).game;
    expect(undo(again).board).toEqual(back.board);
  });

  it('does nothing at the start', () => {
    const g = start();
    expect(undo(g)).toBe(g);
  });

  it('keeps undoUsed for the rest of the game', () => {
    const back = undo(play(start(), 'left', first).game);
    expect(play(back, 'down', first).game.undoUsed).toBe(true);
  });

  it('restores only the board and the score: won and keptGoing stay as they are', () => {
    const won = play(nearlyWon(4), 'left', first).game;
    const back = undo(won);
    expect(back.board).toEqual(nearlyWon(4).board);
    expect(back.won).toBe(true);
    expect(back.keptGoing).toBe(false);
    expect(undo(keepGoing(won)).keptGoing).toBe(true);
  });
});

describe('isStarted', () => {
  it('is false at the start and after a swipe that changes nothing, true after the first move and after an undo', () => {
    const g = withBoard(rows4(2));
    expect(isStarted(g)).toBe(false);
    expect(isStarted(play(g, 'left', first).game)).toBe(false);
    const played = play(g, 'right', first).game;
    expect(isStarted(played)).toBe(true);
    expect(isStarted(undo(played))).toBe(true);
  });
});

describe('resultOf', () => {
  it('is the score, the biggest tile, whether the win tile was reached and whether undo was used', () => {
    const g = withBoard(rows4(2, 64), { score: 777, won: true, undoUsed: true });
    expect(resultOf(g)).toEqual({ score: 777, bestTile: 64, won: true, undoUsed: true });
  });

  it('won stays true after an undo took the win tile away', () => {
    const won = play(nearlyWon(4), 'left', first).game;
    expect(resultOf(won).won).toBe(true);
    expect(resultOf(undo(won))).toEqual({ score: 0, bestTile: winTile(4) / 2, won: true, undoUsed: true });
  });
});
