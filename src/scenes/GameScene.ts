import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, COLORS, CSS, FONT_FAMILY, GRID_SIZE, CELL_SIZE, GRID_GAP } from '../config/constants';
import { Board, Player } from '../game/Board';
import { getAIMove, Difficulty } from '../game/AI';
import { gameService } from '../services/gameService';
import { AdService } from '../services/adService';
import { MultiplayerService, GameRoom } from '../services/multiplayerService';

export class GameScene extends Phaser.Scene {
  private board!: Board;
  private difficulty!: Difficulty;
  private mode: 'ai' | 'multiplayer' = 'ai';
  private room: GameRoom | null = null;
  private role: Player = 'X';
  private humanPlayer: Player = 'X';
  private aiPlayer: Player = 'O';
  private currentTurn!: Player;
  private gameOver = false;
  private cellContainers: Phaser.GameObjects.Container[][] = [];
  private turnText!: Phaser.GameObjects.Text;
  private cellPx = 0;
  private subscription: any = null;

  constructor() { super('Game'); }

  init(data: { difficulty?: Difficulty; mode?: 'ai' | 'multiplayer'; room?: GameRoom; role?: Player }) {
    this.difficulty = data.difficulty || 'easy';
    this.mode = data.mode || 'ai';
    this.room = data.room || null;
    this.role = data.role || 'X';
    this.humanPlayer = this.role;
    this.aiPlayer = this.role === 'X' ? 'O' : 'X';
  }

  async create() {
    // Energy check for all game modes
    if (gameService.getEnergy() <= 0) {
      alert("Out of Energy! Wait for reset or watch an ad.");
      this.scene.start('Home');
      return;
    }
    gameService.consumeEnergy();

    this.board = new Board();
    this.currentTurn = 'X';
    this.gameOver = false;
    this.cellContainers = [];
    this.cameras.main.setBackgroundColor(COLORS.BG);

    // If multiplayer, sync from room state
    if (this.mode === 'multiplayer' && this.room) {
      this.syncFromRoom(this.room);
      this.subscription = MultiplayerService.subscribeToRoom(this.room.id, (newRoom: GameRoom) => {
        this.syncFromRoom(newRoom);
      });
    }

    const cx = GAME_WIDTH / 2;

    // Back button
    const back = this.add.text(40, 45, '← Back', {
      fontFamily: FONT_FAMILY, fontSize: '26px', fontStyle: '600', color: CSS.X_PRIMARY,
    }).setInteractive({ useHandCursor: true }).setPadding(20);
    back.on('pointerdown', () => this.scene.start('Home'));

    // Difficulty badge
    this.add.text(GAME_WIDTH - 40, 45, this.difficulty === 'hard' ? '🔥 HARD' : '😊 EASY', {
      fontFamily: FONT_FAMILY, fontSize: '20px', fontStyle: 'bold',
      color: this.difficulty === 'hard' ? CSS.X_PRIMARY : CSS.O_PRIMARY,
    }).setOrigin(1, 0);

    // Turn indicator
    this.turnText = this.add.text(cx, 50, '', {
      fontFamily: FONT_FAMILY, fontSize: '24px', fontStyle: 'bold', color: CSS.TEXT_PRIMARY,
    }).setOrigin(0.5, 0);
    this.updateTurnText();

    // Grid setup - Maximize cell size to fill screen width
    const gap = 2;
    this.cellPx = (GAME_WIDTH - (gap * (GRID_SIZE - 1))) / GRID_SIZE;
    const gridW = GAME_WIDTH;
    const originX = 0;
    const originY = 130;

    // Card background (full width)
    const card = this.add.graphics();
    card.fillStyle(0x000000, 0.04);
    card.fillRoundedRect(3, originY - 13, GAME_WIDTH, gridW + 26, 16);
    card.fillStyle(COLORS.SURFACE, 1);
    card.fillRoundedRect(0, originY - 16, GAME_WIDTH, gridW + 32, 16);

    // Draw cells
    for (let r = 0; r < GRID_SIZE; r++) {
      this.cellContainers[r] = [];
      for (let c = 0; c < GRID_SIZE; c++) {
        const x = originX + c * (this.cellPx + gap) + this.cellPx / 2;
        const y = originY + r * (this.cellPx + gap) + this.cellPx / 2;

        this.add.rectangle(x, y, this.cellPx, this.cellPx, COLORS.BG)
          .setStrokeStyle(1.5, COLORS.GRID_LINE);

        const cont = this.add.container(x, y).setSize(this.cellPx, this.cellPx);
        this.cellContainers[r][c] = cont;
      }
    }

    // Single large hit area for the entire grid
    const gridHitArea = this.add.rectangle(originX + gridW / 2, originY + gridW / 2, gridW, gridW, 0x000000, 0)
      .setInteractive({ useHandCursor: true });

    gridHitArea.on('pointerup', (pointer: Phaser.Input.Pointer) => {
      this.onGridPointerUp(pointer);
    });

    // Info text
    const infoY = originY + gridW + 40;
    this.add.text(cx, infoY, 'Get 5 in a row to win!', {
      fontFamily: FONT_FAMILY, fontSize: '20px', fontStyle: '600', color: CSS.TEXT_SECONDARY,
    }).setOrigin(0.5);
  }

  private getGridCoords(worldX: number, worldY: number): [number, number] {
    const gap = 2;
    const originX = 0;
    const originY = 130;
    const col = Math.floor((worldX - originX) / (this.cellPx + gap));
    const row = Math.floor((worldY - originY) / (this.cellPx + gap));
    return [row, col];
  }

  private syncFromRoom(room: GameRoom) {
    if (!this.board) return;
    this.room = room;
    
    // Update local board state if different from DB
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        const remoteValue = room.board_state[r][c] as Player | null;
        if (this.board.cells[r][c] !== remoteValue && remoteValue) {
          this.board.cells[r][c] = remoteValue;
          this.drawPiece(r, c, remoteValue);
        }
      }
    }
    
    this.currentTurn = room.current_turn;
    this.updateTurnText();

    if (room.status === 'finished' && !this.gameOver) {
      const winner = room.winner_id ? (room.winner_id === room.player_x ? 'X' : 'O') : null;
      this.handleGameOver(winner);
    }
  }

  private onGridPointerUp(pointer: Phaser.Input.Pointer) {
    if (this.gameOver) return;

    const [r, c] = this.getGridCoords(pointer.worldX, pointer.worldY);
    if (r < 0 || r >= 9 || c < 0 || c >= 9) return;

    // Multi-player: must be your turn and your role
    if (this.mode === 'multiplayer') {
      if (this.currentTurn !== this.role) return;
    } else {
      // AI Mode: must be human turn
      if (this.currentTurn !== this.humanPlayer) return;
    }

    if (this.board.cells[r][c]) return;
    
    this.placeAndCheck(r, c, this.currentTurn);

    if (!this.gameOver && this.mode === 'ai') {
      this.time.delayedCall(350, () => this.doAITurn());
    }
  }

  private async placeAndCheck(r: number, c: number, player: Player) {
    this.board.place(r, c, player);
    this.drawPiece(r, c, player);

    const winCells = this.board.checkWin(r, c);
    if (winCells) {
      this.gameOver = true;
      this.highlightWin(winCells, player);
      
      if (this.mode === 'multiplayer' && this.room) {
        const winnerId = player === 'X' ? this.room.player_x : this.room.player_o;
        await MultiplayerService.finishGame(this.room.id, winnerId);
      } else {
        gameService.recordGame();
      }
      
      this.handleGameOver(player);
      return;
    }

    if (this.board.isDraw()) {
      this.gameOver = true;
      if (this.mode === 'multiplayer' && this.room) {
        await MultiplayerService.finishGame(this.room.id, null);
      } else {
        gameService.recordGame();
      }
      this.handleGameOver(null);
      return;
    }

    this.currentTurn = player === 'X' ? 'O' : 'X';
    this.updateTurnText();

    if (this.mode === 'multiplayer' && this.room) {
      // Broadcast move to other player via Edge Function
      await MultiplayerService.makeMove(this.room.id, r, c);
    }
  }

  private handleGameOver(winner: Player | null) {
    const result = winner === null ? 'draw' : (this.mode === 'ai' ? (winner === this.humanPlayer ? 'win' : 'lose') : (winner === this.role ? 'win' : 'lose'));
    
    this.time.delayedCall(1200, () =>
      this.scene.start('PostGame', { 
        result, 
        difficulty: this.difficulty,
        mode: this.mode,
        isMultiplayer: this.mode === 'multiplayer'
      })
    );
  }

  private doAITurn() {
    if (this.gameOver) return;
    const [r, c] = getAIMove(this.board, this.aiPlayer, this.difficulty);
    this.placeAndCheck(r, c, this.aiPlayer);
  }

  private drawPiece(r: number, c: number, player: Player) {
    const cont = this.cellContainers[r][c];
    if (cont.length > 0) return; // Already drawn

    const sz = this.cellPx * 0.65;
    const gfx = this.add.graphics();
    if (player === 'X') {
      gfx.lineStyle(5, COLORS.X_PRIMARY, 1);
      gfx.beginPath();
      gfx.moveTo(-sz / 2, -sz / 2); gfx.lineTo(sz / 2, sz / 2);
      gfx.moveTo(sz / 2, -sz / 2); gfx.lineTo(-sz / 2, sz / 2);
      gfx.strokePath();
    } else {
      gfx.lineStyle(5, COLORS.O_PRIMARY, 1);
      gfx.strokeCircle(0, 0, sz / 2);
    }
    cont.add(gfx);
    gfx.setScale(0);
    this.tweens.add({ targets: gfx, scaleX: 1, scaleY: 1, duration: 250, ease: 'Back.easeOut' });
  }

  private highlightWin(cells: [number, number][], player: Player) {
    const color = player === 'X' ? COLORS.X_PRIMARY : COLORS.O_PRIMARY;
    for (const [r, c] of cells) {
      const cont = this.cellContainers[r][c];
      const hl = this.add.graphics();
      hl.fillStyle(color, 0.18);
      hl.fillRoundedRect(-this.cellPx / 2, -this.cellPx / 2, this.cellPx, this.cellPx, 6);
      cont.addAt(hl, 0);
      this.tweens.add({ targets: cont, scaleX: 1.1, scaleY: 1.1, yoyo: true, repeat: 2, duration: 200 });
    }
  }

  private updateTurnText() {
    if (!this.turnText) return;
    const isMyTurn = this.mode === 'ai' ? this.currentTurn === this.humanPlayer : this.currentTurn === this.role;
    const turnName = isMyTurn ? 'YOUR TURN' : (this.mode === 'ai' ? 'AI THINKING...' : 'OPPONENT TURN');
    this.turnText.setText(turnName);
    this.turnText.setColor(this.currentTurn === 'X' ? CSS.X_PRIMARY : CSS.O_PRIMARY);
  }

  shutdown() {
    if (this.subscription) {
      this.subscription.unsubscribe();
      this.subscription = null;
    }
  }
}
