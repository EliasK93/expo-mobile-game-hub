@AGENTS.md

# Working agreement: Game Hub

Personal-use Android app (sideloaded APK, no Play Store): a hub of simple versions of games. Sudoku is the first game; more (e.g. Solitaire) come later, and it is meant to grow. Expo SDK 57 + React Native + TypeScript (strict) + Expo Router. Day-to-day it runs in the web preview (`npx expo start`, then `w`).

**Where a document and the repository disagree, the repository wins.** Check the code before acting on any status claim in a document, including the checklists below and in the game docs.

## Development

- Commit messages start with their area: `Sudoku: ` (or the game's name) for one game, `Hub: ` for app-wide code and config, `Docs: ` for documentation and project rules. One area per commit.

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
- App identity (set in `app.json`, images in `assets/images/`): name "Game Hub"; the icon, adaptive-icon foreground and monochrome, favicon and splash image all show the 3×3 Sudoku tile motif in the Pencil & Paper colours. Adaptive icon on a pencil-yellow `backgroundColor` (`#F2C230`, no background image), the tile kept inside the launcher's circle mask; splash on the paper colour (`#FBFAF6`). The PNGs were rendered from SVG with Edge headless (no image library); to change them, redraw the SVG and render again.
- Release: EAS `preview` profile → APK (`npx eas-cli@latest build -p android --profile preview`, run by the user, see rule 6).

## Web first, Android later

Daily work runs in the web preview; Android is verified with APK builds (Expo Go is not used).

- Keep the app fully working in the web preview. Use only libraries/APIs that support both web and Android; check before adding one.
- Whenever something may behave differently on Android (touch/gestures, keyboard, layout/safe areas, fonts, back button, app going to background, storage, performance of heavy work), tell the user and add it to the Android checks: the hub-wide list below if it applies to every game, otherwise "Android checks" in that game's doc.

## Architecture

```
src/
  app/                  # Expo Router routes ONLY — thin files that render a game's screen
    _layout.tsx
    index.tsx           # home: sort chips (Recent · Name · Playtime) above a 3-column grid of the registry's tiles
    <id>.tsx            # one per game, e.g. sudoku.tsx: wraps games/sudoku/ui in <GameRoute id="sudoku">
  games/
    registry.ts         # list of available games (id, title, route, Tile) shown on home; Tile = the game's art, drawn in code in theme colours
    <id>/
      logic/            # pure TS: no React/RN/Expo imports. Unit-tested (*.test.ts next to source)
      data/             # optional: data the game ships (e.g. precomputed puzzles)
      ui/               # components + hooks; only calls into logic/
  components/ hooks/ constants/   # shared UI (themed text/view, `button` with a `primary` accent variant for a screen's one main action and a `compact` slim variant (36 px high) for secondary actions, plus `muted` (grey label) for the inactive side of a switch, `game-route`: `GameRoute` records a game's playtime, `glyph-style`: the shared style for digits on tiles and cells), hooks (`use-game-clock`: the timed-screen clock that pauses when unfocused or in the background; `use-reduced-motion`: the system's reduce-motion setting, used by 2048's tile animations), theme (`constants/theme.ts`: the "Pencil & Paper" palette, light and dark, Sudoku's cell colours included; the only place with colour values, also the source of the navigation header colours in `_layout.tsx`)
  lib/                  # shared non-UI helpers: storage, stats, timer, history (undo/redo), random (seeded random, shuffle), guards (shape checks for loaded saves, e.g. isCount), playtime, game-sort (home's sort order and its setting)
```

- Each game is self-contained in `src/games/<id>/`. Adding a game = new folder + one route file (its screen wrapped in `GameRoute`, which `navigation.test.tsx` checks for every registry game) + one registry entry (with a `Tile`) + a `docs/<id>.md`. Never edit another game's folder to add a game.
- Games never import from each other. Shared code goes in `components/`, `hooks/`, `constants/`, `lib/`.
- `logic/` is plain TypeScript with no framework imports (enforced by an ESLint `no-restricted-imports` block in `eslint.config.js`, so `npx expo lint` and the gate fail on a React/React Native/Expo/`@/components`/`@/hooks` import), so it can be tested without a phone or browser. All rules, solving, generating, undo history and scoring live there; UI holds no game rules.
- AsyncStorage keys are namespaced per game: `"<game>:<what>"`, e.g. `"sudoku:save"`. Stored JSON includes a `version` field so the format can change later. Each game's keys and versions are listed in its doc.
- Hub keys, `"hub:<what>"`, same `{ version, data }` format:
  - `hub:playtime` (version 1): `{ [gameId]: { totalMs, lastPlayedAt } }`. Playtime is the time a game's screen is open while the app is in the foreground, menus included; the same for every game, written by `GameRoute` whenever its clock stops (leaving the screen, app to background).
  - `hub:settings` (version 1): `{ sort }`, `recent` (default), `name` or `playtime`. Recent puts never-played games last, then sorts by name.
- Heavy work never runs on the device's UI path: a game generates it ahead of time and ships the result as data (its doc says how). If a later game needs on-device heavy work, it must run in slices between screen updates, never as one blocking call (worker threads via worklets are native-only).

## Games

- [Sudoku](docs/sudoku.md)
- [2048](docs/2048.md): complete (T1-T4), released 2026-10-17
- [Minesweeper](docs/minesweeper.md): M1 (logic) and M2 (playable) done, next M3

Read `docs/<game>.md` before working on a game. A game's spec, decisions, milestones, Android checks and open decisions live in its doc and nowhere else; this file holds only the hub-wide rules. The game docs are not imported into this file (no `@`), they are read on demand.

A new game's doc follows this structure:

1. Overview
2. Spec
3. Decisions, each with its reason
4. Architecture and storage keys
5. Milestones, each with its re-check
6. Android checks
7. Open decisions
8. Known shortcuts (the `ponytail:` comments in the game's folder: file, what was cut, when to revisit)

## Commands

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
- **Dispatch routine.** After `herdr agent start`, wait a few seconds before `herdr agent prompt`, then read the pane (`herdr agent read <name> --source recent-unwrapped`) to confirm the agent is working on the brief. A prompt sent too early is lost and the agent sits idle. Every brief ends with a fixed reply line (e.g. `A4 DONE`). Watch for it by polling the pane text every 30 s in a background command (`herdr agent read`, match the reply line). Don't use `herdr agent wait --until idle`: the status sometimes stays "working" after the agent has finished, and the wait never returns. Close a pane only after its watcher has returned. Helper scripts: `tools/wait-done.ps1` (this watcher) and `tools/commit.ps1` (commit with a retry on a known shell crash, optionally only given paths).
- **Briefs live in files.** Write the brief to a file in the scratchpad and send only `Read and follow the brief in <path>` with `herdr agent prompt`. Long prompts with quotes break on some shells and the agent never gets the work. Follow-up tasks for an open doer go the same way.
- **Never hide a dispatch failure.** Don't pipe `herdr agent start`/`prompt` to `Out-Null`; filter their output for `agent_started`/`agent_prompted`/`error`. Report a doer as running only after reading its pane and seeing it work (rule 9). The user watches the panes and notices empty ones.
- **At most two doer panes side by side.** Narrower panes failed to start an agent. Close finished panes before opening new ones.
- **Parallel doers don't stage.** When two doers run at the same time, neither runs `git add`; the main pane stages both sets of files and runs the gate once (two `git add` at once can collide on the index).
- **Extraction and review agents run in visible panes too,** including graphify's semantic extraction and ponytail reviews: an in-session subagent can't be seen and its progress can't be checked.

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

Tick an item only when its re-check (rule 7) passes and the user has verified it in the web preview. Android-specific items go to the Android checks (hub-wide below, game-specific in the game's doc).

Milestones that belong to one game live in its doc (`docs/<game>.md`, "Milestones"). Hub-wide:

- [x] 1. Scaffold: remove template example content; home screen listing games + empty Sudoku screen; Jest (`jest-expo`) with one passing test; `npm run gate` + pre-commit hook; `graphify-out/` in `.gitignore`; Claude Code allowlist for gate commands. Re-check: `npm run gate` (test `lists Sudoku on home and opens the Sudoku screen`).
- [x] Release: EAS APK build (`npx eas-cli@latest build -p android --profile preview`, run by the user), installed on the phone; every Android check passes, the hub-wide ones below and each game's in its doc. The APK is built and tested once per finished game (after its last milestone), with that game's Android checks plus any open hub-wide ones as the checklist; not after intermediate milestones (user, 2026-10-16). Last passed: 2026-10-17 (Sudoku and 2048).

## Open decisions

Ask the user when the milestone comes up; move the answer into the spec above and delete the line here.

None right now.

## Known shortcuts (hub)

The `ponytail:` comments in hub code (`src/components`, `src/hooks`, `src/lib`, `src/constants`, `tools`): file, what was cut, when to revisit. Game-specific ones are in the game's doc. Re-check for all of them: `Get-ChildItem src/components,src/hooks,src/lib,src/constants,tools -Recurse -File | Select-String -Pattern 'ponytail:'`.

- `src/components/button.tsx`: the `compact` variant is 36 px high, below the 48 px touch target, because the user asked for a slim row (Make 24's Hint · Give up row). Revisit if taps miss on the phone. Re-check: `Select-String -Path src/components/button.tsx -Pattern 'ponytail:'`.

## Android checks

Hub-wide things verified only in the web preview that must be tested on the phone (add as they come up, tick when confirmed). Game-specific checks are in each game's doc.

- [x] Saved data (games, stats, settings) survives closing and reopening the app (web uses browser storage instead).
- [x] Dark/light mode follows the phone's system setting.
- [x] The hardware back button on a game screen returns to the home screen (confirmed on Sudoku).
- [x] Home is a 3-column grid on the phone: tiles are square, the art and names are readable, the sort chips fit in one row, and the chosen sort is still there after closing and reopening the app.
- [x] The app is called "Game Hub" under its launcher icon; the icon (yellow background, 3×3 tile) is not cut off in the phone's icon shape and, with themed icons on, the monochrome version looks right; the splash screen shows the tile on the paper colour, not clipped, without a blue flash.
- [x] Playtime pauses while the app is in the background and while the phone screen is off, and counts again on return: open Sudoku, send the app to the background for a minute, come back, and check that Playtime sorting only reflects the time the app was in front. Confirmed with Sudoku (2026-10-17).
