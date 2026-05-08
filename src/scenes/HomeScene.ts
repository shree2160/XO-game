import Phaser from 'phaser';
import {
  GAME_WIDTH, GAME_HEIGHT, COLORS, CSS, FONT_FAMILY,
  ENERGY_MAX,
} from '../config/constants';
import { gameService } from '../services/gameService';
import { AdService } from '../services/adService';
import { AuthService } from '../services/authService';
import { MultiplayerService, GameRoom } from '../services/multiplayerService';
import { LeaderboardScene } from './LeaderboardScene';

/* ── Helper: draw a rounded-rect button ─────────────────────────── */
function createButton(
  scene: Phaser.Scene,
  x: number, y: number, w: number, h: number,
  label: string, color: number, cb: () => void,
  sublabel?: string
): Phaser.GameObjects.Container {
  const gfx = scene.add.graphics();
  gfx.fillStyle(color, 1);
  gfx.fillRoundedRect(-w / 2, -h / 2, w, h, 20);
  gfx.lineStyle(2, 0xFFFFFF, 0.3);
  gfx.strokeRoundedRect(-w / 2, -h / 2, w, h, 20);

  const txt = scene.add.text(0, sublabel ? -14 : 0, label, {
    fontFamily: FONT_FAMILY, fontSize: '32px', fontStyle: 'bold', color: '#FFFFFF',
  }).setOrigin(0.5);

  const items: Phaser.GameObjects.GameObject[] = [gfx, txt];
  if (sublabel) {
    const sub = scene.add.text(0, 16, sublabel, {
      fontFamily: FONT_FAMILY, fontSize: '16px', color: 'rgba(255,255,255,0.75)',
    }).setOrigin(0.5);
    items.push(sub);
  }

  const container = scene.add.container(x, y, items);
  
  // Create a dedicated hit zone that's slightly larger than the button (for "near-miss" taps)
  const margin = 10;
  const zone = scene.add.zone(0, 0, w + margin * 2, h + margin * 2)
    .setInteractive({ useHandCursor: true });
  container.add(zone);

  zone.on('pointerdown', () => {
    scene.tweens.add({ targets: container, scaleX: 0.94, scaleY: 0.94, duration: 80 });
  });

  zone.on('pointerup', () => {
    scene.tweens.add({ targets: container, scaleX: 1, scaleY: 1, duration: 80, onComplete: cb });
  });

  zone.on('pointerout', () => {
    scene.tweens.add({ targets: container, scaleX: 1, scaleY: 1, duration: 80 });
  });

  return container;
}

/* ── Card helper ─────────────────────────────────────────────────── */
function drawCard(scene: Phaser.Scene, x: number, y: number, w: number, h: number): Phaser.GameObjects.Graphics {
  const g = scene.add.graphics();
  // shadow
  g.fillStyle(0x000000, 0.06);
  g.fillRoundedRect(x + 4, y + 4, w, h, 20);
  // card
  g.fillStyle(COLORS.SURFACE, 1);
  g.fillRoundedRect(x, y, w, h, 20);
  return g;
}

/* ═══════════════════════════════════════════════════════════════════ */
export class HomeScene extends Phaser.Scene {
  constructor() { super('Home'); }

  async create() {
    const cx = GAME_WIDTH / 2;
    this.cameras.main.setBackgroundColor(COLORS.BG);
    this.cameras.main.fadeIn(400);

    // Sync with cloud on entry
    await gameService.syncWithCloud();

    if (AdService.isAdBlockerActive()) {
      this.add.text(cx, 25, '⚠️ Ad-blocker detected. Earn mode disabled.', {
        fontFamily: FONT_FAMILY, fontSize: '18px', color: CSS.DANGER, fontStyle: 'bold'
      }).setOrigin(0.5);
    }

    // ── Top Bar ─────────────────────────────────────────────────
    // Title
    const xoText = this.add.text(40, 50, 'XO', {
      fontFamily: FONT_FAMILY, fontSize: '52px', fontStyle: '900', color: CSS.X_PRIMARY,
    });
    this.add.text(xoText.x + xoText.width + 4, 58, '-Earn', {
      fontFamily: FONT_FAMILY, fontSize: '36px', fontStyle: '700', color: CSS.TEXT_PRIMARY,
    });

    // ── Balance Card ────────────────────────────────────────────
    drawCard(this, 40, 140, GAME_WIDTH - 80, 160);

    this.add.text(70, 160, '💰 XO-Credits', {
      fontFamily: FONT_FAMILY, fontSize: '18px', color: CSS.TEXT_SECONDARY,
    });
    this.add.text(70, 195, gameService.getCredits().toFixed(2), {
      fontFamily: FONT_FAMILY, fontSize: '48px', fontStyle: 'bold', color: CSS.TEXT_PRIMARY,
    });
    this.add.text(70, 260, `≈ $${(gameService.getCredits() * 0.01).toFixed(2)} USD`, {
      fontFamily: FONT_FAMILY, fontSize: '16px', color: CSS.TEXT_SECONDARY,
    });

    createButton(this, GAME_WIDTH - 150, 230, 180, 60, 'Withdraw', COLORS.O_PRIMARY, () => {
      this.scene.start('Withdrawal');
    });

    // -- Energy Pips --
    const energyY = 320;
    this.add.text(40, energyY, '⚡ Energy:', {
      fontFamily: FONT_FAMILY, fontSize: '22px', fontStyle: 'bold', color: CSS.TEXT_PRIMARY,
    });
    
    for (let i = 0; i < 10; i++) {
      const isFull = i < gameService.getEnergy();
      this.add.circle(160 + (i * 30), energyY + 12, 10, isFull ? 0x3DBAA2 : 0xDDDDDD);
    }

    createButton(this, GAME_WIDTH - 150, energyY + 10, 180, 50, '⚡ Watch Ad', COLORS.X_PRIMARY, () => {
      AdService.showRewardedVideo(() => {
        gameService.resetEnergy(); // Or gameService.addEnergy(5);
        this.scene.restart();
      });
    });

    // Energy indicator (right side of card)
    const energyX = GAME_WIDTH - 120;
    this.add.text(energyX, 160, '⚡ Energy', {
      fontFamily: FONT_FAMILY, fontSize: '16px', color: CSS.TEXT_SECONDARY,
    }).setOrigin(0.5, 0);

    const energyVal = gameService.getEnergy();
    this.add.text(energyX, 210, `${energyVal}/${ENERGY_MAX}`, {
      fontFamily: FONT_FAMILY, fontSize: '36px', fontStyle: 'bold', color: energyVal > 0 ? CSS.SUCCESS : CSS.DANGER,
    }).setOrigin(0.5, 0);

    // ── Play Modes Section ──────────────────────────────────────
    this.add.text(40, 340, 'PLAY', {
      fontFamily: FONT_FAMILY, fontSize: '20px', fontStyle: '700',
      color: CSS.TEXT_SECONDARY, letterSpacing: 4,
    });

    // -- VS AI Card --
    const aiCardY = 370;
    drawCard(this, 40, aiCardY, GAME_WIDTH - 80, 320);

    this.add.text(70, aiCardY + 20, '🤖 Play vs AI', {
      fontFamily: FONT_FAMILY, fontSize: '30px', fontStyle: 'bold', color: CSS.TEXT_PRIMARY,
    });
    this.add.text(70, aiCardY + 65, 'Challenge the computer. Earn credits\nwith every win!', {
      fontFamily: FONT_FAMILY, fontSize: '18px', color: CSS.TEXT_SECONDARY,
      lineSpacing: 4,
    });

    createButton(this, cx, aiCardY + 165, 500, 72, '😊 Easy Mode', COLORS.O_PRIMARY, () => {
      this.scene.start('Game', { difficulty: 'easy' });
    });

    createButton(this, cx, aiCardY + 255, 500, 72, '🔥 Hard Mode', COLORS.X_PRIMARY, () => {
      this.scene.start('Game', { difficulty: 'hard' });
    });

    // -- Invite Friend Card --
    const friendY = 710;
    const friendCard = this.add.graphics();
    friendCard.fillStyle(COLORS.SURFACE, 1);
    friendCard.fillRoundedRect(40, friendY, GAME_WIDTH - 80, 120, 20);
    
    // Add hit area for the card
    const friendHit = this.add.zone(40, friendY, GAME_WIDTH - 80, 120).setOrigin(0, 0).setInteractive({ useHandCursor: true });
    
    friendHit.on('pointerdown', async () => {
      const user = await AuthService.getCurrentUser();
      if (!user) {
        alert("Please login to play with friends!");
        this.scene.start('Auth');
        return;
      }
      const { data, error } = await MultiplayerService.createRoom(user.id);
      if (error) {
        alert("Error: " + error.message);
      } else if (data) {
        alert(`Room Code: ${data.room_code}\nShare this with your friend.`);
        this.scene.start('Game', { mode: 'multiplayer', room: data, role: 'X' });
      }
    });

    this.add.text(70, friendY + 20, '👫 Invite a Friend', {
      fontFamily: FONT_FAMILY, fontSize: '26px', fontStyle: 'bold', color: CSS.TEXT_PRIMARY,
    });
    this.add.text(70, friendY + 60, 'Tap here to create a private room.', {
      fontFamily: FONT_FAMILY, fontSize: '15px', color: CSS.TEXT_SECONDARY,
    });

    // -- Global Multiplayer Card --
    const globalY = 850;
    drawCard(this, 40, globalY, GAME_WIDTH - 80, 120);

    this.add.text(70, globalY + 20, '🌍 Global Multiplayer', {
      fontFamily: FONT_FAMILY, fontSize: '26px', fontStyle: 'bold', color: CSS.TEXT_PRIMARY,
    });
    
    createButton(this, cx, globalY + 70, 500, 72, '🌍 Play Globally', COLORS.O_PRIMARY, async () => {
      const user = await AuthService.getCurrentUser();
      if (!user) {
        this.scene.start('Auth');
        return;
      }
      
      if (gameService.getEnergy() <= 0) {
        alert("Out of Energy! Watch an ad to refill.");
        return;
      }

      this.scene.start('Matchmaking');
    });

    // ── Leaderboard Card ─────────────────────────────────────────
    const lbY = 990;
    const lbCardG = this.add.graphics();
    lbCardG.fillStyle(COLORS.SURFACE, 1);
    lbCardG.fillRoundedRect(40, lbY, GAME_WIDTH - 80, 100, 20);

    const lbHit = this.add.zone(40, lbY, GAME_WIDTH - 80, 100).setOrigin(0, 0).setInteractive({ useHandCursor: true });
    lbHit.on('pointerdown', () => this.scene.start('Leaderboard'));

    this.add.text(70, lbY + 15, '🏆 Weekly Leaderboard', {
      fontFamily: FONT_FAMILY, fontSize: '24px', fontStyle: 'bold', color: CSS.TEXT_PRIMARY,
    });
    this.add.text(70, lbY + 50, 'Top players earn bonus pool prizes.', {
      fontFamily: FONT_FAMILY, fontSize: '18px', color: CSS.TEXT_SECONDARY,
    });

    // ── Bottom Bar (Withdrawal) ──────────────────────────────────
    createButton(this, cx, 1190, 580, 76, '💸 Withdraw Credits', COLORS.O_PRIMARY, () => {
      this.scene.start('Withdrawal');
    }, 'Min. $5.00 — NOWpayments');
  }
}
