import { GRID_SIZE, WIN_LENGTH } from '../config/constants';

export type Player = 'X' | 'O';
export type Cell = Player | null;

export class Board {
  readonly size = GRID_SIZE;
  readonly winLen = WIN_LENGTH;
  cells: Cell[][];

  constructor() {
    this.cells = Array.from({ length: this.size }, () =>
      Array(this.size).fill(null)
    );
  }

  place(r: number, c: number, p: Player): boolean {
    if (r < 0 || r >= this.size || c < 0 || c >= this.size) return false;
    if (this.cells[r][c] !== null) return false;
    this.cells[r][c] = p;
    return true;
  }

  /** Returns the winning cells if the last move at (r,c) caused a win. */
  checkWin(r: number, c: number): [number, number][] | null {
    const p = this.cells[r][c];
    if (!p) return null;

    const dirs: [number, number][] = [[0, 1], [1, 0], [1, 1], [1, -1]];

    for (const [dr, dc] of dirs) {
      const line: [number, number][] = [[r, c]];

      for (let i = 1; i < this.winLen; i++) {
        const nr = r + dr * i, nc = c + dc * i;
        if (nr < 0 || nr >= this.size || nc < 0 || nc >= this.size) break;
        if (this.cells[nr][nc] !== p) break;
        line.push([nr, nc]);
      }
      for (let i = 1; i < this.winLen; i++) {
        const nr = r - dr * i, nc = c - dc * i;
        if (nr < 0 || nr >= this.size || nc < 0 || nc >= this.size) break;
        if (this.cells[nr][nc] !== p) break;
        line.push([nr, nc]);
      }
      if (line.length >= this.winLen) return line;
    }
    return null;
  }

  isDraw(): boolean {
    for (let r = 0; r < this.size; r++)
      for (let c = 0; c < this.size; c++)
        if (this.cells[r][c] === null) return false;
    return true;
  }

  /** Moves adjacent to existing pieces — dramatically prunes search space. */
  getRelevantMoves(dist = 2): [number, number][] {
    const set = new Set<string>();
    let hasPieces = false;

    for (let r = 0; r < this.size; r++) {
      for (let c = 0; c < this.size; c++) {
        if (this.cells[r][c] !== null) {
          hasPieces = true;
          for (let dr = -dist; dr <= dist; dr++) {
            for (let dc = -dist; dc <= dist; dc++) {
              const nr = r + dr, nc = c + dc;
              if (
                nr >= 0 && nr < this.size &&
                nc >= 0 && nc < this.size &&
                this.cells[nr][nc] === null
              ) {
                set.add(`${nr},${nc}`);
              }
            }
          }
        }
      }
    }

    if (!hasPieces) return [[4, 4]];
    return [...set].map(s => {
      const [a, b] = s.split(',').map(Number);
      return [a, b] as [number, number];
    });
  }

  clone(): Board {
    const b = new Board();
    for (let r = 0; r < this.size; r++)
      for (let c = 0; c < this.size; c++)
        b.cells[r][c] = this.cells[r][c];
    return b;
  }
}
