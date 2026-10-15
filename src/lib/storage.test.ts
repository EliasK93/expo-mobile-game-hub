import AsyncStorage from '@react-native-async-storage/async-storage';

import { load, remove, save } from './storage';

describe('storage', () => {
  it('round-trips data under the same version', async () => {
    await save('test:key', 1, { a: [1, 2], b: 'x' });
    expect(await load('test:key', 1)).toEqual({ a: [1, 2], b: 'x' });
  });

  it('stores { version, data }', async () => {
    await save('test:key', 3, 'hi');
    expect(JSON.parse((await AsyncStorage.getItem('test:key')) as string)).toEqual({ version: 3, data: 'hi' });
  });

  it('returns null for a missing key', async () => {
    expect(await load('test:missing', 1)).toBeNull();
  });

  it('returns null when the version differs', async () => {
    await save('test:key', 1, 'old');
    expect(await load('test:key', 2)).toBeNull();
  });

  it('returns null for corrupt JSON', async () => {
    await AsyncStorage.setItem('test:key', '{not json');
    expect(await load('test:key', 1)).toBeNull();
  });

  it('returns null for JSON without the { version, data } shape', async () => {
    await AsyncStorage.setItem('test:key', '42');
    expect(await load('test:key', 1)).toBeNull();
  });

  it('remove deletes the key', async () => {
    await save('test:key', 1, 'x');
    await remove('test:key');
    expect(await load('test:key', 1)).toBeNull();
  });
});
