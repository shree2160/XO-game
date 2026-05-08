import Phaser from 'phaser';
import {
  GAME_WIDTH, GAME_HEIGHT, COLORS, CSS, FONT_FAMILY,
  CREDITS_WIN, CREDITS_DRAW, CREDITS_LOSS,
} from '../config/constants';
import { Difficulty } from '../game/AI';
import { gameService } from '../services/gameService';
import { AdService } from '../services/adService';

type Result = 'win' | 'lose' | 'draw';

function makeBtn(
  scene: Phaser.Scene, x: number, y: number,
  w: number, h: number, label: string, color: number, cb: () => void
) {
  const g = scene.add.graphics();
  g.fillStyle(color, 1);
  g.fillRoundedRect(-w / 2, -h / 2, w, h, 18);
  const t = scene.add.text(0, 0, label, {
    fontFamily: FONT_FAMILY, fontSize: '28px', fontStyle: 'bold', color: '#FFFFFF',
  }).setOrigin(0.5);
  
  const c = scene.add.container(x, y, [g, t]);
  
  const margin = 10;
  const zone = scene.add.zone(0, 0, w + margin * 2, h + margin * 2)
    .setInteractive({ useHandCursor: true });
  c.add(zone);

  zone.on('pointerdown', () => {
    scene.tweens.add({ targets: c, scaleX: 0.94, scaleY: 0.94, duration: 80 });
  });

  zone.on('pointerup', () => {
    scene.tweens.add({ targets: c, scaleX: 1, scaleY: 1, duration: 80, onComplete: cb });
  });

  zone.on('pointerout', () => {
    scene.tweens.add({ targets: c, scaleX: 1, scaleY: 1, duration: 80 });
  });

  return c;
}

export class PostGameScene extends Phaser.Scene {
  private result: Result = 'draw';
  private difficulty: Difficulty = 'easy';
  private showAd: boolean = false;

  constructor() { super('PostGame'); }

  init(data: { result: Result; difficulty: Difficulty; showAd: boolean }) {
    this.result = data.result || 'draw';
    this.difficulty = data.difficulty || 'easy';
    this.showAd = data.showAd || false;

    // Award credits
    let credits = CREDITS_DRAW;
    if (this.result === 'win') credits = CREDITS_WIN;
    else if (this.result === 'lose') credits = CREDITS_LOSS;
    
    gameService.addCredits(credits);
  }

  async create() {
    if (this.showAd) {
      await AdService.showInterstitial();
    }
    
    const cx = GAME_WIDTH / 2;
    const cy = GAME_HEIGHT / 2;

    this.cameras.main.setBackgroundColor(COLORS.BG);
    this.cameras.main.fadeIn(300);

    // Overlay card
    const cardW = 560, cardH = 520;
    const cardX = cx - cardW / 2, cardY = cy - cardH / 2 - 40;
    const g = this.add.graphics();
    g.fillStyle(0x000000, 0.06);
    g.fillRoundedRect(cardX + 4, cardY + 4, cardW, cardH, 24);
    g.fillStyle(COLORS.SURFACE, 1);
    g.fillRoundedRect(cardX, cardY, cardW, cardH, 24);

    // Result emoji & text
    let emoji = '🤝';
    let title = 'Draw!';
    let titleColor = CSS.TEXT_PRIMARY;
    let credits = CREDITS_DRAW;

    if (this.result === 'win') {
      emoji = '🎉'; title = 'You Win!'; titleColor = CSS.SUCCESS; credits = CREDITS_WIN;
    } else if (this.result === 'lose') {
      emoji = '😤'; title = 'AI Wins!'; titleColor = CSS.DANGER; credits = CREDITS_LOSS;
    }

    this.add.text(cx, cardY + 60, emoji, { fontSize: '100px' }).setOrigin(0.5);

    const titleText = this.add.text(cx, cardY + 170, title, {
      fontFamily: FONT_FAMILY, fontSize: '52px', fontStyle: 'bold', color: titleColor,
    }).setOrigin(0.5).setScale(0);
    this.tweens.add({ targets: titleText, scaleX: 1, scaleY: 1, duration: 400, ease: 'Back.easeOut' });

    // Credits earned
    this.add.text(cx, cardY + 230, `+${credits} XO-Credits`, {
      fontFamily: FONT_FAMILY, fontSize: '28px', fontStyle: '700', color: CSS.ACCENT_GOLD,
    }).setOrigin(0.5);

    this.add.text(cx, cardY + 270, `Mode: ${this.difficulty.toUpperCase()}`, {
      fontFamily: FONT_FAMILY, fontSize: '16px', color: CSS.TEXT_SECONDARY,
    }).setOrigin(0.5);

    // Double your win button (stub)
    if (this.result === 'win') {
      makeBtn(this, cx, cardY + 340, 480, 72, '🎬 Watch Ad to 3x Credits', COLORS.ACCENT_GOLD, () => {
        // Stub: will integrate AppLovin MAX in Phase 4
      });
    }

    // Action buttons - Vertical Stack
    const btnY = cardY + cardH - 100;
    makeBtn(this, cx, btnY, 480, 72, '🔄 Play Again', COLORS.O_PRIMARY, () => {
      this.scene.start('Game', { difficulty: this.difficulty });
    });
    makeBtn(this, cx, btnY + 90, 480, 72, '🏠 Back to Home', COLORS.X_PRIMARY, () => {
      this.scene.start('Home');
    });
  }
}
