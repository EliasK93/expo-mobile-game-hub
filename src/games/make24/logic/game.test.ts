import { frac } from './fraction';
import {
  LEVEL_IDS,
  giveUp,
  hint,
  isPuzzle,
  isStarted,
  message,
  newGame,
  replay,
  tapCard,
  tapOperator,
  undo,
  type Game,
} from './game';
import { solution, type Op, type Step } from './solve';

const M = '−'; // the minus sign, not a hyphen

// Taps in order: a number is a card's place, an operator is the operator button.
const play = (game: Game, ...actions: (number | Op)[]): Game =>
  actions.reduce<Game>((g, a) => (typeof a === 'number' ? tapCard(g, a) : tapOperator(g, a)), game);

// 3 3 8 8 sits on places 0 1 2 3. Solved by 8 ÷ 3, then 3 − 8/3, then 8 ÷ 1/3.
const fresh = () => newGame('hard', [8, 3, 8, 3]);
const FIRST_STEP: (number | Op)[] = [2, '/', 0];
const SOLVE: (number | Op)[] = [...FIRST_STEP, 1, '-', 0, 3, '/', 0];
const solved = () => play(fresh(), ...SOLVE);
const gaveUp = () => giveUp(fresh());

// 1 1 5 13: 1 − 1 = 0 on place 1, then 5 ÷ 0 is the division by 0.
const zeroGame = () => play(newGame('easy', [1, 1, 5, 13]), 0, '-', 1);
// 1 3 8 13: places 1 and 2 hold the 3 and the 8 for the 8 − 3 / 3 − 8 and 8 ÷ 3 / 3 ÷ 8 checks.
const four = () => newGame('easy', [1, 3, 8, 13]);

describe('levels and puzzles', () => {
  it('has the levels Easy, Medium, Hard', () => {
    expect([...LEVEL_IDS]).toEqual(['easy', 'medium', 'hard']);
  });

  it('isPuzzle takes four whole numbers from 1 to 13, in any order', () => {
    expect(isPuzzle([1, 2, 3, 4])).toBe(true);
    expect(isPuzzle([13, 13, 13, 13])).toBe(true);
    expect(isPuzzle([8, 3, 8, 3])).toBe(true);
  });

  it.each<[string, unknown]>([
    ['not an array', 'x'],
    ['null', null],
    ['three numbers', [1, 2, 3]],
    ['five numbers', [1, 2, 3, 4, 5]],
    ['a 0', [0, 1, 2, 3]],
    ['a 14', [1, 2, 3, 14]],
    ['a fraction', [1, 2, 3, 1.5]],
    ['a string', [1, 2, 3, '4']],
    ['a negative number', [-1, 2, 3, 4]],
  ])('isPuzzle rejects %s', (_name, v) => {
    expect(isPuzzle(v)).toBe(false);
  });
});

describe('newGame', () => {
  it('starts a playing game with the numbers sorted ascending on four cards', () => {
    expect(fresh()).toEqual({
      level: 'hard',
      numbers: [3, 3, 8, 8],
      cards: [frac(3), frac(3), frac(8), frac(8)],
      steps: [],
      selected: null,
      operator: null,
      hints: 0,
      note: null,
      status: 'playing',
    });
  });

  it('sorts a copy: the numbers it is given stay as they were', () => {
    const numbers = [8, 3, 8, 3];
    newGame('hard', numbers);
    expect(numbers).toEqual([8, 3, 8, 3]);
  });
});

describe('tapCard', () => {
  it('selects a card when nothing is selected', () => {
    const g = tapCard(fresh(), 2);
    expect(g.selected).toBe(2);
    expect(g.cards).toEqual(fresh().cards);
  });

  it('deselects the selected card, and the operator goes with it', () => {
    expect(tapCard(tapCard(fresh(), 2), 2).selected).toBeNull();
    const withOperator = play(fresh(), 2, '+');
    expect(withOperator.operator).toBe('+');
    const back = tapCard(withOperator, 2);
    expect(back.selected).toBeNull();
    expect(back.operator).toBeNull();
  });

  it('switches the selection to another card while no operator is chosen', () => {
    expect(play(fresh(), 2, 0).selected).toBe(0);
  });

  it("combines selected, operator, tapped: the result takes the second card's place and stays selected", () => {
    const g = play(fresh(), ...FIRST_STEP);
    expect(g.cards).toEqual([frac(8, 3), frac(3), null, frac(8)]);
    expect(g.steps).toEqual([{ first: 2, second: 0, op: '/' }]);
    expect(g.selected).toBe(0);
    expect(g.operator).toBeNull();
    expect(g.status).toBe('playing');
  });

  it('continues from the result: the next combine can use it as the first card', () => {
    const g = play(fresh(), ...FIRST_STEP, '-', 1); // 8/3 − 3
    expect(g.cards).toEqual([null, frac(-1, 3), null, frac(8)]);
    expect(g.selected).toBe(1);
  });

  it('keeps hints and clears the note when it combines', () => {
    const g = play(hint(fresh()), ...FIRST_STEP);
    expect(g.hints).toBe(1);
    expect(g.note).toBeNull();
  });

  it('does nothing on an empty place or a place that does not exist', () => {
    const g = play(fresh(), ...FIRST_STEP);
    expect(tapCard(g, 2)).toBe(g);
    expect(tapCard(g, 7)).toBe(g);
    expect(tapCard(g, -1)).toBe(g);
  });

  it('refuses to divide by 0: the cards stay, the note is set, selection and operator stay', () => {
    const before = zeroGame();
    expect(before.cards).toEqual([null, frac(0), frac(5), frac(13)]);
    const g = play(before, 2, '/', 1);
    expect(g.cards).toEqual(before.cards);
    expect(g.steps).toEqual(before.steps);
    expect(g.note).toEqual({ kind: 'divideByZero' });
    expect(g.selected).toBe(2);
    expect(g.operator).toBe('/');
    expect(message(g)).toEqual({ text: "Can't divide by 0", error: true });
  });

  it('divide by 0 only refuses a zero divisor: 0 ÷ 5 is fine', () => {
    const g = play(zeroGame(), '/', 2); // the 0 is already selected after 1 − 1
    expect(g.cards).toEqual([null, null, frac(0), frac(13)]);
    expect(g.note).toBeNull();
  });

  it('the next change clears the divide-by-0 note', () => {
    const refused = play(zeroGame(), 2, '/', 1);
    expect(tapOperator(refused, '*').note).toBeNull();
    expect(tapCard(refused, 2).note).toBeNull();
    expect(tapCard(refused, 2).hints).toBe(0);
  });

  it('solves 3 3 8 8 by taps: one card left and it is 24', () => {
    const g = solved();
    expect(g.status).toBe('solved');
    expect(g.cards).toEqual([frac(24), null, null, null]);
    expect(g.steps).toHaveLength(3);
    expect(message(g)).toBeNull();
  });
});

describe('subtraction and division go first op second', () => {
  it('8 − 3 and 3 − 8', () => {
    expect(play(four(), 2, '-', 1).cards[1]).toEqual(frac(5));
    expect(play(four(), 1, '-', 2).cards[2]).toEqual(frac(-5));
  });

  it('8 ÷ 3 and 3 ÷ 8', () => {
    expect(play(four(), 2, '/', 1).cards[1]).toEqual(frac(8, 3));
    expect(play(four(), 1, '/', 2).cards[2]).toEqual(frac(3, 8));
  });

  it('+ and × give the same either way', () => {
    expect(play(four(), 2, '+', 1).cards[1]).toEqual(play(four(), 1, '+', 2).cards[2]);
    expect(play(four(), 2, '*', 1).cards[1]).toEqual(frac(24));
  });
});

describe('tapOperator', () => {
  it('selects an operator while a card is selected, switches to another, and a second tap deselects it', () => {
    const g = tapCard(fresh(), 0);
    expect(tapOperator(g, '+').operator).toBe('+');
    expect(play(g, '+', '*').operator).toBe('*');
    expect(play(g, '+', '+').operator).toBeNull();
  });

  it('does nothing while no card is selected', () => {
    const g = fresh();
    expect(tapOperator(g, '+')).toBe(g);
  });
});

describe('undo', () => {
  it('goes back one step at a time: the cards return, selection and operator are cleared', () => {
    const one = play(fresh(), ...FIRST_STEP);
    const two = play(one, 1, '-', 0);
    expect(undo(two)).toEqual({ ...one, selected: null, operator: null });
    expect(undo(undo(two))).toEqual(fresh());
  });

  it('is the same game at the start, selection and all', () => {
    const g = fresh();
    expect(undo(g)).toBe(g);
    const picked = tapCard(g, 1);
    expect(undo(picked)).toBe(picked);
  });

  it('keeps the hints', () => {
    const g = undo(play(hint(fresh()), ...FIRST_STEP));
    expect(g.hints).toBe(1);
    expect(g.steps).toEqual([]);
    expect(g.note).toBeNull();
  });

  it('works after a combine that ended not at 24, back through every step', () => {
    let g = play(newGame('easy', [2, 2, 2, 2]), 0, '+', 1, 2, '+', 1, 3, '+', 1);
    expect(g.cards).toEqual([null, frac(8), null, null]);
    expect(g.status).toBe('playing');
    g = undo(g);
    expect(g.cards).toEqual([null, frac(6), null, frac(2)]);
    g = undo(undo(g));
    expect(g).toEqual(newGame('easy', [2, 2, 2, 2]));
  });
});

describe('hint', () => {
  it('counts the hint and notes the next step with its values', () => {
    const g = hint(fresh());
    expect(g.hints).toBe(1);
    expect(g.note).toMatchObject({ kind: 'hint', step: { op: '/', a: frac(8), b: frac(3), result: frac(8, 3) } });
    expect(message(g)).toEqual({ text: 'Try 8 ÷ 3', error: false });
  });

  it('changes nothing else', () => {
    const g = play(fresh(), 1, '+');
    expect({ ...hint(g), hints: 0, note: null }).toEqual(g);
  });

  it('works from the current cards: after 8 ÷ 3 the next step is 3 − 8/3', () => {
    const g = hint(play(fresh(), ...FIRST_STEP));
    expect(message(g)).toEqual({ text: `Try 3 ${M} 8/3`, error: false });
  });

  it('counts every hint', () => {
    expect(hint(hint(fresh())).hints).toBe(2);
  });

  it("says the cards can't make 24 when they can't (3 + 3 first leaves 6 8 8)", () => {
    const g = play(fresh(), 0, '+', 1);
    expect(solution(g.cards)).toBeNull();
    const h = hint(g);
    expect(h.hints).toBe(1);
    expect(h.note).toEqual({ kind: 'hint', step: null });
    expect(message(h)).toEqual({ text: "These cards can't make 24, undo a step", error: false });
  });

  it("says it for a puzzle that can't make 24 from the start, too", () => {
    expect(message(hint(newGame('easy', [1, 1, 1, 1])))?.text).toBe("These cards can't make 24, undo a step");
  });

  it('the next change clears the note, and the hints stay counted', () => {
    const g = tapCard(hint(fresh()), 0);
    expect(g.note).toBeNull();
    expect(g.hints).toBe(1);
  });
});

describe('giveUp', () => {
  it('ends the game as given up, with the whole solution from the start as the message', () => {
    const g = gaveUp();
    expect(g.status).toBe('gaveUp');
    expect(message(g)).toEqual({ text: `8 ÷ 3 = 8/3 · 3 ${M} 8/3 = 1/3 · 8 ÷ 1/3 = 24`, error: false });
  });

  it('shows the solution from the start also when it is given up half way', () => {
    expect(message(giveUp(play(fresh(), 0, '+', 1)))).toEqual(message(gaveUp()));
  });

  it('clears a note that is showing', () => {
    expect(giveUp(hint(fresh())).note).toBeNull();
  });
});

describe('a finished game does not change', () => {
  it.each<[string, () => Game]>([
    ['solved', solved],
    ['given up', gaveUp],
  ])('every action returns the same game once %s', (_name, finished) => {
    const g = finished();
    expect(tapCard(g, 0)).toBe(g);
    expect(tapCard(g, 3)).toBe(g);
    expect(tapOperator(g, '+')).toBe(g);
    expect(undo(g)).toBe(g);
    expect(hint(g)).toBe(g);
    expect(giveUp(g)).toBe(g);
  });
});

describe('message', () => {
  it('is null on a fresh game and while cards are being combined', () => {
    expect(message(fresh())).toBeNull();
    expect(message(play(fresh(), ...FIRST_STEP))).toBeNull();
  });

  it("says what the last card is when it is not 24: That's 8, not 24", () => {
    const g = play(newGame('easy', [2, 2, 2, 2]), 0, '+', 1, 2, '+', 1, 3, '+', 1);
    expect(message(g)).toEqual({ text: "That's 8, not 24", error: true });
  });

  it("writes a fraction in the not-24 line: That's 8/3, not 24", () => {
    // 1 1 3 8: 8 ÷ 3, then 1 × 1, then 8/3 × 1
    const g = play(newGame('easy', [1, 1, 3, 8]), 3, '/', 2, 0, '*', 1, 2, '*', 1);
    expect(g.cards).toEqual([null, frac(8, 3), null, null]);
    expect(message(g)).toEqual({ text: "That's 8/3, not 24", error: true });
  });

  it("writes a negative with the minus sign in the not-24 line: That's −9, not 24", () => {
    // 1 2 3 4: 1 − 4 = −3, then 2 × 3 = 6, then −3 − 6
    const g = play(newGame('easy', [1, 2, 3, 4]), 0, '-', 3, 1, '*', 2, 3, '-', 2);
    expect(g.cards).toEqual([null, null, frac(-9), null]);
    expect(message(g)).toEqual({ text: `That's ${M}9, not 24`, error: true });
  });

  it('is null for a solved game', () => {
    expect(message(solved())).toBeNull();
  });
});

describe('isStarted', () => {
  it('is false for a new game and true after a combine', () => {
    expect(isStarted(fresh())).toBe(false);
    expect(isStarted(play(fresh(), ...FIRST_STEP))).toBe(true);
  });

  it('selecting a card or an operator is not starting', () => {
    expect(isStarted(play(fresh(), 2, '+'))).toBe(false);
  });

  it('is false again after undoing back to the start without a hint: a free skip', () => {
    expect(isStarted(undo(play(fresh(), ...FIRST_STEP)))).toBe(false);
  });

  it('is true after a hint, and stays true after undoing back to the start', () => {
    expect(isStarted(hint(fresh()))).toBe(true);
    expect(isStarted(undo(play(hint(fresh()), ...FIRST_STEP)))).toBe(true);
  });
});

describe('replay', () => {
  const STEPS: Step[] = [
    { first: 2, second: 0, op: '/' },
    { first: 1, second: 0, op: '-' },
    { first: 3, second: 0, op: '/' },
  ];

  it('rebuilds the game the taps made, selection of the last result included', () => {
    for (let n = 0; n <= 3; n++) {
      const live = play(fresh(), ...SOLVE.slice(0, n * 3));
      expect(replay('hard', [3, 3, 8, 8], STEPS.slice(0, n))).toEqual(live);
    }
  });

  it('ends solved when the last value is 24', () => {
    expect(replay('hard', [3, 3, 8, 8], STEPS)?.status).toBe('solved');
  });

  it('ends playing at the last value when it is not 24', () => {
    const g = replay(
      'easy',
      [2, 2, 2, 2],
      [
        { first: 0, second: 1, op: '+' },
        { first: 2, second: 1, op: '+' },
        { first: 3, second: 1, op: '+' },
      ],
    );
    expect(g?.status).toBe('playing');
    expect(g?.cards).toEqual([null, frac(8), null, null]);
  });

  it.each<[string, Step[]]>([
    ['a place past the last', [{ first: 4, second: 0, op: '+' }]],
    ['a negative place', [{ first: -1, second: 0, op: '+' }]],
    ['a place that is not a whole number', [{ first: 0.5, second: 1, op: '+' }]],
    ['an empty place as first', [STEPS[0], { first: 2, second: 1, op: '+' }]],
    ['an empty place as second', [STEPS[0], { first: 1, second: 2, op: '+' }]],
    ['the same place twice', [{ first: 1, second: 1, op: '+' }]],
    ['a fourth step', [...STEPS, { first: 0, second: 1, op: '+' }]],
    ['an unknown operator', [{ first: 0, second: 1, op: '^' as Op }]],
  ])('is null for %s', (_name, steps) => {
    expect(replay('hard', [3, 3, 8, 8], steps)).toBeNull();
  });

  it('is null for a division by 0', () => {
    const steps: Step[] = [
      { first: 0, second: 1, op: '-' },
      { first: 2, second: 1, op: '/' },
    ];
    expect(replay('easy', [1, 1, 5, 13], steps)).toBeNull();
  });
});
