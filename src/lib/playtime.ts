import { load, save } from './storage';

// Per game id: the time its screen was open while the app was in the foreground, and when it was last open.
export type Playtime = Record<string, { totalMs: number; lastPlayedAt: number }>;

const KEY = 'hub:playtime';
const VERSION = 1;

const read = async () => (await load<Playtime>(KEY, VERSION)) ?? {};

// Writes run one after the other, and a read waits for the writes started before it. Leaving a game adds its time
// while home reloads in the same moment; without the queue home could read the old value, or two adds could overwrite each other.
let writes: Promise<unknown> = Promise.resolve();

export const loadPlaytime = async (): Promise<Playtime> => {
  await writes;
  return read();
};

// Opening a game counts as playing it, so `lastPlayedAt` moves even when ms is 0.
export function addPlaytime(id: string, ms: number, now = Date.now()): Promise<void> {
  const done = writes.then(async () => {
    const all = await read();
    await save(KEY, VERSION, { ...all, [id]: { totalMs: (all[id]?.totalMs ?? 0) + ms, lastPlayedAt: now } });
  });
  writes = done.catch(() => {}); // a failed write must not block the next ones
  return done;
}
