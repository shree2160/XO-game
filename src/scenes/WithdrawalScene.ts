import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, COLORS, CSS, FONT_FAMILY } from '../config/constants';
import { gameService } from '../services/gameService';
import { AuthService } from '../services/authService';
import { supabase } from '../config/supabaseClient';

export class WithdrawalScene extends Phaser.Scene {
  private amountInput: HTMLInputElement | null = null;
  private addressInput: HTMLInputElement | null = null;

  constructor() { super('Withdrawal'); }

  create() {
    const cx = GAME_WIDTH / 2;
    const cy = GAME_HEIGHT / 2;

    this.cameras.main.setBackgroundColor(COLORS.BG);

    // Header
    this.add.text(cx, 80, '💰 Withdraw Credits', {
      fontFamily: FONT_FAMILY, fontSize: '36px', fontStyle: 'bold', color: CSS.TEXT_PRIMARY
    }).setOrigin(0.5);

    const balance = gameService.getCredits().toFixed(2);
    this.add.text(cx, 140, `Current Balance: ${balance} Credits`, {
      fontFamily: FONT_FAMILY, fontSize: '22px', color: CSS.TEXT_SECONDARY
    }).setOrigin(0.5);

    // Form Container
    const container = document.createElement('div');
    container.style.width = '400px';
    container.style.display = 'flex';
    container.style.flexDirection = 'column';
    container.style.gap = '20px';
    
    this.amountInput = this.createStyledInput('Amount to withdraw (Min: 100)');
    this.addressInput = this.createStyledInput('Wallet Address / Email');
    
    container.appendChild(this.amountInput);
    container.appendChild(this.addressInput);

    this.add.dom(cx, cy - 50, container).setOrigin(0.5);

    // Info
    this.add.text(cx, cy + 120, 'Payouts are processed via NOWpayments.\nEstimated time: 24-48 hours.', {
      fontFamily: FONT_FAMILY, fontSize: '16px', color: CSS.TEXT_SECONDARY, align: 'center'
    }).setOrigin(0.5);

    // Submit Button
    const btnW = 440, btnH = 80;
    const btnG = this.add.graphics();
    btnG.fillStyle(COLORS.O_PRIMARY, 1);
    btnG.fillRoundedRect(-btnW / 2, -btnH / 2, btnW, btnH, 20);
    const btnText = this.add.text(0, 0, 'Submit Request', {
      fontFamily: FONT_FAMILY, fontSize: '28px', fontStyle: 'bold', color: '#FFFFFF'
    }).setOrigin(0.5);

    const submitBtn = this.add.container(cx, cy + 240, [btnG, btnText]).setSize(btnW, btnH);
    const zone = this.add.zone(0, 0, btnW + 20, btnH + 20).setInteractive({ useHandCursor: true });
    submitBtn.add(zone);

    zone.on('pointerdown', () => this.tweens.add({ targets: submitBtn, scaleX: 0.95, scaleY: 0.95, duration: 80 }));
    zone.on('pointerup', () => {
      this.tweens.add({ targets: submitBtn, scaleX: 1, scaleY: 1, duration: 80 });
      this.handleSubmit();
    });

    // Back Button
    const back = this.add.text(cx, cy + 340, 'Back to Home', {
      fontFamily: FONT_FAMILY, fontSize: '18px', color: CSS.TEXT_SECONDARY, textDecoration: 'underline'
    }).setOrigin(0.5).setInteractive({ useHandCursor: true }).setPadding(20);
    back.on('pointerdown', () => this.scene.start('Home'));
  }

  private createStyledInput(placeholder: string) {
    const el = document.createElement('input');
    el.placeholder = placeholder;
    el.style.width = '100%';
    el.style.height = '60px';
    el.style.padding = '10px';
    el.style.borderRadius = '15px';
    el.style.border = `3px solid ${CSS.GRID_LINE}`;
    el.style.fontFamily = 'Outfit, sans-serif';
    el.style.fontSize = '20px';
    el.style.textAlign = 'center';
    el.style.outline = 'none';
    el.style.boxSizing = 'border-box';
    return el;
  }

  private async handleSubmit() {
    const amount = parseFloat(this.amountInput?.value || '0');
    const address = this.addressInput?.value;

    if (isNaN(amount) || amount < 100) {
      alert("Minimum withdrawal is 100 credits.");
      return;
    }

    if (amount > gameService.getCredits()) {
      alert("Insufficient balance!");
      return;
    }

    if (!address || address.length < 5) {
      alert("Please enter a valid payout address.");
      return;
    }

    const user = await AuthService.getCurrentUser();
    if (!user) return;

    // Call Edge Function for secure withdrawal processing
    const { data, error } = await supabase.functions.invoke('process-withdrawal', {
      body: { amount, address }
    });

    if (error || (data && data.error)) {
      alert("Error: " + (error?.message || data.error));
    } else {
      alert("Success! Your withdrawal request has been submitted.");
      // Refresh local credits
      await gameService.syncWithCloud();
      this.scene.start('Home');
    }
  }

  shutdown() {
    this.amountInput?.remove();
    this.addressInput?.remove();
  }
}
