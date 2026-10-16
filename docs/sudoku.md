# Sudoku

Read this before working on Sudoku. The hub-wide rules (gate, tests, git, Herdr, tooling) are in `CLAUDE.md`; everything specific to Sudoku lives here and nowhere else. Where this document and the repository disagree, the repository wins: check the code before acting on any status claim, including the checklists below.

## Overview

Sudoku is the first game in the hub. It lives in `src/games/sudoku/`, has its route in `src/app/sudoku.tsx` (the screen wrapped in the hub's `GameRoute`, which records playtime) and its entry in `src/games/registry.ts` (with its `Tile`, the art on home).

## Spec (v1)

- Puzzles are generated ahead of time with the real generator and shipped as a pool (M6 decisions); every puzzle has exactly one solution (verified by a solver that counts up to 2 solutions).
- Difficulty is rated by the human techniques needed, not by number of givens. **Five levels** (decided 2026-10-15); names only from `LEVEL_NAMES` in `logic/techniques.ts`. Each level allows the earlier techniques plus its own:
  1. Very easy: full house, hidden single in a box.
  2. Easy: + naked single, hidden single in a row or column.
  3. Medium: + naked pair, hidden pair, pointing, claiming.
  4. Hard: + naked and hidden triple, X-Wing.
  5. Expert: + Swordfish, XY-Wing, naked and hidden quad.
  - A puzzle that needs more than Expert (or guessing) is discarded, so every puzzle is solvable by logic and a hint always works.
- Puzzles come from a shipped pool, so "New game" is instant (see the pool under M6 decisions).
- Features: notes/pencil marks, error highlighting, hints (= apply/explain the next simplest technique), undo/redo, timer, stats per difficulty (solved count, best time, average time; only solved games count, see M5), save & resume.

## Decisions

- M3 decisions: touch only (no keyboard input). On a win the grid locks and shows "Solved!"; "New game" is always available. Web output is a single-page app (`web.output` removed from `app.json`), so a random puzzle at first render causes no hydration mismatch.
- M4 decisions: error highlighting marks conflicts only (the same digit twice in a row, column or box; both clashing cells, givens included, turn red; nothing is compared with the solution, so a wrong digit that clashes with nothing stays normal). Notes use a "Notes" toggle button: while on, digits 1-9 add or remove pencil marks (not on givens or filled cells). Placing a digit clears that cell's notes and that digit's notes in its row, column and box. Undo/redo covers digits, notes and erasing; after a win both are disabled (rule lives in `undoGame`/`redoGame`); "New game" clears the history.
- M5 decisions (decided 2026-10-15):
  - Stats count only solved games; abandoned games are discarded. A win with a hint counts as solved but never enters best or average time (hints arrive in M6; the `hinted` flag is already in the save format). Until M6 every game goes into one stats bucket, `classic`. Keys: `"sudoku:save"` and `"sudoku:stats"`, both version 1 (`logic/save.ts`, `lib/stats.ts`).
  - One save slot; the undo history is not saved. When an unfinished save with progress exists, opening Sudoku asks **Continue** or **New game**. Saved after every move and when the clock stops; nothing is saved before the first move, and a win deletes the save.
  - The timer runs only while the Sudoku screen is focused, the app is in the foreground, the game isn't won and the level picker isn't open (`lib/timer.ts` is a pure clock). It sits above the grid; while the picker is open the time and level are hidden and the time spent there doesn't count. The win banner reads "Solved! in m:ss". The win is recorded exactly once.
  - Home showed a stats summary under "Sudoku" until 2026-10-16; the stats moved into the level picker (see M6 decisions, "Stats in the picker") and the registry's `Summary` is gone.
- M6 decisions (decided 2026-10-15):
  - Picker: "New game" (also the prompt's) replaces the number pad with the five levels, the last one used marked and a Cancel button. The last level is stored in `sudoku:settings` (version 1); the default is Medium. Opening Sudoku without a save shows the picker at once (the last level used marked, no Cancel, nothing starts by itself); with a save it shows the Continue / New game prompt at once. The current level is shown next to the timer.
  - Pool (decided 2026-10-16, replaces the on-device cache and generation): `src/games/sudoku/data/puzzles.json` holds 1000 puzzles per level, as 81-character strings (`0` = empty), no solutions. All come from `generateLevel()` with seeds 1 to 1000 per level, so the file can be rebuilt (`logic/build-puzzles.test.ts`, skipped unless `SUDOKU_BUILD` or `SUDOKU_MERGE` is set; its header says how, and Hard needs several parallel processes). `logic/pool.ts`: `pickPuzzle(level)` takes a random entry, `transform()` applies a random rotation or mirror plus a random relabeling of the digits 1-9 (same solution count, same rating), and `solve()` gives the solution. Every game start is instant and nothing is generated on the device. The old `sudoku:cache` storage key is removed when Sudoku opens (see Storage keys).
  - Save version 2 adds `level`; a version 1 save still loads, as level `classic`. Stats buckets: the level number as text (`"3"`), plus `classic` for the pre-M6 games.
  - Hint: the "Hint" button highlights the cells involved (theme token `cellHint`, a blue tint because the selection is yellow) and explains; "Apply" makes the move with `setValue`, so Undo works, and "Close" drops it. While a hint is shown, the hint panel (explanation, Apply, Close) takes the place of the number pad, the Undo/Redo/Notes/Erase row and the Hint / New game row (decided 2026-10-16, like the level picker replacing the grid), so its buttons stay on screen even with a three-line explanation; the grid stays visible for the highlighted cells, and Apply or Close brings the pad back. Undo, a move or New game close the hint too (in the hook; with the pad hidden only Apply and Close can do it from the screen). Hints reason from the real candidates, not the notes. A wrong digit you entered is reported first ("This 4 is wrong.") and Apply erases it; that is the one place the solution is compared. Showing a hint already sets `hinted`: such a win counts as solved but stays out of best and average time.
  - Stats in the picker (decided 2026-10-16, replaces the lines on home): each level button shows "5 solved · Best 3:10" from `sudoku:stats` under its name; a level with only hinted wins shows just "2 solved", a level without wins shows nothing. Wins from before levels existed (bucket `classic`) show as one small line "Classic: 3 solved · Best 4:12" under the levels, only if there are any. No average is shown (it is still stored). The stats are read when Sudoku opens and refreshed when a win is recorded. Home shows no stats.
  - Tile (decided 2026-10-16): `ui/tile.tsx`, a small 3×3 Sudoku in the theme colours with a few digits, one cell selected (yellow) and two digits in blue ink.
  - The in-game "New game" button and the "Continue" button of the Continue prompt use the hub Button's `primary` (accent) variant; every other Sudoku button is plain.

## Architecture

The Sudoku folder follows the hub layout (`CLAUDE.md`, "Architecture"): `logic/` is pure TypeScript, `ui/` only calls into `logic/`, the route file is a thin wrapper.

```
src/games/sudoku/
  logic/   # pure TS, unit-tested (*.test.ts next to the source)
  data/puzzles.json
  ui/
src/app/sudoku.tsx        # route, renders ui/sudoku-screen
src/__tests__/sudoku.test.tsx, home.test.tsx, navigation.test.tsx   # route tests
src/lib/stats.ts, storage.ts, timer.ts, history.ts, random.ts   # shared helpers Sudoku uses (hub-wide, not Sudoku-only)
src/hooks/use-game-clock.ts, src/components/button.tsx   # the shared clock hook and text button Sudoku uses
```

### `logic/`

| File | What it does |
|---|---|
| `board.ts` | `Grid` (81 cells, row-major, 0 = empty), `DIGITS` (1-9) and `CELLS` (0-80), the shared lists (copy before `shuffle`, it works in place), `rowOf`/`colOf`/`boxOf`, `peers`, `candidateMask`, `parseGrid`/`formatGrid` |
| `validate.ts` | `conflicts` (cells repeated among their peers), `isComplete`, `isSolved` |
| `solve.ts` | Backtracking solver (fewest-candidates cell first): `solve`, `countSolutions` (stops at a limit, default 2, for the uniqueness check) |
| `techniques.ts` | `Level`/`LEVELS`/`LEVEL_NAMES`, the technique `LADDER`, `findStep`, `applyStep`, candidate state |
| `rate.ts` | `solveByLogic` and `rate`: solves with the simplest technique at each step; the rating is the highest level any step needed, `null` when stuck |
| `hint.ts` | `nextHint(values, solution)`: the next move as one `setValue`, with the cells to highlight and the explanation; a wrong digit comes first |
| `generate.ts` | `fill`, and `generateLevel` (a plain function: fills a grid, digs out cells while the puzzle stays unique and rates at most the level, retries when it rates below). Used to build the pool, not by the app at runtime |
| `pool.ts` | `pickPuzzle(level)` and `transform()` over `data/puzzles.json` (see M6 decisions) |
| `game.ts` | `Game` model and the pure moves: `newGame`, `setValue`, `toggleNote`, `notesOf`, `isGiven`, `isWon`, `highlights`, `undoGame`/`redoGame` (wrappers over `lib/history`) |
| `save.ts` | Save/settings formats, storage keys and versions, `toSave`/`fromSave`/`fromSettings`, `DEFAULT_LEVEL`, `bucketOf`, `levelName`, `LevelId` |
| `sparse-puzzle.ts` | Test helper, not used by the app: a unique puzzle dug to about N givens with no rating, for the soundness tests in `rate`/`techniques` |

Tests that are not ordinary unit tests: `build-puzzles.test.ts` (rebuilds the pool, skipped unless `SUDOKU_BUILD`/`SUDOKU_MERGE` is set), `measure.test.ts` (timing measurement, skipped unless `SUDOKU_MEASURE` is set), `puzzles-data.test.ts` (checks the shipped pool: five levels, 1000 distinct well-formed puzzles each, none at two levels, and the rating by sampling every 10th puzzle, see "Known shortcuts").

### `data/puzzles.json`

The shipped pool: 1000 puzzles per level as 81-character strings, read only by `logic/pool.ts`. Rebuild it with `logic/build-puzzles.test.ts`: generate part files per level and seed slice (`$env:SUDOKU_BUILD = '<level>:<from>-<to>'`, `$env:SUDOKU_BUILD_OUT = '<folder>'`, then `npx.cmd jest src/games/sudoku/logic/build-puzzles.test.ts`), then merge them (`$env:SUDOKU_MERGE = '<folder>'`, same command). The header of that test has the full steps; Hard is slow, so give it several parallel processes.

### `ui/`

| File | What it does |
|---|---|
| `sudoku-screen.tsx` | The screen: timer and level, grid, number pad, hint panel, level picker (with the stats), Continue / New game prompt |
| `use-sudoku.ts` | The hook that holds the state and wires `logic/` to storage and the shared clock (`hooks/use-game-clock`, which handles app focus and foreground) |
| `grid.tsx` | The 9x9 grid: selection, highlighting, conflicts, notes, hint cells |
| `number-pad.tsx` | Digits, Undo, Redo, Notes, Erase |
| `tile.tsx` | `SudokuTile`, the art on home (registry `Tile`) |

### Storage keys

All stored through `lib/storage.ts` as JSON `{ version, data }`; a different version is rejected, not misread.

| Key | Version | Content |
|---|---|---|
| `sudoku:save` | 2 (version 1 still loads, as level `classic`) | The one save slot: puzzle, solution, values, notes, elapsed time, `hinted`, `level`. No undo history |
| `sudoku:stats` | 1 | Per bucket (level number as text, or `classic`): solved, timed count, total time, best time |
| `sudoku:settings` | 1 | The last level used |
| `sudoku:cache` | - | Removed on load: key of the old on-device cache, deleted every time Sudoku opens (`ponytail:` comment in `ui/use-sudoku.ts`); nothing reads or writes it |

## Milestones

Same ticking rule as the hub (`CLAUDE.md`, "Milestones"): tick an item only when its re-check passes and the user has verified it in the web preview.

- [x] 2. Core logic (no UI): board model, validator, backtracking solver, generator with uniqueness check, tests. Re-check: `npm run gate` (`npx jest src/games`: 5 suites, incl. `generate.test.ts` uniqueness per seed).
- [x] 3. Playable game: grid, number pad, selection, highlighting (row/col/box/same number), win detection. Re-check: `npm run gate` (`src/__tests__/sudoku.test.tsx`: `shows Solved! when the last cell is filled correctly, and locks the grid`).
- [x] 4. Notes, error highlighting, undo/redo. Re-check: `npm run gate` (`src/__tests__/sudoku.test.tsx`: `placing a digit removes that note from the peers, and Undo brings it back`, `are disabled after a win, and pressing Undo changes nothing`).
- [x] 5. Save/resume, timer, stats. Re-check: `npm run gate` (`src/__tests__/sudoku.test.tsx`: `asks to continue, and Continue brings back the digit, the notes and the time`, `extra presses, rerenders and time after the win change nothing`; `src/__tests__/home.test.tsx`).
- [x] 6. Technique-based solver → difficulty rater (five levels) + difficulty picker + hints; background puzzle cache per difficulty; stats per difficulty. Re-check: `npm run gate` (`src/games/sudoku/logic/generate-level.test.ts`; `src/__tests__/sudoku.test.tsx`: `picking a level starts a game at that level, shows it next to the timer, and remembers it`, `a win after a hint counts as solved but leaves best and average time alone`).
  - Note (2026-10-16): the background puzzle cache was later replaced by the shipped pool (see M6 decisions, "Pool"). The line above is the original milestone text.

The APK build and phone checks are the hub milestone "Release" in `CLAUDE.md`.

## Android checks

Verified only in the web preview so far; test them on the phone (add as they come up, tick when confirmed). Hub-wide checks (saved data survives a restart, dark/light mode, back button returns home) are in `CLAUDE.md`.

- [x] New game and opening Sudoku are instant on the phone: the Continue prompt or the level picker shows at once, and every level, Hard and Expert included, starts the moment it is tapped.
- [x] Sudoku cells are big enough to tap accurately on a small screen.
- [x] The grid, number pad and "New game" fit on the phone screen without scrolling.
- [x] Tapping cells and digits feels responsive.
- [x] The timer pauses when the app goes to the background and continues when it returns.
- [x] A game survives killing the app: reopening Sudoku shows the Continue / New game prompt, and Continue brings back digits, notes and time.
- [x] The home summary updates after a win (back button from Sudoku to home). *(Replaced 2026-10-16: the stats are in the level picker now, see the next item.)*
- [x] After a win, "New game" shows the new solved count and best time on that level's button, and the level buttons with their second line still fit the picker and Cancel on a small screen without scrolling.
- [x] Pencil notes (3x3 mini grid, font about 28% of the cell) are readable on a small screen, and the Undo/Redo/Notes/Erase row fits and is easy to tap.
- [x] With a hint shown (the hint panel replaces the number pad, the Undo/Redo/Notes/Erase row and the Hint / New game row), Apply and Close are fully visible above Android's navigation bar, also when the explanation wraps to two or three lines; Apply and Close bring the pad back. Re-check: `src/__tests__/sudoku.test.tsx`, `replaces the number pad and the Undo/Redo/Notes/Erase row while shown`.
- [x] The hint panel (explanation text plus Apply/Close) and the level picker (five levels plus Cancel) fit on a small screen without scrolling, and the longest explanation (e.g. one ending in "To see it, first use ...") is readable.
- [x] Button labels aren't cut off (the "Very easy" level button shows both words), and nothing sits under Android's navigation bar (the bottom button of every Sudoku state is fully visible).
- [x] The level picker, which now replaces the grid, fits without scrolling, from the game screen, from the Continue prompt and when Sudoku opens without a save.
- [x] The hint highlight colour is clear in light and dark mode.
- [x] With the Pencil & Paper palette (2026-10-16), the selected cell (yellow), same-digit cells, hint cells (blue), conflicts (red) and entered digits (blue ink) are clearly different from each other in light and dark mode on the phone.

- [x] Digits in the home tile, the grid and the pencil notes are vertically centred in their cells (not sitting low). Shared style: `digitStyle` in `src/games/sudoku/ui/digit-style.ts`.

## Open decisions

Ask the user when the milestone comes up; move the answer into the spec above and delete the line here.

None right now.

## Known shortcuts

Deliberate shortcuts marked with a `ponytail:` comment in `src/games/sudoku/**` (re-check: `Get-ChildItem -Recurse -File src\games\sudoku -Include *.ts,*.tsx | Select-String ponytail`). `/ponytail-debt` collects them too.

| File | What was cut | Revisit when |
|---|---|---|
| `logic/generate.ts` (`generateLevel`) | No cap on `attempts`: it runs until it succeeds. Hard needed up to about 190 grids on the development PC (`measure.test.ts`), so a bad seed range can run for long | Generation runs anywhere other than the offline pool build, or the build hangs |
| `logic/puzzles-data.test.ts` (`SAMPLE_EVERY`) | Rates only every 10th puzzle (100 per level, about 1.6 s) because all 5000 take about 16 s | After a pool rebuild: set `SAMPLE_EVERY` to 1 to check them all |
| `ui/tile.tsx` (`digit`) | The digits on the home tile have a fixed font size (22) instead of one measured from the tile | A tile looks cramped or empty at some screen width |
| `logic/techniques.ts` (`combinations`) | The subset and fish techniques rebuild their combinations on every scan (many small arrays); fine while a Hard puzzle takes about 1 s on the development PC (`measure.test.ts`) | If the phone is too slow for hints: precompute the candidate cells per unit |
