import { GameRoute } from '@/components/game-route';
import { Make24Screen } from '@/games/make24/ui/make24-screen';

export default function Make24Route() {
  return (
    <GameRoute id="make24">
      <Make24Screen />
    </GameRoute>
  );
}
