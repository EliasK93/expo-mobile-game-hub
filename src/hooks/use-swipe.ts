import { useMemo } from 'react';
import { type AccessibilityActionEvent, PanResponder } from 'react-native';

export type SwipeDir = 'up' | 'down' | 'left' | 'right';

const DIRS: SwipeDir[] = ['up', 'down', 'left', 'right'];
const MOVE_START = 4; // px of movement before the swipe area takes the gesture (small on purpose: better too sensitive than not enough)
const SWIPE_MIN = 8; // px a drag needs to count as a swipe

// The longer axis decides the direction; a drag shorter than SWIPE_MIN is no swipe.
export function swipeDir(dx: number, dy: number): SwipeDir | null {
  if (Math.max(Math.abs(dx), Math.abs(dy)) < SWIPE_MIN) return null;
  if (Math.abs(dx) > Math.abs(dy)) return dx < 0 ? 'left' : 'right';
  return dy < 0 ? 'up' : 'down';
}

// Swipes for a board. Spread `area` on the swipe area (the board and the free space under it: flex 1, so it reaches to
// the bottom of the screen) and `actions` on the accessible board inside it: the testing library skips an action on an
// element that also has touch handlers. The accessibility actions are "<actionLabel> up" and so on; they do nothing on
// the web (react-native-web has no support).
// Touch (and a mouse drag on the web): the swipe area takes the gesture after MOVE_START px and the screen may not take
// it back. onSwipe must be a stable function: the PanResponder is built from it once.
export function useSwipe(onSwipe: (dir: SwipeDir) => void, actionLabel: string) {
  // PanResponder resets dx/dy to 0 when it grants the gesture, so the distance up to that moment (lead) is kept and added
  // back: otherwise a quick flick that is granted on its first big move would count as no swipe at all.
  const pan = useMemo(() => {
    const lead = { dx: 0, dy: 0 };
    return PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) => {
        const take = Math.max(Math.abs(g.dx), Math.abs(g.dy)) > MOVE_START;
        if (take) [lead.dx, lead.dy] = [g.dx, g.dy];
        return take;
      },
      onPanResponderTerminationRequest: () => false,
      onPanResponderRelease: (_, g) => {
        const dir = swipeDir(lead.dx + g.dx, lead.dy + g.dy);
        if (dir) onSwipe(dir);
      },
    });
  }, [onSwipe]);

  return {
    area: pan.panHandlers,
    actions: {
      accessibilityActions: DIRS.map((name) => ({ name, label: `${actionLabel} ${name}` })),
      onAccessibilityAction: (e: AccessibilityActionEvent) => {
        const name = e.nativeEvent.actionName as SwipeDir; // also called with the platform's own names, e.g. `activate`
        if (DIRS.includes(name)) onSwipe(name);
      },
    },
  };
}
