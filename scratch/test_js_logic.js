// Test JS logic for Theme, Mascot, Blitz, and MV upgrades
const vm = require('vm');

const jsCode = `
// ══════════════════════════════════════════════════
// THEME ENGINE: 3 STYLES & DUAL LIGHT/DARK MODES
// ══════════════════════════════════════════════════
function initThemeEngine() {
  if (!userData.themeStyle) userData.themeStyle = 'arcade';
  if (!userData.themeMode) userData.themeMode = 'dark';
  applyTheme(userData.themeStyle, userData.themeMode, false);
}

function setThemeStyle(style) {
  playSfx('click');
  userData.themeStyle = style;
  saveUserData();
  applyTheme(style, userData.themeMode, true);
}

function setThemeMode(mode) {
  playSfx('click');
  userData.themeMode = mode;
  saveUserData();
  applyTheme(userData.themeStyle, mode, true);
}

function applyTheme(style, mode, notify = false) {
  const root = document.documentElement;
  const body = document.body;
  
  root.setAttribute('data-theme-style', style);
  root.setAttribute('data-theme-mode', mode);
  if (body) {
    body.setAttribute('data-theme-style', style);
    body.setAttribute('data-theme-mode', mode);
  }

  // Update modal cards & indicators
  updateThemePickerUI();

  // Control falling sakura petals canvas
  if (style === 'sakura') {
    startSakuraPetalsCanvas();
  } else {
    stopSakuraPetalsCanvas();
  }

  // Re-render mascot to match theme (Neko / Sakura / Arcade)
  if (typeof updateSakuraPetUI === 'function') {
    updateSakuraPetUI();
  }

  if (notify && typeof showToast === 'function') {
    const styleNames = {
      arcade: '⚡ Tokyo Neon Arcade',
      sakura: '🌸 Sakura Elegance (Tao Nhã Chuẩn Nhật)',
      neko: '🐾 Kawaii Anime Neko (Cute Mèo)'
    };
    const modeName = mode === 'light' ? '☀️ Sáng' : '🌙 Tối';
    showToast(\`Đã đổi phong cách: \${styleNames[style] || style} (\${modeName})\`);
  }
}

function openThemePickerModal() {
  playSfx('click');
  updateThemePickerUI();
  const modal = document.getElementById('themePickerModalOverlay');
  if (modal) modal.classList.add('show');
}

function closeThemePickerModal() {
  playSfx('click');
  const modal = document.getElementById('themePickerModalOverlay');
  if (modal) modal.classList.remove('show');
}

function updateThemePickerUI() {
  const curStyle = (userData && userData.themeStyle) || 'arcade';
  const curMode = (userData && userData.themeMode) || 'dark';

  // Update style cards border/glow
  ['arcade', 'sakura', 'neko'].forEach(s => {
    const card = document.getElementById('themeCard_' + s);
    const check = document.getElementById('check_' + s);
    if (card) {
      if (s === curStyle) {
        card.style.borderColor = 'var(--neon-cyan)';
        card.style.background = 'rgba(5, 217, 232, 0.08)';
      } else {
        card.style.borderColor = 'var(--border)';
        card.style.background = 'var(--bg-surface)';
      }
    }
    if (check) {
      check.textContent = s === curStyle ? '✓ Đang dùng' : '●';
      check.style.fontWeight = s === curStyle ? '800' : 'normal';
    }
  });

  // Update Dark / Light buttons
  const darkBtn = document.getElementById('themeModeDarkBtn');
  const lightBtn = document.getElementById('themeModeLightBtn');
  if (darkBtn && lightBtn) {
    if (curMode === 'dark') {
      darkBtn.className = 'btn btn-sm btn-cyan theme-mode-btn';
      lightBtn.className = 'btn btn-sm btn-ghost theme-mode-btn';
    } else {
      darkBtn.className = 'btn btn-sm btn-ghost theme-mode-btn';
      lightBtn.className = 'btn btn-sm btn-cyan theme-mode-btn';
    }
  }

  // Update Settings badge if present
  const stBadge = document.getElementById('settingsCurrentThemeBadge');
  if (stBadge) {
    const names = { arcade: 'Tokyo Arcade', sakura: 'Sakura Elegance', neko: 'Anime Neko' };
    stBadge.textContent = (names[curStyle] || curStyle) + (curMode === 'light' ? ' (Sáng)' : ' (Tối)');
  }
}

// ══════════════════════════════════════════════════
// FALLING SAKURA PETALS CANVAS ENGINE
// ══════════════════════════════════════════════════
let sakuraCanvasAnim = null;
let sakuraPetalsList = [];

function startSakuraPetalsCanvas() {
  const canvas = document.getElementById('sakuraPetalsCanvas');
  if (!canvas) return;
  canvas.style.display = 'block';
  const ctx = canvas.getContext('2d');
  
  function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }
  resize();
  window.addEventListener('resize', resize, { passive: true });

  if (sakuraPetalsList.length === 0) {
    const count = window.innerWidth < 768 ? 16 : 28;
    for (let i = 0; i < count; i++) {
      sakuraPetalsList.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        r: Math.random() * 5 + 4,
        d: Math.random() * 2 + 1,
        angle: Math.random() * 360,
        spin: (Math.random() - 0.5) * 2,
        opacity: Math.random() * 0.4 + 0.35
      });
    }
  }

  if (sakuraCanvasAnim) cancelAnimationFrame(sakuraCanvasAnim);

  function render() {
    if (userData.themeStyle !== 'sakura') return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    sakuraPetalsList.forEach(p => {
      p.angle += p.spin;
      p.y += p.d * 0.8;
      p.x += Math.sin(p.angle * Math.PI / 180) * 0.7;

      if (p.y > canvas.height + 20) {
        p.y = -20;
        p.x = Math.random() * canvas.width;
      }
      if (p.x > canvas.width + 20) p.x = -20;
      if (p.x < -20) p.x = canvas.width + 20;

      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.angle * Math.PI / 180);
      ctx.beginPath();
      ctx.ellipse(0, 0, p.r, p.r * 1.5, 0, 0, Math.PI * 2);
      ctx.fillStyle = \`rgba(255, 183, 197, \${p.opacity})\`;
      ctx.fill();
      ctx.restore();
    });

    sakuraCanvasAnim = requestAnimationFrame(render);
  }
  sakuraCanvasAnim = requestAnimationFrame(render);
}

function stopSakuraPetalsCanvas() {
  if (sakuraCanvasAnim) {
    cancelAnimationFrame(sakuraCanvasAnim);
    sakuraCanvasAnim = null;
  }
  const canvas = document.getElementById('sakuraPetalsCanvas');
  if (canvas) canvas.style.display = 'none';
}

// ══════════════════════════════════════════════════
// ANIME CHIBI MASCOT GENERATOR (SVG ART)
// ══════════════════════════════════════════════════
function generateChibiSvg(mood = 'normal', isNeko = true) {
  const catEars = isNeko ? \`
    <path d="M 18 24 Q 10 2 28 10 Z" fill="#ff75b6" stroke="#422838" stroke-width="2"/>
    <path d="M 19 22 Q 13 8 26 12 Z" fill="#ffb3d9"/>
    <path d="M 62 24 Q 70 2 52 10 Z" fill="#ff75b6" stroke="#422838" stroke-width="2"/>
    <path d="M 61 22 Q 67 8 54 12 Z" fill="#ffb3d9"/>
  \` : \`
    <g transform="translate(14, 12) scale(0.6)">
      <circle cx="10" cy="10" r="6" fill="#ff4d85"/>
      <circle cx="5" cy="5" r="4" fill="#ffb3d9"/>
      <circle cx="15" cy="5" r="4" fill="#ffb3d9"/>
      <circle cx="5" cy="15" r="4" fill="#ffb3d9"/>
      <circle cx="15" cy="15" r="4" fill="#ffb3d9"/>
      <circle cx="10" cy="10" r="3" fill="#ffbe0b"/>
    </g>
    <g transform="translate(54, 12) scale(0.6)">
      <circle cx="10" cy="10" r="6" fill="#ff4d85"/>
      <circle cx="5" cy="5" r="4" fill="#ffb3d9"/>
      <circle cx="15" cy="5" r="4" fill="#ffb3d9"/>
      <circle cx="5" cy="15" r="4" fill="#ffb3d9"/>
      <circle cx="15" cy="15" r="4" fill="#ffb3d9"/>
      <circle cx="10" cy="10" r="3" fill="#ffbe0b"/>
    </g>
  \`;

  const eyes = mood === 'happy' ? \`
    <path d="M 26 44 Q 32 38 38 44" fill="none" stroke="#2d1d29" stroke-width="3" stroke-linecap="round"/>
    <path d="M 42 44 Q 48 38 54 44" fill="none" stroke="#2d1d29" stroke-width="3" stroke-linecap="round"/>
  \` : mood === 'wink' ? \`
    <path d="M 26 44 Q 32 38 38 44" fill="none" stroke="#2d1d29" stroke-width="3" stroke-linecap="round"/>
    <ellipse cx="48" cy="43" rx="6.5" ry="8" fill="#1e152a"/>
    <ellipse cx="48" cy="45" rx="5.5" ry="6" fill="#d946ef"/>
    <circle cx="46" cy="40" r="2.8" fill="#ffffff"/>
    <circle cx="50" cy="46" r="1.5" fill="#ffffff"/>
  \` : \`
    <ellipse cx="32" cy="43" rx="6.5" ry="8" fill="#1e152a"/>
    <ellipse cx="32" cy="45" rx="5.5" ry="6" fill="#ec4899"/>
    <circle cx="30" cy="40" r="2.8" fill="#ffffff"/>
    <circle cx="34" cy="46" r="1.5" fill="#ffffff"/>
    <ellipse cx="48" cy="43" rx="6.5" ry="8" fill="#1e152a"/>
    <ellipse cx="48" cy="45" rx="5.5" ry="6" fill="#ec4899"/>
    <circle cx="46" cy="40" r="2.8" fill="#ffffff"/>
    <circle cx="50" cy="46" r="1.5" fill="#ffffff"/>
  \`;

  const mouth = mood === 'happy' ? \`
    <path d="M 37 53 Q 40 58 43 53 Z" fill="#ff3366"/>
  \` : \`
    <path d="M 36 52 Q 38.5 54 40 52 Q 41.5 54 44 52" fill="none" stroke="#3d2232" stroke-width="1.8" stroke-linecap="round"/>
  \`;

  return \`
  <svg class="chibi-avatar-svg" viewBox="0 0 80 80" width="70" height="70" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="chibiHairGrad" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#ff75a0"/>
        <stop offset="100%" stop-color="#f43f5e"/>
      </linearGradient>
      <radialGradient id="chibiBlushGrad" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stop-color="#ff4d85" stop-opacity="0.5"/>
        <stop offset="100%" stop-color="#ff4d85" stop-opacity="0"/>
      </radialGradient>
    </defs>
    <circle cx="40" cy="40" r="38" fill="rgba(255, 117, 160, 0.15)"/>
    \${catEars}
    <path d="M 18 36 Q 12 55 20 68 Q 28 58 26 45 Z" fill="url(#chibiHairGrad)"/>
    <path d="M 62 36 Q 68 55 60 68 Q 52 58 54 45 Z" fill="url(#chibiHairGrad)"/>
    <ellipse cx="40" cy="44" rx="23" ry="21" fill="#fff5ea" stroke="#f0d5c0" stroke-width="1"/>
    <circle cx="24" cy="49" r="6" fill="url(#chibiBlushGrad)"/>
    <circle cx="56" cy="49" r="6" fill="url(#chibiBlushGrad)"/>
    \${eyes}
    <circle cx="40" cy="49.5" r="0.9" fill="#ff758f"/>
    \${mouth}
    <path d="M 18 34 Q 40 18 62 34 Q 54 28 40 31 Q 26 28 18 34 Z" fill="url(#chibiHairGrad)"/>
    <path d="M 33 28 Q 36 38 31 38 Z" fill="url(#chibiHairGrad)"/>
    <path d="M 47 28 Q 44 38 49 38 Z" fill="url(#chibiHairGrad)"/>
    <path d="M 30 63 Q 40 68 50 63" stroke="#f43f5e" stroke-width="3" fill="none" stroke-linecap="round"/>
    <circle cx="40" cy="65.5" r="3.5" fill="#fbbf24" stroke="#d97706" stroke-width="1"/>
  </svg>
  \`;
}

// ══════════════════════════════════════════════════
// DOJO SPEED BLITZ 60S LOGIC
// ══════════════════════════════════════════════════
let blitzTimer = null;
let blitzTimeLeft = 60;
let blitzScore = 0;
let blitzStreak = 0;
let blitzMaxStreak = 0;
let blitzCorrectCount = 0;
let blitzTotalCount = 0;
let blitzActive = false;
let currentBlitzQuestion = null;

function startBlitzGame() {
  playSfx('click');
  blitzActive = true;
  blitzTimeLeft = 60;
  blitzScore = 0;
  blitzStreak = 0;
  blitzMaxStreak = 0;
  blitzCorrectCount = 0;
  blitzTotalCount = 0;

  const intro = document.getElementById('blitzIntroScreen');
  const arena = document.getElementById('blitzArenaScreen');
  const result = document.getElementById('blitzResultScreen');
  if (intro) intro.style.display = 'none';
  if (result) result.style.display = 'none';
  if (arena) arena.style.display = 'block';

  // Load High Score
  const hsVal = (userData && userData.blitzHighScore) || 0;
  const hsEl = document.getElementById('blitzHighScoreVal');
  if (hsEl) hsEl.textContent = hsVal;

  updateBlitzHud();
  renderBlitzQ();

  if (blitzTimer) clearInterval(blitzTimer);
  blitzTimer = setInterval(() => {
    blitzTimeLeft--;
    const tEl = document.getElementById('blitzTimerDisplay');
    if (tEl) {
      tEl.textContent = blitzTimeLeft + 's';
      if (blitzTimeLeft <= 10) {
        tEl.style.color = 'var(--neon-crimson)';
        tEl.style.borderColor = 'var(--neon-crimson)';
      } else {
        tEl.style.color = 'var(--neon-gold)';
        tEl.style.borderColor = 'var(--neon-gold)';
      }
    }
    if (blitzTimeLeft <= 0) {
      endBlitzGame();
    }
  }, 1000);
}

function updateBlitzHud() {
  const sEl = document.getElementById('blitzLiveScore');
  const stEl = document.getElementById('blitzLiveStreak');
  const mEl = document.getElementById('blitzMultiplierBadge');

  if (sEl) sEl.textContent = blitzScore;
  if (stEl) stEl.textContent = blitzStreak + ' 🔥';

  let mult = 1.0;
  if (blitzStreak >= 15) mult = 3.0;
  else if (blitzStreak >= 10) mult = 2.5;
  else if (blitzStreak >= 5) mult = 2.0;
  else if (blitzStreak >= 3) mult = 1.5;

  if (mEl) mEl.textContent = 'COMBO x' + mult.toFixed(1);
}

function renderBlitzQ() {
  if (!blitzActive) return;
  const list = typeof getDojoVocabList === 'function' ? getDojoVocabList() : (window.ALL_VOCAB || []);
  if (!list || list.length === 0) return;

  const qItem = list[Math.floor(Math.random() * list.length)];
  currentBlitzQuestion = qItem;

  const kEl = document.getElementById('blitzKanji');
  const rEl = document.getElementById('blitzReading');
  if (kEl) kEl.textContent = qItem.kanji || qItem.hiragana;
  if (rEl) rEl.textContent = (qItem.hiragana ? qItem.hiragana : '') + (qItem.romaji ? ' (' + qItem.romaji + ')' : '');

  // 1 correct, 3 wrong
  const wrongPool = list.filter(w => w.id !== qItem.id && w.vietnamese !== qItem.vietnamese);
  const shuffledWrong = wrongPool.sort(() => Math.random() - 0.5).slice(0, 3);
  const options = [qItem, ...shuffledWrong].sort(() => Math.random() - 0.5);

  const grid = document.getElementById('blitzOptionsGrid');
  if (!grid) return;
  grid.innerHTML = options.map((opt, i) => \`
    <button class="btn btn-ghost quiz-opt-btn" onclick="answerBlitz('\${escapeHTML(opt.vietnamese)}')" style="min-height:50px;font-size:.9rem;padding:.5rem .75rem;border-radius:var(--radius-md)">
      \${escapeHTML(opt.vietnamese)}
    </button>
  \`).join('');
}

function answerBlitz(chosenViet) {
  if (!blitzActive || !currentBlitzQuestion) return;
  blitzTotalCount++;
  const isCorrect = (chosenViet === currentBlitzQuestion.vietnamese);
  const popup = document.getElementById('blitzFeedbackPopup');

  if (isCorrect) {
    blitzCorrectCount++;
    blitzStreak++;
    if (blitzStreak > blitzMaxStreak) blitzMaxStreak = blitzStreak;

    let mult = 1.0;
    if (blitzStreak >= 15) mult = 3.0;
    else if (blitzStreak >= 10) mult = 2.5;
    else if (blitzStreak >= 5) mult = 2.0;
    else if (blitzStreak >= 3) mult = 1.5;

    const gained = Math.round(10 * mult);
    blitzScore += gained;
    playSfx('correct');

    if (popup) {
      popup.innerHTML = \`<span style="color:var(--neon-lime)">✓ +\${gained} (x\${mult.toFixed(1)})</span>\`;
    }
    if (typeof GameJuice !== 'undefined') GameJuice.onCorrect();
  } else {
    blitzStreak = 0;
    playSfx('wrong');
    if (popup) {
      popup.innerHTML = \`<span style="color:var(--neon-crimson)">✗ Đáp án: \${escapeHTML(currentBlitzQuestion.vietnamese)}</span>\`;
    }
    if (typeof GameJuice !== 'undefined') GameJuice.shakeScreen();
  }

  updateBlitzHud();
  renderBlitzQ();
}

function endBlitzGame() {
  blitzActive = false;
  if (blitzTimer) {
    clearInterval(blitzTimer);
    blitzTimer = null;
  }
  playSfx('levelUp');

  const arena = document.getElementById('blitzArenaScreen');
  const result = document.getElementById('blitzResultScreen');
  if (arena) arena.style.display = 'none';
  if (result) result.style.display = 'block';

  // Check High Score
  const curHs = (userData && userData.blitzHighScore) || 0;
  const isNew = blitzScore > curHs;
  if (isNew) {
    userData.blitzHighScore = blitzScore;
    saveUserData();
  }

  const recBadge = document.getElementById('blitzNewRecordBadge');
  if (recBadge) recBadge.style.display = isNew ? 'inline-block' : 'none';

  const fScore = document.getElementById('blitzFinalScore');
  const fAcc = document.getElementById('blitzFinalAccuracy');
  const fMax = document.getElementById('blitzFinalMaxStreak');
  const fRank = document.getElementById('blitzRankTitle');

  if (fScore) fScore.textContent = blitzScore;
  const accPct = blitzTotalCount > 0 ? Math.round((blitzCorrectCount / blitzTotalCount) * 100) : 0;
  if (fAcc) fAcc.textContent = accPct + '%';
  if (fMax) fMax.textContent = blitzMaxStreak + ' 🔥';

  let rankName = '🌸 Ninja Tập Sự';
  if (blitzScore >= 300) rankName = '👑 Thần Tốc Sấm Sét (Godlike)';
  else if (blitzScore >= 180) rankName = '🔥 Cao Thủ Phản Xạ';
  else if (blitzScore >= 80) rankName = '⚡ Ninja Tốc Độ';
  if (fRank) fRank.textContent = rankName;

  // Reward EXP
  if (typeof addExp === 'function') {
    const expBonus = Math.min(60, Math.max(15, Math.round(blitzScore / 4)));
    addExp(expBonus);
  }
}

// ══════════════════════════════════════════════════
// ANIME MV EXTENSIONS (CATEGORY, VOCAB & KARAOKE)
// ══════════════════════════════════════════════════
let mvActiveCategory = 'ALL';

function setMvCategory(cat) {
  playSfx('click');
  mvActiveCategory = cat;
  
  ['All', 'Hot', 'Shonen', 'Ballad', 'Classic'].forEach(k => {
    const btn = document.getElementById('mvCat' + k);
    if (btn) {
      if (k.toUpperCase() === cat.toUpperCase() || (cat === 'ALL' && k === 'All')) {
        btn.className = 'btn btn-sm btn-cyan mv-cat-pill';
      } else {
        btn.className = 'btn btn-sm btn-ghost mv-cat-pill';
      }
    }
  });

  renderPlaylistDeck();
}

function openKaraokeModal() {
  playSfx('click');
  const item = ANIME_LIST[currentTrackIdx];
  if (!item) return;

  const tEl = document.getElementById('karaokeSongTitle');
  const aEl = document.getElementById('karaokeAnimeTitle');
  const kEl = document.getElementById('karaokeLyricKanji');
  const rEl = document.getElementById('karaokeLyricRomaji');
  const vEl = document.getElementById('karaokeLyricViet');

  if (tEl) tEl.textContent = item.song;
  if (aEl) aEl.textContent = item.title;
  if (kEl) kEl.textContent = item.lyric;
  if (rEl) rEl.textContent = item.romaji;
  if (vEl) vEl.textContent = item.viet;

  const modal = document.getElementById('karaokeModalOverlay');
  if (modal) modal.classList.add('show');
}

function closeKaraokeModal() {
  playSfx('click');
  const modal = document.getElementById('karaokeModalOverlay');
  if (modal) modal.classList.remove('show');
}

function renderSongKeyVocab(item) {
  const container = document.getElementById('songKeyVocabList');
  if (!container || !item) return;

  const vocabs = item.vocab || [
    { kanji: item.blank.a, kana: item.blank.hint.split('=')[0].trim(), mean: item.blank.hint.split('=')[1] ? item.blank.hint.split('=')[1].trim() : 'Từ khóa chính' }
  ];

  container.innerHTML = vocabs.map(v => \`
    <div style="display:flex;justify-content:space-between;align-items:center;background:rgba(0,0,0,0.2);padding:.4rem .65rem;border-radius:var(--radius-sm);border:1px solid rgba(255,255,255,0.06)">
      <div style="display:flex;align-items:baseline;gap:.5rem">
        <strong style="font-family:var(--font-kanji);color:var(--neon-gold);font-size:.95rem">\${escapeHTML(v.kanji)}</strong>
        <span style="font-size:.78rem;color:var(--neon-cyan)">(\${escapeHTML(v.kana)})</span>
        <span style="font-size:.78rem;color:var(--text-secondary)">: \${escapeHTML(v.mean)}</span>
      </div>
      <button class="btn btn-ghost btn-sm" onclick="speakJapaneseTTS('\${escapeHTML(v.kana || v.kanji)}')" style="font-size:.75rem;padding:.15rem .45rem" title="Phát âm từ vựng này">
        🔊
      </button>
    </div>
  \`).join('');
}
`;

try {
  new vm.Script(jsCode);
  console.log('JavaScript syntax is 100% VALID!');
} catch (e) {
  console.error('JS Syntax Error:', e);
}
