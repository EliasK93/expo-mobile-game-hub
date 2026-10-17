import { useEffect, useState } from 'react';
import { AccessibilityInfo } from 'react-native';

// Whether the user asked their system for less motion. Android: the animation scale / "Remove animations" setting;
// web: prefers-reduced-motion (react-native-web implements this API). False until the setting has been read.
export function useReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    let alive = true;
    AccessibilityInfo.isReduceMotionEnabled().then((on) => alive && setReduced(on));
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduced);
    return () => {
      alive = false;
      subscription.remove();
    };
  }, []);
  return reduced;
}
