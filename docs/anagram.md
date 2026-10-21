# Anagrams

Read this before working on Anagrams. The hub-wide rules are in `CLAUDE.md`: the gate (with Prettier formatting), tests, git, Herdr, tooling, the shared components and the palette. Everything specific to Anagrams lives here and nowhere else. Where this document and the repository disagree, the repository wins.

**Status (2026-10-21):** A1 (the word data), A2 (the logic), A3 (playable in the browser) and A4 (save, stats, abandon) are done. Next is A5 (polish). The decisions marked "(user)" are settled; the ones marked "proposed" are part of the agreed concept unless the user changes them when the milestone that uses them is planned.

## Overview

Anagrams is the sixth game in the hub: a scrambled word appears as letter tiles; tap the letters in the right order to spell a word; solve as many as you can in 60 seconds.
- It lives in `src/games/anagram/`.
- Its route is `src/app/anagram.tsx` (route `/anagram`, game id `'anagram'`), the screen wrapped in the hub's `GameRoute`, which records playtime.
- Its entry is in `src/games/registry.ts` (title "Anagrams", see Decisions), with a `Tile` for the art on home.
- Components are named `Anagram…` (e.g. `AnagramScreen`, `AnagramTile`, `AnagramRack`).

It follows the patterns the other games established. Snake (`docs/snake.md`) is the closest model: levels picked on New, Score/Best boxes, a timed run that pauses whenever the player can't see it, save on pause, result line + Play again, stats per level. Make 24 (`docs/make24.md`) is the model for tapping cards to build an answer, and for shipped data built by an env-gated build test.

## Spec (v1)

- **A round:** 60 seconds on a countdown. One scrambled word at a time (user); solving it shows the next word at once. The score is the number of words solved.
- **Levels by word length** (user): **Easy** 4 letters · **Normal** 5 · **Hard** 6. Every word in a round has the level's length. Picked on New (a level picker like Snake's); the last level is stored; the default is **Normal**.
- **Letters:** the scrambled letters sit as tiles in a row (the *rack*); above it, an *answer row* with one empty slot per letter.
  - Tapping a rack tile moves its letter into the next empty answer slot. Tapping a letter in the answer row sends it back to the rack (proposed).
  - When the row is full, the word is checked at once (proposed, no Check button), on every tap that fills it, also one that fills a hole left by sending a letter back: if the letters spell **any accepted word** (not only the one the round picked, e.g. TAPER for PATER), it counts and the next word appears; otherwise the answer row flashes red briefly and the letters stay, so the player can fix them.
  - **Shuffle** reorders the rack's remaining tiles; it always changes the order when the letters allow it (not for one tile left or the same letter throughout), and with nothing placed it never shows an accepted word. **Clear** sends every answer letter back (proposed).
- **Skip costs time** (user): **Skip** shows the solution in the answer row for a moment and moves on; it costs **5 seconds** of the countdown. A skip never counts as solved. The clock keeps running while the solution shows (about 1 s, in grey in the answer row), and player actions (letters, Clear, Shuffle, Skip) are ignored meanwhile, so a double tap on Skip cannot cost 10 s. A skip that uses up the last seconds also shows the solution for about 1 s and then the round ends (no next word).
- **Scramble:** the rack's order is never itself an accepted word (re-shuffle until it isn't), and no word repeats within a round (proposed).
- **Start:** a new round shows the level and a primary **Start**; the letters appear and the countdown starts on Start (proposed: no letters to study before the clock runs).
- **Pause:** a **Pause** button while the round runs. Paused, the letters are **hidden** (no thinking time for free) and a primary **Continue** shows. Leaving the screen, the app going to the background and the screen turning off all pause the round, and coming back shows it paused (Snake's rule, via `useGameClock`'s `running`).
- **Score boxes:** three boxes in a row, **Score** (words solved this round, its title naming the level, e.g. `Normal · Score`) · **Time** (the countdown, whole seconds rounded up) · **Best** (the level's best round), copied from Snake's boxes.
- **Round end:** at 0:00 the rack is dimmed with a result line and a primary **Play again** (same level) and **New** (the picker): `Time! · 12 words`, plus ` · New best!` when the score beats the level's stored best (0 is never a best).
- **Abandon:** picking a level while a started round runs or is paused ends it and records it with its score (Snake's rule). A round that hasn't started just goes.
- **Stats per level** (proposed): rounds played, best, average (whole words, rounded), words solved in total. Played counts every finished or abandoned started round.
- **Stats panel:** from the header "Stats" button only (`StatsHeaderButton`), the whole screen below the header: an **Easy · Normal · Hard** switch (`selected`/`muted`) opening on the current level, the shared `StatsNumbers` row (Played, Best, Average, Words; `—` for Best, Average and Words while nothing is played at that level) and Close. A running round is paused while it is open.
- **Save and resume:** a started, unfinished round is saved whenever it pauses (as in Snake) and resumes paused when Anagrams opens. A finished round deletes the save.
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
- **The title is "Anagrams"** (user, 2026-10-21): registry title, header and home tile. Reason: "Anagram Sprint" wrapped badly on the 3-column home grid. File names, the id `anagram` and the `Anagram…` component names stay.
- **The countdown is a third box: Score · Time · Best** (user, 2026-10-21). Reason: it stays in sight above the letters and needs no extra layout row; whole seconds rounded up, so 0:00 shows only at the very end.
- **The last skip shows its solution, then the round ends** (user, 2026-10-21). The rule: the round ends at 0:00, but a solution on show is shown to its end first (`tick` does nothing while one shows, `endReveal` ends the round). Pausing drops the solution; Continue at 0:00 ends the round on the next tick. Reason: ending at once would hide the word the player just gave up on.
- **The skipped solution shows in the answer row in grey** (`textSecondary`) (user, 2026-10-21). Reason: it sits where the player's own letters go, and grey says "not yours".
- **The home tile shows TAE over EAT, the bottom row in accent blue** (user, 2026-10-21). Reason: scrambled over solved says what the game is at a glance.
- **Pausing a round with no time left ends it** (decided in A4, 2026-10-21). `pause(game, elapsedMs)` ends a running round whose countdown is used up (the solution of the last skip is on show) instead of pausing it, so a paused round always has time left. Reason: a save without time left is rejected by `fromSave`, so pausing there (Pause button, screen off, leaving the screen, the picker or panel opening) would lose the round and never count it.
- **Heavy work ahead of time:** the word lists are built once by a build test and shipped as data (hub rule); the app only picks and shuffles.

## Architecture and storage keys

```
src/games/anagram/
  data/
    words.json          # built (A1): { "4": { answers, accepted }, "5": {…}, "6": {…} }; sorted, no duplicates, a-z only
    keep.txt            # real words the inflection rules would drop; they stay answers (read by the build and the data test)
    excluded.txt        # words never used as puzzles (offensive, crude, obscure, archaic, foreign); they stay accepted
    SCOWL-LICENSE.txt   # the SCOWL copyright notice (required by its licence)
  logic/                # pure TS, unit-tested; the ESLint purity rule applies
    words.ts            # LEVEL_IDS/Level/LENGTH (4, 5, 6); isAccepted(letters); pickWord(level, used, random);
                        # permutations(letters); scramble(word, random): one shuffle, or the first letter order after it
                        # that is not an accepted word (no retry loop). Route tests can swap this module (as Make 24's pool.ts)
    game.ts             # Game { level, word, rack: string[], answer: (number | null)[], solved, skips, used: string[],
                        # revealed: string | null, status: 'ready' | 'running' | 'paused' | 'over' }. answer = one slot per
                        # letter holding a rack index or null (a hole); a placed tile stays at its rack position.
                        # No time inside: remainingMs(game, elapsedMs) = ROUND_MS - elapsed - skips x SKIP_MS (60000, 5000).
                        # Actions: newRound(level, random), start, pause, resume, place(game, i, random) (checks a full row),
                        # unplace(game, slot), clear, shuffleRack(game, random), skip(game, elapsedMs, random) (sets
                        # revealed; a skip that uses up the countdown reveals the word and picks no next one),
                        # pause(game, elapsedMs) (a running round with no time left ends instead of pausing),
                        # endReveal(game, elapsedMs) (clears revealed, then ends the round if no time is left),
                        # tick(game, elapsedMs) (ends the round at 0:00, a no-op while revealed). canAct (running with
                        # nothing revealed) is the one rule for what the player can do, the UI uses it too; isWrong (full
                        # row while running) is derived, isInPlay (running or paused) is the abandon/save rule. Everything
                        # is a no-op unless the round is running (start: ready only, resume: paused only, pause: running
                        # only); a finished round never changes.
    stats.ts            # per level { played, best, totalWords }; EMPTY_STATS, recordRound, isNewBest, average
    save.ts             # keys and versions; Settings (default Normal); toSave (null unless in play), fromSave (loads
                        # paused, revealed null), fromStats, fromSettings
    build-words.test.ts # env-gated builder that writes data/words.json from SCOWL (see below)
    words-data.test.ts  # the data check, in the gate: pins the exact counts per length (update COUNTS after a rebuild)
    *.test.ts           # next to each module (words, game, stats, save)
  ui/
    use-anagram.ts      # copied from Snake's use-snake.ts: the round in a ref and in state (null until storage is read), `act`
                        # for transitions, useGameClock (enabled while running and the picker and the stats panel are closed;
                        # onStop pauses with the time reached, then saves), a tick effect on elapsedMs, the 1 s reveal timeout
                        # (endReveal). Storage: loads save, stats and settings together (a saved round opens paused at its
                        # time); `finish` (isNewBest, recordRound, replaceSaveWithStats: the save goes first) on the round end
                        # and on abandoning; pickLevel abandons a round in play, stores the level (lastLevel marks the
                        # picker) and begins a new one; openPanel closes the picker
    anagram-screen.tsx  # the layout: header Stats button, boxes Score · Time · Best, New + Pause, the letter block (answer
                        # row, rack, Dim layers for ready/paused/result), Shuffle · Clear · Skip; the picker and the stats
                        # panel each replace all of it; an empty area while loading
    letters.tsx         # LetterFace (Make 24's card look, a FaceState normal/wrong/revealed/solved), AnswerRow, Rack,
                        # tileSize(width, n) (n tiles fit the content width, 24..64 px)
    score-box.tsx, level-picker.tsx, dim.tsx   # copies of Snake's (the score box takes a number or a string)
    stats-panel.tsx     # copy of Snake's: Easy · Normal · Hard switch (opens on the current level), StatsNumbers (Played,
                        # Best, Average, Words; `—` for Best, Average and Words while nothing is played) and Close
    tile.tsx            # home art: TAE over EAT (accent)
```
- Best (the box, the picker and "New best!") comes from the stored stats.

- Rebuilding the words (SCOWL 2020.12.07, an outside download the user releases): the header of `logic/build-words.test.ts` has the download and unpack steps; then `$env:ANAGRAM_BUILD = '<SCOWL final folder>'`, `npx.cmd jest src/games/anagram/logic/build-words.test.ts`, `Remove-Item Env:ANAGRAM_BUILD`. The build prints the counts per SCOWL size and length (the tuning aid) and the dropped `word <- stem` list. `ANSWER_MAX`, `ACCEPTED_MAX` and `SIZES` in that file are the knobs; the gate skips the build and runs only the data test.
- `logic/` holds every rule: what a tap does, checking, skipping, the countdown arithmetic, the round end. The UI runs the clock and draws.
- Randomness: the logic takes a `Random` (`mulberry32` from `lib/random` in tests); the UI passes `Math.random`.
- The countdown: `useGameClock` measures the running time; the remaining time is `ROUND_MS - elapsed - skips × SKIP_MS`, computed in `logic/`, never a second timer.

Storage keys, all versioned (`{ version, data }`, version 1 each):
- `anagram:save`: the started, unfinished round `{ level, word, rack, answer, solved, skips, used, elapsedMs }`: `rack` is one string (the letters in rack order), `answer` the slots as rack indices or `null`, `used` the words shown so far. Not saved: `revealed`. `fromSave` rejects a bad level, a word that is not a-z of the level's length, a rack that is not the word's letters, answer slots that are not distinct valid indices, bad counts, `used` without the word and a round with no time left; it loads `paused`.
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
- [x] A2. **Logic, test first** (done 2026-10-21). `words` (with `scramble` and `permutations`), `game` (place/unplace/clear/shuffleRack, auto-check, any accepted anagram, skip −5 s, countdown to 0 ends the round, no repeats, pause/resume, finished rounds don't change), `stats`, `save` (round trips, bad data rejected, loads paused). The shuffle and the scramble check their result against `accepted` (tests over all answers and many seeds). Re-check: `npx.cmd jest src/games/anagram/logic`.
- [x] A3. **Playable** (done 2026-10-21). Route, registry entry with `GameRoute`, home tile, the rack and answer row, Start, Pause/Continue (letters hidden), Skip, Shuffle, Clear, the countdown, Score/Best (session only until A4 stored them), result line + Play again, the level picker. Route tests with fake timers. Re-check: `npx.cmd jest src/__tests__/anagram.test.tsx` (suite `Anagrams screen`, plus `home tile` and `accessibility`) and `npx.cmd jest src/games/anagram/logic/game.test.ts`; the user checked it in the browser (2026-10-21) and renamed the game "Anagrams".
- [x] A4. **Save, stats, abandon** (done 2026-10-21). A started round is saved whenever it pauses and resumes paused; the last level is stored; picking a level abandons a round in play and counts it; the header Stats panel; Best and New best! from the stored stats; pausing during the last skip's solution ends and counts the round (see Decisions). Re-check: `npx.cmd jest src/__tests__/anagram.test.tsx` (suites `resume`, `saving`, `level`, `abandon`, `stats`, `stats panel`) and `npx.cmd jest src/games/anagram/logic/game.test.ts`; the user checked it in the browser (2026-10-21).
- [ ] A5. **Polish.** Fit at 360×640 and 320×568 (the tile size follows the width only, nothing guards the height yet), accessibility, dark mode, flash colours and timings. Still to do from the spec: the solved flash (accent) and the brief wrong flash (the wrong row is colour only and stays red until edited). The user checks it in the browser.

Then the hub's Release milestone: the APK is built and tested once, after A5, with the Android checks below.

## Android checks

- [ ] Taps on the letter tiles register quickly and reliably, also fast sequences; no double placement.
- [ ] Six letter tiles fit one row on the phone, readable, nothing under the navigation bar.
- [ ] The countdown pauses in the background and with the screen off, the letters are hidden then, and the round comes back paused after closing the app.
- [ ] The solved/wrong flashes are visible in light and dark mode.
- [ ] The header Stats button sits clear of the edge; the picker and the stats panel fit without scrolling.
- [ ] The Anagrams home tile (and its title) looks right next to the other games.
- [ ] The three score boxes fit on a narrow phone: `Normal · Score` is not clipped or wrapped.
- [ ] In the result, taps on the dimmed letters do nothing, and Play again and New are tappable.
- [ ] Screen turned off during the 1 s solution of a skip: the round comes back paused, no grey solution row stuck.
- [ ] A round sent to the background mid-word and the app killed from the app switcher comes back paused at the same word, rack, answer, score and time.
- [ ] Screen turned off (or the app sent to the background) during the solution of the last skip: the round ends and is counted in the stats (Played +1); reopening shows a fresh ready round, not a paused one.

## Open decisions

None.

## Known shortcuts

The `ponytail:` comments in `src/games/anagram/logic/`.

- `logic/save.ts`, `fromStats`: stats with any bad field fall back to empty as a whole; keep the good levels if a format change ever needs it. Re-check: `Select-String -Path src/games/anagram/logic/save.ts -Pattern 'ponytail:'`.
