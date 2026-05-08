import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, COLORS, CSS, FONT_FAMILY } from '../config/constants';
import { AuthService } from '../services/authService';
import { MultiplayerService, GameRoom } from '../services/multiplayerService';

export class MatchmakingScene extends Phaser.Scene {
  private statusText!: Phaser.GameObjects.Text;
  private dots = '';
  private timerEvent!: Phaser.Time.TimerEvent;

  constructor() { super('Matchmaking'); }

  async create() {
    const cx = GAME_WIDTH / 2;
    const cy = GAME_HEIGHT / 2;

    this.cameras.main.setBackgroundColor(COLORS.BG);

    this.add.text(cx, cy - 100, '🌍 Finding Opponent', {
      fontFamily: FONT_FAMILY, fontSize: '32px', fontStyle: 'bold', color: CSS.TEXT_PRIMARY
    }).setOrigin(0.5);

    this.statusText = this.add.text(cx, cy - 40, 'Searching...', {
      fontFamily: FONT_FAMILY, fontSize: '20px', color: CSS.TEXT_SECONDARY
    }).setOrigin(0.5);

    // Spinner animation (simulated)
    const spinner = this.add.graphics();
    spinner.lineStyle(6, COLORS.O_PRIMARY, 1);
    spinner.strokeCircle(cx, cy + 60, 40);
    this.tweens.add({
      targets: spinner,
      angle: 360,
      duration: 2000,
      repeat: -1
    });

    this.timerEvent = this.time.addEvent({
      delay: 500,
      callback: () => {
        this.dots = this.dots.length >= 3 ? '' : this.dots + '.';
        this.statusText.setText('Searching' + this.dots);
      },
      loop: true
    });

    const cancelBtn = this.add.text(cx, cy + 200, 'Cancel', {
      fontFamily: FONT_FAMILY, fontSize: '20px', color: CSS.DANGER, fontStyle: 'bold'
    }).setOrigin(0.5).setInteractive({ useHandCursor: true }).setPadding(20);

    cancelBtn.on('pointerdown', async () => {
      const user = await AuthService.getCurrentUser();
      if (user) await MultiplayerService.leaveMatchmaking(user.id);
      this.scene.start('Home');
    });

    // Start matchmaking logic
    const user = await AuthService.getCurrentUser();
    if (!user) {
      this.scene.start('Auth');
      return;
    }

    await MultiplayerService.startGlobalMatchmaking(user.id, (room, role) => {
      this.scene.start('Game', { mode: 'multiplayer', room, role });
    });
  }
}
