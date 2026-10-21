# Anagram Sprint

Read this before working on Anagram Sprint. The hub-wide rules are in `CLAUDE.md`: the gate (with Prettier formatting), tests, git, Herdr, tooling, the shared components and the palette. Everything specific to Anagram Sprint lives here and nowhere else. Where this document and the repository disagree, the repository wins.

**Status (2026-10-21):** A1 (the word data) is done; there is no game code yet. Next is A2 (the logic). The decisions marked "(user)" are settled; the ones marked "proposed" are part of the agreed concept unless the user changes them when A2/A3 is planned.

## Overview

Anagram Sprint is the sixth game in the hub: a scrambled word appears as letter tiles; tap the letters in the right order to spell a word; solve as many as you can in 60 seconds.
- It lives in `src/games/anagram/`.
- Its route is `src/app/anagram.tsx` (route `/anagram`, game id `'anagram'`), the screen wrapped in the hub's `GameRoute`, which records playtime.
- Its entry is in `src/games/registry.ts` (title "Anagram Sprint"; if it wraps badly on the 3-column home grid, the user decides on a shorter title in A3), with a `Tile` for the art on home.
- Components are named `Anagram…` (e.g. `AnagramScreen`, `AnagramTile`, `AnagramRack`).

It follows the patterns the other games established. Snake (`docs/snake.md`) is the closest model: levels picked on New, Score/Best boxes, a timed run that pauses whenever the player can't see it, save on pause, result line + Play again, stats per level. Make 24 (`docs/make24.md`) is the model for tapping cards to build an answer, and for shipped data built by an env-gated build test.

## Spec (v1)

- **A round:** 60 seconds on a countdown. One scrambled word at a time (user); solving it shows the next word at once. The score is the number of words solved.
- **Levels by word length** (user): **Easy** 4 letters · **Normal** 5 · **Hard** 6. Every word in a round has the level's length. Picked on New (a level picker like Snake's); the last level is stored; the default is **Normal**.
- **Letters:** the scrambled letters sit as tiles in a row (the *rack*); above it, an *answer row* with one empty slot per letter.
  - Tapping a rack tile moves its letter into the next empty answer slot. Tapping a letter in the answer row sends it back to the rack (proposed).
  - When the last slot fills, the word is checked at once (proposed, no Check button): if the letters spell **any accepted word** (not only the one the round picked, e.g. TAPER for PATER), it counts and the next word appears; otherwise the answer row flashes red briefly and the letters stay, so the player can fix them.
  - **Shuffle** reorders the rack's remaining tiles; **Clear** sends every answer letter back (proposed).
- **Skip costs time** (user): **Skip** shows the solution in the answer row for a moment and moves on; it costs **5 seconds** of the countdown. A skip never counts as solved. The clock keeps running while the solution shows (proposed: about 1 s).
- **Scramble:** the rack's order is never itself an accepted word (re-shuffle until it isn't), and no word repeats within a round (proposed).
- **Start:** a new round shows the level and a primary **Start**; the letters appear and the countdown starts on Start (proposed: no letters to study before the clock runs).
- **Pause:** a **Pause** button while the round runs. Paused, the letters are **hidden** (no thinking time for free) and a primary **Continue** shows. Leaving the screen, the app going to the background and the screen turning off all pause the round, and coming back shows it paused (Snake's rule, via `useGameClock`'s `running`).
- **Score boxes:** **Score** (words solved this round, its title naming the level, e.g. `Normal · Score`) and **Best** (the level's best round), copied from Snake's boxes. The countdown shows next to them or above the rack (decided in A3 with the layout).
- **Round end:** at 0:00 the rack is dimmed with a result line and a primary **Play again** (same level) and **New** (the picker): `Time! · 12 words`, plus ` · New best!` when the score beats the level's stored best (0 is never a best).
- **Abandon:** picking a level while a started round runs or is paused ends it and records it with its score (Snake's rule). A round that hasn't started just goes.
- **Stats per level** (proposed): rounds played, best, average (whole words, rounded), words solved in total. Played counts every finished or abandoned started round.
- **Stats panel:** from the header "Stats" button only (`StatsHeaderButton`), the whole screen below the header: an **Easy · Normal · Hard** switch (`selected`/`muted`) opening on the current level, the shared `StatsNumbers` row (Played, Best, Average, Words) and Close. A running round is paused while it is open.
- **Save and resume:** a started, unfinished round is saved whenever it pauses (as in Snake) and resumes paused when Anagram Sprint opens. A finished round deletes the save.
- **Look: Pencil & Paper:** letter tiles like Make 24's cards, in the hub palette and `glyph-style`; a solved word flashes in the `accent` colour, a wrong full answer in the conflict red (both brief; reduced motion: colour only, no movement). No sound, no vibration.
- **Input:** taps only. No on-screen or physical keyboard (proposed: the tiles are the keyboard; web uses mouse clicks).

## Decisions (decided 2026-10-21), with reasons

- **One word at a time** (user), not one rack to find many words in. Reason: the sprint feel of "as many as possible in 60 s", one clear target at a time.
- **Levels by word length: 4 · 5 · 6** (user). Reason: length is what makes an anagram hard; stats per level like Snake, Minesweeper and Make 24.
- **Skip costs 5 seconds** (user). Reason: a stuck word must not end the run, but skipping must not be free, or skipping hard words would be the best tactic.
- **English words from SCOWL** (user). Reason: a free list with a permissive licence (MIT-like; its copyright notice must ship with the data: `data/SCOWL-LICENSE.txt`); common words only, so every word is fair.
- **Any accepted anagram counts** (proposed). Reason: a player who finds TAPER for PATER solved it; rejecting a real word feels like a bug.
- **Auto-check when the last slot fills** (proposed). Reason: one tap less per word in a 60-second sprint; a wrong answer stays editable.
- **Letters hidden while paused; Start before the first word** (proposed). Reason: pausing or a ready screen must not give free thinking time.
- **Abandoning a started round records it with its score** (proposed, Snake's rule). Reason: played, best and average stay honest.
- **Answers are common US-spelling words** (user, 2026-10-21): SCOWL size ≤ 35, categories `english` + `american`, 4–6 letters, `a-z` only. Reason: every puzzle word should be one the player knows.
- **Accepted is much wider** (user, 2026-10-21): SCOWL size ≤ 80, also British, Canadian, Australian and variant spellings, plus every answer. Reason: any real word the player spells counts (a rejected real word feels like a bug).
- **Inflected forms are accepted but never puzzles** (user, 2026-10-21): regular plurals and past tenses, and `-ing`, doubled-consonant `-ed`, `-ier`/`-iest` and e-drop `-er`/`-est` forms, are dropped from the answers when the stem is a common word (cats ← cat, making ← make, jugged ← jug, hazier ← hazy, safest ← safe). Reason: scrambling "walked" when "walk" is a puzzle is a cheaper, duller puzzle. For the inflection rules (not plurals and past tenses) a stem of two letters or fewer does not count (it would drop being, west, ring).
- **Plain `-er`/`-est` are not dropped** (user, 2026-10-21). Reason: they hit base words (corner, forest, number, butter). The few real words the rules still wrongly drop are listed in `data/keep.txt` and stay answers.
- **Excluded words stay accepted** (user, 2026-10-21). `data/excluded.txt` lists words never used as puzzles. Only the clearly offensive, crude, obscure, archaic or foreign ones are excluded; the milder borderline words stay (user's call). Reason: a typed real word must still count.
- **Heavy work ahead of time:** the word lists are built once by a build test and shipped as data (hub rule); the app only picks and shuffles.

## Architecture and storage keys (planned)

```
src/games/anagram/
  data/
    words.json          # built (A1): { "4": { answers, accepted }, "5": {…}, "6": {…} }; sorted, no duplicates, a-z only
    keep.txt            # real words the inflection rules would drop; they stay answers (read by the build and the data test)
    excluded.txt        # words never used as puzzles (offensive, crude, obscure, archaic, foreign); they stay accepted
    SCOWL-LICENSE.txt   # the SCOWL copyright notice (required by its licence)
  logic/                # pure TS, unit-tested; the ESLint purity rule applies
    words.ts            # the level's answer list and accepted set; isAccepted(letters), anagramKey(word) (sorted letters)
    game.ts             # Game { level, word, rack, answer, solved, skippedMs, remainingMs, used words, status:
                        # 'ready' | 'running' | 'paused' | 'over' }; newRound(level, random), start, place(i), unplace(i),
                        # clear, shuffle(random), skip, tick(ms), pause, resume; ROUND_MS = 60000, SKIP_MS = 5000
    scramble.ts         # scramble(word, accepted, random): a shuffle that is not itself an accepted word
    stats.ts, save.ts   # per level { played, best, totalWords }; keys and versions; toSave/fromSave (loads paused)
    build-words.test.ts # env-gated builder that writes data/words.json from SCOWL (see below)
    words-data.test.ts  # the data check, in the gate: pins the exact counts per length (update COUNTS after a rebuild)
    *.test.ts
  ui/
    anagram-screen.tsx, use-anagram.ts (copied from Snake's use-snake.ts), rack.tsx, score-box.tsx (copy of
    Snake's), level-picker.tsx, stats-panel.tsx, tile.tsx (home art)
```

- Rebuilding the words (SCOWL 2020.12.07, an outside download the user releases): the header of `logic/build-words.test.ts` has the download and unpack steps; then `$env:ANAGRAM_BUILD = '<SCOWL final folder>'`, `npx.cmd jest src/games/anagram/logic/build-words.test.ts`, `Remove-Item Env:ANAGRAM_BUILD`. The build prints the counts per SCOWL size and length (the tuning aid) and the dropped `word <- stem` list. `ANSWER_MAX`, `ACCEPTED_MAX` and `SIZES` in that file are the knobs; the gate skips the build and runs only the data test.
- `logic/` holds every rule: what a tap does, checking, skipping, the countdown arithmetic, the round end. The UI runs the clock and draws.
- Randomness: the logic takes a `Random` (`mulberry32` from `lib/random` in tests); the UI passes `Math.random`.
- The countdown: `useGameClock` measures the running time; the remaining time is `ROUND_MS - elapsed - skips × SKIP_MS`, computed in `logic/`, never a second timer.

Storage keys, all versioned (`{ version, data }`, version 1 each):
- `anagram:save`: the started, unfinished round (level, current word, rack order, answer slots, solved, used words, elapsed ms, skips); loads `paused`.
- `anagram:stats`: `{ easy, normal, hard }`, per level `{ played, best, totalWords }`.
- `anagram:settings`: `{ level }`.

## Shared hub pieces to use (never copy)

- `components/button` (`primary`, `compact`, `selected`, `muted`), `components/stats-numbers`, `components/stats-header-button`, `components/game-route`, `components/glyph-style`, themed text/view.
- `hooks/use-game-clock` (with `running`), `hooks/use-reduced-motion`, `hooks/use-theme`.
- `lib/storage` (incl. `replaceSaveWithStats`), `lib/random` (`Random`, `mulberry32`, `shuffle`), `lib/guards`, `lib/timer` (`formatTime`).
- Tests: `src/test-utils/settle.ts`, `src/test-utils/button-look.ts`.
- Copy (don't import across games): Snake's `use-snake.ts`, `score-box.tsx`, `level-picker.tsx`, `stats-panel.tsx`, result line; Make 24's card look and its env-gated build test pattern (`logic/build-puzzles.test.ts`).

## Lessons from the other games built into this design

- **Logic is pure and tested first.** The UI holds no game rules.
- **No side effects inside React state updaters.** The current round lives in a ref; saves and stats are written outside updaters.
- **Tests go through the real route** (`renderRouter`, `src/__tests__/anagram.test.tsx`) with the AsyncStorage mock only; Jest fake timers drive the countdown; the word pick/scramble is mocked or seeded for known words.
- **Fit without scrolling** at 360×640 and 320×568: six letter tiles must fit one row at 320 px; the screen measures itself with `onLayout`; floor sizes from measured widths (the Make 24 tile bug).
- **Panels replace controls; they never stack.**
- **Accessibility:** every tile is a button labelled with its letter ("Letter T", "Answer letter T, slot 2"); the result line and "solved"/"wrong" are a polite live region; the countdown is readable but not announced every second.
- **Saved data may be rejected during development** (no migration code).
- **Shipped data stays out of Prettier** (`.prettierignore` covers `src/games/*/data/`).
- **The registry entry pulls the game into `navigation.test.tsx` and `theme.test.tsx` automatically.**

## Milestones

Same ticking rule as the hub: tick an item only when its re-check passes and the user has verified it in the web preview. Each step is its own commit with the `Anagram:` prefix; shared changes get `Hub:`, docs get `Docs:`. Each milestone gets a ponytail review in a visible pane before its commit.

- [x] A1. **Word data** (done 2026-10-21). SCOWL downloaded once (released by the user); `data/words.json` built by the env-gated build test (decisions above); `keep.txt`, `excluded.txt` and `SCOWL-LICENSE.txt` shipped with it. Re-check: `npx.cmd jest src/games/anagram/logic/words-data.test.ts` (suite `anagram word lists`: lengths, lower case, sorted, no duplicates, answers ⊆ accepted, excluded words not answers but accepted, keep words are answers, inflected forms accepted but not answers, every answer has a non-word letter order, exact counts).
- [ ] A2. **Logic, test first.** `words`, `scramble`, `game` (place/unplace/clear/shuffle, auto-check, any accepted anagram, skip −5 s, countdown to 0 ends the round, no repeats, pause/resume, finished rounds don't change), `stats`, `save` (round trips, bad data rejected, loads paused). The shuffle must itself check its result against `accepted`: the data test only proves that a non-word order exists for each answer, not that the game's shuffle avoids words.
- [ ] A3. **Playable.** Route, registry entry with `GameRoute`, home tile, the rack and answer row, Start, Pause/Continue (letters hidden), Skip, Shuffle, Clear, the countdown, Score/Best (session only until A4), result line + Play again, the level picker. Route tests with fake timers. The user checks it in the browser (also the title on the tile).
- [ ] A4. **Save, stats, abandon.** Resume paused, last level, abandon rule, stats panel, bests from storage. Route tests; seed snippets for the user.
- [ ] A5. **Polish.** Fit at 360×640 and 320×568, accessibility, dark mode, flash colours and timings. The user checks it in the browser.

Then the hub's Release milestone: the APK is built and tested once, after A5, with the Android checks below.

## Android checks

- [ ] Taps on the letter tiles register quickly and reliably, also fast sequences; no double placement.
- [ ] Six letter tiles fit one row on the phone, readable, nothing under the navigation bar.
- [ ] The countdown pauses in the background and with the screen off, the letters are hidden then, and the round comes back paused after closing the app.
- [ ] The solved/wrong flashes are visible in light and dark mode.
- [ ] The header Stats button sits clear of the edge; the picker and the stats panel fit without scrolling.
- [ ] The Anagram Sprint home tile (and its title) looks right next to the other games.

## Open decisions

- Where the countdown sits and how the skipped solution shows: settled in A3 with the layout.

## Known shortcuts

- None yet.
