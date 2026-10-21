# Make 24

Read this before working on Make 24. The hub-wide rules are in `CLAUDE.md`: the gate (with Prettier formatting), tests, git, Herdr, tooling, the shared components and the palette. Everything specific to Make 24 lives here and nowhere else. Where this document and the repository disagree, the repository wins.

**Status (2026-10-19):** M1-M5 are done (logic, pool, playable, save and stats, polish), all checked in the browser. Released: every Android check below passed on the phone (APK, 2026-10-19). The decisions below are settled with the user; don't ask about them again.

## Overview

Make 24 is the fifth game in the hub, the classic "24 game": four numbers from 1 to 13; combine all four with + − × ÷ to make exactly 24. Each number is used exactly once, in any order, with any bracketing. Example: 3 3 8 8 → 8 ÷ (3 − 8 ÷ 3) = 24.
- It lives in `src/games/make24/`.
- Its route is `src/app/make24.tsx` (route `/make24`, game id `'make24'`), the screen wrapped in the hub's `GameRoute`, which records playtime.
- Its entry is in `src/games/registry.ts` (title "Make 24"), with a `Tile` for the glyph on home.
- Components are named `Make24…` (e.g. `Make24Screen`, `Make24Tile`). Identifiers can't start with a digit, so the prefix is the whole name.

It is a separate game, not a drill inside a shared "Brain" game (user, 2026-10-18). It follows the patterns the other games established; Minesweeper (`docs/minesweeper.md`) is the most recent finished game and the best reference for structure, tests and workflow.

## Spec (v1)

- **Puzzles:** four numbers from 1 to 13, repeats allowed (e.g. 3 3 8 8). Only solvable puzzles are used. All solvable sets are found ahead of time and shipped as data (see "Puzzle pool").
- **Rules (classic):**
  - Use all four numbers, each exactly once, with + − × ÷, in any order and any bracketing.
  - **Fractions in between are allowed** and exact: 8 ÷ 3 is 8/3, not 2.67 (user). This keeps the classic hardest puzzles (3 3 8 8, 1 5 5 5, 3 3 7 7, 4 4 7 7).
  - Negative numbers in between are allowed (e.g. 1 − 5 = −4), as in the classic game.
  - Division by 0 is not allowed.
  - The target is always 24.
- **Levels:** Easy, Medium, Hard, rated by the solver when the pool is built (see "Rating"). A level picker on New (like Sudoku's): the three levels, the last used one marked (`selected`, the hub's selection look), each with its best time once it has one, plus Cancel. The last level is stored. The default is Easy.
- **Input: combine two cards** (user; how the original apps do it, no brackets needed: the order you combine in *is* the bracketing):
  - The four numbers are shown as four cards in a 2 × 2 grid, sorted ascending.
  - Tap a card: it is selected (pencil yellow). Tap it again: deselected. Tap another card while no operator is chosen: that one is selected instead.
  - Tap an operator (+ − × ÷) while a card is selected: the operator is selected (the hub's `selected` look). Tapping another operator switches; tapping it again deselects it. Operators do nothing while no card is selected.
  - Tap a second card while a card and an operator are selected: the two combine. The result card takes the second card's place, the first card's place becomes empty, and the result card is selected again (so the next step can continue from it). Selection of the operator clears.
  - Order matters for − and ÷: first card − second card, first card ÷ second card.
  - ÷ by a card that is 0: nothing combines; the message line says "Can't divide by 0".
  - A card shows its exact value: whole numbers as `24`, fractions as `8/3`, negatives with a minus sign (`−4`, `−11/3`).
  - When one card is left: if it is 24, the puzzle is solved. Otherwise the message line says "That's 20, not 24" and Undo is the way back.
- **Undo:** one combine step back (the two cards come back where they were), repeatable back to the start. Disabled at the start and after the puzzle ends. The steps are saved (see storage), so Undo works after a resume too.
- **Hint:** shows the next step of a solution **from the current cards**, as text in the message line (e.g. "Try 8 ÷ 3") and by marking the two cards. If the current cards can't make 24 any more, the hint says "These cards can't make 24, undo a step". Using a hint makes the puzzle **hinted**. Hints are unlimited.
- **Give up:** shows a whole solution from the start, as steps (`8 ÷ 3 = 8/3 · 3 − 8/3 = 1/3 · 8 ÷ 1/3 = 24`). The puzzle counts as not solved.
- **Timer:** the time on the current puzzle, `m:ss`, shown above the cards. It starts when the puzzle is shown and runs only while the Make 24 screen is focused, the app is in the foreground, the puzzle is unsolved and no panel or picker covers it (`hooks/use-game-clock`). Stats keep milliseconds.
- **After a puzzle ends** (solved or given up) the board stays, with a result line and a primary **Next** button (user; puzzles are short, so no stats panel opens by itself):
  - `Solved in 0:42`, plus ` · New best!` when it is the level's best time;
  - `Solved with hints in 0:42` (no best time);
  - after Give up: the solution steps.
  - Next starts the next puzzle of the same level. The picker (New) stays available.
- **Puzzle order:** each level's puzzles come in a stored shuffled order, so nothing repeats until every puzzle of that level was played (user; `logic/order.ts`).
- **Abandon:** picking a level in the picker (New) while a **started** puzzle is unsolved counts it as not solved (played +1, streak reset), like Minesweeper. Started = at least one combine on the board now, or any hint used. An unstarted puzzle just goes (a free skip before touching it); so does one whose combines were all undone without a hint (user, 2026-10-18).
- **Stats per level:** played, solved, solved %, current and best streak, best time.
  - A **hinted solve** counts as played and solved but doesn't extend the streak (it neither increases nor resets it) and doesn't set a best time (the hub's hint rule, as in Sudoku).
  - Give up and abandon count as played, not solved, and reset the current streak.
- **Stats panel:** from the header "Stats" button only (the shared `StatsHeaderButton`). It takes the whole screen below the header, with an **Easy · Medium · Hard** switch (`selected`/`muted`) that opens on the current level, the numbers in the shared `StatsNumbers` row (Played, Solved %, Current streak, Best streak, Best time) and Close. The clock is paused while it is open.
- **Save and resume:** the unfinished puzzle is saved after every action and when the clock stops; opening Make 24 **resumes it directly** (with its steps, hints and time). Without one, the next puzzle of the last used level starts at once. A finished puzzle deletes the save. A new puzzle is saved as soon as it is shown (M4), so reopening the app shows the same puzzle instead of using up the next one; each pick also stores the level's order at once.
- **No animations** (cards change at once; the pressed and selected states are the feedback). No sound, no vibration.

## Decisions (decided 2026-10-18), with reasons

- **Separate game, not a "Brain" game with drills** (user). Reason: each game keeps its own tile, folder, doc and stats; any game can later be extracted as a standalone app (only the hub and generic code are shared).
- **Classic 24 with rated levels; target always 24; numbers 1–13** (user). Reason: the original game; more numbers would often make it easier, not harder, so difficulty comes from the rating.
- **Combine two cards, any order** (user, after asking whether the order is fixed: it isn't in the original, and a fixed order with only operators would be a different, easier game). Reason: no brackets to type, about 9 taps per puzzle, and the combine order is the bracketing.
- **Exact fractions allowed** (user). Reason: keeps the classic hardest puzzles; floating point would make 8 ÷ (3 − 8 ÷ 3) miss 24.
- **One puzzle at a time with a timer** (user), not a timed sprint. Reason: the same rhythm as Sudoku; a sprint mode could come later.
- **Hint + Give up** (user). Reason: the hub's pattern (Sudoku); the hint works from the current cards, so it helps also after a wrong first step.
- **Paper cards** (user), not playing cards: large numbers on raised paper cards in the hub palette, the selected card in pencil yellow; 11–13 as numbers.
- **Resume directly; a started puzzle that is left counts as not solved** (user). Reason: keeps solved % and streaks honest, like Minesweeper; an untouched puzzle can be skipped for free.
- **Result line + Next on the board; stats only from the header** (user). Reason: puzzles take seconds to minutes; a panel after each one would get in the way.
- **Shuffled order without repeats per level** (user).
- **No new colour tokens unless the browser check shows a need.** Starting look: cards `backgroundElement` with a `gridLine` border (raised: a slightly darker bottom edge, e.g. `backgroundSelected`), numbers in `text` with `glyphStyle`; selected card `cellSelected` (pencil yellow); operators and actions are the shared `Button` (selected operator = `selected`); messages in `textSecondary`, "Can't divide by 0" and "not 24" in `digitConflict`. If a new token is needed, it goes into `constants/theme.ts` with a `make24` prefix, light and dark.
- **Selection, operator and the last notice (÷ 0, hint) live in `Game`** (M1), not in the UI hook. Reason: what a tap does is a rule, and rules live in `logic/`. Replaying saved steps (`replay`, the one rebuild path for Undo and resume) leaves the last result selected, as after a live combine.
- **Solver on the device is fine** (not "heavy work"): from four cards there are at most 6 pairs × 6 results × … ≈ 3,900 combine paths, a few milliseconds. The pool and the rating are built ahead of time anyway, so the app never searches over many puzzles.

## Rating and the puzzle pool

- **Solver** (`logic/solve.ts`): exact fractions; from a list of values it tries every unordered pair and every result (a + b, a × b, a − b, b − a, a ÷ b, b ÷ a, no division by 0) and recurses until one value is left.
  - `ways(numbers)`: how many combine paths end at 24 (a + b and b + a count once, likewise ×).
  - `needsFraction(numbers)`: true when every path that reaches 24 has a non-whole value in between.
  - `solution(values)`: one path to 24 from the given values (used by Give up from the start and by Hint from the current cards), or null.
- **Rating:** all solvable sets are sorted by (`needsFraction` last, then `ways` descending: more ways = easier) and split into three equal parts: Easy, Medium, Hard. So every fraction puzzle is Hard, and the rest are graded by how many ways lead to 24.
- **Pool size:** of the 1,820 sets of four numbers from 1 to 13, **1,362 are solvable** (the commonly cited figure for these rules). The build test checks that count; a different number means a solver bug or a rule difference, to investigate before shipping.
- **Shipped as data:** `src/games/make24/data/puzzles.json`, `{ "easy": [[1,2,3,4], …], "medium": […], "hard": […] }`, the numbers sorted ascending. No solutions are stored (the solver finds them on the device). Built by `logic/build-puzzles.test.ts`, skipped unless `$env:MAKE24_BUILD = '1'` (the Sudoku pattern: a Jest test as the build script, so it runs in the same TypeScript setup). `logic/puzzles-data.test.ts` checks the shipped file on every gate: every puzzle solvable, sorted, in range, no duplicates across levels, the three sizes within 1 of each other, 1,362 in total. `data/` is in `.prettierignore` already (`src/games/*/data/`).
- After the pool is built (M2) the build prints a few sample puzzles per level with their `ways`; the user plays some in the browser after M3 and may ask to move the split (an open decision then).
- **Rebuild** (PowerShell, repo root): `$env:MAKE24_BUILD = '1'; npx.cmd jest src/games/make24/logic/build-puzzles.test.ts; Remove-Item Env:MAKE24_BUILD` (about 7 s, deterministic: ties are broken by the numbers). Each level is stored in rating order, easiest first.
- **The split as built (2026-10-19):** Easy 454 puzzles, 300 to 20 ways; Medium 454, 20 to 8 ways; Hard 454, 8 to 1 ways. Only 16 of the 1,362 sets need fractions (3 3 8 8, 1 5 5 5, 3 3 7 7, 4 4 7 7 among them), so Hard is mostly the sets with few ways. Neighbouring levels share their boundary value (20, 8).

## Lessons from Sudoku, 2048 and Minesweeper built into this design

- **Nothing heavy on the phone:** the pool and rating are built ahead of time; the on-device solver works on at most four cards.
- **Logic is pure and tested first** (`logic/`, ESLint enforces no React/RN/Expo imports). The UI holds no game rules: which cards may combine, the result, solved/not 24, hint and give-up texts' values all come from `logic/`.
- **Exact numbers:** a small fraction type in `logic/fraction.ts` (numerator, denominator, always reduced, denominator > 0); format in one place (`8/3`, `−4`).
- **Fit without scrolling:** the screen measures its own height with `onLayout` (no header-height guess) and sizes the cards from it and the window width, with a lower bound so nothing reaches 0 (2048's and Minesweeper's pattern). No ScrollView; the bottom safe area stays free. Check 360×640 and 320×568.
- **Card text size from card size and text length** (`−11/3` is five characters; 2048's `numberSize` idea), with the shared `glyphStyle` for Android centring.
- **Panels replace controls; they never stack:** the stats panel takes the whole screen below the header; the level picker takes the place of the cards and controls.
- **Shared hub pieces to use, never copy:**
  - `components/button` (`primary`, `compact`, `selected` = the accent look, `muted` = grey text for the inactive options of a switch), `components/stats-numbers` (`StatsNumbers`), `components/stats-header-button` (`StatsHeaderButton`: width and right margin solved), `components/game-route`, `components/glyph-style`, themed text/view;
  - `hooks/use-game-clock`, `hooks/use-theme`;
  - `lib/storage` (`save`, `load`, `remove`, `replaceSaveWithStats`: the save is deleted before the stats are written, so a crash can't count a game twice), `lib/random` (`Random`, `mulberry32`, `shuffle`), `lib/guards` (`isCount`, `isRecord`, `isMs`), `lib/timer` (`formatTime`), `lib/stats` (`winPercent`).
  - Copy (don't import across games) the per-game patterns: Minesweeper's `use-minesweeper.ts` (game in a ref and in state, stable handlers, saves and stats writes outside state updaters, `persist` on clock stop), its level picker and stats panel.
- **No side effects inside React state updaters.** Keep the current game in a ref; save and write stats outside the updater (2048's review).
- **Tests go through the real route** (`renderRouter`) with the AsyncStorage mock only.
  - Random is predictable: the logic takes a `Random` (`mulberry32` in logic tests); the UI passes `Math.random`.
  - Route tests start from hand-picked puzzles by mocking the module that picks the next puzzle with `jest.mock` + `requireActual` (Minesweeper mocks `logic/generate.ts` this way; keep the picking function in its own module so it can be swapped).
  - Unmount and settle at the end of every test that checks the save.
  - Shared test helpers live in `src/test-utils/` (e.g. `button-look.ts` reads a Button's look).
- **The registry entry pulls Make 24 into `navigation.test.tsx` and `theme.test.tsx` automatically.**
- **Accessibility:** each card is a button labelled with its value and state ("Card 8", "Card 8/3, selected"); empty places are not buttons; operators are labelled "Plus", "Minus", "Times", "Divided by"; the timer "Time 0:42".
- **Saved data may be rejected during development:** a changed format bumps the version, and old data simply starts fresh (no migration code; user, 2026-10-17).
- **Browser test setups:** AsyncStorage on the web writes straight to `localStorage` under the same key, so a one-line console snippet can seed a `make24:save` for the user (run it on the home screen, not inside the game, or the running game saves over it).

## Architecture and storage keys

`logic/` (M1) and `data/` with its build and data tests (M2) are built; `pool.ts` and `ui/` come in M3.
`LEVEL_IDS`/`Level`, `replay`, `isStarted` and `message` live in `game.ts`; the operators (`Op`, `SYMBOL`, `apply`) and `TARGET` in `solve.ts`.

```
src/games/make24/
  logic/              # pure TS, unit-tested; the ESLint purity rule applies
    fraction.ts       # Fraction { n, d } (reduced, d > 0); make, add, sub, mul, div (null for ÷ 0), equals, isWhole, format
    solve.ts          # ways, needsFraction, solution(values) -> steps | null
    game.ts           # Game { level, numbers, cards: (Fraction | null)[4], steps, selected, operator, hints, status:
                      # playing | solved | gaveUp }; newGame, tapCard, tapOperator, undo, hint, giveUp, isStarted, message;
                      # pure transitions that return the same game when nothing changes
    order.ts          # per-level shuffled order over the pool; next(order, level, random)
    pool.ts           # LEVELS, the pool from data/puzzles.json, nextPuzzle(...) in its own module (route tests mock it)
    stats.ts          # per level: played, solved, currentStreak, bestStreak, bestMs; recordGame(stats, level,
                      # { solved, hinted, ms }); isNewBest
    save.ts           # keys, versions; toSave/fromSave (unfinished only; replays the steps to rebuild the cards),
                      # fromStats, fromSettings, fromOrder
    build-puzzles.test.ts, puzzles-data.test.ts
  data/puzzles.json
  ui/
    make24-screen.tsx, use-make24.ts, cards.tsx (2 x 2 grid, card size, text size), operators.tsx, level-picker.tsx,
    stats-panel.tsx, tile.tsx (home glyph: the four operators, yellow, on the hub's GlyphTile)
```

The selected card and operator may live in the UI hook instead of `Game` if that is simpler; decide in M1's plan. Whatever decides a rule (what a tap does, the result, solved) stays in `logic/`.

Storage keys, all versioned (`{ version, data }`, version 1 each):
- `make24:save`: `{ level, numbers, steps, hints, elapsedMs }`, the unfinished puzzle; `steps` are the combines in order (`{ first, second, op }` as card places), replayed on load.
- `make24:stats`: `{ easy: …, medium: …, hard: … }`, one entry per level.
- `make24:settings`: `{ level }`, the last used level.
- `make24:order`: per level the shuffled order of the pool and how far it has been played.

## Milestones

Same ticking rule as the hub: tick an item only when its re-check passes and the user has verified it in the web preview. Each step is its own commit with the `Make 24:` prefix; shared moves get `Hub:`, docs get `Docs:`. Each milestone gets a ponytail review in a visible pane before its commit.

- [x] M1. **Logic, test first** (xhigh effort; exact arithmetic and the solver are easy to get subtly wrong). Done 2026-10-18, no UI to check. Re-check: `npx jest src/games/make24` (e.g. test names containing `1,362`, `divide by 0`, `second card's place`, `undo`). `solve.test.ts` takes about 10 s in the gate (the full 1,820-set count). For M3: every in-play text comes from `message(game)`; only the "Solved in 0:42" line, which needs the time, is built in the UI.
  - `fraction`: reduce, signs, ÷ 0 → null, format (`8/3`, `−4`, `24`);
  - `solve`: 3 3 8 8, 1 5 5 5, 3 3 7 7, 4 4 7 7 are solvable and need fractions; 1 1 1 1 has no solution; 1 2 3 4 has many ways; `solution` from any partial state, or null; the count over all 1,820 sets is 1,362;
  - `game`: select/deselect/switch, operator, combine order for − and ÷, ÷ 0 refused, the result takes the second card's place and stays selected, solved at 24, "not 24" at another last value, undo back to the start, hint (marks hinted; "can't make 24" state), give up, finished games don't change, `isStarted`;
  - `stats`: the hint rule, give up and abandon = not solved, best time, streaks;
  - `order`: no repeats until a level is used up, a stale order is replaced;
  - `save`: round trips (also with steps), bad data rejected, finished puzzles rejected.
- [x] M2. **Puzzle pool.** Done 2026-10-19, no UI to check. Re-check: `npx jest src/games/make24/logic/puzzles-data.test.ts` (about 1.8 s in the gate). `pool.ts` (load the pool, pick the next puzzle) moves to M3, its first user. `build-puzzles.test.ts` (skipped unless `MAKE24_BUILD`), `data/puzzles.json`, `puzzles-data.test.ts` in the gate; the rating split; a printed sample per level for the user.
- [x] M3. **Playable.** Done 2026-10-19, checked by the user in the browser ("all good"). Re-check: `npx jest src/__tests__/make24.test.tsx` (describe blocks `opening`, `selecting`, `combining`, `finishing`, `level picker`, `timer`). Built as:
  - Rows from top: `Easy · 0:42` (labelled `Time 0:42`), the message line (fixed height, up to two lines), the 2 × 2 cards, the operator row (`Plus`, `Minus`, `Times`, `Divided by`), the action row (fixed height: compact Undo · Hint · Give up · New while playing; New · primary Next once finished). The picker replaces everything below the top line; the clock pauses while it is open.
  - Cards: the size is the smaller of what fits the width and the measured height (48 to 200); text size `min(size × 0.5, (size − 8) / (0.6 × length))`. A hinted card is `cellHint` (Sudoku's hint tint) and wins over selected; the label carries both (`Card 8, selected, hint`). Cards are disabled once the puzzle is finished. The raised edge is a thicker bottom border (`gridLine` and `backgroundSelected` are the same colour).
  - ~~The home tile shows 3 3 8 8 as paper cards on `backgroundSelected`, so they stand out.~~ Replaced 2026-10-21: the home tile is a glyph, the four operators in yellow (`glyphMake24`) on the hub's `GlyphTile`, because all home tiles became glyphs of one style (see CLAUDE.md, Stack).
  - `pool.ts` `pickPuzzle(level, order, random)` wraps `nextPuzzle` over the shipped pool; the orders live in memory until M4 stores them. Route tests swap it with `jest.mock` + `requireActual`.
  - The route, the registry entry with `GameRoute`, the home tile (then four paper cards, 3 3 8 8; a glyph since 2026-10-21; the user checks the look).
  - The cards, operators, combine flow, Undo, Hint, Give up, the message line, the timer, the result line + Next, the level picker on New.
  - Route tests: combine and solve, − and ÷ order, ÷ 0, not 24, undo, hint, give up, next, the picker.
  - The user checks it in the browser.
- [x] M4. **Save, stats, abandon, order.** Done 2026-10-19, checked by the user in the browser. Re-check: `npx jest src/__tests__/make24.test.tsx` (describe blocks `resume`, `saving`, `order`, `stats`, `abandon`, `stats panel and picker`). The stats panel has no result line and no new-game buttons (the result line stays on the board). The browser check found the home tile wrapping its cards into one column at phone width (fractional measured width); the card size was floored and the gap took the rest (that tile and its `home tile` test are gone since the glyph tiles of 2026-10-21).
  - Resume directly, the last used level, the shuffled order, the abandon rule, the stats panel from the header (shared components), bests in the picker.
  - Route tests for each, with the AsyncStorage mock; a seed snippet for the user.
  - The user checks it in the browser.
- [x] M5. **Polish.** Done 2026-10-19 (run in auto mode at the user's request, no plan step), checked by the user in the browser (360×640, 320×568, the long values `−157/156` and `28561`, dark mode). Re-check: `npx jest src/games/make24/ui/cards.test.ts src/__tests__/make24.test.tsx` (tests named `textSize`, `fit without scrolling`, describe `accessibility`). Nothing needed a layout change: `textSize` fits 8 characters on the smallest (48 px) card, and the fit rule (`reservedHeight` in `make24-screen.tsx`, the one place for the rows' heights) leaves 120 px cards at 320×568 with a 48 px bottom inset. The message line is a polite live region, so TalkBack reads each new message. No literal colours in `ui/`; no dark-mode route test (no game has that pattern).
  - Card text for long values (`−11/3`, `169`), the layout at 360×640 and 320×568, accessibility labels, dark mode.
  - The user checks it in the browser.

Then the hub's Release milestone: the APK is built and tested once, after M5, with the Android checks below as the checklist.

## Android checks

- [x] Card and operator taps are reliable; the selected card and operator are clearly visible in light and dark mode.
- [x] Long values (`−11/3`, `−157/156`, `28561`) fit on a card with the phone's real font (the test only checks a 0.6 em estimate); numbers are vertically centred (shared glyph style).
- [x] A Give up solution on Hard fits the two-line message line on the phone (a longer one is cut off).
- [x] Cards, operators, the action row and the message line fit without scrolling; nothing sits under the navigation bar.
- [x] The timer pauses in the background and with the screen off; an unfinished puzzle comes back directly after closing the app, with its steps and time.
- [x] The header Stats button sits clear of the edge; the picker and the stats panel fit without scrolling.
- [x] The Make 24 home tile looks right next to the other games. (Checked for the old paper-cards tile; the glyph tile is covered by the hub-wide glyph check in CLAUDE.md.)
- [x] With TalkBack on, cards and operators are read with their value and state, and a new message ("Can't divide by 0", "Try …", the result line) is read out by itself.

## Open decisions

- After M2/M3: whether the Easy / Medium / Hard split feels right in play (the split rule above is the starting point).
- The look (cards, colours): accepted at the M3 browser check; tune it in M5 if the phone shows a need.

## Known shortcuts

The `ponytail:` comments in `src/games/make24/`. Re-check: `Get-ChildItem src/games/make24 -Recurse -File | Select-String -Pattern 'ponytail:'`.

- `logic/order.ts`: a stale order (the pool changed) is dropped whole, so retuning the pool loses the progress through the old order. The stale check compares length and membership only, so a corrupted order with one puzzle repeated and another missing passes. Revisit if the pool is retuned after release.
- `logic/puzzles-data.test.ts`: the rating (ways order between levels, no fractions below Hard) is checked on every 10th puzzle per level; set `SAMPLE_EVERY` to 1 after a rebuild to check them all.
- `logic/save.ts`: stats with any bad field fall back to empty as a whole; keep the good levels if a format change ever needs it.
