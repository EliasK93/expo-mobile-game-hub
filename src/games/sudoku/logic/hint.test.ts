import { parseGrid } from './board';
import { nextHint } from './hint';
import { mulberry32 } from '@/lib/random';
import { setValue, type Game } from './game';
import { candidateGrid, findStep } from './techniques';

const PUZZLE = '530070000600195000098000060800060003400803001700020006060000280000419005000080079';
const SOLUTION = '534678912672195348198342567859761423426853791713924856961537284287419635345286179';

// [puzzle, solution] from the rate tests, levels 1 to 5.
const KNOWN: [string, string][] = [
  [
    '009400500020500097300280000000360005000070900003002001060000000000000208001900003',
    '619437582428516397375289416197364825286175934543892761862743159934651278751928643',
  ],
  [
    '700000000000208036040003000010040080306000500000002000407100600080000100001387020',
    '723614895159278436648953217215746389376891542894532761437129658982465173561387924',
  ],
  [
    '200004006000900280600000070050010020900400000700620530070003108000001000300200000',
    '237184956145967283698352471853719624926435817714628539472593168569871342381246795',
  ],
  [
    '300008204900002036000030901009070500000824009080091060012005000700610000030040000',
    '371968254948152736256437981129376548563824179487591362612785493794613825835249617',
  ],
  [
    '080079100000004602000100050300050700060300500005000009009003000006000090510000806',
    '682579143951834672743162958398251764467398521125746389279683415836415297514927836',
  ],
];

// Mid-solve states (values, solution) where no single is left, so the hint has to cross out candidates first.
const NEEDS_ELIMINATION = [
  {
    values: '008012503501000080320785001000901050050800100100250908005108000006520807000076005',
    solution: '678412593541693782329785641287961354954837126163254978735148269416529837892376415',
    first: 'pointing',
    technique: 'hidden-single-line',
    cell: 62,
    digit: 9,
  },
  {
    values: '400209175070430089900010040000000956627090418859641020000950800060170090090004001',
    solution: '436289175571436289982517643143728956627395418859641327714953862368172594295864731',
    first: 'pointing',
    technique: 'naked-single',
    cell: 19,
    digit: 8,
  },
  {
    values: '458236917317954628926781400870423006240675380563198742695840000184360000732519864',
    solution: '458236917317954628926781435871423596249675381563198742695842173184367259732519864',
    first: 'xy-wing',
    technique: 'naked-single',
    cell: 69,
    digit: 2,
  },
];

describe('nextHint', () => {
  it('on the classic puzzle gives a placement that matches the solution', () => {
    const values = parseGrid(PUZZLE);
    const solution = parseGrid(SOLUTION);
    const hint = nextHint(values, solution)!;
    expect(hint).not.toBeNull();
    expect(values[hint.cell]).toBe(0);
    expect(hint.digit).toBe(solution[hint.cell]);
    expect(hint.cells).toContain(hint.cell);
    expect(hint.explanation).toContain(hint.label);
    expect(['full-house', 'hidden-single-box', 'naked-single', 'hidden-single-line']).toContain(hint.technique);
  });

  it.each(NEEDS_ELIMINATION)(
    'crosses out candidates first when no single is left: $first, then $technique at cell $cell',
    ({ values, solution, first, technique, cell, digit }) => {
      const v = parseGrid(values);
      const s = parseGrid(solution);
      const prep = findStep(v, candidateGrid(v))!; // the elimination step the hint has to use
      expect(prep.technique).toBe(first);
      expect(prep.placements).toEqual([]);

      const hint = nextHint(v, s)!;
      expect(hint.technique).toBe(technique);
      expect(hint.cell).toBe(cell);
      expect(hint.digit).toBe(digit);
      // highlights: the cell it names and the cells of the elimination step it needed
      for (const c of [cell, ...prep.cells]) expect(hint.cells).toContain(c);
      // the explanation names the deciding technique and what it needed first
      expect(hint.explanation).toContain(hint.label);
      expect(hint.explanation).toContain(prep.label);
    },
  );

  it('reports a wrong digit first, and applying it erases the digit', () => {
    const values = [...parseGrid(PUZZLE)];
    values[2] = 1; // should be 4; clashes with nothing, so only the solution shows it is wrong
    const hint = nextHint(values, parseGrid(SOLUTION))!;
    expect(hint).toMatchObject({
      technique: 'wrong-digit',
      cell: 2,
      digit: 0,
      cells: [2],
      explanation: 'This 1 is wrong.',
    });

    const game: Game = { puzzle: parseGrid(PUZZLE), solution: parseGrid(SOLUTION), values, notes: Array(81).fill(0) };
    const after = setValue(game, hint.cell, hint.digit);
    expect(after.values[2]).toBe(0);
  });

  it('names the first wrong digit when there are several, even though a correct single is also available', () => {
    const values = [...parseGrid(PUZZLE)];
    values[80 - 1] = 1; // a wrong digit late on the board
    values[2] = 1; // and an earlier one
    const hint = nextHint(values, parseGrid(SOLUTION))!;
    expect(hint.technique).toBe('wrong-digit');
    expect(hint.cell).toBe(2);
  });

  it('is null on a solved board and when the ladder is stuck', () => {
    expect(nextHint(parseGrid(SOLUTION), parseGrid(SOLUTION))).toBeNull();
    expect(nextHint(new Array<number>(81).fill(0), parseGrid(SOLUTION))).toBeNull();
  });

  it('does not change the board it is given', () => {
    const values = parseGrid(NEEDS_ELIMINATION[0].values);
    const before = [...values];
    nextHint(values, parseGrid(NEEDS_ELIMINATION[0].solution));
    expect([...values]).toEqual(before);
  });

  // Apply must always work: following the hints (and erasing wrong digits) solves every puzzle, one setValue at a time.
  it.each(KNOWN.map(([p, s], i) => [i + 1, p, s] as const))(
    'level %i puzzle: applying every hint solves it',
    (_level, puzzle, solution) => {
      let game: Game = {
        puzzle: parseGrid(puzzle),
        solution: parseGrid(solution),
        values: parseGrid(puzzle),
        notes: Array(81).fill(0),
      };
      for (let n = 0; n < 81; n++) {
        if (game.values.every((v) => v !== 0)) break;
        if (n === 3) game = setValue(game, game.values.indexOf(0), (game.solution[game.values.indexOf(0)] % 9) + 1); // a wrong entry
        const hint = nextHint(game.values, game.solution);
        expect(hint).not.toBeNull();
        const next = setValue(game, hint!.cell, hint!.digit);
        expect(next).not.toBe(game); // the hint always changes the board
        game = next;
      }
      expect([...game.values]).toEqual([...game.solution]);
    },
  );

  // The player may fill in any correct digits before asking: a hint must still exist.
  it.each(KNOWN.map(([p, s], i) => [i + 1, p, s] as const))(
    'level %i puzzle: a hint exists after any correct progress',
    (_level, puzzle, solution) => {
      const random = mulberry32(42);
      const sol = parseGrid(solution);
      for (let trial = 0; trial < 6; trial++) {
        const values = [...parseGrid(puzzle)];
        values.forEach((v, i) => {
          if (v === 0 && random() < 0.1 * trial) values[i] = sol[i];
        });
        if (values.every((v) => v !== 0)) continue;
        const hint = nextHint(values, sol);
        expect(hint).not.toBeNull();
        expect(hint!.digit).toBe(sol[hint!.cell]);
        expect(values[hint!.cell]).toBe(0);
      }
    },
  );
});
