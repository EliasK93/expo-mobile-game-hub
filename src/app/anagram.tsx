import { GameRoute } from '@/components/game-route';
import { AnagramScreen } from '@/games/anagram/ui/anagram-screen';

export default function AnagramRoute() {
  return (
    <GameRoute id="anagram">
      <AnagramScreen />
    </GameRoute>
  );
}
