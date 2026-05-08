import { Board, Player } from './Board';

/**
 * AI for 9×9 / 5-in-a-row.
 *  • Easy  – random moves, 30 % chance of a "smart" move
 *  • Hard  – alpha-beta pruning, depth 3, pattern-based eval
 */

// ── Evaluation helpers ──────────────────────────────────────────────

function countDir(
  board: Board, r: number, c: number,
  dr: number, dc: number, p: Player
): { count: number; openEnds: number } {
  let count = 1;
  let openEnds = 0;

  // positive direction
  let nr = r + dr, nc = c + dc;
  while (nr >= 0 && nr < board.size && nc >= 0 && nc < board.size && board.cells[nr][nc] === p) {
    count++; nr += dr; nc += dc;
  }
  if (nr >= 0 && nr < board.size && nc >= 0 && nc < board.size && board.cells[nr][nc] === null) openEnds++;

  // negative direction
  nr = r - dr; nc = c - dc;
  while (nr >= 0 && nr < board.size && nc >= 0 && nc < board.size && board.cells[nr][nc] === p) {
    count++; nr -= dr; nc -= dc;
  }
  if (nr >= 0 && nr < board.size && nc >= 0 && nc < board.size && board.cells[nr][nc] === null) openEnds++;

  return { count, openEnds };
}

function scorePattern(count: number, openEnds: number): number {
  if (count >= 5) return 100_000;
  if (openEnds === 0) return 0; // completely blocked
  if (count === 4) return openEnds === 2 ? 50_000 : 5_000;
  if (count === 3) return openEnds === 2 ? 2_000 : 200;
  if (count === 2) return openEnds === 2 ? 100 : 10;
  if (count === 1) return openEnds === 2 ? 5 : 1;
  return 0;
}

function evaluateBoard(board: Board, aiPlayer: Player): number {
  const opp: Player = aiPlayer === 'X' ? 'O' : 'X';
  let score = 0;
  const dirs: [number, number][] = [[0, 1], [1, 0], [1, 1], [1, -1]];
  const visited = new Set<string>();

  for (let r = 0; r < board.size; r++) {
    for (let c = 0; c < board.size; c++) {
      const cell = board.cells[r][c];
      if (cell === null) continue;

      for (const [dr, dc] of dirs) {
        const key = `${r},${c},${dr},${dc}`;
        if (visited.has(key)) continue;

        const { count, openEnds } = countDir(board, r, c, dr, dc, cell);
        // Mark all cells in this line as visited for this direction
        let vr = r, vc = c;
        for (let i = 0; i < count; i++) {
          visited.add(`${vr},${vc},${dr},${dc}`);
          vr += dr; vc += dc;
        }

        const s = scorePattern(count, openEnds);
        score += cell === aiPlayer ? s : -s * 1.1; // slightly prefer defense
      }
    }
  }

  // Center bonus
  const center = Math.floor(board.size / 2);
  for (let r = 0; r < board.size; r++) {
    for (let c = 0; c < board.size; c++) {
      if (board.cells[r][c] === aiPlayer) {
        const dist = Math.abs(r - center) + Math.abs(c - center);
        score += Math.max(0, 8 - dist);
      }
    }
  }

  return score;
}

// ── Alpha-Beta ──────────────────────────────────────────────────────

function alphabeta(
  board: Board, depth: number, alpha: number, beta: number,
  maximizing: boolean, aiPlayer: Player
): number {
  if (depth === 0) return evaluateBoard(board, aiPlayer);

  const moves = board.getRelevantMoves(1);
  if (moves.length === 0) return evaluateBoard(board, aiPlayer);

  const currentPlayer: Player = maximizing ? aiPlayer : (aiPlayer === 'X' ? 'O' : 'X');

  if (maximizing) {
    let best = -Infinity;
    for (const [r, c] of moves) {
      board.cells[r][c] = currentPlayer;
      const w = board.checkWin(r, c);
      if (w) { board.cells[r][c] = null; return 100_000 + depth; }
      const val = alphabeta(board, depth - 1, alpha, beta, false, aiPlayer);
      board.cells[r][c] = null;
      best = Math.max(best, val);
      alpha = Math.max(alpha, val);
      if (beta <= alpha) break;
    }
    return best;
  } else {
    let best = Infinity;
    for (const [r, c] of moves) {
      board.cells[r][c] = currentPlayer;
      const w = board.checkWin(r, c);
      if (w) { board.cells[r][c] = null; return -100_000 - depth; }
      const val = alphabeta(board, depth - 1, alpha, beta, true, aiPlayer);
      board.cells[r][c] = null;
      best = Math.min(best, val);
      beta = Math.min(beta, val);
      if (beta <= alpha) break;
    }
    return best;
  }
}

// ── Public API ──────────────────────────────────────────────────────

export type Difficulty = 'easy' | 'hard';

export function getAIMove(
  board: Board,
  aiPlayer: Player,
  difficulty: Difficulty
): [number, number] {
  const moves = board.getRelevantMoves(2);
  if (moves.length === 0) return [4, 4];

  if (difficulty === 'easy') {
    // 30 % chance of smart move, 70 % random
    if (Math.random() > 0.3) {
      return moves[Math.floor(Math.random() * moves.length)];
    }
    // Quick threat check: block opponent 4-in-a-row or make own 4
    const opp: Player = aiPlayer === 'X' ? 'O' : 'X';
    for (const [r, c] of moves) {
      board.cells[r][c] = aiPlayer;
      if (board.checkWin(r, c)) { board.cells[r][c] = null; return [r, c]; }
      board.cells[r][c] = null;
    }
    for (const [r, c] of moves) {
      board.cells[r][c] = opp;
      if (board.checkWin(r, c)) { board.cells[r][c] = null; return [r, c]; }
      board.cells[r][c] = null;
    }
    return moves[Math.floor(Math.random() * moves.length)];
  }

  // Hard mode: alpha-beta, depth 3
  let bestScore = -Infinity;
  let bestMove = moves[0];

  for (const [r, c] of moves) {
    board.cells[r][c] = aiPlayer;
    const w = board.checkWin(r, c);
    if (w) { board.cells[r][c] = null; return [r, c]; } // instant win
    const score = alphabeta(board, 2, -Infinity, Infinity, false, aiPlayer);
    board.cells[r][c] = null;
    if (score > bestScore) { bestScore = score; bestMove = [r, c]; }
  }
  return bestMove;
}
