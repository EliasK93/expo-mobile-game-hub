import { GameRoute } from '@/components/game-route';
import { MinesweeperScreen } from '@/games/minesweeper/ui/minesweeper-screen';

export default function MinesweeperRoute() {
  return (
    <GameRoute id="minesweeper">
      <MinesweeperScreen />
    </GameRoute>
  );
}
