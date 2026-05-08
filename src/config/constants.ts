// ── Theme Colors (as hex numbers for Phaser) ──
export const COLORS = {
  BG:             0xF8F4E8,
  SURFACE:        0xFFFFFF,
  GRID_LINE:      0xDDD6C9,
  CELL_HOVER:     0xF0EBD8,
  X_PRIMARY:      0xE8575A,
  X_DARK:         0xC0392B,
  O_PRIMARY:      0x3DBAA2,
  O_DARK:         0x1E8A72,
  TEXT_PRIMARY:    0x2D3436,
  TEXT_SECONDARY:  0x7F8C8D,
  ACCENT_GOLD:    0xF5A623,
  SUCCESS:        0x27AE60,
  DANGER:         0xE74C3C,
  BTN_GRADIENT_1: 0xE8575A,
  BTN_GRADIENT_2: 0xF39C12,
  OVERLAY:        0x000000,
};

// CSS color strings (for Phaser text styles)
export const CSS = {
  BG:            '#F8F4E8',
  X_PRIMARY:     '#E8575A',
  O_PRIMARY:     '#3DBAA2',
  TEXT_PRIMARY:  '#2D3436',
  TEXT_SECONDARY:'#7F8C8D',
  ACCENT_GOLD:   '#F5A623',
  SURFACE:       '#FFFFFF',
  SUCCESS:       '#27AE60',
  DANGER:        '#E74C3C',
  GRID_LINE:     '#DDD6C9',
};

// ── Game Rules ──
export const GRID_SIZE     = 9;
export const WIN_LENGTH    = 5;
export const CELL_SIZE     = 74;
export const GRID_GAP      = 2;
export const GRID_PADDING  = 8;

// ── Game Canvas ──
export const GAME_WIDTH  = 720;
export const GAME_HEIGHT = 1280;

// ── Economy (mock for Phase 1-2) ──
export const CREDITS_WIN     = 10;
export const CREDITS_DRAW    = 3;
export const CREDITS_LOSS    = 1;
export const ENERGY_MAX      = 10;
export const AD_INTERVAL     = 3; // interstitial every N games

// ── Font ──
export const FONT_FAMILY = 'Outfit, sans-serif';
