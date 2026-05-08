import { ENERGY_MAX, CREDITS_WIN, CREDITS_DRAW, CREDITS_LOSS, AD_INTERVAL } from '../config/constants';
import { supabase } from '../config/supabaseClient';

class GameService {
  private credits: number = 0;
  private energy: number = ENERGY_MAX;
  private gamesPlayedSinceAd: number = 0;
  private userId: string | null = null;

  constructor() {
    this.loadState();
  }

  /**
   * Fetch latest data from Supabase and sync with local
   */
  async syncWithCloud() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    
    this.userId = user.id;
    const { data, error } = await supabase
      .from('profiles')
      .select('xo_credits, daily_energy')
      .eq('id', user.id)
      .single();

    if (data && !error) {
      this.credits = Number(data.xo_credits);
      this.energy = data.daily_energy;
      this.saveState();
    }
  }

  private loadState() {
    const saved = localStorage.getItem('xo_earn_state');
    if (saved) {
      const state = JSON.parse(saved);
      this.credits = state.credits || 0;
      this.energy = state.energy ?? ENERGY_MAX;
      this.gamesPlayedSinceAd = state.gamesPlayedSinceAd || 0;
    }
  }

  private saveState() {
    localStorage.setItem('xo_earn_state', JSON.stringify({
      credits: this.credits,
      energy: this.energy,
      gamesPlayedSinceAd: this.gamesPlayedSinceAd
    }));

    // If logged in, also push to Supabase
    if (this.userId) {
      supabase.from('profiles').update({
        xo_credits: this.credits,
        daily_energy: this.energy
      }).eq('id', this.userId).then();
    }
  }

  getCredits() { return this.credits; }
  getEnergy() { return this.energy; }

  async consumeEnergy(): Promise<boolean> {
    if (this.energy > 0) {
      this.energy--;
      this.saveState();
      return true;
    }
    return false;
  }

  async addCredits(amount: number) {
    this.credits += amount;
    this.saveState();
  }

  recordGame() {
    this.gamesPlayedSinceAd++;
    this.saveState();
    
    if (this.gamesPlayedSinceAd >= AD_INTERVAL) {
      this.gamesPlayedSinceAd = 0;
      this.saveState();
      return true; // Trigger Interstitial Ad
    }
    return false;
  }

  resetEnergy() {
    this.energy = ENERGY_MAX;
    this.saveState();
  }
}

export const gameService = new GameService();
