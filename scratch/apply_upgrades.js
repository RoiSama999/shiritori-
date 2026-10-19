const fs = require('fs');
const vm = require('vm');

let html = fs.readFileSync('index.v2.html', 'utf8');

console.log('Original HTML size:', html.length);

// 1. ADD NEW STYLES (CSS THEMES + CHIBI MASCOT + SAKURA CANVAS + DOJO UPGRADE)
// Locate where CSS variables are defined (line 24, :root)
const rootStart = html.indexOf(':root {');
const rootEnd = html.indexOf('}', rootStart) + 1;

const originalRootCss = html.substring(rootStart, rootEnd);

const enhancedThemeCss = `/* ══════════════════════════════════════════════════
   THEME SYSTEM: 3 DISTINCT STYLES + DUAL LIGHT/DARK MODES
   Theme 1: Tokyo Neon Arcade (Default)
   Theme 2: Sakura Elegance (Tao nhã lịch thiệp chuẩn Nhật)
   Theme 3: Kawaii Anime Neko (Anime cute kẹo ngọt & tai mèo)
   ══════════════════════════════════════════════════ */
:root,
body[data-theme-style="arcade"][data-theme-mode="dark"],
[data-theme-style="arcade"][data-theme-mode="dark"],
body:not([data-theme-style]) {
  --bg-deep: #07080e;
  --bg-surface: #0f121d;
  --bg-card: #151a2a;
  --bg-card-hover: #1c2338;
  --bg-glass: rgba(15, 18, 29, 0.88);
  
  --border: #242c44;
  --border-light: #364266;
  --border-glow: rgba(5, 217, 232, 0.4);
  
  --neon-sakura: #ff2a6d;
  --neon-sakura-glow: rgba(255, 42, 109, 0.25);
  --neon-cyan: #05d9e8;
  --neon-cyan-glow: rgba(5, 217, 232, 0.25);
  --neon-gold: #ffbe0b;
  --neon-gold-glow: rgba(255, 190, 11, 0.25);
  --neon-lime: #00f59b;
  --neon-purple: #9d4edd;
  --neon-crimson: #ff3366;
  
  --text-primary: #f8fafc;
  --text-secondary: #cbd5e1;
  --text-muted: #8493b2;
  
  --radius-sm: 8px;
  --radius-md: 14px;
  --radius-lg: 20px;
  --radius-full: 999px;
  
  --font-ui: 'Be Vietnam Pro', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  --font-arcade: 'Be Vietnam Pro', -apple-system, BlinkMacSystemFont, sans-serif;
  --font-serif: 'Be Vietnam Pro', 'Noto Serif JP', -apple-system, serif;
  --font-kanji: 'Noto Serif JP', 'Be Vietnam Pro', serif;
  --font-kana: 'Noto Sans JP', 'Be Vietnam Pro', sans-serif;
  
  --shadow-card: 0 4px 12px rgba(0, 0, 0, 0.35);
  --shadow-neon-pink: 0 2px 8px rgba(255, 42, 109, 0.2);
  --shadow-neon-cyan: 0 2px 8px rgba(5, 217, 232, 0.2);
  --theme-transition: background-color 0.25s ease, border-color 0.25s ease, color 0.25s ease;
}

/* ARCADE LIGHT MODE */
body[data-theme-style="arcade"][data-theme-mode="light"],
[data-theme-style="arcade"][data-theme-mode="light"] {
  --bg-deep: #f0f4f9;
  --bg-surface: #ffffff;
  --bg-card: #e4ebf5;
  --bg-card-hover: #d7e2f0;
  --bg-glass: rgba(255, 255, 255, 0.94);
  --border: #c4d1e2;
  --border-light: #94a3b8;
  --border-glow: rgba(2, 132, 199, 0.45);
  --neon-sakura: #e11d48;
  --neon-sakura-glow: rgba(225, 29, 72, 0.2);
  --neon-cyan: #0284c7;
  --neon-cyan-glow: rgba(2, 132, 199, 0.2);
  --neon-gold: #d97706;
  --neon-gold-glow: rgba(217, 119, 6, 0.2);
  --neon-lime: #16a34a;
  --neon-purple: #7c3aed;
  --neon-crimson: #dc2626;
  --text-primary: #0f172a;
  --text-secondary: #334155;
  --text-muted: #64748b;
  --shadow-card: 0 4px 16px rgba(15, 23, 42, 0.08);
}

/* ══════════════════════════════════════════════════
   PHONG CÁCH 1: SAKURA ELEGANCE (Tao Nhã Lịch Thiệp Chuẩn Nhật)
   ══════════════════════════════════════════════════ */
/* SAKURA LIGHT (Washi Paper, Cherry Blossom, Moss & Wood) */
body[data-theme-style="sakura"][data-theme-mode="light"],
[data-theme-style="sakura"][data-theme-mode="light"] {
  --bg-deep: #faf5ee;
  --bg-surface: #ffffff;
  --bg-card: #f4ece4;
  --bg-card-hover: #eae0d6;
  --bg-glass: rgba(255, 255, 255, 0.95);
  --border: #dfcfc4;
  --border-light: #caa89b;
  --border-glow: rgba(216, 74, 117, 0.35);
  --neon-sakura: #d84a75;
  --neon-sakura-glow: rgba(216, 74, 117, 0.2);
  --neon-cyan: #2a8382;
  --neon-cyan-glow: rgba(42, 131, 130, 0.2);
  --neon-gold: #b38222;
  --neon-gold-glow: rgba(179, 130, 34, 0.2);
  --neon-lime: #52794c;
  --neon-purple: #704d7e;
  --neon-crimson: #c93a40;
  --text-primary: #2b2220;
  --text-secondary: #5a4b47;
  --text-muted: #88746f;
  --font-ui: 'Noto Serif JP', 'Be Vietnam Pro', serif;
  --font-serif: 'Noto Serif JP', 'Be Vietnam Pro', serif;
  --radius-sm: 6px;
  --radius-md: 12px;
  --radius-lg: 18px;
  --shadow-card: 0 4px 14px rgba(78, 52, 46, 0.08);
}

/* SAKURA DARK (Yozakura Dạ Nguyệt - Đêm Hoa Anh Đào Lung Linh) */
body[data-theme-style="sakura"][data-theme-mode="dark"],
[data-theme-style="sakura"][data-theme-mode="dark"] {
  --bg-deep: #161217;
  --bg-surface: #221a24;
  --bg-card: #2e2330;
  --bg-card-hover: #3b2c3d;
  --bg-glass: rgba(34, 26, 36, 0.92);
  --border: #4a384d;
  --border-light: #614a65;
  --border-glow: rgba(255, 112, 150, 0.35);
  --neon-sakura: #ff7096;
  --neon-sakura-glow: rgba(255, 112, 150, 0.25);
  --neon-cyan: #4ecdc4;
  --neon-cyan-glow: rgba(78, 205, 196, 0.25);
  --neon-gold: #f4c430;
  --neon-gold-glow: rgba(244, 196, 48, 0.25);
  --neon-lime: #88d49e;
  --neon-purple: #b589d6;
  --neon-crimson: #ff5376;
  --text-primary: #fcf6f8;
  --text-secondary: #d6cad1;
  --text-muted: #9e8e98;
  --font-ui: 'Noto Serif JP', 'Be Vietnam Pro', serif;
  --font-serif: 'Noto Serif JP', 'Be Vietnam Pro', serif;
  --radius-sm: 6px;
  --radius-md: 12px;
  --radius-lg: 18px;
  --shadow-card: 0 4px 16px rgba(0, 0, 0, 0.45);
}

/* ══════════════════════════════════════════════════
   PHONG CÁCH 2: KAWAII ANIME NEKO (Chuẩn Kiểu Anime Cute Mèo)
   ══════════════════════════════════════════════════ */
/* NEKO LIGHT (Dâu Sữa Pastel, Neko Ears & Paws) */
body[data-theme-style="neko"][data-theme-mode="light"],
[data-theme-style="neko"][data-theme-mode="light"] {
  --bg-deep: #fff5f8;
  --bg-surface: #ffffff;
  --bg-card: #ffe8f0;
  --bg-card-hover: #ffd9e6;
  --bg-glass: rgba(255, 255, 255, 0.95);
  --border: #fbc2d8;
  --border-light: #f79fc2;
  --border-glow: rgba(255, 107, 153, 0.4);
  --neon-sakura: #ff4d85;
  --neon-sakura-glow: rgba(255, 77, 133, 0.25);
  --neon-cyan: #38bdf8;
  --neon-cyan-glow: rgba(56, 189, 248, 0.25);
  --neon-gold: #f59e0b;
  --neon-gold-glow: rgba(245, 158, 11, 0.25);
  --neon-lime: #10b981;
  --neon-purple: #a855f7;
  --neon-crimson: #f43f5e;
  --text-primary: #3d2232;
  --text-secondary: #6e465e;
  --text-muted: #9c738c;
  --radius-sm: 10px;
  --radius-md: 18px;
  --radius-lg: 26px;
  --shadow-card: 0 6px 18px rgba(255, 107, 153, 0.12);
}

/* NEKO DARK (Mèo Đêm Vũ Trụ - Midnight Galaxy Neko) */
body[data-theme-style="neko"][data-theme-mode="dark"],
[data-theme-style="neko"][data-theme-mode="dark"] {
  --bg-deep: #131122;
  --bg-surface: #1e1933;
  --bg-card: #282142;
  --bg-card-hover: #352b57;
  --bg-glass: rgba(30, 25, 51, 0.92);
  --border: #42366b;
  --border-light: #5d4d94;
  --border-glow: rgba(255, 117, 182, 0.4);
  --neon-sakura: #ff75b6;
  --neon-sakura-glow: rgba(255, 117, 182, 0.3);
  --neon-cyan: #67e8f9;
  --neon-cyan-glow: rgba(103, 232, 249, 0.25);
  --neon-gold: #fde047;
  --neon-gold-glow: rgba(253, 224, 71, 0.25);
  --neon-lime: #4ade80;
  --neon-purple: #c084fc;
  --neon-crimson: #fb7185;
  --text-primary: #fdfaff;
  --text-secondary: #d1c7e6;
  --text-muted: #9b8eb8;
  --radius-sm: 10px;
  --radius-md: 18px;
  --radius-lg: 26px;
  --shadow-card: 0 6px 20px rgba(0, 0, 0, 0.45);
}

/* THEME SPECIFIC OVERRIDES & DECORATIVE ACCENTS */
[data-theme-style="sakura"] .app-header,
[data-theme-style="sakura"] .bottom-nav {
  background: var(--bg-surface);
  border-color: var(--border);
}
[data-theme-style="sakura"] .brand-logo span {
  color: var(--neon-sakura);
}
[data-theme-style="neko"] .app-header,
[data-theme-style="neko"] .bottom-nav {
  background: var(--bg-surface);
  border-color: var(--border);
}
[data-theme-style="neko"] .card {
  transition: transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.2s ease;
}
[data-theme-style="neko"] .card:hover {
  transform: translateY(-2px);
}
[data-theme-style="neko"] .btn {
  border-radius: var(--radius-full);
}
[data-theme-style="neko"] .hub-featured-card::before {
  content: '🐾';
  position: absolute;
  top: -12px;
  right: 20px;
  font-size: 1.25rem;
  filter: drop-shadow(0 2px 4px rgba(0,0,0,0.2));
}

/* Chibi Avatar Mascot Animations */
@keyframes chibiFloat {
  0%, 100% { transform: translateY(0px) rotate(0deg); }
  50% { transform: translateY(-3px) rotate(0.5deg); }
}
@keyframes chibiBounce {
  0% { transform: scale(1) translateY(0); }
  35% { transform: scale(1.15) translateY(-8px); }
  65% { transform: scale(0.95) translateY(2px); }
  100% { transform: scale(1) translateY(0); }
}
.chibi-avatar-svg {
  animation: chibiFloat 3.2s ease-in-out infinite;
  transform-origin: center bottom;
  display: block;
}
.chibi-bounce-active .chibi-avatar-svg {
  animation: chibiBounce 0.55s cubic-bezier(0.34, 1.56, 0.64, 1) !important;
}

/* Falling Sakura Petals Canvas */
#sakuraPetalsCanvas {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  pointer-events: none;
  z-index: 1;
  display: none;
}
body[data-theme-style="sakura"] #sakuraPetalsCanvas {
  display: block;
}
`;

html = html.replace(originalRootCss, enhancedThemeCss);

console.log('Theme CSS injected. Validating...');

fs.writeFileSync('index.v2.html', html);
console.log('Step 1 complete.');
