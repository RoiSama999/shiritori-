const fs = require('fs');
const vm = require('vm');

let html = fs.readFileSync('index.v2.html', 'utf8');

// 1. UPDATE SAKURA PET AVATAR BOX IN HTML
const petBoxOld = `<div id="sakuraPetAvatarBox" onclick="interactWithSakuraPet()" style="cursor:pointer;position:relative;width:58px;height:58px;background:rgba(255,42,109,0.18);border:2px solid var(--neon-sakura);border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:2rem;flex-shrink:0" title="Chạm để xoa đầu Sakura Bot!">
              <span id="sakuraPetEmoji">🌸</span>
              <span id="sakuraPetMoodIcon" style="position:absolute;bottom:-2px;right:-2px;font-size:.9rem">✨</span>
            </div>`;

const petBoxNew = `<div id="sakuraPetAvatarBox" onclick="interactWithSakuraPet()" style="cursor:pointer;position:relative;width:72px;height:72px;background:rgba(255,42,109,0.14);border:2px solid var(--neon-sakura);border-radius:50%;display:flex;align-items:center;justify-content:center;flex-shrink:0;overflow:hidden" title="Chạm để tương tác cùng bé Chibi!">
              <div id="chibiMascotSvgContainer" style="width:100%;height:100%;display:flex;align-items:center;justify-content:center"></div>
              <span id="sakuraPetEmoji" style="display:none">🌸</span>
              <span id="sakuraPetMoodIcon" style="position:absolute;bottom:0px;right:0px;font-size:.95rem;background:var(--bg-surface);border-radius:50%;padding:1px;line-height:1">✨</span>
            </div>`;

if (html.includes(petBoxOld)) {
  html = html.replace(petBoxOld, petBoxNew);
  console.log('Updated sakuraPetAvatarBox with Chibi container');
}

// 2. ADD HERO BANNER IN SẢNH CHÍNH (TAB-HUB)
const hubMainColStart = '<section class="hub-main-col">\n        <!-- Quick Access Pillars -->';
const hubHeroBannerHtml = `<section class="hub-main-col">
        <!-- Hero Quick Action Banner -->
        <div class="hub-hero-banner" style="background:linear-gradient(135deg, rgba(5,217,232,0.12), rgba(255,42,109,0.1));border:1.5px solid var(--border-glow);border-radius:var(--radius-lg);padding:1.1rem 1.25rem;margin-bottom:1.1rem;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:.75rem">
          <div style="display:flex;align-items:center;gap:.75rem">
            <div style="font-size:2.2rem;line-height:1">🌸</div>
            <div>
              <div style="font-size:1.1rem;font-weight:800;color:var(--text-primary);letter-spacing:.02em">Chào mừng trở lại, <span id="hubGreetingName" style="color:var(--neon-cyan)">Học viên Ninja</span>!</div>
              <div style="font-size:.78rem;color:var(--text-muted);margin-top:.15rem" id="hubHeroSubtext">Bạn đã sẵn sàng chinh phục mục tiêu tiếng Nhật hôm nay chưa?</div>
            </div>
          </div>
          <div style="display:flex;gap:.5rem">
            <button class="btn btn-primary" onclick="switchTab('quest')" style="padding:.5rem 1.15rem;font-size:.85rem;font-weight:800;border-radius:var(--radius-full);box-shadow:0 4px 14px var(--neon-sakura-glow)">
              ⚡ Tiếp Tục Hành Trình
            </button>
          </div>
        </div>

        <!-- Quick Access Pillars -->`;

if (html.includes(hubMainColStart) && !html.includes('hub-hero-banner')) {
  html = html.replace(hubMainColStart, hubHeroBannerHtml);
  console.log('Added Hero Banner to Sảnh chính');
}

// 3. READ THE COMPLETE JAVASCRIPT CODE FROM scratch/test_js_logic.js
const testJs = fs.readFileSync('scratch/test_js_logic.js', 'utf8');
const jsCodeStart = testJs.indexOf('const jsCode = `') + 'const jsCode = `'.length;
const jsCodeEnd = testJs.lastIndexOf('`;');
const coreJsLogic = testJs.substring(jsCodeStart, jsCodeEnd);

// Find where to inject core JS functions in index.v2.html
// Right before switchDojoMode
const targetMarker = 'function switchDojoMode(mode) {';
if (html.includes(targetMarker) && !html.includes('function initThemeEngine()')) {
  html = html.replace(targetMarker, coreJsLogic + '\n\n' + targetMarker);
  console.log('Injected Core JS functions into index.v2.html');
}

// 4. UPDATE switchDojoMode TO HANDLE 'blitz' AND CLEAN TIMERS
const oldSwitchDojoMode = `function switchDojoMode(mode) {
  playSfx('click');
  if (mode !== 'anime' && typeof soloAnimeTimer !== 'undefined' && soloAnimeTimer) {
    clearInterval(soloAnimeTimer);
    soloAnimeTimer = null;
  }
  document.getElementById('dojoFCView').style.display = mode === 'fc' ? 'block' : 'none';
  document.getElementById('dojoQuizView').style.display = mode === 'quiz' ? 'block' : 'none';
  document.getElementById('dojoPronView').style.display = mode === 'pron' ? 'block' : 'none';
  const kanaView = document.getElementById('dojoKanaView');
  if (kanaView) kanaView.style.display = mode === 'kana' ? 'block' : 'none';
  const dictationView = document.getElementById('dojoDictationView');
  if (dictationView) dictationView.style.display = mode === 'dictation' ? 'block' : 'none';
  const scenarioView = document.getElementById('dojoScenarioView');
  if (scenarioView) scenarioView.style.display = mode === 'scenario' ? 'block' : 'none';
  const animeView = document.getElementById('dojoAnimeView');
  if (animeView) animeView.style.display = mode === 'anime' ? 'block' : 'none';
  
  document.getElementById('dojoSubFC').className = 'btn btn-sm ' + (mode === 'fc' ? 'btn-cyan' : 'btn-ghost');
  document.getElementById('dojoSubQuiz').className = 'btn btn-sm ' + (mode === 'quiz' ? 'btn-cyan' : 'btn-ghost');
  document.getElementById('dojoSubPron').className = 'btn btn-sm ' + (mode === 'pron' ? 'btn-cyan' : 'btn-ghost');
  const subKana = document.getElementById('dojoSubKana');
  if (subKana) subKana.className = 'btn btn-sm ' + (mode === 'kana' ? 'btn-cyan' : 'btn-ghost');
  const subDic = document.getElementById('dojoSubDictation');
  if (subDic) subDic.className = 'btn btn-sm ' + (mode === 'dictation' ? 'btn-cyan' : 'btn-ghost');
  const subScen = document.getElementById('dojoSubScenario');
  if (subScen) subScen.className = 'btn btn-sm ' + (mode === 'scenario' ? 'btn-cyan' : 'btn-ghost');
  const subAnime = document.getElementById('dojoSubAnime');
  if (subAnime) subAnime.className = 'btn btn-sm ' + (mode === 'anime' ? 'btn-cyan' : 'btn-ghost');

  if(mode === 'quiz') renderQuizQ();
  if(mode === 'pron') renderPronQ();
  if(mode === 'kana' && typeof renderKanaUI === 'function') renderKanaUI();
  if(mode === 'dictation' && typeof renderDictationQ === 'function') renderDictationQ();
  if(mode === 'scenario' && typeof renderScenarioUI === 'function') renderScenarioUI();
  if(mode === 'anime' && typeof renderSoloAnimeQuiz === 'function') renderSoloAnimeQuiz();
}`;

const newSwitchDojoMode = `function switchDojoMode(mode) {
  playSfx('click');
  if (mode !== 'anime' && typeof soloAnimeTimer !== 'undefined' && soloAnimeTimer) {
    clearInterval(soloAnimeTimer);
    soloAnimeTimer = null;
  }
  if (mode !== 'blitz' && typeof blitzTimer !== 'undefined' && blitzTimer) {
    clearInterval(blitzTimer);
    blitzTimer = null;
    blitzActive = false;
  }

  const fcView = document.getElementById('dojoFCView');
  if (fcView) fcView.style.display = mode === 'fc' ? 'block' : 'none';
  const quizView = document.getElementById('dojoQuizView');
  if (quizView) quizView.style.display = mode === 'quiz' ? 'block' : 'none';
  const pronView = document.getElementById('dojoPronView');
  if (pronView) pronView.style.display = mode === 'pron' ? 'block' : 'none';
  const kanaView = document.getElementById('dojoKanaView');
  if (kanaView) kanaView.style.display = mode === 'kana' ? 'block' : 'none';
  const dictationView = document.getElementById('dojoDictationView');
  if (dictationView) dictationView.style.display = mode === 'dictation' ? 'block' : 'none';
  const scenarioView = document.getElementById('dojoScenarioView');
  if (scenarioView) scenarioView.style.display = mode === 'scenario' ? 'block' : 'none';
  const animeView = document.getElementById('dojoAnimeView');
  if (animeView) animeView.style.display = mode === 'anime' ? 'block' : 'none';
  const blitzView = document.getElementById('dojoBlitzView');
  if (blitzView) blitzView.style.display = mode === 'blitz' ? 'block' : 'none';
  
  const subFC = document.getElementById('dojoSubFC');
  if (subFC) subFC.className = 'btn btn-sm ' + ((mode === 'fc' || mode === 'quiz') ? 'btn-cyan' : 'btn-ghost');
  const subQuiz = document.getElementById('dojoSubQuiz');
  if (subQuiz) subQuiz.className = 'btn btn-sm ' + (mode === 'quiz' ? 'btn-cyan' : 'btn-ghost');
  const subPron = document.getElementById('dojoSubPron');
  if (subPron) subPron.className = 'btn btn-sm ' + ((mode === 'pron' || mode === 'dictation') ? 'btn-cyan' : 'btn-ghost');
  const subBlitz = document.getElementById('dojoSubBlitz');
  if (subBlitz) subBlitz.className = 'btn btn-sm ' + (mode === 'blitz' ? 'btn-cyan' : 'btn-ghost');
  const subKana = document.getElementById('dojoSubKana');
  if (subKana) subKana.className = 'btn btn-sm ' + (mode === 'kana' ? 'btn-cyan' : 'btn-ghost');
  const subDic = document.getElementById('dojoSubDictation');
  if (subDic) subDic.className = 'btn btn-sm ' + (mode === 'dictation' ? 'btn-cyan' : 'btn-ghost');
  const subScen = document.getElementById('dojoSubScenario');
  if (subScen) subScen.className = 'btn btn-sm ' + (mode === 'scenario' ? 'btn-cyan' : 'btn-ghost');
  const subAnime = document.getElementById('dojoSubAnime');
  if (subAnime) subAnime.className = 'btn btn-sm ' + (mode === 'anime' ? 'btn-cyan' : 'btn-ghost');

  // In-view toggle button states
  const togFC = document.getElementById('btnSubToggleFC');
  const togQuiz = document.getElementById('btnSubToggleQuiz');
  if (togFC && togQuiz) {
    togFC.className = 'btn btn-sm ' + (mode === 'fc' ? 'btn-cyan' : 'btn-ghost');
    togQuiz.className = 'btn btn-sm ' + (mode === 'quiz' ? 'btn-cyan' : 'btn-ghost');
  }
  const togPron = document.getElementById('btnSubTogglePron');
  const togDic = document.getElementById('btnSubToggleDictation');
  if (togPron && togDic) {
    togPron.className = 'btn btn-sm ' + (mode === 'pron' ? 'btn-cyan' : 'btn-ghost');
    togDic.className = 'btn btn-sm ' + (mode === 'dictation' ? 'btn-cyan' : 'btn-ghost');
  }

  if(mode === 'quiz') renderQuizQ();
  if(mode === 'pron') renderPronQ();
  if(mode === 'blitz') {
    const intro = document.getElementById('blitzIntroScreen');
    const arena = document.getElementById('blitzArenaScreen');
    const result = document.getElementById('blitzResultScreen');
    if (intro) intro.style.display = 'block';
    if (arena) arena.style.display = 'none';
    if (result) result.style.display = 'none';
    const hsVal = (userData && userData.blitzHighScore) || 0;
    const hsEl = document.getElementById('blitzHighScoreVal');
    if (hsEl) hsEl.textContent = hsVal;
  }
  if(mode === 'kana' && typeof renderKanaUI === 'function') renderKanaUI();
  if(mode === 'dictation' && typeof renderDictationQ === 'function') renderDictationQ();
  if(mode === 'scenario' && typeof renderScenarioUI === 'function') renderScenarioUI();
  if(mode === 'anime' && typeof renderSoloAnimeQuiz === 'function') renderSoloAnimeQuiz();
}`;

if (html.includes('function switchDojoMode(mode) {')) {
  html = html.replace(oldSwitchDojoMode, newSwitchDojoMode);
  console.log('Updated switchDojoMode implementation');
}

// 5. UPDATE updateSakuraPetUI AND interactWithSakuraPet TO USE SVG CHIBI MASCOT
const oldUpdateSakuraPetUI = `function updateSakuraPetUI() {
  ensureSakuraPetData();
  const evo = getSakuraEvolutionStage();
  const mood = getSakuraMood();
  
  const curOutfitId = userData.sakuraPet.outfit || 'default';
  const outfit = SAKURA_OUTFITS.find(o => o.id === curOutfitId) || SAKURA_OUTFITS[0];
  
  const emojiEl = document.getElementById('sakuraPetEmoji');
  if (emojiEl) emojiEl.textContent = curOutfitId === 'default' ? evo.currentStage.emoji : outfit.icon;
  
  const moodIconEl = document.getElementById('sakuraPetMoodIcon');
  if (moodIconEl) moodIconEl.textContent = mood.icon;
  
  const stageNameEl = document.getElementById('sakuraPetStageName');
  if (stageNameEl) stageNameEl.textContent = evo.currentStage.name;
  
  const badgeEl = document.getElementById('sakuraPetOutfitBadge');
  if (badgeEl) badgeEl.textContent = outfit.name;
  
  const bubbleEl = document.getElementById('sakuraPetSpeechBubble');
  if (bubbleEl) bubbleEl.textContent = \`"\${mood.text}"\`;
  
  const progLabel = document.getElementById('sakuraPetEvoProgressLabel');
  const progFill = document.getElementById('sakuraPetEvoFill');
  if (evo.nextStage) {
    const target = evo.nextStage.minWords;
    const cur = Math.min(target, evo.words);
    const pct = Math.min(100, Math.max(5, Math.round((cur / target) * 100)));
    if (progLabel) progLabel.textContent = \`\${cur}/\${target} từ (Streak \${evo.streak}/\${evo.nextStage.minStreak}d)\`;
    if (progFill) progFill.style.width = pct + '%';
  } else {
    if (progLabel) progLabel.textContent = '🌟 Đạt Cấp Nữ Thần Tối Đa';
    if (progFill) progFill.style.width = '100%';
  }
}`;

const newUpdateSakuraPetUI = `function updateSakuraPetUI() {
  ensureSakuraPetData();
  const evo = getSakuraEvolutionStage();
  const mood = getSakuraMood();
  
  const curOutfitId = userData.sakuraPet.outfit || 'default';
  const outfit = SAKURA_OUTFITS.find(o => o.id === curOutfitId) || SAKURA_OUTFITS[0];
  
  const emojiEl = document.getElementById('sakuraPetEmoji');
  if (emojiEl) emojiEl.textContent = curOutfitId === 'default' ? evo.currentStage.emoji : outfit.icon;

  // Render SVG Anime Chibi Character into container
  const chibiContainer = document.getElementById('chibiMascotSvgContainer');
  if (chibiContainer) {
    const isNeko = (userData.themeStyle === 'neko');
    chibiContainer.innerHTML = generateChibiSvg('normal', isNeko);
  }
  
  const moodIconEl = document.getElementById('sakuraPetMoodIcon');
  if (moodIconEl) moodIconEl.textContent = mood.icon;
  
  const stageNameEl = document.getElementById('sakuraPetStageName');
  if (stageNameEl) {
    const isNeko = (userData.themeStyle === 'neko');
    stageNameEl.textContent = isNeko ? 'Mimi-chan (Bé Mèo Chibi)' : evo.currentStage.name;
  }
  
  const badgeEl = document.getElementById('sakuraPetOutfitBadge');
  if (badgeEl) badgeEl.textContent = outfit.name;
  
  const bubbleEl = document.getElementById('sakuraPetSpeechBubble');
  if (bubbleEl) bubbleEl.textContent = \`"\${mood.text}"\`;
  
  const progLabel = document.getElementById('sakuraPetEvoProgressLabel');
  const progFill = document.getElementById('sakuraPetEvoFill');
  if (evo.nextStage) {
    const target = evo.nextStage.minWords;
    const cur = Math.min(target, evo.words);
    const pct = Math.min(100, Math.max(5, Math.round((cur / target) * 100)));
    if (progLabel) progLabel.textContent = \`\${cur}/\${target} từ (Streak \${evo.streak}/\${evo.nextStage.minStreak}d)\`;
    if (progFill) progFill.style.width = pct + '%';
  } else {
    if (progLabel) progLabel.textContent = '🌟 Đạt Cấp Nữ Thần Tối Đa';
    if (progFill) progFill.style.width = '100%';
  }
}`;

if (html.includes(oldUpdateSakuraPetUI)) {
  html = html.replace(oldUpdateSakuraPetUI, newUpdateSakuraPetUI);
  console.log('Updated updateSakuraPetUI to render Chibi SVG');
}

// 6. UPDATE interactWithSakuraPet TO TRIGGER CHIBI BOUNCE & CUTE JAPANESE VOICELINE
const oldInteractWithSakuraPet = `function interactWithSakuraPet() {
  playSfx('click');
  const evo = getSakuraEvolutionStage();
  const patPhrases = [
    'Ehe~ Cảm ơn bạn đã xoa đầu Sakura! (⁠≧⁠▽⁠≦⁠)',
    'Bạn xoa đầu làm Sakura ấm áp ghê! Mình yêu bạn nhiều! 💕',
    'Sakura đã được nạp 100% năng lượng học tập cùng bạn nè! ⚡',
    'Arigatou gozaimasu! Cùng tiếp tục bài học tiếp theo nhé!'
  ];
  const chosen = patPhrases[Math.floor(Math.random() * patPhrases.length)];
  const bubble = document.getElementById('sakuraPetSpeechBubble');
  if (bubble) {
    bubble.textContent = \`"\${chosen}"\`;
  }
  
  if (typeof GameJuice !== 'undefined') {
    GameJuice.onCorrect();
  }
  showToast(\`🌸 Sakura Bot cười tít mắt: "\${chosen}"\`);
}`;

const newInteractWithSakuraPet = `function interactWithSakuraPet() {
  playSfx('click');
  const evo = getSakuraEvolutionStage();
  const isNeko = (userData.themeStyle === 'neko');
  
  const patPhrases = isNeko ? [
    'Nya~! Cảm ơn bạn đã xoa đầu bé mèo Mimi! (⁠≧⁠▽⁠≦⁠)🐾',
    'Gakushuu ganbarou nya! (Cùng cố gắng học tập nhé!) ✨',
    'Mimi nạp đủ năng lượng rồi, cùng nối từ thôi Nya~! 💕',
    'Arigatou nya! Bạn là người bạn học tuyệt vời nhất! 🌸'
  ] : [
    'Ehe~ Cảm ơn bạn đã xoa đầu Sakura! (⁠≧⁠▽⁠≦⁠)',
    'Bạn xoa đầu làm Sakura ấm áp ghê! Mình yêu bạn nhiều! 💕',
    'Sakura đã được nạp 100% năng lượng học tập cùng bạn nè! ⚡',
    'Arigatou gozaimasu! Cùng tiếp tục bài học tiếp theo nhé!'
  ];
  const chosen = patPhrases[Math.floor(Math.random() * patPhrases.length)];
  const bubble = document.getElementById('sakuraPetSpeechBubble');
  if (bubble) {
    bubble.textContent = \`"\${chosen}"\`;
  }

  // Trigger Chibi bounce animation & expressions
  const avatarBox = document.getElementById('sakuraPetAvatarBox');
  const chibiContainer = document.getElementById('chibiMascotSvgContainer');
  if (avatarBox) {
    avatarBox.classList.add('chibi-bounce-active');
    setTimeout(() => avatarBox.classList.remove('chibi-bounce-active'), 600);
  }
  if (chibiContainer) {
    chibiContainer.innerHTML = generateChibiSvg(Math.random() > 0.5 ? 'happy' : 'wink', isNeko);
    setTimeout(() => {
      chibiContainer.innerHTML = generateChibiSvg('normal', isNeko);
    }, 2400);
  }
  
  if (typeof GameJuice !== 'undefined') {
    GameJuice.onCorrect();
  }
  showToast(\`\${isNeko ? '🐾 Mimi-chan' : '🌸 Sakura Bot'} cười tít mắt: "\${chosen}"\`);
}`;

if (html.includes(oldInteractWithSakuraPet)) {
  html = html.replace(oldInteractWithSakuraPet, newInteractWithSakuraPet);
  console.log('Updated interactWithSakuraPet with Chibi bounce');
}

// 7. HOOK THEME INITIALIZATION INTO loadUserData
const loadUserDataHook = `loadUserData();`;
const enhancedInitCall = `loadUserData();
  if (typeof initThemeEngine === 'function') initThemeEngine();`;

if (html.includes(loadUserDataHook) && !html.includes('initThemeEngine()')) {
  html = html.replace(loadUserDataHook, enhancedInitCall);
  console.log('Hooked initThemeEngine into loadUserData call');
}

// 8. UPDATE initYouTubePlayer TO CALL renderSongKeyVocab
const ytPlayerUpdateMarker = `updateMvPlayModeUI();\n  renderPlaylistDeck();`;
const ytPlayerEnhanced = `updateMvPlayModeUI();
  if (typeof renderSongKeyVocab === 'function') renderSongKeyVocab(item);
  renderPlaylistDeck();`;

if (html.includes(ytPlayerUpdateMarker)) {
  html = html.replace(ytPlayerUpdateMarker, ytPlayerEnhanced);
  console.log('Hooked renderSongKeyVocab into initYouTubePlayer');
}

// 9. UPDATE getFilteredAnimeList TO SUPPORT mvActiveCategory
const oldGetFiltered = `function getFilteredAnimeList() {
  let list = ANIME_LIST.map((item, originalIndex) => ({ ...item, originalIndex }));
  if (mvActiveFilter && mvActiveFilter !== 'ALL') {
    if (mvActiveFilter === 'OTHER') {
      const mainKeywords = ['demon slayer', 'jujutsu kaisen', 'naruto', 'your name', 'suzume', '推しの子', 'oshi no ko', 'one piece', 'my hero academia', 'tokyo ghoul', 'frieren'];
      list = list.filter(item => {
        const t = (item.title + ' ' + item.song).toLowerCase();
        return !mainKeywords.some(k => t.includes(k));
      });
    } else {
      const q = mvActiveFilter.toLowerCase();
      list = list.filter(item => (item.title + ' ' + item.song).toLowerCase().includes(q));
    }
  }
  if (mvSearchQuery && mvSearchQuery.trim()) {
    const q = mvSearchQuery.trim().toLowerCase();
    list = list.filter(item => (item.song + ' ' + item.title + ' ' + (item.romaji || '')).toLowerCase().includes(q));
  }
  return list;
}`;

const newGetFiltered = `function getFilteredAnimeList() {
  let list = ANIME_LIST.map((item, originalIndex) => ({ ...item, originalIndex }));

  // Filter by category pills
  if (typeof mvActiveCategory !== 'undefined' && mvActiveCategory !== 'ALL') {
    if (mvActiveCategory === 'HOT') {
      const hotKeywords = ['oshi no ko', '推しの子', 'chainsaw', 'jujutsu', 'mashle', 'frieren', 'bocchi', 'dan da dan', 'kaiju', 'solo leveling', 'spy x family'];
      list = list.filter(item => {
        if (item.category === 'Hot Mới 2023-2026') return true;
        const str = (item.title + ' ' + item.song).toLowerCase();
        return hotKeywords.some(k => str.includes(k));
      });
    } else if (mvActiveCategory === 'SHONEN') {
      const shonenKeywords = ['demon slayer', 'naruto', 'one piece', 'my hero', 'jujutsu', 'chainsaw', 'tokyo ghoul', 'attack on titan', 'hunter', 'fire force', 'noragami', 'bleach', 'kaiju'];
      list = list.filter(item => {
        if (item.category === 'Shonen Chiến Đấu') return true;
        const str = (item.title + ' ' + item.song).toLowerCase();
        return shonenKeywords.some(k => str.includes(k));
      });
    } else if (mvActiveCategory === 'BALLAD') {
      const balladKeywords = ['your name', 'suzume', 'your lie in april', 'frieren', 'lemon', 'sparkle', 'homura', 'yorushika', 'anytime anywhere', 'nandemonaiya'];
      list = list.filter(item => {
        if (item.category === 'Nhẹ Nhàng & Ballad') return true;
        const str = (item.title + ' ' + item.song).toLowerCase();
        return balladKeywords.some(k => str.includes(k));
      });
    } else if (mvActiveCategory === 'CLASSIC') {
      const classicKeywords = ['naruto', 'fullmetal', 'evangelion', 'digimon', 'hunter x hunter', 'haruka kanata', 'blue bird', 'go!!!', 'again'];
      list = list.filter(item => {
        if (item.category === 'Huyền Thoại Bất Hủ') return true;
        const str = (item.title + ' ' + item.song).toLowerCase();
        return classicKeywords.some(k => str.includes(k));
      });
    }
  }

  // Filter by dropdown
  if (mvActiveFilter && mvActiveFilter !== 'ALL') {
    if (mvActiveFilter === 'OTHER') {
      const mainKeywords = ['demon slayer', 'jujutsu kaisen', 'naruto', 'your name', 'suzume', '推しの子', 'oshi no ko', 'one piece', 'my hero academia', 'tokyo ghoul', 'frieren', 'bocchi', 'evangelion'];
      list = list.filter(item => {
        const t = (item.title + ' ' + item.song).toLowerCase();
        return !mainKeywords.some(k => t.includes(k));
      });
    } else {
      const q = mvActiveFilter.toLowerCase();
      list = list.filter(item => (item.title + ' ' + item.song).toLowerCase().includes(q));
    }
  }

  // Filter by search query
  if (mvSearchQuery && mvSearchQuery.trim()) {
    const q = mvSearchQuery.trim().toLowerCase();
    list = list.filter(item => (item.song + ' ' + item.title + ' ' + (item.romaji || '')).toLowerCase().includes(q));
  }
  return list;
}`;

if (html.includes(oldGetFiltered)) {
  html = html.replace(oldGetFiltered, newGetFiltered);
  console.log('Updated getFilteredAnimeList with Category pills support');
}

fs.writeFileSync('index.v2.html', html);
console.log('Step 5 complete.');
