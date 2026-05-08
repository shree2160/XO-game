import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, COLORS, CSS, FONT_FAMILY } from '../config/constants';
import { AuthService } from '../services/authService';

export class AuthScene extends Phaser.Scene {
  private emailInput: HTMLInputElement | null = null;
  private passwordInput: HTMLInputElement | null = null;
  private isLoginMode = true;
  private submitBtnText!: Phaser.GameObjects.Text;
  private modeToggleText!: Phaser.GameObjects.Text;

  constructor() { super('Auth'); }

  create() {
    const cx = GAME_WIDTH / 2;
    const cy = GAME_HEIGHT / 2;

    this.cameras.main.setBackgroundColor(COLORS.BG);

    // 1. Branding Text
    this.add.text(cx, cy - 360, 'XO-Earn', {
      fontFamily: FONT_FAMILY, fontSize: '64px', fontStyle: '900', color: CSS.X_PRIMARY,
    }).setOrigin(0.5);

    const titleText = this.add.text(cx, cy - 280, 'Sign in to continue', {
      fontFamily: FONT_FAMILY, fontSize: '24px', color: CSS.TEXT_SECONDARY,
    }).setOrigin(0.5);

    // 2. Auth Container (DOM)
    const container = document.createElement('div');
    container.style.width = '400px';
    container.style.display = 'flex';
    container.style.flexDirection = 'column';
    container.style.gap = '15px';
    container.style.alignItems = 'center';

    const email = document.createElement('input');
    email.type = 'email';
    email.placeholder = 'Email address';
    this.styleInput(email);
    container.appendChild(email);
    this.emailInput = email;

    const password = document.createElement('input');
    password.type = 'password';
    password.placeholder = 'Password';
    this.styleInput(password);
    container.appendChild(password);
    this.passwordInput = password;

    const turnstileDiv = document.createElement('div');
    turnstileDiv.id = 'turnstile-container';
    container.appendChild(turnstileDiv);

    this.add.dom(cx, cy - 50, container).setOrigin(0.5);

    // Initialize Turnstile (Simulation mode for now)
    this.time.delayedCall(500, () => {
      if ((window as any).turnstile) {
        (window as any).turnstile.render('#turnstile-container', {
          sitekey: '1x00000000000000000000AA', // Testing Sitekey
          callback: (token: string) => {
            (window as any).turnstileToken = token;
          },
        });
      }
    });

    // 3. Submit Button
    const btnW = 440, btnH = 80;
    const btnG = this.add.graphics();
    btnG.fillStyle(COLORS.O_PRIMARY, 1);
    btnG.fillRoundedRect(-btnW / 2, -btnH / 2, btnW, btnH, 20);
    
    this.submitBtnText = this.add.text(0, 0, 'Login', {
      fontFamily: FONT_FAMILY, fontSize: '28px', fontStyle: 'bold', color: '#FFFFFF'
    }).setOrigin(0.5);

    const submitBtn = this.add.container(cx, cy + 100, [btnG, this.submitBtnText]).setSize(btnW, btnH);
    const zone = this.add.zone(0, 0, btnW + 20, btnH + 20).setInteractive({ useHandCursor: true });
    submitBtn.add(zone);

    zone.on('pointerdown', () => this.tweens.add({ targets: submitBtn, scaleX: 0.95, scaleY: 0.95, duration: 80 }));
    zone.on('pointerup', async () => {
      this.tweens.add({ targets: submitBtn, scaleX: 1, scaleY: 1, duration: 80 });
      this.handleAuth();
    });

    // 4. Toggle Mode
    this.modeToggleText = this.add.text(cx, cy + 200, "Don't have an account? Sign Up", {
      fontFamily: FONT_FAMILY, fontSize: '18px', color: CSS.X_PRIMARY, fontStyle: 'bold'
    }).setOrigin(0.5).setInteractive({ useHandCursor: true }).setPadding(10);

    this.modeToggleText.on('pointerdown', () => {
      this.isLoginMode = !this.isLoginMode;
      titleText.setText(this.isLoginMode ? 'Sign in to continue' : 'Create your account');
      this.submitBtnText.setText(this.isLoginMode ? 'Login' : 'Sign Up');
      this.modeToggleText.setText(this.isLoginMode ? "Don't have an account? Sign Up" : "Already have an account? Login");
    });

    // Skip
    const skip = this.add.text(cx, cy + 320, 'Continue as Guest', {
      fontFamily: FONT_FAMILY, fontSize: '18px', color: CSS.TEXT_SECONDARY, textDecoration: 'underline'
    }).setOrigin(0.5).setInteractive({ useHandCursor: true }).setPadding(20);
    skip.on('pointerdown', () => this.scene.start('Home'));
  }

  private styleInput(el: HTMLInputElement) {
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
  }

  private async handleAuth() {
    const e = this.emailInput?.value;
    const p = this.passwordInput?.value;
    const token = (window as any).turnstileToken;

    if (!token) {
      alert("Please complete the bot verification check.");
      return;
    }

    if (!e || !p || p.length < 6) {
      alert("Please enter a valid email and a password (min 6 chars)");
      return;
    }

    this.submitBtnText.setText('Working...');
    
    const { data, error } = this.isLoginMode 
      ? await AuthService.signIn(e, p)
      : await AuthService.signUp(e, p);

    if (error) {
      alert(error.message);
      this.submitBtnText.setText(this.isLoginMode ? 'Login' : 'Sign Up');
    } else {
      if (!this.isLoginMode) {
        alert("Account created! Check your email to confirm.");
      }
      this.scene.start('Home');
    }
  }

  shutdown() {
    if (this.emailInput) this.emailInput.remove();
    if (this.passwordInput) this.passwordInput.remove();
  }
}
