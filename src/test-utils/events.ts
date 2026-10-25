import { act, fireEvent, screen } from 'expo-router/testing-library';

// Moves the fake timers on. Async so effects and promises settle: a game tick re-arms the next one only after React
// has rendered, so each tick is its own act. Always awaited.
export const tick = (ms: number) =>
  act(async () => {
    jest.advanceTimersByTime(ms);
  });

export const press = (label: string) => fireEvent.press(screen.getByLabelText(label));

export const disabled = (label: string) => screen.getByLabelText(label).props.accessibilityState.disabled;

export const selected = (label: string) => screen.getByLabelText(label).props.accessibilityState.selected;
