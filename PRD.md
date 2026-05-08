
# PRD: XO-Earn (Play-to-Earn Web Game)
**Version:** 1.0 (2026)  
**Status:** Ready for Development  
**Objective:** Create a lightweight, web-based Tic-Tac-Toe game that monetizes via high-frequency ads and shares 40% of revenue with players.

---

## 1. Project Overview
**XO-Earn** is a "Hyper-Casual" web game designed for mobile and desktop browsers. Players earn virtual "XO-Credits" by playing games and watching ads. These credits are converted into real-world currency (USD/Stablecoins) once a withdrawal threshold is reached.

---

## 2. Target Audience & Market
*   **Primary Audience:** Casual gamers in high-growth regions (India, SE Asia, LATAM) and P2E enthusiasts.
*   **Platform:** Mobile Web (PWA) to avoid App Store fees and restrictions.

---

## 3. Game Modes & Features
The game consists of three distinct play modules:

| Mode | Logic | Revenue Trigger |
| :--- | :--- | :--- |
| **Play vs AI** | Minimax algorithm (Easy/Hard). | Interstitial ad every 3 games. |
| **Invite a Friend** | Private room via unique URL link. | Post-game Interstitials for both players. |
| **Global Multiplayer** | Real-time matchmaking via Supabase. | Rewarded Video to enter the "Earn" queue. |

### Core Features:
*   **Daily Energy:** Limits the number of "Earn-eligible" games per day to prevent bot farming.
*   **Reward Multiplier:** Option to watch a 15-30s video to 3x the win bonus.
*   **Global Leaderboard:** Weekly top players receive a bonus pool prize.

---

## 4. Revenue & Payout Model
To maintain profitability, the project follows a **60/40 Revenue Split**.

### A. Income Streams (The 60%)
*   **Sticky Banners:** Two fixed units (Top and Bottom) refreshing every 30 seconds.
*   **Interstitials:** Full-screen ads triggered between matches.
*   **Rewarded Video:** User-opt-in videos for bonuses (Highest eCPM).

### B. Player Payouts (The 40%)
*   **Virtual Currency:** "XO-Credits."
*   **Dynamic Conversion:** The dollar-value of credits fluctuates based on the player’s region (Tier 1 vs Tier 3) to ensure you never pay out more than you earn.
*   **Withdrawal Threshold:** Minimum $5.00 to reduce transaction fee impact.
*   **Payout Channels:** NOWpayments.

---

## 5. Technical Stack
*   **Frontend:** Phaser 3 (Engine), TypeScript, Vite (Build tool).
*   **Backend:** Supabase (PostgreSQL, Auth, Edge Functions).
*   **Real-time:** Supabase Realtime (WebSockets for multiplayer).
*   **Hosting:** Vercel (Edge delivery).
*   **Security:** Cloudflare (DDoS/Bot Protection) + hCaptcha.
*   **Ads:** AppLovin MAX (Primary Mediator)

---

## 6. Functional Screen Modules
1.  **Splash/Loading:** Assets pre-loading, check for Ad-Blocker.
2.  **Auth Screen:** Google/Email Login (Supabase Auth).
3.  **Home Dashboard:** Balance display, Play buttons, and Wallet link.
4.  **Game Arena:** 9x9 Grid, Turn indicators, and persistent Ad banners.
5.  **Post-Game Modal:** Results, "Double Your Win" button, and "Back to Lobby."
6.  **Withdrawal Portal:** Payment method selection and KYC/Email verification.

---

## 7. Security & Anti-Fraud (The "Guardrails")
*   **Server-Side Verification:** Game outcomes are calculated in Supabase Edge Functions. The client (browser) cannot "tell" the server it won.
*   **Bot Detection:** Cloudflare Turnstile challenges triggered if the "Time-to-Move" is consistently under 200ms.
*   **Ad-Block Detection:** Users with active ad-blockers are barred from "Earn Mode."
*   **Multiple Account Prevention:** Linking payouts to unique hardware IDs/IPs to prevent one person from using 10 phones.

---

## 8. Success Metrics (KPIs)
*   **ARPU:** Average Revenue Per User > $0.05/day.
*   **Retention (D1):** Target > 30% (Players coming back the next day).
*   **Burn Rate:** Ensuring Player Payouts + Hosting < 50% of Gross Revenue.

