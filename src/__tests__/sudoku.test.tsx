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
