@AGENTS.md

# Working agreement: Game Hub

Personal-use Android app (sideloaded APK, no Play Store): a hub of simple versions of games. Sudoku first; Solitaire etc. later, and it is meant to grow. Expo SDK 57 + React Native + TypeScript (strict) + Expo Router. Day-to-day it runs in the web preview (`npx expo start`, then `w`).

**Where a document and the repository disagree, the repository wins.** Check the code before acting on any status claim in a document, including the checklists below.

## Rules

1. **Commit yes, push never.** The main pane may commit work whose plan the user approved (or that the user asked for), once the gate passes and the user has tested any UI change in the web preview. Never commit ideas the user has not agreed to. Never push, never rewrite history (`reset --hard`, rebase, amend, force). Doer panes run no git except `git add`/`git status` for the gate, because parallel agents corrupt each other's index.
2. **Write the check first, then the code, and paste the real output.** A claim without output does not count.
3. **Test through the real entry point.** Game logic: Jest tests on the pure `logic/` functions. Screens: render the route with `renderRouter` from `expo-router/testing-library`, not a component on its own. A component tested in isolation passes whether or not the app wires it up. Route tests live in `src/__tests__/` (every file in `src/app/` becomes a route, so tests cannot go there).
4. **One rule lives in one place.** Before you write a second variant of anything, find the shared place. A copy is the next bug.
5. **Checks never touch real state.** Tests use the AsyncStorage Jest mock, never real saved games or stats. If you cannot isolate it, stop and report.
6. **Never run logged-in CLIs that reach real resources** (`eas`, `eas-cli`, `gh`). That includes reads and `--help`. The user releases each command explicitly, each time.
7. **A status claim carries its own re-check**: a test name, a grep or a command. Never a bare line number, because names survive refactors and line numbers don't.
8. **Write files with Write/Edit or a quoted heredoc (`<<'EOF'`),** never an unquoted one.
9. **Never claim a run you did not make.** That covers tests, builds, graph queries, ponytail passes and pane dispatches.
10. **Plan mode for every milestone**: present the plan, wait for approval, then implement.
11. **Ambiguity or a decision with trade-offs → ask the user**, don't guess.
12. **Inside the repo: go. Outside effects: ask first.** Commands whose effects stay inside this repository, or that test and orchestrate work on it, need no approval: `npx expo start` (in a Herdr pane, stopped when done), graphify, the gate, Herdr panes and agents, local commits per rule 1. Anything that leaves the repo or has real consequences needs the user's yes each time: push, `eas`/`gh` (rule 6), anything that costs money, publishes, touches global config or files outside the repo, or can't be undone. Still tell the user exactly what to test in the browser.
13. **No new library without saying why** and what the no-library alternative would be. Install only with `npx expo install <pkg>`.
14. **Expo APIs change every SDK**: check the versioned docs (see AGENTS.md) before using any Expo/RN API.

## Gate

Run every step from the repository root, every time, before handing off work for the user to test and commit.

```bash
git add <the change>     # stage first: the secret scan checks staged content
npm run gate             # tsc --noEmit, jest, expo lint, gitleaks on the staged content
git status --short       # nothing left unstaged or untracked
```

`git add` here is part of the gate, not a commit; rule 1 still applies to commit and push. `npm run gate` does not stage anything itself. Every check that exists is a gate line, because a check people must remember to run does not exist. Iterate on the affected tests while you work, and run the full gate once, at hand-off. The same `npm run gate` runs in the pre-commit hook in `.git/hooks/pre-commit` (next to graphify's hooks; do not set `core.hooksPath`, it would silently disable them). Hooks are not part of a clone: on a fresh clone, recreate it as `#!/bin/sh` + `npm run gate`.

## Stack

- Expo SDK 57 (see `package.json`), React Native, TypeScript `strict`, Expo Router (routes in `src/app/`).
- Typed routes are **off** (`experiments.typedRoutes` removed from `app.json`): their types lived in a gitignored cache that only the dev server regenerated, which broke `tsc` in the gate. Route wiring is covered by `src/__tests__/navigation.test.tsx`, which opens every route in the registry. `Game.route` is a plain string.
- Jest via `jest-expo`.
- Persistence: `@react-native-async-storage/async-storage`.
- Release: EAS `preview` profile → APK (`npx eas-cli@latest build -p android --profile preview`, run by the user, see rule 6).

## Web first, Android later

Daily work runs in the web preview; Android is verified with APK builds (Expo Go is not used).

- Keep the app fully working in the web preview. Use only libraries/APIs that support both web and Android; check before adding one.
- Whenever something may behave differently on Android (touch/gestures, keyboard, layout/safe areas, fonts, back button, app going to background, storage, performance of heavy work), tell the user and add it to "Android checks" below.
- No `Platform.OS === 'web'` workarounds without asking.

## Architecture

```
src/
  app/                  # Expo Router routes ONLY — thin files that render a game's screen
    _layout.tsx
    index.tsx           # home: lists games from the registry
    sudoku.tsx          # -> games/sudoku/ui
  games/
    registry.ts         # list of available games (id, title, route) shown on home
    sudoku/
      logic/            # pure TS: no React/RN/Expo imports. Unit-tested (*.test.ts next to source)
      ui/               # components + hooks; only calls into logic/
  components/ hooks/ constants/   # shared UI, hooks, theme (from template)
  lib/                  # shared non-UI helpers: storage, stats, timer
```

- Each game is self-contained in `src/games/<id>/`. Adding a game = new folder + one route file + one registry entry. Never edit another game's folder to add a game.
- Games never import from each other. Shared code goes in `components/`, `hooks/`, `constants/`, `lib/`.
- `logic/` is plain TypeScript with no framework imports (enforced by an ESLint `no-restricted-imports` block in `eslint.config.js`, so `npx expo lint` and the gate fail on a React/React Native/Expo/`@/components`/`@/hooks` import), so it can be tested without a phone or browser. All rules, solving, generating, undo history and scoring live there; UI holds no game rules.
- AsyncStorage keys are namespaced per game: `"<game>:<what>"`, e.g. `"sudoku:save"`, `"sudoku:stats"`. Stored JSON includes a `version` field so the format can change later.
- Heavy work (puzzle generation) must not freeze the UI; ask before choosing how (chunked async is the default candidate, since worker threads via worklets are native-only).

## Sudoku spec (v1)

- Puzzles generated on device; every puzzle has exactly one solution (verified by a solver that counts up to 2 solutions).
- Difficulty is rated by the human techniques needed, not by number of givens. **Five levels, not three** (user, 2026-10-15). Names and technique boundaries are an M6 open decision; the three-level sketch it replaces:
  - Easy: naked/hidden singles only.
  - Medium: + naked/hidden pairs, pointing/claiming.
  - Hard: needs techniques beyond Medium.
- A few puzzles per difficulty are pre-generated and cached in the background so "New game" is instant.
- M3 decisions: touch only (no keyboard input). On a win the grid locks and shows "Solved!"; "New game" is always available. Web output is a single-page app (`web.output` removed from `app.json`), so a random puzzle at first render causes no hydration mismatch.
- M4 decisions: error highlighting marks conflicts only (the same digit twice in a row, column or box; both clashing cells, givens included, turn red; nothing is compared with the solution, so a wrong digit that clashes with nothing stays normal). Notes use a "Notes" toggle button: while on, digits 1-9 add or remove pencil marks (not on givens or filled cells). Placing a digit clears that cell's notes and that digit's notes in its row, column and box. Undo/redo covers digits, notes and erasing; after a win both are disabled (rule lives in `undoGame`/`redoGame`); "New game" clears the history.
- Features: notes/pencil marks, error highlighting, hints (= apply/explain the next simplest technique), undo/redo, timer, stats per difficulty (played, best time, average time), save & resume.

## Commands for the user

| Command | What it does |
|---|---|
| `npx expo start`, then `w` | Starts the dev server and opens the app in the browser. Code changes appear automatically (Fast Refresh). Stop with `Ctrl+C`. |
| `npx expo start -c` | Same, but clears Expo's cache first; use when errors make no sense. |
| `npx tsc --noEmit` | Type-checks all TS without producing output. |
| `npm test` | Runs the Jest unit tests. |
| `npm run gate` | Runs type check, Jest, lint and the secret scan on staged files. Stage first with `git add`. |
| `npx expo lint` | Lints the code for common mistakes. |
| `npx expo-doctor` | Checks the project for dependency/config problems. |

## Herdr orchestration

Requires `HERDR_ENV=1`. If it is not set, say so instead of quietly doing the work in the main pane.

- **The main pane orchestrates. It does not do the work.** Implementation, review, analysis and checks run in a Herdr pane with a dispatched agent (`--model claude-sonnet-5-5`, high effort; xhigh only for genuinely hard cases). This keeps the main context free for the next handoff.
- **A doer runs in its own visible pane,** never as an in-pane subagent. A dispatch names the pane.
- **Helpers may work read-only in-pane.** Anything that edits files or has side effects runs in a visible pane.
- **Limits travel with the work.** The doer passes the brief's limits on to every helper, in that helper's own prompt: which files it owns, no git beyond the gate's `git add`/`git status` (rule 1), no logged-in CLIs.
- **Files have owners.** Every pane gets an explicit list of files it may edit. If it needs another file, it reports that and does not edit it. Shared files (`registry.ts`, `src/app/_layout.tsx`, `constants/theme.ts`, `package.json`) belong to one pane at a time.

## graphify

**Orient with the graph, then read the code.** For questions like "where does X live", "what connects to X" or "what would this change touch", run `graphify query "<question>"` before grepping.

- **The graph is not in the repo.** `graphify-out/` is gitignored (added in milestone 1), because it contains extracted content. Without a graph, run `/graphify` or say you have none. Never answer as if you had queried it. First graph: after milestone 1 removes the template code.
- **Code refreshes itself, documents do not.** `graphify hook install` re-extracts code after each commit (AST only). Changes to docs or config need `/graphify . --update`. A stale graph answers confidently from things that are gone.
- **Absence is not evidence.** Some edges point at nodes that don't exist. Confirm in code before acting on "no connection".
- **After a refactor that deletes code,** run `GRAPHIFY_FORCE=1 graphify update .`. The detached hook refuses to shrink the graph and logs that refusal where nobody looks.
- **Run `graphify label`** before reading `GRAPH_REPORT.md`, because the hook renames communities after their hub file.

## ponytail

**The laziest version that passes, not the laziest version.** ponytail decides *how much code* satisfies the contract and the check. It never decides *whether* to satisfy them. Where they collide, the contract wins, and you change it by asking. A deliberate shortcut gets a `ponytail:` comment naming its ceiling, so `/ponytail-debt` collects it. An unmarked deferral is forgotten, not deferred. Use `/ponytail-review` on diffs and `/ponytail-audit` on the whole repo.

## Tools outside the repository

Herdr, graphify (plus its git hooks), gitleaks and ponytail are user-level installs. A fresh clone has none of them. Set them up (`/graphify`, `graphify hook install`, and install gitleaks from its releases page or your package manager) or work without them and say so.

## Milestones

Tick an item only when its re-check (rule 7) passes and the user has verified it in the web preview. Android-specific items go to "Android checks".

- [x] 1. Scaffold: remove template example content; home screen listing games + empty Sudoku screen; Jest (`jest-expo`) with one passing test; `npm run gate` + pre-commit hook; `graphify-out/` in `.gitignore`; Claude Code allowlist for gate commands. Re-check: `npm run gate` (test `lists Sudoku on home and opens the Sudoku screen`).
- [x] 2. Core logic (no UI): board model, validator, backtracking solver, generator with uniqueness check, tests. Re-check: `npm run gate` (`npx jest src/games`: 5 suites, incl. `generate.test.ts` uniqueness per seed).
- [x] 3. Playable game: grid, number pad, selection, highlighting (row/col/box/same number), win detection. Re-check: `npm run gate` (`src/__tests__/sudoku.test.tsx`: `shows Solved! when the last cell is filled correctly, and locks the grid`).
- [x] 4. Notes, error highlighting, undo/redo. Re-check: `npm run gate` (`src/__tests__/sudoku.test.tsx`: `placing a digit removes that note from the peers, and Undo brings it back`, `are disabled after a win, and pressing Undo changes nothing`).
- [ ] 5. Save/resume, timer, stats.
- [ ] 6. Technique-based solver → difficulty rater + hints; background puzzle cache per difficulty.
- [ ] 7. EAS APK build, installed on the phone; work through "Android checks".

## Open decisions

Ask the user when the milestone comes up; move the answer into the spec above and delete the line here.

- M5: do games with hints count towards best/average time? Do abandoned games count as "played"?
- M6: names of the five difficulty levels and which techniques each one allows.
- M6: puzzles needing techniques beyond the implemented ones (or guessing): rate as Hard or discard? (Recommendation: discard.)
- M6: how to keep generation off the UI path (chunked async vs. other).

## Android checks

Things verified only in the web preview that must be tested on the phone (add as they come up, tick when confirmed):

- [ ] Saved games/stats survive closing and reopening the app (web uses browser storage instead).
- [x] Puzzle generation doesn't freeze the UI (phone CPU is slower than the PC). Confirmed on the first preview APK (2026-10-15) for the M2 generator (32 givens, backtracking only); re-check once M6 adds technique rating.
- [ ] Measure how long `generate()` takes on the phone (PC average over 10 seeds is a few ms); this feeds the M6 decision on keeping generation off the UI path. First APK: "New game" felt instant, not measured.
- [x] The hardware back button on the Sudoku screen returns to the home screen.
- [x] Sudoku cells are big enough to tap accurately on a small screen.
- [x] The grid, number pad and "New game" fit on the phone screen without scrolling.
- [x] Tapping cells and digits feels responsive.
- [x] Dark/light mode follows the phone's system setting.
- [ ] Pencil notes (3x3 mini grid, font about 28% of the cell) are readable on a small screen, and the Undo/Redo/Notes/Erase row fits and is easy to tap.
