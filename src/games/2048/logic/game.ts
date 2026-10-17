import { isOver, maxTile, winTile, type Board, type Dir, type Size } from './board';
import { move, type Merge, type Slide } from './move';
import { spawn, type Spawned } from './spawn';
import type { Random } from '@/lib/random';

export type Status = 'playing' | 'over';
// won = the win tile was reached once; keptGoing = the player dismissed the win overlay (so won && !keptGoing = overlay open).
// prev = the board and score before the last move, for the single undo step; null at the start and right after an undo.
// nextId = the id the next spawned tile gets. moves counts real moves, an undone one included.
export type Game = {
  size: Size;
  board: Board;
  score: number;
  won: boolean;
  keptGoing: boolean;
  undoUsed: boolean;
  prev: { board: Board; score: number } | null;
  nextId: number;
  moves: number;
  status: Status;
};

// What the stats record about a finished or abandoned game.
export type Result = { score: number; bestTile: number; won: boolean; undoUsed: boolean };

// slides, merges and spawned are for the animations; they are empty when the swipe changed nothing.
export type Played = { game: Game; slides: Slide[]; merges: Merge[]; spawned: Spawned | null };

export function newGame(size: Size, random: Random): Game {
  const empty: Board = Array(size * size).fill(null);
  const board = spawn(spawn(empty, random, 1).board, random, 2).board;
  return { size, board, score: 0, won: false, keptGoing: false, undoUsed: false, prev: null, nextId: 3, moves: 0, status: 'playing' };
}

const unchanged = (game: Game): Played => ({ game, slides: [], merges: [], spawned: null });

// A swipe that changes nothing (or any swipe on a finished game) returns the same game: no spawn, no undo step.
// The game is over as soon as the spawn leaves no move.
export function play(game: Game, dir: Dir, random: Random): Played {
  if (game.status !== 'playing') return unchanged(game);
  const moved = move(game.board, dir);
  if (!moved.moved) return unchanged(game);
  const { board, spawned } = spawn(moved.board, random, game.nextId);
  return {
    game: {
      ...game,
      board,
      score: game.score + moved.gained,
      won: game.won || maxTile(moved.board) >= winTile(game.size),
      prev: { board: game.board, score: game.score },
      nextId: game.nextId + 1,
      moves: game.moves + 1,
      status: isOver(board) ? 'over' : 'playing',
    },
    slides: moved.slides,
    merges: moved.merges,
    spawned,
  };
}

// One step back: only the board and the score come back (the spawned tile goes with the board). won and keptGoing stay as
// they are. Returns the same game when there is nothing to undo: at the start, right after an undo, after game over.
export function undo(game: Game): Game {
  if (game.prev === null || game.status !== 'playing') return game;
  return { ...game, board: game.prev.board, score: game.prev.score, prev: null, undoUsed: true };
}

// Dismisses the win overlay. Returns the same game when there is none.
export const keepGoing = (game: Game): Game => (game.won && !game.keptGoing ? { ...game, keptGoing: true } : game);

// Started = at least one move; only a started game is recorded when abandoned.
export const isStarted = (game: Game) => game.moves > 0;

export const resultOf = (game: Game): Result => ({
  score: game.score,
  bestTile: maxTile(game.board),
  won: game.won,
  undoUsed: game.undoUsed,
});
