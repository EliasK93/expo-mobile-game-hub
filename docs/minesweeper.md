# Minesweeper

Read this before working on Minesweeper. The hub-wide rules are in `CLAUDE.md`: the gate, tests, git, Herdr, tooling, the shared components and the palette. Everything specific to Minesweeper lives here and nowhere else. Where this document and the repository disagree, the repository wins.

**Status (2026-10-18):** the concept is agreed and nothing is built yet. Start with M1 in plan mode (rule 10). The decisions below are settled; don't ask about them again.

## Overview

Minesweeper is the fourth game in the hub: open every cell that hides no mine. A number tells how many of the 8 neighbours hide a mine; flags mark the mines you have found. One wrong tap on a mine ends the game.
- It lives in `src/games/minesweeper/`.
- Its route is `src/app/minesweeper.tsx` (route `/minesweeper`, game id `'minesweeper'`), the screen wrapped in the hub's `GameRoute`, which records playtime.
- Its entry is in `src/games/registry.ts`, with a `Tile` for the art on home.
- Components are named `Minesweeper…` (e.g. `MinesweeperScreen`, `MinesweeperTile`).

It follows the patterns Sudoku and 2048 established (see their docs): Sudoku's levels, picker and timer; 2048's stats panel, header Stats button, save and abandon rules; 2048's screen that measures itself. The look leans towards the original Windows Minesweeper (3D cells, smiley, red LED counters), drawn in the hub's own colours.

## Spec (v1)

- **Levels** (sized for a phone in portrait, no zoom; the mine density of the classic levels):

  | Level | Columns × rows | Mines | Density |
  |---|---|---|---|
  | Beginner | 9 × 9 | 10 | 12 % |
  | Intermediate | 10 × 14 | 22 | 16 % |
  | Expert | 10 × 18 | 37 | 21 % |

  The classic sizes (16 × 16, 30 × 16) would give cells of about 22 px on a phone, too small to tap without zoom.
- **Tap** (a short press) on a covered cell:
  - In **Dig** mode it opens the cell.
  - In **Flag** mode it toggles a flag.
  - A flagged cell can't be opened; remove the flag first.
- **Long press** on a covered cell does the opposite of the mode: it flags in Dig mode and opens in Flag mode. It works as a mouse hold in the web preview.
- **Dig / Flag switch:** one slim row of two selected/unselected buttons above the board (the shared `Button` with `compact flex selected`). The mode is not saved; a game always starts in Dig mode.
- **Opening a cell:**
  - A mine ends the game (loss).
  - A number stays as it is.
  - A 0 opens all its neighbours, and every 0 among them does the same (flood fill). It is iterative, not recursive, and the cells open at once.
  - Flags inside a flooded area are kept: the flagged cell stays covered.
- **No chording:** tapping an opened number does nothing (user).
- **Flags:** flags only, with no "?" marks. A flag can be placed on any covered cell, also a wrong one.
- **First tap:** the mines are placed only after the first tap, never on the tapped cell or its 8 neighbours. So every game starts by opening an area (modern Windows behaviour). Apart from that the placement is random, so a late guess can be needed, as in the original. The first tap opens; in Flag mode the first tap places a flag and the board stays unmined.
- **Win:** every cell without a mine is open (flags don't matter). The remaining mines then show as flags, and the face wears sunglasses.
- **Loss:**
  - all mines are shown;
  - the mine that was hit has a red background;
  - wrong flags (no mine underneath) are crossed out;
  - the face is dizzy.
- **Top bar, as in the original:** a red LED box on the left, the **smiley face** in the middle, a red LED box on the right.
  - **Left LED, mines left:** mines minus flags, three digits, can go negative (`-03`), like the original.
  - **Right LED, timer:** whole seconds, three digits, stops at 999. The timer starts with the first tap and stops at the end. It runs only while the Minesweeper screen is focused and the app is in the foreground (`hooks/use-game-clock`). Stats keep milliseconds.
  - **Face:**
    - normal;
    - surprised while a cell is held down;
    - sunglasses after a win;
    - dizzy after a loss.

    **Tapping the face is New game:** it opens the level picker, the last used level marked, with Cancel while a game runs. There is no separate New game button.
- **Level picker** (like Sudoku's): the three levels with their sizes and mine counts, the last used one marked, each with its best time once it has one, plus **Cancel** while a game runs. The last level is stored. The default is Beginner.
- **Abandon:** picking a level while a **started** game runs (at least one cell opened) records that game as a loss (played +1, streak reset), like 2048. An unstarted board just disappears.
- **Stats per level:** played, wins, win %, best time, current and best win streak.
- **Stats panel:** like 2048's.
  - It takes the whole screen below the header (the board is hidden), with a **Beginner · Intermediate · Expert** switch that opens on the current level.
  - **After a game ends** it opens by itself with a result line (`Won in 1:23`, `New best!` when it is one, or `Boom!`), the level's stats, **Play again** (primary, same level), **Change level** (the picker) and **Close** (back to the finished board).
  - **From the header "Stats" button** it opens anytime, with no result line and no new-game buttons while a game runs. Close returns to the game.
- **Save and resume:**
  - The game is saved after every action and when the clock stops.
  - Opening Minesweeper with an unfinished game **resumes it directly** (like 2048). The timer continues where it stopped.
  - Opening it without one starts an unmined board of the **last used level** at once.
  - A finished game deletes the save.
- **No animations** (like the original): cells change at once. The only feedback is the pressed state: a held cell looks sunken, and the face looks surprised.
- **No undo, no hint** (classic).

## Decisions (decided 2026-10-18), with reasons

- **Phone-fitted levels, max 10 columns, no zoom** (user). Reason: the classic 16 × 16 and 30 × 16 boards give cells of about 22 px, too small to tap; pan/zoom would be a lot of gesture code and awkward on the web. The classic densities keep the difficulty familiar.
- **Long press plus a Dig/Flag switch** (user). Reason: long press is the natural flag gesture on a phone; the switch makes flag-heavy play comfortable and works the same on the web.
- **The first tap opens an area; otherwise classic random** (user). Reason: no lost game on the first tap and always a start area. No-guess boards would need a solver and pre-generated boards.
- **No chording** (user). Reason: kept simple; every cell is opened by hand.
- **Look: classic 3D bevel in hub colours; smiley face as the New game button; graphics drawn from Views; red LED counters** (user). Reason: recognisably Minesweeper, but in the Pencil & Paper palette with dark mode. Drawn shapes look the same on the web and on the phone (emoji differ between platforms and ignore the theme).
- **Game end: the board stays, then the stats panel opens; a header Stats button** (user). Reason: the same pattern as 2048, confirmed on the phone.
- **Resume directly** (user). Reason: like 2048. The timer only runs while the screen is open, so there's nothing to protect with a prompt.
- **An abandoned started game counts as a loss** (user). Reason: keeps win % and streaks honest, like 2048.
- **Stats: played, wins, win %, best time, streaks; best times also in the picker** (user). Reason: 2048's stats plus Sudoku's best time per level.
- **Flags only, no "?" marks; no animations; no vibration; no second chance** (user). Reason: simple and classic. Vibration would need a new package (`expo-haptics`, rule 13), and a "safe cell" hint would need a solver.
- **Numbers in the classic colours** (1 blue, 2 green, 3 red, 4 navy, 5 maroon, 6 teal, 7 black, 8 grey), toned for the paper background and lightened for dark mode. Reason: players read Minesweeper by these colours.
- **Colours:**
  - All of them are theme tokens in `constants/theme.ts`, never literals, in one family (e.g. `mineCell`, `mineBevelLight`, `mineBevelDark`, `mineOpen`, `mineGrid`, `mineNum1` … `mineNum8`, `mineLed`, `mineLedDigit`, `mineBomb`, `mineFlag`, `mineHit`, `mineFace`). The logic never knows colours; the UI maps a value to its token in one place (like 2048's `ramp.ts`).
  - Starting values to tune in the browser:

    | Token | Light | Dark |
    |---|---|---|
    | covered cell face | `#E6E0D2` | `#4A4640` |
    | bevel light (top-left edge) | `#FFFFFF` | `#6B665D` |
    | bevel dark (bottom-right edge) | `#A39C8E` | `#262320` |
    | opened cell | `#F3EFE6` | `#33302C` |
    | grid line between opened cells | `#CFC8BA` | `#24221F` |
    | 1 / 2 / 3 / 4 | `#1F4FD1` / `#2E7D32` / `#D32F2F` / `#1A237E` | `#7FA6FF` / `#7CCB7F` / `#FF7B72` / `#A7B0FF` |
    | 5 / 6 / 7 / 8 | `#8B1A1A` / `#00796B` / `#212121` / `#757575` | `#E08A8A` / `#6FD3C7` / `#E0E0E0` / `#B0B0B0` |
    | LED box / LED digits | `#1A1A1A` / `#FF2A1A` | `#000000` / `#FF4433` |
    | mine / flag | `#1A1A1A` / `#D32F2F` | `#E6E1D8` / `#FF6B5E` |
    | hit mine background | `#E53935` | `#B3261E` |
    | face (yellow) | `#F2C230` | `#E0B12A` |

## Lessons from Sudoku and 2048 built into this design

- **Nothing heavy on the phone.** Mine placement and flood fill are a few array passes over at most 180 cells; there's no solver and no generated data.
- **Fit without scrolling.**
  - The screen measures its own height with `onLayout` (no header-height guess) and sizes the board from it and from the window width. The cell size is the smaller of the width and height limits, with a lower bound so it never reaches 0 (2048's T4 lesson).
  - No ScrollView. The bottom safe area stays free.
  - Check 360×640 and 320×568 in the browser device toolbar with **Expert**. At 360×640 the cells will be roughly 26 px; see "Open decisions".
- **Text centring on Android:** numbers and LED digits use the shared `glyphStyle` (`src/components/glyph-style.ts`).
- **Panels replace controls; they never stack.** The stats panel takes the whole screen below the header, and the level picker takes the place of the board and the controls.
- **Header buttons get a right margin** (the Stats button first sat flush against the edge; copy its width and margin).
- **Stats are written after the save is deleted,** through `replaceSaveWithStats` in `lib/storage.ts`, so a crash can't count a game twice. One rule in one place.
- **Shared data checks:** `isCount`, `isRecord` and `isMs` in `lib/guards.ts`. Times are formatted with `formatTime` from `lib/timer.ts`.
- **No side effects inside React state updaters.** Keep the current game in a ref, and save or write stats outside the updater (2048's T2 review).
- **Tests go through the real route** (`renderRouter`) with the AsyncStorage mock only.
  - Random is predictable: the logic takes a `Random` (`mulberry32` in logic tests), and the UI passes `Math.random`.
  - Route tests start from hand-built boards by mocking the board generator with `jest.mock` + `requireActual` (like 2048's `newGame` mock).
  - Long press is `fireEvent(cell, 'longPress')`.
  - Unmount and settle at the end of every test that checks the save.
- **Accessibility:**
  - Each cell is a button labelled with its row, column and state ("Row 3, column 4, covered", "… flagged", "… 2").
  - A screen reader's double tap is the short tap, and double-tap-and-hold is the long press.
  - The face has the label "New game". The LED boxes have the labels "Mines left 7" and "Time 42 seconds".
- **Saved data may be rejected during development:** a changed format bumps the version, and old data simply starts a fresh game (no migration code; user, 2026-10-17).
- **Shared hub pieces:**
  - `components/button` (`primary`, `compact`, `COMPACT_HEIGHT`), `components/game-route`, `components/glyph-style`;
  - `hooks/use-game-clock`, `hooks/use-theme`;
  - `lib/storage` (`save`, `load`, `remove`, `replaceSaveWithStats`), `lib/random` (`Random`, `mulberry32`, `shuffle`), `lib/guards`, `lib/timer` (`formatTime`);
  - the theme tokens.

## Architecture and storage keys (planned)

```
src/games/minesweeper/
  logic/            # pure TS, unit-tested; the ESLint purity rule applies
    board.ts        # LEVELS (cols, rows, mines), Cell index math, neighbours(i), counts; Board = mines + opened + flagged
    generate.ts     # placeMines(level, safeIndex, random): mines anywhere except safeIndex and its neighbours
    game.ts         # Game { level, mines | null (unmined until the first tap), opened, flagged, status, hit, elapsedMs };
                    # newGame(level), open(game, i, random), toggleFlag(game, i), minesLeft, isStarted, resultOf; pure transitions
    stats.ts        # per level: played, wins, bestMs, currentStreak, bestStreak; recordGame(stats, level, result); win %
    save.ts         # keys, versions; toSave/fromSave (unfinished games only), fromStats, fromSettings
  ui/
    minesweeper-screen.tsx, board.tsx, cell.tsx, top-bar.tsx (LED boxes + face), face.tsx, mine.tsx/flag.tsx (drawn),
    use-minesweeper.ts, level-picker.tsx, stats-panel.tsx, colors.ts (value -> token, one place), tile.tsx (home art)
```

Storage keys, all versioned (`{ version, data }`, version 1 each):
- `minesweeper:save`: `{ level, mines, opened, flagged, elapsedMs }`, the unfinished game; `mines` is empty while the board is unmined.
- `minesweeper:stats`: `{ beginner: …, intermediate: …, expert: … }`, one entry per level.
- `minesweeper:settings`: `{ level }`, the last used level.

## Milestones

Same ticking rule as the hub: tick an item only when its re-check passes and the user has verified it in the web preview. Each step is its own commit with the `Minesweeper:` prefix; shared moves get `Hub:`, docs get `Docs:`. Each milestone gets a ponytail review in a visible pane before its commit.

- [ ] M1. **Logic, test first** (xhigh effort; the first-tap and flood-fill rules are easy to get wrong):
  - `placeMines`: the right count, never on the safe cell or its neighbours (also in corners and on edges), the same seed gives the same board;
  - `open`: the first tap places the mines and opens an area; numbers; flood fill across zeros (iterative), stopping at numbers and keeping flags; opening a mine is a loss with `hit`; flagged cells don't open; finished games don't change;
  - `toggleFlag`: on covered cells only, `minesLeft` can go negative, the first action may be a flag (still unmined);
  - win: all safe cells open → win; the remaining mines count as flagged;
  - `stats`: played, wins, win %, best time, streaks, abandon = loss;
  - `save`: round trips (also unmined), bad data rejected, finished games rejected.
- [ ] M2. **Playable.**
  - The route, the registry entry with `GameRoute`, the colour tokens, the home tile (a mini board with covered and opened cells, a couple of numbers, a flag; the user checks the look).
  - The board for the three levels with the 3D bevel, tap/long press, the Dig/Flag switch, the top bar (LED counters, drawn face), the timer, the level picker on the face, the loss and win display on the board.
  - Route tests: open by tap, flag by long press, flag mode, flood fill, loss, win, the picker and an Expert game, the LED values.
  - The user checks it in the browser.
- [ ] M3. **Save, stats, abandon.**
  - Resume directly, the last used level, the abandon rule, the stats panel after the game ends and from the header, bests in the picker.
  - Route tests for each, with the AsyncStorage mock.
  - The user checks it in the browser.
- [ ] M4. **Polish.**
  - The pressed states (sunken cell, surprised face), accessibility labels, the layout at 360×640 and 320×568 with Expert, and the dark-mode colours.
  - The user checks it in the browser.

Then the hub's Release milestone: the APK is built and tested once, after M4, with the Android checks below as the checklist.

## Android checks

- [ ] Tap and long press are reliable on every level; a long press flags without also opening; the default long-press delay feels right (not too slow).
- [ ] The cells of Expert (10 × 18) are big enough to tap accurately, and the board, top bar and Dig/Flag row fit without scrolling; nothing sits under the navigation bar.
- [ ] The 3D bevel, numbers, mines, flags and face look right in light and dark mode; numbers and LED digits are vertically centred (shared glyph style).
- [ ] The timer pauses in the background and with the screen off, and an unfinished game comes back directly after closing the app, at the same time.
- [ ] The header Stats button sits clear of the screen edge; the picker and the stats panel fit without scrolling.
- [ ] The Minesweeper home tile looks right next to the other games.
- [ ] With TalkBack on, the cells are read with their state, double tap opens, and double-tap-and-hold flags.

## Open decisions

- After M2 in the browser: if Expert's cells at 360×640 are too small to tap comfortably, Expert becomes 10 × 16 with 33 mines (the same density). Ask the user then.
- The token values above are starting points; tune them in the browser.

## Known shortcuts

None yet.
