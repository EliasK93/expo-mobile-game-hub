import { GameRoute } from '@/components/game-route';
import { SudokuScreen } from '@/games/sudoku/ui/sudoku-screen';

export default function SudokuRoute() {
  return (
    <GameRoute id="sudoku">
      <SudokuScreen />
    </GameRoute>
  );
}
