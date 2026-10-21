import { useLayoutEffect, useState } from 'react';
import { Animated } from 'react-native';

import { FLASH_MS } from './use-anagram';

// The solved feedback's colour: 1 = muted green, 0 = normal. While `flash` is on it starts at green and fades to normal
// over FLASH_MS; `restart` changes with each solve, so a second solve during the fade starts it again. With reduced motion
// it stays green until `flash` goes off. A colour cannot use the native driver. It is set before the screen is drawn
// (layout effect), so the first frame is already green.
export function useSolvedFade(flash: boolean, restart: number | string, reduceMotion: boolean) {
  const [fade] = useState(() => new Animated.Value(0));
  useLayoutEffect(() => {
    fade.setValue(flash ? 1 : 0);
    if (!flash || reduceMotion) return;
    const run = Animated.timing(fade, { toValue: 0, duration: FLASH_MS, useNativeDriver: false });
    run.start();
    return () => run.stop();
  }, [flash, restart, reduceMotion, fade]);
  return fade;
}
