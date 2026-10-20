import { act, fireEvent, renderRouter, screen } from 'expo-router/testing-library';
import { useState } from 'react';
import { AppState, Pressable, Text } from 'react-native';

import { useGameClock } from '@/hooks/use-game-clock';

// A throwaway route that uses the hook: shows the time, a switch for `enabled`, and buttons for reset and stop.
const stops: number[] = [];
let stoppedAt = -1;

function Probe() {
  const [enabled, setEnabled] = useState(true);
  const clock = useGameClock({ enabled, onStop: (ms) => stops.push(ms) });
  return (
    <>
      <Text>{`time ${clock.elapsedMs}`}</Text>
      <Text>{`running ${clock.running}`}</Text>
      <Pressable accessibilityLabel="switch" onPress={() => setEnabled((on) => !on)} />
      <Pressable accessibilityLabel="reset" onPress={() => clock.reset(5000)} />
      <Pressable accessibilityLabel="stop" onPress={() => (stoppedAt = clock.stop())} />
    </>
  );
}

const tick = (ms: number) => act(() => jest.advanceTimersByTime(ms));
const time = () => screen.getByText(/^time /).props.children;
const running = () => screen.getByText(/^running /).props.children;
const open = () => renderRouter({ index: Probe });

beforeEach(() => {
  jest.useFakeTimers();
  stops.length = 0;
  stoppedAt = -1;
});

afterEach(() => {
  jest.useRealTimers();
});

describe('useGameClock', () => {
  it('counts while enabled, pauses when disabled and reports the time to onStop', async () => {
    open();
    await tick(2000);
    expect(time()).toBe('time 2000');

    fireEvent.press(screen.getByLabelText('switch'));
    expect(stops).toEqual([2000]);
    await tick(10_000);
    expect(time()).toBe('time 2000');

    fireEvent.press(screen.getByLabelText('switch'));
    await tick(1000);
    expect(time()).toBe('time 3000');
  });

  it('pauses while the app is in the background and goes on when it returns', async () => {
    const listeners: ((s: string) => void)[] = [];
    (AppState.addEventListener as jest.Mock).mockImplementationOnce((_: string, l: (s: string) => void) => {
      listeners.push(l);
      return { remove: () => {} };
    });
    open();
    const appState = (s: string) => act(() => listeners.forEach((l) => l(s)));

    await tick(2000);
    await appState('background');
    await tick(10_000);
    expect(time()).toBe('time 2000');
    expect(stops).toEqual([2000]);

    await appState('active');
    await tick(1000);
    expect(time()).toBe('time 3000');
  });

  it('running is true exactly while the clock counts: enabled, focused and in the foreground', async () => {
    const listeners: ((s: string) => void)[] = [];
    (AppState.addEventListener as jest.Mock).mockImplementationOnce((_: string, l: (s: string) => void) => {
      listeners.push(l);
      return { remove: () => {} };
    });
    open();
    const appState = (s: string) => act(() => listeners.forEach((l) => l(s)));

    expect(running()).toBe('running true');

    fireEvent.press(screen.getByLabelText('switch'));
    expect(running()).toBe('running false');
    fireEvent.press(screen.getByLabelText('switch'));
    expect(running()).toBe('running true');

    await appState('background');
    expect(running()).toBe('running false');
    await appState('active');
    expect(running()).toBe('running true');
  });

  it('reset puts the clock at a new time and counts on from there; stop returns the time and holds it', async () => {
    open();
    await tick(2000);
    fireEvent.press(screen.getByLabelText('reset'));
    expect(time()).toBe('time 5000');
    await tick(1000);
    expect(time()).toBe('time 6000');

    fireEvent.press(screen.getByLabelText('stop'));
    expect(stoppedAt).toBe(6000);
    expect(time()).toBe('time 6000');
  });
});
