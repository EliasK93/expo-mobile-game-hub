import AsyncStorage from '@react-native-async-storage/async-storage';

import { addPlaytime, loadPlaytime } from './playtime';

describe('playtime', () => {
  it('starts empty', async () => {
    expect(await loadPlaytime()).toEqual({});
  });

  it('adds the time to a game and remembers when it was last played', async () => {
    await addPlaytime('sudoku', 3000, 100);
    await addPlaytime('sudoku', 2000, 200);

    expect(await loadPlaytime()).toEqual({ sudoku: { totalMs: 5000, lastPlayedAt: 200 } });
  });

  it('keeps games apart', async () => {
    await addPlaytime('sudoku', 3000, 100);
    await addPlaytime('2048', 500, 200);

    expect(await loadPlaytime()).toEqual({
      sudoku: { totalMs: 3000, lastPlayedAt: 100 },
      '2048': { totalMs: 500, lastPlayedAt: 200 },
    });
  });

  it('counts opening a game as playing it, even with no time on the clock', async () => {
    await addPlaytime('sudoku', 0, 100);
    expect(await loadPlaytime()).toEqual({ sudoku: { totalMs: 0, lastPlayedAt: 100 } });
  });

  // Leaving a game adds its time while home reloads at the same moment: the read has to see the write that was started first.
  it('a load started right after an add (not awaited) sees it, and adds started together all count', async () => {
    addPlaytime('sudoku', 1000, 100);
    addPlaytime('sudoku', 2000, 200);

    expect(await loadPlaytime()).toEqual({ sudoku: { totalMs: 3000, lastPlayedAt: 200 } });
  });

  it('is stored as { version: 1, data } under hub:playtime', async () => {
    await addPlaytime('sudoku', 3000, 100);
    expect(JSON.parse((await AsyncStorage.getItem('hub:playtime')) as string)).toEqual({
      version: 1,
      data: { sudoku: { totalMs: 3000, lastPlayedAt: 100 } },
    });
  });
});
