import { router } from 'expo-router';
import { act, fireEvent, renderRouter, screen } from 'expo-router/testing-library';
import { AppState, Text } from 'react-native';

import HomeScreen from '@/app/index';
import { GameRoute } from '@/components/game-route';
import { Colors } from '@/constants/theme';
import { buttonLook } from '@/test-utils/button-look';
import { tick } from '@/test-utils/events';
import { settle } from '@/test-utils/settle';
import { saved, seed } from '@/test-utils/storage';

// Sorting needs more than one game, so home runs here with three made-up games. The real registry is covered by navigation.test.tsx.
jest.mock('@/games/registry', () => {
  function Tile() {
    return null;
  }
  return {
    games: [
      { id: 'zeta', title: 'Zeta', route: '/zeta', Tile },
      { id: 'alpha', title: 'Alpha', route: '/alpha', Tile },
      { id: 'mid', title: 'Mid', route: '/mid', Tile },
    ],
  };
});

function game(id: string) {
  return function GameScreen() {
    return (
      <GameRoute id={id}>
        <Text>{`${id} screen`}</Text>
      </GameRoute>
    );
  };
}
const open = () => renderRouter({ index: HomeScreen, zeta: game('zeta'), alpha: game('alpha'), mid: game('mid') });

const tiles = () => screen.getAllByText(/^(Zeta|Alpha|Mid)$/).map((n) => n.props.children);
const PLAYED = { zeta: { totalMs: 1000, lastPlayedAt: 300 }, mid: { totalMs: 9000, lastPlayedAt: 100 } };

beforeEach(() => {
  jest.useFakeTimers();
});

afterEach(() => {
  jest.useRealTimers();
});

describe('Home grid', () => {
  it('shows a tile with the name for every game, sorted by Recent: the never-played ones by name', async () => {
    open();
    await settle();

    expect(tiles()).toEqual(['Alpha', 'Mid', 'Zeta']);
    expect(screen.getByLabelText('Sort by Recent').props.accessibilityState.selected).toBe(true);
  });

  it('sorts by each chip', async () => {
    await seed('hub:playtime', 1, PLAYED);
    open();
    await settle();
    expect(tiles()).toEqual(['Zeta', 'Mid', 'Alpha']); // Recent

    fireEvent.press(screen.getByLabelText('Sort by Name'));
    expect(tiles()).toEqual(['Alpha', 'Mid', 'Zeta']);
    expect(screen.getByLabelText('Sort by Name').props.accessibilityState.selected).toBe(true);

    fireEvent.press(screen.getByLabelText('Sort by Playtime'));
    expect(tiles()).toEqual(['Mid', 'Zeta', 'Alpha']);
  });

  it('the active sort chip is the accent one and the others have grey text, after switching', async () => {
    const active = { background: Colors.light.accent, text: Colors.light.onAccent };
    const inactive = { background: Colors.light.backgroundElement, text: Colors.light.textSecondary };
    open();
    await settle();

    expect([buttonLook('Recent'), buttonLook('Name'), buttonLook('Playtime')]).toEqual([active, inactive, inactive]);
    fireEvent.press(screen.getByLabelText('Sort by Name'));
    expect([buttonLook('Recent'), buttonLook('Name'), buttonLook('Playtime')]).toEqual([inactive, active, inactive]);
  });

  it('remembers the sort for the next visit', async () => {
    await seed('hub:playtime', 1, PLAYED);
    open();
    await settle();
    fireEvent.press(screen.getByLabelText('Sort by Playtime'));
    await settle();
    expect((await saved('hub:settings')).data).toEqual({ sort: 'playtime' });

    screen.unmount();
    await settle();
    open();
    await settle();

    expect(tiles()).toEqual(['Mid', 'Zeta', 'Alpha']);
    expect(screen.getByLabelText('Sort by Playtime').props.accessibilityState.selected).toBe(true);
  });

  it('opens a game when its tile is pressed', async () => {
    open();
    await settle();
    fireEvent.press(screen.getByText('Mid'));

    expect(screen.getByText('mid screen')).toBeTruthy();
  });
});

describe('Playtime', () => {
  const play = async (id: string, ms: number) => {
    fireEvent.press(screen.getByText(id));
    await tick(ms);
    await act(async () => router.back());
    await settle();
  };

  it('counts the time a game screen is open, not the time on home', async () => {
    open();
    await settle();
    await tick(7000);
    await play('Alpha', 5000);
    await tick(4000);

    expect((await saved('hub:playtime')).data.alpha.totalMs).toBe(5000);
  });

  it('adds up over visits, and a game played now moves to the front of Recent and counts in Playtime', async () => {
    open();
    await settle();
    await play('Alpha', 2000);
    await play('Alpha', 3000);
    await play('Zeta', 1000);

    expect((await saved('hub:playtime')).data.alpha.totalMs).toBe(5000);
    expect(tiles()).toEqual(['Zeta', 'Alpha', 'Mid']);
    fireEvent.press(screen.getByLabelText('Sort by Playtime'));
    expect(tiles()).toEqual(['Alpha', 'Zeta', 'Mid']);
  });

  it('pauses while the app is in the background and goes on when it returns', async () => {
    open();
    await settle();
    const listeners: ((s: string) => void)[] = [];
    // RN's jest mock of AppState is a jest.fn; capture the listener of the next mount only (Once keeps the default for later tests).
    (AppState.addEventListener as jest.Mock).mockImplementationOnce((_: string, l: (s: string) => void) => {
      listeners.push(l);
      return { remove: () => {} };
    });
    fireEvent.press(screen.getByText('Alpha'));
    const appState = (s: string) => act(() => listeners.forEach((l) => l(s)));

    await tick(2000);
    await appState('background');
    await tick(10_000);
    await appState('active');
    await tick(1000);
    await act(async () => router.back());
    await settle();

    expect((await saved('hub:playtime')).data.alpha.totalMs).toBe(3000);
  });
});
