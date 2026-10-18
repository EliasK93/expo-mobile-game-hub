import { mulberry32 } from '@/lib/random';
import { LEVELS, LEVEL_IDS, cellCount, neighbours, type Level } from './board';
import { cellViews, isStarted, minesLeft, newGame, open, toggleFlag, type Game } from './game';

const random = mulberry32(1);

// A game on a hand-built board: mines at the given cells, the rest of the game as in newGame. The number of mines need not
// match the level; only fromSave checks that.
function withMines(level: Level, mineIndices: number[], extra: Partial<Game> = {}): Game {
  const mines = Array.from({ length: cellCount(level) }, (_, i) => mineIndices.includes(i));
  return { ...newGame(level), mines, ...extra };
}

// Opened flags for every cell except the mines and the cells left out.
const openedExcept = (level: Level, mineIndices: number[], ...left: number[]) =>
  Array.from({ length: cellCount(level) }, (_, i) => !mineIndices.includes(i) && !left.includes(i));

const indices = (flags: boolean[]) => flags.flatMap((f, i) => (f ? [i] : []));

// Beginner (8 columns) with a wall of mines down column 4: opening the left side floods columns 0-3 and stops at the wall.
const WALL = Array.from({ length: LEVELS.beginner.rows }, (_, r) => r * 8 + 4);
const leftSide = Array.from({ length: cellCount('beginner') }, (_, i) => i % 8 < 4);

// Exactly the mines of Beginner, packed at the top (row 0 and the start of row 1): every other cell is open after a flood
// from the bottom corner. The first safe cells after them are 12 and 13.
const TOP = Array.from({ length: LEVELS.beginner.mines }, (_, i) => i);

describe('newGame', () => {
  it.each(LEVEL_IDS)('%s: unmined, nothing opened or flagged, playing, no mine hit', (level) => {
    const g = newGame(level);
    expect(g.level).toBe(level);
    expect(g.mines).toBeNull();
    expect(g.opened).toEqual(Array(cellCount(level)).fill(false));
    expect(g.flagged).toEqual(Array(cellCount(level)).fill(false));
    expect(g.status).toBe('playing');
    expect(g.hit).toBeNull();
  });
});

describe('open: the first tap', () => {
  it('places the mines and opens the tapped cell and all its neighbours', () => {
    const g = open(newGame('beginner'), 43, random);
    expect(g.mines).not.toBeNull();
    expect(indices(g.mines!)).toHaveLength(LEVELS.beginner.mines);
    for (const i of [43, ...neighbours('beginner', 43)]) {
      expect(g.opened[i]).toBe(true);
      expect(g.mines![i]).toBe(false);
    }
  });

  it.each(LEVEL_IDS)('%s: a tap in the corner opens the corner and its 3 neighbours', (level) => {
    const g = open(newGame(level), 0, mulberry32(3));
    for (const i of [0, ...neighbours(level, 0)]) expect(g.opened[i]).toBe(true);
    expect(g.status).not.toBe('lost');
  });

  it('is never a mine, whatever the seed', () => {
    for (let seed = 1; seed <= 30; seed++) {
      const g = open(newGame('expert'), 0, mulberry32(seed));
      expect(g.status).not.toBe('lost');
      expect(g.hit).toBeNull();
    }
  });

  it('keeps a flag that was placed before the first tap: the flagged cell stays covered', () => {
    const flagged = toggleFlag(newGame('beginner'), 44); // next to the tapped cell
    const g = open(flagged, 43, random);
    expect(g.opened[43]).toBe(true);
    expect(g.opened[44]).toBe(false);
    expect(g.flagged[44]).toBe(true);
  });

  it('a flagged cell is not opened by the first tap either, and the board stays unmined', () => {
    const flagged = toggleFlag(newGame('beginner'), 43);
    expect(open(flagged, 43, random)).toBe(flagged);
    expect(flagged.mines).toBeNull();
  });

  it('a board that has mines is not mined again, and does not ask for random numbers', () => {
    const asked = jest.fn(() => 0.5);
    const mined = withMines('beginner', [0]);
    expect(open(mined, 80, asked).mines).toBe(mined.mines);
    expect(asked).not.toHaveBeenCalled();
  });
});

describe('open: numbers and flood fill', () => {
  it('a cell with a number opens alone', () => {
    const g = open(withMines('beginner', [43]), 35, random);
    expect(indices(g.opened)).toEqual([35]);
    expect(g.status).toBe('playing');
  });

  it('a cell with no mine around opens all its neighbours, and every 0 among them does the same, until the numbers', () => {
    const g = open(withMines('beginner', WALL), 0, random);
    expect(g.opened).toEqual(leftSide); // columns 0-3, the numbers of column 3 included
    expect(g.status).toBe('playing');
  });

  it('the flood stops at numbers: the cells behind the wall stay covered', () => {
    const g = open(withMines('beginner', WALL), 0, random);
    for (const i of [4, 5, 7, 12, 15, 44, 76, 95]) expect(g.opened[i]).toBe(false);
  });

  it('a flagged cell inside the flood stays covered and flagged, and the rest still opens', () => {
    const flagged = toggleFlag(withMines('beginner', WALL), 18);
    const g = open(flagged, 0, random);
    expect(g.opened[18]).toBe(false);
    expect(g.flagged[18]).toBe(true);
    expect(g.opened).toEqual(leftSide.map((inLeft, i) => inLeft && i !== 18));
  });

  it('a mine is never opened by a flood', () => {
    const g = open(withMines('beginner', WALL), 0, random);
    for (const i of WALL) expect(g.opened[i]).toBe(false);
  });

  it('works on every level without trouble: a flood from a corner on a board with a single mine opens all but that mine', () => {
    for (const level of LEVEL_IDS) {
      const last = cellCount(level) - 1;
      const g = open(withMines(level, [0]), last, random);
      expect(g.status).toBe('won');
      expect(g.opened.filter(Boolean)).toHaveLength(last);
    }
  });
});

describe('open: a mine', () => {
  it('ends the game as lost with the cell that was hit; the opened cells are as they were', () => {
    const g = withMines('beginner', [0, 5]);
    const lost = open(g, 5, random);
    expect(lost.status).toBe('lost');
    expect(lost.hit).toBe(5);
    expect(lost.opened).toEqual(g.opened);
    expect(lost.mines).toBe(g.mines);
  });

  it('is a loss after cells were opened, too', () => {
    const lost = open(open(withMines('beginner', WALL), 0, random), 12, random);
    expect(lost.status).toBe('lost');
    expect(lost.hit).toBe(12);
    expect(lost.opened).toEqual(leftSide);
  });
});

describe('open: cells that do nothing', () => {
  it('a flagged cell returns the same game', () => {
    const g = toggleFlag(withMines('beginner', [0]), 35);
    expect(open(g, 35, random)).toBe(g);
  });

  it('a flagged mine does not explode', () => {
    const g = toggleFlag(withMines('beginner', [0]), 0);
    expect(open(g, 0, random)).toBe(g);
  });

  it('an opened cell returns the same game: no chording', () => {
    const g = open(withMines('beginner', [43]), 35, random);
    expect(open(g, 35, random)).toBe(g);
    const flagged = toggleFlag(g, 34); // a flag next to the opened 1 changes nothing either
    expect(open(flagged, 35, random)).toBe(flagged);
  });

  it('a lost game returns the same game', () => {
    const lost = open(withMines('beginner', [0]), 0, random);
    expect(lost.status).toBe('lost');
    expect(open(lost, 80, random)).toBe(lost);
  });

  it('a won game returns the same game', () => {
    const won = open(withMines('beginner', TOP), 80, random);
    expect(won.status).toBe('won');
    expect(open(won, 0, random)).toBe(won);
  });
});

describe('open: does not change the game it is given', () => {
  const check = (g: Game, i: number) => {
    const copy = JSON.stringify(g);
    open(g, i, random);
    expect(JSON.stringify(g)).toBe(copy);
  };

  it('on the first tap', () => check(newGame('beginner'), 43));
  it('on a flood', () => check(toggleFlag(withMines('beginner', WALL), 18), 0));
  it('on a mine', () => check(withMines('beginner', [0]), 0));
  it('on a win', () => check(withMines('beginner', TOP), 80));
});

describe('toggleFlag', () => {
  it('flags a covered cell and takes the flag off again', () => {
    const g = newGame('beginner');
    const flagged = toggleFlag(g, 7);
    expect(flagged.flagged[7]).toBe(true);
    expect(indices(flagged.flagged)).toEqual([7]);
    expect(toggleFlag(flagged, 7).flagged).toEqual(g.flagged);
  });

  it('an opened cell returns the same game', () => {
    const g = open(withMines('beginner', [43]), 35, random);
    expect(toggleFlag(g, 35)).toBe(g);
  });

  it('a finished game returns the same game', () => {
    const lost = open(withMines('beginner', [0]), 0, random);
    expect(toggleFlag(lost, 5)).toBe(lost);
    const won = open(withMines('beginner', TOP), 80, random);
    expect(toggleFlag(won, 5)).toBe(won);
  });

  it('a flag as the first action leaves the board unmined and the game not started', () => {
    const g = toggleFlag(newGame('beginner'), 7);
    expect(g.mines).toBeNull();
    expect(isStarted(g)).toBe(false);
    expect(g.status).toBe('playing');
  });

  it('a flag can go on any covered cell, a wrong one too', () => {
    const g = toggleFlag(withMines('beginner', [0]), 80);
    expect(g.flagged[80]).toBe(true);
  });

  it('does not change the game it is given', () => {
    const g = newGame('beginner');
    const copy = JSON.stringify(g);
    toggleFlag(g, 7);
    expect(JSON.stringify(g)).toBe(copy);
  });
});

describe('minesLeft', () => {
  it.each(LEVEL_IDS)("%s: starts as the level's mines and drops with every flag", (level) => {
    const g = newGame(level);
    expect(minesLeft(g)).toBe(LEVELS[level].mines);
    expect(minesLeft(toggleFlag(g, 0))).toBe(LEVELS[level].mines - 1);
  });

  it('is -1 with one flag too many on Beginner', () => {
    let g = newGame('beginner');
    for (let i = 0; i <= LEVELS.beginner.mines; i++) g = toggleFlag(g, i);
    expect(minesLeft(g)).toBe(-1);
    expect(minesLeft(toggleFlag(g, 0))).toBe(0);
  });
});

describe('isStarted', () => {
  it('is false for a new game and a game with only flags, true after the first tap and after a loss', () => {
    const g = newGame('beginner');
    expect(isStarted(g)).toBe(false);
    expect(isStarted(toggleFlag(g, 3))).toBe(false);
    expect(isStarted(open(g, 43, random))).toBe(true);
    expect(isStarted(open(withMines('beginner', [0]), 0, random))).toBe(true);
  });
});

describe('winning', () => {
  it('opening the last safe cell directly wins: the remaining mines show as flags and none are left', () => {
    const g = withMines('beginner', TOP, { opened: openedExcept('beginner', TOP, 12) });
    const won = open(g, 12, random);
    expect(won.status).toBe('won');
    expect(won.hit).toBeNull();
    expect(won.flagged).toEqual(won.mines);
    expect(won.flagged).not.toBe(won.mines); // a copy
    expect(minesLeft(won)).toBe(0);
  });

  it('opening the last safe cell through a flood wins as well', () => {
    const won = open(withMines('beginner', TOP), 80, random);
    expect(won.status).toBe('won');
    expect(won.opened).toEqual(openedExcept('beginner', TOP));
    expect(won.flagged).toEqual(won.mines);
    expect(minesLeft(won)).toBe(0);
  });

  it('is not won while one safe cell is still covered', () => {
    const g = withMines('beginner', TOP, { opened: openedExcept('beginner', TOP, 12, 13) });
    const next = open(g, 12, random);
    expect(next.status).toBe('playing');
    expect(next.flagged).toEqual(g.flagged);
  });

  it('wrong flags do not count: a flagged safe cell must be unflagged and opened first', () => {
    const flagged = toggleFlag(withMines('beginner', TOP), 80);
    const flooded = open(flagged, 43, random);
    expect(flooded.status).toBe('playing');
    expect(flooded.opened[80]).toBe(false);
    const won = open(toggleFlag(flooded, 80), 80, random);
    expect(won.status).toBe('won');
    expect(won.flagged).toEqual(won.mines); // the wrong flag is gone
  });

  it.each(LEVEL_IDS)('%s: a seeded game won by opening every safe cell', (level) => {
    const r = mulberry32(42);
    let g = open(newGame(level), Math.floor(cellCount(level) / 2), r);
    g.mines!.forEach((mine, i) => {
      if (!mine) g = open(g, i, r);
    });
    expect(g.status).toBe('won');
    expect(g.opened.filter(Boolean)).toHaveLength(cellCount(level) - LEVELS[level].mines);
    expect(g.flagged).toEqual(g.mines);
    expect(minesLeft(g)).toBe(0);
  });
});

describe('cellViews', () => {
  it.each(LEVEL_IDS)('%s: one entry per cell, all covered on a new game', (level) => {
    expect(cellViews(newGame(level))).toEqual(Array(cellCount(level)).fill('covered'));
  });

  it('a flag shows as a flag, on an unmined board too', () => {
    const views = cellViews(toggleFlag(newGame('beginner'), 7));
    expect(views[7]).toBe('flag');
    expect(views.filter((v) => v === 'flag')).toHaveLength(1);
  });

  it('an opened cell shows its number, a 0 for none; covered cells stay covered', () => {
    const g = open(withMines('beginner', WALL), 0, random);
    const views = cellViews(g);
    expect(views[0]).toBe(0);
    expect(views[3]).toBe(2); // next to two mines of the wall
    expect(views[11]).toBe(3); // next to three
    expect(views[5]).toBe('covered');
    expect(views[4]).toBe('covered'); // a mine, not shown while the game runs
  });

  it('while the game runs a wrong flag still looks like any flag', () => {
    const views = cellViews(toggleFlag(withMines('beginner', [0]), 80));
    expect(views[80]).toBe('flag');
    expect(views[0]).toBe('covered');
  });

  describe('after a loss', () => {
    // Mines 0, 5 and 9; a right flag on 0, a wrong one on 80; 5 is hit.
    const lost = open(toggleFlag(toggleFlag(withMines('beginner', [0, 5, 9]), 0), 80), 5, random);
    const views = cellViews(lost);

    it('the hit mine is marked, the other mines show, a right flag stays a flag', () => {
      expect(lost.status).toBe('lost');
      expect(views[5]).toBe('hit');
      expect(views[9]).toBe('mine');
      expect(views[0]).toBe('flag');
    });

    it('a wrong flag is crossed, the rest stays covered', () => {
      expect(views[80]).toBe('wrongFlag');
      expect(views[43]).toBe('covered');
    });

    it('opened cells keep their numbers', () => {
      const g = open(open(withMines('beginner', WALL), 0, random), 12, random);
      expect(cellViews(g)[3]).toBe(2);
      expect(cellViews(g)[12]).toBe('hit');
    });
  });

  it('after a win every mine is a flag and no cell is covered', () => {
    const won = open(withMines('beginner', TOP), 80, random);
    const views = cellViews(won);
    expect(views.filter((v) => v === 'flag')).toHaveLength(TOP.length);
    expect(views.slice(0, TOP.length)).toEqual(Array(TOP.length).fill('flag'));
    expect(views).not.toContain('covered');
  });
});
