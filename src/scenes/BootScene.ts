import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, COLORS, CSS, FONT_FAMILY } from '../config/constants';
import { AdService } from '../services/adService';
import { AuthService } from '../services/authService';

export class BootScene extends Phaser.Scene {
  constructor() { super('Boot'); }

  async create() {
    AdService.init();
    const cx = GAME_WIDTH / 2;
    const cy = GAME_HEIGHT / 2;

    // Background
    this.cameras.main.setBackgroundColor(COLORS.BG);

    // Logo text
    const title = this.add.text(cx, cy - 100, 'XO', {
      fontFamily: FONT_FAMILY,
      fontSize: '120px',
      fontStyle: 'bold',
      color: CSS.X_PRIMARY,
    }).setOrigin(0.5);

    const earn = this.add.text(cx, cy - 20, 'EARN', {
      fontFamily: FONT_FAMILY,
      fontSize: '48px',
      fontStyle: '600',
      color: CSS.TEXT_PRIMARY,
    }).setOrigin(0.5);

    // Loading bar background
    const barW = 400, barH = 12, barY = cy + 80;
    const barBg = this.add.graphics();
    barBg.fillStyle(COLORS.GRID_LINE, 1);
    barBg.fillRoundedRect(cx - barW / 2, barY, barW, barH, 6);

    // Loading bar fill
    const barFill = this.add.graphics();
    let progress = 0;

    this.tweens.addCounter({
      from: 0, to: 100,
      duration: 1500,
      ease: 'Sine.easeInOut',
      onUpdate: (tween) => {
        progress = tween.getValue() ?? 0;
        barFill.clear();
        barFill.fillStyle(COLORS.X_PRIMARY, 1);
        barFill.fillRoundedRect(cx - barW / 2, barY, barW * (progress / 100), barH, 6);
      },
      onComplete: async () => {
        // Fade out and go to Auth or Home
        this.cameras.main.fadeOut(400, 248, 244, 232);
        
        const user = await AuthService.getCurrentUser();
        
        this.cameras.main.once('camerafadeoutcomplete', () => {
          if (user) {
            this.scene.start('Home');
          } else {
            this.scene.start('Auth');
          }
        });
      },
    });

    // Subtle pulse on logo
    this.tweens.add({
      targets: title,
      scaleX: 1.05, scaleY: 1.05,
      yoyo: true, repeat: -1,
      duration: 800, ease: 'Sine.easeInOut',
    });

    // Tagline
    this.add.text(cx, cy + 130, 'Play. Win. Earn.', {
      fontFamily: FONT_FAMILY,
      fontSize: '22px',
      color: CSS.TEXT_SECONDARY,
    }).setOrigin(0.5);
  }
}
