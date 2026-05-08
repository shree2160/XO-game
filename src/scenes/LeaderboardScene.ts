import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, COLORS, CSS, FONT_FAMILY } from '../config/constants';
import { supabase } from '../config/supabaseClient';

export class LeaderboardScene extends Phaser.Scene {
  constructor() { super('Leaderboard'); }

  async create() {
    const cx = GAME_WIDTH / 2;
    this.cameras.main.setBackgroundColor(COLORS.BG);

    // Header
    this.add.text(cx, 80, '🏆 Hall of Fame', {
      fontFamily: FONT_FAMILY, fontSize: '40px', fontStyle: 'bold', color: CSS.TEXT_PRIMARY
    }).setOrigin(0.5);

    this.add.text(cx, 130, 'Top XO-Earners Worldwide', {
      fontFamily: FONT_FAMILY, fontSize: '18px', color: CSS.TEXT_SECONDARY
    }).setOrigin(0.5);

    // Back Button
    const backBtn = this.add.text(cx, GAME_HEIGHT - 60, '← Back to Dashboard', {
      fontFamily: FONT_FAMILY, fontSize: '20px', color: CSS.TEXT_SECONDARY, textDecoration: 'underline'
    }).setOrigin(0.5).setInteractive({ useHandCursor: true }).setPadding(20);
    
    backBtn.on('pointerdown', () => this.scene.start('Home'));

    // Loading State
    const loadingText = this.add.text(cx, 400, 'Fetching Rankings...', {
      fontFamily: FONT_FAMILY, fontSize: '20px', color: CSS.TEXT_SECONDARY
    }).setOrigin(0.5);

    // Fetch Data
    const { data, error } = await supabase
      .from('profiles')
      .select('username, xo_credits')
      .order('xo_credits', { ascending: false })
      .limit(10);

    loadingText.destroy();

    if (error) {
      this.add.text(cx, 400, 'Error loading leaderboard', { color: CSS.DANGER }).setOrigin(0.5);
      return;
    }

    if (data) {
      this.renderList(data);
    }
  }

  private renderList(players: any[]) {
    const cx = GAME_WIDTH / 2;
    const startY = 220;
    const rowHeight = 80;

    players.forEach((player, i) => {
      const y = startY + (i * rowHeight);
      
      // Row Background
      const bg = this.add.graphics();
      bg.fillStyle(0xFFFFFF, 0.1);
      bg.fillRoundedRect(40, y - 35, GAME_WIDTH - 80, 70, 15);

      // Rank
      const rankColor = i === 0 ? CSS.ACCENT_GOLD : (i === 1 ? '#C0C0C0' : (i === 2 ? '#CD7F32' : CSS.TEXT_SECONDARY));
      this.add.text(70, y, `#${i + 1}`, {
        fontFamily: FONT_FAMILY, fontSize: '24px', fontStyle: 'bold', color: rankColor
      }).setOrigin(0, 0.5);

      // Username
      this.add.text(140, y, player.username || 'Anonymous', {
        fontFamily: FONT_FAMILY, fontSize: '22px', fontStyle: '600', color: CSS.TEXT_PRIMARY
      }).setOrigin(0, 0.5);

      // Credits
      this.add.text(GAME_WIDTH - 70, y, `${Number(player.xo_credits).toFixed(2)}`, {
        fontFamily: FONT_FAMILY, fontSize: '22px', fontStyle: 'bold', color: CSS.X_PRIMARY
      }).setOrigin(1, 0.5);
    });
  }
}
