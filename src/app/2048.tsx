import { GameRoute } from '@/components/game-route';
import { Game2048Screen } from '@/games/2048/ui/game2048-screen';

export default function Game2048Route() {
  return (
    <GameRoute id="2048">
      <Game2048Screen />
    </GameRoute>
  );
}
