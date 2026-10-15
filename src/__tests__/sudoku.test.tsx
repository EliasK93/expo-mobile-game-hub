import { fireEvent, renderRouter, screen } from 'expo-router/testing-library';

import { parseGrid } from '@/games/sudoku/logic/board';
import { generate } from '@/games/sudoku/logic/generate';

// The real generator is replaced by a fixed puzzle with two empty cells: row 1 column 1 (answer 5) and row 9 column 9 (answer 9).
jest.mock('@/games/sudoku/logic/generate', () => ({ generate: jest.fn() }));

const SOLUTION = parseGrid('534678912672195348198342567859761423426853791713924856961537284287419635345286179');
const PUZZLE = parseGrid('.3467891267219534819834256785976142342685379171392485696153728428741963534528617.');

const FIRST_EMPTY = 'Row 1, column 1, empty';
const LAST_EMPTY = 'Row 9, column 9, empty';

const enter = (digit: number) => fireEvent.press(screen.getByLabelText(`Enter ${digit}`));

beforeEach(() => {
  (generate as jest.Mock).mockReset().mockReturnValue({ puzzle: PUZZLE, solution: SOLUTION });
  renderRouter('./src/app', { initialUrl: '/sudoku' });
});

describe('Sudoku screen', () => {
  it('shows 81 cells', () => {
    expect(screen.getAllByLabelText(/^Row \d, column \d, /)).toHaveLength(81);
    expect(screen.getByLabelText(FIRST_EMPTY)).toBeTruthy();
  });

  it('does not change a given cell', () => {
    fireEvent.press(screen.getByLabelText('Row 1, column 2, 3, given'));
    enter(9);

    expect(screen.getByLabelText('Row 1, column 2, 3, given')).toBeTruthy();
  });

  it('shows a digit entered in an empty cell, and erase clears it', () => {
    fireEvent.press(screen.getByLabelText(FIRST_EMPTY));
    enter(5);
    expect(screen.getByLabelText('Row 1, column 1, 5')).toBeTruthy();

    fireEvent.press(screen.getByLabelText('Erase'));
    expect(screen.getByLabelText(FIRST_EMPTY)).toBeTruthy();
  });

  it('does not win with a wrong digit', () => {
    fireEvent.press(screen.getByLabelText(FIRST_EMPTY));
    enter(5);
    fireEvent.press(screen.getByLabelText(LAST_EMPTY));
    enter(8);

    expect(screen.queryByText('Solved!')).toBeNull();
  });

  it('shows Solved! when the last cell is filled correctly, and locks the grid', () => {
    fireEvent.press(screen.getByLabelText(FIRST_EMPTY));
    enter(5);
    fireEvent.press(screen.getByLabelText(LAST_EMPTY));
    enter(9);

    expect(screen.getByText('Solved!')).toBeTruthy();

    fireEvent.press(screen.getByLabelText('Row 1, column 1, 5'));
    enter(1);
    expect(screen.getByLabelText('Row 1, column 1, 5')).toBeTruthy();
  });

  it('New game generates another puzzle and resets the board', () => {
    fireEvent.press(screen.getByLabelText(FIRST_EMPTY));
    enter(5);
    expect(generate).toHaveBeenCalledTimes(1);

    fireEvent.press(screen.getByText('New game'));

    expect(generate).toHaveBeenCalledTimes(2);
    expect(screen.getByLabelText(FIRST_EMPTY)).toBeTruthy();
  });
});

describe('Notes', () => {
  it('adds and removes a pencil mark while Notes is on', () => {
    fireEvent.press(screen.getByLabelText(FIRST_EMPTY));
    fireEvent.press(screen.getByLabelText('Notes'));
    expect(screen.getByLabelText('Notes').props.accessibilityState.selected).toBe(true);

    enter(5);
    expect(screen.getByLabelText('Row 1, column 1, notes 5')).toBeTruthy();

    enter(5);
    expect(screen.getByLabelText(FIRST_EMPTY)).toBeTruthy();
  });

  it('ignores notes on a given cell and on a filled cell', () => {
    fireEvent.press(screen.getByLabelText('Notes'));
    fireEvent.press(screen.getByLabelText('Row 1, column 2, 3, given'));
    enter(5);
    expect(screen.getByLabelText('Row 1, column 2, 3, given')).toBeTruthy();

    fireEvent.press(screen.getByLabelText('Notes')); // off
    fireEvent.press(screen.getByLabelText(FIRST_EMPTY));
    enter(5);
    fireEvent.press(screen.getByLabelText('Notes')); // on
    enter(7);
    expect(screen.getByLabelText('Row 1, column 1, 5')).toBeTruthy();
  });

  it('placing a digit removes that note from the peers, and Undo brings it back', () => {
    // Three empty cells: row 1 columns 1 and 2 are peers, row 9 column 9 is not.
    screen.unmount();
    (generate as jest.Mock).mockReturnValue({ puzzle: PUZZLE.map((v, i) => (i === 1 ? 0 : v)), solution: SOLUTION });
    renderRouter('./src/app', { initialUrl: '/sudoku' });

    fireEvent.press(screen.getByLabelText('Notes'));
    fireEvent.press(screen.getByLabelText('Row 1, column 2, empty'));
    enter(5);
    enter(7);
    expect(screen.getByLabelText('Row 1, column 2, notes 5 7')).toBeTruthy();

    fireEvent.press(screen.getByLabelText('Notes')); // off
    fireEvent.press(screen.getByLabelText(FIRST_EMPTY));
    enter(5);
    expect(screen.getByLabelText('Row 1, column 2, notes 7')).toBeTruthy();

    fireEvent.press(screen.getByLabelText('Undo'));
    expect(screen.getByLabelText('Row 1, column 2, notes 5 7')).toBeTruthy();
    expect(screen.getByLabelText(FIRST_EMPTY)).toBeTruthy();
  });
});

describe('Conflicts', () => {
  it('marks a clashing digit and the given it clashes with, not a clean digit', () => {
    fireEvent.press(screen.getByLabelText(FIRST_EMPTY));
    enter(3);
    expect(screen.getByLabelText('Row 1, column 1, 3, conflict')).toBeTruthy();
    expect(screen.getByLabelText('Row 1, column 2, 3, given, conflict')).toBeTruthy();

    enter(5);
    expect(screen.getByLabelText('Row 1, column 1, 5')).toBeTruthy();
    expect(screen.getByLabelText('Row 1, column 2, 3, given')).toBeTruthy();
  });
});

describe('Undo and Redo', () => {
  const state = (label: string) => screen.getByLabelText(label).props.accessibilityState;

  it('are disabled on a fresh game', () => {
    expect(state('Undo').disabled).toBe(true);
    expect(state('Redo').disabled).toBe(true);
  });

  it('undo removes the last digit and redo puts it back', () => {
    fireEvent.press(screen.getByLabelText(FIRST_EMPTY));
    enter(5);
    expect(state('Undo').disabled).toBe(false);

    fireEvent.press(screen.getByLabelText('Undo'));
    expect(screen.getByLabelText(FIRST_EMPTY)).toBeTruthy();
    expect(state('Redo').disabled).toBe(false);

    fireEvent.press(screen.getByLabelText('Redo'));
    expect(screen.getByLabelText('Row 1, column 1, 5')).toBeTruthy();
  });

  it('undo steps back through notes and erasing', () => {
    fireEvent.press(screen.getByLabelText(FIRST_EMPTY));
    fireEvent.press(screen.getByLabelText('Notes'));
    enter(4);
    fireEvent.press(screen.getByLabelText('Notes'));
    enter(5);
    fireEvent.press(screen.getByLabelText('Erase'));
    expect(screen.getByLabelText(FIRST_EMPTY)).toBeTruthy();

    fireEvent.press(screen.getByLabelText('Undo')); // the erase
    expect(screen.getByLabelText('Row 1, column 1, 5')).toBeTruthy();
    fireEvent.press(screen.getByLabelText('Undo')); // the digit
    expect(screen.getByLabelText('Row 1, column 1, notes 4')).toBeTruthy();
  });

  it('are disabled after a win, and pressing Undo changes nothing', () => {
    fireEvent.press(screen.getByLabelText(FIRST_EMPTY));
    enter(5);
    fireEvent.press(screen.getByLabelText(LAST_EMPTY));
    enter(9);
    expect(screen.getByText('Solved!')).toBeTruthy();

    expect(state('Undo').disabled).toBe(true);
    expect(state('Redo').disabled).toBe(true);
    fireEvent.press(screen.getByLabelText('Undo'));
    expect(screen.getByLabelText('Row 9, column 9, 9')).toBeTruthy();
  });

  it('New game clears the history', () => {
    fireEvent.press(screen.getByLabelText(FIRST_EMPTY));
    enter(5);
    expect(state('Undo').disabled).toBe(false);

    fireEvent.press(screen.getByText('New game'));
    expect(state('Undo').disabled).toBe(true);
    expect(state('Redo').disabled).toBe(true);
  });
});
