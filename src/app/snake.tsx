import { GameRoute } from '@/components/game-route';
import { SnakeScreen } from '@/games/snake/ui/snake-screen';

export default function SnakeRoute() {
  return (
    <GameRoute id="snake">
      <SnakeScreen />
    </GameRoute>
  );
}
