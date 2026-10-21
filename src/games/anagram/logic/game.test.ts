import { mulberry32 } from '@/lib/random';
import words from '../data/words.json';
import {
  ROUND_MS,
  SKIP_MS,
  canAct,
  clear,
  endReveal,
  isInPlay,
  isWrong,
  newRound,
  pause,
  place,
  remainingMs,
  resume,
  shuffleRack,
  skip,
  start,
  tick,
  unplace,
  type Game,
  type Status,
} from './game';
import { LENGTH, LEVEL_IDS, isAccepted, permutations, scramble, type Level } from './words';

const sorted = (w: string) => [...w].sort().join('');
const random = () => mulberry32(5);

const running = (level: Level = 'normal', seed = 1): Game => start(newRound(level, mulberry32(seed)));

// Taps the rack tiles that carry the given letters, in that order (a tile is used once).
const spell = (game: Game, letters: string, r = random()): Game => {
  let g = game;
  for (const letter of letters) {
    const i = g.rack.findIndex((l, k) => l === letter && !g.answer.includes(k));
    g = place(g, i, r);
  }
  return g;
};

// A running game on a hand-picked word (rack scrambled as in the game).
const on = (word: string, status: Status = 'running'): Game => ({
  ...newRound('normal', mulberry32(1)),
  level: LEVEL_IDS[word.length - 4],
  word,
  rack: [...scramble(word, mulberry32(2))],
  answer: Array(word.length).fill(null),
  used: [word],
  status,
});

// An answer that has another accepted anagram, and that anagram.
const twin = (() => {
  for (const w of (words as Record<string, { answers: string[] }>)[5].answers) {
    const other = [...permutations(w)].find((p) => p !== w && isAccepted(p));
    if (other) return { word: w, other };
  }
  throw new Error('no anagram pair in the data');
})();

describe('newRound', () => {
  it.each(LEVEL_IDS)('%s: a ready round with a scrambled word of the level length and an empty answer row', (level) => {
    const g = newRound(level, mulberry32(3));
    expect(g.status).toBe('ready');
    expect(g.level).toBe(level);
    expect(g.word).toHaveLength(LENGTH[level]);
    expect(isAccepted(g.word)).toBe(true);
    expect(sorted(g.rack.join(''))).toBe(sorted(g.word));
    expect(isAccepted(g.rack.join(''))).toBe(false);
    expect(g.answer).toEqual(Array(LENGTH[level]).fill(null));
    expect(g).toMatchObject({ solved: 0, skips: 0, used: [g.word], revealed: null });
  });
});

describe('remainingMs', () => {
  it('is the round minus the elapsed time minus 5 s per skip, never below 0', () => {
    const g = running();
    expect(ROUND_MS).toBe(60_000);
    expect(SKIP_MS).toBe(5_000);
    expect(remainingMs(g, 0)).toBe(60_000);
    expect(remainingMs(g, 12_345)).toBe(47_655);
    expect(remainingMs({ ...g, skips: 3 }, 10_000)).toBe(35_000);
    expect(remainingMs({ ...g, skips: 3 }, 50_000)).toBe(0);
    expect(remainingMs(g, 99_999)).toBe(0);
  });
});

describe('status', () => {
  it('start turns a ready round into a running one', () => {
    expect(running().status).toBe('running');
  });

  it('start does nothing unless the round is ready', () => {
    const g = running();
    expect(start(g)).toBe(g);
    expect(start(pause(g))).toEqual(pause(g));
    const over = { ...g, status: 'over' as const };
    expect(start(over)).toBe(over);
  });

  it('pause and resume swap running and paused, and do nothing in any other state', () => {
    const g = running();
    const p = pause(g);
    expect(p.status).toBe('paused');
    expect(pause(p)).toBe(p);
    expect(resume(p).status).toBe('running');
    expect(resume(g)).toBe(g);
    const ready = newRound('easy', random());
    expect(pause(ready)).toBe(ready);
    expect(resume(ready)).toBe(ready);
  });

  it('isInPlay is true while running or paused', () => {
    const g = running();
    expect(isInPlay(g)).toBe(true);
    expect(isInPlay(pause(g))).toBe(true);
    expect(isInPlay(newRound('easy', random()))).toBe(false);
    expect(isInPlay({ ...g, status: 'over' })).toBe(false);
  });

  it('pausing clears the revealed solution', () => {
    const g = skip(running(), 0, random());
    expect(g.revealed).not.toBeNull();
    expect(pause(g).revealed).toBeNull();
  });
});

describe('place, unplace, clear', () => {
  it('a tapped tile goes into the first empty slot and stays at its rack position', () => {
    const g = place(running(), 3, random());
    expect(g.answer).toEqual([3, null, null, null, null]);
    expect(g.rack).toEqual(running().rack);
    expect(place(g, 0, random()).answer).toEqual([3, 0, null, null, null]);
  });

  it('tapping a tile that is already placed, or one that is not on the rack, does nothing', () => {
    const g = place(running(), 3, random());
    expect(place(g, 3, random())).toBe(g);
    expect(place(g, -1, random())).toBe(g);
    expect(place(g, 5, random())).toBe(g);
    expect(place(g, 1.5, random())).toBe(g);
  });

  it('unplace empties that slot and leaves a hole that the next tap fills', () => {
    let g = place(place(place(running(), 0, random()), 1, random()), 2, random());
    g = unplace(g, 1);
    expect(g.answer).toEqual([0, null, 2, null, null]);
    expect(place(g, 4, random()).answer).toEqual([0, 4, 2, null, null]);
  });

  it('unplace on an empty or missing slot does nothing', () => {
    const g = place(running(), 0, random());
    expect(unplace(g, 1)).toBe(g);
    expect(unplace(g, 9)).toBe(g);
    expect(unplace(g, -1)).toBe(g);
  });

  it('clear sends every placed tile back', () => {
    const g = place(place(running(), 2, random()), 4, random());
    expect(clear(g).answer).toEqual([null, null, null, null, null]);
  });
});

describe('shuffleRack', () => {
  it('moves only the tiles still in the rack: placed tiles keep their position and slot', () => {
    for (let seed = 1; seed < 30; seed++) {
      const g = place(place(running('hard', seed), 1, random()), 4, random());
      const s = shuffleRack(g, mulberry32(seed));
      expect(s.answer).toEqual(g.answer);
      expect(s.rack[1]).toBe(g.rack[1]);
      expect(s.rack[4]).toBe(g.rack[4]);
      expect(sorted(s.rack.join(''))).toBe(sorted(g.rack.join('')));
      expect(s.word).toBe(g.word);
    }
  });

  it('with nothing placed it always gives another order, and never an accepted word (the word itself included)', () => {
    for (const level of LEVEL_IDS) {
      for (let seed = 0; seed < 300; seed++) {
        const g = running(level, seed);
        for (const random of [mulberry32(seed + 1000), () => 0]) {
          const s = shuffleRack(g, random);
          expect(s.rack).not.toEqual(g.rack);
          expect(isAccepted(s.rack.join(''))).toBe(false);
        }
      }
    }
  });

  it('with tiles placed it always gives another order of the free tiles, unless they are all the same letter', () => {
    for (const level of LEVEL_IDS) {
      for (let seed = 0; seed < 300; seed++) {
        const g = place(place(running(level, seed), 0, random()), 1, random());
        const free = g.rack.slice(2);
        const s = shuffleRack(g, seed % 2 ? mulberry32(seed) : () => 0);
        if (new Set(free).size === 1) expect(s.rack).toEqual(g.rack);
        else expect(s.rack).not.toEqual(g.rack);
        expect(s.rack.slice(0, 2)).toEqual(g.rack.slice(0, 2));
      }
    }
  });

  it('with one tile left in the rack there is nothing to reorder', () => {
    const g = [0, 1, 2, 3].reduce((acc, i) => place(acc, i, random()), running());
    expect(shuffleRack(g, random())).toEqual(g);
  });
});

describe('checking', () => {
  it('spelling the word counts it: solved + 1, the next word comes at once with an empty answer row', () => {
    const g = running();
    const done = spell(g, g.word);
    expect(done.status).toBe('running');
    expect(done.solved).toBe(1);
    expect(done.word).not.toBe(g.word);
    expect(done.used).toEqual([g.word, done.word]);
    expect(done.answer).toEqual([null, null, null, null, null]);
    expect(isAccepted(done.rack.join(''))).toBe(false);
    expect(sorted(done.rack.join(''))).toBe(sorted(done.word));
    expect(done.skips).toBe(0);
  });

  it('any accepted anagram counts, not only the picked word', () => {
    const g = on(twin.word);
    const done = spell(g, twin.other);
    expect(done.solved).toBe(1);
    expect(done.used[0]).toBe(twin.word);
    expect(done.word).not.toBe(twin.word);
  });

  it('a full answer that is not a word stays: the letters keep their place and isWrong is true', () => {
    const g = running();
    // The rack order itself is never a word.
    const wrong = [0, 1, 2, 3, 4].reduce((acc, i) => place(acc, i, random()), g);
    expect(wrong.solved).toBe(0);
    expect(wrong.word).toBe(g.word);
    expect(wrong.answer).toEqual([0, 1, 2, 3, 4]);
    expect(isWrong(wrong)).toBe(true);
    expect(isWrong(g)).toBe(false);
    expect(isWrong(place(g, 0, random()))).toBe(false);
  });

  it('a wrong answer can be cleared and the word spelled again', () => {
    const g = running();
    const wrong = [0, 1, 2, 3, 4].reduce((acc, i) => place(acc, i, random()), g);
    expect(place(wrong, 0, random())).toBe(wrong); // nothing left to place
    const cleared = clear(wrong);
    expect(isWrong(cleared)).toBe(false);
    expect(spell(cleared, g.word).solved).toBe(1);
  });

  it('taking a letter out of a wrong answer and putting the same one back checks again and leaves it wrong', () => {
    const wrong = [0, 1, 2, 3, 4].reduce((acc, i) => place(acc, i, random()), running());
    const hole = unplace(wrong, 2);
    expect(hole.answer).toEqual([0, 1, null, 3, 4]);
    expect(isWrong(hole)).toBe(false);
    const again = place(hole, 2, random());
    expect(again.answer).toEqual(wrong.answer);
    expect(isWrong(again)).toBe(true);
  });

  // Two letters of the target swapped (positions a and b of the 5).
  const swapAt = (w: string, a: number, b: number) =>
    [...w].map((c, k) => (k === a ? w[b] : k === b ? w[a] : c)).join('');
  const holePair = (target: string) =>
    [
      [1, 2],
      [2, 3],
      [1, 3],
    ].find(([a, b]) => target[a] !== target[b] && !isAccepted(swapAt(target, a, b)));

  it.each([
    ['the picked word', 'plate', 'plate'],
    ['another accepted anagram', twin.word, twin.other],
  ])('a wrong answer is fixed through holes in the middle: %s', (_name, word, target) => {
    const [a, b] = holePair(target) as number[];
    const wrong = spell(on(word), swapAt(target, a, b));
    expect(isWrong(wrong)).toBe(true);
    const holes = unplace(unplace(wrong, a), b);
    expect(holes.answer.filter((k) => k === null)).toHaveLength(2);
    const fixed = spell(holes, target[a] + target[b]); // the second tap fills the last hole, which is not the last slot
    expect(fixed.solved).toBe(1);
    expect(fixed.word).not.toBe(word);
    expect(fixed.answer).toEqual([null, null, null, null, null]);
  });

  it('a wrong answer is fixed through holes at the ends, and through a hole at the start', () => {
    const swapped = spell(on('plate'), 'elatp'); // the first and the last swapped
    expect(isWrong(swapped)).toBe(true);
    const ends = spell(unplace(unplace(swapped, 0), 4), 'pe');
    expect(ends.solved).toBe(1);
    const start = spell(on('plate'), 'lpate'); // the first two swapped
    expect(isWrong(start)).toBe(true);
    expect(spell(unplace(unplace(start, 0), 1), 'pl').solved).toBe(1);
  });

  it('solved words add up and no word repeats in a round', () => {
    const r = mulberry32(11);
    let g = running('easy', 11);
    for (let k = 0; k < 40; k++) g = spell(g, g.word, r);
    expect(g.solved).toBe(40);
    expect(g.used).toHaveLength(41);
    expect(new Set(g.used).size).toBe(41);
  });
});

describe('skip', () => {
  it('costs 5 s, counts no word, shows the skipped word and brings the next one', () => {
    const g = running();
    const s = skip(g, 10_000, random());
    expect(s.skips).toBe(1);
    expect(remainingMs(s, 10_000)).toBe(45_000);
    expect(s.solved).toBe(0);
    expect(s.revealed).toBe(g.word);
    expect(s.word).not.toBe(g.word);
    expect(s.used).toEqual([g.word, s.word]);
    expect(s.answer).toEqual([null, null, null, null, null]);
    expect(s.status).toBe('running');
  });

  it('drops the letters placed so far', () => {
    const s = skip(place(running(), 0, random()), 0, random());
    expect(s.answer).toEqual([null, null, null, null, null]);
  });

  it('a skip that uses up the countdown shows the solution and picks no next word; endReveal then ends the round', () => {
    const g = place(running(), 0, random());
    const s = skip(g, 56_000, random());
    expect(s.status).toBe('running');
    expect(s.revealed).toBe(g.word);
    expect(s.word).toBe(g.word);
    expect(s.used).toEqual([g.word]);
    expect(s.answer).toEqual([null, null, null, null, null]);
    expect(s.skips).toBe(1);
    expect(s.solved).toBe(0);
    expect(remainingMs(s, 56_000)).toBe(0);
    const over = endReveal(s, 57_000);
    expect(over.status).toBe('over');
    expect(over.revealed).toBeNull();
    expect(over.solved).toBe(0);
  });

  it('with exactly 5 s left the skip reveals and then ends the round, with a little more it moves on', () => {
    const last = skip(running(), 55_000, random());
    expect(last.revealed).not.toBeNull();
    expect(last.word).toBe(running().word);
    expect(endReveal(last, 55_000).status).toBe('over');
    const more = skip(running(), 54_999, random());
    expect(more.word).not.toBe(running().word);
    expect(endReveal(more, 54_999).status).toBe('running');
  });

  it('many skips never repeat a word', () => {
    const r = mulberry32(4);
    let g = running('easy', 4);
    for (let k = 0; k < 100; k++) g = endReveal({ ...skip(g, 0, r), skips: 0 }, 0); // skips reset: they would end the round
    expect(g.used).toHaveLength(101);
    expect(new Set(g.used).size).toBe(101);
  });
});

describe('canAct', () => {
  it('is true only in a running round with nothing revealed', () => {
    const g = running();
    expect(canAct(g)).toBe(true);
    expect(canAct(skip(g, 0, random()))).toBe(false);
    expect(canAct(pause(g))).toBe(false);
    expect(canAct(newRound('normal', random()))).toBe(false);
    expect(canAct({ ...g, status: 'over' })).toBe(false);
  });
});

describe('revealed', () => {
  it('ignores taps and skips until endReveal', () => {
    const s = skip(running(), 0, random());
    expect(place(s, 0, random())).toBe(s);
    expect(unplace(s, 0)).toBe(s);
    expect(clear(s)).toBe(s);
    expect(shuffleRack(s, random())).toBe(s);
    expect(skip(s, 0, random())).toBe(s);
  });

  it('endReveal clears the solution and the taps work again', () => {
    const s = endReveal(skip(running(), 0, random()), 1_000);
    expect(s.revealed).toBeNull();
    expect(s.status).toBe('running');
    expect(place(s, 0, random()).answer[0]).toBe(0);
  });

  it('endReveal does nothing when nothing is revealed', () => {
    const g = running();
    expect(endReveal(g, 0)).toBe(g);
    expect(endReveal(g, 99_000)).toBe(g); // ending the round is tick's job
  });

  it('tick does nothing while a solution shows, even at 0:00; endReveal then ends the round', () => {
    const s = skip(running(), 0, random());
    expect(tick(s, 55_000)).toBe(s);
    expect(tick(s, 99_000)).toBe(s);
    const over = endReveal(s, 55_000);
    expect(over.status).toBe('over');
    expect(over.revealed).toBeNull();
    expect(endReveal(over, 55_000)).toBe(over);
  });

  it('pausing during the solution of the last skip clears it; continuing at 0:00 ends the round on the next tick', () => {
    const s = skip(running(), 56_000, random());
    const back = resume(pause(s));
    expect(back.revealed).toBeNull();
    expect(back.status).toBe('running');
    expect(tick(back, 56_000).status).toBe('over');
  });
});

describe('tick', () => {
  it('leaves the round alone while there is time', () => {
    const g = running();
    expect(tick(g, 0)).toBe(g);
    expect(tick(g, 59_999)).toBe(g);
  });

  it('ends the round at 0:00', () => {
    expect(tick(running(), 60_000).status).toBe('over');
    expect(tick(running(), 70_000).status).toBe('over');
  });

  it('counts the skips: a round with one skip ends 5 s early', () => {
    const g = { ...running(), skips: 1 };
    expect(tick(g, 54_999)).toBe(g);
    expect(tick(g, 55_000).status).toBe('over');
  });

  it('an ended round keeps its score', () => {
    const g = running();
    const done = spell(g, g.word);
    const over = tick(done, 60_000);
    expect(over.solved).toBe(1);
  });

  it('does nothing in a ready or paused round', () => {
    const ready = newRound('easy', random());
    expect(tick(ready, 99_000)).toBe(ready);
    const p = pause(running());
    expect(tick(p, 99_000)).toBe(p);
  });
});

describe('no-ops', () => {
  const ready = newRound('normal', mulberry32(1));
  const paused = pause(running());
  const over = tick(running(), 60_000);
  const everything = (g: Game) => [
    place(g, 0, random()),
    unplace(g, 0),
    clear(g),
    shuffleRack(g, random()),
    skip(g, 0, random()),
    endReveal(g, 0),
    tick(g, 0),
  ];

  it.each<[string, Game]>([
    ['a ready round', ready],
    ['a paused round', paused],
  ])('every action leaves %s unchanged (except start and resume)', (_name, g) => {
    for (const next of everything(g)) expect(next).toBe(g);
  });

  it('a finished round never changes, whatever is done to it', () => {
    expect(over.status).toBe('over');
    for (const next of [...everything(over), start(over), pause(over), resume(over), tick(over, 99_000)]) {
      expect(next).toBe(over);
    }
  });

  it('a finished round after a wrong answer keeps it too', () => {
    const wrong = [0, 1, 2, 3, 4].reduce((acc, i) => place(acc, i, random()), running());
    const done = tick(wrong, 60_000);
    expect(done.answer).toEqual([0, 1, 2, 3, 4]);
    expect(unplace(done, 0)).toBe(done);
    expect(isWrong(done)).toBe(false); // only while running
  });
});
