import AsyncStorage from '@react-native-async-storage/async-storage';

import { loadSort, saveSort, sortGames } from './game-sort';

const games = [
  { id: 'zeta', title: 'Zeta' },
  { id: 'alpha', title: 'Alpha' },
  { id: 'mid', title: 'Mid' },
  { id: 'beta', title: 'Beta' },
];
const playtime = {
  zeta: { totalMs: 1000, lastPlayedAt: 300 },
  mid: { totalMs: 9000, lastPlayedAt: 100 },
};
const ids = (sorted: { id: string }[]) => sorted.map((g) => g.id);

describe('sortGames', () => {
  it('Recent: last played first, the never-played last, then by name', () => {
    expect(ids(sortGames(games, 'recent', playtime))).toEqual(['zeta', 'mid', 'alpha', 'beta']);
  });

  it('Name: alphabetical', () => {
    expect(ids(sortGames(games, 'name', playtime))).toEqual(['alpha', 'beta', 'mid', 'zeta']);
  });

  it('Playtime: most played first, games with none by name', () => {
    expect(ids(sortGames(games, 'playtime', playtime))).toEqual(['mid', 'zeta', 'alpha', 'beta']);
  });

  it('with nothing played, every sort falls back to the name and the input is not changed', () => {
    for (const sort of ['recent', 'name', 'playtime'] as const) {
      expect(ids(sortGames(games, sort, {}))).toEqual(['alpha', 'beta', 'mid', 'zeta']);
    }
    expect(ids(games)).toEqual(['zeta', 'alpha', 'mid', 'beta']);
  });
});

describe('the sort setting', () => {
  it('defaults to Recent', async () => {
    expect(await loadSort()).toBe('recent');
  });

  it('is stored as { version: 1, data: { sort } } under hub:settings and read back', async () => {
    await saveSort('playtime');

    expect(JSON.parse((await AsyncStorage.getItem('hub:settings')) as string)).toEqual({
      version: 1,
      data: { sort: 'playtime' },
    });
    expect(await loadSort()).toBe('playtime');
  });

  it('falls back to Recent for a value it does not know', async () => {
    await AsyncStorage.setItem('hub:settings', JSON.stringify({ version: 1, data: { sort: 'newest' } }));
    expect(await loadSort()).toBe('recent');
  });
});
