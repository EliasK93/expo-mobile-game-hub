# Snake

Read this before working on Snake. The hub-wide rules are in `CLAUDE.md`: the gate (with Prettier formatting), tests, git, Herdr, tooling, the shared components and the palette. Everything specific to Snake lives here and nowhere else. Where this document and the repository disagree, the repository wins.

**Status (2026-10-20):** S1 (logic) and S2 (playable) are done; next is S3 in plan mode (rule 10). The decisions below are settled with the user; don't ask about them again. The numbers marked *tune* (speeds, colours) are starting values the user adjusts in the browser.

## Overview

Snake is the sixth game in the hub and its first real-time game: a snake moves across a grid one cell per tick; swipe to turn it; eat apples to grow; hitting a wall or its own body ends the game.
- It lives in `src/games/snake/`.
- Its route is `src/app/snake.tsx` (route `/snake`, game id `'snake'`), the screen wrapped in the hub's `GameRoute`, which records playtime.
- Its entry is in `src/games/registry.ts` (title "Snake"), with a `Tile` for the art on home.
- Components are named `Snake…` (e.g. `SnakeScreen`, `SnakeTile`, `SnakeBoard`).

It follows the patterns the other games established. The most recent finished games are Make 24 (`docs/make24.md`: structure, workflow, hook, picker, stats panel, result line + primary button on the board) and 2048 (`docs/2048.md`: swipes with `PanResponder`, the Score/Best boxes, accessibility actions for the four directions). Minesweeper (`docs/minesweeper.md`) is the reference for a board drawn in its own colour tokens and for the abandon rule.

## Spec (v1)

- **Board:** 15 columns × 21 rows (portrait, like the phone). Cells are square and sized so the board fits the screen without scrolling.
- **Snake:** starts with length 3 in the middle of the lower half, vertical, heading **up**: head at column 8, row 13 (1-based), body below it.
- **Apple:** one apple at a time, on a random empty cell (`lib/random`, seeded in tests). When the snake fills every cell, there is no place for an apple: the game is **won**.
- **Movement:** every tick the head moves one cell in the current direction.
  - Eating the apple grows the snake by one (the tail stays this tick) and places a new apple.
  - **Walls kill** (user): moving off the board ends the game.
  - Moving into the snake's own body ends the game. Moving into the cell the tail leaves in the same tick is allowed (the classic rule), unless the snake grows in that tick.
- **Steering: swipes only** (user). Swipe on the board or on the free area below it, with 2048's `PanResponder` setup (take the gesture after 4 px, a swipe from 8 px, the longer axis wins). In the web preview a mouse drag is a swipe. No arrow buttons, no keyboard.
  - A swipe queues a turn. Up to **2 turns** wait in the queue, one is applied per tick, so a quick "up, left" both register between two ticks.
  - A turn into the opposite direction of the current one (or of the last queued one) is ignored, and so is a turn into the same direction.
- **Start: the first swipe starts the game** (user). A new game shows the snake and the apple, waiting; the first swipe that is not "down" (into its own body) sets the direction and starts the ticks. Before that the game is *unstarted*.
- **Speed levels** (user): **Slow · Normal · Fast**, on the same board. The level sets the starting tick interval; the snake **gets gently faster** (user): every 5 apples the interval shrinks by 5 %, down to a floor. Starting values (*tune*): Slow 220 ms → floor 150 ms, Normal 160 ms → floor 100 ms, Fast 110 ms → floor 70 ms. The interval is computed from the level and the apples eaten (`logic/`), never stored.
- **Pause:** a **Pause** button while the game runs. Paused, the board dims and shows **Paused** with a primary **Continue**; the snake waits and continues in its direction. Swipes do nothing while paused. Leaving the screen, the app going to the background and the screen turning off all **pause** the game (it never runs unseen), and coming back shows it paused.
- **Score:** the apples eaten (length − 3). Two boxes above the board, **Score** and **Best** (the level's best score), copied from 2048's score boxes. The Score box's title names the level, e.g. `Normal · Score` (user, 2026-10-20: the screen shows the level nowhere else). Best is live: the stored best, or the current score once it is higher. **No timer on screen** (user); the game's time is still measured (for the "Longest game" stat), only while the snake runs.
- **Level picker on New** (like Make 24's): the three levels, the last used one marked (`selected`), each with `Best 23` once it has one, plus Cancel. The last level is stored; the default is **Normal**.
- **Abandon:** picking a level while a **started** game is running (running or paused) ends it and records it like a game over, with its score (played +1, its score counts for best and average). An unstarted game just goes.
- **Game over** (user: result line + Play again, like Make 24): the board stays, dimmed, with a result line and a primary **Play again** (a new game of the same level) and **New** (the picker).
  - `Game over · 23 apples`, plus ` · New best!` when the score beats the level's stored best (a score of 0 is never a best).
  - A won game: `You win! · 312 apples`, plus ` · New best!`.
- **Stats per level** (user): games played, best score, average score (whole apples, rounded), longest game (time, `m:ss`). Played counts every finished or abandoned started game.
- **Stats panel:** from the header "Stats" button only (the shared `StatsHeaderButton`), the whole screen below the header: a **Slow · Normal · Fast** switch (`selected`/`muted`) that opens on the current level, the shared `StatsNumbers` row (Played, Best, Average, Longest) and Close. A running game is paused while the panel is open (it stays paused after Close; Continue resumes).
- **Save and resume** (user): a started, unfinished game is saved whenever it pauses (Pause, leaving the screen, background) and when a new game starts; opening Snake **resumes it directly, paused**, waiting for Continue. Without a save, a new unstarted game of the last used level is shown. A finished game deletes the save.
- **Look: Pencil & Paper** (user): a paper board in the hub palette; the snake in ink with an accent-blue head; a red apple. Step-wise movement (the snake jumps one cell per tick, no tweening), so reduced motion changes nothing. No sound, no vibration. No extras in v1 (user: no bonus apple, no obstacles).

## Decisions (decided 2026-10-20), with reasons

- **Speed levels on one board** (user). Reason: speed is what makes Snake hard; one board size keeps the layout and the tests simple. Stats per level, like Minesweeper and Make 24.
- **Walls kill** (user). Reason: the classic rule; wrap-around would make the board feel endless and easier.
- **Gently faster every 5 apples, with a floor** (user). Reason: a game gets tenser as it goes, without becoming unplayable; the floor keeps Fast humanly possible.
- **Pencil & Paper look** (user), not a retro LCD. Reason: one look across the hub; Minesweeper's retro look is the exception that matches its original.
- **Swipes only** (user), no on-screen pad, no keyboard. Reason: 2048's input already works on the phone; the board keeps all the room. The web preview uses mouse drags. Risk: the Android back gesture from the left edge, an Android check.
- **The first swipe starts; Pause button; leaving pauses** (user). Reason: no surprise start, and a real-time game must never run while the player can't see it.
- **Saved and resumed paused** (user). Reason: the same promise as every other game: leaving never loses a game.
- **Result line + Play again on the board; stats only from the header** (user). Reason: games are short; Make 24's pattern keeps the next game one tap away.
- **15 × 21 board** (user). Reason: fills a portrait phone; about 20 px cells on a 360 px wide phone.
- **Score = apples, no timer on screen** (user). Reason: the classic measure, shown like 2048's Score/Best.
- **Stats: played, best, average, longest game** (user).
- **No extras in v1** (user): no bonus apple, no obstacles; they can come later.
- **Turn queue of 2, reverse and same-direction turns ignored** (proposed with the concept, part of the agreed spec). Reason: fast "up, left" swipes between two ticks must both count, and a reverse turn would kill the snake instantly.
- **Step-wise movement, no tweening** (proposed with the concept). Reason: the classic look, no animation code, no reduced-motion case; smooth movement could come later if the phone shows a need.
- **Abandoning a started game records it with its score** (proposed with the concept, like 2048). Reason: the score was earned; played, best and average stay honest. An unstarted game is a free skip, as in Minesweeper and Make 24.
- **Default level Normal** (proposed with the concept).
- **Its own colour tokens** (proposed with the concept): `snakeBoard`, `snakeGrid`, `snakeBody`, `snakeHead`, `snakeApple` in `constants/theme.ts`, light and dark. Starting values (*tune*) from the existing palette: board = `backgroundElement`, grid = `gridLine`, body = `text` (ink), head = `accent`, apple = `digitConflict`'s red. Reason: one place per role, so tuning the snake's look never touches Sudoku's conflict colour or the accent of every button. The logic never knows colours.
- **The tick loop runs exactly when the game clock runs** (proposed with the concept). `hooks/use-game-clock` already stops on blur, background and unmount; the Snake hook needs the same `running` signal to start and stop its tick timer. Expose it from `useGameClock` (a small **Hub:** change, its own commit, with a test in `src/__tests__/use-game-clock.test.tsx`) rather than copying the focus/AppState handling (rule 4).
- **Draw only the snake and the apple, not 315 cells** (proposed with the concept). The board is one view with a grid drawn once; the snake's segments and the apple are absolutely positioned squares. Reason: a tick re-renders a few dozen views, not 315; the phone stays smooth at 70 ms ticks (an Android check).

## Architecture and storage keys (logic built in S1, ui in S2; stats-panel.tsx comes in S3)

```
src/games/snake/
  logic/              # pure TS, unit-tested; the ESLint purity rule applies
    board.ts          # COLS = 15, ROWS = 21, CELLS; cells are indices i = row * COLS + col (0-based), cell(col, row),
                      # colRow(i); LEVEL_IDS = ['slow','normal','fast'], Level, DIRS, Dir, opposite(dir),
                      # next(i, dir) (null = off the board, never wraps)
    game.ts           # Game { level, snake: cells head first, dir, queue: Dir[], apple (null only when won), apples,
                      # status: 'ready' | 'running' | 'paused' | 'over' | 'won' }; START_LENGTH = 3; newGame(level, random),
                      # turn(game, dir), step(game, random), pause, resume, isStarted, interval({ level, apples })
                      # (ms per tick; the SPEEDS table, tune). Game over leaves the snake where it was.
    apple.ts          # placeApple(snake, random): a random empty cell or null (board full); its own module so route
                      # tests can swap it with jest.mock + requireActual (Minesweeper's generate.ts pattern)
    stats.ts          # per level { played, best (0 = none yet), totalApples, longestMs }, EMPTY_STATS;
                      # recordGame(stats, level, { apples, ms }) for game over, win and abandon alike; isNewBest; average
    save.ts           # keys, versions; toSave (null unless running or paused: finished games are never saved), fromSave
                      # (loads paused, empty queue), fromStats, fromSettings (default Normal)
    *.test.ts
  ui/
    snake-screen.tsx, use-snake.ts (game in a ref and in state, the tick timer, saves and stats outside state updaters,
    copied from Make 24's use-make24.ts), board.tsx (PanResponder swipes, grid, snake, apple, dim + overlays),
    score-box.tsx (copy of 2048's), level-picker.tsx, stats-panel.tsx, tile.tsx (home art)
```

- `logic/` is pure TypeScript (no React/RN/Expo imports; ESLint enforces it). All rules live there: what a turn does, a step, eating, growing, dying, winning, the speed. The UI only runs the timer and draws.
- Randomness: the logic takes a `Random` (`mulberry32` from `lib/random` in tests); the UI passes `Math.random`.
- The tick timer: `setTimeout` chained per tick with `interval(game)`, running only while the game is `running` and the clock runs (see Decisions); a test drives it with Jest fake timers. It is re-armed only when the clock's `running` changes or the snake moves, never by a swipe, so a queued turn never delays the next tick. The clock is enabled while the game runs and the picker is closed; its `onStop` pauses a running game (leaving the screen, background, opening the picker).
- Layout (S2): Score · Best boxes, a compact row **New · Pause**, then the board in its swipe area (flex 1, so the space below the board swipes too). Cell size = `max(8, floor(min(width / 15, height / 21)))` from the measured area minus `reservedHeight` (in `snake-screen.tsx`): 21 px (315 × 441 board) at 360 × 640, 18 px (270 × 378) at 320 × 568.

Storage keys, all versioned (`{ version, data }`, version 1 each):
- `snake:save`: `{ level, snake: [[col,row], …] (head first), dir, apple: [col,row], apples, elapsedMs }`, a started unfinished game; it always loads as `paused`. The queue is not saved.
- `snake:stats`: `{ slow: …, normal: …, fast: … }`, per level `{ played, best, totalApples, longestMs }` (average = `totalApples / played`, rounded).
- `snake:settings`: `{ level }`, the last used level.

## Shared hub pieces to use (never copy)

- `components/button` (`primary`, `compact`, `selected` = the accent look, `muted` = grey text for the inactive options of a switch), `components/stats-numbers` (`StatsNumbers`), `components/stats-header-button` (`StatsHeaderButton`), `components/game-route` (`GameRoute`), `components/glyph-style`, themed text/view.
- `hooks/use-game-clock` (with the new `running`), `hooks/use-theme`.
- `lib/storage` (`save`, `load`, `remove`, `replaceSaveWithStats`: the save is deleted before the stats are written), `lib/random` (`Random`, `mulberry32`), `lib/guards` (`isCount`, `isRecord`, `isMs`), `lib/timer` (`formatTime`).
- Tests: `src/test-utils/settle.ts` (`settle()`), `src/test-utils/button-look.ts` (`buttonLook`).
- Copy (don't import across games): 2048's `board.tsx` swipe handling and `score-box.tsx`; Make 24's `use-make24.ts`, `level-picker.tsx`, `stats-panel.tsx` and its result line; Minesweeper's `tile.tsx` (a tile that measures itself and draws a mini board).

## Lessons from the other games built into this design

- **Logic is pure and tested first** (S1). The UI holds no game rules.
- **No side effects inside React state updaters.** The current game lives in a ref; saves and stats are written outside updaters (2048's and Minesweeper's review).
- **Tests go through the real route** (`renderRouter`, `src/__tests__/snake.test.tsx`) with the AsyncStorage mock only; Jest fake timers drive the ticks; `placeApple` is mocked for hand-placed apples; unmount and `settle()` at the end of every test that checks the save.
- **Fit without scrolling:** the screen measures its own height with `onLayout` (no header-height guess) and sizes the cells from it and the window width, with a lower bound; one function holds the rows' heights (Make 24's `reservedHeight`). Check 360×640 and 320×568.
- **A fractional measured width wraps rows:** floor sizes computed from `onLayout` (the Make 24 tile bug, 2026-10-19).
- **Panels replace controls; they never stack:** the stats panel takes the whole screen below the header; the level picker takes the place of the board and controls.
- **Accessibility:** the board offers the four turns as accessibility actions (`up`, `down`, `left`, `right`, labelled "Turn up" etc., 2048's pattern); route tests use them instead of faking gestures. The score boxes are labelled ("Score 23", "Best 41"); the result line is a polite live region (Make 24's message line).
- **Saved data may be rejected during development:** a changed format bumps the version, and old data simply starts fresh (no migration code).
- **Browser test setups:** AsyncStorage on the web writes to `localStorage` under the same key, so a console snippet can seed `snake:save` or `snake:stats` (run it on the home screen, not inside the game).
- **The registry entry pulls Snake into `navigation.test.tsx` and `theme.test.tsx` automatically.**
- **Jest timeout is 15 s** (`package.json`), because the first route test of a suite is slow while all suites run in parallel.

## Milestones

Same ticking rule as the hub: tick an item only when its re-check passes and the user has verified it in the web preview. Each step is its own commit with the `Snake:` prefix; shared changes get `Hub:`, docs get `Docs:`. Each milestone gets a ponytail review in a visible pane before its commit.

- [x] S1. **Logic, test first** (xhigh effort; collisions and the turn queue are easy to get subtly wrong). Done 2026-10-20, no UI to check. Re-check: `npx jest src/games/snake` (e.g. test names containing `two quick swipes between ticks`, `the tail leaves in the same tick`, `not in a tick that grows`, `fills every cell`, `ended against a wall`). For S2: the UI asks `toSave` for the save and removes it when that returns null.
  - `board`/`game`: the start position and length; a step in each direction; eating grows by one and places an apple; walls kill on all four sides; the body kills; moving into the tail's leaving cell is allowed, but not in a tick that grows; the turn queue (2 deep, reverse and same direction ignored, one per tick); the first swipe starts (down ignored); pause/resume; finished games don't change; a full board wins; `interval` per level, every 5 apples 5 % faster, never below the floor; `isStarted`.
  - `apple`: only empty cells, null when the board is full, seeded.
  - `stats`: played, best (0 is never a best), average, longest; abandon = a game over with its score; `isNewBest`.
  - `save`: round trips; bad data rejected (cells off the board, a snake that isn't connected or overlaps itself, the apple on the snake, a bad dir); finished games rejected; loads paused.
- [x] S2. **Playable.** Done 2026-10-20, checked by the user in the browser (speeds and colours kept at their starting values). Re-check: `npx jest src/__tests__/snake.test.tsx src/__tests__/use-game-clock.test.tsx` (e.g. test names containing `a swipe just before a tick does not delay it`, `its own body ends it`, `leaving the screen pauses it`, `the app going to the background pauses it`, `New best! only when the score beats`, `running is true exactly while the clock counts`). Until S3, Best lives only for the session, so the first scoring game shows "New best!", and picking a level drops a running game without recording it.
  - **Hub:** `useGameClock` exposes `running` (own commit, with its test).
  - The route, the registry entry with `GameRoute`, the home tile (a mini board with a short snake and an apple; the user checks the look), the colour tokens.
  - The board with swipes, the tick loop, Pause/Continue, the Score/Best boxes (Best from this session only until S3), the level picker on New, the result line with Play again.
  - Route tests: start by swipe, turns, eating, the wall and the body, pause/continue, pausing on blur, game over, play again, the picker; ticks with fake timers.
  - The user checks it in the browser and tunes the speeds and colours.
- [ ] S3. **Save, stats, abandon.**
  - Resume directly (paused), the last used level, the abandon rule, the stats panel from the header, bests in the picker and the Best box from storage.
  - Route tests for each, with the AsyncStorage mock; seed snippets for the user.
  - The user checks it in the browser.
- [ ] S4. **Polish.**
  - The layout at 360×640 and 320×568, accessibility labels and actions, dark mode, the final speeds and colours.
  - The user checks it in the browser.

Then the hub's Release milestone: the APK is built and tested once, after S4, with the Android checks below as the checklist.

## Android checks

- [ ] Swipes turn the snake reliably at every level, also fast ones (two turns between two ticks); a swipe from the left edge does not trigger Android's back gesture instead.
- [ ] The snake moves smoothly at the fastest speed (no stutter or skipped ticks).
- [ ] The game pauses in the background and with the screen off, and comes back paused after closing the app.
- [ ] The board, the score boxes and the button row fit without scrolling; nothing sits under the navigation bar.
- [ ] The snake, its head and the apple are clearly visible in light and dark mode.
- [ ] The header Stats button sits clear of the edge; the picker and the stats panel fit without scrolling.
- [ ] The Snake home tile looks right next to the other games.

## Open decisions

- The speeds (start and floor per level) and the colours: the starting values passed the S2 browser check unchanged; the final call is in S4 (and on the phone).

## Known shortcuts

- `logic/save.ts` (`fromStats`): stats with any bad field fall back to empty as a whole; keep the good levels if a format change ever needs it (as in Minesweeper and Make 24). Re-check: `Select-String -Path src/games/snake/logic/save.ts -Pattern 'ponytail:'`.
